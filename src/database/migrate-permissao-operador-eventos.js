/**
 * HUB ES+ - Migração Incremental:
 * Atribui a permissão 'eventos.criar' ao perfil OPERADOR, permitindo que operadores
 * criem e agendem novos eventos na Agenda Inteligente.
 * Uso: node src/database/migrate-permissao-operador-eventos.js
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
    console.log('[MIGRATE-OPERADOR-EVENTOS] Conectando ao banco para migrar permissão eventos.criar para OPERADOR...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Garantir que a permissão 'eventos.criar' exista na tabela permissoes
    let [perms] = await conn.query(`SELECT id FROM permissoes WHERE chave = 'eventos.criar'`);
    let permId;
    if (perms.length === 0) {
      const [insertRes] = await conn.query(
        `INSERT INTO permissoes (chave, nome, descricao) VALUES ('eventos.criar', 'Criar Evento', 'Permite agendar e cadastrar novos eventos na agenda inteligente')`
      );
      permId = insertRes.insertId;
      console.log('[MIGRATE-OPERADOR-EVENTOS] Permissão eventos.criar inserida.');
    } else {
      permId = perms[0].id;
    }

    // 2. Garantir que OPERADOR tenha a permissão na tabela perfil_permissoes
    const [existe] = await conn.query(
      `SELECT id FROM perfil_permissoes WHERE perfil = 'OPERADOR' AND permissao_id = ?`,
      [permId]
    );

    if (existe.length === 0) {
      await conn.query(
        `INSERT INTO perfil_permissoes (perfil, permissao_id) VALUES ('OPERADOR', ?)`,
        [permId]
      );
      console.log('[MIGRATE-OPERADOR-EVENTOS] ✅ Permissão eventos.criar vinculada com sucesso ao perfil OPERADOR.');
    } else {
      console.log('[MIGRATE-OPERADOR-EVENTOS] Permissão eventos.criar já estava vinculada ao perfil OPERADOR.');
    }

    console.log('[MIGRATE-OPERADOR-EVENTOS] ✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE-OPERADOR-EVENTOS] ❌ Erro durante a migração:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('[MIGRATE-OPERADOR-EVENTOS] DICA: Verifique se o IP está autorizado no TiDB Cloud.');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
