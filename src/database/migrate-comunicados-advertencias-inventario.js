/**
 * HUB ES+ - Migração Incremental: Comunicados por Perfil, Advertências e Rastreabilidade de Inventário
 * 
 * 1. Adiciona coluna `destinatario_perfil` na tabela `comunicados` para direcionamento por cargo/perfil.
 * 2. Cria a tabela `advertencias` com workflow disciplinar (solicitação pelo Admin, homologação/aplicação/revogação pelo Admin Geral).
 * 3. Expande a tabela `estoque_movimentacoes` com `local_origem`, `local_destino` e tipo `TRANSFERENCIA` para rastreabilidade completa.
 * 4. Cadastra permissões de advertências no sistema.
 * 
 * Uso: node src/database/migrate-comunicados-advertencias-inventario.js
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
    console.log('[MIGRATE] Conectando ao banco de dados...');
    conn = await mysql.createConnection(dbConfig);

    // 1. Verificar e adicionar coluna destinatario_perfil em comunicados
    console.log('[MIGRATE] Verificando coluna destinatario_perfil na tabela comunicados...');
    const [comunicadoCols] = await conn.query(`SHOW COLUMNS FROM comunicados LIKE 'destinatario_perfil'`);
    if (comunicadoCols.length === 0) {
      await conn.query(`
        ALTER TABLE comunicados
        ADD COLUMN destinatario_perfil VARCHAR(50) NOT NULL DEFAULT 'TODOS' AFTER prioridade
      `);
      console.log('[MIGRATE] ✅ Coluna destinatario_perfil adicionada com sucesso em comunicados.');
    } else {
      console.log('[MIGRATE] ℹ️ Coluna destinatario_perfil já existe em comunicados.');
    }

    // 2. Criar tabela advertencias
    console.log('[MIGRATE] Criando tabela advertencias se não existir...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS advertencias (
        id               BIGINT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id   BIGINT NOT NULL,
        solicitante_id   BIGINT NOT NULL,
        aprovador_id     BIGINT NULL,
        tipo             ENUM('VERBAL','ESCRITA','SUSPENSAO') NOT NULL DEFAULT 'ESCRITA',
        motivo           VARCHAR(255) NOT NULL,
        descricao        TEXT NOT NULL,
        status           ENUM('PENDENTE','APLICADA','REVOGADA','REJEITADA') NOT NULL DEFAULT 'PENDENTE',
        motivo_revogacao TEXT NULL,
        data_aplicacao   DATETIME NULL,
        data_revogacao   DATETIME NULL,
        deleted_at       DATETIME NULL,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_colaborador (colaborador_id),
        INDEX idx_status (status),
        FOREIGN KEY (colaborador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (aprovador_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[MIGRATE] ✅ Tabela advertencias verificada/criada com sucesso.');

    // 3. Atualizar estoque_movimentacoes para rastreabilidade
    console.log('[MIGRATE] Atualizando tabela estoque_movimentacoes para inventário...');
    await conn.query(`
      ALTER TABLE estoque_movimentacoes
      MODIFY COLUMN tipo ENUM('ENTRADA','SAIDA','TRANSFERENCIA','AJUSTE') NOT NULL
    `);

    const [origemCols] = await conn.query(`SHOW COLUMNS FROM estoque_movimentacoes LIKE 'local_origem'`);
    if (origemCols.length === 0) {
      await conn.query(`
        ALTER TABLE estoque_movimentacoes
        ADD COLUMN local_origem VARCHAR(255) NULL AFTER quantidade,
        ADD COLUMN local_destino VARCHAR(255) NULL AFTER local_origem
      `);
      console.log('[MIGRATE] ✅ Colunas local_origem e local_destino adicionadas em estoque_movimentacoes.');
    } else {
      console.log('[MIGRATE] ℹ️ Colunas de localização já existem em estoque_movimentacoes.');
    }

    // 4. Cadastrar novas permissões
    console.log('[MIGRATE] Inserindo permissões de advertências...');
    const novasPermissoes = [
      ['advertencias.visualizar', 'Visualizar registros e histórico de advertências', 'advertencias'],
      ['advertencias.solicitar', 'Solicitar aplicação de advertência para colaboradores', 'advertencias'],
      ['advertencias.aprovar', 'Aprovar e homologar advertências solicitadas', 'advertencias'],
      ['advertencias.revogar', 'Revogar advertências aplicadas', 'advertencias']
    ];

    for (const [chave, nome, modulo] of novasPermissoes) {
      await conn.query(`
        INSERT INTO permissoes (chave, nome, modulo)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE nome = VALUES(nome), modulo = VALUES(modulo)
      `, [chave, nome, modulo]);
    }
    console.log('[MIGRATE] ✅ Permissões de advertências sincronizadas.');

    console.log('[MIGRATE] 🚀 Migração incremental concluída com sucesso absoluto!');
  } catch (err) {
    console.error('[MIGRATE] ❌ Erro na execução da migração:', err.message);
  } finally {
    if (conn) await conn.end();
  }
})();
