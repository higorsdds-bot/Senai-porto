/**
 * HUB ES+ - Migração Incremental: Perfil VISITANTE (Prioridade Baixíssima)
 * Permissões: comunicados.visualizar e eventos.visualizar
 * Uso: node src/database/migrate-perfil-visitante.js
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
    console.log('[MIGRATE-VISITANTE] Conectando ao banco para cadastrar permissões do perfil VISITANTE...');
    conn = await mysql.createConnection(dbConfig);

    const chavesPermissoes = ['comunicados.visualizar', 'eventos.visualizar'];

    for (const chave of chavesPermissoes) {
      let [perms] = await conn.query(`SELECT id FROM permissoes WHERE chave = ?`, [chave]);
      if (perms.length === 0) continue;
      const permId = perms[0].id;

      const [existe] = await conn.query(
        `SELECT id FROM perfil_permissoes WHERE perfil = 'VISITANTE' AND permissao_id = ?`,
        [permId]
      );

      if (existe.length === 0) {
        await conn.query(
          `INSERT INTO perfil_permissoes (perfil, permissao_id) VALUES ('VISITANTE', ?)`,
          [permId]
        );
        console.log(`[MIGRATE-VISITANTE] ✅ Permissão ${chave} vinculada ao perfil VISITANTE.`);
      } else {
        console.log(`[MIGRATE-VISITANTE] Permissão ${chave} já estava vinculada ao perfil VISITANTE.`);
      }
    }

    console.log('[MIGRATE-VISITANTE] ✅ Concluído com sucesso.');
  } catch (err) {
    console.error('[MIGRATE-VISITANTE] Erro:', err.message);
  } finally {
    if (conn) await conn.end();
  }
})();
