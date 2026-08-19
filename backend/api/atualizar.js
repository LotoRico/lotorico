// backend/api/atualizar.js
const { query, execute } = require('./_lib/db');
const { buscarUltimoResultado, sincronizarConcursos, LOTERIAS_SUPORTADAS } = require('./_lib/caixa-client');

/**
 * GET /api/atualizar
 * Sincroniza o banco TiDB com a API oficial da Caixa.
 *
 * Query params:
 *   - loteria: 'lotofacil' (default), 'megasena', 'quina', 'lotomania'
 *   - forcar: 'true' para re-sincronizar mesmo sem concursos faltantes
 *
 * Response (JSON):
 *   { success, loteria, ultimoConcursoDB, ultimoConcursoCaixa,
 *     sincronizados, totalBuscados, duracaoMs, erros: [] }
 */
module.exports = async (req, res) => {
  const startTime = Date.now();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use GET.' });
  }

  const loteria = (req.query.loteria || 'lotofacil').toLowerCase();
  const forcar = req.query.forcar === 'true';

  if (!LOTERIAS_SUPORTADAS[loteria]) {
    return res.status(400).json({
      success: false,
      error: `Loteria '${loteria}' não suportada. Disponíveis: ${Object.keys(LOTERIAS_SUPORTADAS).join(', ')}`,
    });
  }

  const erros = [];
  let sincronizados = 0;
  let totalBuscados = 0;

  try {
    // 1. Descobrir o último concurso no banco
    // Tenta schema multi-loteria primeiro; faz fallback para schema antigo
    let ultimoConcursoDB = 0;
    let schemaAntigo = false;

    try {
      const rowsNovo = await query(
        `SELECT MAX(concurso) as ultimo FROM sorteios
         WHERE loteria_id = (SELECT id FROM loterias WHERE slug = ?)`,
        [loteria]
      );
      ultimoConcursoDB = rowsNovo[0]?.ultimo || 0;
    } catch {
      // Tabela loterias não existe — usa schema antigo (sem loteria_id)
      schemaAntigo = true;
      const rowsAntigo = await query('SELECT MAX(concurso) as ultimo FROM sorteios');
      ultimoConcursoDB = rowsAntigo[0]?.ultimo || 0;
    }

    // 2. Buscar o resultado mais recente da Caixa
    const resultadoCaixa = await buscarUltimoResultado(loteria);
    const ultimoConcursoCaixa = resultadoCaixa.concurso;

    // 3. Verificar se precisa sincronizar
    if (ultimoConcursoCaixa <= ultimoConcursoDB && !forcar) {
      return res.status(200).json({
        success: true,
        loteria,
        ultimoConcursoDB,
        ultimoConcursoCaixa,
        sincronizados: 0,
        totalBuscados: 0,
        mensagem: 'Banco já está atualizado.',
        duracaoMs: Date.now() - startTime,
        erros: [],
      });
    }

    // 4. Determinar range de sincronização
    const fromConcurso = forcar ? ultimoConcursoDB : ultimoConcursoDB + 1;
    const toConcurso = ultimoConcursoCaixa;

    if (fromConcurso > toConcurso) {
      return res.status(200).json({
        success: true,
        loteria,
        ultimoConcursoDB,
        ultimoConcursoCaixa,
        sincronizados: 0,
        totalBuscados: 0,
        mensagem: 'Nenhum concurso novo para sincronizar.',
        duracaoMs: Date.now() - startTime,
        erros: [],
      });
    }

    // 5. Limita a 50 concursos por requisição (Vercel: 60s max timeout)
    const MAX_POR_REQUISICAO = 50;
    const limite = Math.min(toConcurso, fromConcurso + MAX_POR_REQUISICAO - 1);

    // 6. Buscar concursos faltantes na API da Caixa
    const resultados = await sincronizarConcursos(
      fromConcurso,
      limite,
      loteria,
      (atual, total, resultado, erro) => {
        totalBuscados = atual;
        if (erro) {
          erros.push({ concurso: fromConcurso + atual - 1, erro: erro.message });
        }
      }
    );

    // 7. Inserir resultados no banco
    for (const r of resultados) {
      try {
        if (schemaAntigo) {
          await inserirSchemaAntigo(r);
        } else {
          await inserirSchemaNovo(r, loteria);
        }
        sincronizados++;
      } catch (insertErr) {
        // Ignora duplicados (concurso já existe)
        if (!insertErr.message.includes('Duplicate')) {
          erros.push({ concurso: r.concurso, erro: `Insert: ${insertErr.message}` });
        }
      }
    }

    // 8. Resposta final
    const duracaoMs = Date.now() - startTime;
    const restantes = toConcurso - limite;

    return res.status(200).json({
      success: true,
      loteria,
      ultimoConcursoDB,
      ultimoConcursoCaixa,
      sincronizados,
      totalBuscados,
      duracaoMs,
      erros,
      restantes: Math.max(0, restantes),
      mensagem: restantes > 0
        ? `${sincronizados} concursos sincronizados. ${restantes} restantes — execute novamente.`
        : `${sincronizados} concursos sincronizados com sucesso.`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      loteria,
      error: error.message,
      sincronizados,
      totalBuscados,
      duracaoMs: Date.now() - startTime,
      erros,
    });
  }
};

// ===================== FUNÇÕES DE INSERÇÃO =====================

/**
 * Insere usando o schema original (bola1..bola15).
 * Usado enquanto a migração multi-loteria não for feita.
 */
async function inserirSchemaAntigo(r) {
  const dezenas = r.dezenas;
  const bolas = [];
  for (let i = 0; i < 15; i++) {
    bolas.push(dezenas[i] || null);
  }

  const metadados = JSON.parse(r.metadados || '{}');
  const ganhadores = metadados.ganhadores || {};
  const rateios = metadados.rateios || {};

  await execute(
    `INSERT INTO sorteios (
      concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5,
      bola6, bola7, bola8, bola9, bola10, bola11, bola12, bola13, bola14, bola15,
      ganhadores_15_acertos, cidade_uf, rateio_15_acertos,
      ganhadores_14_acertos, rateio_14_acertos,
      ganhadores_13_acertos, rateio_13_acertos,
      ganhadores_12_acertos, rateio_12_acertos,
      ganhadores_11_acertos, rateio_11_acertos,
      acumulado_15_acertos, arrecadacao_total, estimativa_premio,
      acumulado_sorteio_especial, observacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.concurso, r.data_sorteio,
      ...bolas,
      ganhadores.faixa_1 || r.ganhadores_principais || 0,
      r.cidade_uf,
      rateios.faixa_1 || 0,
      ganhadores.faixa_2 || 0, rateios.faixa_2 || 0,
      ganhadores.faixa_3 || 0, rateios.faixa_3 || 0,
      ganhadores.faixa_4 || 0, rateios.faixa_4 || 0,
      ganhadores.faixa_5 || 0, rateios.faixa_5 || 0,
      r.acumulado || 0,
      r.arrecadacao_total || 0,
      r.estimativa_premio || 0,
      r.acumulado_especial || 0,
      r.observacao,
    ]
  );
}

/**
 * Insere usando o schema multi-loteria (dezenas JSON, loteria_id).
 * Usado após a migração para o novo modelo.
 */
async function inserirSchemaNovo(r, loteria) {
  await execute(
    `INSERT INTO sorteios (
      loteria_id, concurso, data_sorteio, dezenas, cidade_uf,
      arrecadacao_total, estimativa_premio, acumulado,
      acumulado_sorteio_especial, observacao, metadados
    ) VALUES (
      (SELECT id FROM loterias WHERE slug = ?), ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )`,
    [
      loteria,
      r.concurso,
      r.data_sorteio,
      JSON.stringify(r.dezenas),
      r.cidade_uf,
      r.arrecadacao_total || 0,
      r.estimativa_premio || 0,
      r.acumulado || 0,
      r.acumulado_especial || 0,
      r.observacao,
      r.metadados,
    ]
  );
}
