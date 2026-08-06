const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'lotorico2026',
    database: 'loto_sistema'
});

connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.message);
        return;
    }
    console.log('Conectado com sucesso ao banco loto_sistema, Mestre!');
});

module.exports = connection;
