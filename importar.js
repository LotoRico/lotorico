const XLSX = require('xlsx');
const db = require('./src/db'); // Aponta para a sua conexão existente
const path = require('path');

// Coloque o nome exato do seu arquivo de planilha aqui
const caminhoPlanilha = path.join(__dirname, 'planilha.xlsx'); // Altere para o nome do seu arquivo Excel

try {
    console.log('Lendo a planilha...');
    const workbook = XLSX.readFile(caminhoPlanilha);
    const worksheet = workbook.Sheets['LOTOFÁCIL'];

    if (!worksheet) {
        console.error('Erro: Aba "LOTOFÁCIL" não encontrada na planilha.');
        process.exit(1);
    }

    const json = XLSX.utils.sheet_to_json(worksheet);

    if (json.length === 0) {
        console.error('A planilha está vazia.');
        process.exit(1);
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

    console.log(`Processados ${sorteiosFormatados.length} registros. Gravando no MySQL...`);

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
        } else {
            console.log(`Sucesso absoluto, Mestre! ${sorteiosFormatados.length} sorteios gravados com sucesso.`);
        }
        process.exit(0);
    });

} catch (error) {
    console.error('Erro crítico ao processar:', error.message);
    process.exit(1);
}
