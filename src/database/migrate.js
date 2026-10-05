/**
 * HUB ES+ - Migration Runner
 * Cria o banco secult_db e todas as tabelas necessárias.
 * Seguro para executar múltiplas vezes (idempotente - usa IF NOT EXISTS).
 * Uso: node src/database/migrate.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfigWithoutDb = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
  connectTimeout: 15000,
  charset: 'utf8mb4'
};

if (process.env.DB_SSL === 'true') {
  dbConfigWithoutDb.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: false };
}

async function migrate() {
  console.log('[MIGRATE] Iniciando migração do banco de dados...');

  let conn;
  try {
    conn = await mysql.createConnection(dbConfigWithoutDb);

    // 1. Garantir que o banco de dados existe
    const dbName = process.env.DB_DATABASE || 'secult_db';
    console.log(`[MIGRATE] Criando banco "${dbName}" (se não existir)...`);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.query(`USE \`${dbName}\`;`);
    console.log(`[MIGRATE] Banco "${dbName}" selecionado.`);

    // 2. Executar schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Divide em statements individuais e ignora comentários/vazios
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const stmt of statements) {
      if (stmt.trim()) {
        await conn.query(stmt);
      }
    }
    console.log('[MIGRATE] Schema aplicado com sucesso.');

    // 3. Verificar tabelas criadas
    const [tables] = await conn.query('SHOW TABLES;');
    const tableList = tables.map(t => Object.values(t)[0]);
    console.log('[MIGRATE] Tabelas disponíveis:', tableList.join(', '));

    console.log('[MIGRATE] ✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('[MIGRATE] ❌ Erro durante a migração:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('[MIGRATE] DICA: Verifique se o IP público do servidor está liberado no TiDB Cloud.');
      console.error('[MIGRATE] IP atual: Execute `curl https://api.ipify.org` para verificar.');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
