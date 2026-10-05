/**
 * HUB ES+ - Middleware de Auditoria
 * Registra ações importantes no banco de dados automaticamente.
 */
const { getPool } = require('../config/database');

/**
 * Registra uma ação na tabela de auditoria.
 * @param {object} options
 * @param {number|null} options.usuario_id
 * @param {string} options.acao - Ex: 'LOGIN', 'CRIAR_USUARIO', 'DELETAR_DOCUMENTO'
 * @param {string|null} options.entidade - Ex: 'usuarios', 'documentos'
 * @param {number|null} options.entidade_id
 * @param {string|null} options.descricao
 * @param {string|null} options.ip
 * @param {string|null} options.user_agent
 */
async function registrarAuditoria({
  usuario_id = null,
  acao,
  entidade = null,
  entidade_id = null,
  descricao = null,
  ip = null,
  user_agent = null
}) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, descricao, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, acao, entidade, entidade_id, descricao, ip, user_agent]
    );
  } catch (err) {
    // Auditoria não deve derrubar a requisição principal
    console.error('[AUDITORIA] Erro ao registrar:', err.message);
  }
}

/**
 * Helper para extrair IP real do request (lida com proxy reverso).
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

module.exports = { registrarAuditoria, getClientIp };
