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

const { FIXED_PROFILE_PERMISSIONS } = require('../middleware/permissions');

// ─── Permissões do sistema ────────────────────────────────────────────────────
const PERMISSOES = [
  { chave: 'dashboard.visualizar',        nome: 'Visualizar Dashboard' },
  { chave: 'indicadores.visualizar',      nome: 'Visualizar Indicadores' },
  { chave: 'limpeza.visualizar',          nome: 'Visualizar Limpeza' },
  { chave: 'limpeza.criar',               nome: 'Criar Limpeza' },
  { chave: 'limpeza.editar',              nome: 'Editar Limpeza' },
  { chave: 'limpeza.excluir',             nome: 'Excluir Limpeza' },
  { chave: 'compras.visualizar',          nome: 'Visualizar Compras' },
  { chave: 'compras.criar',               nome: 'Criar Compra' },
  { chave: 'compras.editar',              nome: 'Editar Compra' },
  { chave: 'compras.aprovar',             nome: 'Aprovar Compra' },
  { chave: 'compras.receber',             nome: 'Dar Entrada em Pedido de Compra' },
  { chave: 'compras.visualizar_pedidos',  nome: 'Visualizar Pedidos para Entrada' },
  { chave: 'compras.visualizar_proprias', nome: 'Visualizar Próprias Solicitações de Compra' },
  { chave: 'compras.excluir',             nome: 'Excluir Compra' },
  { chave: 'equipamentos.visualizar',     nome: 'Visualizar Equipamentos' },
  { chave: 'equipamentos.criar',          nome: 'Criar Equipamento' },
  { chave: 'equipamentos.editar',         nome: 'Editar Equipamento' },
  { chave: 'equipamentos.excluir',        nome: 'Excluir Equipamento' },
  { chave: 'documentos.visualizar',       nome: 'Visualizar Documentos' },
  { chave: 'documentos.enviar',           nome: 'Enviar Documento' },
  { chave: 'documentos.criar',            nome: 'Criar Documento' },
  { chave: 'documentos.editar',           nome: 'Editar Documento' },
  { chave: 'documentos.baixar',           nome: 'Baixar Documento' },
  { chave: 'documentos.arquivar',         nome: 'Arquivar Documento' },
  { chave: 'documentos.excluir',          nome: 'Excluir Documento' },
  { chave: 'ocorrencias.visualizar',      nome: 'Visualizar Ocorrências' },
  { chave: 'ocorrencias.criar',           nome: 'Criar Ocorrência' },
  { chave: 'ocorrencias.editar',          nome: 'Editar Ocorrência' },
  { chave: 'ocorrencias.assumir',         nome: 'Assumir Ocorrência' },
  { chave: 'ocorrencias.atender',         nome: 'Atender Ocorrência' },
  { chave: 'ocorrencias.escalonar',       nome: 'Escalonar Ocorrência' },
  { chave: 'ocorrencias.fechar',          nome: 'Fechar/Resolver Ocorrência' },
  { chave: 'ocorrencias.excluir',         nome: 'Excluir Ocorrência' },
  { chave: 'eventos.visualizar',          nome: 'Visualizar Eventos' },
  { chave: 'eventos.criar',               nome: 'Criar Evento' },
  { chave: 'eventos.editar',              nome: 'Editar Evento' },
  { chave: 'eventos.excluir',             nome: 'Excluir Evento' },
  { chave: 'insumos.visualizar',          nome: 'Visualizar Insumos' },
  { chave: 'insumos.criar',               nome: 'Criar Insumo' },
  { chave: 'insumos.editar',              nome: 'Editar Insumo' },
  { chave: 'insumos.excluir',             nome: 'Excluir Insumo' },
  { chave: 'insumos.movimentar',          nome: 'Movimentar Estoque' },
  { chave: 'insumos.baixar',              nome: 'Dar Baixa em Estoque' },
  { chave: 'comunicados.visualizar',      nome: 'Visualizar Comunicados' },
  { chave: 'comunicados.criar',           nome: 'Criar Comunicado' },
  { chave: 'comunicados.excluir',         nome: 'Excluir Comunicado' },
  { chave: 'usuarios.visualizar',         nome: 'Visualizar Usuários' },
  { chave: 'usuarios.criar',              nome: 'Criar Usuário' },
  { chave: 'usuarios.pre_cadastrar',      nome: 'Pré-cadastrar Colaborador' },
  { chave: 'usuarios.aprovar',            nome: 'Aprovar Cadastro de Colaborador' },
  { chave: 'usuarios.editar',             nome: 'Editar Usuário' },
  { chave: 'usuarios.alterar_status',     nome: 'Alterar Status de Usuário' },
  { chave: 'usuarios.bloquear',           nome: 'Bloquear/Desbloquear Usuário' },
  { chave: 'usuarios.excluir',            nome: 'Excluir Usuário' },
  { chave: 'setores.visualizar',          nome: 'Visualizar Setores' },
  { chave: 'setores.criar',               nome: 'Criar Setor' },
  { chave: 'setores.editar',              nome: 'Editar Setor' },
  { chave: 'setores.excluir',             nome: 'Excluir Setor' },
  { chave: 'auditoria.visualizar',        nome: 'Visualizar Auditoria' },
  { chave: 'auditoria.exportar',          nome: 'Exportar Auditoria' },
  { chave: 'advertencias.visualizar',     nome: 'Visualizar Advertências' },
  { chave: 'advertencias.solicitar',      nome: 'Solicitar Advertência' },
  { chave: 'advertencias.aplicar',        nome: 'Aplicar Advertência' },
  { chave: 'advertencias.homologar',      nome: 'Homologar Advertência' },
  { chave: 'advertencias.revogar',        nome: 'Revogar Advertência' },
  { chave: 'rh.visualizar',               nome: 'Visualizar Módulo RH' },
  { chave: 'rh.gerenciar',                nome: 'Gerenciar Operações de RH' }
];

// Permissões por perfil (sincronizadas com src/middleware/permissions.js)
const PERFIL_PERMISSOES = FIXED_PROFILE_PERMISSIONS;

// Setores iniciais
const SETORES_INICIAIS = [
  { nome: 'Administração Geral' },
  { nome: 'Recursos Humanos (RH)' },
  { nome: 'Infraestrutura & Redes (TI)' },
  { nome: 'Tecnologia da Informação & Inovação' },
  { nome: 'Operações e Logística' },
  { nome: 'Comunicação e Eventos' },
  { nome: 'Financeiro e Compras' },
  { nome: 'Manutenção Predial' }
];

// Contas de teste para cada cargo do sistema
const USUARIOS_TESTE_POR_CARGO = [
  { nome: 'Administrador Geral (Teste)',       email: 'admin@secult.es.gov.br',           perfil: 'ADMIN',           setor: 'Administração Geral',         isDefaultAdmin: true },
  { nome: 'Administrador Institucional',       email: 'administrador@secult.es.gov.br',   perfil: 'ADMINISTRADOR',   setor: 'Administração Geral' },
  { nome: 'Administração e Pedidos (Teste)',   email: 'administracao@secult.es.gov.br',   perfil: 'ADMINISTRACAO',   setor: 'Financeiro e Compras' },
  { nome: 'Gestor Geral (Teste)',              email: 'gestor@secult.es.gov.br',          perfil: 'GESTOR',          setor: 'Administração Geral' },
  { nome: 'Gestor de RH (Teste)',              email: 'gestor.rh@secult.es.gov.br',       perfil: 'GESTOR_RH',       setor: 'Recursos Humanos (RH)' },
  { nome: 'Analista de RH (Teste)',            email: 'analista.rh@secult.es.gov.br',     perfil: 'ANALISTA_RH',     setor: 'Recursos Humanos (RH)' },
  { nome: 'Assistente de RH (Teste)',          email: 'rh@secult.es.gov.br',              perfil: 'RH',              setor: 'Recursos Humanos (RH)' },
  { nome: 'Gestor de Infra & TI (Teste)',      email: 'gestor.infra@secult.es.gov.br',    perfil: 'GESTOR_INFRA',    setor: 'Infraestrutura & Redes (TI)' },
  { nome: 'Técnico N3 Servidores (Teste)',     email: 'tecnico.n3@secult.es.gov.br',      perfil: 'TECNICO_N3',      setor: 'Infraestrutura & Redes (TI)' },
  { nome: 'Técnico N2 Hardware/Redes (Teste)', email: 'tecnico.n2@secult.es.gov.br',      perfil: 'TECNICO_N2',      setor: 'Infraestrutura & Redes (TI)' },
  { nome: 'Técnico N1 Helpdesk (Teste)',       email: 'tecnico.n1@secult.es.gov.br',      perfil: 'TECNICO_N1',      setor: 'Infraestrutura & Redes (TI)' },
  { nome: 'Técnico de Suporte (Teste)',        email: 'tecnico@secult.es.gov.br',         perfil: 'TECNICO',         setor: 'Infraestrutura & Redes (TI)' },
  { nome: 'Gestor de Operadores (Teste)',      email: 'gestor.operador@secult.es.gov.br', perfil: 'GESTOR_OPERADOR', setor: 'Operações e Logística' },
  { nome: 'Operador Operacional (Teste)',      email: 'operador@secult.es.gov.br',        perfil: 'OPERADOR',        setor: 'Operações e Logística' },
  { nome: 'Colaborador de Limpeza (Teste)',    email: 'limpeza@secult.es.gov.br',         perfil: 'LIMPEZA',         setor: 'Manutenção Predial' }
];

async function seed() {
  console.log('[SEED] Iniciando seed do banco de dados...');
  let conn;
  try {
    conn = await mysql.createConnection(require('../config/database').dbConfig || dbConfig);

    // 1. Inserir setores
    console.log('[SEED] Inserindo setores...');
    for (const s of SETORES_INICIAIS) {
      await conn.query(
        `INSERT IGNORE INTO setores (nome) VALUES (?)`,
        [s.nome]
      );
    }
    const [setoresRows] = await conn.query(`SELECT id, nome FROM setores WHERE deleted_at IS NULL`);
    const setorMap = {};
    for (const s of setoresRows) {
      setorMap[s.nome] = s.id;
    }
    const primeiroSetorId = setoresRows[0]?.id || 1;

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

    // 5. Criar/atualizar usuários de teste para cada cargo
    console.log('[SEED] Criando logins de teste para todos os cargos...');
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@secult.es.gov.br';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Secult2026!';
    const testPassword = process.env.TEST_CARGO_PASSWORD || 'Teste@2026!';

    const senhaAdminHash = await bcrypt.hash(adminPassword, 12);
    const senhaTesteHash = await bcrypt.hash(testPassword, 12);

    for (const conta of USUARIOS_TESTE_POR_CARGO) {
      const emailFinal = conta.isDefaultAdmin ? adminEmail : conta.email;
      const hashFinal = conta.isDefaultAdmin ? senhaAdminHash : senhaTesteHash;
      const setorId = setorMap[conta.setor] || primeiroSetorId;

      const [existing] = await conn.query(
        `SELECT id FROM usuarios WHERE email = ? LIMIT 1`,
        [emailFinal]
      );

      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
           VALUES (?, ?, ?, ?, ?, 'ATIVO')`,
          [conta.nome, emailFinal, hashFinal, conta.perfil, setorId]
        );
        console.log(`[SEED] ✅ Cargo [${conta.perfil}] criado: ${emailFinal}`);
      } else {
        await conn.query(
          `UPDATE usuarios
           SET perfil = ?, setor_id = ?, status = 'ATIVO', deleted_at = NULL, senha = ?
           WHERE id = ?`,
          [conta.perfil, setorId, hashFinal, existing[0].id]
        );
        console.log(`[SEED] 🔄 Cargo [${conta.perfil}] sincronizado e ativo: ${emailFinal}`);
      }
    }

    console.log('[SEED] ✅ Seed concluído com sucesso!');
  } catch (err) {
    console.error('[SEED] ❌ Erro durante o seed:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('[SEED] DICA: IP não autorizado no TiDB Cloud. Adicione seu IP no painel.');
    }
    if (require.main === module) process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

if (require.main === module) { seed(); }
module.exports = { seed, PERMISSOES, PERFIL_PERMISSOES, USUARIOS_TESTE_POR_CARGO };
