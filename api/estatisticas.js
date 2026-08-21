// api/estatisticas.js
const { pool, obterConfigLoteria, obterTabelaResultados } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const slug = req.query.loteria || 'lotofacil';
    const janela = parseInt(req.query.janela, 10) || 20;
    const config = await obterConfigLoteria(slug);
    if (!config) {
      return res.status(404).json({ sucesso: false, erro: `Loteria '${slug}' não encontrada.` });
    }
    const tabela = obterTabelaResultados(slug);
    const { dezena_min, dezena_max, min_selecao, max_selecao, total_dezenas,
            linhas_volante, colunas_volante } = config;

    // 1. Total de registros no banco
    const [totalRows] = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
    const totalBanco = totalRows[0].total;
    if (totalBanco === 0) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Nenhum sorteio encontrado no banco de dados.'
      });
    }

    // 2. Buscar sorteios da janela (mais recentes)
    const [sorteiosRaw] = await pool.query(
      `SELECT concurso, data, dezenas FROM ${tabela} ORDER BY concurso DESC LIMIT ?`,
      [janela]
    );
    if (sorteiosRaw.length === 0) {
      return res.status(200).json({ sucesso: false, mensagem: 'Nenhum sorteio na janela.' });
    }

    // 3. Parsear JSON de dezenas
    const sorteios = sorteiosRaw.map(row => ({
      concurso: row.concurso,
      data_sorteio: row.data
        ? (row.data instanceof Date
            ? row.data.toISOString().split('T')[0]
            : String(row.data).split('T')[0])
        : null,
      dezenas: typeof row.dezenas === 'string' ? JSON.parse(row.dezenas) : row.dezenas
    }));

    // 4. Frequência e percentual por dezena
    const frequencia = {};
    for (let i = dezena_min; i <= dezena_max; i++) {
      frequencia[i] = { frequencia: 0, percentual: 0 };
    }
    sorteios.forEach(s => {
      s.dezenas.forEach(d => {
        if (frequencia[d]) frequencia[d].frequencia++;
      });
    });
    const totalAnalise = sorteios.length;
    for (let i = dezena_min; i <= dezena_max; i++) {
      frequencia[i].percentual = parseFloat(((frequencia[i].frequencia / totalAnalise) * 100).toFixed(1));
    }

    // 5. Classificação térmica (terços)
    const dezenasOrdenadas = Object.entries(frequencia)
      .map(([n, d]) => ({ dezena: parseInt(n), frequencia: d.frequencia }))
      .sort((a, b) => b.frequencia - a.frequencia);
    const terco = Math.ceil(dezenasOrdenadas.length / 3);
    const quentes = dezenasOrdenadas.slice(0, terco).map(d => d.dezena);
    const mornos = dezenasOrdenadas.slice(terco, terco * 2).map(d => d.dezena);
    const frios = dezenasOrdenadas.slice(terco * 2).map(d => d.dezena);

    // 6. Estatísticas agregadas (soma, paridade, repetição, sequências)
    let somaTotal = 0, somaMin = Infinity, somaMax = 0;
    let paresTotal = 0, imparesTotal = 0;
    let repeticaoTotal = 0, repeticaoCount = 0;
    let sequenciasTotal = 0, maxSeqHistorica = 0;

    for (let i = 0; i < sorteios.length; i++) {
      const s = sorteios[i];
      const dezenas = s.dezenas;

      // Soma
      const soma = dezenas.reduce((a, b) => a + b, 0);
      somaTotal += soma;
      somaMin = Math.min(somaMin, soma);
      somaMax = Math.max(somaMax, soma);

      // Paridade
      const pares = dezenas.filter(d => d % 2 === 0).length;
      paresTotal += pares;
      imparesTotal += (dezenas.length - pares);

      // Repetição (vs concurso anterior = próximo no array, pois está em ordem DESC)
      if (i < sorteios.length - 1) {
        const setAnterior = new Set(sorteios[i + 1].dezenas);
        const rep = dezenas.filter(d => setAnterior.has(d)).length;
        repeticaoTotal += rep;
        repeticaoCount++;
      }

      // Sequências (pares de consecutivos)
      const ordenado = [...dezenas].sort((a, b) => a - b);
      let maxSeq = 1, curSeq = 1;
      for (let j = 1; j < ordenado.length; j++) {
        if (ordenado[j] === ordenado[j - 1] + 1) {
          curSeq++;
          maxSeq = Math.max(maxSeq, curSeq);
        } else {
          curSeq = 1;
        }
      }
      sequenciasTotal += (maxSeq - 1);
      maxSeqHistorica = Math.max(maxSeqHistorica, maxSeq);
    }

    // 7. Última repetição (concurso mais recente vs anterior)
    let ultimaRepeticao = 0;
    if (sorteios.length >= 2) {
      const setAnterior = new Set(sorteios[1].dezenas);
      ultimaRepeticao = sorteios[0].dezenas.filter(d => setAnterior.has(d)).length;
    }

    // 8. Últimos 10 sorteios (já em ordem DESC)
    const ultimosSorteios = sorteios.slice(0, 10);

    return res.status(200).json({
      sucesso: true,
      dados: {
        loteria: {
          slug,
          nome: config.nome || 'Lotofácil',
          total_dezenas,
          min_selecao,
          max_selecao,
          dezena_min,
          dezena_max,
          linhas_volante,
          colunas_volante
        },
        total_registros_banco: totalBanco,
        total_analisados: totalAnalise,
        concurso_final: sorteios[0].concurso,
        concurso_inicial: sorteios[sorteios.length - 1].concurso,
        frequencia,
        classificacao_termica: { quentes, mornos, frios },
        soma: {
          media: Math.round(somaTotal / totalAnalise),
          minimo: somaMin,
          maximo: somaMax
        },
        paridade: {
          media_pares: Math.round(paresTotal / totalAnalise),
          media_impares: Math.round(imparesTotal / totalAnalise)
        },
        repeticao: {
          media_repeticao: repeticaoCount > 0 ? Math.round(repeticaoTotal / repeticaoCount) : 0,
          ultima_repeticao: ultimaRepeticao
        },
        sequencias: {
          media_sequencias: Math.round(sequenciasTotal / totalAnalise),
          max_sequencia_historica: maxSeqHistorica
        },
        ultimos_sorteios: ultimosSorteios
      }
    });
  } catch (erro) {
    console.error('Erro em /api/estatisticas:', erro.message);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao calcular estatísticas.' });
  }
};
