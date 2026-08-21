// api/gerar-jogos.js

const { pool, obterConfigLoteria, obterTabelaResultados } = require('./_lib/db');

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calcula frequência e atraso de cada dezena com base nos sorteios.
 * @param {Array<{concurso, dezenas}>} sorteios - Sorteios em ordem decrescente
 * @param {number} dezenaMin - menor dezena possível (ex: 1)
 * @param {number} dezenaMax - maior dezena possível (ex: 25)
 * @returns {Object} stats por dezena
 */
function calcStats(sorteios, dezenaMin, dezenaMax) {
  const freq = {};
  const atraso = {};
  for (let i = dezenaMin; i <= dezenaMax; i++) { freq[i] = 0; atraso[i] = -1; }

  sorteios.forEach((s, idx) => {
    s.dezenas.forEach(d => {
      freq[d]++;
      if (atraso[d] === -1) atraso[d] = idx;
    });
  });

  const total = sorteios.length;
  const stats = {};
  for (let i = dezenaMin; i <= dezenaMax; i++) {
    stats[i] = {
      frequencia: freq[i],
      percentual: parseFloat(((freq[i] / total) * 100).toFixed(1)),
      atraso: atraso[i] === -1 ? total : atraso[i]
    };
  }
  return stats;
}

function scoreDezenas(stats, estrategia, dezenaMin, dezenaMax) {
  const scores = {};
  const entradas = [];
  for (let i = dezenaMin; i <= dezenaMax; i++) {
    entradas.push({ n: i, freq: stats[i].frequencia, atraso: stats[i].atraso });
  }

  if (estrategia === 'quentes') {
    const maxFreq = Math.max(...entradas.map(e => e.freq));
    entradas.forEach(e => { scores[e.n] = e.freq / maxFreq; });
  } else if (estrategia === 'frios') {
    const maxAtraso = Math.max(...entradas.map(e => e.atraso));
    const maxFreq = Math.max(...entradas.map(e => e.freq));
    entradas.forEach(e => {
      const scoreFreq = 1 - (e.freq / maxFreq);
      const scoreAtraso = e.atraso / maxAtraso;
      scores[e.n] = (scoreFreq + scoreAtraso) / 2;
    });
  } else if (estrategia === 'equilibrada') {
    const maxFreq = Math.max(...entradas.map(e => e.freq));
    entradas.forEach(e => {
      const distFreq = Math.abs(e.freq / maxFreq - 0.5);
      scores[e.n] = 1 - distFreq;
    });
  } else {
    // 'mista' (padrão)
    const maxFreq = Math.max(...entradas.map(e => e.freq));
    const maxAtraso = Math.max(...entradas.map(e => e.atraso));
    entradas.forEach(e => {
      const scoreFreq = e.freq / maxFreq;
      const scoreAtraso = e.atraso / maxAtraso;
      scores[e.n] = (scoreFreq + scoreAtraso) / 2;
    });
  }
  return scores;
}

function weightedSample(candidatos, scores, quantidade) {
  const samplePool = candidatos.map(n => ({ n, w: scores[n] || 0.1 }));
  const selecionadas = [];
  for (let i = 0; i < quantidade; i++) {
    const total = samplePool.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < samplePool.length; j++) {
      r -= samplePool[j].w;
      if (r <= 0) { idx = j; break; }
      idx = j;
    }
    selecionadas.push(samplePool[idx].n);
    samplePool.splice(idx, 1);
  }
  return selecionadas.sort((a, b) => a - b);
}

/**
 * Validação dinâmica baseada na quantidade de dezenas e config da loteria.
 * @param {Array} jogo - dezenas selecionadas
 * @param {number} dezenas - quantidade de dezenas no jogo
 * @param {Object} config - config da loteria (linhas_volante, colunas_volante, dezena_min, dezena_max)
 * @returns {boolean}
 */
function validarJogo(jogo, dezenas, config) {
  const set = new Set(jogo);

  // Paridade: escala conforme quantidade de dezenas
  const minPares = Math.max(3, Math.floor(dezenas * 0.33));
  const maxPares = Math.min(dezenas - 1, Math.ceil(dezenas * 0.73));
  const pares = jogo.filter(d => d % 2 === 0).length;
  if (pares < minPares || pares > maxPares) return false;

  // Soma: escala conforme quantidade de dezenas
  const offset = dezenas - config.min_selecao;
  const baseMin = 150;
  const baseMax = 210;
  const minSoma = baseMin + offset * 12;
  const maxSoma = baseMax + offset * 16;
  const soma = jogo.reduce((a, b) => a + b, 0);
  if (soma < minSoma || soma > maxSoma) return false;

  // Sequências: máximo de consecutivos escala com mais dezenas
  const maxSeqPermitida = 5 + Math.floor(offset * 0.5);
  const sorted = [...jogo].sort((a, b) => a - b);
  let maxSeq = 1, curSeq = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      curSeq++;
      maxSeq = Math.max(maxSeq, curSeq);
    } else {
      curSeq = 1;
    }
  }
  if (maxSeq > maxSeqPermitida) return false;

  // Distribuição por linhas do volante
  const { linhas_volante, colunas_volante, dezena_min } = config;
  const totalColunas = linhas_volante * colunas_volante;
  const linhas = {};
  for (let l = 1; l <= linhas_volante; l++) linhas[l] = 0;
  jogo.forEach(n => {
    const relativo = n - dezena_min;
    const linha = Math.floor(relativo / colunas_volante) + 1;
    if (linhas[linha] !== undefined) linhas[linha]++;
  });
  if (Object.values(linhas).some(v => v === 0)) return false;

  return true;
}

function jogoKey(jogo) {
  return [...jogo].sort((a, b) => a - b).join('-');
}

module.exports = async (req, res) => {
  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use GET para este endpoint' });
  }

  try {
    const slug = req.query.loteria || 'lotofacil';
    const config = await obterConfigLoteria(slug);

    if (!config) {
      return res.status(404).json({ sucesso: false, mensagem: `Loteria '${slug}' não encontrada ou inativa.` });
    }

    const tabela = obterTabelaResultados(slug);
    const { dezena_min, dezena_max, min_selecao, max_selecao, total_dezenas } = config;

    // Parâmetros com validação contra limites da loteria
    let quantidade = parseInt(req.query.quantidade, 10) || 10;
    let dezenas = parseInt(req.query.dezenas, 10) || min_selecao;
    let janela = parseInt(req.query.janela, 10) || 20;
    const estrategia = req.query.estrategia || 'mista';
    const incluirRaw = req.query.incluir || '';
    const excluirRaw = req.query.excluir || '';

    quantidade = Math.max(1, Math.min(300, quantidade));
    dezenas = Math.max(min_selecao, Math.min(max_selecao, dezenas));
    janela = Math.max(5, Math.min(50, janela));

    // Parse de dezenas para incluir/excluir
    const incluir = incluirRaw
      .split(',').map(s => parseInt(s.trim(), 10))
      .filter(n => n >= dezena_min && n <= dezena_max);
    const excluir = excluirRaw
      .split(',').map(s => parseInt(s.trim(), 10))
      .filter(n => n >= dezena_min && n <= dezena_max);

    const incluirSet = new Set(incluir);
    const excluirSet = new Set(excluir);

    for (const n of incluir) {
      if (excluirSet.has(n)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Dezena ${n} está em incluir e excluir simultaneamente`
        });
      }
    }

    if (incluir.length > dezenas) {
      return res.status(400).json({
        sucesso: false,
        mensagem: `Incluir tem ${incluir.length} dezenas, mas jogo tem apenas ${dezenas} posições`
      });
    }

    // Buscar sorteios da tabela correta — só precisa de concurso e dezenas
    const [sorteiosRaw] = await pool.query(
      `SELECT concurso, dezenas FROM ${tabela} ORDER BY concurso DESC LIMIT ?`,
      [janela]
    );

    if (sorteiosRaw.length === 0) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Nenhum sorteio encontrado no banco de dados'
      });
    }

    // Parsear JSON de dezenas
    const sorteios = sorteiosRaw.map(row => ({
      concurso: row.concurso,
      dezenas: typeof row.dezenas === 'string' ? JSON.parse(row.dezenas) : row.dezenas
    }));

    const stats = calcStats(sorteios, dezena_min, dezena_max);
    const scores = scoreDezenas(stats, estrategia, dezena_min, dezena_max);

    // Construir pool de dezenas disponíveis
    const todasDezenas = [];
    for (let i = dezena_min; i <= dezena_max; i++) {
      if (!excluirSet.has(i)) todasDezenas.push(i);
    }

    const faltamSortear = dezenas - incluir.length;
    const candidatos = todasDezenas.filter(n => !incluirSet.has(n));

    if (candidatos.length < faltamSortear) {
      return res.status(400).json({
        sucesso: false,
        mensagem: `Dezenas disponíveis (${candidatos.length}) insuficientes para completar ${dezenas} dezenas`
      });
    }

    // Gerar jogos
    const jogos = [];
    const jogosUnicos = new Set();
    let tentativas = 0;
    const maxTentativas = quantidade * 30;

    while (jogos.length < quantidade && tentativas < maxTentativas) {
      tentativas++;
      const sorteadas = weightedSample(candidatos, scores, faltamSortear);
      const jogoCompleto = [...incluir, ...sorteadas].sort((a, b) => a - b);

      if (!validarJogo(jogoCompleto, dezenas, config)) continue;

      const key = jogoKey(jogoCompleto);
      if (jogosUnicos.has(key)) continue;
      jogosUnicos.add(key);

      jogos.push({
        id: jogos.length + 1,
        dezenas: jogoCompleto,
        soma: jogoCompleto.reduce((a, b) => a + b, 0),
        pares: jogoCompleto.filter(d => d % 2 === 0).length,
        impares: jogoCompleto.filter(d => d % 2 !== 0).length
      });
    }

    // Total de registros no banco
    const [totalRows] = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);

    return res.status(200).json({
      sucesso: true,
      dados: {
        loteria: slug,
        quantidade_solicitada: quantidade,
        quantidade_gerada: jogos.length,
        dezenas_por_jogo: dezenas,
        janela_analise: janela,
        estrategia,
        incluir: incluir.length > 0 ? incluir : undefined,
        excluir: excluir.length > 0 ? excluir : undefined,
        total_registros_banco: totalRows[0].total,
        concurso_inicial: sorteios[sorteios.length - 1].concurso,
        concurso_final: sorteios[0].concurso,
        jogos
      }
    });

  } catch (error) {
    console.error('[gerar-jogos] Erro:', error.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: error.message || 'Erro interno ao gerar jogos'
    });
  }
};
