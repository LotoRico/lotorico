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
  Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function App() {
  // Configuração dos Jogos
  const [qtdJogos, setQtdJogos] = useState(10);
  const [concursoAlvo, setConcursoAlvo] = useState('');
  
  // Concursos anteriores para a estratégia dos últimos 2 concursos
  const [concursoAnterior1, setConcursoAnterior1] = useState('02, 04, 07, 09, 11, 12, 14, 16, 18, 20, 21, 22, 23, 24, 25');
  const [concursoAnterior2, setConcursoAnterior2] = useState('01, 03, 05, 08, 10, 12, 13, 15, 17, 19, 21, 22, 23, 24, 25');

  // Estados dos Filtros / Estratégias (Checkbox individuais)
  const [filtroPrimos, setFiltroPrimos] = useState(true);
  const [filtroMoldura, setFiltroMoldura] = useState(true);
  const [filtroSoma, setFiltroSoma] = useState(true);
  const [filtroImpares, setFiltroImpares] = useState(true);
  const [filtroUltimosDois, setFiltroUltimosDois] = useState(false);

  // Jogos gerados
  const [jogosGerados, setJogosGerados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);

  // Auxiliares Lotofácil
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

  // Validação estrita de cada estratégia de forma independente
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
    doc.setFillColor(74, 5, 67); // Roxo Lotofácil
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("LOTORICO - Jogos Otimizados para Lotofácil", 14, 16);
    
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
      headStyles: { fillColor: [108, 10, 99] },
      styles: { fontSize: 9, halign: 'center' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    doc.save("lotorico_jogos_otimizados.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header em Roxo Lotofácil */}
      <header className="bg-gradient-to-r from-purple-950 via-purple-900 to-slate-900 border-b border-purple-800/60 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-700 p-2.5 rounded-xl shadow-md shadow-purple-950/50 border border-purple-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-purple-300 via-fuchsia-300 to-white bg-clip-text text-transparent">
                LOTORICO
              </h1>
              <p className="text-xs text-purple-300 font-medium">Inteligência e Geração de Fechamentos para a Lotofácil</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-purple-900/60 px-3.5 py-1.5 rounded-full border border-purple-700/60 text-xs font-semibold text-purple-200 shadow-inner">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Identidade Oficial Lotofácil</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Painel de Controle e Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Configuração Básica */}
          <div className="bg-slate-900 border border-purple-950/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-purple-400 font-bold border-b border-purple-950 pb-2">
                <Settings className="w-5 h-5" />
                <h2>Parâmetros de Geração</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Quantidade de Jogos</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={qtdJogos} 
                    onChange={(e) => setQtdJogos(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-purple-950 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Concurso Alvo (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 3150" 
                    value={concursoAlvo} 
                    onChange={(e) => setConcursoAlvo(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-950 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-purple-950 text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>Cada estratégia abaixo trabalha de forma independente ou combinada conforme a sua seleção.</span>
            </div>
          </div>

          {/* Filtros e Estratégias Modulares */}
          <div className="lg:col-span-2 bg-slate-900 border border-purple-950/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-purple-950 pb-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <Sliders className="w-5 h-5" />
                  <h2>Filtros e Estratégias Modulares</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={marcarTodas} className="text-xs bg-purple-950/80 hover:bg-purple-900 text-purple-200 px-3 py-1 rounded-lg border border-purple-800/60 transition-colors font-medium cursor-pointer">
                    Marcar Todas
                  </button>
                  <button onClick={desmarcarTodas} className="text-xs bg-purple-950/80 hover:bg-purple-900 text-purple-200 px-3 py-1 rounded-lg border border-purple-800/60 transition-colors font-medium cursor-pointer">
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              {/* Grid de Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2">
                
                <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${filtroPrimos ? 'bg-purple-950/30 border-purple-600/50 text-slate-100 shadow-sm shadow-purple-950/50' : 'bg-slate-950/50 border-slate-800 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroPrimos} onChange={(e) => setFiltroPrimos(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Números Primos</p>
                      <p className="text-xs text-slate-400">Padrão ideal: 4 a 6 primos</p>
                    </div>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${filtroMoldura ? 'bg-purple-950/30 border-purple-600/50 text-slate-100 shadow-sm shadow-purple-950/50' : 'bg-slate-950/50 border-slate-800 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroMoldura} onChange={(e) => setFiltroMoldura(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Moldura & Miolo</p>
                      <p className="text-xs text-slate-400">Padrão ideal: 8 a 10 na borda</p>
                    </div>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${filtroSoma ? 'bg-purple-950/30 border-purple-600/50 text-slate-100 shadow-sm shadow-purple-950/50' : 'bg-slate-950/50 border-slate-800 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroSoma} onChange={(e) => setFiltroSoma(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Soma Total Equilibrada</p>
                      <p className="text-xs text-slate-400">Padrão ideal: 180 a 220</p>
                    </div>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${filtroImpares ? 'bg-purple-950/30 border-purple-600/50 text-slate-100 shadow-sm shadow-purple-950/50' : 'bg-slate-950/50 border-slate-800 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroImpares} onChange={(e) => setFiltroImpares(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold">Ímpares / Pares</p>
                      <p className="text-xs text-slate-400">Padrão ideal: 7 a 9 ímpares</p>
                    </div>
                  </div>
                </label>

              </div>

              {/* Novo Filtro de Análise dos Últimos 2 Concursos Anteriores */}
              <div className={`mt-3 p-4 rounded-xl border transition-all ${filtroUltimosDois ? 'bg-purple-950/30 border-purple-600/50 shadow-sm shadow-purple-950/50' : 'bg-slate-950/50 border-slate-800'}`}>
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={filtroUltimosDois} onChange={(e) => setFiltroUltimosDois(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
                    <div>
                      <p className="text-sm font-bold text-slate-100">Análise dos Últimos 2 Concursos Anteriores</p>
                      <p className="text-xs text-slate-400">Filtra repetições e interseções com base nos 2 concursos imediatamente anteriores</p>
                    </div>
                  </div>
                </label>

                {filtroUltimosDois && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-purple-950/80">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-purple-300 mb-1 font-semibold">Concurso N-1 (Dezenas)</label>
                      <input 
                        type="text" 
                        value={concursoAnterior1} 
                        onChange={(e) => setConcursoAnterior1(e.target.value)}
                        className="w-full bg-slate-950 border border-purple-900 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-purple-300 mb-1 font-semibold">Concurso N-2 (Dezenas)</label>
                      <input 
                        type="text" 
                        value={concursoAnterior2} 
                        onChange={(e) => setConcursoAnterior2(e.target.value)}
                        className="w-full bg-slate-950 border border-purple-900 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Botão de Geração */}
            <div className="mt-6">
              <button 
                onClick={handleGerarJogos}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-700 via-fuchsia-700 to-purple-800 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-purple-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer border border-purple-500/30"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processando Fechamento...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-purple-200" />
                    <span>Gerar Jogos Otimizados</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Resumo Estatístico dos Jogos Gerados */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-purple-950 p-4 rounded-xl text-center">
              <p className="text-xs text-purple-300 uppercase font-semibold">Jogos Gerados</p>
              <p className="text-2xl font-black text-purple-400 mt-1">{estatisticas.total}</p>
            </div>
            <div className="bg-slate-900 border border-purple-950 p-4 rounded-xl text-center">
              <p className="text-xs text-purple-300 uppercase font-semibold">Média de Soma</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{estatisticas.mediaSoma}</p>
            </div>
            <div className="bg-slate-900 border border-purple-950 p-4 rounded-xl text-center">
              <p className="text-xs text-purple-300 uppercase font-semibold">Média de Primos</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{estatisticas.mediaPrimos}</p>
            </div>
            <div className="bg-slate-900 border border-purple-950 p-4 rounded-xl text-center">
              <p className="text-xs text-purple-300 uppercase font-semibold">Média na Moldura</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{estatisticas.mediaMoldura}</p>
            </div>
          </div>
        )}

        {/* Listagem de Jogos & Exportação */}
        {jogosGerados.length > 0 && (
          <div className="bg-slate-900 border border-purple-950 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-purple-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span>Fechamento Estratégico Gerado</span>
                </h3>
                <p className="text-xs text-slate-400">Dezenas validadas de acordo com os filtros selecionados</p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={exportarExcel}
                  className="bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </button>
                <button 
                  onClick={exportarPDF}
                  className="bg-fuchsia-950/60 hover:bg-fuchsia-900/80 text-fuchsia-300 border border-fuchsia-800/60 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-purple-300 text-xs uppercase tracking-wider border-b border-purple-950">
                    <th className="py-3 px-4 font-semibold text-center w-16">#</th>
                    <th className="py-3 px-4 font-semibold">Dezenas do Jogo</th>
                    <th className="py-3 px-4 font-semibold text-center">Primos</th>
                    <th className="py-3 px-4 font-semibold text-center">Moldura</th>
                    <th className="py-3 px-4 font-semibold text-center">Soma</th>
                    <th className="py-3 px-4 font-semibold text-center">Ímpares</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/40 text-sm">
                  {jogosGerados.map((jogo) => (
                    <tr key={jogo.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-xs text-purple-400/80 font-bold">
                        {String(jogo.id).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {jogo.numeros.map((num, idx) => (
                            <span 
                              key={idx} 
                              className="w-7 h-7 flex items-center justify-center bg-slate-950 border border-purple-900 rounded-lg text-xs font-bold text-purple-300 shadow-sm"
                            >
                              {String(num).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">{jogo.primos}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">{jogo.moldura}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">{jogo.soma}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">{jogo.impares}</td>
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
