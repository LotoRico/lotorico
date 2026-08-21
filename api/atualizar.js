// api/atualizar.js
const { pool, obterTabelaResultados } = require('./_lib/db');
const { fetchConcurso, fetchConcursosApos } = require('./_lib/caixa-client');

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

const MAX_POR_LOTE = 5000;

module.exports = async (req, res) => {
  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use GET para este endpoint' });
  }

  try {
    const slug = req.query.loteria || 'lotofacil';
    const tabela = obterTabelaResultados(slug);

    if (!tabela) {
      return res.status(404).json({ sucesso: false, mensagem: `Loteria '${slug}' não encontrada.` });
    }

    const [rows] = await pool.query(`SELECT MAX(concurso) as ultimo FROM ${tabela}`);
    const ultimoBanco = rows[0].ultimo || 0;

    const resultadoLatest = await fetchConcurso(null);
    const ultimoCaixa = resultadoLatest.concurso;

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

    const concursosParaImportar = await fetchConcursosApos(ultimoBanco, limite);

    const importados = [];
    const erros = [];

    for (const dados of concursosParaImportar) {
      try {
        await pool.query(
          `INSERT INTO ${tabela}
           (concurso, data, dezenas, dezenas_ordem_sorteio, acumulado,
            local_sorteio, municipio_uf_sorteio, indicador_concurso_especial,
            numero_concurso_anterior, numero_concurso_proximo, numero_concurso_final_0_5,
            numero_jogo, tipo_jogo, tipo_publicacao, ultimo_concurso,
            observacao, exibir_detalhamento_por_cidade, data_proximo_concurso,
            valor_arrecadado, valor_estimado_proximo_concurso, valor_acumulado_proximo_concurso,
            valor_acumulado_concurso_0_5, valor_acumulado_concurso_especial,
            valor_saldo_reserva_garantidora, valor_total_premio_faixa_um,
            premiacao_contingencia, lista_rateio_premio, lista_municipio_uf_ganhadores,
            lista_dezenas_segundo_sorteio, lista_resultado_equipe_esportiva,
            nome_time_coracao_mes_sorte)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            data = VALUES(data),
            dezenas = VALUES(dezenas),
            dezenas_ordem_sorteio = VALUES(dezenas_ordem_sorteio)`,
          [dados.concurso, dados.data, dados.dezenas, dados.dezenas_ordem_sorteio, dados.acumulado,
           dados.local_sorteio, dados.municipio_uf_sorteio, dados.indicador_concurso_especial,
           dados.numero_concurso_anterior, dados.numero_concurso_proximo, dados.numero_concurso_final_0_5,
           dados.numero_jogo, dados.tipo_jogo, dados.tipo_publicacao, dados.ultimo_concurso,
           dados.observacao, dados.exibir_detalhamento_por_cidade, dados.data_proximo_concurso,
           dados.valor_arrecadado, dados.valor_estimado_proximo_concurso, dados.valor_acumulado_proximo_concurso,
           dados.valor_acumulado_concurso_0_5, dados.valor_acumulado_concurso_especial,
           dados.valor_saldo_reserva_garantidora, dados.valor_total_premio_faixa_um,
           dados.premiacao_contingencia, dados.lista_rateio_premio, dados.lista_municipio_uf_ganhadores,
           dados.lista_dezenas_segundo_sorteio, dados.lista_resultado_equipe_esportiva,
           dados.nome_time_coracao_mes_sorte]
        );
        importados.push(dados.concurso);
      } catch (err) {
        erros.push({ concurso: dados.concurso, erro: err.message });
      }
    }

    if (importados.length === 0 && erros.length > 0) {
      return res.status(500).json({
        sucesso: false,
        mensagem: `Falha ao importar: ${erros[0].erro}`
      });
    }

    const aindaFaltam = faltam - importados.length;

    return res.status(200).json({
      sucesso: true,
      mensagem: `${importados.length} concurso(s) importado(s)`,
      ultimo_banco_antes: ultimoBanco,
      ultimo_caixa: ultimoCaixa,
      total_faltantes: faltam,
      novos: importados.length,
      concursos_importados: importados.length <= 20 ? importados : `${importados[0]}...${importados[importados.length - 1]}`,
      ainda_faltam: aindaFaltam > 0 ? aindaFaltam : 0,
      erros: erros.length > 0 ? erros.slice(0, 10) : undefined
    });

  } catch (error) {
    console.error('[atualizar] Erro:', error.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: error.message || 'Erro interno ao atualizar'
    });
  }
};
