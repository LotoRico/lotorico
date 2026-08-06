const express = require('express');
const db = require('./db'); // Conexão com o MySQL
const app = express();

app.use(express.json({ limit: '50mb' })); // Necessário para aceitar volumes grandes de sorteios

app.post('/api/importar-sorteios', (req, res) => {
    const { sorteios } = req.body;

    if (!sorteios || sorteios.length === 0) {
        return res.status(400).json({ error: 'Nenhum sorteio enviado.' });
    }

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

    db.query(query, [sorteios], (err, results) => {
        if (err) {
            console.error('Erro ao gravar no MySQL:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, affectedRows: results.affectedRows });
    });
});
