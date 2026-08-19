// api/_lib/db.js
const mysql = require('mysql2/promise');

console.log('DB Config:', {
  host: process.env.TIDB_HOST || 'FALLBACK_127.0.0.1',
  port: process.env.TIDB_PORT || 'FALLBACK_4000',
  user: process.env.TIDB_USER ? 'SET' : 'NOT_SET',
  password: process.env.TIDB_PASSWORD ? 'SET' : 'NOT_SET',
  database: process.env.TIDB_DATABASE || 'FALLBACK_lotorico'
});

const pool = mysql.createPool({
  host: process.env.TIDB_HOST || '127.0.0.1',
  port: parseInt(process.env.TIDB_PORT || '4000', 10),
  user: process.env.TIDB_USER || 'root',
  password: process.env.TIDB_PASSWORD || '',
  database: process.env.TIDB_DATABASE || 'lotorico',
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = pool;
