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

// ===== PARSER ROBUSTO =====
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
  headers.forEach((h, idx) => {
    if (h) colMap[h.toLowerCase().trim()] = idx;
  });

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
