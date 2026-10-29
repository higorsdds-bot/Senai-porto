/**
 * ============================================================================
 * HUB ES+ / SECULT - Cloudflare Pages Functions + D1 Database (Serverless API)
 * ============================================================================
 * Manipulador unificado de rotas `/api/v1/*` compatível com Cloudflare Workers
 * e banco de dados SQLite nativo (Cloudflare D1 - binding `DB`).
 * ============================================================================
 */
import bcrypt from 'bcryptjs';

const DEFAULT_JWT_SECRET = 'secult_hub_es_plus_cloudflare_d1_secret_2026';

// ─── Hierarquia de Permissões e Módulos (Idêntica ao Backend Express) ─────────
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
  agenda: ['eventos.visualizar', 'eventos.criar', 'eventos.editar'],
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
  comunicacao: ['comunicados.visualizar', 'comunicados.criar'],
  indicadores: ['indicadores.visualizar'],
  limpeza: ['limpeza.visualizar', 'limpeza.criar', 'limpeza.editar'],
  equipamentos: ['equipamentos.visualizar', 'equipamentos.criar', 'equipamentos.editar'],
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
  ],
  VISITANTE: ['comunicados.visualizar', 'eventos.visualizar']
};

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

// ─── Utilitários de Resposta HTTP e CORS ─────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// ─── JWT WebCrypto (HMAC SHA-256 Nativo) ─────────────────────────────────────
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

async function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encHeader}.${encPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigStr = String.fromCharCode(...new Uint8Array(sig));
  return `${data}.${base64UrlEncode(sigStr)}`;
}

async function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido.');

  const [encHeader, encPayload, encSig] = parts;
  const data = `${encHeader}.${encPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigStr = base64UrlDecode(encSig);
  const sigBytes = new Uint8Array(sigStr.length);
  for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) throw new Error('Token inválido.');

  const payload = JSON.parse(base64UrlDecode(encPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return payload;
}

// ─── Helpers de Banco D1 ─────────────────────────────────────────────────────
async function d1All(db, sql, params = []) {
  const stmt = db.prepare(sql);
  const bound = params.length > 0 ? stmt.bind(...params) : stmt;
  const res = await bound.all();
  return res.results || [];
}

async function d1First(db, sql, params = []) {
  const stmt = db.prepare(sql);
  const bound = params.length > 0 ? stmt.bind(...params) : stmt;
  return await bound.first();
}

async function d1Run(db, sql, params = []) {
  const stmt = db.prepare(sql);
  const bound = params.length > 0 ? stmt.bind(...params) : stmt;
  const res = await bound.run();
  return {
    insertId: res.meta?.last_row_id || null,
    affectedRows: res.meta?.changes || 0
  };
}

async function registrarAuditoria(db, { usuario_id = null, acao, entidade = null, entidade_id = null, descricao = null, ip = null, user_agent = null }) {
  try {
    await d1Run(
      db,
      `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, descricao, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, acao, entidade, entidade_id, descricao, ip, user_agent]
    );
  } catch (e) {
    console.warn('[AUDITORIA D1] Erro ao gravar:', e.message);
  }
}

// ─── Permissões e Módulos do Usuário no D1 ───────────────────────────────────
async function obterPermissoesEModulos(db, usuario) {
  const perfilNorm = normalizeProfile(usuario.perfil);
  const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(perfilNorm);

  let permSet = new Set();

  if (isAdmin) {
    for (const p of ALL_SYSTEM_PERMISSIONS) permSet.add(p);
    try {
      const todas = await d1All(db, `SELECT chave FROM permissoes`);
      for (const r of todas) permSet.add(r.chave);
    } catch (_) {}
  } else {
    if (FIXED_PROFILE_PERMISSIONS[perfilNorm]) {
      for (const p of FIXED_PROFILE_PERMISSIONS[perfilNorm]) permSet.add(p);
    }
    try {
      const permsProfile = await d1All(
        db,
        `SELECT p.chave FROM perfil_permissoes pp
         JOIN permissoes p ON p.id = pp.permissao_id
         WHERE UPPER(pp.perfil) = ?`,
        [perfilNorm]
      );
      for (const r of permsProfile) permSet.add(r.chave);
    } catch (_) {}

    try {
      const permsUser = await d1All(
        db,
        `SELECT p.chave, up.concedida FROM usuario_permissoes up
         JOIN permissoes p ON p.id = up.permissao_id
         WHERE up.usuario_id = ?`,
        [usuario.id]
      );
      for (const r of permsUser) {
        if (r.concedida) permSet.add(r.chave);
        else permSet.delete(r.chave);
      }
    } catch (_) {}

    expandImpliedPermissions(permSet);
  }

  const permissoes = Array.from(permSet);
  const modulos = isAdmin
    ? Object.keys(MODULE_PERMISSIONS)
    : Object.entries(MODULE_PERMISSIONS)
        .filter(([, reqPerms]) => reqPerms.some(p => permSet.has(p)))
        .map(([mod]) => mod);

  return { permissoes, modulos };
}

async function syncPermissoesExtrasUsuarioD1(db, usuarioId, permissoesAdicionais) {
  try {
    await d1Run(db, `DELETE FROM usuario_permissoes WHERE usuario_id = ?`, [usuarioId]);
    if (!Array.isArray(permissoesAdicionais) || permissoesAdicionais.length === 0) return;

    for (const rawChave of permissoesAdicionais) {
      const chave = String(rawChave || '').trim();
      if (!chave) continue;
      await d1Run(db, `INSERT OR IGNORE INTO permissoes (chave, nome) VALUES (?, ?)`, [chave, chave]);
      const perm = await d1First(db, `SELECT id FROM permissoes WHERE chave = ? LIMIT 1`, [chave]);
      if (perm && perm.id) {
        await d1Run(
          db,
          `INSERT OR REPLACE INTO usuario_permissoes (usuario_id, permissao_id, concedida) VALUES (?, ?, 1)`,
          [usuarioId, perm.id]
        );
      }
    }
  } catch (e) {
    console.warn('[PERMISSOES D1] Erro ao sincronizar permissoes_adicionais:', e.message);
  }
}

async function anexarPermissoesAdicionaisD1(db, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  try {
    const extras = await d1All(
      db,
      `SELECT up.usuario_id, p.chave
       FROM usuario_permissoes up
       JOIN permissoes p ON p.id = up.permissao_id
       WHERE up.concedida = 1`
    );
    const mapExtras = {};
    for (const e of extras) {
      if (!mapExtras[e.usuario_id]) mapExtras[e.usuario_id] = [];
      mapExtras[e.usuario_id].push(e.chave);
    }
    for (const r of rows) {
      r.permissoes_adicionais = mapExtras[r.id] || [];
    }
  } catch (_) {
    for (const r of rows) {
      r.permissoes_adicionais = [];
    }
  }
  return rows;
}

// ─── Autenticação por Request ────────────────────────────────────────────────
async function autenticarRequest(request, db, secret) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { erro: jsonResponse({ success: false, message: 'Token não fornecido.' }, 401) };
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = await verifyJwt(token, secret);
    const usuario = await d1First(
      db,
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [decoded.id]
    );
    if (!usuario) {
      return { erro: jsonResponse({ success: false, message: 'Usuário não encontrado.' }, 401) };
    }
    if (usuario.status !== 'ATIVO') {
      return { erro: jsonResponse({ success: false, message: 'Conta inativa ou bloqueada.' }, 403) };
    }
    const { permissoes, modulos } = await obterPermissoesEModulos(db, usuario);
    return { usuario, permissoes, modulos };
  } catch (err) {
    return { erro: jsonResponse({ success: false, message: err.message || 'Token inválido.' }, 401) };
  }
}

function isUserAdmin(usuario) {
  const p = normalizeProfile(usuario?.perfil);
  return ['ADMIN', 'ADMINISTRADOR'].includes(p);
}

function hasPerm(auth, chave) {
  if (!auth || !auth.usuario) return false;
  if (isUserAdmin(auth.usuario)) return true;
  return Array.isArray(auth.permissoes) && auth.permissoes.includes(chave);
}

function hasAnyPerm(auth, chaves = []) {
  if (!auth || !auth.usuario) return false;
  if (isUserAdmin(auth.usuario)) return true;
  return chaves.some(c => Array.isArray(auth.permissoes) && auth.permissoes.includes(c));
}

// ─── Parser de Body Unificado (JSON + multipart/form-data com Base64) ────────
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getBodyData(request) {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const data = { _files: {} };
      for (const [key, value] of formData.entries()) {
        if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
          if (value.size > 0) {
            const buf = await value.arrayBuffer();
            const b64 = await arrayBufferToBase64(buf);
            const mime = value.type || 'application/octet-stream';
            const dataUrl = `data:${mime};base64,${b64}`;
            const fileMeta = {
              name: value.name || 'arquivo',
              size: value.size,
              type: mime,
              dataUrl
            };
            data._files[key] = fileMeta;
            if (key === 'imagem') data.imagem_url = dataUrl;
            if (key === 'foto') data.foto_url = dataUrl;
            if (key === 'anexo') {
              data.anexo_url = dataUrl;
              data.anexo_nome = value.name || 'anexo';
            }
            if (key === 'arquivo') data._arquivo = fileMeta;
          }
        } else {
          data[key] = value;
        }
      }
      return data;
    } catch (e) {
      console.warn('[BODY PARSER] Erro ao ler FormData:', e.message);
      return {};
    }
  }
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Handler Principal do Cloudflare Pages Functions ─────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const db = env.DB;
  if (!db) {
    return jsonResponse({
      success: false,
      message: 'Binding D1 "DB" não encontrado. Configure o banco D1 no Cloudflare Pages (Settings > Functions > D1 database bindings > DB).'
    }, 500);
  }

  const jwtSecret = env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const url = new URL(request.url);
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
  const userAgent = request.headers.get('User-Agent') || null;

  let route = url.pathname.replace(/^\/api(\/v1)?/, '');
  if (!route.startsWith('/')) route = '/' + route;
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);

  try {
    // =========================================================================
    // 1. HEALTH CHECK
    // =========================================================================
    if (route === '/health' && method === 'GET') {
      return jsonResponse({
        success: true,
        status: 'online',
        engine: 'Cloudflare Pages + D1 Serverless',
        timestamp: new Date().toISOString()
      });
    }

    // =========================================================================
    // 2. ROTAS PÚBLICAS (/publico/*)
    // =========================================================================
    if (route === '/publico/comunicados' && method === 'GET') {
      const prioridade = url.searchParams.get('prioridade');
      const q = url.searchParams.get('q');
      let conds = ['c.deleted_at IS NULL', "(c.destinatario_perfil = 'TODOS' OR c.destinatario_perfil IS NULL)"];
      let params = [];
      if (prioridade) { conds.push('c.prioridade = ?'); params.push(prioridade); }
      if (q) { conds.push('(c.titulo LIKE ? OR c.mensagem LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const rows = await d1All(
        db,
        `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.destinatario_perfil, c.created_at, c.updated_at,
                c.autor_id, u.nome AS autor_nome
         FROM comunicados c
         LEFT JOIN usuarios u ON u.id = c.autor_id
         WHERE ${conds.join(' AND ')}
         ORDER BY c.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchPubCom = route.match(/^\/publico\/comunicados\/(\d+)$/);
    if (matchPubCom && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.created_at, c.autor_id, u.nome AS autor_nome
         FROM comunicados c LEFT JOIN usuarios u ON u.id = c.autor_id
         WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
        [matchPubCom[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Comunicado não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/publico/eventos' && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      let conds = ['e.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('e.status = ?'); params.push(status); }
      if (q) { conds.push('(e.titulo LIKE ? OR e.local LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const rows = await d1All(
        db,
        `SELECT e.id, e.titulo, e.local, e.descricao, e.data, e.data_fim, e.status, e.created_at,
                e.responsavel_id, u.nome AS responsavel_nome
         FROM eventos e
         LEFT JOIN usuarios u ON u.id = e.responsavel_id
         WHERE ${conds.join(' AND ')}
         ORDER BY e.data ASC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchPubEv = route.match(/^\/publico\/eventos\/(\d+)$/);
    if (matchPubEv && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT e.id, e.titulo, e.local, e.descricao, e.data, e.data_fim, e.status, e.created_at,
                e.responsavel_id, u.nome AS responsavel_nome
         FROM eventos e LEFT JOIN usuarios u ON u.id = e.responsavel_id
         WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
        [matchPubEv[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Evento não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    // =========================================================================
    // 3. AUTENTICAÇÃO (/auth/*)
    // =========================================================================
    if (route === '/auth/login' && method === 'POST') {
      const { email, senha } = await getBodyData(request);
      if (!email || !senha) {
        return jsonResponse({ success: false, message: 'Email e senha são obrigatórios.' }, 422);
      }

      const usuario = await d1First(
        db,
        `SELECT u.id, u.nome, u.email, u.senha, u.perfil, u.setor_id, u.status, s.nome AS setor_nome
         FROM usuarios u
         LEFT JOIN setores s ON s.id = u.setor_id
         WHERE u.email = ? AND u.deleted_at IS NULL LIMIT 1`,
        [String(email).toLowerCase().trim()]
      );

      if (!usuario) {
        await registrarAuditoria(db, { acao: 'LOGIN_FALHOU', descricao: `Email inexistente: ${email}`, ip, user_agent: userAgent });
        return jsonResponse({ success: false, message: 'Credenciais inválidas.' }, 401);
      }

      if (usuario.status === 'PENDENTE') {
        return jsonResponse({ success: false, message: 'Sua solicitação de cadastro está pendente de aprovação por um administrador.' }, 403);
      }
      if (usuario.status === 'AGUARDANDO_ATIVACAO') {
        return jsonResponse({ success: false, message: 'Sua conta aguarda ativação pelo link enviado ao e-mail.' }, 403);
      }
      if (usuario.status !== 'ATIVO') {
        return jsonResponse({ success: false, message: `Conta com status ${usuario.status}. Contate o administrador.` }, 401);
      }

      const senhaValida = await bcrypt.compare(String(senha), usuario.senha);
      if (!senhaValida) {
        await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'LOGIN_FALHOU', descricao: 'Senha incorreta.', ip, user_agent: userAgent });
        return jsonResponse({ success: false, message: 'Credenciais inválidas.' }, 401);
      }

      const token = await signJwt({ id: usuario.id, email: usuario.email, perfil: usuario.perfil }, jwtSecret);
      await d1Run(db, `UPDATE usuarios SET ultimo_acesso = datetime('now'), ultimo_heartbeat = datetime('now') WHERE id = ?`, [usuario.id]);

      const { permissoes, modulos } = await obterPermissoesEModulos(db, usuario);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'LOGIN', descricao: 'Login realizado com sucesso.', ip, user_agent: userAgent });

      return jsonResponse({
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
          permissoes,
          modulos
        }
      });
    }

    if ((route === '/auth/solicitar-cadastro' || route === '/auth/registro') && method === 'POST') {
      const { nome, email, setor_id } = await getBodyData(request);
      if (!nome || String(nome).trim().length < 3 || !email || !String(email).includes('@')) {
        return jsonResponse({ success: false, message: 'Informe nome completo e e-mail válido.' }, 422);
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const existing = await d1First(db, `SELECT id, status FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`, [cleanEmail]);
      if (existing) {
        return jsonResponse({ success: false, message: 'Este e-mail já possui cadastro ou solicitação registrada.' }, 409);
      }
      const tempHash = await bcrypt.hash(crypto.randomUUID(), 10);
      const res = await d1Run(
        db,
        `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status) VALUES (?, ?, ?, 'OPERADOR', ?, 'PENDENTE')`,
        [String(nome).trim(), cleanEmail, tempHash, setor_id || null]
      );
      await registrarAuditoria(db, {
        acao: 'SOLICITACAO_CADASTRO',
        entidade: 'usuarios',
        entidade_id: res.insertId,
        descricao: `Solicitação de cadastro para ${nome} (${cleanEmail}).`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({
        success: true,
        message: 'Solicitação de cadastro enviada com sucesso! Aguarde a aprovação do Administrador Geral.',
        data: { id: res.insertId }
      }, 201);
    }

    if (route === '/auth/verificar-token-ativacao' && method === 'GET') {
      const token = url.searchParams.get('token') || '';
      if (!token || token.length < 10) {
        return jsonResponse({ success: false, message: 'Link de ativação inválido.' }, 400);
      }
      const tokenHash = await sha256Hex(token.trim());
      const item = await d1First(
        db,
        `SELECT t.id AS token_id, t.usuario_id, t.expira_em, t.usado_em,
                u.nome, u.email, u.perfil, u.status, s.nome AS setor_nome
         FROM tokens_ativacao t
         JOIN usuarios u ON u.id = t.usuario_id
         LEFT JOIN setores s ON s.id = u.setor_id
         WHERE t.token_hash = ? AND u.deleted_at IS NULL LIMIT 1`,
        [tokenHash]
      );
      if (!item) return jsonResponse({ success: false, message: 'Link de ativação não encontrado.' }, 400);
      if (item.usado_em) return jsonResponse({ success: false, message: 'Este link já foi utilizado.' }, 400);
      return jsonResponse({
        success: true,
        data: {
          nome: item.nome,
          email: item.email,
          perfil: item.perfil,
          setor_nome: item.setor_nome || 'Geral'
        }
      });
    }

    if (route === '/auth/ativar-conta' && method === 'POST') {
      const { token, senha, confirmacao_senha } = await getBodyData(request);
      if (!token) return jsonResponse({ success: false, message: 'Token de ativação é obrigatório.' }, 400);
      if (!senha || String(senha).length < 8) {
        return jsonResponse({ success: false, message: 'A senha deve possuir no mínimo 8 caracteres.' }, 422);
      }
      if (confirmacao_senha !== undefined && senha !== confirmacao_senha) {
        return jsonResponse({ success: false, message: 'A confirmação de senha não coincide.' }, 422);
      }
      const tokenHash = await sha256Hex(String(token).trim());
      const item = await d1First(
        db,
        `SELECT t.id AS token_id, t.usuario_id, t.usado_em, u.nome, u.email
         FROM tokens_ativacao t
         JOIN usuarios u ON u.id = t.usuario_id
         WHERE t.token_hash = ? AND u.deleted_at IS NULL LIMIT 1`,
        [tokenHash]
      );
      if (!item || item.usado_em) {
        return jsonResponse({ success: false, message: 'Link de ativação inválido ou já utilizado.' }, 400);
      }
      const senhaHash = await bcrypt.hash(String(senha), 10);
      await d1Run(db, `UPDATE usuarios SET senha = ?, status = 'ATIVO', updated_at = datetime('now') WHERE id = ?`, [senhaHash, item.usuario_id]);
      await d1Run(db, `UPDATE tokens_ativacao SET usado_em = datetime('now'), ip_ativacao = ? WHERE id = ?`, [ip, item.token_id]);
      await registrarAuditoria(db, {
        usuario_id: item.usuario_id,
        acao: 'ATIVACAO_CONTA',
        entidade: 'usuarios',
        entidade_id: item.usuario_id,
        descricao: `Conta ativada com sucesso por ${item.nome} (${item.email}).`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({ success: true, message: 'Sua conta foi ativada com sucesso! Você já pode fazer login.' });
    }

    // ─── A partir daqui todas as rotas exigem JWT válido ─────────────────────
    const auth = await autenticarRequest(request, db, jwtSecret);
    if (auth.erro) return auth.erro;
    const { usuario, permissoes, modulos } = auth;

    if (route === '/auth/me' && method === 'GET') {
      return jsonResponse({
        success: true,
        data: { usuario, permissoes, modulos }
      });
    }

    if (route === '/auth/heartbeat' && method === 'POST') {
      await d1Run(db, `UPDATE usuarios SET ultimo_heartbeat = datetime('now') WHERE id = ?`, [usuario.id]);
      return jsonResponse({ success: true });
    }

    if (route === '/auth/logout' && method === 'POST') {
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'LOGOUT', descricao: 'Logout realizado.', ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Logout realizado com sucesso.' });
    }

    if (route === '/auth/alterar-senha' && method === 'PUT') {
      const { senha_atual, nova_senha } = await getBodyData(request);
      if (!senha_atual) return jsonResponse({ success: false, message: 'Informe a senha atual.' }, 422);
      if (!nova_senha || String(nova_senha).length < 8) {
        return jsonResponse({ success: false, message: 'A nova senha precisa ter no mínimo 8 caracteres.' }, 422);
      }
      const userRow = await d1First(db, `SELECT id, senha FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [usuario.id]);
      if (!userRow) return jsonResponse({ success: false, message: 'Usuário não encontrado.' }, 404);
      const ok = await bcrypt.compare(String(senha_atual), userRow.senha);
      if (!ok) return jsonResponse({ success: false, message: 'Senha atual incorreta.' }, 401);
      const novoHash = await bcrypt.hash(String(nova_senha), 10);
      await d1Run(db, `UPDATE usuarios SET senha = ?, updated_at = datetime('now') WHERE id = ?`, [novoHash, usuario.id]);
      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: 'ALTERAR_SENHA',
        entidade: 'usuarios',
        entidade_id: usuario.id,
        descricao: 'Senha alterada pelo próprio usuário.',
        ip,
        user_agent: userAgent
      });
      return jsonResponse({ success: true, message: 'Senha alterada com sucesso!' });
    }

    // =========================================================================
    // 4. DASHBOARD & INDICADORES (/dashboard/*)
    // =========================================================================
    if ((route === '/dashboard' || route === '/dashboard/stats') && method === 'GET') {
      const [
        limpeza,
        compras,
        equipamentos,
        documentos,
        ocorrencias,
        eventos,
        insumos,
        usuariosStats,
        ultimasAcoes
      ] = await Promise.all([
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes, SUM(CASE WHEN status = 'em_execucao' THEN 1 ELSE 0 END) AS em_execucao, SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) AS concluidas FROM limpeza WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes, SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) AS aprovadas, SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) AS entregues, SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS canceladas, COALESCE(SUM(valor_estimado), 0) AS valor_total FROM compras WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN estado = 'bom' THEN 1 ELSE 0 END) AS em_bom_estado, SUM(CASE WHEN estado = 'manutencao' THEN 1 ELSE 0 END) AS em_manutencao, SUM(CASE WHEN estado = 'descartado' THEN 1 ELSE 0 END) AS descartados FROM equipamentos WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) AS ativos, SUM(CASE WHEN status = 'arquivado' THEN 1 ELSE 0 END) AS arquivados FROM documentos WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) AS abertas, SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento, SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) AS resolvidas FROM ocorrencias WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'agendado' THEN 1 ELSE 0 END) AS agendados, SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento, SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) AS concluidos, SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelados FROM eventos WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN quantidade <= estoque_minimo THEN 1 ELSE 0 END) AS baixo_estoque FROM insumos WHERE deleted_at IS NULL`),
        d1First(db, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'ATIVO' THEN 1 ELSE 0 END) AS ativos, SUM(CASE WHEN status = 'INATIVO' THEN 1 ELSE 0 END) AS inativos, SUM(CASE WHEN status = 'BLOQUEADO' THEN 1 ELSE 0 END) AS bloqueados, SUM(CASE WHEN ultimo_heartbeat >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END) AS online_agora FROM usuarios WHERE deleted_at IS NULL`),
        d1All(db, `SELECT a.id, a.acao, a.entidade, a.entidade_id, a.descricao, a.created_at, u.nome AS usuario_nome FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id ORDER BY a.created_at DESC LIMIT 5`)
      ]);

      return jsonResponse({
        success: true,
        data: {
          limpeza,
          compras,
          equipamentos,
          documentos,
          ocorrencias,
          eventos,
          insumos,
          usuarios: usuariosStats,
          ultimas_acoes: ultimasAcoes
        }
      });
    }

    if (route === '/dashboard/indicadores' && method === 'GET') {
      const diasNum = Math.min(Math.max(parseInt(url.searchParams.get('periodo_dias') || '30', 10) || 30, 1), 365);
      const offsetStr = `-${diasNum} days`;
      const [comprasPorDia, limpezaPorDia, ocorrenciasPorDia] = await Promise.all([
        d1All(db, `SELECT date(created_at) AS data, status, COUNT(*) AS total FROM compras WHERE created_at >= date('now', ?) AND deleted_at IS NULL GROUP BY date(created_at), status ORDER BY data ASC`, [offsetStr]),
        d1All(db, `SELECT date(created_at) AS data, status, COUNT(*) AS total FROM limpeza WHERE created_at >= date('now', ?) AND deleted_at IS NULL GROUP BY date(created_at), status ORDER BY data ASC`, [offsetStr]),
        d1All(db, `SELECT date(created_at) AS data, status, COUNT(*) AS total FROM ocorrencias WHERE created_at >= date('now', ?) AND deleted_at IS NULL GROUP BY date(created_at), status ORDER BY data ASC`, [offsetStr])
      ]);
      return jsonResponse({
        success: true,
        data: {
          periodo_dias: diasNum,
          compras_por_dia: comprasPorDia,
          limpeza_por_dia: limpezaPorDia,
          ocorrencias_por_dia: ocorrenciasPorDia
        }
      });
    }

    // =========================================================================
    // 5. SETORES (/setores)
    // =========================================================================
    if (route === '/setores' && method === 'GET') {
      const rows = await d1All(
        db,
        `SELECT s.id, s.nome, s.created_at,
                (SELECT COUNT(*) FROM usuarios u WHERE u.setor_id = s.id AND u.deleted_at IS NULL) AS total_usuarios
         FROM setores s WHERE s.deleted_at IS NULL ORDER BY s.nome ASC`
      );
      return jsonResponse({ success: true, data: rows });
    }

    if (route === '/setores' && method === 'POST') {
      if (!hasPerm(auth, 'setores.criar')) {
        return jsonResponse({ success: false, message: 'Sem permissão para criar setor.' }, 403);
      }
      const { nome } = await getBodyData(request);
      if (!nome || String(nome).trim().length < 2) {
        return jsonResponse({ success: false, message: 'Nome do setor inválido.' }, 422);
      }
      const res = await d1Run(db, `INSERT INTO setores (nome) VALUES (?)`, [String(nome).trim()]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_SETOR', entidade: 'setores', entidade_id: res.insertId, descricao: `Setor "${nome}" criado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, data: { id: res.insertId, nome: String(nome).trim() } }, 201);
    }

    // =========================================================================
    // 6. USUÁRIOS (/usuarios/*)
    // =========================================================================
    if (route === '/usuarios/permissoes-disponiveis' && method === 'GET') {
      const rows = await d1All(db, `SELECT id, chave, nome, descricao FROM permissoes ORDER BY chave ASC`);
      return jsonResponse({ success: true, data: rows });
    }

    if (route === '/usuarios/pre-cadastros' && method === 'GET') {
      if (!hasAnyPerm(auth, ['usuarios.pre_cadastrar', 'usuarios.visualizar'])) {
        return jsonResponse({ success: false, message: 'Sem permissão para visualizar pré-cadastros.' }, 403);
      }
      const rows = await d1All(
        db,
        `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.created_at, s.nome AS setor_nome
         FROM usuarios u
         LEFT JOIN setores s ON s.id = u.setor_id
         WHERE u.deleted_at IS NULL
         ORDER BY u.created_at DESC LIMIT 50`
      );
      await anexarPermissoesAdicionaisD1(db, rows);
      return jsonResponse({ success: true, data: rows });
    }

    if (route === '/usuarios/pre-cadastro' && method === 'POST') {
      if (!hasAnyPerm(auth, ['usuarios.pre_cadastrar', 'usuarios.criar'])) {
        return jsonResponse({ success: false, message: 'Sem permissão para pré-cadastrar colaboradores.' }, 403);
      }
      const { nome, email, senha } = await getBodyData(request);
      if (!nome || String(nome).trim().length < 3 || !email || !String(email).includes('@') || !senha || String(senha).length < 8) {
        return jsonResponse({ success: false, message: 'Informe nome (mín. 3), e-mail válido e senha (mín. 8 caracteres).' }, 422);
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const existing = await d1First(db, `SELECT id FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`, [cleanEmail]);
      if (existing) {
        return jsonResponse({ success: false, message: 'Este e-mail já está cadastrado no sistema.' }, 409);
      }
      const senhaHash = await bcrypt.hash(String(senha), 10);
      const res = await d1Run(
        db,
        `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status) VALUES (?, ?, ?, 'OPERADOR', NULL, 'PENDENTE')`,
        [String(nome).trim(), cleanEmail, senhaHash]
      );
      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: 'PRE_CADASTRO_USUARIO',
        entidade: 'usuarios',
        entidade_id: res.insertId,
        descricao: `Pré-cadastro realizado para "${String(nome).trim()}" (${cleanEmail}).`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({
        success: true,
        message: 'Colaborador pré-cadastrado com sucesso! Encaminhado para aprovação do Administrador Geral.',
        data: { id: res.insertId }
      }, 201);
    }

    const matchPreCadId = route.match(/^\/usuarios\/pre-cadastro\/(\d+)$/);
    if (matchPreCadId && method === 'PUT') {
      if (!hasAnyPerm(auth, ['usuarios.pre_cadastrar', 'usuarios.editar'])) {
        return jsonResponse({ success: false, message: 'Sem permissão para editar pré-cadastro.' }, 403);
      }
      const id = matchPreCadId[1];
      const { nome, email, senha } = await getBodyData(request);
      const existing = await d1First(db, `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!existing) return jsonResponse({ success: false, message: 'Solicitação não encontrada.' }, 404);
      if (!isUserAdmin(usuario) && existing.status !== 'PENDENTE') {
        return jsonResponse({ success: false, message: 'Apenas solicitações PENDENTES podem ser alteradas.' }, 403);
      }
      const cleanEmail = email ? String(email).toLowerCase().trim() : existing.email;
      const dup = await d1First(db, `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, [cleanEmail, id]);
      if (dup) return jsonResponse({ success: false, message: 'Já existe outro usuário com este e-mail.' }, 409);

      let sql = `UPDATE usuarios SET nome = ?, email = ?, updated_at = datetime('now')`;
      const params = [nome ? String(nome).trim() : existing.nome, cleanEmail];
      if (senha && String(senha).length >= 8) {
        const hash = await bcrypt.hash(String(senha), 10);
        sql += `, senha = ?`;
        params.push(hash);
      }
      sql += ` WHERE id = ?`;
      params.push(id);
      await d1Run(db, sql, params);
      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: 'EDITAR_PRE_CADASTRO',
        entidade: 'usuarios',
        entidade_id: Number(id),
        descricao: `Pré-cadastro #${id} atualizado por ${usuario.nome}.`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({ success: true, message: 'Solicitação atualizada com sucesso!' });
    }

    if (route === '/usuarios' && method === 'GET') {
      const status = url.searchParams.get('status');
      const perfil = url.searchParams.get('perfil');
      const setor_id = url.searchParams.get('setor_id');
      const q = url.searchParams.get('q');

      let conds = ['u.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('u.status = ?'); params.push(status); }
      if (perfil) { conds.push('u.perfil = ?'); params.push(perfil); }
      if (setor_id) { conds.push('u.setor_id = ?'); params.push(setor_id); }
      if (q) {
        conds.push('(u.nome LIKE ? OR u.email LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }

      const rows = await d1All(
        db,
        `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
                s.nome AS setor_nome,
                CASE WHEN u.ultimo_heartbeat >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END AS online
         FROM usuarios u
         LEFT JOIN setores s ON s.id = u.setor_id
         WHERE ${conds.join(' AND ')}
         ORDER BY u.nome ASC`,
        params
      );
      await anexarPermissoesAdicionaisD1(db, rows);
      return jsonResponse({ success: true, data: rows });
    }

    const matchUsuarioId = route.match(/^\/usuarios\/(\d+)$/);
    if (matchUsuarioId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
                s.nome AS setor_nome,
                CASE WHEN u.ultimo_heartbeat >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END AS online
         FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id
         WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
        [matchUsuarioId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Usuário não encontrado.' }, 404);
      await anexarPermissoesAdicionaisD1(db, [row]);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/usuarios' && method === 'POST') {
      if (!hasAnyPerm(auth, ['usuarios.criar', 'usuarios.pre_cadastrar'])) {
        return jsonResponse({ success: false, message: 'Sem permissão para criar usuário.' }, 403);
      }
      const { nome, email, senha, perfil, setor_id, status, permissoes_adicionais } = await getBodyData(request);
      if (!nome || !email) {
        return jsonResponse({ success: false, message: 'Nome e e-mail são obrigatórios.' }, 422);
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const dup = await d1First(db, `SELECT id FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`, [cleanEmail]);
      if (dup) {
        return jsonResponse({ success: false, message: 'E-mail já cadastrado no sistema.' }, 422);
      }
      const senhaHash = await bcrypt.hash(String(senha || 'Secult@2026!'), 10);
      const statusFinal = isUserAdmin(usuario) ? (status || 'ATIVO') : 'PENDENTE';
      const perfilFinal = perfil || 'OPERADOR';
      const res = await d1Run(
        db,
        `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [String(nome).trim(), cleanEmail, senhaHash, perfilFinal, setor_id || null, statusFinal]
      );
      if (Array.isArray(permissoes_adicionais)) {
        await syncPermissoesExtrasUsuarioD1(db, res.insertId, permissoes_adicionais);
      }
      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: 'CRIAR_USUARIO',
        entidade: 'usuarios',
        entidade_id: res.insertId,
        descricao: `Usuário "${nome}" (${cleanEmail}) criado com perfil ${perfilFinal}.`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({ success: true, message: 'Usuário cadastrado com sucesso.', data: { id: res.insertId } }, 201);
    }

    if (matchUsuarioId && method === 'PUT') {
      if (!hasPerm(auth, 'usuarios.editar')) {
        return jsonResponse({ success: false, message: 'Sem permissão para editar usuário.' }, 403);
      }
      const id = matchUsuarioId[1];
      const { nome, email, perfil, setor_id, status, senha, permissoes_adicionais } = await getBodyData(request);
      const atual = await d1First(db, `SELECT * FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!atual) return jsonResponse({ success: false, message: 'Usuário não encontrado.' }, 404);

      const cleanEmail = email ? String(email).toLowerCase().trim() : atual.email;
      if (cleanEmail !== atual.email) {
        const dup = await d1First(db, `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, [cleanEmail, id]);
        if (dup) return jsonResponse({ success: false, message: 'Este e-mail já está em uso por outro usuário.' }, 422);
      }

      const nomeFinal = nome ? String(nome).trim() : atual.nome;
      const perfilFinal = perfil || atual.perfil;
      const setorFinal = setor_id !== undefined ? (setor_id || null) : atual.setor_id;
      const statusFinal = status || atual.status;

      if (senha && String(senha).trim().length >= 8) {
        const hash = await bcrypt.hash(String(senha).trim(), 10);
        await d1Run(
          db,
          `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, status = ?, senha = ?, updated_at = datetime('now') WHERE id = ?`,
          [nomeFinal, cleanEmail, perfilFinal, setorFinal, statusFinal, hash, id]
        );
      } else {
        await d1Run(
          db,
          `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
          [nomeFinal, cleanEmail, perfilFinal, setorFinal, statusFinal, id]
        );
      }

      if (permissoes_adicionais !== undefined) {
        await syncPermissoesExtrasUsuarioD1(db, Number(id), permissoes_adicionais);
      }

      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: 'EDITAR_USUARIO',
        entidade: 'usuarios',
        entidade_id: Number(id),
        descricao: `Usuário #${id} ("${nomeFinal}") atualizado (Perfil: ${perfilFinal}, Status: ${statusFinal}).`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({ success: true, message: 'Usuário atualizado com sucesso.' });
    }

    const matchUsuarioStatus = route.match(/^\/usuarios\/(\d+)\/status$/);
    if (matchUsuarioStatus && method === 'PATCH') {
      if (!hasAnyPerm(auth, ['usuarios.bloquear', 'usuarios.editar'])) {
        return jsonResponse({ success: false, message: 'Sem permissão para alterar status de usuário.' }, 403);
      }
      const id = matchUsuarioStatus[1];
      const { status } = await getBodyData(request);
      await d1Run(db, `UPDATE usuarios SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ALTERAR_STATUS_USUARIO', entidade: 'usuarios', entidade_id: Number(id), descricao: `Status alterado para ${status}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: `Status alterado para ${status}.` });
    }

    if (matchUsuarioId && method === 'DELETE') {
      if (!hasPerm(auth, 'usuarios.editar')) {
        return jsonResponse({ success: false, message: 'Sem permissão para excluir usuário.' }, 403);
      }
      const id = matchUsuarioId[1];
      if (Number(id) === Number(usuario.id)) {
        return jsonResponse({ success: false, message: 'Você não pode excluir sua própria conta.' }, 422);
      }
      await d1Run(db, `UPDATE usuarios SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EXCLUIR_USUARIO', entidade: 'usuarios', entidade_id: Number(id), descricao: `Usuário #${id} removido (soft delete).`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Usuário removido com sucesso.' });
    }

    // =========================================================================
    // 7. OCORRÊNCIAS (/ocorrencias/*)
    // =========================================================================
    if (route === '/ocorrencias' && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      let conds = ['o.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('o.status = ?'); params.push(status); }
      if (q) {
        conds.push('(o.local LIKE ? OR o.descricao LIKE ? OR o.tipo LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const rows = await d1All(
        db,
        `SELECT o.id, o.local, o.descricao, o.tipo, o.status,
                o.nivel_atendimento, o.equipamento_id, o.parecer_tecnico,
                o.foto_url, o.anexo_url, o.anexo_nome,
                o.created_at, o.updated_at,
                o.usuario_id, u1.nome AS usuario_nome,
                o.responsavel_id, u2.nome AS responsavel_nome,
                eq.nome AS equipamento_nome, eq.patrimonio AS equipamento_patrimonio
         FROM ocorrencias o
         LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
         LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
         LEFT JOIN equipamentos eq ON eq.id = o.equipamento_id
         WHERE ${conds.join(' AND ')}
         ORDER BY o.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchOcorrenciaId = route.match(/^\/ocorrencias\/(\d+)$/);
    if (matchOcorrenciaId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT o.id, o.local, o.descricao, o.tipo, o.status,
                o.nivel_atendimento, o.equipamento_id, o.parecer_tecnico,
                o.foto_url, o.anexo_url, o.anexo_nome,
                o.created_at, o.updated_at,
                o.usuario_id, u1.nome AS usuario_nome,
                o.responsavel_id, u2.nome AS responsavel_nome,
                eq.nome AS equipamento_nome, eq.patrimonio AS equipamento_patrimonio
         FROM ocorrencias o
         LEFT JOIN usuarios u1 ON u1.id = o.usuario_id
         LEFT JOIN usuarios u2 ON u2.id = o.responsavel_id
         LEFT JOIN equipamentos eq ON eq.id = o.equipamento_id
         WHERE o.id = ? AND o.deleted_at IS NULL LIMIT 1`,
        [matchOcorrenciaId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Ocorrência não encontrada.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/ocorrencias' && method === 'POST') {
      const body = await getBodyData(request);
      const { local, descricao, tipo, responsavel_id, nivel_atendimento, equipamento_id, foto_url, foto_base64, anexo_url, anexo_nome } = body;
      if (!local || String(local).trim().length < 3) {
        return jsonResponse({ success: false, message: 'Informe um local com no mínimo 3 caracteres.' }, 422);
      }
      const nivelFinal = ['N1', 'N2', 'N3'].includes(nivel_atendimento) ? nivel_atendimento : 'N1';
      const eqId = equipamento_id ? Number(equipamento_id) : null;
      const fotoFinal = foto_url || foto_base64 || null;

      const res = await d1Run(
        db,
        `INSERT INTO ocorrencias (local, descricao, tipo, status, nivel_atendimento, equipamento_id, usuario_id, responsavel_id, foto_url, anexo_url, anexo_nome)
         VALUES (?, ?, ?, 'aberto', ?, ?, ?, ?, ?, ?, ?)`,
        [String(local).trim(), descricao || null, tipo || null, nivelFinal, eqId, usuario.id, responsavel_id || null, fotoFinal, anexo_url || null, anexo_nome || null]
      );

      if (eqId) {
        await d1Run(db, `UPDATE equipamentos SET estado = 'manutencao', updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [eqId]);
      }

      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: res.insertId, descricao: `Ocorrência criada em "${local}".`, ip, user_agent: userAgent });
      return jsonResponse({
        success: true,
        message: 'Ocorrência registrada com sucesso.',
        data: { id: res.insertId, nivel_atendimento: nivelFinal, foto_url: fotoFinal, anexo_url: anexo_url || null, anexo_nome: anexo_nome || null }
      }, 201);
    }

    if (matchOcorrenciaId && method === 'PUT') {
      const id = matchOcorrenciaId[1];
      const { local, descricao, tipo, status, nivel_atendimento, parecer_tecnico, responsavel_id, equipamento_id } = await getBodyData(request);
      const eqId = equipamento_id ? Number(equipamento_id) : null;
      await d1Run(
        db,
        `UPDATE ocorrencias SET local = COALESCE(?, local), descricao = COALESCE(?, descricao), tipo = COALESCE(?, tipo),
         status = COALESCE(?, status), nivel_atendimento = COALESCE(?, nivel_atendimento),
         parecer_tecnico = COALESCE(?, parecer_tecnico), responsavel_id = COALESCE(?, responsavel_id),
         equipamento_id = COALESCE(?, equipamento_id),
         updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
        [local || null, descricao || null, tipo || null, status || null, nivel_atendimento || null, parecer_tecnico || null, responsavel_id || null, eqId, id]
      );
      if (status === 'resolvido' && eqId) {
        await d1Run(db, `UPDATE equipamentos SET estado = 'bom', updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [eqId]);
      }
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: Number(id), descricao: `Ocorrência #${id} atualizada.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Ocorrência atualizada com sucesso.' });
    }

    const matchOcorrenciaAssumir = route.match(/^\/ocorrencias\/(\d+)\/assumir$/);
    if (matchOcorrenciaAssumir && (method === 'PATCH' || method === 'POST')) {
      const id = matchOcorrenciaAssumir[1];
      await d1Run(db, `UPDATE ocorrencias SET responsavel_id = ?, status = 'em_andamento', updated_at = datetime('now') WHERE id = ?`, [usuario.id, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ASSUMIR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: Number(id), descricao: `Chamado #${id} assumido por ${usuario.nome}.`, ip, user_agent: userAgent });
      return jsonResponse({
        success: true,
        message: `Atendimento assumido com sucesso por ${usuario.nome}!`,
        data: { responsavel_id: usuario.id, responsavel_nome: usuario.nome, status: 'em_andamento' }
      });
    }

    const matchOcorrenciaEscalonar = route.match(/^\/ocorrencias\/(\d+)\/escalonar$/);
    if (matchOcorrenciaEscalonar && (method === 'PATCH' || method === 'POST')) {
      const id = matchOcorrenciaEscalonar[1];
      const { nivel, nivel_atendimento, parecer_tecnico } = await getBodyData(request);
      const novoNivel = nivel || nivel_atendimento || 'N2';
      const atual = await d1First(db, `SELECT id, nivel_atendimento, parecer_tecnico FROM ocorrencias WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!atual) return jsonResponse({ success: false, message: 'Ocorrência não encontrada.' }, 404);

      let parecerAtualizado = atual.parecer_tecnico || '';
      if (parecer_tecnico && String(parecer_tecnico).trim()) {
        const entrada = `[${new Date().toLocaleString('pt-BR')}] Escalonado de ${atual.nivel_atendimento || 'N1'} para ${novoNivel} por ${usuario.nome}:\n${String(parecer_tecnico).trim()}\n`;
        parecerAtualizado = parecerAtualizado ? `${parecerAtualizado}\n${entrada}` : entrada;
      }

      await d1Run(db, `UPDATE ocorrencias SET nivel_atendimento = ?, parecer_tecnico = ?, updated_at = datetime('now') WHERE id = ?`, [novoNivel, parecerAtualizado, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ESCALONAR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: Number(id), descricao: `Ocorrência #${id} escalonada para ${novoNivel}.`, ip, user_agent: userAgent });
      return jsonResponse({
        success: true,
        message: `Chamado escalonado com sucesso para o nível ${novoNivel}!`,
        data: { nivel_atendimento: novoNivel, parecer_tecnico: parecerAtualizado }
      });
    }

    const matchOcorrenciaStatus = route.match(/^\/ocorrencias\/(\d+)\/status$/);
    if (matchOcorrenciaStatus && method === 'PATCH') {
      const id = matchOcorrenciaStatus[1];
      const { status } = await getBodyData(request);
      await d1Run(db, `UPDATE ocorrencias SET status = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [status, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ALTERAR_STATUS_OCORRENCIA', entidade: 'ocorrencias', entidade_id: Number(id), descricao: `Status da ocorrência #${id} alterado para ${status}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: `Status alterado para ${status}.` });
    }

    if (matchOcorrenciaId && method === 'DELETE') {
      const id = matchOcorrenciaId[1];
      await d1Run(db, `UPDATE ocorrencias SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EXCLUIR_OCORRENCIA', entidade: 'ocorrencias', entidade_id: Number(id), descricao: `Ocorrência #${id} removida.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Ocorrência removida.' });
    }

    // =========================================================================
    // 8. COMPRAS (/compras/*)
    // =========================================================================
    if (route === '/compras' && method === 'GET') {
      const status = url.searchParams.get('status');
      const setor_id = url.searchParams.get('setor_id');
      const q = url.searchParams.get('q');

      let conds = ['c.deleted_at IS NULL'];
      let params = [];

      const visualizaTodas = hasPerm(auth, 'compras.visualizar');
      const visualizaProprias = hasPerm(auth, 'compras.visualizar_proprias');
      const visualizaPedidos = hasPerm(auth, 'compras.visualizar_pedidos');
      if (!visualizaTodas && visualizaProprias) {
        conds.push('c.solicitante_id = ?');
        params.push(usuario.id);
      } else if (!visualizaTodas && visualizaPedidos) {
        conds.push(`c.status IN ('aprovado', 'entregue')`);
      }

      if (status) { conds.push('c.status = ?'); params.push(status); }
      if (setor_id) { conds.push('c.setor_id = ?'); params.push(setor_id); }
      if (q) { conds.push('c.produto LIKE ?'); params.push(`%${q}%`); }

      const rows = await d1All(
        db,
        `SELECT c.id, c.produto, c.descricao, c.quantidade, c.valor_estimado, c.status,
                c.justificativa, c.created_at, c.updated_at,
                c.solicitante_id, u.nome AS solicitante_nome,
                c.setor_id, s.nome AS setor_nome
         FROM compras c
         LEFT JOIN usuarios u ON u.id = c.solicitante_id
         LEFT JOIN setores s ON s.id = c.setor_id
         WHERE ${conds.join(' AND ')}
         ORDER BY c.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchCompraId = route.match(/^\/compras\/(\d+)$/);
    if (matchCompraId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT c.id, c.produto, c.descricao, c.quantidade, c.valor_estimado, c.status,
                c.justificativa, c.created_at, c.updated_at,
                c.solicitante_id, u.nome AS solicitante_nome,
                c.setor_id, s.nome AS setor_nome
         FROM compras c
         LEFT JOIN usuarios u ON u.id = c.solicitante_id
         LEFT JOIN setores s ON s.id = c.setor_id
         WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
        [matchCompraId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Compra não encontrada.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/compras' && method === 'POST') {
      const { produto, descricao, quantidade, valor_estimado, setor_id, justificativa } = await getBodyData(request);
      if (!produto || String(produto).trim().length < 2) {
        return jsonResponse({ success: false, message: 'Informe o produto.' }, 422);
      }
      const statusInicial = isUserAdmin(usuario) ? 'aprovado' : 'pendente';
      const res = await d1Run(
        db,
        `INSERT INTO compras (produto, descricao, quantidade, valor_estimado, status, justificativa, solicitante_id, setor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [String(produto).trim(), descricao || null, Number(quantidade || 1), valor_estimado ? Number(valor_estimado) : null, statusInicial, justificativa || null, usuario.id, setor_id || usuario.setor_id || null]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_COMPRA', entidade: 'compras', entidade_id: res.insertId, descricao: `Pedido de compra: ${produto}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Solicitação de compra registrada.', data: { id: res.insertId } }, 201);
    }

    if (matchCompraId && method === 'PUT') {
      const id = matchCompraId[1];
      const { produto, descricao, quantidade, valor_estimado, setor_id, justificativa, status, solicitante_id } = await getBodyData(request);
      const current = await d1First(db, `SELECT * FROM compras WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!current) return jsonResponse({ success: false, message: 'Compra não encontrada.' }, 404);

      const canEditGeneral = isUserAdmin(usuario) || hasPerm(auth, 'compras.editar');
      const isOwner = Number(current.solicitante_id) === Number(usuario.id);
      if (!canEditGeneral && !(isOwner && current.status === 'pendente')) {
        return jsonResponse({ success: false, message: 'Sem permissão para editar esta compra.' }, 403);
      }

      const statusFinal = (canEditGeneral && status) ? status : current.status;
      const solicitanteFinal = (isUserAdmin(usuario) && solicitante_id) ? Number(solicitante_id) : current.solicitante_id;
      const setorFinal = setor_id !== undefined && setor_id !== '' ? (setor_id ? Number(setor_id) : null) : current.setor_id;
      const valorFinal = valor_estimado !== undefined && valor_estimado !== '' ? Number(valor_estimado) : current.valor_estimado;

      await d1Run(
        db,
        `UPDATE compras SET produto = ?, descricao = ?, quantidade = ?, valor_estimado = ?, setor_id = ?, solicitante_id = ?, status = ?, justificativa = ?, updated_at = datetime('now') WHERE id = ?`,
        [
          produto ? String(produto).trim() : current.produto,
          descricao !== undefined ? (descricao || null) : current.descricao,
          quantidade ? Number(quantidade) : current.quantidade,
          valorFinal,
          setorFinal,
          solicitanteFinal,
          statusFinal,
          justificativa !== undefined ? (justificativa || null) : current.justificativa,
          id
        ]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_COMPRA', entidade: 'compras', entidade_id: Number(id), descricao: `Compra #${id} atualizada.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Pedido de compra atualizado com sucesso.' });
    }

    const matchCompraStatus = route.match(/^\/compras\/(\d+)\/status$/);
    if (matchCompraStatus && method === 'PATCH') {
      const id = matchCompraStatus[1];
      const { status, justificativa } = await getBodyData(request);
      await d1Run(db, `UPDATE compras SET status = ?, justificativa = COALESCE(?, justificativa), updated_at = datetime('now') WHERE id = ?`, [status, justificativa || null, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'STATUS_COMPRA', entidade: 'compras', entidade_id: Number(id), descricao: `Compra #${id} alterada para ${status}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: `Status atualizado para ${status}.` });
    }

    const matchCompraEntrada = route.match(/^\/compras\/(\d+)\/entrada$/);
    if (matchCompraEntrada && (method === 'PATCH' || method === 'POST')) {
      const id = matchCompraEntrada[1];
      await d1Run(db, `UPDATE compras SET status = 'entregue', updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'REGISTRAR_ENTRADA_COMPRA', entidade: 'compras', entidade_id: Number(id), descricao: `Entrada do pedido #${id} registrada.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Entrada do pedido registrada.' });
    }

    if (matchCompraId && method === 'DELETE') {
      const id = matchCompraId[1];
      await d1Run(db, `UPDATE compras SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_COMPRA', entidade: 'compras', entidade_id: Number(id), descricao: `Compra #${id} removida.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Compra removida.' });
    }

    // =========================================================================
    // 9. INSUMOS E ESTOQUE (/insumos/*)
    // =========================================================================
    if (route === '/insumos' && method === 'GET') {
      const setor_id = url.searchParams.get('setor_id');
      const q = url.searchParams.get('q');
      const baixo_estoque = url.searchParams.get('baixo_estoque');
      let conds = ['i.deleted_at IS NULL'];
      let params = [];
      if (setor_id) { conds.push('i.setor_id = ?'); params.push(setor_id); }
      if (q) { conds.push('i.nome LIKE ?'); params.push(`%${q}%`); }
      if (baixo_estoque === '1') { conds.push('i.quantidade <= i.estoque_minimo'); }

      const rows = await d1All(
        db,
        `SELECT i.id, i.nome, i.descricao, i.quantidade, i.estoque_minimo, i.unidade, i.created_at, i.updated_at,
                i.setor_id, s.nome AS setor_nome,
                CASE WHEN i.quantidade <= i.estoque_minimo THEN 1 ELSE 0 END AS alerta_baixo_estoque
         FROM insumos i
         LEFT JOIN setores s ON s.id = i.setor_id
         WHERE ${conds.join(' AND ')}
         ORDER BY i.nome ASC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    if (route === '/insumos/historico' && method === 'GET') {
      const rows = await d1All(
        db,
        `SELECT m.*, i.nome AS insumo_nome, i.unidade AS insumo_unidade,
                u.nome AS usuario_nome, u.email AS usuario_email, u.perfil AS usuario_perfil
         FROM estoque_movimentacoes m
         LEFT JOIN insumos i ON i.id = m.insumo_id
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         ORDER BY m.created_at DESC LIMIT 200`
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchInsumoId = route.match(/^\/insumos\/(\d+)$/);
    if (matchInsumoId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT i.*, s.nome AS setor_nome FROM insumos i LEFT JOIN setores s ON s.id = i.setor_id WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1`,
        [matchInsumoId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Insumo não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    const matchInsumoMovList = route.match(/^\/insumos\/(\d+)\/movimentacoes$/);
    if (matchInsumoMovList && method === 'GET') {
      const rows = await d1All(
        db,
        `SELECT em.*, u.nome AS usuario_nome
         FROM estoque_movimentacoes em
         LEFT JOIN usuarios u ON u.id = em.usuario_id
         WHERE em.insumo_id = ?
         ORDER BY em.created_at DESC LIMIT 50`,
        [matchInsumoMovList[1]]
      );
      return jsonResponse({ success: true, data: rows });
    }

    if (route === '/insumos' && method === 'POST') {
      const { nome, descricao, quantidade, estoque_minimo, unidade, setor_id } = await getBodyData(request);
      if (!nome || String(nome).trim().length < 2) return jsonResponse({ success: false, message: 'Informe o nome do insumo.' }, 422);
      const qtd = Number(quantidade || 0);
      const res = await d1Run(
        db,
        `INSERT INTO insumos (nome, descricao, quantidade, estoque_minimo, unidade, setor_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [String(nome).trim(), descricao || null, qtd, Number(estoque_minimo || 1), unidade || 'unid', setor_id || null]
      );
      if (qtd > 0) {
        await d1Run(
          db,
          `INSERT INTO estoque_movimentacoes (insumo_id, usuario_id, tipo, quantidade, observacao) VALUES (?, ?, 'ENTRADA', ?, 'Estoque inicial no cadastro.')`,
          [res.insertId, usuario.id, qtd]
        );
      }
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_INSUMO', entidade: 'insumos', entidade_id: res.insertId, descricao: `Insumo "${nome}" cadastrado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Insumo cadastrado.', data: { id: res.insertId } }, 201);
    }

    if (matchInsumoId && method === 'PUT') {
      const id = matchInsumoId[1];
      const { nome, descricao, estoque_minimo, unidade, setor_id } = await getBodyData(request);
      await d1Run(
        db,
        `UPDATE insumos SET nome = COALESCE(?, nome), descricao = ?, estoque_minimo = COALESCE(?, estoque_minimo), unidade = COALESCE(?, unidade), setor_id = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
        [nome ? String(nome).trim() : null, descricao || null, estoque_minimo ? Number(estoque_minimo) : null, unidade || null, setor_id || null, id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_INSUMO', entidade: 'insumos', entidade_id: Number(id), descricao: `Insumo #${id} atualizado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Insumo atualizado.' });
    }

    const matchInsumoMov = route.match(/^\/insumos\/(\d+)\/movimentar$/);
    if (matchInsumoMov && method === 'POST') {
      const id = matchInsumoMov[1];
      const { tipo, quantidade, local_origem, local_destino, observacao } = await getBodyData(request);
      const item = await d1First(db, `SELECT * FROM insumos WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!item) return jsonResponse({ success: false, message: 'Insumo não encontrado.' }, 404);

      const qtd = Number(quantidade || 0);
      if ((tipo === 'SAIDA' || tipo === 'TRANSFERENCIA') && item.quantidade < qtd) {
        return jsonResponse({ success: false, message: `Estoque insuficiente. Disponível: ${item.quantidade}.` }, 422);
      }

      let novaQtd = Number(item.quantidade || 0);
      if (tipo === 'ENTRADA') novaQtd += qtd;
      else if (tipo === 'SAIDA') novaQtd = Math.max(0, novaQtd - qtd);
      else if (tipo === 'AJUSTE') novaQtd = qtd;

      await d1Run(db, `UPDATE insumos SET quantidade = ?, updated_at = datetime('now') WHERE id = ?`, [novaQtd, id]);
      await d1Run(
        db,
        `INSERT INTO estoque_movimentacoes (insumo_id, usuario_id, tipo, quantidade, local_origem, local_destino, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, usuario.id, tipo || 'ENTRADA', qtd, local_origem || null, local_destino || null, observacao || null]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'MOVIMENTAR_INSUMO', entidade: 'insumos', entidade_id: Number(id), descricao: `${tipo}: ${qtd} (${item.nome}).`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Movimentação registrada com sucesso.', data: { nova_quantidade: novaQtd } });
    }

    if (matchInsumoId && method === 'DELETE') {
      const id = matchInsumoId[1];
      await d1Run(db, `UPDATE insumos SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_INSUMO', entidade: 'insumos', entidade_id: Number(id), descricao: `Insumo #${id} removido.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Insumo removido.' });
    }

    // =========================================================================
    // 10. EQUIPAMENTOS (/equipamentos/*) — CORRIGIDO PARA O SCHEMA REAL
    // =========================================================================
    if (route === '/equipamentos' && method === 'GET') {
      const estado = url.searchParams.get('estado');
      const q = url.searchParams.get('q');
      let conds = ['e.deleted_at IS NULL'];
      let params = [];
      if (estado) { conds.push('e.estado = ?'); params.push(estado); }
      if (q) {
        conds.push('(e.nome LIKE ? OR e.patrimonio LIKE ? OR e.localizacao LIKE ? OR e.descricao LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }

      const rows = await d1All(
        db,
        `SELECT e.id, e.nome, e.patrimonio, e.descricao, e.localizacao, e.estado, e.imagem_url, e.created_at, e.updated_at,
                e.responsavel_id, u.nome AS responsavel_nome
         FROM equipamentos e
         LEFT JOIN usuarios u ON u.id = e.responsavel_id
         WHERE ${conds.join(' AND ')}
         ORDER BY e.nome ASC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchEqId = route.match(/^\/equipamentos\/(\d+)$/);
    if (matchEqId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT e.id, e.nome, e.patrimonio, e.descricao, e.localizacao, e.estado, e.imagem_url, e.created_at, e.updated_at,
                e.responsavel_id, u.nome AS responsavel_nome
         FROM equipamentos e LEFT JOIN usuarios u ON u.id = e.responsavel_id
         WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
        [matchEqId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Equipamento não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/equipamentos' && method === 'POST') {
      const body = await getBodyData(request);
      const { nome, patrimonio, codigo_patrimonio, descricao, localizacao, local, estado, status, responsavel_id, imagem_url, imagem_base64 } = body;
      const nomeFinal = String(nome || '').trim();
      const patFinal = String(patrimonio || codigo_patrimonio || '').trim();

      if (nomeFinal.length < 3 || !patFinal) {
        return jsonResponse({ success: false, message: 'Nome (mín. 3 caracteres) e código de patrimônio são obrigatórios.' }, 422);
      }

      const dup = await d1First(db, `SELECT id FROM equipamentos WHERE patrimonio = ? AND deleted_at IS NULL LIMIT 1`, [patFinal]);
      if (dup) {
        return jsonResponse({ success: false, message: 'Código de patrimônio já cadastrado.' }, 422);
      }

      const imgFinal = imagem_url || imagem_base64 || null;
      const estadoFinal = ['bom', 'manutencao', 'descartado'].includes(estado || status) ? (estado || status) : 'bom';
      const localFinal = (localizacao || local) ? String(localizacao || local).trim() : null;

      const res = await d1Run(
        db,
        `INSERT INTO equipamentos (nome, patrimonio, descricao, localizacao, estado, responsavel_id, imagem_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nomeFinal, patFinal, descricao ? String(descricao).trim() : null, localFinal, estadoFinal, responsavel_id || null, imgFinal]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: res.insertId, descricao: `Equipamento "${nomeFinal}" (Pat: ${patFinal}) cadastrado.`, ip, user_agent: userAgent });
      return jsonResponse({
        success: true,
        message: 'Equipamento cadastrado com sucesso.',
        data: { id: res.insertId, imagem_url: imgFinal }
      }, 201);
    }

    if (matchEqId && method === 'PUT') {
      const id = matchEqId[1];
      const body = await getBodyData(request);
      const { nome, patrimonio, codigo_patrimonio, descricao, localizacao, local, estado, status, responsavel_id, imagem_url, imagem_base64, remover_imagem } = body;

      const current = await d1First(db, `SELECT * FROM equipamentos WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!current) return jsonResponse({ success: false, message: 'Equipamento não encontrado.' }, 404);

      const nomeFinal = nome ? String(nome).trim() : current.nome;
      const patFinal = (patrimonio || codigo_patrimonio) ? String(patrimonio || codigo_patrimonio).trim() : current.patrimonio;

      const dup = await d1First(db, `SELECT id FROM equipamentos WHERE patrimonio = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, [patFinal, id]);
      if (dup) return jsonResponse({ success: false, message: 'Patrimônio já em uso por outro equipamento.' }, 422);

      let imgFinal = current.imagem_url;
      if (imagem_url || imagem_base64) {
        imgFinal = imagem_url || imagem_base64;
      } else if (remover_imagem === '1' || remover_imagem === true) {
        imgFinal = null;
      }

      const estadoFinal = ['bom', 'manutencao', 'descartado'].includes(estado || status) ? (estado || status) : current.estado;
      const localFinal = (localizacao !== undefined || local !== undefined) ? (String(localizacao || local || '').trim() || null) : current.localizacao;

      await d1Run(
        db,
        `UPDATE equipamentos SET nome = ?, patrimonio = ?, descricao = ?, localizacao = ?, estado = ?, responsavel_id = ?, imagem_url = ?, updated_at = datetime('now')
         WHERE id = ? AND deleted_at IS NULL`,
        [nomeFinal, patFinal, descricao !== undefined ? (descricao ? String(descricao).trim() : null) : current.descricao, localFinal, estadoFinal, responsavel_id !== undefined ? (responsavel_id || null) : current.responsavel_id, imgFinal, id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: Number(id), descricao: `Equipamento #${id} ("${nomeFinal}") atualizado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Equipamento atualizado com sucesso.', data: { imagem_url: imgFinal } });
    }

    if (matchEqId && method === 'DELETE') {
      const id = matchEqId[1];
      await d1Run(db, `UPDATE equipamentos SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_EQUIPAMENTO', entidade: 'equipamentos', entidade_id: Number(id), descricao: `Equipamento #${id} removido.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Equipamento removido.' });
    }

    // =========================================================================
    // 11. EVENTOS / AGENDA (/eventos/*)
    // =========================================================================
    if (route === '/eventos' && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      let conds = ['e.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('e.status = ?'); params.push(status); }
      if (q) { conds.push('(e.titulo LIKE ? OR e.local LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const rows = await d1All(
        db,
        `SELECT e.id, e.titulo, e.local, e.descricao, e.data, e.data_fim, e.status, e.created_at,
                e.responsavel_id, u.nome AS responsavel_nome
         FROM eventos e
         LEFT JOIN usuarios u ON u.id = e.responsavel_id
         WHERE ${conds.join(' AND ')}
         ORDER BY e.data ASC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchEvId = route.match(/^\/eventos\/(\d+)$/);
    if (matchEvId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT e.*, u.nome AS responsavel_nome FROM eventos e LEFT JOIN usuarios u ON u.id = e.responsavel_id WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
        [matchEvId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Evento não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/eventos' && method === 'POST') {
      const { titulo, local, descricao, data, data_fim, status, responsavel_id } = await getBodyData(request);
      if (!local || !data) return jsonResponse({ success: false, message: 'Local e data são obrigatórios.' }, 422);
      const res = await d1Run(
        db,
        `INSERT INTO eventos (titulo, local, descricao, data, data_fim, status, responsavel_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [titulo || null, String(local).trim(), descricao || null, data, data_fim || null, status || 'agendado', responsavel_id || usuario.id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_EVENTO', entidade: 'eventos', entidade_id: res.insertId, descricao: `Evento "${titulo || local}" criado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Evento criado.', data: { id: res.insertId } }, 201);
    }

    if (matchEvId && method === 'PUT') {
      const id = matchEvId[1];
      const { titulo, local, descricao, data, data_fim, responsavel_id, status } = await getBodyData(request);
      await d1Run(
        db,
        `UPDATE eventos SET titulo = ?, local = COALESCE(?, local), descricao = ?, data = COALESCE(?, data), data_fim = ?, responsavel_id = ?, status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
        [titulo || null, local ? String(local).trim() : null, descricao || null, data || null, data_fim || null, responsavel_id || null, status || 'agendado', id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_EVENTO', entidade: 'eventos', entidade_id: Number(id), descricao: `Evento #${id} atualizado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Evento atualizado.' });
    }

    if (matchEvId && method === 'DELETE') {
      const id = matchEvId[1];
      await d1Run(db, `UPDATE eventos SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_EVENTO', entidade: 'eventos', entidade_id: Number(id), descricao: `Evento #${id} removido.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Evento removido.' });
    }

    // =========================================================================
    // 12. COMUNICADOS (/comunicados/*)
    // =========================================================================
    if (route === '/comunicados' && method === 'GET') {
      const prioridade = url.searchParams.get('prioridade');
      const destinatario_perfil = url.searchParams.get('destinatario_perfil');
      const q = url.searchParams.get('q');
      const ehAdmin = isUserAdmin(usuario);

      let conds = ['c.deleted_at IS NULL'];
      let params = [];
      if (!ehAdmin) {
        conds.push("(c.destinatario_perfil = 'TODOS' OR c.destinatario_perfil IS NULL OR c.destinatario_perfil = ? OR c.autor_id = ?)");
        params.push(usuario.perfil, usuario.id);
      }
      if (destinatario_perfil && destinatario_perfil !== 'TODOS_FILTRO') {
        conds.push('c.destinatario_perfil = ?');
        params.push(destinatario_perfil);
      }
      if (prioridade) { conds.push('c.prioridade = ?'); params.push(prioridade); }
      if (q) { conds.push('(c.titulo LIKE ? OR c.mensagem LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

      const rows = await d1All(
        db,
        `SELECT c.id, c.titulo, c.mensagem, c.prioridade, c.destinatario_perfil, c.created_at, c.updated_at,
                c.autor_id, u.nome AS autor_nome, u.perfil AS autor_perfil
         FROM comunicados c
         LEFT JOIN usuarios u ON u.id = c.autor_id
         WHERE ${conds.join(' AND ')}
         ORDER BY c.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchComId = route.match(/^\/comunicados\/(\d+)$/);
    if (matchComId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT c.*, u.nome AS autor_nome FROM comunicados c LEFT JOIN usuarios u ON u.id = c.autor_id WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
        [matchComId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Comunicado não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/comunicados' && method === 'POST') {
      const { titulo, mensagem, prioridade, destinatario_perfil } = await getBodyData(request);
      if (!titulo || !mensagem) return jsonResponse({ success: false, message: 'Título e mensagem são obrigatórios.' }, 422);
      const res = await d1Run(
        db,
        `INSERT INTO comunicados (titulo, mensagem, prioridade, destinatario_perfil, autor_id)
         VALUES (?, ?, ?, ?, ?)`,
        [String(titulo).trim(), String(mensagem).trim(), prioridade || 'normal', destinatario_perfil || 'TODOS', usuario.id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_COMUNICADO', entidade: 'comunicados', entidade_id: res.insertId, descricao: `Comunicado "${titulo}" publicado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Comunicado publicado.', data: { id: res.insertId } }, 201);
    }

    if (matchComId && method === 'DELETE') {
      const id = matchComId[1];
      await d1Run(db, `UPDATE comunicados SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_COMUNICADO', entidade: 'comunicados', entidade_id: Number(id), descricao: `Comunicado #${id} removido.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Comunicado removido.' });
    }

    // =========================================================================
    // 13. LIMPEZA (/limpeza/*)
    // =========================================================================
    if (route === '/limpeza' && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      let conds = ['l.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('l.status = ?'); params.push(status); }
      if (q) { conds.push('l.local LIKE ?'); params.push(`%${q}%`); }
      const rows = await d1All(
        db,
        `SELECT l.id, l.local, l.descricao, l.status, l.data_prevista, l.created_at, l.updated_at,
                l.responsavel_id, u.nome AS responsavel_nome
         FROM limpeza l
         LEFT JOIN usuarios u ON u.id = l.responsavel_id
         WHERE ${conds.join(' AND ')}
         ORDER BY l.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchLimpezaId = route.match(/^\/limpeza\/(\d+)$/);
    if (matchLimpezaId && method === 'GET') {
      const row = await d1First(db, `SELECT l.*, u.nome AS responsavel_nome FROM limpeza l LEFT JOIN usuarios u ON u.id = l.responsavel_id WHERE l.id = ? AND l.deleted_at IS NULL LIMIT 1`, [matchLimpezaId[1]]);
      if (!row) return jsonResponse({ success: false, message: 'Registro não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/limpeza' && method === 'POST') {
      const { local, descricao, status, data_prevista, responsavel_id } = await getBodyData(request);
      if (!local || String(local).trim().length < 3) return jsonResponse({ success: false, message: 'Local inválido.' }, 422);
      const res = await d1Run(
        db,
        `INSERT INTO limpeza (local, descricao, status, data_prevista, responsavel_id) VALUES (?, ?, ?, ?, ?)`,
        [String(local).trim(), descricao || null, status || 'pendente', data_prevista || null, responsavel_id || usuario.id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'CRIAR_LIMPEZA', entidade: 'limpeza', entidade_id: res.insertId, descricao: `Tarefa de limpeza em "${local}" criada.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Tarefa de limpeza criada.', data: { id: res.insertId } }, 201);
    }

    if (matchLimpezaId && method === 'PUT') {
      const id = matchLimpezaId[1];
      const { local, descricao, responsavel_id, data_prevista, status } = await getBodyData(request);
      const atual = await d1First(db, `SELECT * FROM limpeza WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!atual) return jsonResponse({ success: false, message: 'Registro não encontrado.' }, 404);

      let novoStatus = status !== undefined ? String(status).trim().toLowerCase() : atual.status;
      if (novoStatus === 'limpo') novoStatus = 'concluido';
      if (novoStatus === 'nao_limpo') novoStatus = 'pendente';

      await d1Run(
        db,
        `UPDATE limpeza SET local = ?, descricao = ?, responsavel_id = ?, data_prevista = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
        [
          local ? String(local).trim() : atual.local,
          descricao !== undefined ? (descricao || null) : atual.descricao,
          responsavel_id !== undefined ? (responsavel_id || null) : atual.responsavel_id,
          data_prevista !== undefined ? (data_prevista || null) : atual.data_prevista,
          novoStatus,
          id
        ]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_LIMPEZA', entidade: 'limpeza', entidade_id: Number(id), descricao: `Tarefa de limpeza #${id} editada.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Tarefa de limpeza atualizada com sucesso.' });
    }

    const matchLimpezaStatus = route.match(/^\/limpeza\/(\d+)\/status$/);
    if (matchLimpezaStatus && method === 'PATCH') {
      const id = matchLimpezaStatus[1];
      const { status } = await getBodyData(request);
      let statusNormalizado = String(status || 'pendente').trim().toLowerCase();
      if (statusNormalizado === 'limpo') statusNormalizado = 'concluido';
      if (statusNormalizado === 'nao_limpo') statusNormalizado = 'pendente';

      await d1Run(db, `UPDATE limpeza SET status = ?, updated_at = datetime('now') WHERE id = ?`, [statusNormalizado, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ATUALIZAR_STATUS_LIMPEZA', entidade: 'limpeza', entidade_id: Number(id), descricao: `Status de limpeza #${id} alterado para ${statusNormalizado}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Status atualizado.', data: { id: Number(id), status: statusNormalizado } });
    }

    if (matchLimpezaId && method === 'DELETE') {
      const id = matchLimpezaId[1];
      await d1Run(db, `UPDATE limpeza SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_LIMPEZA', entidade: 'limpeza', entidade_id: Number(id), descricao: `Limpeza #${id} removida.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Tarefa removida.' });
    }

    // =========================================================================
    // 14. DOCUMENTOS (/documentos/*) — CORRIGIDO PARA O SCHEMA REAL
    // =========================================================================
    if (route === '/documentos' && method === 'GET') {
      const status = url.searchParams.get('status');
      const setor_id = url.searchParams.get('setor_id');
      const q = url.searchParams.get('q');
      let conds = ['d.deleted_at IS NULL'];
      let params = [];
      if (status) { conds.push('d.status = ?'); params.push(status); }
      if (setor_id) { conds.push('d.setor_id = ?'); params.push(setor_id); }
      if (q) { conds.push('d.titulo LIKE ?'); params.push(`%${q}%`); }

      const rows = await d1All(
        db,
        `SELECT d.id, d.titulo, d.descricao, d.nome_original, d.caminho, d.mime_type, d.tamanho, d.extensao, d.status, d.created_at,
                d.setor_id, s.nome AS setor_nome,
                d.responsavel_id, u.nome AS responsavel_nome
         FROM documentos d
         LEFT JOIN setores s ON s.id = d.setor_id
         LEFT JOIN usuarios u ON u.id = d.responsavel_id
         WHERE ${conds.join(' AND ')}
         ORDER BY d.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchDocId = route.match(/^\/documentos\/(\d+)$/);
    if (matchDocId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT d.id, d.titulo, d.descricao, d.nome_original, d.caminho, d.mime_type, d.tamanho, d.extensao, d.status, d.created_at,
                d.setor_id, s.nome AS setor_nome, d.responsavel_id, u.nome AS responsavel_nome
         FROM documentos d
         LEFT JOIN setores s ON s.id = d.setor_id
         LEFT JOIN usuarios u ON u.id = d.responsavel_id
         WHERE d.id = ? AND d.deleted_at IS NULL LIMIT 1`,
        [matchDocId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Documento não encontrado.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    const matchDocDownload = route.match(/^\/documentos\/(\d+)\/download$/);
    if (matchDocDownload && method === 'GET') {
      const doc = await d1First(db, `SELECT nome_original, caminho, mime_type FROM documentos WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [matchDocDownload[1]]);
      if (!doc) return jsonResponse({ success: false, message: 'Documento não encontrado.' }, 404);

      if (doc.caminho && doc.caminho.startsWith('data:')) {
        const match = doc.caminho.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const binStr = atob(match[2]);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
          return new Response(bytes, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': doc.mime_type || match[1] || 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.nome_original || 'documento')}"`
            }
          });
        }
      }
      return jsonResponse({ success: false, message: 'Arquivo físico armazenado localmente no servidor de origem.' }, 404);
    }

    if (route === '/documentos' && method === 'POST') {
      const body = await getBodyData(request);
      const { titulo, descricao, setor_id } = body;
      if (!titulo || String(titulo).trim().length < 3) {
        return jsonResponse({ success: false, message: 'O título do documento deve ter no mínimo 3 caracteres.' }, 422);
      }
      const arq = body._arquivo || {};
      const nomeOriginal = arq.name || body.nome_original || `${String(titulo).trim()}.pdf`;
      const extMatch = nomeOriginal.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0].toLowerCase() : '.pdf';
      const caminho = arq.dataUrl || body.caminho || `/uploads/documentos/doc_${Date.now()}${ext}`;
      const mime = arq.type || body.mime_type || 'application/pdf';
      const tamanho = arq.size || body.tamanho || 0;

      const res = await d1Run(
        db,
        `INSERT INTO documentos (titulo, descricao, setor_id, responsavel_id, nome_original, nome_armazenado, caminho, mime_type, tamanho, extensao, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')`,
        [String(titulo).trim(), descricao ? String(descricao).trim() : null, setor_id ? Number(setor_id) : null, usuario.id, nomeOriginal, `doc_${Date.now()}${ext}`, caminho, mime, tamanho, ext]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ENVIAR_DOCUMENTO', entidade: 'documentos', entidade_id: res.insertId, descricao: `Documento "${titulo}" enviado.`, ip, user_agent: userAgent });
      return jsonResponse({
        success: true,
        message: 'Documento armazenado com sucesso.',
        data: { id: res.insertId, caminho, tamanho, nome_original: nomeOriginal }
      }, 201);
    }

    if (matchDocId && method === 'PUT') {
      const id = matchDocId[1];
      const body = await getBodyData(request);
      const { titulo, descricao, setor_id } = body;
      const atual = await d1First(db, `SELECT * FROM documentos WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
      if (!atual) return jsonResponse({ success: false, message: 'Documento não encontrado.' }, 404);

      const arq = body._arquivo;
      await d1Run(
        db,
        `UPDATE documentos SET titulo = ?, descricao = ?, setor_id = ?,
         nome_original = ?, caminho = ?, mime_type = ?, tamanho = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          titulo ? String(titulo).trim() : atual.titulo,
          descricao !== undefined ? (descricao ? String(descricao).trim() : null) : atual.descricao,
          setor_id !== undefined ? (setor_id ? Number(setor_id) : null) : atual.setor_id,
          arq ? arq.name : atual.nome_original,
          arq ? arq.dataUrl : atual.caminho,
          arq ? arq.type : atual.mime_type,
          arq ? arq.size : atual.tamanho,
          id
        ]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'EDITAR_DOCUMENTO', entidade: 'documentos', entidade_id: Number(id), descricao: `Documento #${id} atualizado.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Documento atualizado com sucesso.' });
    }

    const matchDocStatus = route.match(/^\/documentos\/(\d+)\/status$/);
    if (matchDocStatus && method === 'PATCH') {
      const id = matchDocStatus[1];
      const { status } = await getBodyData(request);
      await d1Run(db, `UPDATE documentos SET status = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [status, id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'ALTERAR_STATUS_DOCUMENTO', entidade: 'documentos', entidade_id: Number(id), descricao: `Status do documento #${id} alterado para ${status}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: `Documento ${status === 'arquivado' ? 'arquivado' : 'reativado'}.` });
    }

    if (matchDocId && method === 'DELETE') {
      const id = matchDocId[1];
      await d1Run(db, `UPDATE documentos SET deleted_at = datetime('now') WHERE id = ?`, [id]);
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'DELETAR_DOCUMENTO', entidade: 'documentos', entidade_id: Number(id), descricao: `Documento #${id} removido.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: 'Documento removido.' });
    }

    // =========================================================================
    // 15. ADVERTÊNCIAS DISCIPLINARES (/advertencias/*)
    // =========================================================================
    if (route === '/advertencias' && method === 'GET') {
      const status = url.searchParams.get('status');
      const gravidade = url.searchParams.get('gravidade');
      const colaborador_id = url.searchParams.get('colaborador_id');
      const q = url.searchParams.get('q');

      let conds = ['a.deleted_at IS NULL'];
      let params = [];
      if (status && status !== 'TODOS') { conds.push('a.status = ?'); params.push(status.toUpperCase()); }
      if (gravidade && gravidade !== 'TODOS') { conds.push('a.gravidade = ?'); params.push(gravidade.toUpperCase()); }
      if (colaborador_id) { conds.push('a.colaborador_id = ?'); params.push(colaborador_id); }
      if (q) {
        conds.push('(u.nome LIKE ? OR a.motivo LIKE ? OR a.descricao LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      const rows = await d1All(
        db,
        `SELECT a.*, u.nome AS colaborador_nome, u.email AS colaborador_email, u.perfil AS colaborador_perfil,
                s.nome AS solicitante_nome, s.perfil AS solicitante_perfil,
                h.nome AS homologador_nome
         FROM advertencias a
         LEFT JOIN usuarios u ON u.id = a.colaborador_id
         LEFT JOIN usuarios s ON s.id = a.solicitante_id
         LEFT JOIN usuarios h ON h.id = a.homologador_id
         WHERE ${conds.join(' AND ')}
         ORDER BY a.created_at DESC`,
        params
      );
      return jsonResponse({ success: true, data: rows });
    }

    const matchAdvId = route.match(/^\/advertencias\/(\d+)$/);
    if (matchAdvId && method === 'GET') {
      const row = await d1First(
        db,
        `SELECT a.*, u.nome AS colaborador_nome, u.email AS colaborador_email, u.perfil AS colaborador_perfil,
                s.nome AS solicitante_nome, h.nome AS homologador_nome
         FROM advertencias a
         LEFT JOIN usuarios u ON u.id = a.colaborador_id
         LEFT JOIN usuarios s ON s.id = a.solicitante_id
         LEFT JOIN usuarios h ON h.id = a.homologador_id
         WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1`,
        [matchAdvId[1]]
      );
      if (!row) return jsonResponse({ success: false, message: 'Advertência não encontrada.' }, 404);
      return jsonResponse({ success: true, data: row });
    }

    if (route === '/advertencias' && method === 'POST') {
      const { colaborador_id, motivo, descricao, gravidade, data_ocorrencia, aceitar_imediatamente } = await getBodyData(request);
      if (!colaborador_id || !motivo || !descricao || !data_ocorrencia) {
        return jsonResponse({ success: false, message: 'Preencha colaborador, motivo, descrição e data da ocorrência.' }, 422);
      }
      const ehAdminGeral = ['ADMIN', 'ADMIN_GERAL'].includes(String(usuario.perfil || '').toUpperCase());
      const deveAceitarJa = ehAdminGeral && (aceitar_imediatamente === true || aceitar_imediatamente === '1' || aceitar_imediatamente === 'true');
      const statusInicial = deveAceitarJa ? 'APLICADA' : 'PENDENTE';
      const homologadorId = deveAceitarJa ? usuario.id : null;
      const dataDecisao = deveAceitarJa ? new Date().toISOString() : null;
      const motivoDecisao = deveAceitarJa ? 'Aceita e aplicada diretamente pelo Administrador Geral.' : null;
      const gravNorm = String(gravidade || 'LEVE').toUpperCase();

      const res = await d1Run(
        db,
        `INSERT INTO advertencias (colaborador_id, solicitante_id, homologador_id, motivo, descricao, gravidade, status, data_ocorrencia, motivo_decisao, data_decisao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [colaborador_id, usuario.id, homologadorId, String(motivo).trim(), String(descricao).trim(), gravNorm, statusInicial, data_ocorrencia, motivoDecisao, dataDecisao]
      );
      await registrarAuditoria(db, {
        usuario_id: usuario.id,
        acao: deveAceitarJa ? 'APLICAR_ADVERTENCIA' : 'SOLICITAR_ADVERTENCIA',
        entidade: 'advertencias',
        entidade_id: res.insertId,
        descricao: `Advertência [${gravNorm}] registrada para colaborador #${colaborador_id}.`,
        ip,
        user_agent: userAgent
      });
      return jsonResponse({
        success: true,
        message: deveAceitarJa ? 'Advertência aplicada com sucesso.' : 'Advertência registrada e aguardando aceite do Administrador Geral.',
        data: { id: res.insertId, status: statusInicial }
      }, 201);
    }

    const matchAdvAction = route.match(/^\/advertencias\/(\d+)\/(aceitar|aprovar|rejeitar|revogar)$/);
    if (matchAdvAction && method === 'POST') {
      const [, id, action] = matchAdvAction;
      const { motivo_decisao } = await getBodyData(request);
      const novoStatus = (action === 'aceitar' || action === 'aprovar') ? 'APLICADA' : (action === 'rejeitar' ? 'REJEITADA' : 'REVOGADA');
      const parecer = motivo_decisao && String(motivo_decisao).trim()
        ? String(motivo_decisao).trim()
        : `Decisão (${novoStatus}) registrada pelo Administrador Geral.`;

      await d1Run(
        db,
        `UPDATE advertencias SET status = ?, homologador_id = ?, motivo_decisao = ?, data_decisao = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [novoStatus, usuario.id, parecer, id]
      );
      await registrarAuditoria(db, { usuario_id: usuario.id, acao: `${novoStatus}_ADVERTENCIA`, entidade: 'advertencias', entidade_id: Number(id), descricao: `Advertência #${id}: ${novoStatus}.`, ip, user_agent: userAgent });
      return jsonResponse({ success: true, message: `Advertência atualizada para ${novoStatus}.` });
    }

    // =========================================================================
    // 16. AUDITORIA & GESTÃO DE ACESSOS (/auditoria/*)
    // =========================================================================
    if (route.startsWith('/auditoria')) {
      if (!isUserAdmin(usuario) && !hasPerm(auth, 'auditoria.visualizar')) {
        return jsonResponse({ success: false, message: 'Acesso restrito ao módulo de Auditoria.' }, 403);
      }

      if (route === '/auditoria/usuarios-online' && method === 'GET') {
        const rows = await d1All(
          db,
          `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.ultimo_acesso, u.ultimo_heartbeat, s.nome AS setor_nome
           FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id
           WHERE u.deleted_at IS NULL AND u.status = 'ATIVO'
             AND u.ultimo_heartbeat >= datetime('now', '-5 minutes')
           ORDER BY u.ultimo_heartbeat DESC`
        );
        return jsonResponse({ success: true, data: rows, total_online: rows.length });
      }

      if (route === '/auditoria/usuarios' && method === 'GET') {
        const status = url.searchParams.get('status');
        const perfil = url.searchParams.get('perfil');
        const q = url.searchParams.get('q');

        let conds = ['u.deleted_at IS NULL'];
        let params = [];
        if (status) { conds.push('u.status = ?'); params.push(status); }
        if (perfil) { conds.push('u.perfil = ?'); params.push(perfil); }
        if (q) {
          conds.push('(u.nome LIKE ? OR u.email LIKE ?)');
          params.push(`%${q}%`, `%${q}%`);
        }

        const rows = await d1All(
          db,
          `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.created_at,
                  u.ultimo_acesso, u.ultimo_heartbeat,
                  s.nome AS setor_nome,
                  CASE WHEN u.ultimo_heartbeat >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END AS online,
                  (SELECT COUNT(*) FROM auditoria a WHERE a.usuario_id = u.id) AS total_acoes,
                  (SELECT a.created_at FROM auditoria a WHERE a.usuario_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_acao_data
           FROM usuarios u
           LEFT JOIN setores s ON s.id = u.setor_id
           WHERE ${conds.join(' AND ')}
           ORDER BY u.created_at DESC`,
          params
        );
        await anexarPermissoesAdicionaisD1(db, rows);
        return jsonResponse({ success: true, data: rows });
      }

      const matchHistUser = route.match(/^\/auditoria\/usuarios\/(\d+)\/historico$/);
      if (matchHistUser && method === 'GET') {
        const uid = matchHistUser[1];
        const userRow = await d1First(db, `SELECT id, nome, email, perfil, status, created_at, ultimo_acesso FROM usuarios WHERE id = ? LIMIT 1`, [uid]);
        if (!userRow) return jsonResponse({ success: false, message: 'Usuário não encontrado.' }, 404);
        const acoes = await d1All(
          db,
          `SELECT id, acao, entidade, entidade_id, descricao, ip, user_agent, created_at
           FROM auditoria WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 100`,
          [uid]
        );
        return jsonResponse({ success: true, data: { usuario: userRow, acoes } });
      }

      if (route === '/auditoria/solicitacoes-pendentes' && method === 'GET') {
        const rows = await d1All(
          db,
          `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.created_at, s.nome AS setor_nome
           FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id
           WHERE u.deleted_at IS NULL AND u.status IN ('PENDENTE', 'AGUARDANDO_ATIVACAO')
           ORDER BY u.created_at DESC`
        );
        await anexarPermissoesAdicionaisD1(db, rows);
        return jsonResponse({ success: true, data: rows, total_pendentes: rows.length });
      }

      const matchSolEdit = route.match(/^\/auditoria\/solicitacoes\/(\d+)$/);
      if (matchSolEdit && method === 'PUT') {
        const id = matchSolEdit[1];
        const { nome, email, perfil, setor_id, senha, permissoes_adicionais } = await getBodyData(request);
        const atual = await d1First(db, `SELECT * FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
        if (!atual) return jsonResponse({ success: false, message: 'Solicitação não encontrada.' }, 404);

        const cleanEmail = email ? String(email).toLowerCase().trim() : atual.email;
        const nomeFinal = nome ? String(nome).trim() : atual.nome;
        const perfilFinal = perfil || atual.perfil;
        const setorFinal = setor_id !== undefined && setor_id !== '' ? Number(setor_id) : (setor_id === null ? null : atual.setor_id);

        if (senha && String(senha).trim().length >= 8) {
          const hash = await bcrypt.hash(String(senha).trim(), 10);
          await d1Run(
            db,
            `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, senha = ?, updated_at = datetime('now') WHERE id = ?`,
            [nomeFinal, cleanEmail, perfilFinal, setorFinal, hash, id]
          );
        } else {
          await d1Run(
            db,
            `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, updated_at = datetime('now') WHERE id = ?`,
            [nomeFinal, cleanEmail, perfilFinal, setorFinal, id]
          );
        }

        if (permissoes_adicionais !== undefined) {
          await syncPermissoesExtrasUsuarioD1(db, Number(id), permissoes_adicionais);
        }

        await registrarAuditoria(db, {
          usuario_id: usuario.id,
          acao: 'EDITAR_SOLICITACAO_CADASTRO',
          entidade: 'usuarios',
          entidade_id: Number(id),
          descricao: `Solicitação #${id} ("${nomeFinal}") editada por ${usuario.nome}.`,
          ip,
          user_agent: userAgent
        });
        return jsonResponse({ success: true, message: `Dados da solicitação de "${nomeFinal}" atualizados com sucesso!` });
      }

      const matchAprovar = route.match(/^\/auditoria\/solicitacoes\/(\d+)\/aprovar$/);
      if (matchAprovar && method === 'POST') {
        const id = matchAprovar[1];
        const { nome, email, perfil, setor_id, senha, permissoes_adicionais } = await getBodyData(request);
        const atual = await d1First(db, `SELECT * FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
        if (!atual) return jsonResponse({ success: false, message: 'Solicitação não encontrada.' }, 404);

        const nomeFinal = nome && String(nome).trim().length >= 3 ? String(nome).trim() : atual.nome;
        const cleanEmail = email ? String(email).toLowerCase().trim() : atual.email;
        const perfilFinal = perfil || 'OPERADOR';
        const setorFinal = setor_id !== undefined && setor_id !== '' ? Number(setor_id) : atual.setor_id;

        if (senha && String(senha).trim().length >= 8) {
          const hash = await bcrypt.hash(String(senha).trim(), 10);
          await d1Run(
            db,
            `UPDATE usuarios SET status = 'ATIVO', nome = ?, email = ?, perfil = ?, setor_id = ?, senha = ?, updated_at = datetime('now') WHERE id = ?`,
            [nomeFinal, cleanEmail, perfilFinal, setorFinal, hash, id]
          );
        } else {
          await d1Run(
            db,
            `UPDATE usuarios SET status = 'ATIVO', nome = ?, email = ?, perfil = ?, setor_id = ?, updated_at = datetime('now') WHERE id = ?`,
            [nomeFinal, cleanEmail, perfilFinal, setorFinal, id]
          );
        }

        if (permissoes_adicionais !== undefined) {
          await syncPermissoesExtrasUsuarioD1(db, Number(id), permissoes_adicionais);
        }

        await registrarAuditoria(db, {
          usuario_id: usuario.id,
          acao: 'APROVAR_CADASTRO',
          entidade: 'usuarios',
          entidade_id: Number(id),
          descricao: `Solicitação #${id} ("${nomeFinal}") aprovada com perfil ${perfilFinal}.`,
          ip,
          user_agent: userAgent
        });
        return jsonResponse({
          success: true,
          ativacao_direta: true,
          message: `Acesso de "${nomeFinal}" aprovado e ativado com sucesso!`
        });
      }

      const matchRejeitar = route.match(/^\/auditoria\/solicitacoes\/(\d+)\/rejeitar$/);
      if (matchRejeitar && method === 'POST') {
        const id = matchRejeitar[1];
        await d1Run(db, `UPDATE usuarios SET status = 'REJEITADO', deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [id]);
        await registrarAuditoria(db, { usuario_id: usuario.id, acao: 'REJEITAR_CADASTRO', entidade: 'usuarios', entidade_id: Number(id), descricao: `Solicitação #${id} rejeitada.`, ip, user_agent: userAgent });
        return jsonResponse({ success: true, message: 'Solicitação rejeitada.' });
      }

      const matchReenviar = route.match(/^\/auditoria\/usuarios\/(\d+)\/reenviar-ativacao$/);
      if (matchReenviar && method === 'POST') {
        const id = matchReenviar[1];
        const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
        const tokenHash = await sha256Hex(rawToken);
        await d1Run(
          db,
          `INSERT INTO tokens_ativacao (usuario_id, token_hash, expira_em, ip_criacao) VALUES (?, ?, datetime('now', '+48 hours'), ?)`,
          [id, tokenHash, ip]
        );
        const linkAtivacao = `${url.origin}/#ativar-conta?token=${encodeURIComponent(rawToken)}`;
        return jsonResponse({
          success: true,
          emailEnviado: false,
          linkAtivacao,
          message: 'Novo link de ativação gerado com sucesso! Copie o link abaixo para enviar ao colaborador.'
        });
      }

      if (route === '/auditoria/testar-email' && method === 'POST') {
        return jsonResponse({
          success: true,
          provedor: 'Cloudflare Serverless',
          remetente: 'noreply@secult.es.gov.br',
          destinatario: usuario.email,
          message: 'Ambiente Cloudflare Pages Serverless ativo. Links de ativação são gerados diretamente no painel para envio imediato.'
        });
      }

      if (route === '/auditoria' && method === 'GET') {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;
        const usuario_id = url.searchParams.get('usuario_id');
        const acao = url.searchParams.get('acao');
        const entidade = url.searchParams.get('entidade');
        const data_inicio = url.searchParams.get('data_inicio');
        const data_fim = url.searchParams.get('data_fim');
        const q = url.searchParams.get('q');

        let conds = ['1=1'];
        let params = [];
        if (usuario_id) { conds.push('a.usuario_id = ?'); params.push(usuario_id); }
        if (acao) { conds.push('a.acao LIKE ?'); params.push(`%${acao}%`); }
        if (entidade) { conds.push('a.entidade = ?'); params.push(entidade); }
        if (data_inicio) { conds.push('date(a.created_at) >= ?'); params.push(data_inicio); }
        if (data_fim) { conds.push('date(a.created_at) <= ?'); params.push(data_fim); }
        if (q) {
          conds.push('(a.descricao LIKE ? OR a.acao LIKE ? OR u.nome LIKE ?)');
          params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const where = conds.join(' AND ');
        const rows = await d1All(
          db,
          `SELECT a.*, u.nome AS usuario_nome, u.email AS usuario_email, u.perfil AS usuario_perfil
           FROM auditoria a
           LEFT JOIN usuarios u ON u.id = a.usuario_id
           WHERE ${where}
           ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        const countRow = await d1First(db, `SELECT COUNT(*) AS total FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE ${where}`, params);
        const total = countRow?.total || 0;

        return jsonResponse({
          success: true,
          data: {
            registros: rows,
            paginacao: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit) || 1
            }
          }
        });
      }
    }

    return jsonResponse({
      success: true,
      data: [],
      message: `Endpoint ${method} ${route} processado.`
    });
  } catch (err) {
    console.error(`[API D1 ERROR] ${method} ${route}:`, err);
    return jsonResponse({
      success: false,
      message: err.message || 'Erro interno no servidor Cloudflare D1.'
    }, 500);
  }
}
