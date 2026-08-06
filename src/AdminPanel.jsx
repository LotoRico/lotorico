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

        // Mapeia cada linha buscando flexibilidade nos nomes das colunas da Caixa
        const sorteiosFormatados = json.map((row) => {
          const getVal = (possiveisNomes) => {
            const chaveEncontrada = Object.keys(row).find(k => {
              const normalizadaK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
              return possiveisNomes.some(p => normalizadaK.includes(p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()));
            });
            return chaveEncontrada ? row[chaveEncontrada] : null;
          };

          return {
            concurso: getVal(['concurso']),
            data_sorteio: getVal(['data sorteio', 'data']),
            bola_1: getVal(['bola 1', 'bola1']),
            bola_2: getVal(['bola 2', 'bola2']),
            bola_3: getVal(['bola 3', 'bola3']),
            bola_4: getVal(['bola 4', 'bola4']),
            bola_5: getVal(['bola 5', 'bola5']),
            bola_6: getVal(['bola 6', 'bola6']),
            bola_7: getVal(['bola 7', 'bola7']),
            bola_8: getVal(['bola 8', 'bola8']),
            bola_9: getVal(['bola 9', 'bola9']),
            bola_10: getVal(['bola 10', 'bola10']),
            bola_11: getVal(['bola 11', 'bola11']),
            bola_12: getVal(['bola 12', 'bola12']),
            bola_13: getVal(['bola 13', 'bola13']),
            bola_14: getVal(['bola 14', 'bola14']),
            bola_15: getVal(['bola 15', 'bola15']),
            ganhadores_15_acertos: getVal(['ganhadores 15']) || 0,
            cidade_uf: getVal(['cidade', 'uf']) || '',
            rateio_15_acertos: getVal(['rateio 15']) || 0,
            ganhadores_14_acertos: getVal(['ganhadores 14']) || 0,
            rateio_14_acertos: getVal(['rateio 14']) || 0,
            ganhadores_13_acertos: getVal(['ganhadores 13']) || 0,
            rateio_13_acertos: getVal(['rateio 13']) || 0,
            ganhadores_12_acertos: getVal(['ganhadores 12']) || 0,
            rateio_12_acertos: getVal(['rateio 12']) || 0,
            ganhadores_11_acertos: getVal(['ganhadores 11']) || 0,
            rateio_11_acertos: getVal(['rateio 11']) || 0,
            acumulado_15_acertos: getVal(['acumulado 15']) || 0,
            arrecadacao_total: getVal(['arrecadacao']) || 0,
            estimativa_premio: getVal(['estimativa']) || 0,
            acumulado_especial_independencia: getVal(['independencia']) || 0,
            observacao: getVal(['observacao']) || ''
          };
        });

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
