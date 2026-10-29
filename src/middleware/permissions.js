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
  auditoria: ['auditoria.visualizar'],
  advertencias: ['advertencias.visualizar'],
  usuarios: ['usuarios.visualizar', 'usuarios.pre_cadastrar'],
  rh: ['rh.visualizar']
};

const FIXED_PROFILE_PERMISSIONS = {
  ADMINISTRADOR: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'limpeza.visualizar',
    'limpeza.criar',
    'limpeza.editar',
    'compras.visualizar',
    'compras.visualizar_pedidos',
    'compras.criar',
    'compras.editar',
    'compras.aprovar',
    'compras.receber',
    'insumos.visualizar',
    'insumos.criar',
    'insumos.editar',
    'insumos.movimentar',
    'insumos.baixar',
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'eventos.excluir',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'documentos.arquivar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.escalonar',
    'comunicados.visualizar',
    'comunicados.criar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'usuarios.visualizar',
    'usuarios.pre_cadastrar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'rh.visualizar',
    'rh.gerenciar'
  ],
  GESTOR: [
    'dashboard.visualizar',
    'compras.visualizar',
    'compras.visualizar_pedidos',
    'compras.criar',
    'compras.aprovar',
    'insumos.visualizar',
    'insumos.baixar',
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'documentos.arquivar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'comunicados.visualizar',
    'comunicados.criar',
    'indicadores.visualizar',
    'limpeza.visualizar',
    'equipamentos.visualizar',
    'usuarios.visualizar',
    'advertencias.visualizar',
    'advertencias.solicitar'
  ],
  GESTOR_RH: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'comunicados.visualizar',
    'comunicados.criar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'documentos.arquivar',
    'usuarios.visualizar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'rh.visualizar',
    'rh.gerenciar'
  ],
  ANALISTA_RH: [
    'comunicados.visualizar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'rh.visualizar'
  ],
  RH: [
    'comunicados.visualizar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'rh.visualizar'
  ],
  GESTOR_INFRA: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.excluir',
    'ocorrencias.assumir',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'equipamentos.excluir',
    'comunicados.visualizar',
    'comunicados.criar',
    'documentos.visualizar',
    'documentos.baixar'
  ],
  TECNICO_N1: [
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'comunicados.visualizar'
  ],
  TECNICO_N2: [
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.editar',
    'comunicados.visualizar'
  ],
  TECNICO_N3: [
    'indicadores.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.excluir',
    'ocorrencias.assumir',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'comunicados.visualizar'
  ],
  GESTOR_OPERADOR: [
    'dashboard.visualizar',
    'insumos.visualizar',
    'insumos.criar',
    'insumos.editar',
    'insumos.movimentar',
    'insumos.baixar',
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'eventos.excluir',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'limpeza.visualizar',
    'comunicados.visualizar',
    'comunicados.criar'
  ],
  ADMINISTRACAO: [
    'comunicados.visualizar',
    'compras.visualizar_pedidos',
    'compras.receber',
    'eventos.visualizar',
    'insumos.visualizar',
    'insumos.baixar',
    'usuarios.pre_cadastrar',
    'limpeza.visualizar',
    'limpeza.criar',
    'limpeza.editar',
    'advertencias.visualizar',
    'advertencias.solicitar'
  ],
  LIMPEZA: [
    'comunicados.visualizar',
    'limpeza.visualizar',
    'limpeza.editar',
    'compras.visualizar_proprias',
    'compras.criar'
  ]
};

// Cache de permissões extras por usuário (TTL 1 min)
const _userPermCache = new Map();
const USER_PERM_TTL = 60 * 1000;

function clearUserPermCache(userId) {
  if (userId) {
    _userPermCache.delete(Number(userId));
  } else {
    _userPermCache.clear();
  }
}

async function loadPermissoesCustomizadasUsuario(usuarioId) {
  if (!usuarioId) return { extras: new Set(), revogadas: new Set() };
  const uid = Number(usuarioId);
  const now = Date.now();
  const cached = _userPermCache.get(uid);
  if (cached && (now - cached.timestamp < USER_PERM_TTL)) {
    return cached.data;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.chave, up.concedida
       FROM usuario_permissoes up
       JOIN permissoes p ON p.id = up.permissao_id
       WHERE up.usuario_id = ?`,
      [uid]
    );

    const data = { extras: new Set(), revogadas: new Set() };
    for (const r of rows) {
      if (r.concedida) {
        data.extras.add(r.chave);
      } else {
        data.revogadas.add(r.chave);
      }
    }
    _userPermCache.set(uid, { data, timestamp: now });
    return data;
  } catch (err) {
    // Falha silenciosa caso tabela não esteja acessível momentaneamente
    return { extras: new Set(), revogadas: new Set() };
  }
}

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
 * Prioridade:
 * 1. ADMIN / ADMIN_GERAL -> Bypass Total
 * 2. usuario_permissoes (concedida = 0) -> Bloqueado
 * 3. usuario_permissoes (concedida = 1) -> Permitido
 * 4. Perfil Base (FIXED_PROFILE_PERMISSIONS ou perfil_permissoes no banco)
 */
async function hasPermission(usuario, permissaoChave) {
  if (!usuario) return false;
  const perfil = normalizeProfile(usuario.perfil);

  // ADMIN e ADMIN_GERAL possuem bypass irrestrito
  if (['ADMIN', 'ADMINGERAL'].includes(perfil)) return true;

  // Verifica permissões customizadas individuais do colaborador
  if (usuario.id) {
    const userCustom = await loadPermissoesCustomizadasUsuario(usuario.id);
    if (userCustom.revogadas.has(permissaoChave)) return false;
    if (userCustom.extras.has(permissaoChave)) return true;
  }

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
 * Retorna a lista completa de chaves de permissão efetivas de um colaborador.
 * Une as permissões do perfil base + as permissões granulares adicionais concedidas.
 */
async function getPermissoesDoUsuario(usuario) {
  if (!usuario) return [];
  const perfil = normalizeProfile(usuario.perfil);

  let basePerms = [];
  if (['ADMIN', 'ADMINGERAL'].includes(perfil)) {
    const perms = await loadPermissoesPorPerfil();
    const allKeys = [
      ...Object.values(perms).flatMap(s => [...s]),
      ...Object.values(FIXED_PROFILE_PERMISSIONS).flatMap(arr => arr)
    ];
    return [...new Set(allKeys)];
  }

  if (Object.prototype.hasOwnProperty.call(FIXED_PROFILE_PERMISSIONS, perfil)) {
    basePerms = [...FIXED_PROFILE_PERMISSIONS[perfil]];
  } else {
    const perms = await loadPermissoesPorPerfil();
    const permSet = perms[perfil];
    if (permSet) basePerms = [...permSet];
  }

  // Mescla com permissões extras por usuário
  if (usuario.id) {
    const userCustom = await loadPermissoesCustomizadasUsuario(usuario.id);
    const combined = new Set(basePerms);
    for (const p of userCustom.extras) combined.add(p);
    for (const p of userCustom.revogadas) combined.delete(p);
    return [...combined];
  }

  return basePerms;
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
  loadPermissoesPorPerfil,
  clearUserPermCache,
  MODULE_PERMISSIONS,
  FIXED_PROFILE_PERMISSIONS
};

