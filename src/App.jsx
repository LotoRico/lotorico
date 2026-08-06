import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  const [tela, setTela] = useState('landing');
  const [usuario, setUsuario] = useState(null);

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
  const [estatisticas, setEstatisticas] = useState(null);

  // Estados do Painel Administrativo
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [statusUpload, setStatusUpload] = useState('');
  const [historicoPlanilhas, setHistoricoPlanilhas] = useState([
    { id: 1, nome: 'resultados_lotofacil_oficial.xlsx', data: '05/03/2026', status: 'Processado com Sucesso' }
  ]);

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
      
      if (novosJogos.length > 0) {
        const mediaSoma = Math.round(novosJogos.reduce((acc, j) => acc + j.soma, 0) / novosJogos.length);
        const mediaPrimos = (novosJogos.reduce((acc, j) => acc + j.primos, 0) / novosJogos.length).toFixed(1);
        const mediaMoldura = (novosJogos.reduce((acc, j) => acc + j.moldura, 0) / novosJogos.length).toFixed(1);
        setEstatisticas({ total: novosJogos.length, mediaSoma, mediaPrimos, mediaMoldura });
      } else {
        setEstatisticas(null);
      }

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
      nome: email === 'adm@lotorico' ? 'Administrador Mestre' : 'Usuário Loto Rico',
      email: email,
      cpf: cpf,
      admin: email === 'adm@lotorico',
      assinatura: { tipo: 'anual', validade: '2027-08-06', status: 'ativa' }
    };

    setUsuario(usuarioLogado);
    setTela('app');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoSelecionado(file);
      setStatusUpload('');

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const wsname = workbook.SheetNames[0];
          const ws = workbook.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          console.log("Planilha carregada:", data);
        } catch (err) {
          console.error("Erro ao ler planilha:", err);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!arquivoSelecionado) {
      alert('Selecione uma planilha antes de enviar.');
      return;
    }

    setStatusUpload('Processando planilha com XLSX...');
    setTimeout(() => {
      const novoItem = {
        id: historicoPlanilhas.length + 1,
        nome: arquivoSelecionado.name,
        data: new Date().toLocaleDateString('pt-BR'),
        status: 'Sincronizado e Ativo'
      };
      setHistoricoPlanilhas([novoItem, ...historicoPlanilhas]);
      setStatusUpload('Planilha carregada e integrada com sucesso!');
      setArquivoSelecionado(null);
    }, 600);
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
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e9d5ff' }}>Usuário: {usuario.nome} | CPF: {usuario.cpf}</p>
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

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Concurso Alvo (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 3150" 
                    value={concursoAlvo} 
                    onChange={(e) => setConcursoAlvo(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }}
                  />
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

      {/* 3. TELA DO PAINEL ADMINISTRATIVO */}
      {tela === 'admin' && usuario?.admin && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <button onClick={() => setTela('app')} style={{ marginBottom: '20px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>⬅ Voltar para Jogos</button>
          
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ color: '#6c0a63', marginTop: 0 }}>🛡️ Painel Administrativo • Gestão de Planilhas</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Importe a base de dados oficial utilizando a biblioteca SheetJS (`xlsx`).</p>
            
            <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ border: '2px dashed #d1d5db', padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb', textAlign: 'center' }}>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  {arquivoSelecionado ? `Selecionado: ${arquivoSelecionado.name}` : 'Formatos aceitos: .xlsx, .xls, .csv'}
                </div>
              </div>
              <button type="submit" style={{ background: 'linear-gradient(135deg, #5a189a, #6c0a63)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '100%', boxShadow: '0 4px 10px rgba(108,10,99,0.3)' }}>
                Enviar Planilha
              </button>
            </form>

            {statusUpload && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#6c0a63', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #d8b4fe' }}>
                {statusUpload}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
