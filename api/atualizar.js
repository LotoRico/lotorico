// api/atualizar.js
const pool = require('./_lib/db');
const { fetchConcurso } = require('./_lib/caixa-client');

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

const MAX_POR_LOTE = 5;

module.exports = async (req, res) => {
  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use GET para este endpoint' });
  }

  try {
    const [rows] = await pool.query('SELECT MAX(concurso) as ultimo FROM sorteios');
    const ultimoBanco = rows[0].ultimo || 0;

    const resultadoCaixa = await fetchConcurso(null);
    const ultimoCaixa = resultadoCaixa.numero;

    if (ultimoCaixa <= ultimoBanco) {
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Banco já está atualizado',
        ultimo_banco: ultimoBanco,
        ultimo_caixa: ultimoCaixa,
        novos: 0
      });
    }

    const faltam = ultimoCaixa - ultimoBanco;
    const limite = Math.min(faltam, MAX_POR_LOTE);
    const importados = [];
    const erros = [];

    for (let i = 0; i < limite; i++) {
      const concurso = ultimoBanco + 1 + i;
      try {
        const dados = await fetchConcurso(concurso);

        await pool.query(
          `INSERT INTO sorteios
           (concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5,
            bola6, bola7, bola8, bola9, bola10, bola11, bola12, bola13,
            bola14, bola15, ganhadores_15_acertos)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE data_sorteio = VALUES(data_sorteio)`,
          [dados.numero, dados.data_sorteio,
           dados.bola1, dados.bola2, dados.bola3, dados.bola4, dados.bola5,
           dados.bola6, dados.bola7, dados.bola8, dados.bola9, dados.bola10,
           dados.bola11, dados.bola12, dados.bola13, dados.bola14, dados.bola15,
           dados.ganhadores_15_acertos]
        );

        importados.push(concurso);
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        erros.push({ concurso, erro: err.message });
      }
    }

    const aindaFaltam = faltam - importados.length;

    return res.status(200).json({
      sucesso: true,
      mensagem: `${importados.length} concurso(s) importado(s)`,
      ultimo_banco_antes: ultimoBanco,
      ultimo_caixa: ultimoCaixa,
      total_faltantes: faltam,
      novos: importados.length,
      concursos_importados: importados,
      ainda_faltam: aindaFaltam > 0 ? aindaFaltam : 0,
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (error) {
    console.error('[atualizar] Erro:', error.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: error.message || 'Erro interno ao atualizar'
    });
  }
};
