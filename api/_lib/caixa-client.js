// api/_lib/caixa-client.js

const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';
const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
];

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

async function httpsGet(url, useProxy) {
  const finalUrl = useProxy ? PROXIES[useProxy - 1](url) : url;
  const headers = useProxy
    ? { 'Accept': 'application/json' }
    : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx'
      };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch(finalUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const text = await resp.text();
    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchConcurso(concurso) {
  const url = concurso ? `${CAIXA_BASE}/${concurso}` : CAIXA_BASE;
  const tentativas = [
    { label: 'direto', useProxy: 0 },
    { label: 'allorigins', useProxy: 1 },
    { label: 'codetabs', useProxy: 2 },
    { label: 'corsproxy', useProxy: 3 }
  ];

  let ultimoErro = null;

  for (const t of tentativas) {
    try {
      const resultado = await httpsGet(url, t.useProxy);
      return normalizarResultado(resultado);
    } catch (err) {
      ultimoErro = `${t.label}: ${err.message}`;
    }
  }

  throw new Error(`Todas as fontes falharam. Último erro: ${ultimoErro}`);
}

function normalizarResultado(resultado) {
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
