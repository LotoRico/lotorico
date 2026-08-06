import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('Pronto para iniciar.');
  const [dadosProntos, setDadosProntos] = useState([]);
  const [totalCarregados, setTotalCarregados] = useState(0);

  // 1º Botão: Baixar / Ler os dados da planilha
  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Lendo e processando os concursos...');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets['LOTOFÁCIL'];
        
        if (!worksheet) {
          setStatus('Erro: Aba "LOTOFÁCIL" não encontrada na planilha.');
          return;
        }

        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setStatus('A planilha está vazia.');
          return;
        }

        const formatarBolaStr = (valor) => {
          if (!valor && valor !== 0) return '01';
          const num = parseInt(valor, 10);
          if (isNaN(num)) return '01';
          return num <= 9 ? `0${num}` : `${num}`;
        };

        const formatarBolaInt = (valor) => {
          if (!valor && valor !== 0) return 10;
          const num = parseInt(valor, 10);
          return isNaN(num) ? 10 : num;
        };

        const sorteiosFormatados = json.map((row) => {
          const findKey = (name) => {
            const normalizedTarget = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
            return Object.keys(row).find(k => {
              const normalizedKey = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
              return normalizedKey === normalizedTarget;
            });
          };

          return [
            row[findKey('Concurso')] || 0,
            row[findKey('Data Sorteio')] || null,
            formatarBolaStr(row[findKey('Bola1')]),
            formatarBolaStr(row[findKey('Bola2')]),
            formatarBolaStr(row[findKey('Bola3')]),
            formatarBolaStr(row[findKey('Bola4')]),
            formatarBolaStr(row[findKey('Bola5')]),
            formatarBolaStr(row[findKey('Bola6')]),
            formatarBolaStr(row[findKey('Bola7')]),
            formatarBolaStr(row[findKey('Bola8')]),
            formatarBolaStr(row[findKey('Bola9')]),
            formatarBolaInt(row[findKey('Bola10')]),
            formatarBolaInt(row[findKey('Bola11')]),
            formatarBolaInt(row[findKey('Bola12')]),
            formatarBolaInt(row[findKey('Bola13')]),
            formatarBolaInt(row[findKey('Bola14')]),
            formatarBolaInt(row[findKey('Bola15')]),
            row[findKey('Ganhadores 15 acertos')] || 0,
            row[findKey('Cidade / UF')] || '',
            row[findKey('Rateio 15 acertos')] || 0,
            row[findKey('Ganhadores 14 acertos')] || 0,
            row[findKey('Rateio 14 acertos')] || 0,
            row[findKey('Ganhadores 13 acertos')] || 0,
            row[findKey('Rateio 13 acertos')] || 0,
            row[findKey('Ganhadores 12 acertos')] || 0,
            row[findKey('Rateio 12 acertos')] || 0,
            row[findKey('Ganhadores 11 acertos')] || 0,
            row[findKey('Rateio 11 acertos')] || 0,
            row[findKey('Acumulado 15 acertos')] || 0,
            row[findKey('Arrecadacao Total')] || 0,
            row[findKey('Estimativa Prêmio')] || 0,
            row[findKey('Acumulado sorteio especial Lotofácil da Independência')] || 0,
            row[findKey('Observação')] || ''
          ];
        });

        setDadosProntos(sorteiosFormatados);
        setTotalCarregados(sorteiosFormatados.length);
        setStatus(`Sucesso! ${sorteiosFormatados.length} concursos carregados. Pronto para salvar.`);

      } catch (error) {
        console.error(error);
        setStatus(`Erro ao ler planilha: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 2º Botão: Salvar Concursos no banco de dados
  const salvarNoBanco = async () => {
    if (dadosProntos.length === 0) {
      setStatus('Nenhum concurso carregado para salvar.');
      return;
    }

    setStatus('Gravando concursos no banco de dados...');

    try {
      const response = await fetch('http://localhost:3001/api/importar-sorteios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteios: dadosProntos })
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.erro || 'Erro ao comunicar com o servidor.');
      }

      setStatus(`Sucesso absoluto, Mestre! ${resultado.total} concursos gravados no MySQL.`);

    } catch (error) {
      console.error(error);
      setStatus(`Erro ao salvar no banco: ${error.message}. Verifique se a API local está ativa.`);
    }
  };

  return (
    <div style={{ padding: '30px', border: '1px solid #444', borderRadius: '8px', maxWidth: '650px', margin: '30px auto', fontFamily: 'sans-serif', backgroundColor: '#1e1e1e', color: '#fff' }}>
      <h2>⚙️ Painel do Administrador - LotoRico</h2>
      
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>1. Selecionar Planilha (Baixar Concursos):</label>
        <input type="file" onChange={processarPlanilha} accept=".xlsx" style={{ padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #555', borderRadius: '4px', width: '100%' }} />
      </div>

      {totalCarregados > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={salvarNoBanco}
            style={{ padding: '12px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
          >
            💾 Salvar Concursos no Banco de Dados ({totalCarregados} prontos)
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #444' }}>
        <strong>Status do Sistema:</strong> <span style={{ color: '#38bdf8' }}>{status}</span>
      </div>
    </div>
  );
}
