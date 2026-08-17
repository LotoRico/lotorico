const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

module.exports = pool;
