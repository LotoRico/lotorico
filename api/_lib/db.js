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
 * Whitelist de tabelas por slug de loteria.
 * Previne SQL injection — nenhum input do usuário vai direto para nome de tabela.
 */
const TABELAS_ESPEC = {
  'lotofacil': 'lotofacil_espec'
};

const TABELAS_RESULTADOS = {
  'lotofacil': 'lotofacil_resultados'
};

/**
 * Retorna o nome da tabela de especificações de uma loteria.
 * @param {string} slug - ex: 'lotofacil'
 * @returns {string|null} Nome da tabela ou null se não existir
 */
function obterTabelaEspec(slug) {
  return TABELAS_ESPEC[slug] || null;
}

/**
 * Retorna o nome da tabela de resultados de uma loteria.
 * @param {string} slug - ex: 'lotofacil'
 * @returns {string|null} Nome da tabela ou null se não existir
 */
function obterTabelaResultados(slug) {
  return TABELAS_RESULTADOS[slug] || null;
}

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
    const tabela = obterTabelaEspec(slug);
    if (!tabela) return null;
    const [rows] = await pool.query(`SELECT * FROM ${tabela} WHERE ativo = TRUE`);
    cacheLoterias = rows;
    cacheTimestamp = agora;
  }
  return cacheLoterias.find(l => l.slug === slug) || cacheLoterias[0] || null;
}

/**
 * Retorna todas as loterias ativas.
 * @returns {Promise<array>}
 */
async function listarLoterias() {
  const agora = Date.now();
  if (!cacheLoterias || (agora - cacheTimestamp) > CACHE_TTL) {
    const [rows] = await pool.query(`SELECT * FROM lotofacil_espec WHERE ativo = TRUE`);
    cacheLoterias = rows;
    cacheTimestamp = agora;
  }
  return cacheLoterias;
}

module.exports = {
  pool,
  obterConfigLoteria,
  obterTabelaEspec,
  obterTabelaResultados,
  listarLoterias
};
