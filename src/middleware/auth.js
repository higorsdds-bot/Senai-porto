/**
 * HUB ES+ - Middleware de Autenticação JWT
 * Valida Bearer token em todas as rotas protegidas.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secult_hub_es_jwt_secret_token_2026_super_secure_key';

/**
 * Middleware que verifica e decodifica o JWT.
 * Em caso de falha, retorna 401.
 * Em caso de sucesso, popula req.usuario com os dados completos do banco.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação ausente ou inválido. Faça login novamente.'
    });
  }

  const token = authHeader.split(' ')[1];
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

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [payload.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];
    if (usuario.status !== 'ATIVO') {
      return res.status(401).json({
        success: false,
        message: usuario.status === 'BLOQUEADO'
          ? 'Conta bloqueada. Contate o administrador.'
          : 'Conta inativa.'
      });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    console.error('[AUTH] Erro ao consultar usuário:', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno de autenticação.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
