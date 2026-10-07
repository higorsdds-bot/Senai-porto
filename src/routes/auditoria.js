/**
 * HUB ES+ - Rotas de Auditoria e Governança
 * Acesso ESTRITAMENTE restrito a usuários com permissão ADMIN consultada diretamente do banco de dados.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

// Exige autenticação básica
router.use(authMiddleware);

/**
 * Middleware estrito: consulta o perfil do usuário DIRETAMENTE no banco de dados.
 * Garante que apenas usuários com perfil ADMIN/ADMINISTRADOR ativo acessem.
 */
async function requireAdminDirect(req, res, next) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status
       FROM usuarios u
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.usuario.id]
    );

    if (!rows.length || rows[0].status !== 'ATIVO') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Usuário inexistente ou inativo.'
      });
    }

    const perfil = String(rows[0].perfil).toUpperCase();
    if (perfil !== 'ADMIN' && perfil !== 'ADMINISTRADOR') {
      return res.status(403).json({
        success: false,
        message: 'Acesso restrito. Este módulo requer perfil de Administrador consultado diretamente no banco.'
      });
    }

    req.adminUsuario = rows[0];
    next();
  } catch (err) {
    console.error('[AUDITORIA] Erro na validação de permissão de admin:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao validar privilégios de administrador.'
    });
  }
}

// Aplica a validação estrita em todas as rotas de auditoria
router.use(requireAdminDirect);

// ─── GET /api/v1/auditoria/usuarios-online ───────────────────────────────────
// Lista usuários conectados em tempo real (último heartbeat nos últimos 5 minutos)
router.get('/usuarios-online', async (req, res) => {
  try {
    const pool = getPool();
    const ONLINE_THRESHOLD = 5; // minutos

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.ultimo_acesso, u.ultimo_heartbeat,
              s.nome AS setor_nome,
              TIMESTAMPDIFF(SECOND, u.ultimo_heartbeat, NOW()) AS segundos_desde_heartbeat
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.deleted_at IS NULL
         AND u.status = 'ATIVO'
         AND u.ultimo_heartbeat >= NOW() - INTERVAL ${ONLINE_THRESHOLD} MINUTE
       ORDER BY u.ultimo_heartbeat DESC`
    );

    return res.json({
      success: true,
      data: rows,
      total_online: rows.length
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao buscar usuários online:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuários online.' });
  }
});

// ─── GET /api/v1/auditoria/usuarios ──────────────────────────────────────────
// Listagem geral de todos os usuários cadastrados e contagem de ações de auditoria
router.get('/usuarios', async (req, res) => {
  try {
    const pool = getPool();
    const { status, perfil, q } = req.query;

    let conds = ['u.deleted_at IS NULL'];
    let params = [];

    if (status) { conds.push('u.status = ?'); params.push(status); }
    if (perfil) { conds.push('u.perfil = ?'); params.push(perfil); }
    if (q) {
      conds.push('(u.nome LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where = conds.join(' AND ');

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.created_at,
              u.ultimo_acesso, u.ultimo_heartbeat,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL 5 MINUTE THEN 1 ELSE 0 END AS online,
              (SELECT COUNT(*) FROM auditoria a WHERE a.usuario_id = u.id) AS total_acoes,
              (SELECT a.created_at FROM auditoria a WHERE a.usuario_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_acao_data
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao listar usuários:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
  }
});

// ─── GET /api/v1/auditoria/usuarios/:id/historico ────────────────────────────
// Histórico e registro de ações realizadas por um usuário específico
router.get('/usuarios/:id/historico', async (req, res) => {
  try {
    const pool = getPool();
    const usuarioId = req.params.id;

    // Confere se o usuário existe
    const [userRows] = await pool.query(
      `SELECT id, nome, email, perfil, status, created_at, ultimo_acesso
       FROM usuarios WHERE id = ? LIMIT 1`,
      [usuarioId]
    );

    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const [acoes] = await pool.query(
      `SELECT id, acao, entidade, entidade_id, descricao, ip, user_agent, created_at
       FROM auditoria
       WHERE usuario_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [usuarioId]
    );

    return res.json({
      success: true,
      data: {
        usuario: userRows[0],
        acoes
      }
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao buscar histórico do usuário:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar histórico do usuário.' });
  }
});

// ─── GET /api/v1/auditoria/solicitacoes-pendentes ─────────────────────────────
// Lista cadastros com status PENDENTE aguardando aprovação
router.get('/solicitacoes-pendentes', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.created_at,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.status = 'PENDENTE' AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC`
    );

    return res.json({ success: true, data: rows, total_pendentes: rows.length });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao listar solicitações pendentes:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar solicitações.' });
  }
});

// ─── POST /api/v1/auditoria/solicitacoes/:id/aprovar ─────────────────────────
// Aprova solicitação de cadastro liberando o acesso
router.post('/solicitacoes/:id/aprovar', async (req, res) => {
  const { perfil, setor_id } = req.body;
  const id = req.params.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const perfisPermitidos = ['ADMIN', 'GESTOR', 'OPERADOR', 'ADMINISTRACAO', 'LIMPEZA'];
    const perfilFinal = perfil && perfisPermitidos.includes(perfil) ? perfil : 'OPERADOR';

    await pool.query(
      `UPDATE usuarios
       SET status = 'ATIVO',
           perfil = ?,
           setor_id = COALESCE(?, setor_id),
           updated_at = NOW()
       WHERE id = ?`,
      [perfilFinal, setor_id || null, id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'APROVAR_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Cadastro do usuário "${user[0].nome}" (${user[0].email}) foi APROVADO com perfil ${perfilFinal}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Acesso do usuário "${user[0].nome}" aprovado com sucesso!`
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao aprovar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao aprovar solicitação.' });
  }
});

// ─── POST /api/v1/auditoria/solicitacoes/:id/rejeitar ────────────────────────
// Rejeita solicitação de cadastro
router.post('/solicitacoes/:id/rejeitar', async (req, res) => {
  const { motivo } = req.body;
  const id = req.params.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    await pool.query(
      `UPDATE usuarios
       SET status = 'INATIVO',
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REJEITAR_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Solicitação do usuário "${user[0].nome}" (${user[0].email}) foi REJEITADA.${motivo ? ` Motivo: ${motivo}` : ''}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Solicitação do usuário "${user[0].nome}" foi rejeitada.`
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao rejeitar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar solicitação.' });
  }
});

// ─── GET /api/v1/auditoria ────────────────────────────────────────────────────
// Listagem geral de logs de auditoria do sistema
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { usuario_id, acao, entidade, data_inicio, data_fim, q } = req.query;
    let page = Math.max(parseInt(req.query.page) || 1, 1);
    let limit = Math.min(parseInt(req.query.limit) || 50, 200);
    let offset = (page - 1) * limit;

    let conds = ['1=1'];
    let params = [];
    if (usuario_id) { conds.push('a.usuario_id = ?'); params.push(usuario_id); }
    if (acao) { conds.push('a.acao LIKE ?'); params.push(`%${acao}%`); }
    if (entidade) { conds.push('a.entidade = ?'); params.push(entidade); }
    if (data_inicio) { conds.push('DATE(a.created_at) >= ?'); params.push(data_inicio); }
    if (data_fim) { conds.push('DATE(a.created_at) <= ?'); params.push(data_fim); }
    if (q) { conds.push('(a.descricao LIKE ? OR a.acao LIKE ? OR u.nome LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const where = conds.join(' AND ');

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT a.id, a.acao, a.entidade, a.entidade_id, a.descricao, a.ip, a.created_at,
              a.usuario_id, u.nome AS usuario_nome, u.email AS usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[AUDITORIA] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar auditoria.' });
  }
});

module.exports = router;
