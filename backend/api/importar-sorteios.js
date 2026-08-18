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
      parseNum(getVal(row, [
        'Acumulado sorteio especial Lotofácil da Independência',
        'Acumulado sorteio especial Lotofacil da Independencia'
      ])),
      getVal(row, ['Observação'])
    ]);
  }

  return values;
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loto Rico — Importar Sorteios</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #020617;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
      width: 100%;
      max-width: 480px;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 24px; color: #a855f7; font-weight: 700; }
    .header p { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .status-box {
      background-color: #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      text-align: center;
    }
    .status-box .total { font-size: 28px; font-weight: 700; color: #a855f7; }
    .status-box .label { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .status-box .ultimo { font-size: 14px; color: #38bdf8; margin-top: 8px; }
    .upload-area {
      border: 2px dashed #334155;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .upload-area:hover { border-color: #a855f7; background-color: #1e293b; }
    .upload-area.dragover { border-color: #a855f7; background-color: #1e293b; }
    .upload-icon { font-size: 36px; margin-bottom: 8px; }
    .upload-text { font-size: 13px; color: #94a3b8; }
    .file-name {
      font-size: 12px;
      color: #10b981;
      margin-top: 8px;
      display: none;
    }
    input[type="file"] { display: none; }
    .btn-import {
      width: 100%;
      background-color: #a855f7;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 16px;
    }
    .btn-import:hover { background-color: #9333ea; }
    .btn-import:disabled { background-color: #334155; cursor: not-allowed; }
    .btn-refresh {
      width: 100%;
      background-color: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    .btn-refresh:hover { border-color: #a855f7; color: #a855f7; }
    .result {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }
    .result.success { background-color: #052e16; border: 1px solid #10b981; color: #10b981; }
    .result.error { background-color: #450a0a; border: 1px solid #ef4444; color: #ef4444; }
    .loading {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 12px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Loto Rico</h1>
      <p>Importação de Sorteios — Lotofácil</p>
    </div>
    <div class="status-box" id="status-box">
      <div class="total" id="total-registros">—</div>
      <div class="label">Registros no banco</div>
      <div class="ultimo" id="ultimo-concurso"></div>
    </div>
    <label for="file-input" class="upload-area" id="upload-area">
      <div class="upload-icon">📁</div>
      <div class="upload-text">Clique ou arraste o arquivo .xlsx da Caixa</div>
      <div class="file-name" id="file-name"></div>
    </label>
    <input type="file" id="file-input" accept=".xlsx,.xls">
    <button class="btn-import" id="btn-import" disabled>Importar Sorteios</button>
    <button class="btn-refresh" id="btn-refresh">🔄 Atualizar Status</button>
    <div class="loading" id="loading">Enviando arquivo... isso pode levar alguns segundos.</div>
    <div class="result" id="result"></div>
  </div>
  <script>
    let selectedFile = null;
    carregarStatus();
    async function carregarStatus() {
      try {
        const res = await fetch(window.location.href, { method: 'GET', headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (data.sucesso) {
          document.getElementById('total-registros').textContent = data.totalRegistros || 0;
          document.getElementById('ultimo-concurso').textContent =
            data.ultimoConcurso ? 'Último concurso: ' + data.ultimoConcurso : '';
        }
      } catch (e) { console.error('Erro ao carregar status:', e); }
    }
    document.getElementById('file-input').addEventListener('change', function(e) {
      handleFile(e.target.files[0]);
    });
    const uploadArea = document.getElementById('upload-area');
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', function() {
      uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    function handleFile(file) {
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        showResult('error', 'Apenas arquivos .xlsx ou .xls são aceitos.');
        return;
      }
      selectedFile = file;
      document.getElementById('file-name').style.display = 'block';
      document.getElementById('file-name').textContent = '✓ ' + file.name;
      document.getElementById('btn-import').disabled = false;
      hideResult();
    }
    document.getElementById('btn-import').addEventListener('click', async function() {
      if (!selectedFile) return;
      const btn = document.getElementById('btn-import');
      const loading = document.getElementById('loading');
      btn.disabled = true;
      btn.textContent = 'Importando...';
      loading.style.display = 'block';
      hideResult();
      try {
        const reader = new FileReader();
        reader.onload = async function(e) {
          const base64 = e.target.result.split(',')[1];
          const res = await fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: base64
          });
          const data = await res.json();
          loading.style.display = 'none';
          btn.disabled = false;
          btn.textContent = 'Importar Sorteios';
          if (data.sucesso) {
            showResult('success',
              '✅ ' + data.linhasProcessadas + ' registros processados! ' +
              (data.affectedRows ? '(' + data.affectedRows + ' linhas afetadas)' : '')
            );
            carregarStatus();
          } else {
            showResult('error', '❌ Erro: ' + (data.erro || data.error || 'Desconhecido'));
          }
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {
        loading.style.display = 'none';
        btn.disabled = false;
        btn.textContent = 'Importar Sorteios';
        showResult('error', '❌ Erro: ' + error.message);
      }
    });
    document.getElementById('btn-refresh').addEventListener('click', carregarStatus);
    function showResult(type, message) {
      const el = document.getElementById('result');
      el.className = 'result ' + type;
      el.textContent = message;
      el.style.display = 'block';
    }
    function hideResult() {
      document.getElementById('result').style.display = 'none';
    }
  </script>
</body>
</html>`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET com accept JSON = retorna status do banco
  const accept = req.headers['accept'] || '';
  if (req.method === 'GET' && accept.includes('application/json')) {
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

  // GET genérico = retorna a página HTML
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(HTML_PAGE);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // POST = importar XLSX (bruto da Caixa, sem limpeza manual)
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
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada. Verifique se a planilha contém a coluna "Concurso".' });
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
      mensagem: values.length + ' registros processados com sucesso.'
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
