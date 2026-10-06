/**
 * HUB ES+ - Rotas de Usuários
 * GET    /api/v1/usuarios
 * GET    /api/v1/usuarios/:id
 * POST   /api/v1/usuarios
 * PUT    /api/v1/usuarios/:id
 * PATCH  /api/v1/usuarios/:id/status
 * DELETE /api/v1/usuarios/:id  (soft delete)
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// ─── GET /api/v1/usuarios ────────────────────────────────────────────────────
router.get('/', requirePermission('usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { perfil, setor_id, status, q } = req.query;

    let conditions = ['u.deleted_at IS NULL'];
    let params = [];

    if (perfil) { conditions.push('u.perfil = ?'); params.push(perfil); }
    if (setor_id) { conditions.push('u.setor_id = ?'); params.push(setor_id); }
    if (status) { conditions.push('u.status = ?'); params.push(status); }
    if (q) {
      conditions.push('(u.nome LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where = conditions.join(' AND ');
    const ONLINE_THRESHOLD = 5; // minutos

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL ${ONLINE_THRESHOLD} MINUTE
                   THEN 1 ELSE 0 END AS online
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE ${where}
       ORDER BY u.nome ASC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[USUARIOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
  }
});

// ─── GET /api/v1/usuarios/:id ────────────────────────────────────────────────
router.get('/:id', requirePermission('usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL 5 MINUTE
                   THEN 1 ELSE 0 END AS online
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[USUARIOS] GET/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
  }
});

// ─── POST /api/v1/usuarios ───────────────────────────────────────────────────
router.post('/', requirePermission('usuarios.criar'), async (req, res) => {
  const { nome, email, senha, perfil, setor_id, status } = req.body;
  const erros = {};

  if (!nome || nome.trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Email inválido.';
  if (!senha || senha.length < 8) erros.senha = 'Senha precisa ter pelo menos 8 caracteres.';
  if (!perfil || !['ADMIN', 'GESTOR', 'OPERADOR'].includes(perfil)) erros.perfil = 'Perfil inválido.';

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();

    // Verificar email duplicado
    const [existing] = await pool.query(
      `SELECT id FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Email já cadastrado.',
        errors: { email: 'Este email já está em uso.' }
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        email.toLowerCase().trim(),
        senhaHash,
        perfil,
        setor_id || null,
        status || 'ATIVO'
      ]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'CRIAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: result.insertId,
      descricao: `Usuário "${nome.trim()}" (${email}) criado com perfil ${perfil}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso.',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[USUARIOS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar usuário.' });
  }
});

// ─── PUT /api/v1/usuarios/:id ────────────────────────────────────────────────
router.put('/:id', requirePermission('usuarios.editar'), async (req, res) => {
  const { nome, email, perfil, setor_id, status, senha } = req.body;
  const id = req.params.id;
  const erros = {};

  if (!nome || nome.trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Email inválido.';
  if (!perfil || !['ADMIN', 'GESTOR', 'OPERADOR'].includes(perfil)) erros.perfil = 'Perfil inválido.';

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();

    const [existing] = await pool.query(
      `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim(), id]
    );
    if (existing.length > 0) {
      return res.status(422).json({
        success: false, message: 'Email já em uso.', errors: { email: 'Email já está em uso.' }
      });
    }

    let query = `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, status = ?, updated_at = NOW()`;
    let params = [nome.trim(), email.toLowerCase().trim(), perfil, setor_id || null, status || 'ATIVO'];

    if (senha && senha.length >= 8) {
      const senhaHash = await bcrypt.hash(senha, 12);
      query += `, senha = ?`;
      params.push(senhaHash);
    }

    query += ` WHERE id = ? AND deleted_at IS NULL`;
    params.push(id);

    await pool.query(query, params);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Usuário #${id} atualizado.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    console.error('[USUARIOS] PUT:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
});

// ─── PATCH /api/v1/usuarios/:id/status ───────────────────────────────────────
router.patch('/:id/status', requirePermission('usuarios.bloquear'), async (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  if (!['ATIVO', 'INATIVO', 'BLOQUEADO', 'PENDENTE'].includes(status)) {
    return res.status(422).json({
      success: false, message: 'Status inválido. Use ATIVO, INATIVO, BLOQUEADO ou PENDENTE.'
    });
  }

  // Não pode bloquear a si mesmo
  if (parseInt(id) === req.usuario.id && status !== 'ATIVO') {
    return res.status(422).json({ success: false, message: 'Você não pode alterar o seu próprio status.' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE usuarios SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [status, id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ALTERAR_STATUS_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Status do usuário #${id} alterado para ${status}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: `Status alterado para ${status}.` });
  } catch (err) {
    console.error('[USUARIOS] PATCH status:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// ─── DELETE /api/v1/usuarios/:id (soft delete) ───────────────────────────────
router.delete('/:id', requirePermission('usuarios.editar'), async (req, res) => {
  const id = req.params.id;

  // Não pode deletar a si mesmo
  if (parseInt(id) === req.usuario.id) {
    return res.status(422).json({ success: false, message: 'Você não pode deletar sua própria conta.' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE usuarios SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'DELETAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Usuário #${id} removido (soft delete).`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Usuário removido.' });
  } catch (err) {
    console.error('[USUARIOS] DELETE:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao remover usuário.' });
  }
});

module.exports = router;
