// Arquivo: importar-sorteios.js

const https = require('https');
const pool = require('../db');

const API_BASE = 'https://api.guidi.dev.br/loteria/lotofacil';
const DELAY_ENTRE_REQUISICOES = 1500;
const DELAY_ENTRE_LOTES = 5000;

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buscarConcurso(concurso) {
  return new Promise((resolve, reject) => {
    const url = concurso === 'ultimo'
      ? `${API_BASE}/ultimo`
      : `${API_BASE}/${concurso}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} no concurso ${concurso}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Erro ao parsear JSON do concurso ${concurso}: ${e.message}`)); }
      });
      res.on('error', (e) => reject(e));
    }).on('error', (e) => reject(e));
  });
}

function extrairPremiacao(dados) {
  const resultado = {
    ganhadores_15: null, rateio_15: null,
    ganhadores_14: null, rateio_14: null,
    ganhadores_13: null, rateio_13: null,
    ganhadores_12: null, rateio_12: null,
    ganhadores_11: null, rateio_11: null
  };
  if (!dados.premiacao || !Array.isArray(dados.premiacao)) return resultado;
  for (const faixa of dados.premiacao) {
    const acertos = parseInt((faixa.acertos || '').replace(/\D/g, ''), 10);
    const ganhadores = parseInt((faixa.ganhadores || '0').replace(/\D/g, ''), 10) || null;
    const premio = faixa.premio || null;
    switch (acertos) {
      case 15: resultado.ganhadores_15 = ganhadores; resultado.rateio_15 = premio; break;
      case 14: resultado.ganhadores_14 = ganhadores; resultado.rateio_14 = premio; break;
      case 13: resultado.ganhadores_13 = ganhadores; resultado.rateio_13 = premio; break;
      case 12: resultado.ganhadores_12 = ganhadores; resultado.rateio_12 = premio; break;
      case 11: resultado.ganhadores_11 = ganhadores; resultado.rateio_11 = premio; break;
    }
  }
  return resultado;
}

function extrairCidadeUF(dados) {
  if (!dados.estadosPremiados || !Array.isArray(dados.estadosPremiados)) return null;
  const cidades = dados.estadosPremiados.map(ep => {
    const uf = ep.uf || '';
    const cidade = ep.cidade || '';
    const num = ep.numeroGanhadores || '1';
    return `${cidade}/${uf} (${num})`;
  });
  return cidades.length > 0 ? cidades.join('; ') : null;
}

async function getUltimoConcursoBanco() {
  const [rows] = await pool.execute('SELECT MAX(concurso) as max_concurso FROM sorteios');
  if (rows[0].max_concurso === null) return 0;
  return rows[0].max_concurso;
}

async function insertConcurso(dados) {
  const concurso = parseInt(dados.concurso, 10);
  const dataSorteio = dados.data;
  if (!dataSorteio) return false;
  if (!dados.dezenas || dados.dezenas.length !== 15) return false;

  const dezenas = dados.dezenas.map(d => parseInt(d, 10)).sort((a, b) => a - b);
  const prem = extrairPremiacao(dados);
  const cidadeUf = extrairCidadeUF(dados);
  const acumulado = dados.acumulou ? 'Sim' : 'Não';

  const sql = `
    INSERT INTO sorteios (
      concurso, data_sorteio,
      bola01, bola02, bola03, bola04, bola05,
      bola06, bola07, bola08, bola09, bola10,
      bola11, bola12, bola13, bola14, bola15,
      ganhadores_15_acertos, cidade_uf, rateio_15_acertos,
      ganhadores_14_acertos, rateio_14_acertos,
      ganhadores_13_acertos, rateio_13_acertos,
      ganhadores_12_acertos, rateio_12_acertos,
      ganhadores_11_acertos, rateio_11_acertos,
      acumulado_15_acertos, arrecadacao_total, estimativa_premio,
      acumulado_sorteio_especial, observacao,
      acumulado_sorteio_especial_independencia
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      data_sorteio = VALUES(data_sorteio),
      bola01 = VALUES(bola01), bola02 = VALUES(bola02), bola03 = VALUES(bola03),
      bola04 = VALUES(bola04), bola05 = VALUES(bola05), bola06 = VALUES(bola06),
      bola07 = VALUES(bola07), bola08 = VALUES(bola08), bola09 = VALUES(bola09),
      bola10 = VALUES(bola10), bola11 = VALUES(bola11), bola12 = VALUES(bola12),
      bola13 = VALUES(bola13), bola14 = VALUES(bola14), bola15 = VALUES(bola15),
      ganhadores_15_acertos = VALUES(ganhadores_15_acertos),
      cidade_uf = VALUES(cidade_uf),
      rateio_15_acertos = VALUES(rateio_15_acertos),
      ganhadores_14_acertos = VALUES(ganhadores_14_acertos),
      rateio_14_acertos = VALUES(rateio_14_acertos),
      ganhadores_13_acertos = VALUES(ganhadores_13_acertos),
      rateio_13_acertos = VALUES(rateio_13_acertos),
      ganhadores_12_acertos = VALUES(ganhadores_12_acertos),
      rateio_12_acertos = VALUES(rateio_12_acertos),
      ganhadores_11_acertos = VALUES(ganhadores_11_acertos),
      rateio_11_acertos = VALUES(rateio_11_acertos),
      acumulado_15_acertos = VALUES(acumulado_15_acertos)
  `;

  const valores = [
    concurso, dataSorteio,
    dezenas[0], dezenas[1], dezenas[2], dezenas[3], dezenas[4],
    dezenas[5], dezenas[6], dezenas[7], dezenas[8], dezenas[9],
    dezenas[10], dezenas[11], dezenas[12], dezenas[13], dezenas[14],
    prem.ganhadores_15, cidadeUf, prem.rateio_15,
    prem.ganhadores_14, prem.rateio_14,
    prem.ganhadores_13, prem.rateio_13,
    prem.ganhadores_12, prem.rateio_12,
    prem.ganhadores_11, prem.rateio_11,
    acumulado, null, null, null, null, null
  ];

  await pool.execute(sql, valores);
  return true;
}

async function importarTodos() {
  const resultado = { importados: 0, falhas: 0, total: 0, detalhes: [] };
  const ultimo = await buscarConcurso('ultimo');
  const ultimoConcursoAPI = parseInt(ultimo.concurso, 10);
  const ultimoConcursoBanco = await getUltimoConcursoBanco();

  if (ultimoConcursoBanco >= ultimoConcursoAPI) {
    resultado.mensagem = 'Banco já está atualizado!';
    return resultado;
  }

  const inicio = ultimoConcursoBanco + 1;
  const total = ultimoConcursoAPI - ultimoConcursoBanco;
  resultado.total = total;

  for (let concurso = inicio; concurso <= ultimoConcursoAPI; concurso++) {
    try {
      const dados = await buscarConcurso(concurso);
      const sucesso = await insertConcurso(dados);
      if (sucesso) resultado.importados++;
      else resultado.falhas++;

      if (resultado.importados > 0 && resultado.importados % 50 === 0) {
        await esperar(DELAY_ENTRE_LOTES);
      } else {
        await esperar(DELAY_ENTRE_REQUISICOES);
      }
    } catch (error) {
      resultado.falhas++;
      resultado.detalhes.push(`Concurso ${concurso}: ${error.message}`);
      if (error.message.includes('404')) break;
      await esperar(DELAY_ENTRE_REQUISICOES);
    }
  }

  resultado.totalBanco = await getUltimoConcursoBanco();
  return resultado;
}

async function atualizarNovos() {
  const resultado = { importados: 0, falhas: 0, detalhes: [] };
  const ultimoBanco = await getUltimoConcursoBanco();
  const ultimo = await buscarConcurso('ultimo');
  const ultimoAPI = parseInt(ultimo.concurso, 10);

  if (ultimoBanco >= ultimoAPI) {
    resultado.mensagem = 'Banco já está atualizado!';
    return resultado;
  }

  for (let concurso = ultimoBanco + 1; concurso <= ultimoAPI; concurso++) {
    try {
      const dados = await buscarConcurso(concurso);
      const ok = await insertConcurso(dados);
      if (ok) resultado.importados++;
      else resultado.falhas++;
      await esperar(DELAY_ENTRE_REQUISICOES);
    } catch (error) {
      resultado.falhas++;
      resultado.detalhes.push(`Concurso ${concurso}: ${error.message}`);
    }
  }

  resultado.totalBanco = await getUltimoConcursoBanco();
  return resultado;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const modo = req.query.modo || req.query.m || 'atualizar';

  try {
    let resultado;
    if (modo === 'completo') {
      resultado = await importarTodos();
    } else {
      resultado = await atualizarNovos();
    }

    return res.status(200).json({
      sucesso: true,
      modo: modo,
      ...resultado
    });
  } catch (error) {
    return res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
};
