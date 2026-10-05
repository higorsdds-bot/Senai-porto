/**
 * Migração incremental: adiciona a coluna foto_url em ocorrencias (se não existir).
 * Uso: node src/database/migrate-foto-ocorrencias.js
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
        conn = await mysql.createConnection(dbConfig);
        const [cols] = await conn.query(`SHOW COLUMNS FROM ocorrencias LIKE 'foto_url'`);
        if (cols.length > 0) {
            console.log('[MIGRATE] Coluna foto_url já existe. Nada a fazer.');
        } else {
            await conn.query(`ALTER TABLE ocorrencias ADD COLUMN foto_url VARCHAR(500) NULL AFTER tipo`);
            console.log('[MIGRATE] ✅ Coluna foto_url adicionada com sucesso.');
        }
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATE] ❌ Erro:', err.message);
        process.exit(1);
    }
})();