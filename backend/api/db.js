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

async function query(sql, params = []) {
  const conn = getPool();
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function execute(sql, params = []) {
  const conn = getPool();
  const [result] = await conn.execute(sql, params);
  return result;
}

async function transaction(callback) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, query, execute, transaction };
