// api/_lib/db.js

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT || 4000,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: true }
});

/**
 * Cache em memória das configurações de loteria.
 * Evita uma query no banco a cada requisição de endpoint.
 */
let cacheLoterias = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Retorna a configuração de uma loteria pelo slug.
 * @param {string} slug - ex: 'lotofacil', 'mega-sena'
 * @returns {Promise<object|null>} Configuração da loteria ou null se não encontrada
 */
async function obterConfigLoteria(slug) {
  const agora = Date.now();

  if (!cacheLoterias || (agora - cacheTimestamp) > CACHE_TTL) {
    const [rows] = await pool.execute('SELECT * FROM loterias WHERE ativo = TRUE');
    cacheLoterias = rows;
    cacheTimestamp = agora;
  }

  return cacheLoterias.find(l => l.slug === slug) || null;
}

/**
 * Retorna todas as loterias ativas.
 * @returns {Promise<array>}
 */
async function listarLoterias() {
  const agora = Date.now();

  if (!cacheLoterias || (agora - cacheTimestamp) > CACHE_TTL) {
    const [rows] = await pool.execute('SELECT * FROM loterias WHERE ativo = TRUE');
    cacheLoterias = rows;
    cacheTimestamp = agora;
  }

  return cacheLoterias;
}

module.exports = { pool, obterConfigLoteria, listarLoterias };
