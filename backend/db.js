const mysql = require('mysql2/promise');

const url = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
  host: url.hostname,
  port: url.port,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
