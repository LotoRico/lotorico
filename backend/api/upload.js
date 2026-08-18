// backend/api/upload.js
const HTML = `<!DOCTYPE html>
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
    const API_URL = '/api/importar-sorteios';
    let selectedFile = null;
    carregarStatus();
    async function carregarStatus() {
      try {
        const res = await fetch(API_URL);
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
          const res = await fetch(API_URL, {
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

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(HTML);
};
