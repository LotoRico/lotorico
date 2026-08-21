// api/_lib/caixa-client.js

const GITHUB_RAW = 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/lotofacil.json';
const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';

let cacheDados = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

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
  try { return JSON.stringify(val); } catch { return null; }
}

function normalizarDezenas(entry) {
  const dezenasOrdem = (entry || []).map(d => parseInt(d, 10));
  const dezenas = [...dezenasOrdem].sort((a, b) => a - b);
  return { dezenas, dezenasOrdem };
}

async function fetchDadosGitHub() {
  const agora = Date.now();
  if (cacheDados && (agora - cacheTimestamp) < CACHE_TTL) {
    return cacheDados;
  }

  const resp = await fetch(GITHUB_RAW, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });

  if (!resp.ok) {
    throw new Error(`GitHub retornou HTTP ${resp.status}`);
  }

  const text = await resp.text();
  const json = JSON.parse(text);
  cacheDados = json;
  cacheTimestamp = agora;
  return json;
}

async function fetchConcursoCaixa(concurso) {
  const url = concurso ? `${CAIXA_BASE}/${concurso}` : CAIXA_BASE;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!resp.ok) throw new Error(`Caixa retornou HTTP ${resp.status}`);
  return JSON.parse(await resp.text());
}

function parseResultadoCaixa(resultado) {
  const dezenasOrdem = (resultado.dezenasSorteadasOrdemSorteio || []).map(d => parseInt(d, 10));
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

function parseResultadoGitHub(concurso, entry) {
  const { dezenas, dezenasOrdem } = normalizarDezenas(entry);

  return {
    concurso,
    data: null,
    dezenas: JSON.stringify(dezenas),
    dezenas_ordem_sorteio: JSON.stringify(dezenasOrdem),
    acumulado: null,
    local_sorteio: null,
    municipio_uf_sorteio: null,
    indicador_concurso_especial: null,
    numero_concurso_anterior: null,
    numero_concurso_proximo: null,
    numero_concurso_final_0_5: null,
    numero_jogo: null,
    tipo_jogo: null,
    tipo_publicacao: null,
    ultimo_concurso: null,
    observacao: null,
    exibir_detalhamento_por_cidade: null,
    data_proximo_concurso: null,
    valor_arrecadado: null,
    valor_estimado_proximo_concurso: null,
    valor_acumulado_proximo_concurso: null,
    valor_acumulado_concurso_0_5: null,
    valor_acumulado_concurso_especial: null,
    valor_saldo_reserva_garantidora: null,
    valor_total_premio_faixa_um: null,
    premiacao_contingencia: null,
    lista_rateio_premio: null,
    lista_municipio_uf_ganhadores: null,
    lista_dezenas_segundo_sorteio: null,
    lista_resultado_equipe_esportiva: null,
    nome_time_coracao_mes_sorte: null
  };
}

async function fetchConcurso(concurso) {
  if (!concurso) {
    try {
      const resultado = await fetchConcursoCaixa(null);
      return parseResultadoCaixa(resultado);
    } catch (eCaixa) {
      const dados = await fetchDadosGitHub();
      const chaves = Object.keys(dados).map(Number);
      const maxConcurso = Math.max(...chaves);
      return parseResultadoGitHub(maxConcurso, dados[String(maxConcurso)]);
    }
  }

  try {
    const resultado = await fetchConcursoCaixa(concurso);
    return parseResultadoCaixa(resultado);
  } catch (eCaixa) {
    const dados = await fetchDadosGitHub();
    const entry = dados[String(concurso)];
    if (!entry) throw new Error(`Concurso ${concurso} não encontrado em nenhuma fonte`);
    return parseResultadoGitHub(concurso, entry);
  }
}

async function fetchConcursosApos(ultimoConcurso, limite) {
  const dados = await fetchDadosGitHub();
  const chaves = Object.keys(dados)
    .map(Number)
    .filter(n => n > ultimoConcurso)
    .sort((a, b) => a - b)
    .slice(0, limite);

  return chaves.map(c => parseResultadoGitHub(c, dados[String(c)]));
}

module.exports = { fetchConcurso, fetchConcursosApos };
