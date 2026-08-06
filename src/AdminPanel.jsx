import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('');
  const [totalCarregados, setTotalCarregados] = useState(0);

  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Lendo arquivo e enviando para o banco, aguarde...');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte a planilha em JSON usando os cabeçalhos da primeira linha
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setStatus('A planilha parece estar vazia ou fora do padrão.');
          return;
        }

        // Mapeia cada linha da planilha para o formato exato das colunas do nosso MySQL
        const sorteiosFormatados = json.map((row) => ({
          concurso: row['Concurso'] || row['concurso'],
          data_sorteio: row['Data Sorteio'] || row['data_sorteio'],
          bola_1: row['Bola1'],
          bola_2: row['Bola2'],
          bola_3: row['Bola3'],
          bola_4: row['Bola4'],
          bola_5: row['Bola5'],
          bola_6: row['Bola6'],
          bola_7: row['Bola7'],
          bola_8: row['Bola8'],
          bola_9: row['Bola9'],
          bola_10: row['Bola10'],
          bola_11: row['Bola11'],
          bola_12: row['Bola12'],
          bola_13: row['Bola13'],
          bola_14: row['Bola14'],
          bola_15: row['Bola15'],
          ganhadores_15_acertos: row['Ganhadores 15 acertos'] || 0,
          cidade_uf: row['Cidade / UF'] || '',
          rateio_15_acertos: row['Rateio 15 acertos'] || 0,
          ganhadores_14_acertos: row['Ganhadores 14 acertos'] || 0,
          rateio_14_acertos: row['Rateio 14 acertos'] || 0,
          ganhadores_13_acertos: row['Ganhadores 13 acertos'] || 0,
          rateio_13_acertos: row['Rateio 13 acertos'] || 0,
          ganhadores_12_acertos: row['Ganhadores 12 acertos'] || 0,
          rateio_12_acertos: row['Rateio 12 acertos'] || 0,
          ganhadores_11_acertos: row['Ganhadores 11 acertos'] || 0,
          rateio_11_acertos: row['Rateio 11 acertos'] || 0,
          acumulado_15_acertos: row['Acumulado 15 acertos'] || 0,
          arrecadacao_total: row['Arrecadacao Total'] || 0,
          estimativa_premio: row['Estimativa Prêmio'] || 0,
          acumulado_especial_independencia: row['Acumulado sorteio especial Lotofácil da Independência'] || 0,
          observacao: row['Observação'] || ''
        }));

        setTotalCarregados(sorteiosFormatados.length);

        // Dispara os dados mapeados para a rota do backend salvar no MySQL
        const response = await fetch('/api/importar-sorteios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sorteios: sorteiosFormatados })
        });

        const resultado = await response.json();

        if (response.ok) {
          setStatus(`Sucesso, Mestre! ${sorteiosFormatados.length} sorteios processados e gravados no MySQL com sucesso.`);
        } else {
          setStatus('Erro ao salvar no banco: ' + (resultado.erro || 'Erro desconhecido'));
        }

      } catch (error) {
        console.error(error);
        setStatus('Erro ao processar ou enviar a planilha. Verifique a conexão com o servidor.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #444', borderRadius: '8px', maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif', backgroundColor: '#fff' }}>
      <h2>⚙️ Zona do Administrador - LotoRico</h2>
      <p>Faça o upload da planilha oficial da Caixa para atualizar a tabela SORTEIOS:</p>
      
      <input 
        type="file" 
        onChange={processarPlanilha} 
        accept=".xlsx, .xls, .csv" 
        style={{ marginBottom: '15px', padding: '10px', border: '1px dashed #ccc', width: '100%', boxSizing: 'border-box' }} 
      />
      
      <div style={{ padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '14px' }}>
        <strong>Status:</strong> {status || 'Aguardando arquivo...'}
        {totalCarregados > 0 && <div style={{ marginTop: '5px', color: '#059669', fontWeight: 'bold' }}>Total mapeado: {totalCarregados} registros</div>}
      </div>
    </div>
  );
}
