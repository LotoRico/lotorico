// api/_lib/caixa-client.js
const https = require('https');

// API comunitária (não bloqueia datacenter) como fonte primária
const PRIMARY_HOST = 'loteriascaixa-api.herokuapp.com';
const PRIMARY_PATH = '/api/lotofacil';

// API oficial da Caixa como fallback
const CAIXA_HOST = 'servicebus2.caixa.gov.br';
const CAIXA_PATH = '/portaldeloterias/api/lotofacil';

function httpsGet(hostname, path, isCaixa) {
  return new Promise((resolve, reject) => {
    const headers = isCaixa
      ? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx'
        }
      : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        };

    const options = {
      hostname,
      path,
      method: 'GET',
      headers,
      timeout: 8000
    };

    const req = https.request(options, (resp) => {
      let data = '';
      const encoding = resp.headers['content-encoding'];

      let stream = resp;
      if (encoding === 'br') {
        const zlib = require('zlib');
        stream = resp.pipe(zlib.createBrotliDecompress());
      } else if (encoding === 'gzip') {
        const zlib = require('zlib');
        stream = resp.pipe(zlib.createGunzip());
      }

      stream.on('data', chunk => data += chunk);
      stream.on('end', () => {
        if (resp.statusCode !== 200) {
          reject(new Error(`API retornou ${resp.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Resposta não é JSON válido'));
        }
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function fetchConcurso(concurso) {
  // Tentar API comunitária primeiro
  try {
    const path = concurso ? `${PRIMARY_PATH}/${concurso}` : `${PRIMARY_PATH}/latest`;
    const resultado = await httpsGet(PRIMARY_HOST, path, false);
    return normalizarResposta(resultado);
  } catch (e1) {
    // Fallback: API oficial da Caixa
    try {
      const path = concurso ? `${CAIXA_PATH}/${concurso}` : CAIXA_PATH;
      const resultado = await httpsGet(CAIXA_HOST, path, true);
      return parseConcursoCaixa(resultado);
    } catch (e2) {
      throw new Error(`Ambas as fontes falharam: ${e1.message} | ${e2.message}`);
    }
  }
}

// Normalizar resposta da API comunitária
function normalizarResposta(r) {
  const numero = r.concurso || r.numero;
  const data = r.data || r.dataApuracao || r.data_sorteio;
  let data_sorteio = data;
  if (data && data.includes('/')) {
    const p = data.split('/');
    data_sorteio = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }

  const dezenas = r.dezenas || r.listaDezenas || r.dezenasSorteadasOrdemSorteio || [];
  const balls = {};
  dezenas.slice(0, 15).forEach((d, i) => {
    balls[`bola${i + 1}`] = parseInt(d, 10);
  });

  let ganhadores15 = 0;
  if (r.ganhadores && r.ganhadores.length > 0) {
    const faixa1 = r.ganhadores.find(g => g.faixa === 1 || g.acertos === 15);
    if (faixa1) ganhadores15 = faixa1.ganhadores || faixa1.quantidadeGanhadores || 0;
  }
  if (r.premios && r.premios.length > 0) {
    const faixa1 = r.premios.find(p => p.faixa === 1 || p.acertos === 15);
    if (faixa1) ganhadores15 = faixa1.ganhadores || faixa1.quantidadeGanhadores || 0;
  }
  if (r.quantidadeGanhadores) {
    ganhadores15 = r.quantidadeGanhadores;
  }

  return { numero, data_sorteio, ...balls, ganhadores_15_acertos: ganhadores15 };
}

// Parse da API oficial da Caixa
function parseConcursoCaixa(resultado) {
  const numero = resultado.numero;
  const dataParts = resultado.dataApuracao.split('/');
  const data_sorteio = `${dataParts[2]}-${dataParts[1].padStart(2, '0')}-${dataParts[0].padStart(2, '0')}`;

  const dezenas = resultado.dezenasSorteadasOrdemSorteio || resultado.listaDezenas || [];
  const balls = {};
  dezenas.slice(0, 15).forEach((d, i) => {
    balls[`bola${i + 1}`] = parseInt(d, 10);
  });

  let ganhadores15 = 0;
  if (resultado.listaRateioPremio && resultado.listaRateioPremio.length > 0) {
    const faixa1 = resultado.listaRateioPremio.find(r => r.faixa === 1);
    if (faixa1) ganhadores15 = faixa1.quantidadeGanhadores || 0;
  }

  return { numero, data_sorteio, ...balls, ganhadores_15_acertos: ganhadores15 };
}

module.exports = { fetchConcurso };
