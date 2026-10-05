/**
 * HUB ES+ - Rotas de Limpeza, Ocorrências, Eventos, Equipamentos, Insumos, Comunicados, Auditoria e Dashboard
 * Agrupados por recurso em arquivos separados conforme o padrão REST.
 */

// ── LIMPEZA ──────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// GET /api/v1/limpeza
router.get('/', requirePermission('limpeza.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, q } = req.query;
    let conds = ['l.deleted_at IS NULL'];
    let params = [];
    if (status) { conds.push('l.status = ?'); params.push(status); }
    if (q) { conds.push('l.local LIKE ?'); params.push(`%${q}%`); }
    const [rows] = await pool.query(
      `SELECT l.id, l.local, l.descricao, l.status, l.data_prevista, l.created_at, l.updated_at,
              l.responsavel_id, u.nome AS responsavel_nome
       FROM limpeza l
       LEFT JOIN usuarios u ON u.id = l.responsavel_id
       WHERE ${conds.join(' AND ')}
       ORDER BY l.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[LIMPEZA] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar tarefas de limpeza.' });
  }
});

// GET /api/v1/limpeza/:id
router.get('/:id', requirePermission('limpeza.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT l.id, l.local, l.descricao, l.status, l.data_prevista, l.created_at,
              l.responsavel_id, u.nome AS responsavel_nome
       FROM limpeza l LEFT JOIN usuarios u ON u.id = l.responsavel_id
       WHERE l.id = ? AND l.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar registro.' });
  }
});

// POST /api/v1/limpeza
router.post('/', requirePermission('limpeza.criar'), async (req, res) => {
  const { local, descricao, responsavel_id, data_prevista, status } = req.body;
  if (!local || local.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO limpeza (local, descricao, responsavel_id, data_prevista, status) VALUES (?, ?, ?, ?, ?)`,
      [local.trim(), descricao?.trim() || null, responsavel_id || null, data_prevista || null, status || 'pendente']
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_LIMPEZA', entidade: 'limpeza', entidade_id: result.insertId, descricao: `Tarefa de limpeza no local "${local.trim()}" criada.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Tarefa de limpeza criada.', data: { id: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao criar tarefa.' });
  }
});

// PUT /api/v1/limpeza/:id
router.put('/:id', requirePermission('limpeza.editar'), async (req, res) => {
  const { local, descricao, responsavel_id, data_prevista, status } = req.body;
  if (!local || local.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE limpeza SET local = ?, descricao = ?, responsavel_id = ?, data_prevista = ?, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [local.trim(), descricao?.trim() || null, responsavel_id || null, data_prevista || null, status || 'pendente', req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_LIMPEZA', entidade: 'limpeza', entidade_id: parseInt(req.params.id), descricao: `Tarefa de limpeza #${req.params.id} editada.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Tarefa atualizada.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar tarefa.' });
  }
});

// DELETE /api/v1/limpeza/:id
router.delete('/:id', requirePermission('limpeza.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE limpeza SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_LIMPEZA', entidade: 'limpeza', entidade_id: parseInt(req.params.id), descricao: `Limpeza #${req.params.id} removida.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Tarefa removida.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover tarefa.' });
  }
});

module.exports = router;
