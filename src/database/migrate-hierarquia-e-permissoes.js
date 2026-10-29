/**
 * HUB ES+ - Migração Incremental:
 * 1. Cria a tabela 'usuario_permissoes' para concessão de permissões granulares/extras por usuário.
 * 2. Adiciona colunas de nível (N1, N2, N3), equipamento vinculado e parecer técnico na tabela 'ocorrencias'.
 * 3. Cria setores 'Recursos Humanos (RH)' e 'Infraestrutura & Redes (TI)'.
 * 4. Cadastra novas permissões ('rh.visualizar', 'rh.gerenciar', 'ocorrencias.assumir', 'ocorrencias.escalonar').
 * 5. Mapeia permissões padrão para os novos perfis:
 *    - ADMINISTRADOR
 *    - GESTOR_RH, ANALISTA_RH (RH)
 *    - GESTOR_INFRA, TECNICO_N1, TECNICO_N2, TECNICO_N3
 *    - GESTOR_OPERADOR
 *
 * Uso: node src/database/migrate-hierarquia-e-permissoes.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const { getPool } = require('../config/database');

(async () => {
  let pool;
  try {
    console.log('[MIGRATE-HIERARQUIA] Conectando ao TiDB Cloud / MySQL via Pool...');
    pool = getPool();

    // 1. Criar tabela usuario_permissoes para permissões granulares individuais
    console.log('[MIGRATE-HIERARQUIA] Verificando tabela usuario_permissoes...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario_permissoes (
        id           BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id   BIGINT NOT NULL,
        permissao_id BIGINT NOT NULL,
        concedida    TINYINT(1) NOT NULL DEFAULT 1,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_permissao (usuario_id, permissao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[MIGRATE-HIERARQUIA] ✅ Tabela usuario_permissoes pronta.');

    // 2. Adicionar colunas na tabela ocorrencias (nivel_atendimento, equipamento_id, parecer_tecnico)
    console.log('[MIGRATE-HIERARQUIA] Verificando colunas da tabela ocorrencias...');
    const dbName = process.env.DB_DATABASE || 'secult_db';
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocorrencias'
    `, [dbName]);

    const existingCols = new Set(cols.map(c => c.COLUMN_NAME.toLowerCase()));

    if (!existingCols.has('nivel_atendimento')) {
      await pool.query(`
        ALTER TABLE ocorrencias 
        ADD COLUMN nivel_atendimento VARCHAR(10) NOT NULL DEFAULT 'N1' AFTER status
      `);
      console.log('[MIGRATE-HIERARQUIA] ✅ Coluna ocorrencias.nivel_atendimento adicionada.');
    }

    if (!existingCols.has('equipamento_id')) {
      await pool.query(`
        ALTER TABLE ocorrencias 
        ADD COLUMN equipamento_id BIGINT NULL AFTER nivel_atendimento,
        ADD CONSTRAINT fk_ocorrencias_equipamento FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE SET NULL
      `);
      console.log('[MIGRATE-HIERARQUIA] ✅ Coluna ocorrencias.equipamento_id adicionada.');
    }

    if (!existingCols.has('parecer_tecnico')) {
      await pool.query(`
        ALTER TABLE ocorrencias 
        ADD COLUMN parecer_tecnico TEXT NULL AFTER equipamento_id
      `);
      console.log('[MIGRATE-HIERARQUIA] ✅ Coluna ocorrencias.parecer_tecnico adicionada.');
    }

    // 3. Adicionar novos setores
    console.log('[MIGRATE-HIERARQUIA] Inserindo novos setores...');
    const novosSetores = [
      { nome: 'Recursos Humanos (RH)', descricao: 'Gestão de pessoas, quadro funcional, contratos e documentos' },
      { nome: 'Infraestrutura & Redes (TI)', 'descricao': 'Suporte técnico aos níveis N1, N2 e N3, hardware e redes' }
    ];

    for (const s of novosSetores) {
      await pool.query(
        `INSERT IGNORE INTO setores (nome, descricao) VALUES (?, ?)`,
        [s.nome, s.descricao]
      );
    }
    console.log('[MIGRATE-HIERARQUIA] ✅ Setores atualizados.');

    // 4. Inserir novas permissões
    console.log('[MIGRATE-HIERARQUIA] Inserindo novas chaves de permissão...');
    const novasPermissoes = [
      { chave: 'rh.visualizar', nome: 'Visualizar Painel de RH', descricao: 'Acesso às rotinas e registros de RH' },
      { chave: 'rh.gerenciar', nome: 'Gerenciar Colaboradores de RH', descricao: 'Gestão de pessoas e documentos de RH' },
      { chave: 'ocorrencias.assumir', nome: 'Assumir Atendimento de Ocorrência', descricao: 'Permite ao técnico vincular chamado a si' },
      { chave: 'ocorrencias.escalonar', nome: 'Escalonar Nível de Ocorrência (N1/N2/N3)', descricao: 'Permite transferir chamado entre N1, N2 e N3' }
    ];

    for (const p of novasPermissoes) {
      await pool.query(
        `INSERT IGNORE INTO permissoes (chave, nome, descricao) VALUES (?, ?, ?)`,
        [p.chave, p.nome, p.descricao]
      );
    }
    console.log('[MIGRATE-HIERARQUIA] ✅ Permissões atualizadas.');

    // Mapeamento de todas as permissões do banco por chave
    const [permRows] = await pool.query(`SELECT id, chave FROM permissoes`);
    const permMap = {};
    for (const r of permRows) {
      permMap[r.chave] = r.id;
    }

    // 5. Matriz de Permissões Padrão por Perfil
    const MATRIZ_NOVOS_PERFIS = {
      ADMINISTRADOR: [
        'dashboard.visualizar', 'indicadores.visualizar',
        'limpeza.visualizar', 'limpeza.criar', 'limpeza.editar',
        'compras.visualizar', 'compras.criar', 'compras.editar', 'compras.aprovar', 'compras.receber', 'compras.visualizar_pedidos',
        'equipamentos.visualizar', 'equipamentos.criar', 'equipamentos.editar',
        'documentos.visualizar', 'documentos.enviar', 'documentos.baixar', 'documentos.arquivar',
        'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar', 'ocorrencias.assumir', 'ocorrencias.escalonar',
        'eventos.visualizar', 'eventos.criar', 'eventos.editar', 'eventos.excluir',
        'insumos.visualizar', 'insumos.criar', 'insumos.editar', 'insumos.movimentar', 'insumos.baixar',
        'comunicados.visualizar', 'comunicados.criar',
        'setores.visualizar', 'usuarios.visualizar', 'usuarios.pre_cadastrar',
        'advertencias.visualizar', 'advertencias.solicitar',
        'rh.visualizar', 'rh.gerenciar'
      ],
      GESTOR_RH: [
        'dashboard.visualizar', 'indicadores.visualizar',
        'comunicados.visualizar', 'comunicados.criar',
        'documentos.visualizar', 'documentos.enviar', 'documentos.baixar', 'documentos.arquivar',
        'usuarios.visualizar',
        'advertencias.visualizar', 'advertencias.solicitar',
        'rh.visualizar', 'rh.gerenciar'
      ],
      ANALISTA_RH: [
        'comunicados.visualizar',
        'documentos.visualizar', 'documentos.enviar', 'documentos.baixar',
        'advertencias.visualizar', 'advertencias.solicitar',
        'rh.visualizar'
      ],
      RH: [
        'comunicados.visualizar',
        'documentos.visualizar', 'documentos.enviar', 'documentos.baixar',
        'advertencias.visualizar', 'advertencias.solicitar',
        'rh.visualizar'
      ],
      GESTOR_INFRA: [
        'dashboard.visualizar', 'indicadores.visualizar',
        'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar', 'ocorrencias.excluir', 'ocorrencias.assumir', 'ocorrencias.escalonar',
        'equipamentos.visualizar', 'equipamentos.criar', 'equipamentos.editar', 'equipamentos.excluir',
        'comunicados.visualizar', 'comunicados.criar',
        'documentos.visualizar', 'documentos.baixar'
      ],
      TECNICO_N1: [
        'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar', 'ocorrencias.assumir', 'ocorrencias.escalonar',
        'equipamentos.visualizar',
        'comunicados.visualizar'
      ],
      TECNICO_N2: [
        'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar', 'ocorrencias.assumir', 'ocorrencias.escalonar',
        'equipamentos.visualizar', 'equipamentos.editar',
        'comunicados.visualizar'
      ],
      TECNICO_N3: [
        'indicadores.visualizar',
        'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar', 'ocorrencias.excluir', 'ocorrencias.assumir', 'ocorrencias.escalonar',
        'equipamentos.visualizar', 'equipamentos.criar', 'equipamentos.editar',
        'comunicados.visualizar'
      ],
      GESTOR_OPERADOR: [
        'dashboard.visualizar',
        'insumos.visualizar', 'insumos.criar', 'insumos.editar', 'insumos.movimentar', 'insumos.baixar',
        'eventos.visualizar', 'eventos.criar', 'eventos.editar', 'eventos.excluir',
        'ocorrencias.visualizar', 'ocorrencias.criar',
        'limpeza.visualizar',
        'comunicados.visualizar', 'comunicados.criar'
      ]
    };

    console.log('[MIGRATE-HIERARQUIA] Associando permissões aos novos perfis...');
    for (const [perfil, chaves] of Object.entries(MATRIZ_NOVOS_PERFIS)) {
      for (const chave of chaves) {
        const permId = permMap[chave];
        if (permId) {
          await pool.query(
            `INSERT IGNORE INTO perfil_permissoes (perfil, permissao_id) VALUES (?, ?)`,
            [perfil, permId]
          );
        }
      }
      console.log(`[MIGRATE-HIERARQUIA] ✅ Perfil ${perfil} configurado com ${chaves.length} permissões.`);
    }

    console.log('[MIGRATE-HIERARQUIA] 🎉 Migração concluída com sucesso!');
  } catch (err) {
    console.error('[MIGRATE-HIERARQUIA] ❌ Erro durante a migração:', err.message);
  }
})();
