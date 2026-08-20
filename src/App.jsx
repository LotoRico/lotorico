function exportarPDF(jogos, dezenas, estrategia, janela, incArr, excArr) {
  const data = new Date().toLocaleDateString('pt-BR')
  const hora = new Date().toLocaleTimeString('pt-BR')
  const estrat = getStrategyName(estrategia)
  const estratExp = getStrategyExplanation(estrategia)
  const dezenasMini = (arr) => arr.map(d => `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#a855f7;color:#170d26;font-size:8px;font-weight:800;margin:1px;">${pad(d)}</span>`).join('')
  const dezenasVerde = (arr) => arr.map(d => `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#00ff66;color:#170d26;font-size:8px;font-weight:800;margin:1px;">${pad(d)}</span>`).join('')
  const dezenasVermelho = (arr) => arr.map(d => `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#ff1744;color:#fff;font-size:8px;font-weight:800;margin:1px;">${pad(d)}</span>`).join('')
  let selecaoHtml = ''
  if (incArr.length > 0 || excArr.length > 0) {
    let incHtml = ''
    let excHtml = ''
    if (incArr.length > 0) {
      incHtml = `<div style="margin-bottom:6px;"><span style="color:#00ff66;font-size:11px;font-weight:700;">Incluidas:</span> ${dezenasVerde(incArr)}</div>`
    }
    if (excArr.length > 0) {
      excHtml = `<div><span style="color:#ff1744;font-size:11px;font-weight:700;">Excluidas:</span> ${dezenasVermelho(excArr)}</div>`
    }
    selecaoHtml = `<div class="selecao-box">${incHtml}${excHtml}</div>`
  }
  const jogosHtml = jogos.map((j, idx) => {
    let pageBreak = ''
    if (idx === 20) { pageBreak = ' page-break' }
    else if (idx > 20 && (idx - 20) % 30 === 0) { pageBreak = ' page-break' }
    return `
    <div class="jogo-row${pageBreak}">
      <span class="jogo-id">#${j.id}</span>
      <span class="dezenas-block">${dezenasMini(j.dezenas)}</span>
      <span class="jogo-stats">Soma: <strong>${j.soma}</strong> &nbsp;|&nbsp; Pares: <strong>${j.pares}</strong> &nbsp;|&nbsp; Impares: <strong>${j.impares}</strong></span>
    </div>`
  }).join('')
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Loto Rico - Jogos</title><style>
  @page{margin:0.4cm;}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:auto;}
  body{font-family:'Inter',Calibri,system-ui,sans-serif;background:#170d26;color:#e9d5ff;padding:16px;font-size:12px;}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #a855f7;}
  .header h1{font-size:22px;font-weight:800;color:#a855f7;margin-bottom:2px;}
  .header .sub{color:#b794d4;font-size:12px;}
  .badge{display:inline-block;padding:3px 14px;border-radius:10px;background:rgba(168,85,247,0.18);border:1px solid #a855f7;color:#a855f7;font-size:14px;font-weight:800;margin-bottom:8px;}
  .info-card{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:10px;margin-bottom:10px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;}
  .info-item{text-align:center;}
  .info-item .label{font-size:9px;color:#b794d4;text-transform:uppercase;letter-spacing:0.05em;}
  .info-item .val{font-size:13px;font-weight:700;color:#a855f7;}
  .selecao-box{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:10px;margin-bottom:10px;display:flex;flex-direction:column;gap:2px;}
  .strategy-box{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:10px;margin-bottom:12px;}
  .strategy-box .stitle{color:#a855f7;font-weight:700;font-size:12px;margin-bottom:4px;}
  .strategy-box .stext{color:#b794d4;font-size:10px;line-height:1.4;}
  .jogo-title{font-size:13px;font-weight:700;color:#a855f7;margin-bottom:6px;}
  .jogo-row{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:4px 8px;margin-bottom:2px;display:flex;align-items:center;gap:6px;}
  .jogo-id{font-size:10px;font-weight:700;color:#b794d4;min-width:24px;}
  .dezenas-block{display:flex;flex-wrap:wrap;gap:1px;flex:0 1 auto;}
  .jogo-stats{margin-left:auto;font-size:10px;color:#b794d4;white-space:nowrap;}
  .jogo-stats strong{color:#a855f7;}
  .footer{margin-top:8px;text-align:center;font-size:9px;color:#b794d4;padding-top:6px;border-top:1px solid #3d2854;}
  .page-break{page-break-before:always;}
  @media print{body{padding:8px;}.header{margin-bottom:8px;padding-bottom:6px;}.info-card,.strategy-box,.selecao-box{padding:6px;margin-bottom:8px;}.jogo-row{padding:3px 6px;margin-bottom:1px;}.footer{margin-top:4px;padding-top:4px;}}
  </style></head><body>
  <div class="header">
    <div class="badge">Lotofácil</div>
    <h1>Loto Rico</h1>
    <div class="sub">Inteligência Estatística para Loterias</div>
  </div>
  <div class="info-card">
    <div class="info-item"><div class="label">Data</div><div class="val">${data}</div></div>
    <div class="info-item"><div class="label">Hora</div><div class="val">${hora}</div></div>
    <div class="info-item"><div class="label">Estratégia</div><div class="val">${estrat}</div></div>
    <div class="info-item"><div class="label">Janela</div><div class="val">${janela}</div></div>
    <div class="info-item"><div class="label">Dezenas</div><div class="val">${dezenas}</div></div>
    <div class="info-item"><div class="label">Jogos</div><div class="val">${jogos.length}</div></div>
  </div>
  ${selecaoHtml}
  <div class="strategy-box">
    <div class="stitle">Resumo da Estratégia: ${estrat}</div>
    <div class="stext">${estratExp}</div>
  </div>
  <div class="jogo-title">${jogos.length} Jogo(s) Gerado(s)</div>
  ${jogosHtml}
  <div class="footer">Usuario: [Assinante] | Gerado por Loto Rico</div>
  </body></html>`)
  win.document.close()
  setTimeout(() => { win.print() }, 500)
}
