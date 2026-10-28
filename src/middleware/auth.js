/**
 * HUB ES+ - Middleware de Autenticação JWT
 * Valida Bearer token em todas as rotas protegidas.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secult_hub_es_jwt_secret_token_2026_super_secure_key';

// Cache em memória de usuários autenticados para evitar avalanche de queries repetidas
const _userAuthCache = new Map();
const USER_CACHE_TTL = 30 * 1000; // 30 segundos

function clearUserAuthCache(userId = null) {
  if (userId) {
    _userAuthCache.delete(Number(userId));
  } else {
    _userAuthCache.clear();
  }
}

/**
 * Middleware que verifica e decodifica o JWT.
 * Em caso de falha, retorna 401.
 * Em caso de sucesso, popula req.usuario com os dados completos do banco (com cache em memória de 30s).
 */
async function authMiddleware(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts.slice(1).join(' ').trim();
    }
  }
  if (!token && req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação ausente ou inválido. Faça login novamente.'
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Sessão expirada. Por favor, faça login novamente.'
        : 'Token inválido.'
    });
  }

  const userId = Number(payload.id);
  const now = Date.now();
  const cached = _userAuthCache.get(userId);

  if (cached && now < cached.expiresAt) {
    req.usuario = cached.usuario;
    return next();
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      _userAuthCache.delete(userId);
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];
    if (usuario.status !== 'ATIVO') {
      _userAuthCache.delete(userId);
      let msg = 'Conta inativa. Contate o administrador.';
      if (usuario.status === 'BLOQUEADO') {
        msg = 'Conta bloqueada. Contate o administrador.';
      } else if (usuario.status === 'PENDENTE') {
        msg = 'Sua solicitação de cadastro está pendente de aprovação por um administrador.';
      } else if (usuario.status === 'AGUARDANDO_ATIVACAO') {
        msg = 'Sua conta foi aprovada, mas ainda não foi ativada. Verifique o link de ativação enviado para o seu e-mail para definir sua senha.';
      } else if (usuario.status === 'REJEITADO') {
        msg = 'Sua solicitação de cadastro foi rejeitada. Acesso não permitido.';
      }
      return res.status(403).json({
        success: false,
        message: msg
      });
    }

    // Salva no cache da sessão
    _userAuthCache.set(userId, {
      usuario,
      expiresAt: now + USER_CACHE_TTL
    });

    req.usuario = usuario;
    next();
  } catch (err) {
    console.error('[AUTH] Erro ao consultar usuário:', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno de autenticação.' });
  }
}

module.exports = { authMiddleware, clearUserAuthCache, JWT_SECRET };
