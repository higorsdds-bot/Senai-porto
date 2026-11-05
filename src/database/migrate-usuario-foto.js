/**
 * HUB ES+ - Migração Incremental: Adiciona coluna foto_url na tabela usuarios
 * Suporta armazenamento de avatar em Base64 ou URL HTTP.
 * 
 * Uso: node src/database/migrate-usuario-foto.js
 */
const { getPool } = require('../config/database');

async function migrar() {
  let conn;
  try {
    console.log('[MIGRATE-FOTO] Conectando ao banco de dados...');
    const pool = getPool();
    conn = await pool.getConnection();

    console.log('[MIGRATE-FOTO] Verificando existência da coluna foto_url na tabela usuarios...');
    const [cols] = await conn.query(`SHOW COLUMNS FROM usuarios LIKE 'foto_url'`);

    if (cols.length === 0) {
      console.log('[MIGRATE-FOTO] Adicionando coluna foto_url em usuarios...');
      await conn.query(`
        ALTER TABLE usuarios
        ADD COLUMN foto_url LONGTEXT NULL AFTER status
      `);
      console.log('[MIGRATE-FOTO] ✅ Coluna foto_url adicionada com sucesso na tabela usuarios.');
    } else {
      console.log('[MIGRATE-FOTO] ℹ️ Coluna foto_url já existe na tabela usuarios.');
    }

    console.log('[MIGRATE-FOTO] Migração concluída com sucesso!');
  } catch (err) {
    console.error('[MIGRATE-FOTO] ❌ Erro na migração:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

migrar();
