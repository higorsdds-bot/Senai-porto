/**
 * HUB ES+ - Rotas de Setores
 * GET    /api/v1/setores
 * GET    /api/v1/setores/:id
 * POST   /api/v1/setores
 * PUT    /api/v1/setores/:id
 * DELETE /api/v1/setores/:id
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// GET /api/v1/setores
router.get('/', requirePermission('setores.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, nome, descricao, created_at FROM setores WHERE deleted_at IS NULL ORDER BY nome ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[SETORES] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar setores.' });
  }
});

// GET /api/v1/setores/:id
router.get('/:id', requirePermission('setores.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, nome, descricao, created_at FROM setores WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Setor não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar setor.' });
  }
});

// POST /api/v1/setores
router.post('/', requirePermission('setores.criar'), async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome || nome.trim().length < 2) {
    return res.status(422).json({ success: false, message: 'Nome do setor é obrigatório.', errors: { nome: 'Mínimo 2 caracteres.' } });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO setores (nome, descricao) VALUES (?, ?)`,
      [nome.trim(), descricao?.trim() || null]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_SETOR', entidade: 'setores', entidade_id: result.insertId, descricao: `Setor "${nome.trim()}" criado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Setor criado.', data: { id: result.insertId } });
  } catch (err) {
    console.error('[SETORES] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar setor.' });
  }
});

// PUT /api/v1/setores/:id
router.put('/:id', requirePermission('setores.editar'), async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome || nome.trim().length < 2) {
    return res.status(422).json({ success: false, message: 'Nome inválido.', errors: { nome: 'Mínimo 2 caracteres.' } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE setores SET nome = ?, descricao = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [nome.trim(), descricao?.trim() || null, req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_SETOR', entidade: 'setores', entidade_id: parseInt(req.params.id), descricao: `Setor #${req.params.id} atualizado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Setor atualizado.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar setor.' });
  }
});

// DELETE /api/v1/setores/:id (soft delete)
router.delete('/:id', requirePermission('setores.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE setores SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_SETOR', entidade: 'setores', entidade_id: parseInt(req.params.id), descricao: `Setor #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Setor removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover setor.' });
  }
});

module.exports = router;
