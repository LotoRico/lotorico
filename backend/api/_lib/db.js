// backend/api/_lib/db.js
const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: parseInt(process.env.TIDB_PORT || '4000', 10),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        minTLSVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '-03:00',
    });
  }
  return pool;
}

// Exporta o POOL DIRETAMENTE (compatível com pool.query / pool.execute)
module.exports = getPool();
