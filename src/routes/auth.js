/**
 * HUB ES+ - Rotas de Autenticação
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 * POST /api/v1/auth/heartbeat
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { getPermissoesDoUsuario } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Rate limiting simples (em memória) para o endpoint de login
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = now + 15 * 60 * 1000;
  }
  attempts.count++;
  loginAttempts.set(ip, attempts);
  return attempts.count <= 10; // Máximo 10 tentativas em 15min
}

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  // Rate limit
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Aguarde 15 minutos.'
    });
  }

  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(422).json({
      success: false,
      message: 'Email e senha são obrigatórios.',
      errors: { email: !email ? 'Campo obrigatório' : null, senha: !senha ? 'Campo obrigatório' : null }
    });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.senha, u.perfil, u.setor_id, u.status,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.email = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      await registrarAuditoria({
        acao: 'LOGIN_FALHOU',
        descricao: `Tentativa com email inexistente: ${email}`,
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    const usuario = rows[0];

    // Verifica status antes de checar senha (não revela qual o problema)
    if (usuario.status === 'INATIVO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta inativa.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Conta inativa. Contate o administrador.' });
    }

    if (usuario.status === 'PENDENTE') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta pendente de aprovação.',
        ip, user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: 'Sua solicitação de cadastro está pendente de aprovação por um administrador.'
      });
    }

    if (usuario.status === 'BLOQUEADO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta bloqueada.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Conta bloqueada. Contate o administrador.' });
    }

    // Verificar senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Senha incorreta.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Atualizar último acesso
    await pool.query(
      `UPDATE usuarios SET ultimo_acesso = NOW(), ultimo_heartbeat = NOW() WHERE id = ?`,
      [usuario.id]
    );

    // Buscar permissões
    const permissoes = await getPermissoesDoUsuario({ perfil: usuario.perfil });

    // Registrar auditoria
    await registrarAuditoria({
      usuario_id: usuario.id,
      acao: 'LOGIN',
      descricao: 'Login realizado com sucesso.',
      ip, user_agent: userAgent
    });

    // NUNCA retornar o campo senha
    return res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          setor_id: usuario.setor_id,
          setor_nome: usuario.setor_nome
        },
        permissoes
      }
    });
  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  await registrarAuditoria({
    usuario_id: req.usuario.id,
    acao: 'LOGOUT',
    descricao: 'Logout realizado.',
    ip, user_agent: userAgent
  });

  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const permissoes = await getPermissoesDoUsuario(req.usuario);
  return res.json({
    success: true,
    data: {
      usuario: {
        id: req.usuario.id,
        nome: req.usuario.nome,
        email: req.usuario.email,
        perfil: req.usuario.perfil,
        setor_id: req.usuario.setor_id,
        setor_nome: req.usuario.setor_nome
      },
      permissoes
    }
  });
});

// ─── POST /api/v1/auth/heartbeat ─────────────────────────────────────────────
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE usuarios SET ultimo_heartbeat = NOW() WHERE id = ?`,
      [req.usuario.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao registrar heartbeat.' });
  }
});

// ─── POST /api/v1/auth/solicitar-cadastro ─────────────────────────────────────
router.post('/solicitar-cadastro', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;
  const { nome, email, senha, setor_id } = req.body;

  const erros = {};
  if (!nome || String(nome).trim().length < 3) {
    erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    erros.email = 'E-mail informado é inválido.';
  }
  if (!senha || String(senha).length < 8) {
    erros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
  }

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Dados inválidos.',
      errors: erros
    });
  }

  try {
    const pool = getPool();
    const cleanEmail = String(email).toLowerCase().trim();

    // Verifica se já existe cadastro com esse email
    const [existing] = await pool.query(
      `SELECT id, status FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanEmail]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'PENDENTE') {
        return res.status(409).json({
          success: false,
          message: 'Já existe uma solicitação de cadastro pendente com este e-mail. Aguarde a aprovação do administrador.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    const senhaHash = await bcrypt.hash(String(senha), 12);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
       VALUES (?, ?, ?, 'OPERADOR', ?, 'PENDENTE')`,
      [String(nome).trim(), cleanEmail, senhaHash, setor_id || null]
    );

    await registrarAuditoria({
      usuario_id: null,
      acao: 'SOLICITACAO_CADASTRO',
      entidade: 'usuarios',
      entidade_id: result.insertId,
      descricao: `Novo pedido de cadastro para "${String(nome).trim()}" (${cleanEmail}). Status: PENDENTE.`,
      ip,
      user_agent: userAgent
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitação de cadastro enviada com sucesso! Aguarde a aprovação do administrador para acessar o sistema.',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[AUTH] Erro ao solicitar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao processar solicitação de cadastro.' });
  }
});

// Alias /registro para conveniência
router.post('/registro', (req, res) => res.redirect(307, '/api/v1/auth/solicitar-cadastro'));

module.exports = router;
