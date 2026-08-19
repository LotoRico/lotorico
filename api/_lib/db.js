// api/_lib/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2WyAswPCKR5Y5Cx.root',
  password: 'Shx6HnjUAVj1pC41',
  database: 'lotorico',
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = pool;
