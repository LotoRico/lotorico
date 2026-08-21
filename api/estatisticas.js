// api/estatisticas.js

const { pool, obterConfigLoteria } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const slug = req.query.loteria || 'lotofacil';
    const config = await obterConfigLoteria(slug);

    if (!config) {
      return res.status(404).json({ erro: `Loteria '${slug}' não encontrada ou inativa.` });
    }

    const { id: loteriaId, total_dezenas, dezena_min, dezena_max } = config;

    // 1. Frequência de cada dezena
    const [freqRows] = await pool.execute(`
      SELECT dezena, COUNT(*) as frequencia
      FROM sorteios_dezenas
      WHERE sorteio_id IN (SELECT id FROM sorteios WHERE loteria_id = ?)
      GROUP BY dezena
      ORDER BY dezena
    `, [loteriaId]);

    const frequencias = {};
    for (let i = dezena_min; i <= dezena_max; i++) {
      frequencias[i] = 0;
    }
    freqRows.forEach(row => {
      frequencias[row.dezena] = row.frequencia;
    });

    // 2. Classificação térmica (terços: quentes, mornos, frios)
    const dezenasOrdenadas = Object.entries(frequencias)
      .map(([dezena, freq]) => ({ dezena: parseInt(dezena), frequencia: freq }))
      .sort((a, b) => b.frequencia - a.frequencia);

    const terco = Math.ceil(dezenasOrdenadas.length / 3);
    const quentes = dezenasOrdenadas.slice(0, terco).map(d => d.dezena);
    const mornos = dezenasOrdenadas.slice(terco, terco * 2).map(d => d.dezena);
    const frios = dezenasOrdenadas.slice(terco * 2).map(d => d.dezena);

    // 3. Últimos 10 sorteios
    const [ultimosRows] = await pool.execute(`
      SELECT concurso, data, dezenas
      FROM sorteios
      WHERE loteria_id = ?
      ORDER BY concurso DESC
      LIMIT 10
    `, [loteriaId]);

    const ultimosSorteios = ultimosRows.map(row => ({
      concurso: row.concurso,
      data: row.data,
      dezenas: typeof row.dezenas === 'string' ? JSON.parse(row.dezenas) : row.dezenas
    }));

    // 4. Estatísticas do último sorteio (soma, paridade, sequência)
    let somaUltimo = 0;
    let paresUltimo = 0;
    let imparesUltimo = 0;

    if (ultimosSorteios.length > 0) {
      const dezenasUltimo = ultimosSorteios[0].dezenas;
      somaUltimo = dezenasUltimo.reduce((acc, d) => acc + d, 0);
      paresUltimo = dezenasUltimo.filter(d => d % 2 === 0).length;
      imparesUltimo = dezenasUltimo.filter(d => d % 2 !== 0).length;
    }

    // 5. Total de sorteios no banco
    const [countRow] = await pool.execute(`
      SELECT COUNT(*) as total FROM sorteios WHERE loteria_id = ?
    `, [loteriaId]);

    return res.status(200).json({
      loteria: {
        slug: config.slug,
        nome: config.nome,
        total_dezenas: config.total_dezenas,
        min_selecao: config.min_selecao,
        max_selecao: config.max_selecao,
        dezena_min: config.dezena_min,
        dezena_max: config.dezena_max,
        linhas_volante: config.linhas_volante,
        colunas_volante: config.colunas_volante
      },
      total_sorteios: countRow[0].total,
      frequencias,
      classificacao: {
        quentes,
        mornos,
        frios
      },
      ultimos_sorteios: ultimosSorteios,
      ultimo_sorteio_stats: {
        soma: somaUltimo,
        pares: paresUltimo,
        impares: imparesUltimo
      }
    });

  } catch (erro) {
    console.error('Erro em /api/estatisticas:', erro.message);
    return res.status(500).json({ erro: 'Erro interno ao calcular estatísticas.', detalhe: erro.message });
  }
};
