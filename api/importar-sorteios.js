// api/importar-sorteios.js

const { pool, obterConfigLoteria, obterTabelaResultados } = require('./_lib/db');

// ===================== UTILITÁRIOS =====================
function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ===================== INTERFACE HTML =====================
function renderHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loto Rico — Importar Sorteios</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { max-width: 600px; width: 100%; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 28px; color: #a855f7; font-weight: 700; }
    .header p { font-size: 14px; color: #94a3b8; margin-top: 8px; }
    .card {
      background-color: #1e293b;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #334155;
      margin-bottom: 16px;
    }
    .card h2 { font-size: 18px; color: #a855f7; margin-bottom: 16px; }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }
    .status-row:last-child { border-bottom: none; }
    .status-label { font-size: 13px; color: #94a3b8; }
    .status-value { font-size: 14px; font-weight: 600; color: #10b981; }
    .upload-area {
      border: 2px dashed #475569;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .upload-area:hover { border-color: #a855f7; }
    .upload-area p { font-size: 14px; color: #94a3b8; margin-top: 8px; }
    .upload-icon { font-size: 48px; color: #475569; }
    input[type="file"] { display: none; }
    .btn {
      display: block;
      width: 100%;
      background-color: #a855f7;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    }
    .btn:hover { background-color: #9333ea; }
    .btn:disabled { background-color: #475569; cursor: not-allowed; }
    .result {
      margin-top: 16px;
      padding: 16px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }
    .result.success { background-color: #064e3b; border: 1px solid #10b981; color: #10b981; }
    .result.error { background-color: #450a0a; border: 1px solid #ef4444; color: #ef4444; }
    .dark-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 12px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <button class="dark-toggle" onclick="toggleTheme()">🌙 Dark Mode</button>
  <div class="container">
    <div class="header">
      <h1>Loto Rico</h1>
      <p>Importação de Sorteios — Lotofácil</p>
    </div>
    <div class="card" id="status-card">
      <h2>Status do Banco</h2>
      <div id="status-content">
        <p style="color: #94a3b8; font-size: 13px;">Carregando...</p>
      </div>
    </div>
    <div class="card">
      <h2>Upload de Planilha</h2>
      <label class="upload-area" for="file-input">
        <div class="upload-icon">📁</div>
        <p>Clique para selecionar um arquivo .xlsx</p>
        <p id="file-name" style="color: #a855f7; margin-top: 4px;"></p>
      </label>
      <input type="file" id="file-input" accept=".xlsx,.xls">
      <button class="btn" id="btn-upload" disabled>Importar Dados</button>
      <div class="result" id="result"></div>
    </div>
  </div>
  <script>
    async function loadStatus() {
      try {
        const resp = await fetch('/api/importar-sorteios?loteria=lotofacil', { headers: { 'Accept': 'application/json' } });
        const data = await resp.json();
        const el = document.getElementById('status-content');
        if (data.total !== undefined) {
          el.innerHTML = \`
            <div class="status-row"><span class="status-label">Total de registros</span><span class="status-value">\${data.total}</span></div>
            <div class="status-row"><span class="status-label">Último concurso</span><span class="status-value">\${data.ultimo_concurso || 'N/A'}</span></div>
            <div class="status-row"><span class="status-label">Última data</span><span class="status-value">\${data.ultima_data || 'N/A'}</span></div>
          \`;
        } else {
          el.innerHTML = '<p style="color: #ef4444; font-size: 13px;">Erro ao carregar status.</p>';
        }
      } catch (e) {
        document.getElementById('status-content').innerHTML = '<p style="color: #ef4444; font-size: 13px;">Erro de conexão.</p>';
      }
    }
    const fileInput = document.getElementById('file-input');
    const btnUpload = document.getElementById('btn-upload');
    let selectedFile = null;
    fileInput.addEventListener('change', (e) => {
      selectedFile = e.target.files[0];
      if (selectedFile) {
        document.getElementById('file-name').textContent = selectedFile.name;
        btnUpload.disabled = false;
      }
    });
    btnUpload.addEventListener('click', async () => {
      if (!selectedFile) return;
      btnUpload.disabled = true;
      btnUpload.textContent = 'Importando...';
      const result = document.getElementById('result');
      result.style.display = 'none';
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('loteria', 'lotofacil');
      try {
        const resp = await fetch('/api/importar-sorteios?loteria=lotofacil', { method: 'POST', body: formData });
        const data = await resp.json();
        result.style.display = 'block';
        if (data.success || data.sucesso) {
          result.className = 'result success';
          result.textContent = 'Importação concluída! ' + (data.mensagem || data.message || \`\${data.imported || data.total || 0} registros.\`);
          loadStatus();
        } else {
          result.className = 'result error';
          result.textContent = 'Erro: ' + (data.error || data.mensagem || 'Falha na importação.');
        }
      } catch (e) {
        result.style.display = 'block';
        result.className = 'result error';
        result.textContent = 'Erro de conexão: ' + e.message;
      }
      btnUpload.disabled = false;
      btnUpload.textContent = 'Importar Dados';
    });
    function toggleTheme() {
      document.body.style.backgroundColor = document.body.style.backgroundColor === 'rgb(248, 250, 252)' ? '#0f172a' : '#f8fafc';
    }
    loadStatus();
  </script>
</body>
</html>`;
}

// ===================== PARSER XLSX =====================
/**
 * Faz o parse da planilha da Caixa e extrai concurso, data e dezenas.
 * Usa a config da loteria para saber o range de dezenas e coluna inicial.
 * @param {Object} workbook - workbook XLSX
 * @param {Object} config - config da loteria (importar_col_inicio, dezena_min, dezena_max, total_dezenas, min_selecao)
 * @returns {Array} [{ concurso, data, dezenas: [int, ...] }]
 */
function parsePlanilhaCaixa(workbook, config) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  // Procurar linha de cabeçalho (contém "Concurso")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    if (rows[i] && rows[i].some(cell => String(cell).trim().toLowerCase().includes('concurso'))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) return [];

  const headers = rows[headerRow].map(h => String(h).trim().toLowerCase());

  // Mapear colunas por nome (flexível)
  const colMap = {};
  headers.forEach((h, idx) => {
    if (h.includes('concurso')) colMap.concurso = idx;
    if ((h.includes('data') && h.includes('sorteio')) || h === 'data sorteio') colMap.data = idx;
  });

  const { dezena_min, dezena_max, min_selecao, importar_col_inicio } = config;
  const totalDezenasSorteadas = min_selecao; // Lotofácil: 15 dezenas sorteadas

  const dados = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const concurso = parseInt(row[colMap.concurso || 0], 10);
    if (isNaN(concurso)) continue;

    // Extrair dezenas: usa importar_col_inicio como guia, mas também faz scan flexível
    const dezenas = [];
    const colInicial = importar_col_inicio || 2;

    // Primeiro tenta ler colunas contíguas a partir de colInicial
    for (let j = colInicial; j < row.length && dezenas.length < totalDezenasSorteadas; j++) {
      if (j === (colMap.concurso || 0) || j === colMap.data) continue;
      const val = parseInt(String(row[j]).replace(/\D/g, ''), 10);
      if (val >= dezena_min && val <= dezena_max && !dezenas.includes(val)) {
        dezenas.push(val);
      }
    }

    // Se não encontrou todas, faz scan em toda a linha
    if (dezenas.length < totalDezenasSorteadas) {
      dezenas.length = 0;
      for (let j = 0; j < row.length; j++) {
        if (j === (colMap.concurso || 0) || j === colMap.data) continue;
        const val = parseInt(String(row[j]).replace(/\D/g, ''), 10);
        if (val >= dezena_min && val <= dezena_max && !dezenas.includes(val)) {
          dezenas.push(val);
        }
        if (dezenas.length >= totalDezenasSorteadas) break;
      }
    }

    if (dezenas.length === totalDezenasSorteadas) {
      dezenas.sort((a, b) => a - b);

      let dataSorteio = null;
      if (colMap.data !== undefined) {
        const rawDate = String(row[colMap.data]).trim();
        if (rawDate.includes('/')) {
          const [dia, mes, ano] = rawDate.split('/');
          dataSorteio = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } else if (rawDate.includes('-')) {
          dataSorteio = rawDate.split('T')[0];
        }
      }

      dados.push({
        concurso,
        data: dataSorteio,
        dezenas: JSON.stringify(dezenas)
      });
    }
  }

  return dados;
}

// ===================== HANDLER =====================
module.exports = async (req, res) => {
  setHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const slug = req.query.loteria || 'lotofacil';

  try {
    const config = await obterConfigLoteria(slug);
    if (!config) {
      return res.status(404).json({ success: false, error: `Loteria '${slug}' não encontrada ou inativa.` });
    }
    const tabela = obterTabelaResultados(slug);

    // GET — interface HTML ou status JSON
    if (req.method === 'GET') {
      const accept = req.headers.accept || '';
      if (accept.includes('application/json')) {
        try {
          const [rows] = await pool.query(
            `SELECT COUNT(*) as total, MAX(concurso) as ultimo_concurso, MAX(data) as ultima_data FROM ${tabela}`
          );
          const r = rows[0];
          return res.status(200).json({
            loteria: slug,
            total: r.total,
            ultimo_concurso: r.ultimo_concurso,
            ultima_data: r.ultima_data
              ? (r.ultima_data instanceof Date
                  ? r.ultima_data.toISOString().split('T')[0]
                  : String(r.ultima_data).split('T')[0])
              : null
          });
        } catch (error) {
          return res.status(500).json({ error: error.message });
        }
      }
      // Retorna interface HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderHTML());
    }

    // POST — importar XLSX
    if (req.method === 'POST') {
      try {
        const XLSX = require('xlsx');

        if (!req.body) {
          return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
        }

        let buffer;
        if (Buffer.isBuffer(req.body)) {
          buffer = req.body;
        } else if (typeof req.body === 'string') {
          buffer = Buffer.from(req.body, 'binary');
        } else {
          buffer = Buffer.from(JSON.stringify(req.body));
        }

        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const dados = parsePlanilhaCaixa(workbook, config);

        if (dados.length === 0) {
          return res.status(200).json({
            success: false,
            error: 'Nenhuma linha válida encontrada. Verifique o formato do arquivo.'
          });
        }

        let importados = 0;
        let erros = 0;

        for (const d of dados) {
          try {
            await pool.execute(
              `INSERT INTO ${tabela} (concurso, data, dezenas)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 data = VALUES(data),
                 dezenas = VALUES(dezenas)`,
              [d.concurso, d.data, d.dezenas]
            );
            importados++;
          } catch (insertErr) {
            if (!insertErr.message.includes('Duplicate')) {
              console.error(`Erro ao inserir concurso ${d.concurso}: ${insertErr.message}`);
            }
            erros++;
          }
        }

        return res.status(200).json({
          success: true,
          imported: importados,
          total: dados.length,
          erros: erros > 0 ? erros : undefined,
          loteria: slug,
          mensagem: `${importados} de ${dados.length} concursos importados com sucesso.`
        });

      } catch (error) {
        console.error('[importar-sorteios] Erro:', error.message);
        return res.status(500).json({
          success: false,
          error: error.message || 'Erro interno ao processar o arquivo.'
        });
      }
    }

    return res.status(405).json({ error: 'Método não permitido.' });

  } catch (error) {
    console.error('[importar-sorteios] Erro:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno.'
    });
  }
};
