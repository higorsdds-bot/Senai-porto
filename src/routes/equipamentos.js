/**
 * HUB ES+ - Rotas de Equipamentos com Upload de Imagem
 * Usa multer para receber imagens via multipart/form-data.
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

// Diretório de upload de imagens de equipamentos
const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'equipamentos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nome = `equip_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'));
    }
  }
});

// GET /api/v1/equipamentos
router.get('/', requirePermission('equipamentos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { estado, q } = req.query;
    let conds = ['e.deleted_at IS NULL'];
    let params = [];
    if (estado) { conds.push('e.estado = ?'); params.push(estado); }
    if (q) { conds.push('(e.nome LIKE ? OR e.patrimonio LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT e.id, e.nome, e.patrimonio, e.descricao, e.localizacao, e.estado, e.imagem_url,
              e.created_at, e.updated_at,
              e.responsavel_id, u.nome AS responsavel_nome
       FROM equipamentos e
       LEFT JOIN usuarios u ON u.id = e.responsavel_id
       WHERE ${conds.join(' AND ')}
       ORDER BY e.nome ASC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[EQUIPAMENTOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar equipamentos.' });
  }
});

// GET /api/v1/equipamentos/:id
router.get('/:id', requirePermission('equipamentos.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT e.id, e.nome, e.patrimonio, e.descricao, e.localizacao, e.estado, e.imagem_url, e.created_at,
              e.responsavel_id, u.nome AS responsavel_nome
       FROM equipamentos e LEFT JOIN usuarios u ON u.id = e.responsavel_id
       WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Equipamento não encontrado.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar equipamento.' });
  }
});

// POST /api/v1/equipamentos (com upload opcional de imagem)
router.post('/', requirePermission('equipamentos.criar'), upload.single('imagem'), async (req, res) => {
  const { nome, patrimonio, descricao, localizacao, estado, responsavel_id } = req.body;
  const erros = {};
  if (!nome || nome.trim().length < 3) erros.nome = 'Nome inválido (mínimo 3 caracteres).';
  if (!patrimonio || patrimonio.trim().length < 3) erros.patrimonio = 'Número de patrimônio inválido.';
  if (Object.keys(erros).length > 0) {
    if (req.file) fs.unlinkSync(req.file.path); // Limpa upload em caso de erro
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }
  try {
    const pool = getPool();
    const imagem_url = req.file ? `/uploads/equipamentos/${req.file.filename}` : null;
    const [result] = await pool.query(
      `INSERT INTO equipamentos (nome, patrimonio, descricao, localizacao, estado, responsavel_id, imagem_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome.trim(), patrimonio.trim().toUpperCase(), descricao?.trim() || null, localizacao?.trim() || null, estado || 'bom', responsavel_id || null, imagem_url]
    );
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'CRIAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: result.insertId, descricao: `Equipamento "${nome.trim()}" (${patrimonio.trim()}) cadastrado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.status(201).json({ success: true, message: 'Equipamento cadastrado.', data: { id: result.insertId, imagem_url } });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(422).json({ success: false, message: 'Número de patrimônio já cadastrado.', errors: { patrimonio: 'Já em uso.' } });
    }
    console.error('[EQUIPAMENTOS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao cadastrar equipamento.' });
  }
});

// PUT /api/v1/equipamentos/:id
router.put('/:id', requirePermission('equipamentos.editar'), upload.single('imagem'), async (req, res) => {
  const { nome, patrimonio, descricao, localizacao, estado, responsavel_id } = req.body;
  const erros = {};
  if (!nome || nome.trim().length < 3) erros.nome = 'Nome inválido.';
  if (!patrimonio || patrimonio.trim().length < 3) erros.patrimonio = 'Patrimônio inválido.';
  if (Object.keys(erros).length > 0) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }
  try {
    const pool = getPool();
    // Buscar imagem atual para deletar se substituída
    const [current] = await pool.query(`SELECT imagem_url FROM equipamentos WHERE id = ? LIMIT 1`, [req.params.id]);
    const novaImagem = req.file ? `/uploads/equipamentos/${req.file.filename}` : current[0]?.imagem_url;

    await pool.query(
      `UPDATE equipamentos SET nome = ?, patrimonio = ?, descricao = ?, localizacao = ?, estado = ?, responsavel_id = ?, imagem_url = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [nome.trim(), patrimonio.trim().toUpperCase(), descricao?.trim() || null, localizacao?.trim() || null, estado || 'bom', responsavel_id || null, novaImagem, req.params.id]
    );

    // Remover imagem antiga se substituída
    if (req.file && current[0]?.imagem_url) {
      const oldPath = path.join(process.cwd(), current[0].imagem_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'EDITAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: parseInt(req.params.id), descricao: `Equipamento #${req.params.id} atualizado.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Equipamento atualizado.', data: { imagem_url: novaImagem } });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(422).json({ success: false, message: 'Número de patrimônio já cadastrado.', errors: { patrimonio: 'Já em uso.' } });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar equipamento.' });
  }
});

// DELETE /api/v1/equipamentos/:id
router.delete('/:id', requirePermission('equipamentos.excluir'), async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`UPDATE equipamentos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'DELETAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: parseInt(req.params.id), descricao: `Equipamento #${req.params.id} removido.`, ip: getClientIp(req), user_agent: req.headers['user-agent'] });
    return res.json({ success: true, message: 'Equipamento removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover equipamento.' });
  }
});

module.exports = router;
