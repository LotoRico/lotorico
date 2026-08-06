import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('');
  const [totalCarregados, setTotalCarregados] = useState(0);

  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Processando planilha "LOTOFÁCIL"...');
    const reader = new FileReader();

    reader.onload = async (event) => {
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

        setTotalCarregados(sorteiosFormatados.length);
        setStatus(`Lendo ${sorteiosFormatados.length} registros. Enviando para o servidor...`);

        // Envia os dados processados para a API do back-end
        const response = await fetch('/api/importar-sorteios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sorteios: sorteiosFormatados })
        });

        const resultado = await response.json();

        if (!response.ok) {
          throw new Error(resultado.error || 'Erro ao salvar no servidor');
        }

        setStatus(`Sucesso absoluto, Mestre! ${sorteiosFormatados.length} sorteios importados com sucesso.`);

      } catch (error) {
        console.log(error);
        setStatus(`Erro crítico: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #444', borderRadius: '8px', maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif', backgroundColor: '#1e1e1e', color: '#fff' }}>
      <h2>⚙️ Zona do Administrador - LotoRico</h2>
      <input type="file" onChange={processarPlanilha} accept=".xlsx" style={{ marginTop: '10px' }} />
      <div style={{ marginTop: '15px' }}><strong>Status:</strong> {status}</div>
      {totalCarregados > 0 && <p style={{ color: '#10b981', marginTop: '10px' }}>Total processado no arquivo: {totalCarregados} sorteios.</p>}
    </div>
  );
}
