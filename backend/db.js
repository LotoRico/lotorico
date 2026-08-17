const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.MYSQL_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
