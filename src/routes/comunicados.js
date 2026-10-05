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
    const { prioridade, q } = req.query;
    let conds = ['c.deleted_at IS NULL'];
    let params = [];
    if (prioridade) { conds.push('c.prioridade = ?'); params.push(prioridade); }
    if (q) { conds.push('(c.titulo LIKE ? OR c.mensagem LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.created_at, c.updated_at,
              c.autor_id, u.nome AS autor_nome
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
      `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.created_at, c.autor_id, u.nome AS autor_nome
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
  const { titulo, mensagem, prioridade } = req.body;
  const erros = {};
  if (!titulo || titulo.trim().length < 5) erros.titulo = 'Título inválido (mínimo 5 caracteres).';
  if (!mensagem || mensagem.trim().length < 10) erros.mensagem = 'Mensagem inválida (mínimo 10 caracteres).';
  const prioridades = ['alta', 'media', 'normal'];
  if (prioridade && !prioridades.includes(prioridade)) erros.prioridade = `Use: ${prioridades.join(', ')}`;
  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO comunicados (titulo, mensagem, prioridade, autor_id) VALUES (?, ?, ?, ?)`,
      [titulo.trim(), mensagem.trim(), prioridade || 'normal', req.usuario.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_COMUNICADO', entidade: 'comunicados', entidade_id: result.insertId, descricao: `Comunicado "${titulo.trim()}" publicado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Comunicado publicado.', data: { id: result.insertId } });
  } catch (err) {
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
