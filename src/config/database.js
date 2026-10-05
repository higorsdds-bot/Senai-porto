const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: process.env.DB_USERNAME || 'CCSuEEwdFTc6swY.root',
  password: process.env.DB_PASSWORD || 'ID8DWpL0AghkR1Q0',
  database: process.env.DB_DATABASE || 'secult_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  charset: 'utf8mb4'
};

if (process.env.DB_SSL === 'true' || !process.env.DB_SSL) {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  };
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

async function testConnection() {
  try {
    const p = getPool();
    const conn = await p.getConnection();
    console.log(`[DATABASE] Conexão estabelecida com sucesso no banco: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
    conn.release();
    return true;
  } catch (err) {
    console.error(`[DATABASE ERROR] Falha ao conectar ao banco de dados:`, err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error(`[DATABASE NOTE] Timeout de conexão. Verifique se o IP público atual está liberado na lista de acessos do TiDB Cloud (IP Access List / Traffic Filter).`);
    }
    return false;
  }
}

module.exports = {
  getPool,
  testConnection,
  dbConfig
};
