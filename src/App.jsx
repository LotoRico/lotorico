import React, { useState } from 'react';
import { 
  Trophy, 
  Settings, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function App() {
  const [qtdJogos, setQtdJogos] = useState(10);
  const [concursoAlvo, setConcursoAlvo] = useState('');
  
  const [concursoAnterior1, setConcursoAnterior1] = useState('02, 04, 07, 09, 11, 12, 14, 16, 18, 20, 21, 22, 23, 24, 25');
  const [concursoAnterior2, setConcursoAnterior2] = useState('01, 03, 05, 08, 10, 12, 13, 15, 17, 19, 21, 22, 23, 24, 25');

  const [filtroPrimos, setFiltroPrimos] = useState(true);
  const [filtroMoldura, setFiltroMoldura] = useState(true);
  const [filtroSoma, setFiltroSoma] = useState(true);
  const [filtroImpares, setFiltroImpares] = useState(true);
  const [filtroUltimosDois, setFiltroUltimosDois] = useState(false);

  const [jogosGerados, setJogosGerados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);

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
    return str.split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 25);
  };

  const validarFiltros = (jogo) => {
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
      const maxTentativas = 50000;

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

  const exportarExcel = () => {
    if (jogosGerados.length === 0) return;
    const dados = jogosGerados.map(j => ({
      'Jogo #': j.id,
      ...j.numeros.reduce((acc, n, idx) => ({ ...acc, [`N${idx+1}`]: n }), {}),
      'Primos': j.primos,
      'Moldura': j.moldura,
      'Soma': j.soma,
      'Ímpares': j.impares
    }));
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jogos LotoRico");
    XLSX.writeFile(workbook, "lotorico_jogos_otimizados.xlsx");
  };

  const exportarPDF = () => {
    if (jogosGerados.length === 0) return;
    const doc = new jsPDF();
    doc.setFillColor(93, 20, 115); // Tom Roxo Caixa
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("LOTORICO - Inteligência e Fechamentos para a Lotofácil", 14, 16);
    
    const tableData = jogosGerados.map(j => [
      `Jogo ${j.id}`,
      j.numeros.map(n => String(n).padStart(2, '0')).join(', '),
      j.primos,
      j.moldura,
      j.soma,
      j.impares
    ]);

    doc.autoTable({
      startY: 32,
      head: [['#', 'Dezenas Selecionadas', 'Primos', 'Moldura', 'Soma', 'Ímpares']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [93, 20, 115] },
      styles: { fontSize: 9, halign: 'center' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    doc.save("lotorico_jogos_otimizados.pdf");
  };

  return (
    <div className="min-h-screen bg-[#120a1f] text-slate-100 font-sans pb-16 selection:bg-[#7b2cbf] selection:text-white">
      {/* Header Oficial Lotofácil - Roxo Caixa */}
      <header className="bg-gradient-to-r from-[#3c096c] via-[#5a189a] to-[#7b2cbf] border-b border-[#9d4edd]/30 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="bg-[#240046] p-3 rounded-2xl shadow-inner border border-[#9d4edd]/40">
              <Trophy className="w-7 h-7 text-[#e0aaff]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white drop-shadow-md">
                LOTORICO
              </h1>
              <p className="text-xs text-[#e0aaff] font-medium tracking-wide">Inteligência e Geração de Fechamentos para a Lotofácil</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#240046]/80 px-4 py-2 rounded-full border border-[#9d4edd]/40 text-xs font-bold text-[#e0aaff] shadow-lg">
            <Sparkles className="w-4 h-4 text-[#ff9e00]" />
            <span>Padrão Oficial Lotofácil (Caixa)</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Painel Principal de Configurações e Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Parâmetros do Concurso */}
          <div className="bg-[#1b102f] border border-[#3c096c] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 text-[#e0aaff] font-bold border-b border-[#3c096c] pb-3">
                <Settings className="w-5 h-5 text-[#c77dff]" />
                <h2 className="text-base">Parâmetros de Geração</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#c77dff] mb-1.5">Quantidade de Jogos</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={qtdJogos} 
                    onChange={(e) => setQtdJogos(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#10071c] border border-[#5a189a] rounded-xl px-4 py-3 text-slate-100 font-bold focus:outline-none focus:border-[#c77dff] focus:ring-2 focus:ring-[#7b2cbf]/30 transition-all text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#c77dff] mb-1.5">Concurso Alvo (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 3150" 
                    value={concursoAlvo} 
                    onChange={(e) => setConcursoAlvo(e.target.value)}
                    className="w-full bg-[#10071c] border border-[#5a189a] rounded-xl px-4 py-3 text-slate-100 font-bold focus:outline-none focus:border-[#c77dff] focus:ring-2 focus:ring-[#7b2cbf]/30 transition-all text-base"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#3c096c] text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#e0aaff] shrink-0 mt-0.5" />
              <span>Configure seus filtros estratégicos ao lado para gerar combinações altamente assertivas.</span>
            </div>
          </div>

          {/* Filtros Modulares Avançados */}
          <div className="lg:col-span-2 bg-[#1b102f] border border-[#3c096c] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b border-[#3c096c] pb-3">
                <div className="flex items-center gap-2.5 text-[#e0aaff] font-bold">
                  <Sliders className="w-5 h-5 text-[#c77dff]" />
                  <h2 className="text-base">Filtros e Estratégias Modulares</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={marcarTodas} className="text-xs bg-[#3c096c] hover:bg-[#5a189a] text-purple-200 px-3.5 py-1.5 rounded-xl border border-[#7b2cbf]/50 transition-all font-semibold cursor-pointer shadow">
                    Marcar Todas
                  </button>
                  <button onClick={desmarcarTodas} className="text-xs bg-[#240046] hover:bg-[#3c096c] text-purple-300 px-3.5 py-1.5 rounded-xl border border-[#3c096c] transition-all font-semibold cursor-pointer shadow">
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              {/* Grid de Checkboxes Estilizados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2">
                
                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-md ${filtroPrimos ? 'bg-[#240046]/80 border-[#9d4edd] text-white shadow-[#5a189a]/20' : 'bg-[#10071c]/60 border-[#3c096c]/40 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroPrimos} onChange={(e) => setFiltroPrimos(e.target.checked)} className="w-4 h-4 accent-[#9d4edd] rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Números Primos</p>
                      <p className="text-xs text-purple-300/80">Padrão ideal: 4 a 6 primos</p>
                    </div>
                  </div>
                  {filtroPrimos && <CheckCircle2 className="w-4 h-4 text-[#c77dff]" />}
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-md ${filtroMoldura ? 'bg-[#240046]/80 border-[#9d4edd] text-white shadow-[#5a189a]/20' : 'bg-[#10071c]/60 border-[#3c096c]/40 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroMoldura} onChange={(e) => setFiltroMoldura(e.target.checked)} className="w-4 h-4 accent-[#9d4edd] rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Moldura & Miolo</p>
                      <p className="text-xs text-purple-300/80">Padrão ideal: 8 a 10 na borda</p>
                    </div>
                  </div>
                  {filtroMoldura && <CheckCircle2 className="w-4 h-4 text-[#c77dff]" />}
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-md ${filtroSoma ? 'bg-[#240046]/80 border-[#9d4edd] text-white shadow-[#5a189a]/20' : 'bg-[#10071c]/60 border-[#3c096c]/40 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroSoma} onChange={(e) => setFiltroSoma(e.target.checked)} className="w-4 h-4 accent-[#9d4edd] rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Soma Total Equilibrada</p>
                      <p className="text-xs text-purple-300/80">Padrão ideal: 180 a 220</p>
                    </div>
                  </div>
                  {filtroSoma && <CheckCircle2 className="w-4 h-4 text-[#c77dff]" />}
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-md ${filtroImpares ? 'bg-[#240046]/80 border-[#9d4edd] text-white shadow-[#5a189a]/20' : 'bg-[#10071c]/60 border-[#3c096c]/40 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroImpares} onChange={(e) => setFiltroImpares(e.target.checked)} className="w-4 h-4 accent-[#9d4edd] rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Ímpares / Pares</p>
                      <p className="text-xs text-purple-300/80">Padrão ideal: 7 a 9 ímpares</p>
                    </div>
                  </div>
                  {filtroImpares && <CheckCircle2 className="w-4 h-4 text-[#c77dff]" />}
                </label>

              </div>

              {/* Filtro Especial Últimos 2 Concursos */}
              <div className={`mt-3.5 p-4 rounded-xl border transition-all shadow-md ${filtroUltimosDois ? 'bg-[#240046]/80 border-[#9d4edd]' : 'bg-[#10071c]/60 border-[#3c096c]/40'}`}>
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroUltimosDois} onChange={(e) => setFiltroUltimosDois(e.target.checked)} className="w-4 h-4 accent-[#9d4edd] rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold text-white">Análise dos Últimos 2 Concursos Anteriores</p>
                      <p className="text-xs text-purple-300">Filtra repetições e interseções com base nos 2 concursos imediatamente anteriores</p>
                    </div>
                  </div>
                  {filtroUltimosDois && <CheckCircle2 className="w-4 h-4 text-[#c77dff]" />}
                </label>

                {filtroUltimosDois && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#3c096c]">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#e0aaff] mb-1 font-bold">Concurso N-1 (Dezenas)</label>
                      <input 
                        type="text" 
                        value={concursoAnterior1} 
                        onChange={(e) => setConcursoAnterior1(e.target.value)}
                        className="w-full bg-[#10071c] border border-[#5a189a] rounded-lg px-3.5 py-2 text-xs text-purple-200 font-mono focus:outline-none focus:border-[#c77dff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#e0aaff] mb-1 font-bold">Concurso N-2 (Dezenas)</label>
                      <input 
                        type="text" 
                        value={concursoAnterior2} 
                        onChange={(e) => setConcursoAnterior2(e.target.value)}
                        className="w-full bg-[#10071c] border border-[#5a189a] rounded-lg px-3.5 py-2 text-xs text-purple-200 font-mono focus:outline-none focus:border-[#c77dff]"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Botão de Geração Principal */}
            <div className="mt-6">
              <button 
                onClick={handleGerarJogos}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#5a189a] via-[#7b2cbf] to-[#9d4edd] hover:from-[#7b2cbf] hover:to-[#c77dff] text-white font-extrabold py-4 px-6 rounded-xl shadow-xl shadow-[#3c096c]/60 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer border border-[#e0aaff]/30 text-base"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Processando Fechamento...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-[#ff9e00]" />
                    <span>Gerar Jogos Otimizados</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Estatísticas do Fechamento */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1b102f] border border-[#3c096c] p-4 rounded-xl text-center shadow-lg">
              <p className="text-xs text-[#e0aaff] uppercase font-bold tracking-wider">Jogos Gerados</p>
              <p className="text-2xl font-black text-white mt-1">{estatisticas.total}</p>
            </div>
            <div className="bg-[#1b102f] border border-[#3c096c] p-4 rounded-xl text-center shadow-lg">
              <p className="text-xs text-[#e0aaff] uppercase font-bold tracking-wider">Média de Soma</p>
              <p className="text-2xl font-black text-white mt-1">{estatisticas.mediaSoma}</p>
            </div>
            <div className="bg-[#1b102f] border border-[#3c096c] p-4 rounded-xl text-center shadow-lg">
              <p className="text-xs text-[#e0aaff] uppercase font-bold tracking-wider">Média de Primos</p>
              <p className="text-2xl font-black text-white mt-1">{estatisticas.mediaPrimos}</p>
            </div>
            <div className="bg-[#1b102f] border border-[#3c096c] p-4 rounded-xl text-center shadow-lg">
              <p className="text-xs text-[#e0aaff] uppercase font-bold tracking-wider">Média na Moldura</p>
              <p className="text-2xl font-black text-white mt-1">{estatisticas.mediaMoldura}</p>
            </div>
          </div>
        )}

        {/* Tabela de Jogos Gerados com Volantes Estilizados */}
        {jogosGerados.length > 0 && (
          <div className="bg-[#1b102f] border border-[#3c096c] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#3c096c] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-[#c77dff]" />
                  <span>Fechamento Estratégico Gerado</span>
                </h3>
                <p className="text-xs text-purple-300">Dezenas validadas conforme a identidade visual e os filtros selecionados</p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={exportarExcel}
                  className="bg-[#240046] hover:bg-[#3c096c] text-[#e0aaff] border border-[#5a189a] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#4ade80]" />
                  <span>Exportar Excel</span>
                </button>
                <button 
                  onClick={exportarPDF}
                  className="bg-[#240046] hover:bg-[#3c096c] text-[#e0aaff] border border-[#5a189a] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#f87171]" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#10071c] text-[#e0aaff] text-xs uppercase tracking-wider border-b border-[#3c096c]">
                    <th className="py-3.5 px-4 font-bold text-center w-16">#</th>
                    <th className="py-3.5 px-4 font-bold">Dezenas Selecionadas (Volante Lotofácil)</th>
                    <th className="py-3.5 px-4 font-bold text-center">Primos</th>
                    <th className="py-3.5 px-4 font-bold text-center">Moldura</th>
                    <th className="py-3.5 px-4 font-bold text-center">Soma</th>
                    <th className="py-3.5 px-4 font-bold text-center">Ímpares</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3c096c]/40 text-sm">
                  {jogosGerados.map((jogo) => (
                    <tr key={jogo.id} className="hover:bg-[#3c096c]/20 transition-colors">
                      <td className="py-4 px-4 text-center font-mono text-xs text-[#c77dff] font-bold">
                        {String(jogo.id).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {jogo.numeros.map((num, idx) => (
                            <span 
                              key={idx} 
                              className="w-8 h-8 flex items-center justify-center bg-[#10071c] border border-[#5a189a] rounded-lg text-xs font-black text-white shadow-md shadow-[#240046]"
                            >
                              {String(num).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">{jogo.primos}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">{jogo.moldura}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">{jogo.soma}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">{jogo.impares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
