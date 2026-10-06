/**
 * HUB ES+ - Migração Incremental:
 * 1. Adiciona 'PENDENTE' ao ENUM de status da tabela usuarios
 * 2. Adiciona colunas anexo_url e anexo_nome na tabela ocorrencias (se não existirem)
 * Uso: node src/database/migrate-auditoria-ocorrencias.js
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
    console.log('[MIGRATE] Conectando ao banco para migração incremental...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Atualizar ENUM de status em usuarios
    console.log('[MIGRATE] Atualizando coluna status de usuarios para suportar PENDENTE...');
    await conn.query(`
      ALTER TABLE usuarios 
      MODIFY COLUMN status ENUM('ATIVO','INATIVO','BLOQUEADO','PENDENTE') NOT NULL DEFAULT 'PENDENTE'
    `);
    console.log('[MIGRATE] ✅ Status de usuarios atualizado com sucesso.');

    // 2. Coluna anexo_url em ocorrencias
    const [colAnexo] = await conn.query(`SHOW COLUMNS FROM ocorrencias LIKE 'anexo_url'`);
    if (colAnexo.length > 0) {
      console.log('[MIGRATE] Coluna anexo_url já existe em ocorrencias.');
    } else {
      await conn.query(`ALTER TABLE ocorrencias ADD COLUMN anexo_url VARCHAR(1000) NULL AFTER foto_url`);
      console.log('[MIGRATE] ✅ Coluna anexo_url adicionada com sucesso.');
    }

    // 3. Coluna anexo_nome em ocorrencias
    const [colNome] = await conn.query(`SHOW COLUMNS FROM ocorrencias LIKE 'anexo_nome'`);
    if (colNome.length > 0) {
      console.log('[MIGRATE] Coluna anexo_nome já existe em ocorrencias.');
    } else {
      await conn.query(`ALTER TABLE ocorrencias ADD COLUMN anexo_nome VARCHAR(255) NULL AFTER anexo_url`);
      console.log('[MIGRATE] ✅ Coluna anexo_nome adicionada com sucesso.');
    }

    console.log('[MIGRATE] ✅ Todas as alterações incrementais foram concluídas!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE] ❌ Erro durante a migração:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
