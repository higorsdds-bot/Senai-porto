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
  const raw = String(perfil || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
  const aliases = {
    ADMINGERAL: 'ADMIN',
    ADMIN_GERAL: 'ADMIN',
    GESTORRH: 'GESTOR_RH',
    ANALISTARH: 'ANALISTA_RH',
    GESTORINFRA: 'GESTOR_INFRA',
    TECNICON1: 'TECNICO_N1',
    TECNICON2: 'TECNICO_N2',
    TECNICON3: 'TECNICO_N3',
    GESTOROPERADOR: 'GESTOR_OPERADOR'
  };
  return aliases[raw] || raw;
}

const MODULE_PERMISSIONS = {
  dashboard: ['dashboard.visualizar'],
  compras: [
    'compras.visualizar',
    'compras.visualizar_pedidos',
    'compras.visualizar_proprias',
    'compras.criar',
    'compras.editar',
    'compras.aprovar',
    'compras.receber'
  ],
  insumos: [
    'insumos.visualizar',
    'insumos.criar',
    'insumos.editar',
    'insumos.movimentar',
    'insumos.baixar'
  ],
  agenda: [
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar'
  ],
  documentos: [
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.criar',
    'documentos.editar',
    'documentos.baixar',
    'documentos.arquivar'
  ],
  ocorrencias: [
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar'
  ],
  comunicacao: [
    'comunicados.visualizar',
    'comunicados.criar'
  ],
  indicadores: ['indicadores.visualizar'],
  limpeza: [
    'limpeza.visualizar',
    'limpeza.criar',
    'limpeza.editar'
  ],
  equipamentos: [
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar'
  ],
  auditoria: ['auditoria.visualizar'],
  advertencias: [
    'advertencias.visualizar',
    'advertencias.solicitar',
    'advertencias.aplicar',
    'advertencias.homologar'
  ],
  usuarios: [
    'usuarios.visualizar',
    'usuarios.pre_cadastrar',
    'usuarios.criar',
    'usuarios.editar',
    'usuarios.bloquear'
  ],
  rh: ['rh.visualizar', 'rh.gerenciar']
};

const ALL_SYSTEM_PERMISSIONS = [
  'dashboard.visualizar',
  'indicadores.visualizar',
  'limpeza.visualizar',
  'limpeza.criar',
  'limpeza.editar',
  'limpeza.excluir',
  'compras.visualizar',
  'compras.visualizar_pedidos',
  'compras.visualizar_proprias',
  'compras.criar',
  'compras.editar',
  'compras.aprovar',
  'compras.receber',
  'compras.excluir',
  'equipamentos.visualizar',
  'equipamentos.criar',
  'equipamentos.editar',
  'equipamentos.excluir',
  'documentos.visualizar',
  'documentos.enviar',
  'documentos.criar',
  'documentos.editar',
  'documentos.baixar',
  'documentos.arquivar',
  'documentos.excluir',
  'ocorrencias.visualizar',
  'ocorrencias.criar',
  'ocorrencias.editar',
  'ocorrencias.assumir',
  'ocorrencias.atender',
  'ocorrencias.escalonar',
  'ocorrencias.excluir',
  'eventos.visualizar',
  'eventos.criar',
  'eventos.editar',
  'eventos.excluir',
  'insumos.visualizar',
  'insumos.criar',
  'insumos.editar',
  'insumos.movimentar',
  'insumos.baixar',
  'insumos.excluir',
  'comunicados.visualizar',
  'comunicados.criar',
  'comunicados.excluir',
  'usuarios.visualizar',
  'usuarios.criar',
  'usuarios.pre_cadastrar',
  'usuarios.editar',
  'usuarios.bloquear',
  'usuarios.excluir',
  'setores.visualizar',
  'setores.criar',
  'setores.editar',
  'setores.excluir',
  'auditoria.visualizar',
  'advertencias.visualizar',
  'advertencias.solicitar',
  'advertencias.aplicar',
  'advertencias.homologar',
  'rh.visualizar',
  'rh.gerenciar'
];

const FIXED_PROFILE_PERMISSIONS = {
  ADMIN: ALL_SYSTEM_PERMISSIONS,
  ADMINISTRADOR: ALL_SYSTEM_PERMISSIONS,
  GESTOR: [
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
    'comunicados.visualizar',
    'comunicados.criar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'setores.visualizar',
    'usuarios.visualizar',
    'advertencias.visualizar',
    'advertencias.solicitar'
  ],
  GESTOR_RH: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'comunicados.visualizar',
    'comunicados.criar',
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'documentos.arquivar',
    'usuarios.visualizar',
    'usuarios.criar',
    'usuarios.pre_cadastrar',
    'usuarios.editar',
    'usuarios.bloquear',
    'setores.visualizar',
    'setores.criar',
    'setores.editar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'rh.visualizar',
    'rh.gerenciar'
  ],
  ANALISTA_RH: [
    'dashboard.visualizar',
    'comunicados.visualizar',
    'eventos.visualizar',
    'usuarios.visualizar',
    'usuarios.pre_cadastrar',
    'usuarios.editar',
    'setores.visualizar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'rh.visualizar'
  ],
  RH: [
    'dashboard.visualizar',
    'comunicados.visualizar',
    'eventos.visualizar',
    'usuarios.visualizar',
    'usuarios.pre_cadastrar',
    'setores.visualizar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'advertencias.visualizar',
    'advertencias.solicitar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'rh.visualizar'
  ],
  GESTOR_INFRA: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'eventos.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.excluir',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'equipamentos.excluir',
    'insumos.visualizar',
    'insumos.criar',
    'insumos.editar',
    'insumos.movimentar',
    'compras.visualizar',
    'compras.criar',
    'compras.editar',
    'comunicados.visualizar',
    'comunicados.criar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'usuarios.visualizar',
    'setores.visualizar'
  ],
  TECNICO_N1: [
    'dashboard.visualizar',
    'eventos.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'documentos.visualizar',
    'documentos.baixar',
    'comunicados.visualizar'
  ],
  TECNICO: [
    'dashboard.visualizar',
    'eventos.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'documentos.visualizar',
    'documentos.baixar',
    'comunicados.visualizar'
  ],
  TECNICO_N2: [
    'dashboard.visualizar',
    'eventos.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.editar',
    'insumos.visualizar',
    'insumos.movimentar',
    'documentos.visualizar',
    'documentos.baixar',
    'comunicados.visualizar'
  ],
  TECNICO_N3: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'eventos.visualizar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'ocorrencias.excluir',
    'ocorrencias.assumir',
    'ocorrencias.atender',
    'ocorrencias.escalonar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'insumos.visualizar',
    'insumos.movimentar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'comunicados.visualizar'
  ],
  GESTOR_OPERADOR: [
    'dashboard.visualizar',
    'indicadores.visualizar',
    'insumos.visualizar',
    'insumos.criar',
    'insumos.editar',
    'insumos.movimentar',
    'insumos.baixar',
    'compras.visualizar',
    'compras.criar',
    'compras.editar',
    'equipamentos.visualizar',
    'equipamentos.criar',
    'equipamentos.editar',
    'documentos.visualizar',
    'documentos.enviar',
    'documentos.baixar',
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'eventos.excluir',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'ocorrencias.editar',
    'limpeza.visualizar',
    'limpeza.criar',
    'limpeza.editar',
    'comunicados.visualizar',
    'comunicados.criar',
    'usuarios.visualizar',
    'setores.visualizar'
  ],
  OPERADOR: [
    'dashboard.visualizar',
    'limpeza.visualizar',
    'limpeza.criar',
    'equipamentos.visualizar',
    'documentos.visualizar',
    'documentos.baixar',
    'ocorrencias.visualizar',
    'ocorrencias.criar',
    'eventos.visualizar',
    'eventos.criar',
    'insumos.visualizar',
    'insumos.movimentar',
    'comunicados.visualizar'
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

/**
 * Expande permissões de ação para garantir que a permissão base de leitura (.visualizar)
 * do respectivo módulo também esteja ativa quando concedida via permissões adicionais.
 */
function expandImpliedPermissions(permSet) {
  const list = [...permSet];
  for (const chave of list) {
    if (chave.startsWith('documentos.')) {
      permSet.add('documentos.visualizar');
      permSet.add('documentos.baixar');
    } else if (chave.startsWith('ocorrencias.')) {
      permSet.add('ocorrencias.visualizar');
      if (chave === 'ocorrencias.atender' || chave === 'ocorrencias.assumir' || chave === 'ocorrencias.escalonar') {
        permSet.add('ocorrencias.assumir');
        permSet.add('ocorrencias.atender');
        permSet.add('ocorrencias.editar');
      }
    } else if (chave.startsWith('insumos.')) {
      permSet.add('insumos.visualizar');
    } else if (chave.startsWith('compras.')) {
      if (chave === 'compras.criar' && !permSet.has('compras.visualizar')) {
        permSet.add('compras.visualizar_proprias');
      } else if (chave === 'compras.editar' || chave === 'compras.aprovar') {
        permSet.add('compras.visualizar');
      } else if (chave === 'compras.receber') {
        permSet.add('compras.visualizar_pedidos');
      }
    } else if (chave.startsWith('equipamentos.')) {
      permSet.add('equipamentos.visualizar');
    } else if (chave.startsWith('limpeza.')) {
      permSet.add('limpeza.visualizar');
    } else if (chave.startsWith('eventos.')) {
      permSet.add('eventos.visualizar');
    } else if (chave.startsWith('comunicados.')) {
      permSet.add('comunicados.visualizar');
    } else if (chave.startsWith('usuarios.') && chave !== 'usuarios.pre_cadastrar') {
      permSet.add('usuarios.visualizar');
    } else if (chave.startsWith('setores.')) {
      permSet.add('setores.visualizar');
    } else if (chave.startsWith('advertencias.')) {
      permSet.add('advertencias.visualizar');
    }
  }
  return permSet;
}

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
 * 1. ADMIN / ADMINISTRADOR -> Bypass Total
 * 2. Permissão efetiva calculada (Perfil Base + usuario_permissoes + implicações)
 */
async function hasPermission(usuario, permissaoChave) {
  if (!usuario) return false;
  const perfil = normalizeProfile(usuario.perfil);

  // ADMIN e ADMINISTRADOR possuem bypass irrestrito
  if (['ADMIN', 'ADMINISTRADOR'].includes(perfil)) return true;

  const todas = await getPermissoesDoUsuario(usuario);
  return todas.includes(permissaoChave);
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

  if (['ADMIN', 'ADMINISTRADOR'].includes(perfil)) {
    const perms = await loadPermissoesPorPerfil();
    const allKeys = [
      ...ALL_SYSTEM_PERMISSIONS,
      ...Object.values(perms).flatMap(s => [...s]),
      ...Object.values(FIXED_PROFILE_PERMISSIONS).flatMap(arr => arr)
    ];
    return [...new Set(allKeys)];
  }

  const combined = new Set();

  if (Object.prototype.hasOwnProperty.call(FIXED_PROFILE_PERMISSIONS, perfil)) {
    for (const p of FIXED_PROFILE_PERMISSIONS[perfil]) combined.add(p);
  }

  const perms = await loadPermissoesPorPerfil();
  if (perms[perfil]) {
    for (const p of perms[perfil]) combined.add(p);
  }

  // Mescla com permissões extras por usuário
  if (usuario.id) {
    const userCustom = await loadPermissoesCustomizadasUsuario(usuario.id);
    for (const p of userCustom.extras) combined.add(p);
    for (const p of userCustom.revogadas) combined.delete(p);
  }

  expandImpliedPermissions(combined);
  return [...combined];
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
  normalizeProfile,
  expandImpliedPermissions,
  ALL_SYSTEM_PERMISSIONS,
  MODULE_PERMISSIONS,
  FIXED_PROFILE_PERMISSIONS
};
