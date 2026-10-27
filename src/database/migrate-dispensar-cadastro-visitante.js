/**
 * HUB ES+ - Migração Incremental: Dispensar Cadastro de Perfil VISITANTE
 * Remove permissões de VISITANTE da tabela perfil_permissoes e normaliza eventuais contas existentes.
 * O modo visitante permanece disponível publicamente para qualquer pessoa sem necessidade de cadastro.
 * Uso: node src/database/migrate-dispensar-cadastro-visitante.js
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
    console.log('[MIGRATE-DISPENSAR-VISITANTE] Conectando ao banco para remover o perfil VISITANTE de cadastros...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Remover vínculos de permissões para VISITANTE
    const [delPerms] = await conn.query(
      `DELETE FROM perfil_permissoes WHERE perfil = 'VISITANTE'`
    );
    console.log(`[MIGRATE-DISPENSAR-VISITANTE] Removidas ${delPerms.affectedRows} permissões vinculadas ao perfil VISITANTE.`);

    // 2. Normalizar eventuais usuários que tenham sido cadastrados com perfil VISITANTE
    const [updUsers] = await conn.query(
      `UPDATE usuarios SET perfil = 'OPERADOR' WHERE perfil = 'VISITANTE'`
    );
    if (updUsers.affectedRows > 0) {
      console.log(`[MIGRATE-DISPENSAR-VISITANTE] Atualizados ${updUsers.affectedRows} usuário(s) de VISITANTE para OPERADOR.`);
    } else {
      console.log('[MIGRATE-DISPENSAR-VISITANTE] Nenhum usuário com perfil VISITANTE encontrado.');
    }

    console.log('[MIGRATE-DISPENSAR-VISITANTE] ✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('[MIGRATE-DISPENSAR-VISITANTE] Erro durante a migração:', err.message);
  } finally {
    if (conn) await conn.end();
  }
})();
