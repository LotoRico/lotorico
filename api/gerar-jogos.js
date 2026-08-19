// api/gerar-jogos.js
const pool = require('./_lib/db');

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function extrairDezenas(s) {
  return [
    s.bola1, s.bola2, s.bola3, s.bola4, s.bola5,
    s.bola6, s.bola7, s.bola8, s.bola9, s.bola10,
    s.bola11, s.bola12, s.bola13, s.bola14, s.bola15
  ];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcStats(sorteios) {
  const freq = {};
  const atraso = {};
  for (let i = 1; i <= 25; i++) { freq[i] = 0; atraso[i] = -1; }

  sorteios.forEach((s, idx) => {
    extrairDezenas(s).forEach(d => {
      freq[d]++;
      if (atraso[d] === -1) atraso[d] = idx;
    });
  });

  const total = sorteios.length;
  const stats = {};
  for (let i = 1; i <= 25; i++) {
    stats[i] = {
      frequencia: freq[i],
      percentual: parseFloat(((freq[i] / total) * 100).toFixed(1)),
      atraso: atraso[i] === -1 ? total : atraso[i]
    };
  }
  return stats;
}

function scoreDezenas(stats, estrategia) {
  const scores = {};
  const entradas = Object.entries(stats).map(([n, d]) => ({
    n: parseInt(n), freq: d.frequencia, atraso: d.atraso
  }));

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

// Validação dinâmica baseada na quantidade de dezenas
function validarJogo(jogo, dezenas) {
  const set = new Set(jogo);

  // Paridade: escala conforme quantidade de dezenas
  // 15 dezenas: 5-11 pares | 18: 6-13 | 20: 7-14
  const minPares = Math.max(3, Math.floor(dezenas * 0.33));
  const maxPares = Math.min(dezenas - 1, Math.ceil(dezenas * 0.73));
  const pares = jogo.filter(d => d % 2 === 0).length;
  if (pares < minPares || pares > maxPares) return false;

  // Soma: escala conforme quantidade de dezenas
  // 15 dezenas: 150-210 | cada dezena extra adiciona ~13 à média
  const offset = dezenas - 15;
  const minSoma = 150 + offset * 12;
  const maxSoma = 210 + offset * 16;
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

  // Linhas do volante 5x5: mínimo 1 por linha (sempre válido com 15+ dezenas)
  const linhas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  jogo.forEach(n => { linhas[Math.ceil(n / 5)]++; });
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
    let quantidade = parseInt(req.query.quantidade, 10) || 10;
    let dezenas = parseInt(req.query.dezenas, 10) || 15;
    let janela = parseInt(req.query.janela, 10) || 20;
    const estrategia = req.query.estrategia || 'mista';
    const incluirRaw = req.query.incluir || '';
    const excluirRaw = req.query.excluir || '';

    quantidade = Math.max(1, Math.min(300, quantidade));
    dezenas = Math.max(15, Math.min(20, dezenas));
    janela = Math.max(5, Math.min(50, janela));

    const incluir = incluirRaw
      .split(',').map(s => parseInt(s.trim(), 10))
      .filter(n => n >= 1 && n <= 25);
    const excluir = excluirRaw
      .split(',').map(s => parseInt(s.trim(), 10))
      .filter(n => n >= 1 && n <= 25);

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

    const [sorteios] = await pool.query(
      `SELECT concurso, bola1, bola2, bola3, bola4, bola5,
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

    const stats = calcStats(sorteios);
    const scores = scoreDezenas(stats, estrategia);

    const todasDezenas = [];
    for (let i = 1; i <= 25; i++) {
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

    const jogos = [];
    const jogosUnicos = new Set();
    let tentativas = 0;
    const maxTentativas = quantidade * 30;

    while (jogos.length < quantidade && tentativas < maxTentativas) {
      tentativas++;

      const sorteadas = weightedSample(candidatos, scores, faltamSortear);
      const jogoCompleto = [...incluir, ...sorteadas].sort((a, b) => a - b);

      if (!validarJogo(jogoCompleto, dezenas)) continue;

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

    const [totalRows] = await pool.query('SELECT COUNT(*) as total FROM sorteios');

    return res.status(200).json({
      sucesso: true,
      dados: {
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
