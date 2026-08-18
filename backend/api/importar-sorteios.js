// ===== NOVO PARSER ROBUSTO =====
function parsePlanilhaCaixa(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 1 = lê tudo como array de arrays, IGNORANDO formatação
  // blankrows: false = remove linhas totalmente vazias
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

  // Procura a linha de cabeçalho (contém "Concurso") nas primeiras 10 linhas
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase().trim());
    if (rowStr.some(c => c.includes('concurso'))) {
      headerRowIndex = i;
      headers = row.map(c => String(c || '').trim());
      break;
    }
  }

  // Fallback: se não achou "Concurso", assume linha 0
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headers = rawRows[0] ? rawRows[0].map(c => String(c || '').trim()) : [];
  }

  // Mapa: nome da coluna → índice
  const colMap = {};
  headers.forEach((h, idx) => {
    if (h) colMap[h.toLowerCase().trim()] = idx;
  });

  // Busca valor por nomes alternativos de coluna
  function getVal(row, names) {
    for (const name of names) {
      const key = name.toLowerCase().trim();
      if (colMap[key] !== undefined && row[colMap[key]] !== null && row[colMap[key]] !== undefined) {
        return row[colMap[key]];
      }
    }
    return null;
  }

  // Parseia linhas de dados (após cabeçalho)
  const values = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;

    const concurso = parseIntOrNull(getVal(row, ['Concurso']));
    if (concurso === null) continue; // pula linhas sem concurso válido

    values.push([
      concurso,
      parseDate(getVal(row, ['Data Sorteio'])),
      parseIntOrNull(getVal(row, ['Bola1'])),
      parseIntOrNull(getVal(row, ['Bola2'])),
      parseIntOrNull(getVal(row, ['Bola3'])),
      parseIntOrNull(getVal(row, ['Bola4'])),
      parseIntOrNull(getVal(row, ['Bola5'])),
      parseIntOrNull(getVal(row, ['Bola6'])),
      parseIntOrNull(getVal(row, ['Bola7'])),
      parseIntOrNull(getVal(row, ['Bola8'])),
      parseIntOrNull(getVal(row, ['Bola9'])),
      parseIntOrNull(getVal(row, ['Bola10'])),
      parseIntOrNull(getVal(row, ['Bola11'])),
      parseIntOrNull(getVal(row, ['Bola12'])),
      parseIntOrNull(getVal(row, ['Bola13'])),
      parseIntOrNull(getVal(row, ['Bola14'])),
      parseIntOrNull(getVal(row, ['Bola15'])),
      parseIntOrNull(getVal(row, ['Ganhadores 15 acertos'])),
      getVal(row, ['Cidade / UF']),
      parseNum(getVal(row, ['Rateio 15 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 14 acertos'])),
      parseNum(getVal(row, ['Rateio 14 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 13 acertos'])),
      parseNum(getVal(row, ['Rateio 13 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 12 acertos'])),
      parseNum(getVal(row, ['Rateio 12 acertos'])),
      parseIntOrNull(getVal(row, ['Ganhadores 11 acertos'])),
      parseNum(getVal(row, ['Rateio 11 acertos'])),
      parseNum(getVal(row, ['Acumulado 15 acertos'])),
      parseNum(getVal(row, ['Arrecadacao Total'])),
      parseNum(getVal(row, ['Estimativa Prêmio', 'Estimativa Premio'])),
      parseNum(getVal(row, [
        'Acumulado sorteio especial Lotofácil da Independência',
        'Acumulado sorteio especial Lotofacil da Independencia'
      ])),
      getVal(row, ['Observação'])
    ]);
  }

  return values;
}
