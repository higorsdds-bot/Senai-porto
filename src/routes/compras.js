/**
 * HUB ES+ - Rotas de Compras
 * GET    /api/v1/compras
 * GET    /api/v1/compras/:id
 * POST   /api/v1/compras
 * PUT    /api/v1/compras/:id
 * PATCH  /api/v1/compras/:id/status
 * DELETE /api/v1/compras/:id
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { hasPermission, requirePermission, requireAnyPermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

const SELECT_COMPRAS = `
  SELECT c.id, c.produto, c.descricao, c.quantidade, c.valor_estimado, c.status,
         c.justificativa, c.created_at, c.updated_at,
         c.solicitante_id, u.nome AS solicitante_nome,
         c.setor_id, s.nome AS setor_nome
  FROM compras c
  LEFT JOIN usuarios u ON u.id = c.solicitante_id
  LEFT JOIN setores s ON s.id = c.setor_id
  WHERE c.deleted_at IS NULL
`;

// GET /api/v1/compras
router.get('/', requireAnyPermission('compras.visualizar', 'compras.visualizar_pedidos', 'compras.visualizar_proprias'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, setor_id, q } = req.query;
    let conds = ['c.deleted_at IS NULL'];
    let params = [];
    const visualizaTodas = await hasPermission(req.usuario, 'compras.visualizar');
    const visualizaProprias = await hasPermission(req.usuario, 'compras.visualizar_proprias');
    const visualizaPedidos = await hasPermission(req.usuario, 'compras.visualizar_pedidos');
    if (!visualizaTodas && visualizaProprias) {
      conds.push('c.solicitante_id = ?');
      params.push(req.usuario.id);
    } else if (!visualizaTodas && visualizaPedidos) {
      conds.push(`c.status IN ('aprovado', 'entregue')`);
    }

    if (status) { conds.push('c.status = ?'); params.push(status); }
    if (setor_id) { conds.push('c.setor_id = ?'); params.push(setor_id); }
    if (q) { conds.push('c.produto LIKE ?'); params.push(`%${q}%`); }

    const [rows] = await pool.query(
      `SELECT c.id, c.produto, c.descricao, c.quantidade, c.valor_estimado, c.status,
              c.justificativa, c.created_at, c.updated_at,
              c.solicitante_id, u.nome AS solicitante_nome,
              c.setor_id, s.nome AS setor_nome
       FROM compras c
       LEFT JOIN usuarios u ON u.id = c.solicitante_id
       LEFT JOIN setores s ON s.id = c.setor_id
       WHERE ${conds.join(' AND ')}
       ORDER BY c.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[COMPRAS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar compras.' });
  }
});

// GET /api/v1/compras/:id
router.get('/:id', requireAnyPermission('compras.visualizar', 'compras.visualizar_pedidos', 'compras.visualizar_proprias'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.id, c.produto, c.descricao, c.quantidade, c.valor_estimado, c.status,
              c.justificativa, c.created_at, c.updated_at,
              c.solicitante_id, u.nome AS solicitante_nome,
              c.setor_id, s.nome AS setor_nome
       FROM compras c
       LEFT JOIN usuarios u ON u.id = c.solicitante_id
       LEFT JOIN setores s ON s.id = c.setor_id
       WHERE c.id = ? AND c.deleted_at IS NULL
         AND (
           ? = 1
           OR (? = 1 AND c.solicitante_id = ?)
           OR (? = 1 AND c.status IN ('aprovado', 'entregue'))
         ) LIMIT 1`,
      [
        req.params.id,
        (await hasPermission(req.usuario, 'compras.visualizar')) ? 1 : 0,
        (await hasPermission(req.usuario, 'compras.visualizar_proprias')) ? 1 : 0,
        req.usuario.id,
        (await hasPermission(req.usuario, 'compras.visualizar_pedidos')) ? 1 : 0
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Compra não encontrada.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar compra.' });
  }
});

// POST /api/v1/compras
router.post('/', requirePermission('compras.criar'), async (req, res) => {
  const { produto, descricao, quantidade, valor_estimado, setor_id } = req.body;
  const isAdminGeral = ['ADMIN', 'ADMINISTRADOR'].includes(String(req.usuario.perfil).toUpperCase());
  const statusInicial = isAdminGeral ? 'aprovado' : 'pendente';
  const qtd = quantidade == null ? 1 : Number(quantidade);
  if (typeof produto !== 'string' || produto.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Produto inválido.', errors: { produto: 'Mínimo 3 caracteres.' } });
  }
  if (!Number.isInteger(qtd) || qtd < 1) {
    return res.status(422).json({ success: false, message: 'Quantidade inválida.', errors: { quantidade: 'Informe um inteiro maior que zero.' } });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO compras (produto, descricao, quantidade, valor_estimado, solicitante_id, setor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        produto.trim(),
        descricao?.trim() || null,
        qtd,
        valor_estimado || null,
        req.usuario.id,
        (await hasPermission(req.usuario, 'compras.visualizar_proprias')) &&
          !(await hasPermission(req.usuario, 'compras.visualizar'))
          ? req.usuario.setor_id
          : (setor_id || req.usuario.setor_id || null),
        statusInicial
      ]
    );
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: isAdminGeral ? 'GERAR_PEDIDO_COMPRA' : 'SOLICITAR_COMPRA',
      entidade: 'compras',
      entidade_id: result.insertId,
      descricao: `${isAdminGeral ? 'Pedido' : 'Solicitação'} "${produto.trim()}" criada.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });
    return res.status(201).json({
      success: true,
      message: isAdminGeral ? 'Pedido de compra gerado para entrada.' : 'Solicitação de compra criada.',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[COMPRAS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar compra.' });
  }
});

// PUT /api/v1/compras/:id
router.put('/:id', requirePermission('compras.editar'), async (req, res) => {
  const { produto, descricao, quantidade, valor_estimado, setor_id, justificativa } = req.body;
  if (!produto || produto.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Produto inválido.', errors: { produto: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE compras SET produto = ?, descricao = ?, quantidade = ?, valor_estimado = ?, setor_id = ?, justificativa = ?, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [produto.trim(), descricao?.trim() || null, quantidade || 1, valor_estimado || null, setor_id || null, justificativa?.trim() || null, req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_COMPRA', entidade: 'compras', entidade_id: parseInt(req.params.id), descricao: `Compra #${req.params.id} editada.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Compra atualizada.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar compra.' });
  }
});

// PATCH /api/v1/compras/:id/status
router.patch('/:id/status', requirePermission('compras.aprovar'), async (req, res) => {
  const { status } = req.body;
  const validos = ['pendente', 'aprovado', 'entregue', 'cancelado'];
  if (!validos.includes(status)) {
    return res.status(422).json({ success: false, message: 'Status inválido.', errors: { status: `Use: ${validos.join(', ')}` } });
  }
  try {
    const pool = getPool();
    // Buscar status atual para auditoria
    const [current] = await pool.query(`SELECT status, produto FROM compras WHERE id = ? LIMIT 1`, [req.params.id]);
    await pool.query(`UPDATE compras SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [status, req.params.id]);
    await registrarAuditoria({
      usuario_id: req.usuario.id, acao: 'ALTERAR_STATUS_COMPRA', entidade: 'compras', entidade_id: parseInt(req.params.id),
      descricao: `Status da compra "${current[0]?.produto}" alterado de "${current[0]?.status}" para "${status}".`,
      ip: getClientIp(req), user_agent: req.headers['user-agent']
    });
    return res.json({ success: true, message: `Status alterado para ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// Administração registra a entrada apenas de pedidos previamente aprovados.
router.patch('/:id/entrada', requirePermission('compras.receber'), async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE compras
       SET status = 'entregue', updated_at = NOW()
       WHERE id = ? AND status = 'aprovado' AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: 'A entrada só pode ser registrada para um pedido aprovado e ainda não recebido.'
      });
    }

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REGISTRAR_ENTRADA_COMPRA',
      entidade: 'compras',
      entidade_id: parseInt(req.params.id, 10),
      descricao: `Entrada do pedido #${req.params.id} registrada.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });
    return res.json({ success: true, message: 'Entrada do pedido registrada.' });
  } catch (err) {
    console.error('[COMPRAS] ENTRADA:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao registrar entrada do pedido.' });
  }
});

// DELETE /api/v1/compras/:id (soft delete)
router.delete('/:id', requirePermission('compras.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE compras SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_COMPRA', entidade: 'compras', entidade_id: parseInt(req.params.id), descricao: `Compra #${req.params.id} removida.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Compra removida.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover compra.' });
  }
});

module.exports = router;
