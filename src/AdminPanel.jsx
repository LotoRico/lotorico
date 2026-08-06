import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('Pronto.');
  const [dadosProntos, setDadosProntos] = useState([]);
  const [totalCarregados, setTotalCarregados] = useState(0);

  // 1. Botão para puxar e processar a planilha
  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Processando planilha "LOTOFÁCIL"...');
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

          return {
            concurso: row[findKey('Concurso')] || 0,
            data_sorteio: row[findKey('Data Sorteio')] || null,
            bola01: formatarBolaStr(row[findKey('Bola1')]),
            bola02: formatarBolaStr(row[findKey('Bola2')]),
            bola03: formatarBolaStr(row[findKey('Bola3')]),
            bola04: formatarBolaStr(row[findKey('Bola4')]),
            bola05: formatarBolaStr(row[findKey('Bola5')]),
            bola06: formatarBolaStr(row[findKey('Bola6')]),
            bola07: formatarBolaStr(row[findKey('Bola7')]),
            bola08: formatarBolaStr(row[findKey('Bola8')]),
            bola09: formatarBolaStr(row[findKey('Bola9')]),
            bola10: formatarBolaInt(row[findKey('Bola10')]),
            bola11: formatarBolaInt(row[findKey('Bola11')]),
            bola12: formatarBolaInt(row[findKey('Bola12')]),
            bola13: formatarBolaInt(row[findKey('Bola13')]),
            bola14: formatarBolaInt(row[findKey('Bola14')]),
            bola15: formatarBolaInt(row[findKey('Bola15')]),
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

        setDadosProntos(sorteiosFormatados);
        setTotalCarregados(sorteiosFormatados.length);
        setStatus(`Sucesso! ${sorteiosFormatados.length} concursos lidos. Clique em "Salvar Concursos" para gerar o arquivo SQL.`);

      } catch (error) {
        console.error(error);
        setStatus(`Erro ao processar: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 2. Botão para salvar/gerar o arquivo SQL pronto para o banco
  const salvarNoBanco = () => {
    if (dadosProntos.length === 0) {
      setStatus('Nenhum dado carregado.');
      return;
    }

    setStatus('Gerando arquivo SQL...');

    let sqlStatements = `INSERT INTO sorteios (
      concurso, data_sorteio, bola01, bola02, bola03, bola04, bola05, bola06, bola07, bola08, bola09, 
      bola10, bola11, bola12, bola13, bola14, bola15, ganhadores_15_acertos, cidade_uf, rateio_15_acertos, 
      ganhadores_14_acertos, rateio_14_acertos, ganhadores_13_acertos, rateio_13_acertos, 
      ganhadores_12_acertos, rateio_12_acertos, ganhadores_11_acertos, rateio_11_acertos, 
      acumulado_15_acertos, arrecadacao_total, estimativa_premio, acumulado_especial_independencia, observacao
    ) VALUES\n`;

    const values = dadosProntos.map(s => {
      const dataStr = s.data_sorteio ? `'${s.data_sorteio}'` : 'NULL';
      const cidadeStr = `'${String(s.cidade_uf).replace(/'/g, "''")}'`;
      const obsStr = `'${String(s.observacao).replace(/'/g, "''")}'`;
      return `(${s.concurso}, ${dataStr}, '${s.bola01}', '${s.bola02}', '${s.bola03}', '${s.bola04}', '${s.bola05}', '${s.bola06}', '${s.bola07}', '${s.bola08}', '${s.bola09}', ${s.bola10}, ${s.bola11}, ${s.bola12}, ${s.bola13}, ${s.bola14}, ${s.bola15}, ${s.ganhadores_15_acertos}, ${cidadeStr}, ${s.rateio_15_acertos}, ${s.ganhadores_14_acertos}, ${s.rateio_14_acertos}, ${s.ganhadores_13_acertos}, ${s.rateio_13_acertos}, ${s.ganhadores_12_acertos}, ${s.rateio_12_acertos}, ${s.ganhadores_11_acertos}, ${s.rateio_11_acertos}, ${s.acumulado_15_acertos}, ${s.arrecadacao_total}, ${s.estimativa_premio}, ${s.acumulado_especial_independencia}, ${obsStr})`;
    });

    sqlStatements += values.join(",\n") + "\nON DUPLICATE KEY UPDATE data_sorteio = VALUES(data_sorteio), rateio_15_acertos = VALUES(rateio_15_acertos);";

    const blob = new Blob([sqlStatements], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atualizar_sorteios.sql';
    a.click();
    URL.revokeObjectURL(url);

    setStatus(`Sucesso, Mestre! Arquivo SQL gerado e baixado com ${dadosProntos.length} concursos.`);
  };

  return (
    <div style={{ padding: '30px', border: '1px solid #444', borderRadius: '8px', maxWidth: '650px', margin: '30px auto', fontFamily: 'sans-serif', backgroundColor: '#1e1e1e', color: '#fff' }}>
      <h2>⚙️ Painel do Administrador - LotoRico</h2>
      
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>1. Baixar Concursos (Selecionar Planilha):</label>
        <input type="file" onChange={processarPlanilha} accept=".xlsx" style={{ padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #555', borderRadius: '4px', width: '100%' }} />
      </div>

      {totalCarregados > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={salvarNoBanco}
            style={{ padding: '12px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
          >
            💾 Salvar Concursos ({totalCarregados} prontos)
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #444' }}>
        <strong>Status:</strong> <span style={{ color: '#38bdf8' }}>{status}</span>
      </div>
    </div>
  );
}
