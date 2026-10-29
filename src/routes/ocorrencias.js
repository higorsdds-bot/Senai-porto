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
const { requirePermission, requireAnyPermission } = require('../middleware/permissions');
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
  limits: { 
    fileSize: 25 * 1024 * 1024,  // 25MB para arquivos
    fieldSize: 25 * 1024 * 1024  // 25MB para campos de texto (foto em Base64 via webcam)
  },
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
              o.nivel_atendimento, o.equipamento_id, o.parecer_tecnico,
              o.foto_url, o.anexo_url, o.anexo_nome,
              o.created_at, o.updated_at,
              o.usuario_id, u1.nome AS usuario_nome,
              o.responsavel_id, u2.nome AS responsavel_nome,
              eq.nome AS equipamento_nome, eq.patrimonio AS equipamento_patrimonio
       FROM ocorrencias o
       LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
       LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
       LEFT JOIN equipamentos eq ON eq.id = o.equipamento_id
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
              o.nivel_atendimento, o.equipamento_id, o.parecer_tecnico,
              o.foto_url, o.anexo_url, o.anexo_nome,
              o.created_at, o.updated_at,
              o.usuario_id, u1.nome AS usuario_nome,
              o.responsavel_id, u2.nome AS responsavel_nome,
              eq.nome AS equipamento_nome, eq.patrimonio AS equipamento_patrimonio
       FROM ocorrencias o
       LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
       LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
       LEFT JOIN equipamentos eq ON eq.id = o.equipamento_id
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
  const { local, descricao, tipo, responsavel_id, foto_base64, nivel_atendimento, equipamento_id } = req.body;

  if (!local || String(local).trim().length < 3) {
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

  if (req.files && req.files.foto && req.files.foto[0]) {
    foto_url = `/uploads/ocorrencias/${req.files.foto[0].filename}`;
  } else if (foto_base64) {
    foto_url = salvarBase64Foto(foto_base64);
  }

  if (req.files && req.files.anexo && req.files.anexo[0]) {
    anexo_url = `/uploads/ocorrencias/${req.files.anexo[0].filename}`;
    anexo_nome = req.files.anexo[0].originalname;
  }

  const nivelFinal = ['N1', 'N2', 'N3'].includes(nivel_atendimento) ? nivel_atendimento : 'N1';
  const equipamentoIdFinal = equipamento_id ? Number(equipamento_id) : null;

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO ocorrencias (local, descricao, tipo, foto_url, anexo_url, anexo_nome, usuario_id, responsavel_id, status, nivel_atendimento, equipamento_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberto', ?, ?)`,
      [
        String(local).trim(),
        descricao?.trim() || null,
        tipo?.trim() || null,
        foto_url,
        anexo_url,
        anexo_nome,
        req.usuario.id,
        responsavel_id || null,
        nivelFinal,
        equipamentoIdFinal
      ]
    );

    // Se vinculou um equipamento à ocorrência, marca o equipamento como 'manutencao'
    if (equipamentoIdFinal) {
      await pool.query(
        `UPDATE equipamentos SET estado = 'manutencao', updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [equipamentoIdFinal]
      ).catch(() => {});
    }

    const descAuditoria = `Ocorrência #${result.insertId} registrada no nível ${nivelFinal} no local "${String(local).trim()}".${foto_url ? ' [Com Foto]' : ''}${equipamentoIdFinal ? ` [Equipamento #${equipamentoIdFinal}]` : ''}`;

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
        nivel_atendimento: nivelFinal,
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
  const { local, descricao, tipo, responsavel_id, status, nivel_atendimento, equipamento_id, parecer_tecnico } = req.body;
  if (!local || String(local).trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Local inválido.', errors: { local: 'Mínimo 3 caracteres.' } });
  }
  const statusValidos = ['aberto', 'em_andamento', 'resolvido'];
  if (status && !statusValidos.includes(status)) {
    return res.status(422).json({ success: false, message: 'Status inválido.', errors: { status: `Use: ${statusValidos.join(', ')}` } });
  }

  const nivelFinal = ['N1', 'N2', 'N3'].includes(nivel_atendimento) ? nivel_atendimento : 'N1';
  const equipamentoIdFinal = equipamento_id ? Number(equipamento_id) : null;

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE ocorrencias
       SET local = ?, descricao = ?, tipo = ?, responsavel_id = ?, status = ?,
           nivel_atendimento = ?, equipamento_id = ?, parecer_tecnico = ?, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [
        String(local).trim(),
        descricao?.trim() || null,
        tipo?.trim() || null,
        responsavel_id || null,
        status || 'aberto',
        nivelFinal,
        equipamentoIdFinal,
        parecer_tecnico?.trim() || null,
        req.params.id
      ]
    );

    // Se o chamado foi resolvido e possui equipamento vinculado, restaura estado para 'bom'
    if (status === 'resolvido' && equipamentoIdFinal) {
      await pool.query(
        `UPDATE equipamentos SET estado = 'bom', updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [equipamentoIdFinal]
      ).catch(() => {});
    }

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(req.params.id),
      descricao: `Ocorrência #${req.params.id} editada (Nível: ${nivelFinal}, Status: ${status}).`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Ocorrência atualizada com sucesso.' });
  } catch (err) {
    console.error('[OCORRENCIAS] PUT:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar ocorrência.' });
  }
});

// ─── PATCH /api/v1/ocorrencias/:id/assumir ───────────────────────────────────
// Permite ao técnico de suporte (N1, N2, N3) assumir o chamado imediatamente
router.patch('/:id/assumir', requireAnyPermission('ocorrencias.assumir', 'ocorrencias.editar'), async (req, res) => {
  const id = req.params.id;
  try {
    const pool = getPool();
    const [current] = await pool.query(
      `SELECT id, status, responsavel_id, nivel_atendimento FROM ocorrencias WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!current.length) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada.' });

    await pool.query(
      `UPDATE ocorrencias 
       SET responsavel_id = ?, status = 'em_andamento', updated_at = NOW() 
       WHERE id = ? AND deleted_at IS NULL`,
      [req.usuario.id, id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ASSUMIR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(id),
      descricao: `Ocorrência #${id} assumida para atendimento pelo técnico ${req.usuario.nome}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Atendimento assumido com sucesso por ${req.usuario.nome}!`,
      data: { responsavel_id: req.usuario.id, responsavel_nome: req.usuario.nome, status: 'em_andamento' }
    });
  } catch (err) {
    console.error('[OCORRENCIAS] PATCH assumir:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao assumir chamado.' });
  }
});

// ─── PATCH /api/v1/ocorrencias/:id/escalonar ─────────────────────────────────
// Permite transferir o chamado entre N1 -> N2 -> N3 com histórico de parecer técnico
router.patch('/:id/escalonar', requireAnyPermission('ocorrencias.escalonar', 'ocorrencias.editar'), async (req, res) => {
  const id = req.params.id;
  const { nivel, parecer_tecnico } = req.body;

  if (!['N1', 'N2', 'N3'].includes(nivel)) {
    return res.status(422).json({ success: false, message: 'Nível de escalonamento inválido. Use N1, N2 ou N3.' });
  }

  try {
    const pool = getPool();
    const [current] = await pool.query(
      `SELECT id, nivel_atendimento, parecer_tecnico FROM ocorrencias WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!current.length) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada.' });

    const nivelAnterior = current[0].nivel_atendimento || 'N1';
    let parecerAtualizado = current[0].parecer_tecnico || '';
    if (parecer_tecnico && String(parecer_tecnico).trim().length > 0) {
      const dataHora = new Date().toLocaleString('pt-BR');
      const entrada = `[${dataHora}] Escalonado de ${nivelAnterior} para ${nivel} por ${req.usuario.nome}:\n${parecer_tecnico.trim()}\n`;
      parecerAtualizado = parecerAtualizado ? `${parecerAtualizado}\n${entrada}` : entrada;
    }

    await pool.query(
      `UPDATE ocorrencias 
       SET nivel_atendimento = ?, parecer_tecnico = ?, updated_at = NOW() 
       WHERE id = ? AND deleted_at IS NULL`,
      [nivel, parecerAtualizado, id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ESCALONAR_OCORRENCIA',
      entidade: 'ocorrencias',
      entidade_id: parseInt(id),
      descricao: `Ocorrência #${id} escalonada de ${nivelAnterior} para ${nivel} por ${req.usuario.nome}.${parecer_tecnico ? ` Parecer: ${parecer_tecnico.trim()}` : ''}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Chamado escalonado com sucesso para o nível ${nivel}!`,
      data: { nivel_atendimento: nivel, parecer_tecnico: parecerAtualizado }
    });
  } catch (err) {
    console.error('[OCORRENCIAS] PATCH escalonar:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao escalonar chamado.' });
  }
});
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