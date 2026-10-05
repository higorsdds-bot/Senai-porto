/**
 * HUB ES+ - Rotas de Auditoria
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authMiddleware);

// GET /api/v1/auditoria
router.get('/', requirePermission('auditoria.visualizar'), async (req, res) => {
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
    if (q) { conds.push('(a.descricao LIKE ? OR a.acao LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const where = conds.join(' AND ');

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria a WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT a.id, a.acao, a.entidade, a.entidade_id, a.descricao, a.ip, a.created_at,
              a.usuario_id, u.nome AS usuario_nome
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
