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

    req.usuario = usuario;
    next();
  } catch (err) {
    console.error('[AUTH] Erro ao consultar usuário:', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno de autenticação.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
