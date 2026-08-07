import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('Aguardando ação.');
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [totalLinhas, setTotalLinhas] = useState(0);

  const lidarComSelecaoArquivo = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setStatus('Lendo dados da planilha...');
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      try {
        const dadosBinarios = new Uint8Array(evento.target.result);
        const livro = XLSX.read(dadosBinarios, { type: 'array' });
        const aba = livro.Sheets['LOTOFÁCIL'] || livro.Sheets[livro.SheetNames[0]];

        if (!aba) {
          setStatus('Erro: A aba de concursos não foi encontrada na planilha.');
          return;
        }

        const jsonLinhas = XLSX.utils.sheet_to_json(aba);
        if (jsonLinhas.length === 0) {
          setStatus('A planilha está vazia.');
          return;
        }

        const formatarBolaStr = (val) => {
          if (!val && val !== 0) return '01';
          const n = parseInt(val, 10);
          return isNaN(n) ? '01' : n <= 9 ? `0${n}` : `${n}`;
        };

        const formatarBolaInt = (val) => {
          if (!val && val !== 0) return 10;
          const n = parseInt(val, 10);
          return isNaN(n) ? 10 : n;
        };

        const formatados = jsonLinhas.map((row) => {
          const buscarChave = (termo) => {
            const alvo = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
            return Object.keys(row).find(k => {
              const chaveNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
              return chaveNorm === alvo;
            });
          };

          return [
            row[buscarChave('Concurso')] || 0,
            row[buscarChave('Data Sorteio')] || null,
            formatarBolaStr(row[buscarChave('Bola1')]),
            formatarBolaStr(row[buscarChave('Bola2')]),
            formatarBolaStr(row[buscarChave('Bola3')]),
            formatarBolaStr(row[buscarChave('Bola4')]),
            formatarBolaStr(row[buscarChave('Bola5')]),
            formatarBolaStr(row[buscarChave('Bola6')]),
            formatarBolaStr(row[buscarChave('Bola7')]),
            formatarBolaStr(row[buscarChave('Bola8')]),
            formatarBolaStr(row[buscarChave('Bola9')]),
            formatarBolaInt(row[buscarChave('Bola10')]),
            formatarBolaInt(row[buscarChave('Bola11')]),
            formatarBolaInt(row[buscarChave('Bola12')]),
            formatarBolaInt(row[buscarChave('Bola13')]),
            formatarBolaInt(row[buscarChave('Bola14')]),
            formatarBolaInt(row[buscarChave('Bola15')]),
            row[buscarChave('Ganhadores 15 acertos')] || 0,
            row[buscarChave('Cidade / UF')] || '',
            row[buscarChave('Rateio 15 acertos')] || 0,
            row[buscarChave('Ganhadores 14 acertos')] || 0,
            row[buscarChave('Rateio 14 acertos')] || 0,
            row[buscarChave('Ganhadores 13 acertos')] || 0,
            row[buscarChave('Rateio 13 acertos')] || 0,
            row[buscarChave('Ganhadores 12 acertos')] || 0,
            row[buscarChave('Rateio 12 acertos')] || 0,
            row[buscarChave('Ganhadores 11 acertos')] || 0,
            row[buscarChave('Rateio 11 acertos')] || 0,
            row[buscarChave('Acumulado 15 acertos')] || 0,
            row[buscarChave('Arrecadacao Total')] || 0,
            row[buscarChave('Estimativa Prêmio')] || 0,
            row[buscarChave('Acumulado sorteio especial Lotofácil da Independência')] || 0,
            row[buscarChave('Observação')] || ''
          ];
        });

        setDadosProcessados(formatados);
        setTotalLinhas(formatados.length);
        setStatus(`Planilha carregada! ${formatados.length} concursos prontos para gravação.`);

      } catch (err) {
        console.error(err);
        setStatus(`Erro ao ler o arquivo: ${err.message}`);
      }
    };
    leitor.readAsArrayBuffer(arquivo);
  };

  const executarSalvarNoBanco = async () => {
    if (dadosProcessados.length === 0) {
      setStatus('Nenhum dado carregado para gravar.');
      return;
    }

    setStatus('Gravando informações no banco de dados...');

    try {
      const resposta = await fetch('/api/importar-sorteios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteios: dadosProcessados })
      });

      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Falha ao gravar no banco.');

      setStatus(`Sucesso absoluto, Mestre! ${resultado.total || totalLinhas} concursos gravados no banco.`);
    } catch (err) {
      console.error(err);
      setStatus(`Erro ao gravar: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '30px', border: '1px solid #444', borderRadius: '10px', maxWidth: '650px', margin: '30px auto', fontFamily: 'sans-serif', backgroundColor: '#18181b', color: '#f4f4f5' }}>
      <h2>⚙️ Painel de Administração - LotoRico</h2>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#27272a', borderRadius: '8px' }}>
        <label htmlFor="input-file-concursos" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>1. Selecionar Planilha:</label>
        <input id="input-file-concursos" type="file" onChange={lidarComSelecaoArquivo} accept=".xlsx" style={{ display: 'none' }} />
        <label htmlFor="input-file-concursos" style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          📂 UPLOAD CONCURSOS
        </label>
      </div>

      {totalLinhas > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#27272a', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', color: '#4ade80', fontWeight: 'bold' }}>{totalLinhas} concursos processados e prontos.</p>
          <button onClick={executarSalvarNoBanco} style={{ width: '100%', padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 GRAVA DADOS
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
        <strong>Status:</strong> <span style={{ color: '#38bdf8' }}>{status}</span>
      </div>
    </div>
  );
}
