import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  // MARCA DE VERSÃO EXATA PARA VALIDAÇÃO EM TELA
  const VERSAO_BUILD = "Versão Atualizada: 07/08/2026 - 12:15 [BUILD-SEGURA]";

  const [status, setStatus] = useState('Aguardando ação.');
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [totalLinhas, setTotalLinhas] = useState(0);

  const lidarComSelecaoArquivo = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setStatus('Lendo dados da planilha e filtrando (a partir de 2023)...');
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

        const linhasFiltradas = jsonLinhas.filter(row => {
          const buscarChave = (termo) => {
            const alvo = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
            return Object.keys(row).find(k => {
              const chaveNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
              return chaveNorm === alvo;
            });
          };

          const dataSorteio = row[buscarChave('Data Sorteio')];
          if (!dataSorteio) return false;

          let ano = 0;
          if (typeof dataSorteio === 'string') {
            const partes = dataSorteio.split('/');
            if (partes.length === 3) {
              ano = parseInt(partes[2], 10);
            }
          } else if (typeof dataSorteio === 'number') {
            const dataConvertida = XLSX.SSF.parse_date_code(dataSorteio);
            if (dataConvertida) ano = dataConvertida.y;
          }

          return ano >= 2023;
        });

        const formatados = linhasFiltradas.map((row) => {
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
        setStatus(`Filtro aplicado! ${formatados.length} concursos (2023-2026) prontos.`);

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

    setStatus('Gravando concursos no banco de dados (processo seguro)...');

    try {
      const resposta = await fetch('/api/importar-sorteios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteios: dadosProcessados })
      });

      const textoResposta = await resposta.text();
      let resultado;
      try {
        resultado = JSON.parse(textoResposta);
      } catch (e) {
        throw new Error(`Servidor retornou resposta inválida: ${textoResposta || 'Resposta vazia'}`);
      }

      if (!resposta.ok) throw new Error(resultado.erro || 'Falha ao gravar no banco.');

      setStatus(`Sucesso absoluto, Mestre! ${resultado.total || totalLinhas} concursos gravados com sucesso.`);
    } catch (err) {
      console.error(err);
      setStatus(`Erro ao gravar: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '30px', border: '1px solid #444', borderRadius: '10px', maxWidth: '650px', margin: '30px auto', fontFamily: 'sans-serif', backgroundColor: '#18181b', color: '#f4f4f5' }}>
      
      {/* MARCA VISUAL DE VERSÃO NA TELA */}
      <div style={{ marginBottom: '15px', padding: '6px 10px', backgroundColor: '#3f3f46', color: '#facc15', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', textAlign: 'center', letterSpacing: '0.5px' }}>
        ⚡ {VERSAO_BUILD}
      </div>

      <h2>⚙️ Painel de Administração - LotoRico</h2>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#27272a', borderRadius: '8px' }}>
        <label htmlFor="input-file-concursos" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>1. Selecionar Planilha (Filtro 2023+):</label>
        <input id="input-file-concursos" type="file" onChange={lidarComSelecaoArquivo} accept=".xlsx" style={{ display: 'none' }} />
        <label htmlFor="input-file-concursos" style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          📂 UPLOAD CONCURSOS (2023-2026)
        </label>
      </div>

      {totalLinhas > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#27272a', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', color: '#4ade80', fontWeight: 'bold' }}>{totalLinhas} concursos filtrados e prontos.</p>
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
