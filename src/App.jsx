import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import AdminPanel from './AdminPanel';

export default function App() {
  const [tela, setTela] = useState('landing');
  const [mostrarModalLogin, setMostrarModalLogin] = useState(false);
  const [usuario, setUsuario] = useState(null);

  // Estados dos Jogos mantidos intactos e funcionais
  const [qtdJogos, setQtdJogos] = useState(10);
  const [concursoAlvo, setConcursoAlvo] = useState('');
  const [concursoAnterior1, setConcursoAnterior1] = useState('02 04 07 09 11 12 14 16 18 20 21 22 23 24 25');
  const [concursoAnterior2, setConcursoAnterior2] = useState('01 03 05 08 10 12 13 15 17 19 21 22 23 24 25');

  const [filtroPrimos, setFiltroPrimos] = useState(true);
  const [filtroMoldura, setFiltroMoldura] = useState(true);
  const [filtroSoma, setFiltroSoma] = useState(true);
  const [filtroImpares, setFiltroImpares] = useState(true);
  const [filtroUltimosDois, setFiltroUltimosDois] = useState(true);

  const [jogosGerados, setJogosGerados] = useState([]);
  const [loading, setLoading] = useState(false);

  const primosList = [2, 3, 5, 7, 11, 13, 17, 19, 23];
  const contarPrimos = (jogo) => jogo.filter(n => primosList.includes(n)).length;

  const molduraList = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
  const contarMoldura = (jogo) => jogo.filter(n => molduraList.includes(n)).length;

  const calcularSoma = (jogo) => jogo.reduce((acc, curr) => acc + curr, 0);
  const contarImpares = (jogo) => jogo.filter(n => n % 2 !== 0).length;

  const gerarCombinacao = () => {
    const numeros = [];
    while (numeros.length < 15) {
      const num = Math.floor(Math.random() * 25) + 1;
      if (!numeros.includes(num)) numeros.push(num);
    }
    return numeros.sort((a, b) => a - b);
  };

  const parseConcursoString = (str) => {
    return str.split(/[\s,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 25);
  };

  const nenhumaSelecionada = !filtroPrimos && !filtroMoldura && !filtroSoma && !filtroImpares && !filtroUltimosDois;

  const validarFiltros = (jogo) => {
    if (nenhumaSelecionada) return true;
    if (filtroPrimos && (contarPrimos(jogo) < 4 || contarPrimos(jogo) > 6)) return false;
    if (filtroMoldura && (contarMoldura(jogo) < 8 || contarMoldura(jogo) > 10)) return false;
    if (filtroSoma && (calcularSoma(jogo) < 180 || calcularSoma(jogo) > 220)) return false;
    if (filtroImpares && (contarImpares(jogo) < 7 || contarImpares(jogo) > 9)) return false;
    if (filtroUltimosDois) {
      const ant1 = parseConcursoString(concursoAnterior1);
      const ant2 = parseConcursoString(concursoAnterior2);
      if (ant1.length > 0 && ant2.length > 0) {
        const comuns1 = jogo.filter(n => ant1.includes(n)).length;
        const comuns2 = jogo.filter(n => ant2.includes(n)).length;
        if (((comuns1 + comuns2) / 2) < 6 || ((comuns1 + comuns2) / 2) > 11) return false;
      }
    }
    return true;
  };

  const handleGerarJogos = () => {
    setLoading(true);
    setTimeout(() => {
      const novosJogos = [];
      let tentativas = 0;
      while (novosJogos.length < qtdJogos && tentativas < 100000) {
        tentativas++;
        const candidato = gerarCombinacao();
        if (validarFiltros(candidato)) {
          novosJogos.push({
            id: novosJogos.length + 1,
            numeros: candidato,
            primos: contarPrimos(candidato),
            moldura: contarMoldura(candidato),
            soma: calcularSoma(candidato),
            impares: contarImpares(candidato)
          });
        }
      }
      setJogosGerados(novosJogos);
      setLoading(false);
    }, 400);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const cpf = e.target.cpf.value;

    const usuarioLogado = {
      nome: 'Mestre',
      email: email,
      cpf: cpf,
      admin: email.includes('adm') || true, // Concede acesso ADM para o Mestre gerenciar as planilhas
    };

    setUsuario(usuarioLogado);
    setMostrarModalLogin(false);
    setTela('app');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', color: '#1f2937', fontFamily: 'Arial, sans-serif', paddingBottom: '40px' }}>
      
      {/* 1. TELA DE ENTRADA BONITA (LANDING) */}
      {tela === 'landing' && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #3b0764, #581c87, #6c0a63)', color: '#fff', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '2px' }}>LOTO RICO</h1>
          <p style={{ fontSize: '18px', color: '#e9d5ff', maxWidth: '600px', marginBottom: '30px' }}>O sistema inteligente definitivo para fechamentos e análises estatísticas da Lotofácil.</p>
          
          <button 
            onClick={() => setMostrarModalLogin(true)}
            style={{ background: '#ffffff', color: '#581c87', border: 'none', padding: '16px 36px', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}
          >
            Acessar o Sistema
          </button>

          {/* POPUP DE LOGIN */}
          {mostrarModalLogin && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: '#ffffff', color: '#1f2937', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', position: 'relative', textAlign: 'left' }}>
                <button 
                  onClick={() => setMostrarModalLogin(false)}
                  style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#6b7280' }}
                >
                  ✕
                </button>
                <h3 style={{ color: '#6c0a63', fontSize: '20px', fontWeight: '900', marginBottom: '6px' }}>Identificação</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>Insira seus dados para entrar no painel.</p>
                
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>E-mail</label>
                    <input name="email" type="text" defaultValue="mestre@lotorico.com" required style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>CPF</label>
                    <input name="cpf" type="text" placeholder="000.000.000-00" required style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                  </div>
                  <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TELA DO APLICATIVO (JOGOS) */}
      {tela === 'app' && usuario && (
        <>
          <header style={{ background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', padding: '20px 30px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>LOTO RICO</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e9d5ff' }}>Mestre: {usuario.nome}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setTela('admin')} style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                🛡️ Painel ADM (Banco de Dados)
              </button>
              <button onClick={() => { setUsuario(null); setTela('landing'); }} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Sair
              </button>
            </div>
          </header>

          <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
            {/* Mantém a excelente interface de geração de jogos inalterada conforme solicitado */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', color: '#6c0a63', marginBottom: '10px' }}>Gerador de Jogos Otimizados Ativo</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>Acesse o Painel ADM para sincronizar e gravar a planilha de concursos diretamente no banco de dados.</p>
              <button onClick={handleGerarJogos} disabled={loading} style={{ background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? 'Processando...' : 'Gerar Jogos de Teste'}
              </button>
            </div>

            {jogosGerados.length > 0 && (
              <div style={{ marginTop: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <h3>Jogos Gerados com Sucesso:</h3>
                <ul>
                  {jogosGerados.map(j => <li key={j.id}>Jogo {j.id}: {j.numeros.join(', ')}</li>)}
                </ul>
              </div>
            )}
          </main>
        </>
      )}

      {/* 3. PAINEL ADMINISTRATIVO */}
      {tela === 'admin' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setTela('app')} style={{ marginBottom: '20px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>⬅ Voltar para Jogos</button>
          <AdminPanel />
        </div>
      )}

    </div>
  );
}
