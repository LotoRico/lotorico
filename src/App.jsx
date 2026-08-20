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

function exportarXLSX(jogos, dezenas, estrategia, janela) {
  const data = new Date().toLocaleDateString('pt-BR')
  const hora = new Date().toLocaleTimeString('pt-BR')
  const estrat = getStrategyName(estrategia)
  const estratExp = getStrategyExplanation(estrategia)
  const totalCols = dezenas + 4
  const mergeAcross = totalCols - 1
  let dezenaHeaders = ''
  for (let i = 1; i <= dezenas; i++) { dezenaHeaders += `<Cell ss:StyleID="ColHeader"><Data ss:Type="String">D${pad(i)}</Data></Cell>` }
  let rowsXml = ''
  jogos.forEach(j => {
    let cellsXml = `<Cell ss:StyleID="JogoNum"><Data ss:Type="String">#${j.id}</Data></Cell>`
    j.dezenas.forEach(d => { cellsXml += `<Cell ss:StyleID="Dezena"><Data ss:Type="Number">${d}</Data></Cell>` })
    cellsXml += `<Cell ss:StyleID="Info"><Data ss:Type="Number">${j.soma}</Data></Cell>`
    cellsXml += `<Cell ss:StyleID="Info"><Data ss:Type="Number">${j.pares}</Data></Cell>`
    cellsXml += `<Cell ss:StyleID="Info"><Data ss:Type="Number">${j.impares}</Data></Cell>`
    rowsXml += `<Row>${cellsXml}</Row>`
  })
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
<Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#170D26"/><Interior ss:Color="#A855F7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
<Style ss:ID="SubHeader"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#E9D5FF"/><Interior ss:Color="#241535" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
<Style ss:ID="StrategyInfo"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#B794D4" ss:Italic="1"/><Interior ss:Color="#241535" ss:Pattern="Solid"/><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
<Style ss:ID="ColHeader"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#E9D5FF"/><Interior ss:Color="#332049" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/></Borders></Style>
<Style ss:ID="Dezena"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#170D26"/><Interior ss:Color="#A855F7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/></Borders></Style>
<Style ss:ID="JogoNum"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#B794D4"/><Interior ss:Color="#241535" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/></Borders></Style>
<Style ss:ID="Info"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#B794D4"/><Interior ss:Color="#241535" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2854"/></Borders></Style>
<Style ss:ID="Footer"><Font ss:FontName="Calibri" ss:Size="9" ss:Color="#B794D4"/><Interior ss:Color="#241535" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>
</Styles>
<Worksheet ss:Name="Loto Rico">
<Table>
<Row ss:Height="30"><Cell ss:MergeAcross="${mergeAcross}" ss:StyleID="Header"><Data ss:Type="String">Loto Rico - Inteligencia Estatistica para Loterias</Data></Cell></Row>
<Row><Cell ss:MergeAcross="${mergeAcross}" ss:StyleID="SubHeader"><Data ss:Type="String">Lotofacil | ${data} ${hora} | Estrategia: ${estrat} | Janela: ${janela} concursos | ${dezenas} dezenas | ${jogos.length} jogo(s)</Data></Cell></Row>
<Row ss:Height="60"><Cell ss:MergeAcross="${mergeAcross}" ss:StyleID="StrategyInfo"><Data ss:Type="String">${estratExp}</Data></Cell></Row>
<Row><Cell ss:StyleID="ColHeader"><Data ss:Type="String">Jogo</Data></Cell>${dezenaHeaders}<Cell ss:StyleID="ColHeader"><Data ss:Type="String">Soma</Data></Cell><Cell ss:StyleID="ColHeader"><Data ss:Type="String">Pares</Data></Cell><Cell ss:StyleID="ColHeader"><Data ss:Type="String">Impares</Data></Cell></Row>
${rowsXml}
<Row><Cell ss:MergeAcross="${mergeAcross}" ss:StyleID="Footer"><Data ss:Type="String">Usuario: [Assinante] | Gerado por Loto Rico</Data></Cell></Row>
</Table>
</Worksheet>
</Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lotorico_${jogos.length}jogos_${dezenas}dezenas.xls`
  a.click()
  URL.revokeObjectURL(url)
}

function exportarPDF(jogos, dezenas, estrategia, janela) {
  const data = new Date().toLocaleDateString('pt-BR')
  const hora = new Date().toLocaleTimeString('pt-BR')
  const estrat = getStrategyName(estrategia)
  const estratExp = getStrategyExplanation(estrategia)
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>Loto Rico - Jogos</title><style>body{font-family:Inter,Calibri,sans-serif;background:#170d26;color:#e9d5ff;padding:40px;margin:0}h1{color:#a855f7;text-align:center;margin:0 0 4px}.sub{text-align:center;color:#b794d4;font-size:14px;margin-bottom:20px}.info{text-align:center;color:#b794d4;font-size:13px;margin-bottom:16px}.strategy-box{background:#241535;border:1px solid #3d2854;border-radius:8px;padding:16px;margin-bottom:24px}.strategy-title{color:#a855f7;font-weight:700;font-size:13px;margin-bottom:6px}.strategy-text{color:#b794d4;font-size:12px;line-height:1.5}table{width:100%;border-collapse:collapse}th{background:#a855f7;color:#170d26;padding:10px;font-size:13px}td{padding:8px;border:1px solid #3d2854;font-size:13px;text-align:center}tr:nth-child(even){background:#241535}.footer{margin-top:30px;text-align:center;font-size:11px;color:#b794d4}</style></head><body><h1>Loto Rico</h1><div class="sub">Inteligencia Estatistica para Loterias</div><div class="info">Lotofacil | ${data} ${hora}<br>Estrategia: ${estrat} | Janela: ${janela} concursos | ${dezenas} dezenas | ${jogos.length} jogo(s)</div><div class="strategy-box"><div class="strategy-title">Resumo da Estrategia: ${estrat}</div><div class="strategy-text">${estratExp}</div></div><table><tr><th>Jogo</th>${Array.from({length:dezenas},(_,i)=>`<th>D${pad(i+1)}</th>`).join('')}<th>Soma</th><th>Pares</th><th>Impares</th></tr>${jogos.map(j=>`<tr><td>#${j.id}</td>${j.dezenas.map(d=>`<td>${pad(d)}</td>`).join('')}<td>${j.soma}</td><td>${j.pares}</td><td>${j.impares}</td></tr>`).join('')}</table><div class="footer">Usuario: [Assinante] | Gerado por Loto Rico</div></body></html>`)
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

  async function carregarStats() {
    setLoadingStats(true)
    try {
      const r = await fetchAPI(`estatisticas?janela=${janela}`)
      if (r.sucesso) setStats(r.dados)
    } catch (e) { setErro('Erro ao carregar estatisticas') }
    setLoadingStats(false)
  }

  useEffect(() => { carregarStats() }, [janela])

  function handleVolanteClick(num) {
    if (mode === 'incluir') {
      if (incluir.includes(num)) {
        setIncluir(incluir.filter(n => n !== num))
      } else {
        if (excluir.includes(num)) setExcluir(excluir.filter(n => n !== num))
        setIncluir([...incluir, num])
      }
    } else {
      if (excluir.includes(num)) {
        setExcluir(excluir.filter(n => n !== num))
      } else {
        if (incluir.includes(num)) setIncluir(incluir.filter(n => n !== num))
        setExcluir([...excluir, num])
      }
    }
  }

  function limparSelecao() { setIncluir([]); setExcluir([]) }

  async function gerarJogos() {
    setLoadingJogos(true)
    setErro('')
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
                {quentesSorted.map(n => (<span key={n} className="badge badge-quente">{pad(n)}</span>))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--morno)' }}>Mornos:</strong>
              <div className="thermal-row">
                {mornosSorted.map(n => (<span key={n} className="badge badge-morno">{pad(n)}</span>))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--frio)' }}>Frios:</strong>
              <div className="thermal-row">
                {friosSorted.map(n => (<span key={n} className="badge badge-frio">{pad(n)}</span>))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-grid">
        <div className="card">
          <h2>Volante Interativo</h2>
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'incluir' ? 'active' : ''}`} onClick={() => setMode('incluir')}>Incluir ({incluir.length})</button>
            <button className={`mode-btn ${mode === 'excluir' ? 'active' : ''}`} onClick={() => setMode('excluir')}>Excluir ({excluir.length})</button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Modo atual: <strong style={{ color: 'var(--accent)' }}>{mode === 'incluir' ? 'Incluir' : 'Excluir'}</strong>
            <InfoIcon>
              {mode === 'incluir'
                ? <>Dezenas marcadas como <strong>Incluir</strong> devem aparecer obrigatoriamente em todos os jogos gerados. Uma dezena não pode estar simultaneamente em <strong>Incluir</strong> e <strong>Excluir</strong>.</>
                : <>Dezenas marcadas como <strong>Excluir</strong> não devem aparecer em nenhum jogo gerado. Uma dezena não pode estar simultaneamente em <strong>Incluir</strong> e <strong>Excluir</strong>.</>
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
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={limparSelecao}>Limpar Seleção</button>
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
            <label>Dezenas por jogo: <strong style={{ color: 'var(--accent)' }}>{dezenas}</strong> <InfoIcon>Quantidade de dezenas em cada jogo gerado. Na Lotofácil, o volante aceita de <strong>15 a 20 dezenas</strong> por aposta.</InfoIcon></label>
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
              <button className="btn btn-success btn-sm" onClick={() => exportarTxt(jogos, dezenas)} title="Formato da extensão Loto Rico para Chrome - permite o upload dos jogos no site da Caixa">TXT</button>
              <button className="btn btn-secondary btn-sm" onClick={() => exportarPDF(jogos, dezenas, estrategia, janela)}>PDF</button>
              <button className="btn btn-secondary btn-sm" onClick={() => exportarXLSX(jogos, dezenas, estrategia, janela)}>XLSX</button>
            </div>
          </div>
          <div className="export-note">TXT: formato da extensão Loto Rico para Chrome - permite o upload dos jogos no site da Caixa | PDF e XLSX: documentos com informações completas</div>
          <div className="jogos-grid">
            {jogos.map(jogo => (
              <div key={jogo.id} className="jogo-item">
                <span className="jogo-num">#{jogo.id}</span>
                {jogo.dezenas.map((d, i) => (<span key={i} className="dezena-ball">{pad(d)}</span>))}
                <span className="jogo-info">S{jogo.soma} | {jogo.pares}p {jogo.impares}i</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
