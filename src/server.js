app.post('/api/importar-sorteios', async (req, res) => {
  const { sorteios } = req.body;

  if (!sorteios || !Array.isArray(sorteios) || sorteios.length === 0) {
    return res.status(400).json({ erro: 'Nenhum dado de sorteio fornecido.' });
  }

  let conexao;
  try {
    conexao = await pool.getConnection();
    
    // Inicia transação segura
    await conexao.beginTransaction();

    const query = `
      INSERT INTO sorteios (
        concurso, data_sorteio, bola01, bola02, bola03, bola04, bola05, 
        bola06, bola07, bola08, bola09, bola10, bola11, bola12, bola13, 
        bola14, bola15, ganhadores_15_acertos, cidade_uf, rateio_15_acertos, 
        ganhadores_14_acertos, rateio_14_acertos, ganhadores_13_acertos, 
        rateio_13_acertos, ganhadores_12_acertos, rateio_12_acertos, 
        ganhadores_11_acertos, rateio_11_acertos, acumulado_15_acertos, 
        arrecadacao_total, estimativa_premio, acumulado_sorteio_especial_independencia, observacao
      ) VALUES ?
      ON DUPLICATE KEY UPDATE 
        data_sorteio = VALUES(data_sorteio),
        bola01 = VALUES(bola01), bola02 = VALUES(bola02), bola03 = VALUES(bola03), bola04 = VALUES(bola04), bola05 = VALUES(bola05),
        bola06 = VALUES(bola06), bola07 = VALUES(bola07), bola08 = VALUES(bola08), bola09 = VALUES(bola09), bola10 = VALUES(bola10),
        bola11 = VALUES(bola11), bola12 = VALUES(bola12), bola13 = VALUES(bola13), bola14 = VALUES(bola14), bola15 = VALUES(bola15),
        ganhadores_15_acertos = VALUES(ganhadores_15_acertos), cidade_uf = VALUES(cidade_uf), rateio_15_acertos = VALUES(rateio_15_acertos),
        ganhadores_14_acertos = VALUES(ganhadores_14_acertos), rateio_14_acertos = VALUES(rateio_14_acertos),
        ganhadores_13_acertos = VALUES(ganhadores_13_acertos), rateio_13_acertos = VALUES(rateio_13_acertos),
        ganhadores_12_acertos = VALUES(ganhadores_12_acertos), rateio_12_acertos = VALUES(rateio_12_acertos),
        ganhadores_11_acertos = VALUES(ganhadores_11_acertos), rateio_11_acertos = VALUES(rateio_11_acertos),
        acumulado_15_acertos = VALUES(acumulado_15_acertos), arrecadacao_total = VALUES(arrecadacao_total),
        estimativa_premio = VALUES(estimativa_premio), acumulado_sorteio_especial_independencia = VALUES(acumulado_sorteio_especial_independencia),
        observacao = VALUES(observacao);
    `;

    await conexao.query(query, [sorteios]);
    
    // Confirma a transação
    await conexao.commit();
    conexao.release();

    return res.json({ sucesso: true, total: sorteios.length });
  } catch (err) {
    if (conexao) {
      await conexao.rollback();
      conexao.release();
    }
    console.error('Erro crítico na importação:', err);
    return res.status(500).json({ erro: err.message });
  }
});
