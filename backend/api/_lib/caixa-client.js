// backend/api/_lib/caixa-client.js

const CAIXA_API_BASE = 'http://servicebus2.caixa.gov.br/portaldeloterias/api';

const LOTERIAS_SUPORTADAS = {
  lotofacil: { slug: 'lotofacil', totalDezenas: 25, minDezenas: 15, maxDezenas: 20 },
  megasena: { slug: 'megasena', totalDezenas: 60, minDezenas: 6, maxDezenas: 15 },
  quina: { slug: 'quina', totalDezenas: 80, minDezenas: 5, maxDezenas: 15 },
  lotomania: { slug: 'lotomania', totalDezenas: 100, minDezenas: 50, maxDezenas: 50 },
};

/**
 * Busca o resultado mais recente de uma loteria.
 */
async function buscarUltimoResultado(loteria = 'lotofacil') {
  const url = `${CAIXA_API_BASE}/${loteria}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'LotoRico-Sync/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Caixa API status ${response.status} para ${loteria}`);
  }

  const data = await response.json();
  return normalizarResultado(data, loteria);
}

/**
 * Busca um concurso específico pelo número.
 */
async function buscarResultadoPorConcurso(loteria = 'lotofacil', concursoNumero) {
  const url = `${CAIXA_API_BASE}/${loteria}/${concursoNumero}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'LotoRico-Sync/1.0',
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Caixa API status ${response.status} para concurso ${concursoNumero}`);
  }

  const data = await response.json();
  return normalizarResultado(data, loteria);
}

/**
 * Normaliza o JSON da Caixa para o formato interno do Loto Rico.
 */
function normalizarResultado(data, loteria) {
  const config = LOTERIAS_SUPORTADAS[loteria] || LOTERIAS_SUPORTADAS.lotofacil;

  const concurso = parseInt(data.numero || data.concurso, 10);

  const dezenasRaw = data.dezenasSorteadas || data.listaDezenas || data.dezenas || [];
  const dezenas = dezenasRaw
    .map(d => parseInt(String(d).replace(/\D/g, ''), 10))
    .filter(d => !isNaN(d) && d >= 1 && d <= config.totalDezenas)
    .sort((a, b) => a - b);

  if (dezenas.length < config.minDezenas) {
    throw new Error(`Dezenas insuficientes: ${dezenas.length} (mínimo: ${config.minDezenas})`);
  }

  let dataSorteio = data.dataApuracao || data.dataSorteio || data.data || '';
  if (dataSorteio.includes('/')) {
    const [dia, mes, ano] = dataSorteio.split('/');
    dataSorteio = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  const rateios = data.listaRateioPremio || data.rateios || [];
  const metadados = {
    ganhadores: {},
    rateios: {},
  };

  for (const r of rateios) {
    const faixa = parseInt(r.faixa || r.numeroFaixa || 0, 10);
    if (faixa > 0) {
      metadados.ganhadores[`faixa_${faixa}`] = parseInt(r.quantidadeGanhadores || 0, 10);
      metadados.rateios[`faixa_${faixa}`] = parseFloat(r.valorPremio || 0);
    }
  }

  const ganhadoresPrincipais = metadados.ganhadores.faixa_1 ||
    parseInt(data.quantidadeGanhadores || 0, 10);

  let cidadeUf = null;
  if (data.listaMunicipioUFGanhadores && data.listaMunicipioUFGanhadores.length > 0) {
    const g = data.listaMunicipioUFGanhadores[0];
    cidadeUf = `${g.municipio || g.cidade || ''}/${g.uf || g.UF || ''}`.trim();
    if (cidadeUf === '/') cidadeUf = null;
  }

  return {
    concurso,
    data_sorteio: dataSorteio,
    dezenas,
    cidade_uf: cidadeUf,
    ganhadores_principais: ganhadoresPrincipais,
    arrecadacao_total: parseFloat(data.valorArrecadado || 0),
    estimativa_premio: parseFloat(data.valorEstimadoProximoConcurso || 0),
    acumulado: parseFloat(data.valorAcumulado || 0),
    acumulado_especial: parseFloat(data.valorAcumuladoProximoConcurso || 0),
    observacao: data.observacao || null,
    metadados: JSON.stringify(metadados),
    loteria,
  };
}

/**
 * Sincroniza concursos faltantes iterativamente.
 */
async function sincronizarConcursos(fromConcurso, toConcurso, loteria = 'lotofacil', onProgress = null) {
  const resultados = [];
  const total = toConcurso - fromConcurso + 1;

  for (let i = 0; i < total; i++) {
    const concursoNum = fromConcurso + i;

    try {
      const resultado = await buscarResultadoPorConcurso(loteria, concursoNum);
      if (resultado) {
        resultados.push(resultado);
        if (onProgress) onProgress(i + 1, total, resultado);
      }
    } catch (error) {
      console.error(`Erro ao buscar concurso ${concursoNum}: ${error.message}`);
      if (onProgress) onProgress(i + 1, total, null, error);
    }

    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return resultados;
}

module.exports = {
  buscarUltimoResultado,
  buscarResultadoPorConcurso,
  sincronizarConcursos,
  normalizarResultado,
  LOTERIAS_SUPORTADAS,
};
