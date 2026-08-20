// src/App.jsx
import { useState, useEffect } from 'react'

async function fetchAPI(endpoint) {
  const resp = await fetch(`/api/${endpoint}`)
  return resp.json()
}

function getThermalClass(classificacao, num) {
  if (!classificacao) return ''
  if (classificacao.quentes?.includes(num)) return 'thermal-quente'
  if (classificacao.mornos?.includes(num)) return 'thermal-morno'
  if (classificacao.frios?.includes(num)) return 'thermal-frio'
  return ''
}

function pad(n) { return String(n).padStart(2, '0') }

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

function InfoIcon({ text }) {
  return (
    <span className="info-icon">ⓘ<span className="info-tooltip">{text}</span></span>
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
    } catch (e) {
      setErro('Erro ao carregar estatísticas')
    }
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

  function limparSelecao() {
    setIncluir([])
    setExcluir([])
  }

  async function gerarJogos() {
    setLoadingJogos(true)
    setErro('')
    try {
      let url = `gerar-jogos?quantidade=${quantidade}&dezenas=${dezenas}&janela=${janela}&estrategia=${estrategia}`
      if (incluir.length) url += `&incluir=${incluir.join(',')}`
      if (excluir.length) url += `&excluir=${excluir.join(',')}`
      const r = await fetchAPI(url)
      if (r.sucesso) {
        setJogos(r.dados.jogos)
      } else {
        setErro(r.mensagem)
        setJogos([])
      }
    } catch (e) {
      setErro('Erro ao gerar jogos')
    }
    setLoadingJogos(false)
  }

  async function atualizarBanco() {
    setErro('')
    try {
      const r = await fetchAPI('atualizar')
      if (r.sucesso) {
        carregarStats()
      } else {
        setErro(r.mensagem)
      }
    } catch (e) {
      setErro('Erro ao atualizar banco')
    }
  }

  const classificacao = stats?.classificacao_termica
  const frequencia = stats?.frequencia

  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div>
          <h1>🎰 Loto Rico</h1>
          <p>Inteligência Estatística para Loterias</p>
          <span className="lottery-badge">🟣 Lotofácil</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={atualizarBanco}>
            🔄 Atualizar Banco
          </button>
          <button className="btn btn-secondary btn-sm" onClick={carregarStats} disabled={loadingStats}>
            {loadingStats ? '⏳ Carregando...' : '📊 Recarregar Stats'}
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      {/* DASHBOARD */}
      {stats && (
        <div className="dashboard">
          <div className="stat-card">
            <div className="label">Registros no Banco</div>
            <div className="value">{stats.total_registros_banco}</div>
            <div className="sub">Concurso {stats.concurso_final}</div>
          </div>
          <div className="stat-card">
            <div className="label">Janela de Análise</div>
            <div className="value">{stats.total_analisados}</div>
            <div className="sub">Últimos concursos</div>
          </div>
          <div className="stat-card">
            <div className="label">Soma Média</div>
            <div className="value">{stats.soma?.media}</div>
            <div className="sub">Min: {stats.soma?.minimo} | Max: {stats.soma?.maximo}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pares / Ímpares</div>
            <div className="value">{stats.paridade?.media_pares} / {stats.paridade?.media_impares}</div>
            <div className="sub">Média histórica</div>
          </div>
          <div className="stat-card">
            <div className="label">Repetição Média</div>
            <div className="value">{stats.repeticao?.media_repeticao}</div>
            <div className="sub">Última: {stats.repeticao?.ultima_repeticao}</div>
          </div>
          <div className="stat-card">
            <div className="label">Sequências Média</div>
            <div className="value">{stats.sequencias?.media_sequencias}</div>
            <div className="sub">Max: {stats.sequencias?.max_sequencia_historica}</div>
          </div>
        </div>
      )}

      {/* CLASSIFICAÇÃO TÉRMICA */}
      {classificacao && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2>🔥 Classificação Térmica</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--quente)' }}>Quentes:</strong>
              <div className="thermal-row">
                {classificacao.quentes.map(n => (
                  <span key={n} className="badge badge-quente">{pad(n)}</span>
                ))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--morno)' }}>Mornos:</strong>
              <div className="thermal-row">
                {classificacao.mornos.map(n => (
                  <span key={n} className="badge badge-morno">{pad(n)}</span>
                ))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--frio)' }}>Frios:</strong>
              <div className="thermal-row">
                {classificacao.frios.map(n => (
                  <span key={n} className="badge badge-frio">{pad(n)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN GRID: VOLANTE + PAINEL */}
      <div className="main-grid">
        {/* VOLANTE */}
        <div className="card">
          <h2>Volante Interativo</h2>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'incluir' ? 'active' : ''}`}
              onClick={() => setMode('incluir')}
            >
              ✅ Incluir ({incluir.length})
            </button>
            <button
              className={`mode-btn ${mode === 'excluir' ? 'active' : ''}`}
              onClick={() => setMode('excluir')}
            >
              ❌ Excluir ({excluir.length})
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Modo atual: <strong style={{ color: 'var(--accent)' }}>{mode === 'incluir' ? 'Incluir' : 'Excluir'}</strong>
            <InfoIcon text={mode === 'incluir'
              ? 'Dezenas marcadas como Incluir devem aparecer obrigatoriamente em todos os jogos gerados. Uma dezena não pode estar simultaneamente em Incluir e Excluir.'
              : 'Dezenas marcadas como Excluir não devem aparecer em nenhum jogo gerado. Uma dezena não pode estar simultaneamente em Incluir e Excluir.'} />
          </div>
          <div className="volante-grid">
            {Array.from({ length: 25 }, (_, i) => i + 1).map(num => {
              const isIncluir = incluir.includes(num)
              const isExcluir = excluir.includes(num)
              const thermal = getThermalClass(classificacao, num)
              const freq = frequencia?.[num]?.frequencia
              const pct = frequencia?.[num]?.percentual
              return (
                <button
                  key={num}
                  className={`volante-cell ${thermal} ${isIncluir ? 'cell-incluir' : ''} ${isExcluir ? 'cell-excluir' : ''}`}
                  onClick={() => handleVolanteClick(num)}
                  title={`Freq: ${freq || '?'} (${pct || '?'}%)`}
                >
                  {pad(num)}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Incluir:</strong>
            <div className="tag-row">
              {incluir.length === 0
                ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma</span>
                : incluir.sort((a, b) => a - b).map(n => (
                    <span key={n} className="tag tag-incluir">{pad(n)}</span>
                  ))
              }
            </div>
            <strong style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Excluir:</strong>
            <div className="tag-row">
              {excluir.length === 0
                ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma</span>
                : excluir.sort((a, b) => a - b).map(n => (
                    <span key={n} className="tag tag-excluir">{pad(n)}</span>
                  ))
              }
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={limparSelecao}
          >
            🧹 Limpar Seleção
          </button>
        </div>

        {/* PAINEL DE CONTROLE */}
        <div className="card">
          <h2>Painel de Controle</h2>
          <div className="form-group">
            <label>Estratégia <InfoIcon text="Define como o sistema pondera a seleção de dezenas. Mista combina frequência e atraso. Quentes prioriza as mais sorteadas. Frios prioriza as mais atrasadas. Equilibrada busca dezenas próximas à média histórica." /></label>
            <select value={estrategia} onChange={e => setEstrategia(e.target.value)}>
              <option value="mista">🔀 Mista (Freq + Atraso)</option>
              <option value="quentes">🔥 Quentes (Mais sorteadas)</option>
              <option value="frios">❄️ Frios (Mais atrasadas)</option>
              <option value="equilibrada">⚖️ Equilibrada (Próximas da média)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Dezenas por jogo: <strong style={{ color: 'var(--accent)' }}>{dezenas}</strong> <InfoIcon text="Quantidade de dezenas em cada jogo gerado. Na Lotofácil, o volante aceita de 15 a 20 dezenas por aposta." /></label>
            <input
              type="range"
              min="15"
              max="20"
              value={dezenas}
              onChange={e => setDezenas(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="form-group">
            <label>Quantidade de jogos: <strong style={{ color: 'var(--accent)' }}>{quantidade}</strong> <InfoIcon text="Número de combinações a serem geradas no lote atual. Aceita de 1 a 300 jogos por geração." /></label>
            <input
              type="range"
              min="1"
              max="300"
              value={quantidade}
              onChange={e => setQuantidade(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="form-group">
            <label>Janela de análise: <strong style={{ color: 'var(--accent)' }}>{janela}</strong> concursos <InfoIcon text="Número de concursos recentes usados para calcular as estatísticas. Janelas menores capturam tendências recentes; maiores suavizam anomalias. Aceita de 5 a 50 concursos." /></label>
            <input
              type="range"
              min="5"
              max="50"
              value={janela}
              onChange={e => setJanela(parseInt(e.target.value, 10))}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={gerarJogos}
            disabled={loadingJogos}
          >
            {loadingJogos ? '⏳ Gerando...' : '🎲 Gerar Jogos'}
          </button>
        </div>
      </div>

      {/* ÚLTIMOS SORTEIOS */}
      {stats?.ultimos_sorteios && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h2>📋 Últimos Sorteios</h2>
          {stats.ultimos_sorteios.map(s => (
            <div key={s.concurso} style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '13px' }}>Concurso {s.concurso}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                {s.data_sorteio}
              </span>
              <div className="ultimos-row">
                {s.dezenas.map((d, i) => (
                  <span key={i} className="ultimo-badge">{pad(d)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JOGOS GERADOS */}
      {jogos.length > 0 && (
        <div className="card jogos-section">
          <div className="jogos-header">
            <h2>✅ {jogos.length} Jogo(s) Gerado(s)</h2>
            <button
              className="btn btn-success btn-sm"
              onClick={() => exportarTxt(jogos, dezenas)}
            >
              💾 Exportar .txt
            </button>
          </div>
          <div className="jogos-grid">
            {jogos.map(jogo => (
              <div key={jogo.id} className="jogo-item">
                <span className="jogo-num">#{jogo.id}</span>
                {jogo.dezenas.map((d, i) => (
                  <span key={i} className="dezena-ball">{pad(d)}</span>
                ))}
                <span className="jogo-info">
                  Σ{jogo.soma} | {jogo.pares}p {jogo.impares}i
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
