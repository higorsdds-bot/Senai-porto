/**
 * HUB ES+ - Rotas de Insumos e Estoque
 * Gerencia insumos e movimentações de estoque (ENTRADA, SAÍDA, AJUSTE).
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// GET /api/v1/insumos
router.get('/', requirePermission('insumos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { setor_id, q, baixo_estoque } = req.query;
    let conds = ['i.deleted_at IS NULL'];
    let params = [];
    if (setor_id) { conds.push('i.setor_id = ?'); params.push(setor_id); }
    if (q) { conds.push('i.nome LIKE ?'); params.push(`%${q}%`); }
    if (baixo_estoque === '1') { conds.push('i.quantidade <= i.estoque_minimo'); }
    const [rows] = await pool.query(
      `SELECT i.id, i.nome, i.descricao, i.quantidade, i.estoque_minimo, i.unidade, i.created_at, i.updated_at,
              i.setor_id, s.nome AS setor_nome,
              CASE WHEN i.quantidade <= i.estoque_minimo THEN 1 ELSE 0 END AS alerta_baixo_estoque
       FROM insumos i
       LEFT JOIN setores s ON s.id = i.setor_id
       WHERE ${conds.join(' AND ')}
       ORDER BY i.nome ASC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[INSUMOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar insumos.' });
  }
});

// GET /api/v1/insumos/:id
router.get('/:id', requirePermission('insumos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT i.id, i.nome, i.descricao, i.quantidade, i.estoque_minimo, i.unidade, i.created_at,
              i.setor_id, s.nome AS setor_nome
       FROM insumos i LEFT JOIN setores s ON s.id = i.setor_id
       WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Insumo não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar insumo.' });
  }
});

// GET /api/v1/insumos/:id/movimentacoes
router.get('/:id/movimentacoes', requirePermission('insumos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT em.id, em.tipo, em.quantidade, em.observacao, em.created_at,
              em.usuario_id, u.nome AS usuario_nome
       FROM estoque_movimentacoes em
       LEFT JOIN usuarios u ON u.id = em.usuario_id
       WHERE em.insumo_id = ?
       ORDER BY em.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao listar movimentações.' });
  }
});

// POST /api/v1/insumos
router.post('/', requirePermission('insumos.criar'), async (req, res) => {
  const { nome, descricao, quantidade, estoque_minimo, unidade, setor_id } = req.body;
  if (!nome || nome.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Nome inválido.', errors: { nome: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    const qtd = parseInt(quantidade) || 0;
    const [result] = await pool.query(
      `INSERT INTO insumos (nome, descricao, quantidade, estoque_minimo, unidade, setor_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [nome.trim(), descricao?.trim() || null, qtd, parseInt(estoque_minimo) || 1, unidade?.trim() || 'unid', setor_id || null]
    );
    // Registrar movimentação inicial se quantidade > 0
    if (qtd > 0) {
      await pool.query(
        `INSERT INTO estoque_movimentacoes (insumo_id, usuario_id, tipo, quantidade, observacao) VALUES (?, ?, 'ENTRADA', ?, ?)`,
        [result.insertId, req.usuario.id, qtd, 'Estoque inicial no cadastro.']
      );
    }
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_INSUMO', entidade: 'insumos', entidade_id: result.insertId, descricao: `Insumo "${nome.trim()}" criado (qtd inicial: ${qtd}).`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Insumo cadastrado.', data: { id: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao cadastrar insumo.' });
  }
});

// PUT /api/v1/insumos/:id
router.put('/:id', requirePermission('insumos.editar'), async (req, res) => {
  const { nome, descricao, estoque_minimo, unidade, setor_id } = req.body;
  if (!nome || nome.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Nome inválido.', errors: { nome: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE insumos SET nome = ?, descricao = ?, estoque_minimo = ?, unidade = ?, setor_id = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [nome.trim(), descricao?.trim() || null, parseInt(estoque_minimo) || 1, unidade?.trim() || 'unid', setor_id || null, req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_INSUMO', entidade: 'insumos', entidade_id: parseInt(req.params.id), descricao: `Insumo #${req.params.id} atualizado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Insumo atualizado.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar insumo.' });
  }
});

// POST /api/v1/insumos/:id/movimentar
router.post('/:id/movimentar', requirePermission('insumos.movimentar'), async (req, res) => {
  const { tipo, quantidade, observacao } = req.body;
  const tiposValidos = ['ENTRADA', 'SAIDA', 'AJUSTE'];
  const erros = {};
  if (!tiposValidos.includes(tipo)) erros.tipo = `Use: ${tiposValidos.join(', ')}`;
  const qtd = parseInt(quantidade);
  if (!qtd || qtd <= 0) erros.quantidade = 'Quantidade deve ser maior que zero.';
  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }
  try {
    const pool = getPool();
    // Verificar estoque atual para SAIDA
    const [insumoRows] = await pool.query(`SELECT nome, quantidade FROM insumos WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [req.params.id]);
    if (!insumoRows.length) return res.status(404).json({ success: false, message: 'Insumo não encontrado.' });
    const insumo = insumoRows[0];

    if (tipo === 'SAIDA' && insumo.quantidade < qtd) {
      return res.status(422).json({
        success: false,
        message: `Estoque insuficiente. Disponível: ${insumo.quantidade} ${qtd > 1 ? 'unidades' : 'unidade'}.`,
        errors: { quantidade: 'Quantidade maior que o estoque disponível.' }
      });
    }

    // Calcular nova quantidade
    let novaQtd;
    if (tipo === 'ENTRADA') novaQtd = insumo.quantidade + qtd;
    else if (tipo === 'SAIDA') novaQtd = insumo.quantidade - qtd;
    else novaQtd = qtd; // AJUSTE = define quantidade diretamente

    await pool.query(`UPDATE insumos SET quantidade = ?, updated_at = NOW() WHERE id = ?`, [novaQtd, req.params.id]);
    await pool.query(
      `INSERT INTO estoque_movimentacoes (insumo_id, usuario_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.usuario.id, tipo, qtd, observacao?.trim() || null]
    );
    await registrarAuditoria({
      usuario_id: req.usuario.id, acao: 'MOVIMENTAR_ESTOQUE', entidade: 'insumos', entidade_id: parseInt(req.params.id),
      descricao: `${tipo} de ${qtd} ${insumo.nome}. Estoque: ${insumo.quantidade} → ${novaQtd}.`,
      ip: getClientIp(req), user_agent: req.headers['user-agent']
    });
    return res.json({ success: true, message: `Movimentação de ${tipo.toLowerCase()} registrada.`, data: { nova_quantidade: novaQtd } });
  } catch (err) {
    console.error('[INSUMOS] MOVIMENTAR:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao movimentar estoque.' });
  }
});

// DELETE /api/v1/insumos/:id
router.delete('/:id', requirePermission('insumos.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE insumos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_INSUMO', entidade: 'insumos', entidade_id: parseInt(req.params.id), descricao: `Insumo #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Insumo removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover insumo.' });
  }
});

module.exports = router;
