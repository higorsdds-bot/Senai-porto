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

    // 3. Garantir coluna destinatario_perfil em comunicados
    await p.query(`
      ALTER TABLE comunicados 
      ADD COLUMN destinatario_perfil VARCHAR(50) NOT NULL DEFAULT 'TODOS'
    `).catch(() => {});

    // 4. Garantir tabela advertencias
    await p.query(`
      CREATE TABLE IF NOT EXISTS advertencias (
        id                BIGINT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id    BIGINT NOT NULL,
        solicitante_id    BIGINT NOT NULL,
        homologador_id    BIGINT NULL,
        motivo            VARCHAR(255) NOT NULL,
        descricao         TEXT NOT NULL,
        gravidade         ENUM('LEVE','MEDIA','GRAVE') NOT NULL DEFAULT 'LEVE',
        status            ENUM('PENDENTE','APLICADA','REJEITADA','REVOGADA') NOT NULL DEFAULT 'PENDENTE',
        data_ocorrencia   DATE NOT NULL,
        motivo_decisao    TEXT NULL,
        data_decisao      DATETIME NULL,
        deleted_at        DATETIME NULL,
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_colaborador (colaborador_id),
        INDEX idx_solicitante (solicitante_id),
        INDEX idx_status (status),
        FOREIGN KEY (colaborador_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
        FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
        FOREIGN KEY (homologador_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(err => {
      console.warn('[DATABASE] Aviso ao criar tabela advertencias:', err.message);
    });

    // 5. Garantir campos local_origem, local_destino e ENUM estendido em estoque_movimentacoes
    await p.query(`
      ALTER TABLE estoque_movimentacoes
      MODIFY COLUMN tipo ENUM('ENTRADA','SAIDA','AJUSTE','TRANSFERENCIA') NOT NULL
    `).catch(() => {});

    await p.query(`
      ALTER TABLE estoque_movimentacoes
      ADD COLUMN local_origem VARCHAR(255) NULL
    `).catch(() => {});

    await p.query(`
      ALTER TABLE estoque_movimentacoes
      ADD COLUMN local_destino VARCHAR(255) NULL
    `).catch(() => {});

    // 6. Garantir tabela usuario_permissoes para permissões granulares por colaborador
    await p.query(`
      CREATE TABLE IF NOT EXISTS usuario_permissoes (
        id           BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id   BIGINT NOT NULL,
        permissao_id BIGINT NOT NULL,
        concedida    TINYINT(1) NOT NULL DEFAULT 1,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usr_perm_user (usuario_id),
        INDEX idx_usr_perm_perm (permissao_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_permissao (usuario_id, permissao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 7. Garantir colunas de nível, equipamento e parecer técnico em ocorrencias
    await p.query(`
      ALTER TABLE ocorrencias 
      ADD COLUMN nivel_atendimento VARCHAR(10) NOT NULL DEFAULT 'N1' AFTER status
    `).catch(() => {});

    await p.query(`
      ALTER TABLE ocorrencias 
      ADD COLUMN equipamento_id BIGINT NULL AFTER nivel_atendimento
    `).catch(() => {});

    await p.query(`
      ALTER TABLE ocorrencias 
      ADD COLUMN parecer_tecnico TEXT NULL AFTER equipamento_id
    `).catch(() => {});

    await require('../database/seed').seed().catch(err => console.warn('[DATABASE] Aviso ao sincronizar contas de teste:', err.message));
    console.log('[DATABASE] ✅ Estrutura de extensões de schema verificada com sucesso.');
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

