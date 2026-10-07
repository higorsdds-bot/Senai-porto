/**
 * HUB ES+ - Camada Centralizada de Autorização
 * Todas as regras de acesso ficam aqui — nunca no frontend.
 */
const { getPool } = require('../config/database');

// Cache em memória das permissões por perfil (recarrega a cada 5 min)
let _permCache = {};
let _permCacheTime = 0;
const PERM_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function normalizeProfile(perfil) {
  return String(perfil || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

const MODULE_PERMISSIONS = {
  dashboard: ['dashboard.visualizar'],
  compras: ['compras.visualizar', 'compras.visualizar_pedidos', 'compras.visualizar_proprias'],
  insumos: ['insumos.visualizar'],
  agenda: ['eventos.visualizar'],
  documentos: ['documentos.visualizar'],
  ocorrencias: ['ocorrencias.visualizar'],
  comunicacao: ['comunicados.visualizar'],
  indicadores: ['indicadores.visualizar'],
  limpeza: ['limpeza.visualizar'],
  equipamentos: ['equipamentos.visualizar'],
  auditoria: ['auditoria.visualizar']
};

const FIXED_PROFILE_PERMISSIONS = {
  ADMINISTRACAO: [
    'compras.visualizar_pedidos',
    'compras.receber',
    'eventos.visualizar',
    'insumos.visualizar',
    'insumos.baixar'
  ],
  LIMPEZA: [
    'compras.visualizar_proprias',
    'compras.criar'
  ]
};

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
      const perfil = normalizeProfile(row.perfil);
      if (!cache[perfil]) cache[perfil] = new Set();
      cache[perfil].add(row.chave);
    }
    _permCache = cache;
    _permCacheTime = now;
    return cache;
  } catch (err) {
    console.error('[PERMISSIONS] Erro ao carregar permissões:', err.message);
    return {};
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
  if (['ADMIN', 'ADMINISTRADOR'].includes(normalizeProfile(usuario.perfil))) return true;

  const perfil = normalizeProfile(usuario.perfil);
  if (Object.prototype.hasOwnProperty.call(FIXED_PROFILE_PERMISSIONS, perfil)) {
    return FIXED_PROFILE_PERMISSIONS[perfil].includes(permissaoChave);
  }

  const perms = await loadPermissoesPorPerfil();
  const permSet = perms[perfil];
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

function requireAnyPermission(...permissoesChave) {
  return async (req, res, next) => {
    try {
      for (const permissaoChave of permissoesChave) {
        if (await hasPermission(req.usuario, permissaoChave)) return next();
      }
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Necessária uma destas permissões: ${permissoesChave.join(', ')}`
      });
    } catch (err) {
      console.error('[PERMISSIONS] Erro ao verificar permissões:', err.message);
      return res.status(500).json({ success: false, message: 'Erro interno de autorização.' });
    }
  };
}

/**
 * Retorna a lista de chaves de permissão de um usuário (para o frontend montar menus).
 */
async function getPermissoesDoUsuario(usuario) {
  if (!usuario) return [];
  const perfil = normalizeProfile(usuario.perfil);
  if (Object.prototype.hasOwnProperty.call(FIXED_PROFILE_PERMISSIONS, perfil)) {
    return [...FIXED_PROFILE_PERMISSIONS[perfil]];
  }

  const perms = await loadPermissoesPorPerfil();
  if (['ADMIN', 'ADMINISTRADOR'].includes(perfil)) {
    // Admin: retorna todas as chaves cadastradas
    const allKeys = Object.values(perms).flatMap(s => [...s]);
    return [...new Set(allKeys)];
  }
  const permSet = perms[perfil];
  return permSet ? [...permSet] : [];
}

async function getModulosDoUsuario(usuario) {
  const permissoes = new Set(await getPermissoesDoUsuario(usuario));
  return Object.entries(MODULE_PERMISSIONS)
    .filter(([, requiredPermissions]) => requiredPermissions.some(permission => permissoes.has(permission)))
    .map(([module]) => module);
}

module.exports = {
  hasPermission,
  requirePermission,
  requireAnyPermission,
  getPermissoesDoUsuario,
  getModulosDoUsuario,
  loadPermissoesPorPerfil
};
