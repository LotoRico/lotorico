// backend/api/importar-sorteios.js
const https = require('https');
const pool = require('../db');

const API_BASE = 'https://api.guidi.dev.br/loteria/lotofacil';
const DELAY_ENTRE_REQUISICOES = 1500;
const DELAY_ENTRE_LOTES = 5000;

// ============ FUNÇÕES AUXILIARES ============

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

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} no concurso ${concurso}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Erro ao parsear JSON do concurso ${concurso}: ${e.message}`));
        }
      });

      res.on('error', (e) => {
        reject(e);
      });
    }).on('error', (e) => {
      reject(e);
    });
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

  if (!dados.premiacao || !Array.isArray(dados.premiacao)) {
    return resultado;
  }

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
  if (!dados.estadosPremiados || !Array.isArray(dados.estadosPremiados)) {
    return null;
  }

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

  if (!dataSorteio) {
    console.log(`  ⚠️ Concurso ${concurso}: data inválida, pulando...`);
    return false;
  }

  if (!dados.dezenas || dados.dezenas.length !== 15) {
    console.log(`  ⚠️ Concurso ${concurso}: dezenas insuficientes (${dados.dezenas?.length || 0}), pulando...`);
    return false;
  }

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
    acumulado, null, null,
    null, null, null
  ];

  await pool.execute(sql, valores);
  return true;
}

// ============ IMPORTAÇÃO COMPLETA ============

async function importarTodos() {
  console.log('🚀 Iniciando importação completa de todos os concursos...\n');

  try {
    console.log('📡 Buscando último concurso disponível na API...');
    const ultimo = await buscarConcurso('ultimo');
    const ultimoConcursoAPI = parseInt(ultimo.concurso, 10);
    console.log(`   Último concurso na API: ${ultimoConcursoAPI} (${ultimo.data})\n`);

    const ultimoConcursoBanco = await getUltimoConcursoBanco();

    if (ultimoConcursoBanco >= ultimoConcursoAPI) {
      console.log('✅ Banco já está atualizado! Nenhum concurso novo para importar.\n');
      return;
    }

    const inicio = ultimoConcursoBanco + 1;
    const total = ultimoConcursoAPI - ultimoConcursoBanco;
    console.log(`📊 Serão importados ${total} concursos (de ${inicio} até ${ultimoConcursoAPI})\n`);

    let importados = 0;
    let falhas = 0;

    for (let concurso = inicio; concurso <= ultimoConcursoAPI; concurso++) {
      try {
        const dados = await buscarConcurso(concurso);
        const sucesso = await insertConcurso(dados);

        if (sucesso) {
          importados++;
          if (importados % 100 === 0) {
            console.log(`  ✅ ${importados}/${total} concursos importados (último: ${concurso})`);
          }
        }

        if (importados > 0 && importados % 50 === 0) {
          console.log(`  ⏸️ Pausa de segurança (${importados}/${total})...`);
          await esperar(DELAY_ENTRE_LOTES);
        } else {
          await esperar(DELAY_ENTRE_REQUISICOES);
        }

      } catch (error) {
        falhas++;
        console.log(`  ❌ Concurso ${concurso} falhou: ${error.message}`);

        if (error.message.includes('404')) {
          console.log(`     Concurso ${concurso} ainda não sorteado. Parando importação.`);
          break;
        }

        await esperar(DELAY_ENTRE_REQUISICOES);
      }
    }

    console.log(`\n📋 Importação concluída!`);
    console.log(`   ✅ Importados: ${importados}`);
    console.log(`   ❌ Falhas: ${falhas}`);
    console.log(`   📊 Total no banco: ${await getUltimoConcursoBanco()} concursos\n`);

  } catch (error) {
    console.error('💥 Erro geral na importação:', error.message);
  } finally {
    await pool.end();
  }
}

// ============ ATUALIZAÇÃO DIÁRIA ============

async function atualizarNovos() {
  console.log('🔄 Verificando novos concursos...\n');

  try {
    const ultimoBanco = await getUltimoConcursoBanco();
    console.log(`   Último no banco: ${ultimoBanco}`);

    const ultimo = await buscarConcurso('ultimo');
    const ultimoAPI = parseInt(ultimo.concurso, 10);
    console.log(`   Último na API: ${ultimoAPI}`);

    if (ultimoBanco >= ultimoAPI) {
      console.log('✅ Banco já está atualizado!\n');
      return;
    }

    for (let concurso = ultimoBanco + 1; concurso <= ultimoAPI; concurso++) {
      try {
        const dados = await buscarConcurso(concurso);
        await insertConcurso(dados);
        console.log(`  ✅ Concurso ${concurso} importado`);
        await esperar(DELAY_ENTRE_REQUISICOES);
      } catch (error) {
        console.log(`  ❌ Concurso ${concurso}: ${error.message}`);
      }
    }

    console.log(`\n✅ Atualização concluída! Banco agora tem ${await getUltimoConcursoBanco()} concursos.\n`);

  } catch (error) {
    console.error('💥 Erro:', error.message);
  } finally {
    await pool.end();
  }
}

// ============ EXECUÇÃO ============

const modo = process.argv[2] || 'completo';

if (modo === 'completo') {
  importarTodos();
} else if (modo === 'atualizar') {
  atualizarNovos();
} else {
  console.log('Uso: node importar-sorteios.js [completo|atualizar]');
  console.log('  completo   - Importa todos os concursos faltantes (primeira vez)');
  console.log('  atualizar  - Busca apenas concursos novos (uso diário)');
}

module.exports = { importarTodos, atualizarNovos, buscarConcurso, insertConcurso };
