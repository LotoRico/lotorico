// api/_lib/caixa-client.js
const https = require('https');

const CAIXA_HOST = 'servicebus2.caixa.gov.br';
const CAIXA_PATH = '/portaldeloterias/api/lotofacil';

function fetchConcurso(concurso) {
  return new Promise((resolve, reject) => {
    const path = concurso ? `${CAIXA_PATH}/${concurso}` : CAIXA_PATH;
    const options = {
      hostname: CAIXA_HOST,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx',
        'Origin': 'https://loterias.caixa.gov.br',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      },
      timeout: 8000
    };

    const req = https.request(options, (resp) => {
      let data = '';
      const encoding = resp.headers['content-encoding'];

      if (encoding === 'br') {
        const zlib = require('zlib');
        const br = zlib.createBrotliDecompress();
        resp.pipe(br);
        br.on('data', chunk => data += chunk);
        br.on('end', () => {
          if (resp.statusCode !== 200) {
            reject(new Error(`Caixa API retornou ${resp.statusCode} para concurso ${concurso || 'atual'}`));
            return;
          }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Resposta da Caixa não é JSON válido')); }
        });
        br.on('error', reject);
      } else if (encoding === 'gzip') {
        const zlib = require('zlib');
        const gunzip = zlib.createGunzip();
        resp.pipe(gunzip);
        gunzip.on('data', chunk => data += chunk);
        gunzip.on('end', () => {
          if (resp.statusCode !== 200) {
            reject(new Error(`Caixa API retornou ${resp.statusCode} para concurso ${concurso || 'atual'}`));
            return;
          }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Resposta da Caixa não é JSON válido')); }
        });
        gunzip.on('error', reject);
      } else {
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          if (resp.statusCode !== 200) {
            reject(new Error(`Caixa API retornou ${resp.statusCode} para concurso ${concurso || 'atual'}`));
            return;
          }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Resposta da Caixa não é JSON válido')); }
        });
      }
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout ao conectar na API da Caixa')); });
    req.end();
  });
}

function parseConcurso(resultado) {
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
    if (faixa1) {
      ganhadores15 = faixa1.quantidadeGanhadores || 0;
    }
  }

  return {
    numero,
    data_sorteio,
    ...balls,
    ganhadores_15_acertos: ganhadores15
  };
}

module.exports = { fetchConcurso, parseConcurso };
