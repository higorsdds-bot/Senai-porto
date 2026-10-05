/**
 * HUB ES+ - Camada Centralizada de Autorização
 * Todas as regras de acesso ficam aqui — nunca no frontend.
 */
const { getPool } = require('../config/database');

// Cache em memória das permissões por perfil (recarrega a cada 5 min)
let _permCache = {};
let _permCacheTime = 0;
const PERM_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function loadPermissoesPorPerfil() {
  const now = Date.now();
  if (now - _permCacheTime < PERM_CACHE_TTL && Object.keys(_permCache).length > 0) {
    return _permCache;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT pp.perfil, p.chave
       FROM perfil_permissoes pp
       JOIN permissoes p ON p.id = pp.permissao_id`
    );

    const cache = {};
    for (const row of rows) {
      if (!cache[row.perfil]) cache[row.perfil] = new Set();
      cache[row.perfil].add(row.chave);
    }
    _permCache = cache;
    _permCacheTime = now;
    return cache;
  } catch (err) {
    console.error('[PERMISSIONS] Erro ao carregar permissões:', err.message);
    return _permCache; // Retorna cache antigo em caso de erro
  }
}

/**
 * Verifica se um usuário possui a permissão indicada.
 * @param {object} usuario - Objeto do req.usuario (precisa ter campo `perfil`)
 * @param {string} permissaoChave - Ex: 'compras.criar'
 */
async function hasPermission(usuario, permissaoChave) {
  if (!usuario) return false;
  // ADMIN tem permissão total (bypass)
  if (usuario.perfil === 'ADMIN') return true;

  const perms = await loadPermissoesPorPerfil();
  const permSet = perms[usuario.perfil];
  if (!permSet) return false;
  return permSet.has(permissaoChave);
}

/**
 * Middleware factory: exige a permissão indicada.
 * Uso: router.get('/', requirePermission('compras.visualizar'), handler)
 */
function requirePermission(permissaoChave) {
  return async (req, res, next) => {
    try {
      const ok = await hasPermission(req.usuario, permissaoChave);
      if (!ok) {
        return res.status(403).json({
          success: false,
          message: `Acesso negado. Permissão necessária: ${permissaoChave}`
        });
      }
      next();
    } catch (err) {
      console.error('[PERMISSIONS] Erro ao verificar permissão:', err.message);
      return res.status(500).json({ success: false, message: 'Erro interno de autorização.' });
    }
  };
}

/**
 * Retorna a lista de chaves de permissão de um usuário (para o frontend montar menus).
 */
async function getPermissoesDoUsuario(usuario) {
  if (!usuario) return [];
  const perms = await loadPermissoesPorPerfil();
  if (usuario.perfil === 'ADMIN') {
    // Admin: retorna todas as chaves cadastradas
    const allKeys = Object.values(perms).flatMap(s => [...s]);
    return [...new Set(allKeys)];
  }
  const permSet = perms[usuario.perfil];
  return permSet ? [...permSet] : [];
}

module.exports = { hasPermission, requirePermission, getPermissoesDoUsuario, loadPermissoesPorPerfil };
