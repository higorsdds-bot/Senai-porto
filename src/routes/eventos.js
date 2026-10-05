/**
 * HUB ES+ - Rotas de Eventos (Agenda)
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// GET /api/v1/eventos
router.get('/', requirePermission('eventos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, q } = req.query;
    let conds = ['e.deleted_at IS NULL'];
    let params = [];
    if (status) { conds.push('e.status = ?'); params.push(status); }
    if (q) { conds.push('(e.titulo LIKE ? OR e.local LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT e.id, e.titulo, e.local, e.descricao, e.data, e.data_fim, e.status, e.created_at,
              e.responsavel_id, u.nome AS responsavel_nome
       FROM eventos e
       LEFT JOIN usuarios u ON u.id = e.responsavel_id
       WHERE ${conds.join(' AND ')}
       ORDER BY e.data ASC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[EVENTOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar eventos.' });
  }
});

// GET /api/v1/eventos/:id
router.get('/:id', requirePermission('eventos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT e.id, e.titulo, e.local, e.descricao, e.data, e.data_fim, e.status, e.created_at,
              e.responsavel_id, u.nome AS responsavel_nome
       FROM eventos e LEFT JOIN usuarios u ON u.id = e.responsavel_id
       WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar evento.' });
  }
});

// POST /api/v1/eventos
router.post('/', requirePermission('eventos.criar'), async (req, res) => {
  const { titulo, local, descricao, data, data_fim, responsavel_id, status } = req.body;
  const erros = {};
  if (!local || local.trim().length < 3) erros.local = 'Local inválido (mínimo 3 caracteres).';
  if (!data) erros.data = 'Data do evento é obrigatória.';
  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO eventos (titulo, local, descricao, data, data_fim, responsavel_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo?.trim() || null, local.trim(), descricao?.trim() || null, data, data_fim || null, responsavel_id || req.usuario.id, status || 'agendado']
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_EVENTO', entidade: 'eventos', entidade_id: result.insertId, descricao: `Evento "${titulo || local}" criado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Evento criado.', data: { id: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao criar evento.' });
  }
});

// PUT /api/v1/eventos/:id
router.put('/:id', requirePermission('eventos.editar'), async (req, res) => {
  const { titulo, local, descricao, data, data_fim, responsavel_id, status } = req.body;
  if (!local || local.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }
  if (!data) {
    return res.status(422).json({ success: false, message: 'Data obrigatória.', errors: { data: 'Campo obrigatório.' } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE eventos SET titulo = ?, local = ?, descricao = ?, data = ?, data_fim = ?, responsavel_id = ?, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [titulo?.trim() || null, local.trim(), descricao?.trim() || null, data, data_fim || null, responsavel_id || null, status || 'agendado', req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_EVENTO', entidade: 'eventos', entidade_id: parseInt(req.params.id), descricao: `Evento #${req.params.id} atualizado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Evento atualizado.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar evento.' });
  }
});

// DELETE /api/v1/eventos/:id
router.delete('/:id', requirePermission('eventos.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE eventos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_EVENTO', entidade: 'eventos', entidade_id: parseInt(req.params.id), descricao: `Evento #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Evento removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover evento.' });
  }
});

module.exports = router;
