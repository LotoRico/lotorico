import { useState } from 'react';
import * as XLSX from 'xlsx';
import db from './db';

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

        // Formata dezenas de 1 a 9 com zero à esquerda (string)
        const formatarBolaStr = (valor) => {
          if (!valor && valor !== 0) return '01';
          const num = parseInt(valor, 10);
          if (isNaN(num)) return '01';
          return num <= 9 ? `0${num}` : `${num}`;
        };

        // Formata dezenas de 10 a 15 (inteiro)
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
            // bola01 a bola09 (VARCHAR)
            formatarBolaStr(row[findKey('Bola1')]),
            formatarBolaStr(row[findKey('Bola2')]),
            formatarBolaStr(row[findKey('Bola3')]),
            formatarBolaStr(row[findKey('Bola4')]),
            formatarBolaStr(row[findKey('Bola5')]),
            formatarBolaStr(row[findKey('Bola6')]),
            formatarBolaStr(row[findKey('Bola7')]),
            formatarBolaStr(row[findKey('Bola8')]),
            formatarBolaStr(row[findKey('Bola9')]),
            // bola10 a bola15 (INT)
            formatarBolaInt(row[findKey('Bola10')]),
            formatarBolaInt(row[findKey('Bola11')]),
            formatarBolaInt(row[findKey('Bola12')]),
            formatarBolaInt(row[findKey('Bola13')]),
            formatarBolaInt(row[findKey('Bola14')]),
            formatarBolaInt(row[findKey('Bola15')]),
            // Demais campos da tabela
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
        setStatus(`Lendo ${sorteiosFormatados.length} registros. Gravando no MySQL...`);

        const query = `
          INSERT INTO sorteios (
            concurso, data_sorteio, 
            bola01, bola02, bola03, bola04, bola05, bola06, bola07, bola08, bola09, 
            bola10, bola11, bola12, bola13, bola14, bola15, 
            ganhadores_15_acertos, cidade_uf, rateio_15_acertos, 
            ganhadores_14_acertos, rateio_14_acertos, ganhadores_13_acertos, rateio_13_acertos, 
            ganhadores_12_acertos, rateio_12_acertos, ganhadores_11_acertos, rateio_11_acertos, 
            acumulado_15_acertos, arrecadacao_total, estimativa_premio, 
            acumulado_especial_independencia, observacao
          ) VALUES ? 
          ON DUPLICATE KEY UPDATE 
            data_sorteio = VALUES(data_sorteio),
            rateio_15_acertos = VALUES(rateio_15_acertos);
        `;

        db.query(query, [sorteiosFormatados], (err, results) => {
          if (err) {
            console.error('Erro ao gravar no MySQL:', err);
            setStatus(`Erro no banco: ${err.message}`);
            return;
          }

          setStatus(`Sucesso absoluto, Mestre! ${sorteiosFormatados.length} sorteios importados com sucesso.`);
        });

      } catch (error) {
        console.error(error);
        setStatus(`Erro crítico: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #444', borderRadius: '8px', maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <h2>⚙️ Zona do Administrador - LotoRico</h2>
      <input type="file" onChange={processarPlanilha} accept=".xlsx" />
      <div style={{ marginTop: '10px' }}><strong>Status:</strong> {status}</div>
      {totalCarregados > 0 && <p style={{ color: '#059669' }}>Total processado no arquivo: {totalCarregados} sorteios.</p>}
    </div>
  );
}
