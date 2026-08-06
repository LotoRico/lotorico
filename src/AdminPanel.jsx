import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [status, setStatus] = useState('');

  const processarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Lendo arquivo, aguarde...');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        console.log("Dados lidos:", json);
        setStatus(`Sucesso, Mestre! ${json.length} sorteios encontrados no arquivo e prontos para o banco.`);
      } catch (error) {
        setStatus('Erro ao ler a planilha. O arquivo pode estar corrompido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #444', borderRadius: '8px', maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <h2>⚙️ Zona do Administrador - LotoRico</h2>
      <p>Faça o upload da planilha da Caixa aqui para atualizar o sistema:</p>
      <input type="file" onChange={processarPlanilha} accept=".xlsx, .xls, .csv" style={{ marginBottom: '15px' }} />
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}
