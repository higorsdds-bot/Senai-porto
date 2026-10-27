const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: process.env.DB_USERNAME || 'CCSuEEwdFTc6swY.root',
  password: process.env.DB_PASSWORD || 'ID8DWpL0AghkR1Q0',
  database: process.env.DB_DATABASE || 'secult_db',
  waitForConnections: true,
  connectionLimit: 40,
  maxIdle: 20,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
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

async function initSchemaExtensions() {
  try {
    const p = getPool();
    // 1. Garantir que o ENUM de status em usuarios suporte AGUARDANDO_ATIVACAO e REJEITADO
    await p.query(`
      ALTER TABLE usuarios 
      MODIFY COLUMN status ENUM('ATIVO','INATIVO','BLOQUEADO','PENDENTE','AGUARDANDO_ATIVACAO','REJEITADO') NOT NULL DEFAULT 'PENDENTE'
    `).catch(() => {});

    // 2. Garantir que a tabela tokens_ativacao exista
    await p.query(`
      CREATE TABLE IF NOT EXISTS tokens_ativacao (
        id            BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id    BIGINT NOT NULL,
        token_hash    VARCHAR(64) NOT NULL,
        expira_em     DATETIME NOT NULL,
        usado_em      DATETIME NULL,
        ip_criacao    VARCHAR(45) NULL,
        ip_ativacao   VARCHAR(45) NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token_hash (token_hash),
        INDEX idx_usuario_id (usuario_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(err => {
      console.warn('[DATABASE] Aviso ao criar tabela tokens_ativacao:', err.message);
    });

    console.log('[DATABASE] ✅ Estrutura de tokens de ativação e status verificada com sucesso.');
  } catch (err) {
    console.warn('[DATABASE] Aviso na inicialização de extensões de schema:', err.message);
  }
}

module.exports = {
  getPool,
  testConnection,
  initSchemaExtensions,
  dbConfig
};

