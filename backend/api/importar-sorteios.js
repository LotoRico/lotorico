// backend/api/importar-sorteios.js

const pool = require('../db');
const XLSX = require('xlsx');

function parseDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseIntOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

function getCol(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}

function mapRow(row) {
  return [
    parseIntOrNull(getCol(row, ['Concurso'])),
    parseDate(getCol(row, ['Data Sorteio'])),
    parseIntOrNull(getCol(row, ['Bola1'])),
    parseIntOrNull(getCol(row, ['Bola2'])),
    parseIntOrNull(getCol(row, ['Bola3'])),
    parseIntOrNull(getCol(row, ['Bola4'])),
    parseIntOrNull(getCol(row, ['Bola5'])),
    parseIntOrNull(getCol(row, ['Bola6'])),
    parseIntOrNull(getCol(row, ['Bola7'])),
    parseIntOrNull(getCol(row, ['Bola8'])),
    parseIntOrNull(getCol(row, ['Bola9'])),
    parseIntOrNull(getCol(row, ['Bola10'])),
    parseIntOrNull(getCol(row, ['Bola11'])),
    parseIntOrNull(getCol(row, ['Bola12'])),
    parseIntOrNull(getCol(row, ['Bola13'])),
    parseIntOrNull(getCol(row, ['Bola14'])),
    parseIntOrNull(getCol(row, ['Bola15'])),
    parseIntOrNull(getCol(row, ['Ganhadores 15 acertos'])),
    getCol(row, ['Cidade / UF']),
    parseNum(getCol(row, ['Rateio 15 acertos'])),
    parseIntOrNull(getCol(row, ['Ganhadores 14 acertos'])),
    parseNum(getCol(row, ['Rateio 14 acertos'])),
    parseIntOrNull(getCol(row, ['Ganhadores 13 acertos'])),
    parseNum(getCol(row, ['Rateio 13 acertos'])),
    parseIntOrNull(getCol(row, ['Ganhadores 12 acertos'])),
    parseNum(getCol(row, ['Rateio 12 acertos'])),
    parseIntOrNull(getCol(row, ['Ganhadores 11 acertos'])),
    parseNum(getCol(row, ['Rateio 11 acertos'])),
    parseNum(getCol(row, ['Acumulado 15 acertos'])),
    parseNum(getCol(row, ['Arrecadacao Total'])),
    parseNum(getCol(row, ['Estimativa Prêmio', 'Estimativa Premio'])),
    parseNum(getCol(row, [
      'Acumulado sorteio especial Lotofácil da Independência',
      'Acumulado sorteio especial Lotofacil da Independencia'
    ])),
    getCol(row, ['Observação'])
  ];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as total, MAX(concurso) as ultimo FROM sorteios');
      return res.status(200).json({
        sucesso: true,
        totalRegistros: rows[0].total,
        ultimoConcurso: rows[0].ultimo
      });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST para importar ou GET para consultar.' });
  }

  try {
    let fileBuffer = null;

    if (req.body && typeof req.body === 'string' && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body, 'base64');
    } else if (req.body && req.body.file) {
      fileBuffer = Buffer.from(req.body.file, 'base64');
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie o XLSX em base64 no body.' });
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia ou sem dados válidos.' });
    }

    const values = rows.map(mapRow).filter(v => v[0] !== null);

    if (values.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada (coluna Concurso vazia).' });
    }

    const sql = `
      INSERT INTO sorteios (
        concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5, bola6, bola7,
        bola8, bola9, bola10, bola11, bola12, bola13, bola14, bola15,
        ganhadores_15_acertos, cidade_uf, rateio_15_acertos,
        ganhadores_14_acertos, rateio_14_acertos,
        ganhadores_13_acertos, rateio_13_acertos,
        ganhadores_12_acertos, rateio_12_acertos,
        ganhadores_11_acertos, rateio_11_acertos,
        acumulado_15_acertos, arrecadacao_total, estimativa_premio,
        acumulado_sorteio_especial_lotofacil_independencia, observacao
      ) VALUES ? ON DUPLICATE KEY UPDATE
        data_sorteio = VALUES(data_sorteio),
        bola1 = VALUES(bola1), bola2 = VALUES(bola2), bola3 = VALUES(bola3),
        bola4 = VALUES(bola4), bola5 = VALUES(bola5), bola6 = VALUES(bola6),
        bola7 = VALUES(bola7), bola8 = VALUES(bola8), bola9 = VALUES(bola9),
        bola10 = VALUES(bola10), bola11 = VALUES(bola11), bola12 = VALUES(bola12),
        bola13 = VALUES(bola13), bola14 = VALUES(bola14), bola15 = VALUES(bola15),
        ganhadores_15_acertos = VALUES(ganhadores_15_acertos),
        cidade_uf = VALUES(cidade_uf),
        rateio_15_acertos = VALUES(rateio_15_acertos),
        ganhadores_14_acertos = VALUES(ganhadores_14_acertos),
        rateio_14_acertos = VALUES(rateio_14_acertos),
        ganhadores_13_acertos = VALUES(ganhadores_13_acertos),
        rateio_13_acertos = VALUES(rateio_13_acertos),
        ganhadores_12_acertos = VALUES(ganhadores_12_acertos),
        rateio_12_acertos = VALUES(rateio_12_acertos),
        ganhadores_11_acertos = VALUES(ganhadores_11_acertos),
        rateio_11_acertos = VALUES(rateio_11_acertos),
        acumulado_15_acertos = VALUES(acumulado_15_acertos),
        arrecadacao_total = VALUES(arrecadacao_total),
        estimativa_premio = VALUES(estimativa_premio),
        acumulado_sorteio_especial_lotofacil_independencia = VALUES(acumulado_sorteio_especial_lotofacil_independencia),
        observacao = VALUES(observacao)
    `;

    const [result] = await pool.query(sql, [values]);

    return res.status(200).json({
      sucesso: true,
      linhasProcessadas: values.length,
      affectedRows: result.affectedRows,
      mensagem: `${values.length} registros processados com sucesso.`
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
