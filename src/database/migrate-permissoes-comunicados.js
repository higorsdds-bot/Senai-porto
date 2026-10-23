/**
 * HUB ES+ - Migração Incremental:
 * Garante que a permissão 'comunicados.visualizar' esteja atribuída a todos os perfis
 * (ADMIN, GESTOR, OPERADOR, ADMINISTRACAO, LIMPEZA) para que todos possam ver comunicados.
 * Uso: node src/database/migrate-permissoes-comunicados.js
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
    console.log('[MIGRATE-COMUNICADOS] Conectando ao banco para migração de permissões de comunicados...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Garantir que a permissão 'comunicados.visualizar' exista na tabela permissoes
    let [perms] = await conn.query(`SELECT id FROM permissoes WHERE chave = 'comunicados.visualizar'`);
    let permId;
    if (perms.length === 0) {
      const [insertRes] = await conn.query(
        `INSERT INTO permissoes (chave, nome, descricao) VALUES ('comunicados.visualizar', 'Visualizar Comunicados', 'Permite visualizar os comunicados e avisos oficiais do HUB ES+')`
      );
      permId = insertRes.insertId;
      console.log('[MIGRATE-COMUNICADOS] Permissão comunicados.visualizar inserida.');
    } else {
      permId = perms[0].id;
    }

    // 2. Vincular aos perfis caso não estejam vinculados
    const perfis = ['ADMIN', 'GESTOR', 'OPERADOR', 'ADMINISTRACAO', 'LIMPEZA'];
    for (const perfil of perfis) {
      const [existe] = await conn.query(
        `SELECT id FROM perfil_permissoes WHERE perfil = ? AND permissao_id = ?`,
        [perfil, permId]
      );
      if (existe.length === 0) {
        await conn.query(
          `INSERT INTO perfil_permissoes (perfil, permissao_id) VALUES (?, ?)`,
          [perfil, permId]
        );
        console.log(`[MIGRATE-COMUNICADOS] ✅ Permissão comunicados.visualizar vinculada ao perfil ${perfil}.`);
      } else {
        console.log(`[MIGRATE-COMUNICADOS] Permissão comunicados.visualizar já vinculada ao perfil ${perfil}.`);
      }
    }

    console.log('[MIGRATE-COMUNICADOS] ✅ Migração de comunicados finalizada com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE-COMUNICADOS] ❌ Erro durante a migração:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
