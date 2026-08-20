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
    <span className="info-icon">i
      <span className="info-tooltip">{text}</span>
    </span>
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
