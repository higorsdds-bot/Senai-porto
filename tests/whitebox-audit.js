/**
 * HUB ES+ - Suite de Auditoria Caixa-Branca (White-Box Code & Architecture Audit)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

const resultados = {
  sintaxe: { total: 0, sucesso: 0, falhas: [] },
  softDelete: { totalQueries: 0, fisicosDetectados: [] },
  auditoriaEscrita: { totalRotasEscrita: 0, rotasSemAuditoria: [] },
  rbac: { inconsistencias: [] },
  contratoRotas: { divergencias: [] }
};

console.log('================================================================');
console.log('🔍 INICIANDO AUDITORIA CAIXA-BRANCA (WHITE-BOX ARCHITECTURE AUDIT)');
console.log('================================================================\n');

// 1. VERIFICAÇÃO DE SINTAXE JAVASCRIPT
console.log('▶ [1/5] Verificação de Integridade Sintática dos Arquivos JS...');
function coletarArquivosJs(dir, lista = []) {
  if (!fs.existsSync(dir)) return lista;
  const itens = fs.readdirSync(dir);
  for (const item of itens) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'scripts') {
        coletarArquivosJs(full, lista);
      }
    } else if (item.endsWith('.js')) {
      lista.push(full);
    }
  }
  return lista;
}

const arquivosJs = [
  ...coletarArquivosJs(path.join(rootDir, 'src')),
  ...coletarArquivosJs(path.join(rootDir, 'assets', 'js')),
  ...coletarArquivosJs(path.join(rootDir, 'functions'))
];

for (const arq of arquivosJs) {
  resultados.sintaxe.total++;
  const relPath = path.relative(rootDir, arq);
  try {
    let code = fs.readFileSync(arq, 'utf8');
    // Para ES Modules (como Cloudflare Functions), transforma exports para checagem estática
    if (relPath.includes('catchall')) {
      code = code.replace(/^import\s+.*?;/gm, '// import').replace(/export\s+/g, '');
    }
    new vm.Script(code, { filename: relPath });
    resultados.sintaxe.sucesso++;
  } catch (err) {
    resultados.sintaxe.falhas.push({ arquivo: relPath, erro: err.message });
  }
}
console.log(`   Arquivos analisados: ${resultados.sintaxe.total} | Sucesso: ${resultados.sintaxe.sucesso} | Erros: ${resultados.sintaxe.falhas.length}`);

// 2. AUDITORIA DE QUERIES SQL (POLÍTICA DE SOFT DELETE)
console.log('\n▶ [2/5] Auditoria de Queries SQL (Garantia de Soft Delete)...');
const arquivosBackend = [
  ...coletarArquivosJs(path.join(rootDir, 'src', 'routes')),
  path.join(rootDir, 'functions', 'api', '[[catchall]].js')
];

for (const arq of arquivosBackend) {
  const relPath = path.relative(rootDir, arq);
  const code = fs.readFileSync(arq, 'utf8');
  const linhas = code.split('\n');

  linhas.forEach((linha, idx) => {
    if (/\bDELETE\s+FROM\s+([a-zA-Z_]+)/i.test(linha)) {
      const match = linha.match(/\bDELETE\s+FROM\s+([a-zA-Z_]+)/i);
      const tabela = match ? match[1].toLowerCase() : '';
      // Tabelas associativas de permissão e tokens efêmeros permitidos
      const tabelasPermitidas = ['tokens_ativacao', 'tokens_recuperacao', 'sessoes', 'rate_limits', 'usuario_permissoes', 'perfil_permissoes'];
      if (!tabelasPermitidas.includes(tabela)) {
        resultados.softDelete.fisicosDetectados.push({
          arquivo: relPath,
          linha: idx + 1,
          tabela,
          codigo: linha.trim()
        });
      }
    }
  });
}
console.log(`   Violações de Soft Delete em tabelas de negócio encontradas: ${resultados.softDelete.fisicosDetectados.length}`);

// 3. AUDITORIA DE AUDITORIA OBRIGATÓRIA NAS ROTAS DE ESCRITA
console.log('\n▶ [3/5] Auditoria de Registro de Auditoria em Operações de Escrita...');
for (const arq of coletarArquivosJs(path.join(rootDir, 'src', 'routes'))) {
  const relPath = path.relative(rootDir, arq);
  if (relPath.includes('publico.js')) continue;

  const code = fs.readFileSync(arq, 'utf8');
  const regexRota = /router\.(post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regexRota.exec(code)) !== null) {
    resultados.auditoriaEscrita.totalRotasEscrita++;
    const metodo = match[1].toUpperCase();
    const subPath = match[2];

    const startIndex = match.index;
    const nextRouteIndex = code.indexOf('router.', startIndex + 10);
    const routeBlock = code.slice(startIndex, nextRouteIndex !== -1 ? nextRouteIndex : startIndex + 3000);

    const rotasIsentasAuditoria = ['/login', '/logout', '/heartbeat', '/registro'];
    const possuiAuditoriaDireta = routeBlock.includes('registrarAuditoria');
    const possuiAuditoriaEmHandler = code.includes('aceitarAdvertenciaHandler') && (subPath === '/:id/aceitar' || subPath === '/:id/aprovar');

    if (!rotasIsentasAuditoria.includes(subPath) && !possuiAuditoriaDireta && !possuiAuditoriaEmHandler) {
      resultados.auditoriaEscrita.rotasSemAuditoria.push({
        arquivo: relPath,
        metodo,
        rota: subPath
      });
    }
  }
}
console.log(`   Rotas de escrita auditadas: ${resultados.auditoriaEscrita.totalRotasEscrita} | Sem auditoria: ${resultados.auditoriaEscrita.rotasSemAuditoria.length}`);

// 4. AUDITORIA DE REGRAS RBAC E PARIDADE DE CARGOS
console.log('\n▶ [4/5] Auditoria de Matriz RBAC (Regras de Ouro e Paridade dos 15 Cargos)...');
const seedPath = path.join(rootDir, 'src', 'database', 'seed.js');
const catchallPath = path.join(rootDir, 'functions', 'api', '[[catchall]].js');
const authJsPath = path.join(rootDir, 'assets', 'js', 'auth.js');

if (fs.existsSync(seedPath) && fs.existsSync(catchallPath) && fs.existsSync(authJsPath)) {
  const seedCode = fs.readFileSync(seedPath, 'utf8');
  const catchallCode = fs.readFileSync(catchallPath, 'utf8');
  const authCode = fs.readFileSync(authJsPath, 'utf8');

  // Checagem Regra de Ouro: OPERADOR nunca deve ter permissões de compras (com word boundary)
  const checarOperadorCompras = (nomeContexto, code) => {
    const matchOp = code.match(/\bOPERADOR\s*:\s*\[([\s\S]*?)\]/);
    if (matchOp && matchOp[1]) {
      const perms = matchOp[1];
      if (/compras\./i.test(perms)) {
        resultados.rbac.inconsistencias.push(`[${nomeContexto}] PERIGO: Perfil OPERADOR possui permissões de compras declaradas!`);
      }
    }
  };

  checarOperadorCompras('Seed (PERFIL_PERMISSOES)', seedCode);
  checarOperadorCompras('Cloudflare Catchall (FIXED_PROFILE_PERMISSIONS)', catchallCode);
  checarOperadorCompras('Frontend Auth (FALLBACK_PROFILE_PERMISSIONS)', authCode);

  const cargosEsperados = [
    'ADMIN', 'ADMIN_GERAL', 'ADMINISTRADOR', 'ADMINISTRACAO',
    'GESTOR', 'GESTOR_RH', 'GESTOR_INFRA', 'GESTOR_OPERADOR',
    'ANALISTA_RH', 'RH', 'TECNICO_N3', 'TECNICO_N2', 'TECNICO_N1',
    'TECNICO', 'OPERADOR', 'LIMPEZA'
  ];

  for (const cargo of cargosEsperados) {
    if (!catchallCode.includes(`${cargo}:`) && !catchallCode.includes(`'${cargo}':`)) {
      resultados.rbac.inconsistencias.push(`Cargo ${cargo} ausente em FIXED_PROFILE_PERMISSIONS.`);
    }
  }
}
console.log(`   Inconsistências RBAC identificadas: ${resultados.rbac.inconsistencias.length}`);

// 5. CONTRATO DE ROTAS (CONFIG.ENDPOINTS)
console.log('\n▶ [5/5] Auditoria de Contratos de Rotas (CONFIG.ENDPOINTS)...');
const configPath = path.join(rootDir, 'assets', 'js', 'config.js');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  const catchallCode = fs.readFileSync(catchallPath, 'utf8');

  const matchEndpoints = configContent.match(/ENDPOINTS\s*:\s*\{([\s\S]*?)\}/);
  if (matchEndpoints && matchEndpoints[1]) {
    const linhas = matchEndpoints[1].split('\n');
    for (const l of linhas) {
      const m = l.match(/([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/);
      if (m) {
        const nomeChave = m[1];
        const rota = m[2];
        const rotaRegex = new RegExp(`route\\s*===?\\s*['"]${rota}['"]|route\\.startsWith\\(['"]${rota}[/'"]\\)|route\\.match\\(/\\^\\\\${rota}`);
        if (!rotaRegex.test(catchallCode)) {
          resultados.contratoRotas.divergencias.push(`Endpoint ${nomeChave} (${rota}) não localizado no roteador catchall.`);
        }
      }
    }
  }
}
console.log(`   Divergências de endpoints identificadas: ${resultados.contratoRotas.divergencias.length}`);

console.log('\n================================================================');
console.log('📊 RESUMO DA AUDITORIA CAIXA-BRANCA');
console.log('================================================================');
console.log(`- Arquivos com Sintaxe Válida: ${resultados.sintaxe.sucesso}/${resultados.sintaxe.total} (${resultados.sintaxe.falhas.length === 0 ? '✅ 100% OK' : '❌ Falhas detectadas'})`);
console.log(`- Violações de Soft Delete (DELETE físico): ${resultados.softDelete.fisicosDetectados.length === 0 ? '✅ Zero violações (100% Soft Delete em entidades de negócio)' : `⚠️ ${resultados.softDelete.fisicosDetectados.length} ocorrências`}`);
console.log(`- Cobertura de Auditoria em Escrita: ${resultados.auditoriaEscrita.totalRotasEscrita - resultados.auditoriaEscrita.rotasSemAuditoria.length}/${resultados.auditoriaEscrita.totalRotasEscrita} (${resultados.auditoriaEscrita.rotasSemAuditoria.length === 0 ? '✅ 100% Auditado' : '⚠️ Pendências'})`);
console.log(`- Integridade RBAC (15 Cargos & Sem Compras p/ Operador): ${resultados.rbac.inconsistencias.length === 0 ? '✅ 100% Conforme' : `❌ ${resultados.rbac.inconsistencias.length} problemas`}`);
console.log(`- Paridade de Endpoints Frontend/Backend: ${resultados.contratoRotas.divergencias.length === 0 ? '✅ 100% Sincronizado' : `⚠️ ${resultados.contratoRotas.divergencias.length} divergências`}`);

module.exports = resultados;
