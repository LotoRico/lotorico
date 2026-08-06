import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  const [tela, setTela] = useState('landing');
  const [usuario, setUsuario] = useState(null);

  // Estados do Banco de Resultados Oficiais com colunas completas da Caixa
  const [resultadosOficiais, setResultadosOficiais] = useState([
    { 
      concurso: 3152, 
      data: '05/08/2026', 
      dezenas: [1, 3, 5, 8, 10, 12, 13, 15, 17, 19, 21, 22, 23, 24, 25], 
      ganhadores15: 5,
      cidadeUf: 'BA; PR; SP',
      rateio15: 'R$ 49.765,80',
      ganhadores14: 154,
      rateio14: 'R$ 689,84',
      ganhadores13: 4645,
      rateio13: 'R$ 10,00',
      ganhadores12: 48807,
      rateio12: 'R$ 4,00',
      ganhadores11: 257593,
      rateio11: 'R$ 2,00',
      arrecadacao: 'R$ 18.500.000,00',
      estimativaPremio: 'R$ 250.000,00',
      observacao: 'Estimativa de prêmio (15 ACERTOS) próximo concurso: R$ 250.000,00.'
    }
  ]);

  // Estados do Gerador Lotofácil
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

  // Estados do Painel Administrativo
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [statusUpload, setStatusUpload] = useState('');

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

    if (filtroPrimos) {
      const p = contarPrimos(jogo);
      if (p < 4 || p > 6) return false;
    }
    if (filtroMoldura) {
      const m = contarMoldura(jogo);
      if (m < 8 || m > 10) return false;
    }
    if (filtroSoma) {
      const soma = calcularSoma(jogo);
      if (soma < 180 || soma > 220) return false;
    }
    if (filtroImpares) {
      const impares = contarImpares(jogo);
      if (impares < 7 || impares > 9) return false;
    }
    if (filtroUltimosDois) {
      const ant1 = parseConcursoString(concursoAnterior1);
      const ant2 = parseConcursoString(concursoAnterior2);
      if (ant1.length > 0 && ant2.length > 0) {
        const comuns1 = jogo.filter(n => ant1.includes(n)).length;
        const comuns2 = jogo.filter(n => ant2.includes(n)).length;
        const mediaComuns = (comuns1 + comuns2) / 2;
        if (mediaComuns < 6 || mediaComuns > 11) return false;
      }
    }
    return true;
  };

  const handleGerarJogos = () => {
    setLoading(true);
    setTimeout(() => {
      const novosJogos = [];
      let tentativas = 0;
      const maxTentativas = 100000;

      while (novosJogos.length < qtdJogos && tentativas < maxTentativas) {
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

  const marcarTodas = () => {
    setFiltroPrimos(true);
    setFiltroMoldura(true);
    setFiltroSoma(true);
    setFiltroImpares(true);
    setFiltroUltimosDois(true);
  };

  const desmarcarTodas = () => {
    setFiltroPrimos(false);
    setFiltroMoldura(false);
    setFiltroSoma(false);
    setFiltroImpares(false);
    setFiltroUltimosDois(false);
  };

  const handleExportarExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,Jogo;";
    for (let i = 1; i <= 15; i++) csvContent += `D${i};`;
    csvContent += "Primos;Moldura;Soma;Impares\n";

    jogosGerados.forEach(j => {
      let row = `${j.id};` + j.numeros.join(";") + `;${j.primos};${j.moldura};${j.soma};${j.impares}\n`;
      csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "loto_rico_jogos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const cpf = e.target.cpf.value;

    const usuarioLogado = {
      nome: email === 'adm@lotorico' ? 'Mestre (Administrador)' : 'Mestre',
      email: email,
      cpf: cpf,
      admin: email === 'adm@lotorico',
      assinatura: { tipo: 'anual', validade: '2027-08-06', status: 'ativa' }
    };

    setUsuario(usuarioLogado);
    setTela('app');
  };

  // Leitura completa baseada estritamente nas colunas oficiais da Caixa
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoSelecionado(file);
      setStatusUpload('');
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!arquivoSelecionado) {
      alert('Selecione uma planilha antes de enviar.');
      return;
    }

    setStatusUpload('Processando matriz completa de dados da Caixa (Bolas, Ganhadores, Rateios e Observações)...');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const novosResultados = [];
        data.forEach((row, index) => {
          // Extrai dezenas válidas (1 a 25)
          const dezenasEncontradas = row
            .map(cell => parseInt(cell))
            .filter(n => !isNaN(n) && n >= 1 && n <= 25);
          
          if (dezenasEncontradas.length >= 15) {
            const concursoNum = row.find(cell => !isNaN(cell) && cell > 1000) || (index + 1000);
            
            novosResultados.push({
              concurso: Number(concursoNum),
              data: row[1] || '05/08/2026',
              dezenas: dezenasEncontradas.slice(0, 15).sort((a, b) => a - b),
              ganhadores15: row[16] || 0,
              cidadeUf: row[17] || 'SP',
              rateio15: row[18] || 'R$ 0,00',
              ganhadores14: row[19] || 0,
              rateio14: row[20] || 'R$ 0,00',
              ganhadores13: row[21] || 0,
              rateio13: row[22] || 'R$ 0,00',
              ganhadores12: row[23] || 0,
              rateio12: row[24] || 'R$ 0,00',
              ganhadores11: row[25] || 0,
              rateio11: row[26] || 'R$ 0,00',
              arrecadacao: row[27] || 'R$ 0,00',
              estimativaPremio: row[28] || 'R$ 0,00',
              observacao: row[30] || ''
            });
          }
        });

        if (novosResultados.length > 0) {
          novosResultados.sort((a, b) => b.concurso - a.concurso);
          setResultadosOficiais(novosResultados);

          if (novosResultados[0]) {
            setConcursoAnterior1(novosResultados[0].dezenas.map(n => String(n).padStart(2, '0')).join(' '));
          }
          if (novosResultados[1]) {
            setConcursoAnterior2(novosResultados[1].dezenas.map(n => String(n).padStart(2, '0')).join(' '));
          }

          setStatusUpload(`Sucesso! ${novosResultados.length} concursos importados com todas as métricas de rateio e premiação.`);
        } else {
          setStatusUpload('Arquivo lido, mas o layout de colunas divergiu do padrão Caixa.');
        }
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        setStatusUpload('Erro ao processar o arquivo XLSX.');
      }
    };
    reader.readAsBinaryString(arquivoSelecionado);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', color: '#1f2937', fontFamily: 'Arial, sans-serif', paddingBottom: '40px' }}>
      
      {/* 1. TELA DE LOGIN / LANDING */}
      {tela === 'landing' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ color: '#6c0a63', fontSize: '24px', fontWeight: '900', marginBottom: '6px', textAlign: 'center' }}>Loto Rico</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '20px' }}>Acesso ao Sistema</p>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>E-mail (adm@lotorico para adm)</label>
                <input name="email" type="text" required style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>CPF</label>
                <input name="cpf" type="text" placeholder="000.000.000-00" required style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar no Sistema</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. TELA DO APLICATIVO (JOGOS) */}
      {tela === 'app' && usuario && (
        <>
          <header style={{ background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', padding: '20px 30px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>LOTO RICO</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e9d5ff' }}>Mestre: {usuario.nome} | CPF: {usuario.cpf}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {usuario.admin && (
                <button onClick={() => setTela('admin')} style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🛡️ Painel ADM
                </button>
              )}
              <button onClick={() => { setUsuario(null); setTela('landing'); }} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Sair
              </button>
            </div>
          </header>

          <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#6c0a63', marginTop: 0, marginBottom: '20px', borderBottom: '2px solid #f3e8ff', paddingBottom: '8px' }}>
                  ⚙️ Parâmetros de Geração
                </h2>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Quantidade de Jogos</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={qtdJogos} 
                    onChange={(e) => setQtdJogos(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Concurso Alvo (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 3153" 
                    value={concursoAlvo} 
                    onChange={(e) => setConcursoAlvo(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#6c0a63', marginBottom: '10px' }}>📈 Base Oficial (Últimos Concursos)</h3>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', marginBottom: '4px' }}>Penúltimo Concurso</label>
                    <input 
                      type="text" 
                      value={concursoAnterior2} 
                      onChange={(e) => setConcursoAnterior2(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', marginBottom: '4px' }}>Último Concurso (Base Principal)</label>
                    <input 
                      type="text" 
                      value={concursoAnterior1} 
                      onChange={(e) => setConcursoAnterior1(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3e8ff', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#6c0a63', margin: 0 }}>
                    🎛️ Filtros Modulares
                  </h2>
                  <div>
                    <button onClick={marcarTodas} style={{ background: '#f3e8ff', color: '#6c0a63', border: '1px solid #d8b4fe', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginRight: '6px' }}>Marcar Todas</button>
                    <button onClick={desmarcarTodas} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Desmarcar Todas</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: filtroPrimos ? '1px solid #6c0a63' : '1px solid #e5e7eb', backgroundColor: filtroPrimos ? '#fdf4ff' : '#f9fafb', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filtroPrimos} onChange={(e) => setFiltroPrimos(e.target.checked)} style={{ accentColor: '#6c0a63', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Números Primos</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>4 a 6 primos</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: filtroMoldura ? '1px solid #6c0a63' : '1px solid #e5e7eb', backgroundColor: filtroMoldura ? '#fdf4ff' : '#f9fafb', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filtroMoldura} onChange={(e) => setFiltroMoldura(e.target.checked)} style={{ accentColor: '#6c0a63', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Moldura & Miolo</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>8 a 10 na borda</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: filtroSoma ? '1px solid #6c0a63' : '1px solid #e5e7eb', backgroundColor: filtroSoma ? '#fdf4ff' : '#f9fafb', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filtroSoma} onChange={(e) => setFiltroSoma(e.target.checked)} style={{ accentColor: '#6c0a63', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Soma Total</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>180 a 220</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: filtroImpares ? '1px solid #6c0a63' : '1px solid #e5e7eb', backgroundColor: filtroImpares ? '#fdf4ff' : '#f9fafb', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filtroImpares} onChange={(e) => setFiltroImpares(e.target.checked)} style={{ accentColor: '#6c0a63', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Ímpares / Pares</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>7 a 9 ímpares</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: filtroUltimosDois ? '1px solid #6c0a63' : '1px solid #e5e7eb', backgroundColor: filtroUltimosDois ? '#fdf4ff' : '#f9fafb', cursor: 'pointer', gridColumn: 'span 2' }}>
                    <input type="checkbox" checked={filtroUltimosDois} onChange={(e) => setFiltroUltimosDois(e.target.checked)} style={{ accentColor: '#6c0a63', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Repetição com Base nos Últimos 2 Sorteios</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Média de 6 a 11 acertos cruzados</div>
                    </div>
                  </label>
                </div>

                <button 
                  onClick={handleGerarJogos}
                  disabled={loading}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(108,10,99,0.3)' }}
                >
                  {loading ? 'Processando Fechamento...' : '✨ Gerar Jogos Otimizados'}
                </button>
              </div>

            </div>

            {jogosGerados.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>📊 Fechamento Gerado</h3>
                  <button onClick={handleExportarExcel} style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📊 Exportar Excel
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#4b5563', textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px', textAlign: 'center', width: '60px' }}>#</th>
                        <th style={{ padding: '14px' }}>Dezenas Selecionadas</th>
                        <th style={{ padding: '14px', textAlign: 'center' }}>Primos</th>
                        <th style={{ padding: '14px', textAlign: 'center' }}>Soma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jogosGerados.map((jogo) => (
                        <tr key={jogo.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '14px', textAlign: 'center', fontWeight: 'bold', color: '#6c0a63' }}>{String(jogo.id).padStart(2, '0')}</td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {jogo.numeros.map((num, idx) => (
                                <span key={idx} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px', fontWeight: '900', color: '#1f2937' }}>
                                  {String(num).padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center', fontWeight: 'bold' }}>{jogo.primos}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontWeight: 'bold' }}>{jogo.soma}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </main>
        </>
      )}

      {/* 3. TELA DO PAINEL ADMINISTRATIVO COM TABELA EXPANDIDA */}
      {tela === 'admin' && usuario?.admin && (
        <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto' }}>
          <button onClick={() => setTela('app')} style={{ marginBottom: '20px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>⬅ Voltar para Jogos</button>
          
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ color: '#6c0a63', marginTop: 0 }}>🛡️ Painel Administrativo • Importador de Matriz Completa da Caixa</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Carregue a planilha oficial para registrar dezenas, ganhadores de 15 a 11 pontos, rateios, arrecadação e observações de premiação.</p>
            
            <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ border: '2px dashed #d1d5db', padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb', textAlign: 'center' }}>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  {arquivoSelecionado ? `Selecionado: ${arquivoSelecionado.name}` : 'Formatos aceitos: .xlsx, .xls, .csv'}
                </div>
              </div>
              <button type="submit" style={{ background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '100%', boxShadow: '0 4px 10px rgba(108,10,99,0.3)' }}>
                Sincronizar Matriz Completa
              </button>
            </form>

            {statusUpload && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#6c0a63', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #d8b4fe' }}>
                {statusUpload}
              </div>
            )}

            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '14px', color: '#1f2937', marginBottom: '10px' }}>Base de Concursos Enriquecida ({resultadosOficiais.length})</h3>
              <div style={{ maxHeight: '400px', overflowX: 'auto', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>Concurso</th>
                      <th style={{ padding: '10px' }}>Data</th>
                      <th style={{ padding: '10px' }}>Dezenas Sorteadas</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ganh. 15</th>
                      <th style={{ padding: '10px' }}>UF/Cidade</th>
                      <th style={{ padding: '10px' }}>Rateio 15</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ganh. 14</th>
                      <th style={{ padding: '10px' }}>Rateio 14</th>
                      <th style={{ padding: '10px' }}>Arrecadação Total</th>
                      <th style={{ padding: '10px' }}>Observação / Estimativa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosOficiais.map((res, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#6c0a63' }}>#{res.concurso}</td>
                        <td style={{ padding: '10px', color: '#4b5563' }}>{res.data}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{res.dezenas.map(n => String(n).padStart(2, '0')).join(', ')}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>{res.ganhadores15}</td>
                        <td style={{ padding: '10px', color: '#4b5563' }}>{res.cidadeUf}</td>
                        <td style={{ padding: '10px', color: '#059669', fontWeight: 'bold' }}>{res.rateio15}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{res.ganhadores14}</td>
                        <td style={{ padding: '10px', color: '#1f2937' }}>{res.rateio14}</td>
                        <td style={{ padding: '10px', color: '#2563eb', fontWeight: 'bold' }}>{res.arrecadacao}</td>
                        <td style={{ padding: '10px', color: '#d97706', fontStyle: 'italic' }}>{res.observacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
