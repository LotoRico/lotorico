// backend/api/estatisticas.js
const pool = require('./_lib/db');

// ===================== UTILITÁRIOS =====================

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function formatarData(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  if (typeof d === 'string') return d.split('T')[0];
  return null;
}

function extrairDezenas(s) {
  return [
    s.bola1, s.bola2, s.bola3, s.bola4, s.bola5,
    s.bola6, s.bola7, s.bola8, s.bola9, s.bola10,
    s.bola11, s.bola12, s.bola13, s.bola14, s.bola15
  ];
}

// ===================== CÁLCULOS ESTATÍSTICOS =====================

// 1. FREQUÊNCIA — quantas vezes cada dezena (1-25) apareceu
function calcFrequencia(sorteios) {
  const freq = {};
  for (let i = 1; i <= 25; i++) freq[i] = 0;

  sorteios.forEach(s => {
    extrairDezenas(s).forEach(d => freq[d]++);
  });

  const total = sorteios.length;
  const r = {};
  for (let i = 1; i <= 25; i++) {
    r[i] = {
      frequencia: freq[i],
      percentual: parseFloat(((freq[i] / total) * 100).toFixed(1))
    };
  }
  return r;
}

// 2. ATRASO — quantos concursos desde a última aparição de cada dezena
function calcAtraso(sorteios) {
  const atraso = {};
  for (let i = 1; i <= 25; i++) atraso[i] = -1;

  // sorteios[0] = mais recente
  for (let idx = 0; idx < sorteios.length; idx++) {
    extrairDezenas(sorteios[idx]).forEach(d => {
      if (atraso[d] === -1) atraso[d] = idx;
    });
  }

  const r = {};
  for (let i = 1; i <= 25; i++) {
    r[i] = atraso[i] === -1 ? sorteios.length : atraso[i];
  }
  return r;
}

// 3. CLASSIFICAÇÃO QUENTE/FRIO/MORNO
function classificarTermico(frequencia) {
  const ord = Object.entries(frequencia)
    .map(([num, d]) => ({ n: parseInt(num), f: d.frequencia }))
    .sort((a, b) => b.f - a.f);

  return {
    quentes: ord.slice(0, 8).map(e => e.n),
    mornos: ord.slice(8, 17).map(e => e.n),
    frios: ord.slice(17, 25).map(e => e.n)
  };
}

// 4. PARIDADE — distribuição pares vs ímpares
function calcParidade(sorteios) {
  let tPares = 0, tImpares = 0;
  const dist = {};

  sorteios.forEach(s => {
    const pares = extrairDezenas(s).filter(d => d % 2 === 0).length;
    const impares = 15 - pares;
    tPares += pares;
    tImpares += impares;
    const key = `${pares}p${impares}i`;
    dist[key] = (dist[key] || 0) + 1;
  });

  return {
    media_pares: parseFloat((tPares / sorteios.length).toFixed(2)),
    media_impares: parseFloat((tImpares / sorteios.length).toFixed(2)),
    distribuicao: dist
  };
}

// 5. SOMA — estatísticas da soma das 15 dezenas
function calcSoma(sorteios) {
  const somas = sorteios.map(s =>
    extrairDezenas(s).reduce((acc, d) => acc + d, 0)
  );

  return {
    media: parseFloat((somas.reduce((a, b) => a + b, 0) / somas.length).toFixed(1)),
    minimo: Math.min(...somas),
    maximo: Math.max(...somas),
    ultima: somas[0],
    historico: somas.slice(0, 10)
  };
}

// 6. REPETIÇÃO — quantas dezenas se repetem do sorteio anterior
function calcRepeticao(sorteios) {
  if (sorteios.length < 2) return null;

  const reps = [];
  for (let i = 0; i < sorteios.length - 1; i++) {
    const atual = new Set(extrairDezenas(sorteios[i]));
    const anterior = new Set(extrairDezenas(sorteios[i + 1]));
    let count = 0;
    atual.forEach(d => { if (anterior.has(d)) count++; });
    reps.push(count);
  }

  return {
    media_repeticao: parseFloat((reps.reduce((a, b) => a + b, 0) / reps.length).toFixed(2)),
    ultima_repeticao: reps[0],
    historico: reps.slice(0, 10)
  };
}

// 7. SEQUÊNCIAS — números consecutivos no volante
function calcSequencias(sorteios) {
  let totalSeq = 0, maxSeqGlobal = 0;
  const dist = {};

  sorteios.forEach(s => {
    const dez = extrairDezenas(s).sort((a, b) => a - b);
    let maxSeq = 1, curSeq = 1, seqCount = 0;

    for (let i = 1; i < dez.length; i++) {
      if (dez[i] === dez[i - 1] + 1) {
        curSeq++;
        maxSeq = Math.max(maxSeq, curSeq);
      } else {
        if (curSeq >= 2) seqCount++;
        curSeq = 1;
      }
    }
    if (curSeq >= 2) seqCount++;

    totalSeq += seqCount;
    maxSeqGlobal = Math.max(maxSeqGlobal, maxSeq);
    dist[seqCount] = (dist[seqCount] || 0) + 1;
  });

  return {
    media_sequencias: parseFloat((totalSeq / sorteios.length).toFixed(2)),
    max_sequencia_historica: maxSeqGlobal,
    distribuicao: dist
  };
}

// 8. DISTRIBUIÇÃO ESPACIAL — Linhas e colunas do volante 5×5
function calcDistribuicaoEspacial(sorteios) {
  const linhas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const colunas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  sorteios.forEach(s => {
    extrairDezenas(s).forEach(num => {
      linhas[Math.ceil(num / 5)]++;
      colunas[((num - 1) % 5) + 1]++;
    });
  });

  const total = sorteios.length;
  const mL = {}, mC = {};
  for (let i = 1; i <= 5; i++) {
    mL[i] = parseFloat((linhas[i] / total).toFixed(2));
    mC[i] = parseFloat((colunas[i] / total).toFixed(2));
  }

  return { linhas: mL, colunas: mC };
}

// 9. TENDÊNCIA — compara metade recente vs metade antiga
function calcTendencia(sorteios) {
  const half = Math.floor(sorteios.length / 2);
  if (half < 1) return null;

  const recentes = sorteios.slice(0, half);
  const antigos = sorteios.slice(half);

  const fRec = {}, fAnt = {};
  for (let i = 1; i <= 25; i++) { fRec[i] = 0; fAnt[i] = 0; }

  recentes.forEach(s => extrairDezenas(s).forEach(d => fRec[d]++));
  antigos.forEach(s => extrairDezenas(s).forEach(d => fAnt[d]++));

  const r = {};
  for (let i = 1; i <= 25; i++) {
    const diff = fRec[i] - fAnt[i];
    r[i] = {
      freq_recente: fRec[i],
      freq_antiga: fAnt[i],
      variacao: diff,
      direcao: diff > 0 ? 'subindo' : diff < 0 ? 'caindo' : 'estavel'
    };
  }
  return r;
}

// 10. COMBINAÇÕES VENCEDORAS — concursos com 15 acertos (anti-histórico)
async function buscarVencedoras() {
  const [rows] = await pool.query(
    `SELECT concurso, bola1, bola2, bola3, bola4, bola5, bola6, bola7,
            bola8, bola9, bola10, bola11, bola12, bola13, bola14, bola15
     FROM sorteios
     WHERE ganhadores_15_acertos > 0
     ORDER BY concurso DESC
     LIMIT 50`
  );

  return rows.map(s => ({
    concurso: s.concurso,
    dezenas: extrairDezenas(s).sort((a, b) => a - b)
  }));
}

// ===================== HANDLER =====================
module.exports = async (req, res) => {
  setHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use GET para este endpoint' });
  }

  try {
    let janela = parseInt(req.query.janela, 10) || 20;
    janela = Math.max(5, Math.min(50, janela));

    // Buscar últimos N sorteios (mais recentes primeiro)
    const [sorteios] = await pool.query(
      `SELECT concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5,
              bola6, bola7, bola8, bola9, bola10, bola11, bola12, bola13,
              bola14, bola15
       FROM sorteios
       ORDER BY concurso DESC
       LIMIT ?`,
      [janela]
    );

    if (sorteios.length === 0) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Nenhum sorteio encontrado no banco de dados'
      });
    }

    // Calcular todas as estatísticas
    const frequencia = calcFrequencia(sorteios);
    const atraso = calcAtraso(sorteios);
    const classificacao = classificarTermico(frequencia);
    const paridade = calcParidade(sorteios);
    const soma = calcSoma(sorteios);
    const repeticao = calcRepeticao(sorteios);
    const sequencias = calcSequencias(sorteios);
    const distribuicao = calcDistribuicaoEspacial(sorteios);
    const tendencia = calcTendencia(sorteios);
    const vencedoras = await buscarVencedoras();

    // Últimos 5 sorteios para dashboard
    const ultimos = sorteios.slice(0, 5).map(s => ({
      concurso: s.concurso,
      data_sorteio: formatarData(s.data_sorteio),
      dezenas: extrairDezenas(s).sort((a, b) => a - b)
    }));

    // Total de registros
    const [totalRows] = await pool.query('SELECT COUNT(*) as total FROM sorteios');

    return res.status(200).json({
      sucesso: true,
      dados: {
        janela,
        total_analisados: sorteios.length,
        total_registros_banco: totalRows[0].total,
        concurso_inicial: sorteios[sorteios.length - 1].concurso,
        concurso_final: sorteios[0].concurso,
        frequencia,
        atraso,
        classificacao_termica: classificacao,
        paridade,
        soma,
        repeticao,
        sequencias,
        distribuicao_espacial: distribuicao,
        tendencia,
        combinacoes_vencedoras: vencedoras,
        ultimos_sorteios: ultimos
      }
    });

  } catch (error) {
    console.error('[estatisticas] Erro:', error.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: error.message || 'Erro interno ao calcular estatísticas'
    });
  }
};
