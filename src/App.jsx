// src/App.jsx
import { useState, useEffect } from 'react'

async function fetchAPI(endpoint) {
  const resp = await fetch(`/api/${endpoint}`)
  return resp.json()
}

function getThermalClass(c, num) {
  if (!c) return ''
  if (c.quentes?.includes(num)) return 'thermal-quente'
  if (c.mornos?.includes(num)) return 'thermal-morno'
  if (c.frios?.includes(num)) return 'thermal-frio'
  return ''
}

function pad(n) { return String(n).padStart(2, '0') }

function getStrategyName(estrategia) {
  return { mista: 'Mista (Freq + Atraso)', quentes: 'Quentes', frios: 'Frios', equilibrada: 'Equilibrada' }[estrategia] || estrategia
}

function getStrategyExplanation(estrategia) {
  const explanations = {
    mista: 'Combina a frequencia de sorteio com o tempo de atraso de cada dezena. Dezenas com boa frequencia e atraso medio recebem maior peso na amostragem. Ideal para quem busca equilibrio entre as tendencias recentes e o comportamento historico.',
    quentes: 'Prioriza as dezenas mais sorteadas na janela analisada. O algoritmo atribui maior peso as dezenas com maior frequencia de aparecimento. Recomendado quando ha padrao de repeticao de dezenas em alta no periodo recente.',
    frios: 'Prioriza as dezenas mais atrasadas, ou seja, aquelas que ha mais tempo sem aparecer nos sorteios. Baseado na lei dos grandes numeros, onde dezenas com atraso prolongado tendem a retornar. Recomendado para quem busca reversao a media.',
    equilibrada: 'Seleciona dezenas proximas a media historica de frequencia, evitando extremos. Nem as mais quentes, nem as mais frias. Recomendado para apostas conservadoras que buscam distribuicao equilibrada.'
  }
  return explanations[estrategia] || ''
}

function exportarTxt(jogos, dezenas) {
  const linhas = jogos.map(j => j.dezenas.map(pad).join(' '))
  const blob = new Blob([linhas.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lotorico_${jogos.length}jogos_${dezenas}dezenas.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function exportarCSV(jogos, dezenas, estrategia, janela) {
  const data = new Date().toLocaleDateString('pt-BR')
  const hora = new Date().toLocaleTimeString('pt-BR')
  const estrat = getStrategyName(estrategia)
  const estratExp = getStrategyExplanation(estrategia)
  let dezenaHeaders = ''
  for (let i = 1; i <= dezenas; i++) { dezenaHeaders += `;D${pad(i)}` }
  let rows = ''
  jogos.forEach(j => {
    rows += `#${j.id};${j.dezenas.join(';')};${j.soma};${j.pares};${j.impares}\n`
  })
  const csv = `Loto Rico - Inteligencia Estatistica para Loterias\nLotofacil | ${data} ${hora} | Estrategia: ${estrat} | Janela: ${janela} concursos | ${dezenas} dezenas | ${jogos.length} jogo(s)\n${estratExp}\nJogo${dezenaHeaders};Soma;Pares;Impares\n${rows}Usuario: [Assinante] | Gerado por Loto Rico`
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lotorico_${jogos.length}jogos_${dezenas}dezenas.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportarPDF(jogos, dezenas, estrategia, janela, incArr, excArr) {
  const data = new Date().toLocaleDateString('pt-BR')
  const hora = new Date().toLocaleTimeString('pt-BR')
  const estrat = getStrategyName(estrategia)
  const estratExp = getStrategyExplanation(estrategia)

  // === CALCULO DE SALTO DE PAGINA DINAMICO ===
  // A4 = 297mm altura, margem 0.5cm = 5mm topo + 5mm base = 287mm utilizavel
  // Cada linha de jogo com moldura (padding + border + margin + conteudo) = ~14mm
  const a4Usable = 287
  const rowMm = 14

  // Componentes fixos do cabecalho (so pagina 1) em mm
  const headerFixoMm = 22    // .header (badge + h1 + sub + border + margin)
  const infoCardMm = 16      // .info-card (padding + conteudo + margin)
  const jogoTitleMm = 7      // .jogo-title

  // Variavel: selecao-box (depende de quantas dezenas incluidas/excluidas)
  const totalSel = incArr.length + excArr.length
  const selecaoMm = totalSel > 0 ? 16 + Math.ceil(totalSel / 15) * 4 : 0

  // Variavel: strategy-box (depende do tamanho do texto da estrategia)
  const stratLines = Math.ceil(estratExp.length / 90)
  const strategyMm = 22 + stratLines * 5

  // Total do cabecalho da primeira pagina
  const firstPageHeaderMm = headerFixoMm + infoCardMm + selecaoMm + strategyMm + jogoTitleMm

  // Capacidade da primeira pagina (apos cabecalho)
  const firstPageCap = Math.max(1, Math.floor((a4Usable - firstPageHeaderMm) / rowMm))
  // Capacidade das paginas seguintes (sem cabecalho)
  const nextPageCap = Math.floor(a4Usable / rowMm)

  // Gerar HTML dos jogos com quebra dinamica
  const dezenasMini = (arr) => arr.map(d =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#a855f7;color:#170d26;font-size:10px;font-weight:800;margin:1px;">${pad(d)}</span>`
  ).join('')
  const dezenasVerde = (arr) => arr.map(d =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#00ff66;color:#170d26;font-size:10px;font-weight:800;margin:1px;">${pad(d)}</span>`
  ).join('')
  const dezenasVermelho = (arr) => arr.map(d =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#ff1744;color:#fff;font-size:10px;font-weight:800;margin:1px;">${pad(d)}</span>`
  ).join('')

  let selecaoHtml = ''
  if (incArr.length > 0 || excArr.length > 0) {
    let incHtml = ''
    let excHtml = ''
    if (incArr.length > 0) {
      incHtml = `<div style="margin-bottom:6px;"><span style="color:#00ff66;font-size:12px;font-weight:700;">Incluidas:</span> ${dezenasVerde(incArr)}</div>`
    }
    if (excArr.length > 0) {
      excHtml = `<div><span style="color:#ff1744;font-size:12px;font-weight:700;">Excluidas:</span> ${dezenasVermelho(excArr)}</div>`
    }
    selecaoHtml = `<div class="selecao-box">${incHtml}${excHtml}</div>`
  }

  const jogosHtml = jogos.map((j, idx) => {
    let pageBreak = ''
    if (idx === firstPageCap) { pageBreak = ' page-break' }
    else if (idx > firstPageCap && (idx - firstPageCap) % nextPageCap === 0) { pageBreak = ' page-break' }
    return `<div class="jogo-row${pageBreak}">
      <span class="jogo-id">#${j.id}</span>
      <span class="dezenas-block">${dezenasMini(j.dezenas)}</span>
      <span class="jogo-stats">Soma: <strong>${j.soma}</strong> &nbsp;|&nbsp; Pares: <strong>${j.pares}</strong> &nbsp;|&nbsp; Impares: <strong>${j.impares}</strong></span>
    </div>`
  }).join('')

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Loto Rico - Jogos</title><style>
  @page{size:A4;margin:0.5cm;}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:auto;}
  body{font-family:'Inter',Calibri,system-ui,sans-serif;background:#170d26;color:#e9d5ff;max-width:1200px;margin:0 auto;padding:20px;font-size:13px;}
  .header{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #a855f7;}
  .header h1{font-size:24px;font-weight:800;color:#a855f7;margin-bottom:2px;}
  .header .sub{color:#b794d4;font-size:13px;}
  .badge-lot{display:inline-block;padding:4px 16px;border-radius:10px;background:rgba(168,85,247,0.18);border:1px solid #a855f7;color:#a855f7;font-size:15px;font-weight:800;margin-bottom:8px;}
  .info-card{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:12px;margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;}
  .info-item{text-align:center;}
  .info-item .label{font-size:10px;color:#b794d4;text-transform:uppercase;letter-spacing:0.05em;}
  .info-item .val{font-size:14px;font-weight:700;color:#a855f7;}
  .selecao-box{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:12px;margin-bottom:12px;display:flex;flex-direction:column;gap:4px;}
  .strategy-box{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:12px;margin-bottom:14px;}
  .strategy-box .stitle{color:#a855f7;font-weight:700;font-size:13px;margin-bottom:4px;}
  .strategy-box .stext{color:#b794d4;font-size:11px;line-height:1.5;}
  .jogo-title{font-size:14px;font-weight:700;color:#a855f7;margin-bottom:8px;}
  .jogo-row{background:#241535;border:1px solid #3d2854;border-radius:6px;padding:8px 10px;margin-bottom:4px;display:flex;align-items:center;gap:8px;}
  .jogo-id{font-size:12px;font-weight:700;color:#b794d4;min-width:28px;flex-shrink:0;}
  .dezenas-block{display:flex;flex-wrap:wrap;gap:2px;flex:1 1 auto;}
  .jogo-stats{margin-left:auto;font-size:11px;color:#b794d4;white-space:nowrap;flex-shrink:0;}
  .jogo-stats strong{color:#a855f7;}
  .footer{margin-top:10px;text-align:center;font-size:10px;color:#b794d4;padding-top:8px;border-top:1px solid #3d2854;}
  .page-break{page-break-before:always;}
  @media print{
    body{padding:8px;font-size:14px;max-width:100%;}
    .header{margin-bottom:12px;padding-bottom:10px;}
    .header h1{font-size:26px;}
    .header .sub{font-size:14px;}
    .badge-lot{font-size:16px;padding:5px 18px;margin-bottom:10px;}
    .info-card{padding:14px;margin-bottom:12px;}
    .info-item .label{font-size:11px;}
    .info-item .val{font-size:15px;}
    .selecao-box{padding:14px;margin-bottom:12px;}
    .strategy-box{padding:14px;margin-bottom:14px;}
    .strategy-box .stitle{font-size:14px;}
    .strategy-box .stext{font-size:12px;line-height:1.6;}
    .jogo-title{font-size:15px;margin-bottom:10px;}
    .jogo-row{padding:10px 12px;margin-bottom:5px;}
    .jogo-id{font-size:13px;min-width:32px;}
    .jogo-stats{font-size:12px;}
    .footer{margin-top:8px;padding-top:6px;font-size:11px;}
  }
  </style></head><body>
  <div class="header">
    <div class="badge-lot">Lotofácil</div>
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

function InfoIcon({ children }) {
  return (
    <span className="info-icon">i<span className="info-tooltip">{children}</span></span>
  )
}

export default function App() {
  const [stats, setStats] = useState(null)
  const [jogos, setJogos] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingJogos, setLoadingJogos] = useState(false)
  const [erro, setErro] = useState('')
  const [janela, setJanela] = useState(20)
  const [quantidade, setQuantidade] = useState(10)
  const [dezenas, setDezenas] = useState(15)
  const [estrategia, setEstrategia] = useState('mista')
  const [incluir, setIncluir] = useState([])
  const [excluir, setExcluir] = useState([])
  const [mode, setMode] = useState('incluir')

  const maxInclusoes = dezenas
  const maxExclusoes = 25 - dezenas
  const temSelecao = incluir.length > 0 || excluir.length > 0

  async function carregarStats() {
    setLoadingStats(true)
    try {
      const r = await fetchAPI(`estatisticas?janela=${janela}`)
      if (r.sucesso) setStats(r.dados)
    } catch (e) { setErro('Erro ao carregar estatisticas') }
    setLoadingStats(false)
  }

  useEffect(() => { carregarStats() }, [janela])

  useEffect(() => {
    if (incluir.length > dezenas) {
      setIncluir(incluir.slice(0, dezenas))
      setErro(`Inclusões ajustadas para ${dezenas} (máximo para ${dezenas} dezenas por jogo).`)
    }
    const maxExc = 25 - dezenas
    if (excluir.length > maxExc) {
      setExcluir(excluir.slice(0, maxExc))
      setErro(`Exclusões ajustadas para ${maxExc} (máximo para ${dezenas} dezenas por jogo).`)
    }
  }, [dezenas])

  function handleVolanteClick(num) {
    setErro('')
    if (mode === 'incluir') {
      if (incluir.includes(num)) {
        setIncluir(incluir.filter(n => n !== num))
      } else {
        if (incluir.length >= maxInclusoes) {
          setErro(`Não é possível incluir mais de ${maxInclusoes} dezenas em jogos de ${dezenas} dezenas. Remova uma inclusão ou aumente as dezenas por jogo.`)
          return
        }
        if (excluir.includes(num)) setExcluir(excluir.filter(n => n !== num))
        setIncluir([...incluir, num])
      }
    } else {
      if (excluir.includes(num)) {
        setExcluir(excluir.filter(n => n !== num))
      } else {
        if (excluir.length >= maxExclusoes) {
          setErro(`Não é possível excluir mais de ${maxExclusoes} dezenas em jogos de ${dezenas} dezenas. Remova uma exclusão ou reduza as dezenas por jogo.`)
          return
        }
        if (incluir.includes(num)) setIncluir(incluir.filter(n => n !== num))
        setExcluir([...excluir, num])
      }
    }
  }

  function limparSelecao() { setIncluir([]); setExcluir([]); setErro('') }

  async function gerarJogos() {
    setErro('')
    if (incluir.length > maxInclusoes) {
      setErro(`Você marcou ${incluir.length} inclusões, mas o máximo para ${dezenas} dezenas é ${maxInclusoes}.`)
      return
    }
    if (excluir.length > maxExclusoes) {
      setErro(`Você marcou ${excluir.length} exclusões, mas o máximo para ${dezenas} dezenas é ${maxExclusoes}.`)
      return
    }
    const disponiveis = 25 - incluir.length - excluir.length
    const necessarias = dezenas - incluir.length
    if (necessarias > disponiveis) {
      setErro(`Dezenas insuficientes: você precisa de ${necessarias} dezenas aleatórias, mas só há ${disponiveis} disponíveis (25 - ${incluir.length} inclusões - ${excluir.length} exclusões).`)
      return
    }
    setLoadingJogos(true)
    try {
      let url = `gerar-jogos?quantidade=${quantidade}&dezenas=${dezenas}&janela=${janela}&estrategia=${estrategia}`
      if (incluir.length) url += `&incluir=${incluir.join(',')}`
      if (excluir.length) url += `&excluir=${excluir.join(',')}`
      const r = await fetchAPI(url)
      if (r.sucesso) { setJogos(r.dados.jogos) } else { setErro(r.mensagem); setJogos([]) }
    } catch (e) { setErro('Erro ao gerar jogos') }
    setLoadingJogos(false)
  }

  async function atualizarBanco() {
    setErro('')
    try {
      const r = await fetchAPI('atualizar')
      if (r.sucesso) { carregarStats() } else { setErro(r.mensagem) }
    } catch (e) { setErro('Erro ao atualizar banco') }
  }

  const classificacao = stats?.classificacao_termica
  const frequencia = stats?.frequencia
  const quentesSorted = classificacao ? [...classificacao.quentes].sort((a, b) => a - b) : []
  const mornosSorted = classificacao ? [...classificacao.mornos].sort((a, b) => a - b) : []
  const friosSorted = classificacao ? [...classificacao.frios].sort((a, b) => a - b) : []

  function getBadgeClass(num) {
    if (incluir.includes(num)) return 'badge-incluir'
    if (excluir.includes(num)) return 'badge-excluir'
    return ''
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>Loto Rico</h1>
          <p>Inteligência Estatística para Loterias</p>
        </div>
        <span className="lottery-badge">Lotofácil</span>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={atualizarBanco}>Atualizar Banco</button>
          <button className="btn btn-secondary btn-sm" onClick={carregarStats} disabled={loadingStats}>
            {loadingStats ? 'Carregando...' : 'Recarregar Stats'}
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      {stats && (
        <div className="dashboard">
          <div className="stat-card"><div className="label">Registros no Banco</div><div className="value">{stats.total_registros_banco}</div><div className="sub">Concurso {stats.concurso_final}</div></div>
          <div className="stat-card"><div className="label">Janela de Análise</div><div className="value">{stats.total_analisados}</div><div className="sub">Últimos concursos</div></div>
          <div className="stat-card"><div className="label">Soma Média</div><div className="value">{stats.soma?.media}</div><div className="sub">Min: {stats.soma?.minimo} | Max: {stats.soma?.maximo}</div></div>
          <div className="stat-card"><div className="label">Pares / Ímpares</div><div className="value">{stats.paridade?.media_pares} / {stats.paridade?.media_impares}</div><div className="sub">Média histórica</div></div>
          <div className="stat-card"><div className="label">Repetição Média</div><div className="value">{stats.repeticao?.media_repeticao}</div><div className="sub">Última: {stats.repeticao?.ultima_repeticao}</div></div>
          <div className="stat-card"><div className="label">Sequências Média</div><div className="value">{stats.sequencias?.media_sequencias}</div><div className="sub">Max: {stats.sequencias?.max_sequencia_historica}</div></div>
        </div>
      )}

      {classificacao && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2>Classificação Térmica</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--quente)' }}>Quentes:</strong>
              <div className="thermal-row">
                {quentesSorted.map(n => (<span key={n} className={`badge badge-quente ${getBadgeClass(n)}`}>{pad(n)}</span>))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--morno)' }}>Mornos:</strong>
              <div className="thermal-row">
                {mornosSorted.map(n => (<span key={n} className={`badge badge-morno ${getBadgeClass(n)}`}>{pad(n)}</span>))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--frio)' }}>Frios:</strong>
              <div className="thermal-row">
                {friosSorted.map(n => (<span key={n} className={`badge badge-frio ${getBadgeClass(n)}`}>{pad(n)}</span>))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-grid">
        <div className="card">
          <h2>Volante Interativo</h2>
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'incluir' ? 'active' : ''}`} onClick={() => setMode('incluir')}>Incluir ({incluir.length}/{maxInclusoes})</button>
            <button className={`mode-btn ${mode === 'excluir' ? 'active' : ''}`} onClick={() => setMode('excluir')}>Excluir ({excluir.length}/{maxExclusoes})</button>
            <button className="mode-btn" onClick={limparSelecao} disabled={!temSelecao} style={{ flex: '0 0 auto', padding: '6px 14px', color: temSelecao ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>Limpar Tudo</button>
          </div>
          <div className="limit-info">Máximo de <strong>{maxInclusoes}</strong> inclusões e <strong>{maxExclusoes}</strong> exclusões para jogos de <strong>{dezenas}</strong> dezenas.</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: '6px' }}>
            Modo atual: <strong style={{ color: 'var(--accent)' }}>{mode === 'incluir' ? 'Incluir' : 'Excluir'}</strong>
            <InfoIcon>
              {mode === 'incluir'
                ? <>Dezenas marcadas como <strong>Incluir</strong> devem aparecer obrigatoriamente em todos os jogos gerados. Uma dezena não pode estar simultaneamente em <strong>Incluir</strong> e <strong>Excluir</strong>. O máximo de inclusões é igual ao número de dezenas por jogo.</>
                : <>Dezenas marcadas como <strong>Excluir</strong> não devem aparecer em nenhum jogo gerado. Uma dezena não pode estar simultaneamente em <strong>Incluir</strong> e <strong>Excluir</strong>. O máximo de exclusões é 25 menos o número de dezenas por jogo.</>
              }
            </InfoIcon>
          </div>
          <div className="volante-grid">
            {Array.from({ length: 25 }, (_, i) => i + 1).map(num => {
              const isIncluir = incluir.includes(num)
              const isExcluir = excluir.includes(num)
              const thermal = getThermalClass(classificacao, num)
              const freq = frequencia?.[num]?.frequencia
              const pct = frequencia?.[num]?.percentual
              return (
                <button key={num} className={`volante-cell ${thermal} ${isIncluir ? 'cell-incluir' : ''} ${isExcluir ? 'cell-excluir' : ''}`} onClick={() => handleVolanteClick(num)} title={`Freq: ${freq || '?'} (${pct || '?'}%)`}>{pad(num)}</button>
              )
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Incluir:</strong>
            <div className="tag-row">
              {incluir.length === 0 ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma</span> : incluir.sort((a, b) => a - b).map(n => (<span key={n} className="tag tag-incluir">{pad(n)}</span>))}
            </div>
            <strong style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Excluir:</strong>
            <div className="tag-row">
              {excluir.length === 0 ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma</span> : excluir.sort((a, b) => a - b).map(n => (<span key={n} className="tag tag-excluir">{pad(n)}</span>))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Painel de Controle</h2>
          <div className="form-group">
            <label>Estratégia <InfoIcon>
              <strong>Mista (Freq + Atraso)</strong>: Combina frequencia de sorteio com tempo de atraso. Dezenas com boa frequencia e atraso medio recebem maior peso. Ideal para quem busca equilibrio entre tendencias.<br/><br/>
              <strong>Quentes</strong>: Prioriza as dezenas mais sorteadas na janela analisada. Aproveita a tendencia de continuidade de dezenas em alta. Recomendado quando ha padrao de repeticao recente.<br/><br/>
              <strong>Frios</strong>: Prioriza as dezenas mais atrasadas (ha mais tempo sem aparecer). Baseado na lei dos grandes numeros, onde dezenas muito atrasadas tendem a retornar. Recomendado para quem busca retorno a media.<br/><br/>
              <strong>Equilibrada</strong>: Seleciona dezenas proximas a media historica de frequencia. Evita extremos (nem muito quentes, nem muito frias). Recomendado para apostas conservadoras.
            </InfoIcon></label>
            <select value={estrategia} onChange={e => setEstrategia(e.target.value)}>
              <option value="mista">Mista (Freq + Atraso)</option>
              <option value="quentes">Quentes (Mais sorteadas)</option>
              <option value="frios">Frios (Mais atrasadas)</option>
              <option value="equilibrada">Equilibrada (Próximas da média)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Dezenas por jogo: <strong style={{ color: 'var(--accent)' }}>{dezenas}</strong> <InfoIcon>Quantidade de dezenas em cada jogo gerado. Na Lotofácil, o volante aceita de <strong>15 a 20 dezenas</strong> por aposta. Alterar este valor recalcula os limites de inclusões e exclusões automaticamente.</InfoIcon></label>
            <input type="range" min="15" max="20" value={dezenas} onChange={e => setDezenas(parseInt(e.target.value, 10))} />
          </div>
          <div className="form-group">
            <label>Quantidade de jogos: <strong style={{ color: 'var(--accent)' }}>{quantidade}</strong> <InfoIcon>Número de combinações a serem geradas no lote atual. Aceita de <strong>1 a 300 jogos</strong> por geração.</InfoIcon></label>
            <input type="range" min="1" max="300" value={quantidade} onChange={e => setQuantidade(parseInt(e.target.value, 10))} />
          </div>
          <div className="form-group">
            <label>Janela de análise: <strong style={{ color: 'var(--accent)' }}>{janela}</strong> concursos <InfoIcon>Número de concursos recentes usados para calcular as estatísticas. Janelas menores capturam tendências recentes; maiores suavizam anomalias. Aceita de <strong>5 a 50 concursos</strong>.</InfoIcon></label>
            <input type="range" min="5" max="50" value={janela} onChange={e => setJanela(parseInt(e.target.value, 10))} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={gerarJogos} disabled={loadingJogos}>
            {loadingJogos ? 'Gerando...' : 'Gerar Jogos'}
          </button>
        </div>
      </div>

      {stats?.ultimos_sorteios && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h2>Últimos Sorteios</h2>
          {stats.ultimos_sorteios.map(s => (
            <div key={s.concurso} style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '13px' }}>Concurso {s.concurso}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{s.data_sorteio}</span>
              <div className="ultimos-row">
                {s.dezenas.map((d, i) => (<span key={i} className="ultimo-badge">{pad(d)}</span>))}
              </div>
            </div>
          ))}
        </div>
      )}

      {jogos.length > 0 && (
        <div className="card jogos-section">
          <div className="jogos-header">
            <h2>{jogos.length} Jogo(s) Gerado(s)</h2>
            <div className="export-buttons">
              <button className="btn btn-success btn-sm" onClick={() => exportarTxt(jogos, dezenas)}>TXT</button>
              <InfoIcon><strong>TXT</strong>: Formato da extensao Loto Rico para Chrome. Permite o upload dos jogos no site da Caixa Economica Federal.</InfoIcon>
              <button className="btn btn-secondary btn-sm" onClick={() => exportarPDF(jogos, dezenas, estrategia, janela, incluir, excluir)}>PDF</button>
              <InfoIcon><strong>PDF</strong>: Documento formatado com todas as informacoes dos jogos, estrategia utilizada e resumo estatistico. Ideal para impressao e arquivo.</InfoIcon>
              <button className="btn btn-secondary btn-sm" onClick={() => exportarCSV(jogos, dezenas, estrategia, janela)}>CSV</button>
              <InfoIcon><strong>CSV</strong>: Planilha com uma dezena por celula, cabecalho com dados da estrategia e informacoes completas. Compativel com Excel e Google Sheets.</InfoIcon>
            </div>
          </div>
          <div className="jogos-grid">
            {jogos.map(jogo => (
              <div key={jogo.id} className="jogo-item">
                <span className="jogo-num">#{jogo.id}</span>
                {jogo.dezenas.map((d, i) => (<span key={i} className="dezena-ball">{pad(d)}</span>))}
                <span className="jogo-info">Soma: {jogo.soma} | Pares: {jogo.pares} | Ímpares: {jogo.impares}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
