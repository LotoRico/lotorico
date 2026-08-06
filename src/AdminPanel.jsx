import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('');
  const [totalCarregados, setTotalCarregados] = useState(0);

  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Processando planilha, aguarde...');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (json.length === 0) {
          setStatus('A planilha está vazia.');
          return;
        }

        const sorteiosFormatados = json.map((row) => {
          const findKey = (name) => {
            const normalizedTarget = name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '');

            return Object.keys(row).find(k => {
              const normalizedKey = k
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '');
              return normalizedKey === normalizedTarget;
            });
          };

          return {
            concurso: row[findKey('Concurso')],
            data_sorteio: row[findKey('Data Sorteio')],
            bola_1: row[findKey('Bola1')],
            bola_2: row[findKey('Bola2')],
            bola_3: row[findKey('Bola3')],
            bola_4: row[findKey('Bola4')],
            bola_5: row[findKey('Bola5')],
            bola_6: row[findKey('Bola6')],
            bola_7: row[findKey('Bola7')],
            bola_8: row[findKey('Bola8')],
            bola_9: row[findKey('Bola9')],
            bola_10: row[findKey('Bola10')],
            bola_11: row[findKey('Bola11')],
            bola_12: row[findKey('Bola12')],
            bola_13: row[findKey('Bola13')],
            bola_14: row[findKey('Bola14')],
            bola_15: row[findKey('Bola15')],
            ganhadores_15_acertos: row[findKey('Ganhadores 15 acertos')] || 0,
            cidade_uf: row[findKey('Cidade / UF')] || '',
            rateio_15_acertos: row[findKey('Rateio 15 acertos')] || 0,
            ganhadores_14_acertos: row[findKey('Ganhadores 14 acertos')] || 0,
            rateio_14_acertos: row[findKey('Rateio 14 acertos')] || 0,
            ganhadores_13_acertos: row[findKey('Ganhadores 13 acertos')] || 0,
            rateio_13_acertos: row[findKey('Rateio 13 acertos')] || 0,
            ganhadores_12_acertos: row[findKey('Ganhadores 12 acertos')] || 0,
            rateio_12_acertos: row[findKey('Rateio 12 acertos')] || 0,
            ganhadores_11_acertos: row[findKey('Ganhadores 11 acertos')] || 0,
            rateio_11_acertos: row[findKey('Rateio 11 acertos')] || 0,
            acumulado_15_acertos: row[findKey('Acumulado 15 acertos')] || 0,
            arrecadacao_total: row[findKey('Arrecadacao Total')] || 0,
            estimativa_premio: row[findKey('Estimativa Prêmio')] || 0,
            acumulado_especial_independencia: row[findKey('Acumulado sorteio especial Lotofácil da Independência')] || 0,
            observacao: row[findKey('Observação')] || ''
          };
        });

        if (!sorteiosFormatados[0].concurso) {
          setStatus('Erro: O cabeçalho não bateu. Verifique se os nomes das colunas estão corretos.');
          return;
        }

        setTotalCarregados(sorteiosFormatados.length);

        const response = await fetch('/api/importar-sorteios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sorteios: sorteiosFormatados })
        });

        if (response.ok) {
          setStatus(`Sucesso, Mestre! ${sorteiosFormatados.length} registros gravados.`);
        } else {
          setStatus('Erro ao comunicar com o servidor.');
        }

      } catch (error) {
        setStatus('Erro crítico na leitura do arquivo.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #444', borderRadius: '8px', maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <h2>⚙️ Zona do Administrador - LotoRico</h2>
      <input type="file" onChange={processarPlanilha} accept=".xlsx, .xls" />
      <div style={{ marginTop: '10px' }}><strong>Status:</strong> {status}</div>
      {totalCarregados > 0 && <p style={{ color: '#059669' }}>Total: {totalCarregados} sorteios processados.</p>}
    </div>
  );
}
