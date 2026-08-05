import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, RefreshCw, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Dezenas da Moldura da Lotofácil (borda)
const MOLDURA = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
// Dezenas do Miolo (centro)
const MIOLO = [7, 8, 9, 12, 13, 14, 17, 18, 19];
// Números Primos na Lotofácil (2, 3, 5, 7, 11, 13, 17, 19, 23)
const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23];

export default function App() {
  // Estados das Estratégias (todas marcadas por padrão)
  const [strategies, setStrategies] = useState({
    primos: true,
    molduraMiolo: true,
    somaEquilibrada: true,
    paresImpares: true,
  });

  const [quantidadeJogos, setQuantidadeJogos] = useState(10);
  const [jogosGerados, setJogosGerados] = useState([]);

  // Alternar estratégia individual
  const toggleStrategy = (key) => {
    setStrategies(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Marcar / Desmarcar Todas
  const marcarTodas = (status) => {
    setStrategies({
      primos: status,
      molduraMiolo: status,
      somaEquilibrada: status,
      paresImpares: status,
    });
  };

  // Verificar se todas estão desmarcadas (Modo Surpresinha Puro)
  const isSurpresinha = Object.values(strategies).every(val => !val);

  // Função para gerar uma combinação aleatória de 15 números entre 1 e 25
  const gerarCombinacaoAleatoria = () => {
    const numeros = Array.from({ length: 25 }, (_, i) => i + 1);
    const jogo = [];
    for (let i = 0; i < 15; i++) {
      const index = Math.floor(Math.random() * numeros.length);
      jogo.push(numeros.splice(index, 1)[0]);
    }
    return jogo.sort((a, b) => a - b);
  };

  // Validar se o jogo atende às estratégias selecionadas
  const validarEstrategias = (jogo) => {
    if (isSurpresinha) return true; // Modo Surpresinha aceita qualquer jogo

    const soma = jogo.reduce((acc, val) => acc + val, 0);
    const impares = jogo.filter(n => n % 2 !== 0).length;
    const primosCount = jogo.filter(n => PRIMOS.includes(n)).length;
    const molduraCount = jogo.filter(n => MOLDURA.includes(n)).length;

    // Filtros lógicos configuráveis para o Modo Estratégico
    if (strategies.somaEquilibrada && (soma < 180 || soma > 220)) return false;
    if (strategies.paresImpares && (impares < 7 || impares > 9)) return false;
    if (strategies.primos && (primosCount < 4 || primosCount > 6)) return false;
    if (strategies.molduraMiolo && (molduraCount < 8 || molduraCount > 10)) return false;

    return true;
  };

  // Gerador Principal de Jogos
  const handleGerarJogos = () => {
    const novosJogos = [];
    let tentativas = 0;

    while (novosJogos.length < quantidadeJogos && tentativas < 10000) {
      tentativas++;
      const jogo = gerarCombinacaoAleatoria();
      if (validarEstrategias(jogo)) {
        novosJogos.push(jogo);
      }
    }

    if (novosJogos.length < quantidadeJogos) {
      alert("Aviso: Os filtros estão muito restritivos. Alguns jogos não puderam ser gerados com exatidão, geramos o máximo possível!");
    }

    setJogosGerados(novosJogos);
  };

  // Calcular estatísticas de um jogo específico
  const calcularEstatisticas = (jogo) => {
    const soma = jogo.reduce((acc, val) => acc + val, 0);
    const impares = jogo.filter(n => n % 2 !== 0).length;
    const pares = 15 - impares;
    const primos = jogo.filter(n => PRIMOS.includes(n)).length;
    const moldura = jogo.filter(n => MOLDURA.includes(n)).length;
    const miolo = 15 - moldura;

    return { soma, impares, pares, primos, moldura, miolo };
  };

  // Exportar para Excel (.xlsx)
  const exportarExcel = () => {
    if (jogosGerados.length === 0) return alert("Gere os jogos primeiro!");

    const dadosExportacao = jogosGerados.map((jogo, index) => {
      const stats = calcularEstatisticas(jogo);
      const linha = { Jogo: `J${String(index + 1).padStart(2, '0')}` };
      for (let i = 1; i <= 25; i++) {
        linha[`Dez ${i}`] = jogo.includes(i) ? 'X' : '';
      }
      linha['Soma'] = stats.soma;
      linha['Ímpares'] = stats.impares;
      linha['Pares'] = stats.pares;
      linha['Primos'] = stats.primos;
      linha['Moldura'] = stats.moldura;
      linha['Miolo'] = stats.miolo;
      return linha;
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matriz LotoRico");
    XLSX.writeFile(workbook, "lotorico_jogos.xlsx");
  };

  // Exportar para PDF
  const exportarPDF = () => {
    if (jogosGerados.length === 0) return alert("Gere os jogos primeiro!");

    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("LotoRico - Matriz Inteligente de Jogos", 14, 20);
    
    const tableColumn = ["Jogo", ...Array.from({ length: 25 }, (_, i) => `${i + 1}`), "Soma", "Ímp", "Par", "Prim", "Mold", "Miol"];
    const tableRows = jogosGerados.map((jogo, index) => {
      const stats = calcularEstatisticas(jogo);
      const dezenasFormatadas = Array.from({ length: 25 }, (_, i) => jogo.includes(i + 1) ? 'X' : '');
      return [
        `J${String(index + 1).padStart(2, '0')}`,
        ...dezenasFormatadas,
        stats.soma,
        stats.impares,
        stats.pares,
        stats.primos,
        stats.moldura,
        stats.miolo
      ];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [22, 101, 52] }
    });

    doc.save("lotorico_jogos.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <div>
            <h1 className="text-3xl font-black text-emerald-400 tracking-wider">LOTORICO</h1>
            <p className="text-sm text-slate-400">Inteligência e Geração de Jogos para a Lotofácil</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${isSurpresinha ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isSurpresinha ? '⚡ Modo Surpresinha Puro' : '🎯 Modo Estratégico Ativo'}
            </span>
          </div>
        </header>

        {/* Controles e Estratégias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          
          {/* Seletor de Estratégias */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-200">Filtros e Estratégias de Seleção</h2>
              <div className="space-x-2">
                <button onClick={() => marcarTodas(true)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-emerald-400 transition">Marcar Todas</button>
                <button onClick={() => marcarTodas(false)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-rose-400 transition">Desmarcar Todas</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:border-slate-600">
                <input type="checkbox" checked={strategies.primos} onChange={() => toggleStrategy('primos')} className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500" />
                <span className="text-sm font-medium">Números Primos (4 a 6 por jogo)</span>
              </label>

              <label className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:border-slate-600">
                <input type="checkbox" checked={strategies.molduraMiolo} onChange={() => toggleStrategy('molduraMiolo')} className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500" />
                <span className="text-sm font-medium">Moldura & Miolo (8 a 10 na borda)</span>
              </label>

              <label className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:border-slate-600">
                <input type="checkbox" checked={strategies.somaEquilibrada} onChange={() => toggleStrategy('somaEquilibrada')} className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500" />
                <span className="text-sm font-medium">Soma Total Equilibrada (180 a 220)</span>
              </label>

              <label className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:border-slate-600">
                <input type="checkbox" checked={strategies.paresImpares} onChange={() => toggleStrategy('paresImpares')} className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500" />
                <span className="text-sm font-medium">Ímpares / Pares (7 a 9 ímpares)</span>
              </label>
            </div>
          </div>

          {/* Painel de Ações e Quantidade */}
          <div className="flex flex-col justify-between space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade de Jogos</label>
              <input 
                type="number" 
                min="1" 
                max="50" 
                value={quantidadeJogos} 
                onChange={(e) => setQuantidadeJogos(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button 
              onClick={handleGerarJogos}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <RefreshCw className="w-5 h-5" /> Gerar Jogos
            </button>
          </div>

        </div>

        {/* Matriz e Estatísticas em Tela */}
        {jogosGerados.length > 0 && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-slate-200">Matriz de Jogos e Estatísticas</h2>
              <div className="flex gap-3">
                <button onClick={exportarExcel} className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <FileSpreadsheet className="w-4 h-4" /> Exportar Excel (.xlsx)
                </button>
                <button onClick={exportarPDF} className="bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <FileText className="w-4 h-4" /> Exportar PDF
                </button>
              </div>
            </div>

            {/* Tabela Matricial */}
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-700">
                    <th className="p-2.5 border-r border-slate-700 font-bold sticky left-0 bg-slate-900 z-10">Dez</th>
                    {jogosGerados.map((_, i) => (
                      <th key={i} className="p-2.5 border-r border-slate-700 font-mono">J{String(i + 1).padStart(2, '0')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((dezena) => (
                    <tr key={dezena} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-2.5 border-r border-slate-700 font-bold bg-slate-900/80 sticky left-0">{String(dezena).padStart(2, '0')}</td>
                      {jogosGerados.map((jogo, jIndex) => {
                        const presente = jogo.includes(dezena);
                        return (
                          <td key={jIndex} className={`p-2.5 border-r border-slate-700/50 ${presente ? 'bg-emerald-950/60 text-emerald-400 font-bold' : 'text-slate-600'}`}>
                            {presente ? 'X' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* Rodapé Estatístico */}
                <tfoot>
                  {['Soma', 'Ímpares', 'Pares', 'Primos', 'Moldura', 'Miolo'].map((statName, sIdx) => (
                    <tr key={statName} className="bg-slate-900/90 font-semibold border-t border-slate-700">
                      <td className="p-2.5 border-r border-slate-700 text-slate-300 sticky left-0 bg-slate-900 z-10">{statName}</td>
                      {jogosGerados.map((jogo, jIndex) => {
                        const stats = calcularEstatisticas(jogo);
                        const valores = [stats.soma, stats.impares, stats.pares, stats.primos, stats.moldura, stats.miolo];
                        return (
                          <td key={jIndex} className="p-2.5 border-r border-slate-700 font-mono text-emerald-300">
                            {valores[sIdx]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
