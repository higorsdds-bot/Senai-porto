/**
 * HUB ES+ - Rotas de Ocorrências Técnicas
 * Suporte a captura de foto (upload ou base64) e upload de arquivos/anexos (PDFs, docs, etc.).
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

// ─── Configuração do Multer (fotos e documentos anexados) ───────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'ocorrencias');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase() || (file.fieldname === 'foto' ? '.jpg' : '.bin');
    const prefix = file.fieldname === 'foto' ? 'foto' : 'anexo';
    const nome = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'foto') {
      const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
      if (permitidos.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Foto: Formato não permitido. Use JPG, PNG ou WebP.'));
    }
    // Anexos: permite documentos em geral (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP, imagens)
    const extensoesProibidas = ['.exe', '.bat', '.sh', '.bin', '.cmd'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (extensoesProibidas.includes(ext)) {
      return cb(new Error('Tipo de arquivo anexo não permitido por motivos de segurança.'));
    }
    cb(null, true);
  }
});

const uploadFields = upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'anexo', maxCount: 1 }
]);

router.use(authMiddleware);

// Helper para salvar foto enviada em Base64 (ex: webcam direta no navegador)
function salvarBase64Foto(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;
  const match = base64String.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
  if (!match) return null;

  const ext = match[1] === 'jpeg' ? '.jpg' : `.${match[1]}`;
  const filename = `foto_cam_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(match[2], 'base64');
  fs.writeFileSync(filePath, buffer);
  return `/uploads/ocorrencias/${filename}`;
}

// ─── GET /api/v1/ocorrencias ─────────────────────────────────────────────────
router.get('/', requirePermission('ocorrencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, q } = req.query;
    let conds = ['o.deleted_at IS NULL'];
    let params = [];

    if (status) { conds.push('o.status = ?'); params.push(status); }
    if (q) {
      conds.push('(o.local LIKE ? OR o.descricao LIKE ? OR o.tipo LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.query(
      `SELECT o.id, o.local, o.descricao, o.tipo, o.status,
              o.foto_url, o.anexo_url, o.anexo_nome,
              o.created_at, o.updated_at,
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

// ─── GET /api/v1/ocorrencias/:id ─────────────────────────────────────────────
router.get('/:id', requirePermission('ocorrencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.id, o.local, o.descricao, o.tipo, o.status,
              o.foto_url, o.anexo_url, o.anexo_nome,
              o.created_at, o.updated_at,
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
    console.error('[OCORRENCIAS] GET/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar ocorrência.' });
  }
});

// ─── POST /api/v1/ocorrencias ────────────────────────────────────────────────
// Aceita multipart/form-data com campos 'foto' e 'anexo', ou JSON com foto_base64
router.post('/', requirePermission('ocorrencias.criar'), (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { local, descricao, tipo, responsavel_id, foto_base64 } = req.body;

  if (!local || String(local).trim().length < 3) {
    // Limpa uploads em caso de erro de validação
    if (req.files) {
      if (req.files.foto) fs.unlink(req.files.foto[0].path, () => {});
      if (req.files.anexo) fs.unlink(req.files.anexo[0].path, () => {});
    }
    return res.status(422).json({
      success: false,
      message: 'Local inválido.',
      errors: { local: 'Informe um local com no mínimo 3 caracteres.' }
    });
  }

  let foto_url = null;
  let anexo_url = null;
  let anexo_nome = null;

  // Processa arquivo de foto vindo do multer
  if (req.files && req.files.foto && req.files.foto[0]) {
    foto_url = `/uploads/ocorrencias/${req.files.foto[0].filename}`;
  } else if (foto_base64) {
    // Processa foto vinda da câmera via webcam base64
    foto_url = salvarBase64Foto(foto_base64);
  }

  // Processa anexo/documento
  if (req.files && req.files.anexo && req.files.anexo[0]) {
    anexo_url = `/uploads/ocorrencias/${req.files.anexo[0].filename}`;
    anexo_nome = req.files.anexo[0].originalname;
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO ocorrencias (local, descricao, tipo, foto_url, anexo_url, anexo_nome, usuario_id, responsavel_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberto')`,
      [
        String(local).trim(),
        descricao?.trim() || null,
        tipo?.trim() || null,
        foto_url,
        anexo_url,
        anexo_nome,
        req.usuario.id,
        responsavel_id || null
      ]
    );

    const descAuditoria = `Ocorrência #${result.insertId} registrada no local "${String(local).trim()}".${foto_url ? ' [Com Foto]' : ''}${anexo_url ? ` [Anexo: ${anexo_nome}]` : ''}`;

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'CRIAR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: result.insertId,
      descricao: descAuditoria,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Ocorrência registrada com sucesso.',
      data: {
        id: result.insertId,
        foto_url,
        anexo_url,
        anexo_nome
      }
    });
  } catch (err) {
    if (req.files) {
      if (req.files.foto) fs.unlink(req.files.foto[0].path, () => {});
      if (req.files.anexo) fs.unlink(req.files.anexo[0].path, () => {});
    }
    console.error('[OCORRENCIAS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar ocorrência.' });
  }
});

// ─── PUT /api/v1/ocorrencias/:id ─────────────────────────────────────────────
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
      `UPDATE ocorrencias
       SET local = ?, descricao = ?, tipo = ?, responsavel_id = ?, status = ?, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [String(local).trim(), descricao?.trim() || null, tipo?.trim() || null, responsavel_id || null, status || 'aberto', req.params.id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(req.params.id),
      descricao: `Ocorrência #${req.params.id} editada.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Ocorrência atualizada.' });
  } catch (err) {
    console.error('[OCORRENCIAS] PUT:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar ocorrência.' });
  }
});

// ─── PATCH /api/v1/ocorrencias/:id/status ───────────────────────────────────
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
      usuario_id: req.usuario.id,
      acao: 'ALTERAR_STATUS_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(req.params.id),
      descricao: `Status da ocorrência #${req.params.id} alterado de "${current[0]?.status}" para "${status}".`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: `Status alterado para ${status}.` });
  } catch (err) {
    console.error('[OCORRENCIAS] PATCH status:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// ─── DELETE /api/v1/ocorrencias/:id ──────────────────────────────────────────
router.delete('/:id', requirePermission('ocorrencias.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT foto_url, anexo_url FROM ocorrencias WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    await pool.query(`UPDATE ocorrencias SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);

    // Remove arquivos físicos com segurança
    const uploadBase = path.join(__dirname, '..', '..');
    if (rows[0]?.foto_url) {
      const arqFoto = path.join(uploadBase, rows[0].foto_url.replace('/uploads/', (process.env.UPLOAD_DIR || 'uploads') + '/'));
      fs.unlink(arqFoto, () => {});
    }
    if (rows[0]?.anexo_url) {
      const arqAnexo = path.join(uploadBase, rows[0].anexo_url.replace('/uploads/', (process.env.UPLOAD_DIR || 'uploads') + '/'));
      fs.unlink(arqAnexo, () => {});
    }

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'DELETAR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(req.params.id),
      descricao: `Ocorrência #${req.params.id} removida.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Ocorrência removida.' });
  } catch (err) {
    console.error('[OCORRENCIAS] DELETE:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao remover ocorrência.' });
  }
});

module.exports = router;