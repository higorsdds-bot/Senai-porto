/**
 * HUB ES+ - Testes Automatizados: Edição de Perfil e Notificações no Sininho
 * Execução: node tests/test-perfil-notificacoes.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function testSuite() {
  console.log('================================================================');
  console.log('🧪 TESTES: EDIÇÃO DE PERFIL E REFINAMENTO DE NOTIFICAÇÕES');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function runTest(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Arquivos Backend & Banco
  runTest('Tabela usuarios em schema.sql documenta foto_url', () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf-8');
    assert(schemaSql.includes('foto_url'), 'foto_url deve estar documentado em schema.sql');
  });

  runTest('Tabela usuarios em schema.d1.sql documenta foto_url', () => {
    const schemaD1 = fs.readFileSync(path.join(__dirname, '../src/database/schema.d1.sql'), 'utf-8');
    assert(schemaD1.includes('foto_url'), 'foto_url deve estar documentado em schema.d1.sql');
  });

  runTest('Migração incremental src/database/migrate-usuario-foto.js criada', () => {
    const exists = fs.existsSync(path.join(__dirname, '../src/database/migrate-usuario-foto.js'));
    assert(exists, 'Script de migração incremental deve existir');
  });

  runTest('Rota PUT /api/v1/auth/perfil implementada em src/routes/auth.js com auditoria e cache', () => {
    const authJs = fs.readFileSync(path.join(__dirname, '../src/routes/auth.js'), 'utf-8');
    assert(authJs.includes("router.put('/perfil'"), 'Deve existir rota PUT /perfil');
    assert(authJs.includes('clearUserAuthCache'), 'Deve limpar cache de usuário');
    assert(authJs.includes('registrarAuditoria'), 'Deve registrar auditoria');
  });

  runTest('Rota PUT /api/v1/auth/perfil implementada em functions/api/[[catchall]].js', () => {
    const catchallJs = fs.readFileSync(path.join(__dirname, '../functions/api/[[catchall]].js'), 'utf-8');
    assert(catchallJs.includes("route === '/auth/perfil' && method === 'PUT'"), 'Cloudflare catchall deve suportar PUT /auth/perfil');
    assert(catchallJs.includes('matchUsuarioFoto'), 'Cloudflare catchall deve suportar endpoint /usuarios/:id/foto');
  });

  // 2. Frontend API & Auth
  runTest('API.atualizarMeuPerfil implementada em assets/js/api.js', () => {
    const apiJs = fs.readFileSync(path.join(__dirname, '../assets/js/api.js'), 'utf-8');
    assert(apiJs.includes('atualizarMeuPerfil(dados)'), 'assets/js/api.js deve exportar atualizarMeuPerfil');
  });

  runTest('window.Auth.setUsuario e suporte a foto em preencherInfoUsuario em assets/js/auth.js', () => {
    const authJs = fs.readFileSync(path.join(__dirname, '../assets/js/auth.js'), 'utf-8');
    assert(authJs.includes('setUsuario(novoUsuario)'), 'auth.js deve ter método setUsuario');
    assert(authJs.includes('u.foto_url'), 'preencherInfoUsuario deve verificar u.foto_url');
  });

  // 3. UI Dropdown e Modais
  runTest('Botão btn-dropdown-editar-perfil presente em index.html', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
    assert(indexHtml.includes('id="btn-dropdown-editar-perfil"'), 'index.html deve ter botão para editar perfil no dropdown');
    assert(indexHtml.includes('Editar Meu Perfil'), 'Rótulo "Editar Meu Perfil" presente');
  });

  runTest('AppRouter implementa abrirModalEditarPerfil em assets/js/app.js', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf-8');
    assert(appJs.includes('abrirModalEditarPerfil()'), 'app.js deve ter abrirModalEditarPerfil');
    assert(appJs.includes('btnDropdownEditarPerfil'), 'Listener para abrir modal de perfil deve estar configurado');
  });

  // 4. Notificações e Remoção de Alerta Vermelho
  runTest('Dashboard NÃO possui banner de alerta vermelho para comunicados urgentes', () => {
    const dashJs = fs.readFileSync(path.join(__dirname, '../assets/js/modules/dashboard.js'), 'utf-8');
    assert(!dashJs.includes('Aviso Institucional Prioritário'), 'Banner vermelho de aviso institucional prioritário deve ser removido');
    assert(!dashJs.includes('visualizarComunicadosAlta()'), 'Botão do banner vermelho deve ser removido');
  });

  runTest('Sininho esconde badge imediatamente no clique e persiste IDs e timestamp', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf-8');
    assert(appJs.includes("hub_notificacoes_lidas_ids"), 'Deve persistir IDs de comunicados visualizados');
    assert(appJs.includes("badge.classList.add('hidden')"), 'Badge deve ser ocultada imediatamente');
  });

  console.log('================================================================');
  console.log(`📊 Total: ${total} | Aprovados: ${passed} | Falhas: ${total - passed}`);
  if (passed === total) {
    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  } else {
    process.exit(1);
  }
}

testSuite();
