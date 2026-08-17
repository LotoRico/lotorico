// content.js
function enviarLogAoPopup(texto, cor = "#38bdf8") {
  chrome.runtime.sendMessage({ action: "log_progresso", texto: texto, cor: cor }).catch(() => {});
}

function simularCliqueHumano(elemento) {
  if (!elemento) return false;
  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
  const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
  const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
  elemento.dispatchEvent(mousedown);
  elemento.dispatchEvent(mouseup);
  elemento.dispatchEvent(click);
  return true;
}

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const URL_LOTOFACIL = "https://www.loteriasonline.caixa.gov.br/silce-web/#/lotofacil";

// ============ DETECÇÃO DO VOLANTE ============

function volanteEstaVisivel() {
  return document.querySelector('ul.escolhe-numero.lotofacil') !== null;
}

// ============ GARANTIR TELA LOTOFÁCIL ============

async function garantirTelaLotofacil() {
  if (!volanteEstaVisivel()) {
    enviarLogAoPopup("Página mudou após adicionar ao carrinho. Retornando à tela de Lotofácil...", "#fbbf24");

    window.history.back();
    await esperar(3000);

    if (!volanteEstaVisivel()) {
      enviarLogAoPopup("Tentando navegação direta para a tela de Lotofácil...", "#38bdf8");
      window.location.href = URL_LOTOFACIL;
      await esperar(5000);
    }

    let tentativas = 0;
    while (!volanteEstaVisivel() && tentativas < 10) {
      enviarLogAoPopup(`Aguardando volante carregar... (tentativa ${tentativas + 1}/10)`, "#94a3b8");
      await esperar(1000);
      tentativas++;
    }

    if (volanteEstaVisivel()) {
      enviarLogAoPopup("Tela de Lotofácil restaurada com sucesso!", "#10b981");
      await esperar(1000);
      return true;
    } else {
      enviarLogAoPopup("Erro: Não foi possível restaurar a tela de Lotofácil.", "#ef4444");
      return false;
    }
  }
  return true;
}

// ============ SELEÇÃO DE QUANTIDADE DE DEZENAS ============

async function selecionarQuantidadeDezenas(qtd) {
  enviarLogAoPopup(`Verificando seleção de ${qtd} dezenas...`, "#38bdf8");

  const candidatos = document.querySelectorAll('a, button, label, span, li, div');
  const botaoQtd = Array.from(candidatos).find(el => {
    const txt = el.textContent.trim().toLowerCase();
    return txt === `${qtd} dezenas` || txt === `${qtd} números` || txt === `${qtd} nos` || txt === `${qtd}`;
  });

  if (botaoQtd) {
    const jaSelecionado = botaoQtd.classList.contains('active') ||
                          botaoQtd.classList.contains('ativo') ||
                          botaoQtd.classList.contains('selected') ||
                          (botaoQtd.parentElement && botaoQtd.parentElement.classList.contains('active')) ||
                          (botaoQtd.parentElement && botaoQtd.parentElement.classList.contains('ativo'));
    if (!jaSelecionado) {
      enviarLogAoPopup(`Selecionando ${qtd} dezenas no painel da Caixa...`, "#10b981");
      simularCliqueHumano(botaoQtd);
      await esperar(1200);
      return true;
    }
    enviarLogAoPopup(`${qtd} dezenas já selecionadas.`, "#10b981");
    return true;
  }

  if (qtd > 15) {
    enviarLogAoPopup(`Aviso: Seletor de ${qtd} dezenas não encontrado. Marque manualmente.`, "#fbbf24");
  }
  return false;
}

// ============ LIMPAR VOLANTE ============

async function limparVolante() {
  // Busca por botão/link de limpar
  const candidatos = document.querySelectorAll('a, button, input[type="button"], span, div');
  const btnLimpar = Array.from(candidatos).find(el => {
    const txt = (el.textContent || el.value || "").trim().toLowerCase();
    return txt === "limpar" || txt === "limpar jogo" || txt === "limpar volante" || txt === "limpar aposta";
  });

  if (btnLimpar) {
    enviarLogAoPopup("Limpando volante atual...", "#94a3b8");
    simularCliqueHumano(btnLimpar);
    await esperar(800);
    return true;
  }

  // Fallback: desmarca todas as dezenas manualmente
  enviarLogAoPopup("Botão limpar não encontrado. Desmarcando dezenas manualmente...", "#94a3b8");
  for (let i = 1; i <= 25; i++) {
    const id = `n${String(i).padStart(2, '0')}`;
    const botao = document.getElementById(id);
    if (botao && botao.classList.contains('selected')) {
      simularCliqueHumano(botao);
      await esperar(100);
    }
  }
  return true;
}

// ============ PREENCHER JOGO ============

async function preencherJogo(dezenas) {
  if (!volanteEstaVisivel()) {
    enviarLogAoPopup("Erro: Volante não encontrado na página.", "#ef4444");
    return false;
  }

  enviarLogAoPopup(`Preenchendo dezenas: ${dezenas.join(', ')}`, "#38bdf8");

  for (const dezena of dezenas) {
    const numeroAlvo = parseInt(dezena, 10);
    const id = `n${String(numeroAlvo).padStart(2, '0')}`;
    const botao = document.getElementById(id);

    if (botao) {
      const jaSelecionado = botao.classList.contains('selected');

      if (!jaSelecionado) {
        simularCliqueHumano(botao);
        await esperar(180);
      }
    } else {
      enviarLogAoPopup(`Dezena ${numeroAlvo} (id=${id}) não encontrada no volante.`, "#fbbf24");
    }
  }
  return true;
}

// ============ ADICIONAR AO CARRINHO ============

async function adicionarAoCarrinho() {
  // Seletor exato: button#colocarnocarrinho
  const btnCarrinho = document.getElementById('colocarnocarrinho');

  if (btnCarrinho) {
    enviarLogAoPopup("Colocando no carrinho...", "#10b981");
    simularCliqueHumano(btnCarrinho);
    await esperar(2500);
    return true;
  }

  // Fallback: busca por classe data-incluir-aposta-lotofacil
  const btnPorClasse = document.querySelector('.data-incluir-aposta-lotofacil');
  if (btnPorClasse) {
    enviarLogAoPopup("Colocando no carrinho (via classe)...", "#10b981");
    simularCliqueHumano(btnPorClasse);
    await esperar(2500);
    return true;
  }

  // Fallback ampliado
  const btnAmpliado = Array.from(document.querySelectorAll('button, a, input[type="button"]')).find(el => {
    const txt = (el.textContent || el.value || "").trim().toLowerCase();
    const id = (el.id || "").toLowerCase();
    return txt.includes("colocar no carrinho") || txt.includes("colocar na sacola") || id.includes("carrinho") || id.includes("sacola");
  });

  if (btnAmpliado) {
    enviarLogAoPopup(`Botão encontrado via busca ampliada: "${btnAmpliado.textContent.trim()}"`, "#fbbf24");
    simularCliqueHumano(btnAmpliado);
    await esperar(2500);
    return true;
  }

  enviarLogAoPopup("Erro: Botão 'Colocar no Carrinho' não encontrado.", "#ef4444");
  return false;
}

// ============ LISTENER DE MENSAGENS ============

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processar_jogos") {
    const listaJogos = request.jogos;
    const qtdDezenas = request.quantidadeDezenas;

    (async () => {
      let sucessoGeral = true;

      await selecionarQuantidadeDezenas(qtdDezenas);

      for (let i = 0; i < listaJogos.length; i++) {
        enviarLogAoPopup(`Iniciando Jogo ${i + 1} de ${listaJogos.length}...`, "#a855f7");

        if (i > 0) {
          const telaOk = await garantirTelaLotofacil();
          if (!telaOk) {
            enviarLogAoPopup("Automação interrompida: Não foi possível voltar à tela de Lotofácil.", "#ef4444");
            sucessoGeral = false;
            break;
          }
          await selecionarQuantidadeDezenas(qtdDezenas);
        }

        await limparVolante();
        const preenchido = await preencherJogo(listaJogos[i]);

        if (preenchido) {
          await esperar(500);
          const adicionado = await adicionarAoCarrinho();

          if (!adicionado) {
            enviarLogAoPopup("Automação interrompida: Falha ao colocar o jogo no carrinho.", "#ef4444");
            sucessoGeral = false;
            break;
          }
        } else {
          enviarLogAoPopup("Automação interrompida: Falha ao preencher as dezenas.", "#ef4444");
          sucessoGeral = false;
          break;
        }

        await esperar(1500);
      }

      if (sucessoGeral) {
        enviarLogAoPopup("Todos os jogos foram processados com sucesso!", "#10b981");
        sendResponse({ status: "sucesso" });
      } else {
        sendResponse({ status: "erro" });
      }
    })();

    return true;
  }
});
