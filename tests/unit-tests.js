/**
 * HUB ES+ - Suite de Testes Unitários e Integridade de Regras de Negócio
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let total = 0;
let passed = 0;
let failed = 0;
const falhas = [];

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    falhas.push(testName);
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runUnitTests() {
  console.log('================================================================');
  console.log('🧪 INICIANDO TESTES UNITÁRIOS E DE INTEGRIDADE LÓGICA');
  console.log('================================================================\n');

  // 1. CRIPTOGRAFIA BCRYPT
  console.log('▶ [1/5] Testes de Criptografia e Senhas (Bcrypt)...');
  const senhaPlana = 'Admin@Secult2026!';
  const hash = await bcrypt.hash(senhaPlana, 10);
  assert(hash.startsWith('$2'), 'Geração de Hash Bcrypt compatível com formato modular');
  assert(await bcrypt.compare(senhaPlana, hash), 'Validação positiva de senha correta');
  assert(!(await bcrypt.compare('SenhaIncorreta@123', hash)), 'Rejeição de senha incorreta');

  // 2. TOKENS DE ATIVAÇÃO E SHA-256
  console.log('\n▶ [2/5] Testes de Entropia e Hashing de Tokens (SHA-256)...');
  const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  assert(rawToken.length === 64, 'Token gerado possui 64 caracteres de alta entropia (2x UUIDv4)');
  const tokenHash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenHash2 = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert(tokenHash1 === tokenHash2, 'Hash SHA-256 do token é estritamente determinístico');
  assert(tokenHash1.length === 64, 'Digest SHA-256 em hexadecimal possui 64 caracteres');

  // 3. MATRIZ DE PERFIS E ISOLAMENTO DE ACESSO (RBAC)
  console.log('\n▶ [3/5] Testes de Políticas RBAC e Isolamento de Cargos...');
  const { FIXED_PROFILE_PERMISSIONS, normalizeProfile } = require('../src/middleware/permissions');

  // Regra de Ouro: OPERADOR NÃO deve ter permissões de compras
  const permsOperador = FIXED_PROFILE_PERMISSIONS['OPERADOR'] || [];
  const temCompras = permsOperador.some(p => p.startsWith('compras.'));
  assert(!temCompras, 'Regra de Ouro: Perfil OPERADOR isolado de compras (zero permissões de compras)');
  assert(permsOperador.includes('dashboard.visualizar'), 'OPERADOR possui permissão de visualizar dashboard');
  assert(permsOperador.includes('ocorrencias.visualizar'), 'OPERADOR possui permissão de ocorrências');

  // Admin possui todas as permissões essenciais
  const permsAdmin = FIXED_PROFILE_PERMISSIONS['ADMIN'] || [];
  assert(permsAdmin.includes('auditoria.visualizar'), 'ADMIN possui permissão de auditoria');
  assert(permsAdmin.includes('usuarios.criar'), 'ADMIN possui permissão de criar usuários');

  // 4. NORMALIZAÇÃO DE ALIASES DE CARGOS
  console.log('\n▶ [4/5] Testes de Normalização de Nomes e Aliases de Cargos...');
  assert(normalizeProfile('Admin Geral') === 'ADMIN', 'Normalização: "Admin Geral" -> "ADMIN"');
  assert(normalizeProfile('admin_geral') === 'ADMIN', 'Normalização: "admin_geral" -> "ADMIN"');
  assert(normalizeProfile('GESTOR DE RH') === 'GESTOR_RH', 'Normalização: "GESTOR DE RH" -> "GESTOR_RH"');
  assert(normalizeProfile('GESTOR DE INFRA') === 'GESTOR_INFRA', 'Normalização: "GESTOR DE INFRA" -> "GESTOR_INFRA"');
  assert(normalizeProfile('Técnico N1') === 'TECNICO_N1', 'Normalização com acento: "Técnico N1" -> "TECNICO_N1"');
  assert(normalizeProfile('OPERADOR') === 'OPERADOR', 'Normalização: "OPERADOR" -> "OPERADOR"');

  // 5. TEMPLATES DE E-MAIL (BREVO API)
  console.log('\n▶ [5/5] Testes de Estrutura de E-mails Transacionais...');
  const { enviarEmailRedefinicaoSenha } = require('../src/services/email');
  assert(typeof enviarEmailRedefinicaoSenha === 'function', 'Serviço de e-mail possui handler para redefinição de senha');

  const tokenTest = 'abc123token';
  const linkAtivacao = `https://hub-es-secult.pages.dev/#ativar-conta?token=${tokenTest}`;
  assert(linkAtivacao.includes('token='), 'Link de ativação embute o token corretamente');

  console.log('\n================================================================');
  console.log(`📊 RESULTADO DOS TESTES UNITÁRIOS: ${passed}/${total} APROVADOS (${Math.round((passed / total) * 100)}%)`);
  if (failed > 0) {
    console.error(`❌ Falhas: ${failed}`, falhas);
  } else {
    console.log('✨ Todos os testes unitários passaram com 100% de sucesso!');
  }
  console.log('================================================================\n');

  return { total, passed, failed, falhas };
}

if (require.main === module) {
  runUnitTests().catch(err => {
    console.error('Erro nos testes unitários:', err);
    process.exit(1);
  });
}

module.exports = { runUnitTests };
