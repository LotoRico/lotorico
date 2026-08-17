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
      ganhadores_15_acertos,
