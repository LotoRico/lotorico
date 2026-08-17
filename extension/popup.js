// popup.js
let jogosCarregados = [];
let quantidadeDezenasDetectada = 15;

function adicionarLog(texto, cor = "#38bdf8") {
  const logScreen = document.getElementById('log-screen');
  const novaLinha = document.createElement('div');
  novaLinha.className = "log-entry";
  novaLinha.style.color = cor;
  novaLinha.innerText = `> ${texto}`;
  logScreen.appendChild(novaLinha);
  logScreen.scrollTop = logScreen.scrollHeight;
}

document.getElementById('txt-file').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const linhas = text.split('\n');
    jogosCarregados = [];
    let tamanhosEncontrados = new Set();

    linhas.forEach((linha) => {
      const dezenasLimpas = linha.trim().replace(/[,;]/g, ' ').replace(/\s+/g, ' ');
      if (dezenasLimpas === "") return;

      const dezenas = dezenasLimpas.split(' ');
      const dezenasValidas = dezenas.filter(d => {
        const num = parseInt(d, 10);
        return !isNaN(num) && num >= 1 && num <= 25;
      });

      if (dezenasValidas.length >= 15 && dezenasValidas.length <= 20) {
        jogosCarregados.push(dezenasValidas);
        tamanhosEncontrados.add(dezenasValidas.length);
      }
    });

    if (jogosCarregados.length > 0) {
      if (tamanhosEncontrados.size > 1) {
        document.getElementById('status-text').innerText = "Erro: Tamanhos misturados.";
        adicionarLog("Erro: O arquivo contém jogos com quantidades de dezenas diferentes. Separe-os em arquivos diferentes.", "#ef4444");
        document.getElementById('btn-start').disabled = true;
        return;
      }

      quantidadeDezenasDetectada = Array.from(tamanhosEncontrados)[0];

      if (jogosCarregados.length > 10) {
        jogosCarregados = jogosCarregados.slice(0, 10);
        document.getElementById('status-text').innerText = "Limitado aos primeiros 10 jogos.";
        adicionarLog(`Arquivo importado. Jogos de ${quantidadeDezenasDetectada} dezenas. Limitado a 10 jogos por segurança.`, "#fbbf24");
      } else {
        document.getElementById('status-text').innerText = `${jogosCarregados.length} jogos carregados!`;
        adicionarLog(`${jogosCarregados.length} jogos de ${quantidadeDezenasDetectada} dezenas prontos para envio.`, "#10b981");
      }

      document.getElementById('file-info').style.display = "block";
      document.getElementById('file-info').innerText = `✓ ${file.name}`;
      document.getElementById('btn-start').disabled = false;
    } else {
      document.getElementById('status-text').innerText = "Nenhum jogo válido encontrado.";
      adicionarLog("Erro: O arquivo não possui jogos válidos (15 a 20 dezenas).", "#ef4444");
      document.getElementById('btn-start').disabled = true;
    }
  };
  reader.readAsText(file);
});

document.getElementById('btn-start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes("caixa.gov.br")) {
    document.getElementById('status-text').innerText = "Abra o site da Caixa!";
    adicionarLog("Erro: Você não está na página de Loterias da Caixa.", "#ef4444");
    return;
  }

  document.getElementById('btn-start').disabled = true;
  document.getElementById('status-text').innerText = "Automação em andamento...";
  adicionarLog("Iniciando comunicação com a página...", "#a855f7");

  chrome.tabs.sendMessage(tab.id, { 
    action: "processar_jogos", 
    jogos: jogosCarregados,
    quantidadeDezenas: quantidadeDezenasDetectada
  }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('status-text').innerText = "Erro de conexão.";
      adicionarLog("Erro: Falha ao conectar. RECARREGUE a página da Caixa e tente novamente.", "#ef4444");
      document.getElementById('btn-start').disabled = false;
      return;
    }
    if (response && response.status === "sucesso") {
      document.getElementById('status-text').innerText = "Concluído com sucesso!";
      adicionarLog("Processamento finalizado com sucesso!", "#10b981");
    } else {
      document.getElementById('status-text').innerText = "Falha no processamento.";
      adicionarLog("A automação foi interrompida ou falhou.", "#ef4444");
    }
    document.getElementById('btn-start').disabled = false;
  });
});

document.getElementById('btn-diagnostico').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes("caixa.gov.br")) {
    document.getElementById('status-text').innerText = "Abra o site da Caixa!";
    adicionarLog("Erro: Você não está na página de Loterias da Caixa.", "#ef4444");
    return;
  }

  adicionarLog("Iniciando diagnóstico da página...", "#a855f7");

  chrome.tabs.sendMessage(tab.id, { action: "diagnostico" }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('status-text').innerText = "Erro de conexão.";
      adicionarLog("Erro: Falha ao conectar. RECARREGUE a página da Caixa e tente novamente.", "#ef4444");
      return;
    }
    if (response && response.status === "diagnostico_concluido") {
      document.getElementById('status-text').innerText = "Diagnóstico concluído!";
    }
  });
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "log_progresso") adicionarLog(request.texto, request.cor);
});
