/**
 * HUB ES+ - Migração Incremental:
 * Remove as permissões 'compras.criar' e 'compras.visualizar' do perfil OPERADOR,
 * garantindo que operadores não tenham acesso ao módulo ou ações de compras.
 * Uso: node src/database/migrate-remove-compras-operador.js
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
    console.log('[MIGRATE-REMOVE-COMPRAS-OPERADOR] Conectando ao banco para remover permissões de compras do OPERADOR...');
    conn = await mysql.createConnection(dbConfig);

    // Busca IDs das permissões de compras
    const [perms] = await conn.query(
      `SELECT id, chave FROM permissoes WHERE chave IN ('compras.criar', 'compras.visualizar')`
    );

    if (perms.length > 0) {
      const permIds = perms.map(p => p.id);
      const placeholders = permIds.map(() => '?').join(',');
      
      const [res] = await conn.query(
        `DELETE FROM perfil_permissoes WHERE perfil = 'OPERADOR' AND permissao_id IN (${placeholders})`,
        permIds
      );
      console.log(`[MIGRATE-REMOVE-COMPRAS-OPERADOR] ✅ ${res.affectedRows} permissões de compras removidas do perfil OPERADOR.`);
    } else {
      console.log('[MIGRATE-REMOVE-COMPRAS-OPERADOR] Nenhuma permissão de compras encontrada.');
    }

    console.log('[MIGRATE-REMOVE-COMPRAS-OPERADOR] ✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE-REMOVE-COMPRAS-OPERADOR] ❌ Erro durante a migração:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
