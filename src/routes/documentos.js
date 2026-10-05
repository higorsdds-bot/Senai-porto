/**
 * HUB ES+ - Rotas de Documentos com Upload de Arquivo
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// Diretório de documentos
const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'documentos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '20971520', 10); // 20MB default
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.jpg', '.jpeg', '.png', '.odt', '.ods'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nome = `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${ext}. Permitidos: ${ALLOWED_EXTS.join(', ')}`));
    }
  }
});

// GET /api/v1/documentos
router.get('/', requirePermission('documentos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, setor_id, q } = req.query;
    let conds = ['d.deleted_at IS NULL'];
    let params = [];
    if (status) { conds.push('d.status = ?'); params.push(status); }
    if (setor_id) { conds.push('d.setor_id = ?'); params.push(setor_id); }
    if (q) { conds.push('d.titulo LIKE ?'); params.push(`%${q}%`); }
    const [rows] = await pool.query(
      `SELECT d.id, d.titulo, d.descricao, d.nome_original, d.caminho, d.mime_type, d.tamanho, d.extensao, d.status, d.created_at,
              d.setor_id, s.nome AS setor_nome,
              d.responsavel_id, u.nome AS responsavel_nome
       FROM documentos d
       LEFT JOIN setores s ON s.id = d.setor_id
       LEFT JOIN usuarios u ON u.id = d.responsavel_id
       WHERE ${conds.join(' AND ')}
       ORDER BY d.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[DOCUMENTOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar documentos.' });
  }
});

// GET /api/v1/documentos/:id
router.get('/:id', requirePermission('documentos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT d.id, d.titulo, d.descricao, d.nome_original, d.caminho, d.mime_type, d.tamanho, d.extensao, d.status, d.created_at,
              d.setor_id, s.nome AS setor_nome, d.responsavel_id, u.nome AS responsavel_nome
       FROM documentos d
       LEFT JOIN setores s ON s.id = d.setor_id
       LEFT JOIN usuarios u ON u.id = d.responsavel_id
       WHERE d.id = ? AND d.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Documento não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar documento.' });
  }
});

// GET /api/v1/documentos/:id/download
router.get('/:id/download', requirePermission('documentos.baixar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT nome_original, caminho, mime_type FROM documentos WHERE id = ? AND deleted_at IS NULL AND status = 'ativo' LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Documento não encontrado.' });

    const doc = rows[0];
    const filePath = path.join(process.cwd(), doc.caminho.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Arquivo não encontrado no servidor.' });
    }

    // Registrar download
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'BAIXAR_DOCUMENTO', entidade: 'documentos', entidade_id: parseInt(req.params.id), descricao: `Download do documento "${doc.nome_original}".`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nome_original)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('[DOCUMENTOS] DOWNLOAD:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao baixar documento.' });
  }
});

// POST /api/v1/documentos (upload de arquivo)
router.post('/', requirePermission('documentos.enviar'), upload.single('arquivo'), async (req, res) => {
  if (!req.file) {
    return res.status(422).json({ success: false, message: 'Arquivo é obrigatório.', errors: { arquivo: 'Envie um arquivo.' } });
  }
  const { titulo, descricao, setor_id } = req.body;
  if (!titulo || titulo.trim().length < 3) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(422).json({ success: false, message: 'Título inválido.', errors: { titulo: 'Mínimo 3 caracteres.' } });
  }
  try {
    const pool = getPool();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const caminho = `/uploads/documentos/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO documentos (titulo, descricao, setor_id, responsavel_id, nome_original, nome_armazenado, caminho, mime_type, tamanho, extensao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')`,
      [titulo.trim(), descricao?.trim() || null, setor_id || null, req.usuario.id, req.file.originalname, req.file.filename, caminho, req.file.mimetype, req.file.size, ext]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'ENVIAR_DOCUMENTO', entidade: 'documentos', entidade_id: result.insertId, descricao: `Documento "${titulo.trim()}" enviado (${req.file.originalname}).`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({
      success: true,
      message: 'Documento enviado.',
      data: { id: result.insertId, caminho, tamanho: req.file.size }
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('[DOCUMENTOS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao salvar documento.' });
  }
});

// PATCH /api/v1/documentos/:id/status (arquivar/reativar)
router.patch('/:id/status', requirePermission('documentos.arquivar'), async (req, res) => {
  const { status } = req.body;
  if (!['ativo', 'arquivado'].includes(status)) {
    return res.status(422).json({ success: false, message: 'Status inválido. Use "ativo" ou "arquivado".' });
  }
  try {
    const pool = getPool();
    await pool.query(`UPDATE documentos SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [status, req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'ALTERAR_STATUS_DOCUMENTO', entidade: 'documentos', entidade_id: parseInt(req.params.id), descricao: `Documento #${req.params.id} status alterado para ${status}.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: `Documento ${status === 'arquivado' ? 'arquivado' : 'reativado'}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// DELETE /api/v1/documentos/:id (soft delete)
router.delete('/:id', requirePermission('documentos.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE documentos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_DOCUMENTO', entidade: 'documentos', entidade_id: parseInt(req.params.id), descricao: `Documento #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Documento removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover documento.' });
  }
});

module.exports = router;
