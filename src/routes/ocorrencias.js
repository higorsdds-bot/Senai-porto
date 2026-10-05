/**
 * HUB ES+ - Rotas de Ocorrências (com upload de foto)
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

// ─── Configuração do Multer (fotos das ocorrências) ──────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'ocorrencias');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const nome = `ocor_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (permitidos.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Formato de arquivo não permitido. Use JPG, PNG ou WebP.'));
  }
});

router.use(authMiddleware);

// GET /api/v1/ocorrencias
router.get('/', requirePermission('ocorrencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, q } = req.query;
    let conds = ['o.deleted_at IS NULL'];
    let params = [];
    if (status) { conds.push('o.status = ?'); params.push(status); }
    if (q) { conds.push('(o.local LIKE ? OR o.descricao LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT o.id, o.local, o.descricao, o.tipo, o.status, o.foto_url, o.created_at, o.updated_at,
              o.usuario_id, u1.nome AS usuario_nome,
              o.responsavel_id, u2.nome AS responsavel_nome
       FROM ocorrencias o
       LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
       LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
       WHERE ${conds.join(' AND ')}
       ORDER BY o.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[OCORRENCIAS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar ocorrências.' });
  }
});

// GET /api/v1/ocorrencias/:id
router.get('/:id', requirePermission('ocorrencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.id, o.local, o.descricao, o.tipo, o.status, o.foto_url, o.created_at,
              o.usuario_id, u1.nome AS usuario_nome,
              o.responsavel_id, u2.nome AS responsavel_nome
       FROM ocorrencias o
       LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
       LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
       WHERE o.id = ? AND o.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar ocorrência.' });
  }
});

// POST /api/v1/ocorrencias (aceita multipart/form-data com campo "foto")
router.post('/', requirePermission('ocorrencias.criar'), upload.single('foto'), async (req, res) => {
  const { local, descricao, tipo, responsavel_id } = req.body;
  if (!local || String(local).trim().length < 3) {
    if (req.file) fs.unlink(req.file.path, () => { });
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }

  let foto_url = null;
  if (req.file) {
    foto_url = `/uploads/ocorrencias/${req.file.filename}`;
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO ocorrencias (local, descricao, tipo, foto_url, usuario_id, responsavel_id, status) VALUES (?, ?, ?, ?, ?, ?, 'aberto')`,
      [String(local).trim(), descricao?.trim() || null, tipo?.trim() || null, foto_url, req.usuario.id, responsavel_id || null]
    );
    await registrarAuditoria({
      usuario_id: req.usuario.id, acao: 'CRIAR_OCORRENCIA', entidade: 'ocorrencias',
      entidade_id: result.insertId, descricao: `Ocorrência no local "${String(local).trim()}" registrada${foto_url ? ' com foto' : ''}.`,
      ip: getClientIp(req), user_agent: req.headers['user-agent']
    });
    return res.status(201).json({ success: true, message: 'Ocorrência registrada.', data: { id: result.insertId, foto_url } });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => { });
    console.error('[OCORRENCIAS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar ocorrência.' });
  }
});

// PUT /api/v1/ocorrencias/:id
router.put('/:id', requirePermission('ocorrencias.editar'), async (req, res) => {
  const { local, descricao, tipo, responsavel_id, status } = req.body;
  if (!local || String(local).trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }
  const statusValidos = ['aberto', 'em_andamento', 'resolvido'];
  if (status && !statusValidos.includes(status)) {
    return res.status(422).json({ success: false, message: 'Status inválido.', errors: { status: `Use: ${statusValidos.join(', ')}` } });
  }
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE ocorrencias SET local = ?, descricao = ?, tipo = ?, responsavel_id = ?, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [String(local).trim(), descricao?.trim() || null, tipo?.trim() || null, responsavel_id || null, status || 'aberto', req.params.id]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: parseInt(req.params.id), descricao: `Ocorrência #${req.params.id} editada.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Ocorrência atualizada.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar ocorrência.' });
  }
});

// PATCH /api/v1/ocorrencias/:id/status
router.patch('/:id/status', requirePermission('ocorrencias.editar'), async (req, res) => {
  const { status } = req.body;
  const validos = ['aberto', 'em_andamento', 'resolvido'];
  if (!validos.includes(status)) {
    return res.status(422).json({ success: false, message: 'Status inválido.' });
  }
  try {
    const pool = getPool();
    const [current] = await pool.query(`SELECT status FROM ocorrencias WHERE id = ? LIMIT 1`, [req.params.id]);
    await pool.query(`UPDATE ocorrencias SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [status, req.params.id]);
    await registrarAuditoria({
      usuario_id: req.usuario.id, acao: 'ALTERAR_STATUS_OCORRENCIA', entidade: 'ocorrencias', entidade_id: parseInt(req.params.id),
      descricao: `Status da ocorrência #${req.params.id} de "${current[0]?.status}" para "${status}".`,
      ip: getClientIp(req), user_agent: req.headers['user-agent']
    });
    return res.json({ success: true, message: `Status alterado para ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// DELETE /api/v1/ocorrencias/:id
router.delete('/:id', requirePermission('ocorrencias.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    // Remove o arquivo físico da foto, se existir
    const [rows] = await pool.query(`SELECT foto_url FROM ocorrencias WHERE id = ? LIMIT 1`, [req.params.id]);
    await pool.query(`UPDATE ocorrencias SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    if (rows[0]?.foto_url) {
      const arquivo = path.join(__dirname, '..', '..', rows[0].foto_url.replace('/uploads/', process.env.UPLOAD_DIR || 'uploads/'));
      fs.unlink(arquivo, () => { });
    }
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: parseInt(req.params.id), descricao: `Ocorrência #${req.params.id} removida.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Ocorrência removida.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover ocorrência.' });
  }
});

module.exports = router;