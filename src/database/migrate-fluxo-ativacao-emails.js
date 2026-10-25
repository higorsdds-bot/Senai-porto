/**
 * HUB ES+ - Migração Incremental: Fluxo de E-mails e Ativação Segura
 * 
 * 1. Atualiza ENUM de status da tabela usuarios para incluir:
 *    - 'AGUARDANDO_ATIVACAO' (conta aprovada pelo Admin, aguardando clique no link de ativação)
 *    - 'REJEITADO' (solicitação recusada pelo Administrador)
 * 2. Cria a tabela 'tokens_ativacao' para armazenar hashes SHA-256 de links seguros,
 *    de uso único e com tempo de expiração determinado.
 * 
 * Uso: node src/database/migrate-fluxo-ativacao-emails.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'secult_db',
  connectTimeout: 15000,
  charset: 'utf8mb4'
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: false };
}

(async () => {
  let conn;
  try {
    console.log('[MIGRATE-ATIVACAO] Conectando ao banco de dados...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Atualizar o ENUM da coluna status em usuarios
    console.log('[MIGRATE-ATIVACAO] Atualizando coluna status na tabela usuarios...');
    await conn.query(`
      ALTER TABLE usuarios 
      MODIFY COLUMN status ENUM('ATIVO','INATIVO','BLOQUEADO','PENDENTE','AGUARDANDO_ATIVACAO','REJEITADO') NOT NULL DEFAULT 'PENDENTE'
    `);
    console.log('[MIGRATE-ATIVACAO] ✅ Status de usuarios atualizado com sucesso (suporta AGUARDANDO_ATIVACAO e REJEITADO).');

    // 2. Criar tabela tokens_ativacao
    console.log('[MIGRATE-ATIVACAO] Criando tabela tokens_ativacao se não existir...');
    await conn.query(`
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
    `);
    console.log('[MIGRATE-ATIVACAO] ✅ Tabela tokens_ativacao criada/verificada com sucesso.');

    console.log('[MIGRATE-ATIVACAO] ✅ Todas as alterações da migração de ativação e e-mails foram concluídas com êxito!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE-ATIVACAO] ❌ Erro durante a migração:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
