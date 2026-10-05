/**
 * HUB ES+ - Seed Inicial
 * Insere dados essenciais: permissões, setores base e usuário administrador.
 * Seguro para executar múltiplas vezes (idempotente).
 * Uso: node src/database/seed.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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

// ─── Permissões do sistema ────────────────────────────────────────────────────
const PERMISSOES = [
  { chave: 'dashboard.visualizar',     nome: 'Visualizar Dashboard' },
  { chave: 'limpeza.visualizar',       nome: 'Visualizar Limpeza' },
  { chave: 'limpeza.criar',            nome: 'Criar Limpeza' },
  { chave: 'limpeza.editar',           nome: 'Editar Limpeza' },
  { chave: 'limpeza.excluir',          nome: 'Excluir Limpeza' },
  { chave: 'compras.visualizar',       nome: 'Visualizar Compras' },
  { chave: 'compras.criar',            nome: 'Criar Compra' },
  { chave: 'compras.editar',           nome: 'Editar Compra' },
  { chave: 'compras.aprovar',          nome: 'Aprovar Compra' },
  { chave: 'compras.excluir',          nome: 'Excluir Compra' },
  { chave: 'equipamentos.visualizar',  nome: 'Visualizar Equipamentos' },
  { chave: 'equipamentos.criar',       nome: 'Criar Equipamento' },
  { chave: 'equipamentos.editar',      nome: 'Editar Equipamento' },
  { chave: 'equipamentos.excluir',     nome: 'Excluir Equipamento' },
  { chave: 'documentos.visualizar',    nome: 'Visualizar Documentos' },
  { chave: 'documentos.enviar',        nome: 'Enviar Documento' },
  { chave: 'documentos.baixar',        nome: 'Baixar Documento' },
  { chave: 'documentos.arquivar',      nome: 'Arquivar Documento' },
  { chave: 'documentos.excluir',       nome: 'Excluir Documento' },
  { chave: 'ocorrencias.visualizar',   nome: 'Visualizar Ocorrências' },
  { chave: 'ocorrencias.criar',        nome: 'Criar Ocorrência' },
  { chave: 'ocorrencias.editar',       nome: 'Editar Ocorrência' },
  { chave: 'ocorrencias.excluir',      nome: 'Excluir Ocorrência' },
  { chave: 'eventos.visualizar',       nome: 'Visualizar Eventos' },
  { chave: 'eventos.criar',            nome: 'Criar Evento' },
  { chave: 'eventos.editar',           nome: 'Editar Evento' },
  { chave: 'eventos.excluir',          nome: 'Excluir Evento' },
  { chave: 'insumos.visualizar',       nome: 'Visualizar Insumos' },
  { chave: 'insumos.criar',            nome: 'Criar Insumo' },
  { chave: 'insumos.editar',           nome: 'Editar Insumo' },
  { chave: 'insumos.excluir',          nome: 'Excluir Insumo' },
  { chave: 'insumos.movimentar',       nome: 'Movimentar Estoque' },
  { chave: 'comunicados.visualizar',   nome: 'Visualizar Comunicados' },
  { chave: 'comunicados.criar',        nome: 'Criar Comunicado' },
  { chave: 'comunicados.excluir',      nome: 'Excluir Comunicado' },
  { chave: 'usuarios.visualizar',      nome: 'Visualizar Usuários' },
  { chave: 'usuarios.criar',           nome: 'Criar Usuário' },
  { chave: 'usuarios.editar',          nome: 'Editar Usuário' },
  { chave: 'usuarios.bloquear',        nome: 'Bloquear/Desbloquear Usuário' },
  { chave: 'setores.visualizar',       nome: 'Visualizar Setores' },
  { chave: 'setores.criar',            nome: 'Criar Setor' },
  { chave: 'setores.editar',           nome: 'Editar Setor' },
  { chave: 'setores.excluir',          nome: 'Excluir Setor' },
  { chave: 'auditoria.visualizar',     nome: 'Visualizar Auditoria' },
  { chave: 'indicadores.visualizar',   nome: 'Visualizar Indicadores' }
];

// Permissões por perfil
const PERFIL_PERMISSOES = {
  ADMIN: PERMISSOES.map(p => p.chave), // Admin tem tudo
  GESTOR: [
    'dashboard.visualizar', 'indicadores.visualizar',
    'limpeza.visualizar', 'limpeza.criar', 'limpeza.editar',
    'compras.visualizar', 'compras.criar', 'compras.editar', 'compras.aprovar',
    'equipamentos.visualizar', 'equipamentos.criar', 'equipamentos.editar',
    'documentos.visualizar', 'documentos.enviar', 'documentos.baixar', 'documentos.arquivar',
    'ocorrencias.visualizar', 'ocorrencias.criar', 'ocorrencias.editar',
    'eventos.visualizar', 'eventos.criar', 'eventos.editar', 'eventos.excluir',
    'insumos.visualizar', 'insumos.criar', 'insumos.editar', 'insumos.movimentar',
    'comunicados.visualizar', 'comunicados.criar',
    'setores.visualizar', 'usuarios.visualizar'
  ],
  OPERADOR: [
    'dashboard.visualizar',
    'limpeza.visualizar', 'limpeza.criar',
    'compras.visualizar', 'compras.criar',
    'equipamentos.visualizar',
    'documentos.visualizar', 'documentos.baixar',
    'ocorrencias.visualizar', 'ocorrencias.criar',
    'eventos.visualizar',
    'insumos.visualizar', 'insumos.movimentar',
    'comunicados.visualizar'
  ]
};

// Setores iniciais
const SETORES_INICIAIS = [
  { nome: 'Administração Geral' },
  { nome: 'Tecnologia da Informação & Inovação' },
  { nome: 'Operações e Logística' },
  { nome: 'Comunicação e Eventos' },
  { nome: 'Financeiro e Compras' },
  { nome: 'Manutenção Predial' }
];

async function seed() {
  console.log('[SEED] Iniciando seed do banco de dados...');
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // 1. Inserir setores
    console.log('[SEED] Inserindo setores...');
    for (const s of SETORES_INICIAIS) {
      await conn.query(
        `INSERT IGNORE INTO setores (nome) VALUES (?)`,
        [s.nome]
      );
    }
    const [setores] = await conn.query(`SELECT id, nome FROM setores WHERE deleted_at IS NULL LIMIT 1`);
    const primeiroSetorId = setores[0]?.id || 1;

    // 2. Inserir permissões
    console.log('[SEED] Inserindo permissões...');
    for (const p of PERMISSOES) {
      await conn.query(
        `INSERT IGNORE INTO permissoes (chave, nome) VALUES (?, ?)`,
        [p.chave, p.nome]
      );
    }

    // 3. Mapear permissões por chave
    const [permRows] = await conn.query(`SELECT id, chave FROM permissoes`);
    const permMap = {};
    for (const row of permRows) {
      permMap[row.chave] = row.id;
    }

    // 4. Inserir perfil_permissoes para cada perfil
    console.log('[SEED] Associando permissões aos perfis...');
    for (const [perfil, chaves] of Object.entries(PERFIL_PERMISSOES)) {
      for (const chave of chaves) {
        if (permMap[chave]) {
          await conn.query(
            `INSERT IGNORE INTO perfil_permissoes (perfil, permissao_id) VALUES (?, ?)`,
            [perfil, permMap[chave]]
          );
        }
      }
    }

    // 5. Criar usuário administrador
    console.log('[SEED] Criando usuário administrador...');
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@secult.es.gov.br';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Secult2026!';
    const senhaHash = await bcrypt.hash(adminPassword, 12);

    const [existing] = await conn.query(
      `SELECT id FROM usuarios WHERE email = ? LIMIT 1`,
      [adminEmail]
    );

    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
         VALUES (?, ?, ?, 'ADMIN', ?, 'ATIVO')`,
        ['Administrador do Sistema', adminEmail, senhaHash, primeiroSetorId]
      );
      console.log(`[SEED] ✅ Administrador criado: ${adminEmail}`);
      console.log(`[SEED] ⚠️  Senha definida via .env ADMIN_DEFAULT_PASSWORD`);
    } else {
      console.log(`[SEED] Administrador já existe: ${adminEmail} - pulando.`);
    }

    console.log('[SEED] ✅ Seed concluído com sucesso!');
  } catch (err) {
    console.error('[SEED] ❌ Erro durante o seed:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('[SEED] DICA: IP não autorizado no TiDB Cloud. Adicione seu IP no painel.');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
