/**
 * HUB ES+ - Rotas de Comunicados
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// GET /api/v1/comunicados
router.get('/', requirePermission('comunicados.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { prioridade, destinatario_perfil, q } = req.query;
    const perfilUsuario = String(req.usuario.perfil || '').toUpperCase().trim();
    const ehAdminOuGestorGeral = ['ADMIN', 'ADMINISTRADOR', 'GESTOR'].includes(perfilUsuario);

    let conds = ['c.deleted_at IS NULL'];
    let params = [];

    // RBAC: Usuários não-admin visualizam comunicados direcionados a 'TODOS', ao seu perfil específico,
    // ao seu grupo hierárquico (ex: GESTOR_* vê GESTOR; TECNICO_* vê TECNICO/OPERADOR) ou criados por eles
    if (!ehAdminOuGestorGeral) {
      const perfisEquivalentes = [perfilUsuario];
      if (perfilUsuario.startsWith('GESTOR_')) perfisEquivalentes.push('GESTOR');
      if (perfilUsuario.startsWith('TECNICO')) perfisEquivalentes.push('TECNICO', 'OPERADOR');
      if (['ANALISTA_RH', 'RH'].includes(perfilUsuario)) perfisEquivalentes.push('RH', 'OPERADOR');
      if (perfilUsuario === 'ADMINISTRACAO') perfisEquivalentes.push('ADMINISTRADOR', 'OPERADOR');

      const placeholders = perfisEquivalentes.map(() => '?').join(', ');
      conds.push(`(c.destinatario_perfil = 'TODOS' OR c.destinatario_perfil IS NULL OR c.destinatario_perfil IN (${placeholders}) OR c.autor_id = ?)`);
      params.push(...perfisEquivalentes, req.usuario.id);
    }

    // Filtro por destinatario_perfil
    if (destinatario_perfil && destinatario_perfil !== 'TODOS_FILTRO') {
      conds.push('c.destinatario_perfil = ?');
      params.push(destinatario_perfil);
    }

    if (prioridade) {
      conds.push('c.prioridade = ?');
      params.push(prioridade);
    }

    if (q) {
      conds.push('(c.titulo LIKE ? OR c.mensagem LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.destinatario_perfil, c.created_at, c.updated_at,
              c.autor_id, u.nome AS autor_nome, u.perfil AS autor_perfil
       FROM comunicados c
       LEFT JOIN usuarios u ON u.id = c.autor_id
       WHERE ${conds.join(' AND ')}
       ORDER BY c.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[COMUNICADOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar comunicados.' });
  }
});

// GET /api/v1/comunicados/:id
router.get('/:id', requirePermission('comunicados.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.destinatario_perfil, c.created_at, c.autor_id, u.nome AS autor_nome
       FROM comunicados c LEFT JOIN usuarios u ON u.id = c.autor_id
       WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Comunicado não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar comunicado.' });
  }
});

// POST /api/v1/comunicados
router.post('/', requirePermission('comunicados.criar'), async (req, res) => {
  const { titulo, mensagem, prioridade, destinatario_perfil } = req.body;
  const erros = {};
  if (!titulo || titulo.trim().length < 3) erros.titulo = 'Título deve ter ao menos 3 caracteres.';
  if (!mensagem || mensagem.trim().length < 3) erros.mensagem = 'Mensagem deve ter ao menos 3 caracteres.';
  
  const prioridadeNorm = String(prioridade || 'normal').toLowerCase();
  const prioridades = ['alta', 'media', 'normal'];
  if (prioridadeNorm && !prioridades.includes(prioridadeNorm)) erros.prioridade = `Prioridade deve ser: ${prioridades.join(', ')}`;

  const perfisValidos = [
    'TODOS', 'ADMIN', 'ADMINISTRADOR', 'ADMINISTRACAO',
    'GESTOR', 'GESTOR_RH', 'GESTOR_INFRA', 'GESTOR_OPERADOR',
    'ANALISTA_RH', 'RH',
    'TECNICO_N3', 'TECNICO_N2', 'TECNICO_N1', 'TECNICO',
    'OPERADOR', 'LIMPEZA'
  ];
  const perfilDest = (destinatario_perfil && perfisValidos.includes(destinatario_perfil.toUpperCase()))
    ? destinatario_perfil.toUpperCase()
    : 'TODOS';

  if (Object.keys(erros).length > 0) {
    const detalhe = Object.values(erros).join(' ');
    return res.status(422).json({ success: false, message: detalhe || 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO comunicados (titulo, mensagem, prioridade, destinatario_perfil, autor_id) VALUES (?, ?, ?, ?, ?)`,
      [titulo.trim(), mensagem.trim(), prioridade || 'normal', perfilDest, req.usuario.id]
    );
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'CRIAR_COMUNICADO',
      entidade: 'comunicados',
      entidade_id: result.insertId,
      descricao: `Comunicado "${titulo.trim()}" publicado para [${perfilDest}].`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });
    return res.status(201).json({ success: true, message: 'Comunicado publicado.', data: { id: result.insertId } });
  } catch (err) {
    console.error('[COMUNICADOS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao publicar comunicado.' });
  }
});

// DELETE /api/v1/comunicados/:id
router.delete('/:id', requirePermission('comunicados.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE comunicados SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_COMUNICADO', entidade: 'comunicados', entidade_id: parseInt(req.params.id), descricao: `Comunicado #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Comunicado removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover comunicado.' });
  }
});

module.exports = router;
