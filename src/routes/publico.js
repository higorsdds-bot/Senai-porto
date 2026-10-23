/**
 * HUB ES+ - Rotas Públicas (Sem Autenticação)
 * Endpoints acessíveis por visitantes sem necessidade de login.
 * Apenas leitura (GET) de comunicados e eventos.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// GET /api/v1/publico/comunicados — Lista comunicados ativos (somente leitura)
router.get('/comunicados', async (req, res) => {
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
    console.error('[PUBLICO/COMUNICADOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar comunicados.' });
  }
});

// GET /api/v1/publico/comunicados/:id — Detalhe de um comunicado
router.get('/comunicados/:id', async (req, res) => {
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

// GET /api/v1/publico/eventos — Lista eventos ativos (somente leitura)
router.get('/eventos', async (req, res) => {
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
    console.error('[PUBLICO/EVENTOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar eventos.' });
  }
});

// GET /api/v1/publico/eventos/:id — Detalhe de um evento
router.get('/eventos/:id', async (req, res) => {
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

module.exports = router;
