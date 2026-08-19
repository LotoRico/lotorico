import { useState, useEffect } from 'react'

// ===================== HELPERS =====================
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

// ===================== VOLANTE =====================
function Volante({ incluir, excluir, mode, onModeChange, onClick, onLimpar, stats }) {
  const classificacao = stats?.classificacao_termica
  const frequencia = stats?.frequencia

  return (
    <div className="card">
      <h2>Volante Interativo</h2>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'incluir' ? 'active' : ''}`}
          onClick={() => onModeChange('incluir')}
        >
          ✅ Incluir ({incluir.length})
        </button>
        <button
          className={`mode-btn ${mode === 'excluir' ? 'active' : ''}`}
          onClick={() => onModeChange('excluir')}
        >
          ❌ Excluir ({excluir.length})
        </button>
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
              onClick={() => onClick(num)}
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
            : incluir.sort((a,b) => a-b).map(n => <span key={n} className="tag tag-incluir">{pad(n)}</span>)
          }
        </div>
        <strong style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Excluir:</strong>
        <div className="tag-row">
          {excluir.length === 0
            ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma</span>
            : excluir.sort((a,b) => a-b).map(n => <span key={n} className="tag tag-excluir">{pad(n)}</span>)
          }
        </div>
      </div>

      <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={onLimpar}>
        🧹 Limpar Seleção
      </button>
    </div>
  )
}

// ===================== PAINEL DE CONTROLE =====================
function PainelControle({ janela, quantidade, dezenas, estrategia, incluir, excluir,
  onJanelaChange, onQuantidadeChange, onDezenasChange, onEstrategiaChange, onGerar, loading }) {
  return (
    <div className="card">
      <h2>Painel de Controle</h2>

      <div className="form-group">
        <label>Estratégia</label>
        <select value={estrategia} onChange={e => onEstrategiaChange(e.target.value)}>
          <option value="mista">🔀 M
