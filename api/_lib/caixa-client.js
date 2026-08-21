// api/_lib/caixa-client.js
const https = require('https');

const CAIXA_HOST = 'servicebus2.caixa.gov.br';
const CAIXA_PATH = '/portaldeloterias/api/lotofacil';

function httpsGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CAIXA_HOST,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx'
      },
      timeout: 10000
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

function parseDataCaixa(dataStr) {
  if (!dataStr) return null;
  if (dataStr.includes('/')) {
    const [dia, mes, ano] = dataStr.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return dataStr;
}

function safeJson(val) {
  if (val === null || val === undefined) return null;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

async function fetchConcurso(concurso) {
  const path = concurso
    ? `${CAIXA_PATH}/${concurso}`
    : CAIXA_PATH;

  const resultado = await httpsGet(path);

  const dezenasOrdem = (resultado.dezenasSorteadasOrdemSorteio || [])
    .map(d => parseInt(d, 10));

  const dezenas = [...dezenasOrdem].sort((a, b) => a - b);

  return {
    concurso: resultado.numero,
    data: parseDataCaixa(resultado.dataApuracao),
    dezenas: JSON.stringify(dezenas),
    dezenas_ordem_sorteio: JSON.stringify(dezenasOrdem),
    acumulado: resultado.acumulado,
    local_sorteio: resultado.localSorteio || null,
    municipio_uf_sorteio: resultado.municipioUFSorteio || null,
    indicador_concurso_especial: resultado.indicadorConcursoEspecial || null,
    numero_concurso_anterior: resultado.numeroConcursoAnterior || null,
    numero_concurso_proximo: resultado.numeroConcursoProximo || null,
    numero_concurso_final_0_5: resultado.numeroConcursoFinal0a5 || null,
    numero_jogo: resultado.numeroJogo || null,
    tipo_jogo: resultado.tipoJogo || null,
    tipo_publicacao: resultado.tipoPublicacao || null,
    ultimo_concurso: resultado.ultimoConcurso,
    observacao: resultado.observacao || null,
    exibir_detalhamento_por_cidade: resultado.exibirDetalhamentoPorCidade,
    data_proximo_concurso: parseDataCaixa(resultado.dataProximoConcurso),
    valor_arrecadado: resultado.valorArrecadado || null,
    valor_estimado_proximo_concurso: resultado.valorEstimadoProximoConcurso || null,
    valor_acumulado_proximo_concurso: resultado.valorAcumuladoProximoConcurso || null,
    valor_acumulado_concurso_0_5: resultado.valorAcumuladoConcurso0a5 || null,
    valor_acumulado_concurso_especial: resultado.valorAcumuladoConcursoEspecial || null,
    valor_saldo_reserva_garantidora: resultado.valorSaldoReservaGarantidora || null,
    valor_total_premio_faixa_um: resultado.valorTotalPremioFaixaUm || null,
    premiacao_contingencia: safeJson(resultado.premiacaoContingencia),
    lista_rateio_premio: safeJson(resultado.listaRateioPremio),
    lista_municipio_uf_ganhadores: safeJson(resultado.listaMunicipioUFGanhadores),
    lista_dezenas_segundo_sorteio: safeJson(resultado.listaDezenasSegundoSorteio),
    lista_resultado_equipe_esportiva: safeJson(resultado.listaResultadoEquipeEsportiva),
    nome_time_coracao_mes_sorte: resultado.nomeTimeCoracaoMesSorte || null
  };
}

module.exports = { fetchConcurso };
