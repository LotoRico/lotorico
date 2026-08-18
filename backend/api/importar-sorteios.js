// backend/api/importar-sorteios.js
const pool = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function parseDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
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

function parsePlanilhaCaixa(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase().trim());
    if (rowStr.some(c => c.includes('concurso'))) {
      headerRowIndex = i;
      headers = row.map(c => String(c || '').trim());
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headers = rawRows[0] ? rawRows[0].map(c => String(c || '').trim()) : [];
  }

  const colMap = {};
  headers.forEach((h, idx) => { if (h) colMap[h.toLowerCase().trim()] = idx; });

  function getVal(row, names) {
    for (const name of names) {
      const key = name.toLowerCase().trim();
      if (colMap[key] !== undefined && row[colMap[key]] !== null && row[colMap[key]] !== undefined) {
        return row[colMap[key]];
      }
    }
    return null;
  }

  const values = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const concurso = parseIntOrNull(getVal(row, ['Concurso']));
    if (concurso === null) continue;

    values.push([
      concurso,
      parseDate(getVal(row, ['Data Sorteio'])),
      parseIntOrNull(getVal(row, ['Bola1'])),
      parseIntOrNull(getVal(row, ['Bola2'])),
      parseIntOrNull(getVal(row, ['Bola3'])),
      parseIntOrNull(getVal(row, ['Bola4'])),
      parseIntOrNull(getVal(row, ['Bola5'])),
      parseIntOrNull(getVal(row, ['Bola6'])),
      parseIntOrNull(getVal(row, ['Bola7'])),
      parseIntOrNull(getVal(row, ['Bola8'])),
      parseIntOrNull(getVal(row, ['Bola9'])),
      parseIntOrNull(getVal(row, ['Bola10'])),
      parseIntOrNull(getVal(row, ['Bola11'])),
      parseIntOrNull(getVal(row, ['Bola12'])),
      parseIntOrNull(getVal(row, ['Bola13'])),
      parseIntOrNull(getVal(row, ['Bola14'])),
      parseIntOrNull(getVal(row, ['Bola15'])),
      parseIntOrNull(getVal(row, ['Ganhadores 15 acertos'])),
      getVal(row, ['Cidade / UF']),
      parseNum(getVal(row, ['Rateio 15 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 14 acertos'])),
      parseNum(getVal(row, ['Rateio 14 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 13 acertos'])),
      parseNum(getVal(row, ['Rateio 13 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 12 acertos'])),
      parseNum(getVal(row, ['Rateio 12 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 11 acertos'])),
      parseNum(getVal(row, ['Rateio 11 acertos'])),
      parseNum(getVal(row, ['Acumulado 15 acertos'])),
      parseNum(getVal(row, ['Arrecadacao Total'])),
      parseNum(getVal(row, ['Estimativa Prêmio', 'Estimativa Premio'])),
      parseNum(getVal(row, ['Acumulado sorteio especial Lotofácil da Independência', 'Acumulado sorteio especial Lotofacil da Independencia'])),
      getVal(row, ['Observação'])
    ]);
  }

  return values;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET com accept JSON = status do banco
  const accept = req.headers['accept'] || '';
  if (req.method === 'GET' && accept.includes('application/json')) {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as total, MAX(concurso) as ultimo FROM sorteios');
      return res.status(200).json({ sucesso: true, totalRegistros: rows[0].total, ultimoConcurso: rows[0].ultimo });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }

  // GET generico = retorna a pagina HTML
  if (req.method === 'GET') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'upload.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (e) {
      return res.status(500).send('Erro ao carregar pagina: ' + e.message);
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  // POST = importar XLSX
  try {
    let fileBuffer = null;
    if (req.body && typeof req.body === 'string' && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body, 'base64');
    } else if (req.body && req.body.file) {
      fileBuffer = Buffer.from(req.body.file, 'base64');
    }
    if (!fileBuffer) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const values = parsePlanilhaCaixa(fileBuffer);
    if (values.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha valida encontrada.' });
    }

    const sql = `INSERT INTO sorteios (
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
      observacao = VALUES(observacao)`;

    const [result] = await pool.query(sql, [values]);

    return res.status(200).json({
      sucesso: true,
      linhasProcessadas: values.length,
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
