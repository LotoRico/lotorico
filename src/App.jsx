import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  const [tela, setTela] = useState('landing');
  const [usuario, setUsuario] = useState({ email: '', isAdmin: false });

  // --- Função de Login ---
  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const isAdm = email === 'adm@lotorico';
    setUsuario({ email, isAdmin: isAdm });
    setTela('app');
  };

  // --- Renderização da Aplicação ---
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
      
      {/* 1. TELA DE LOGIN */}
      {tela === 'landing' && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <h1 style={{ color: '#6c0a63' }}>Loto Rico</h1>
          <form onSubmit={handleLogin} style={{ maxWidth: '300px', margin: '20px auto' }}>
            <input name="email" type="text" placeholder="E-mail (adm@lotorico p/ teste)" required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#6c0a63', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Entrar</button>
          </form>
        </div>
      )}

      {/* 2. TELA DE JOGOS (APP) */}
      {tela === 'app' && (
        <div style={{ padding: '20px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2>Bem-vindo, {usuario.email}</h2>
            <div>
              {usuario.isAdmin && (
                <button onClick={() => setTela('admin')} style={{ padding: '10px 15px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px' }}>🛡️ Ir para Painel ADM</button>
              )}
              <button onClick={() => setTela('landing')} style={{ marginLeft: '10px', padding: '10px 15px' }}>Sair</button>
            </div>
          </header>
          
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3>Motor de Geração de Jogos</h3>
            <p style={{ color: '#666' }}>[Aqui integraremos o novo motor que aceita dezenas variáveis (15, 16, 17...)]</p>
          </div>
        </div>
      )}

      {/* 3. TELA DE ADMIN */}
      {tela === 'admin' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setTela('app')} style={{ marginBottom: '20px' }}>⬅ Voltar para Jogos</button>
          <h2 style={{ color: '#6c0a63' }}>🛡️ Painel Administrativo</h2>
          <div style={{ padding: '20px', border: '2px dashed #6c0a63', borderRadius: '10px', background: '#fff' }}>
            <h3>Importar Planilha de Resultados</h3>
            <input type="file" accept=".xlsx, .csv" onChange={(e) => {
              const file = e.target.files[0];
              const reader = new FileReader();
              reader.onload = (evt) => {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                alert(`Planilha "${file.name}" processada com sucesso!`);
              };
              reader.readAsBinaryString(file);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
