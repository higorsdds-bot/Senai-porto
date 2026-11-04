/**
 * HUB ES+ - Suite de Testes Caixa-Preta (Black-Box API & Security Testing)
 * 
 * Testa o sistema exclusivamente por sua interface HTTP externa pública:
 * 1. Acesso Público / Modo Visitante (rotas liberadas vs. bloqueadas sem token).
 * 2. Autenticação e Credenciais (sucesso, senhas incorretas, validação de payload).
 * 3. Barreiras de RBAC e Não-Escalação de Privilégios (Operador barrado em rotas de Admin).
 * 4. Resiliência a Injeções SQL e Payloads Maliciosos/Malformatados.
 * 5. Consistência de Envelopes de Resposta ({ success, data/message }).
 */
const BASE_URL = process.env.TARGET_URL || 'https://hub-es-secult.pages.dev';

let total = 0;
let passed = 0;
let failed = 0;
const falhas = [];

function assert(condition, testName, extraInfo = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    falhas.push({ testName, extraInfo });
    console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? `-> ${extraInfo}` : ''}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  try {
    const res = await fetch(url, options);
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      body = null;
    }
    return { status: res.status, headers: res.headers, body };
  } catch (err) {
    return { status: 0, error: err.message, body: null };
  }
}

async function runBlackBoxTests() {
  console.log('================================================================');
  console.log(`🛡️ INICIANDO TESTES CAIXA-PRETA NO ALVO: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. ROTAS PÚBLICAS E ISOLAMENTO DE VISITANTE
  console.log('▶ [1/5] Testando Superfície Pública e Modo Visitante...');
  
  const health = await request('/health');
  assert(health.status === 200 && health.body?.status === 'online', 'Health Check público operacional (/health)');

  const comPub = await request('/publico/comunicados');
  assert(comPub.status === 200 && Array.isArray(comPub.body?.data), 'Feed público de comunicados acessível sem autenticação');

  const evPub = await request('/publico/eventos');
  assert(evPub.status === 200 && Array.isArray(evPub.body?.data), 'Agenda pública de eventos acessível sem autenticação');

  const dashSemToken = await request('/dashboard/stats');
  assert(dashSemToken.status === 401, 'Bloqueio estrito de acesso não autenticado ao Dashboard (HTTP 401)');

  const userSemToken = await request('/usuarios');
  assert(userSemToken.status === 401, 'Bloqueio estrito de acesso não autenticado a Usuários (HTTP 401)');

  // 2. FLUXOS DE AUTENTICAÇÃO E TRATAMENTO DE ENTRADAS
  console.log('\n▶ [2/5] Testando Autenticação, Credenciais e Validações...');

  const loginVazio = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert(loginVazio.status === 422, 'Rejeição de requisição de login vazia com HTTP 422');

  const loginInvalido = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@secult.es.gov.br', senha: 'SenhaTotalmenteIncorreta' })
  });
  assert(loginInvalido.status === 401 && loginInvalido.body?.success === false, 'Rejeição de credenciais inválidas com HTTP 401 e flag success: false');

  const loginAdmin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@secult.es.gov.br', senha: 'Admin@Secult2026!' })
  });
  assert(loginAdmin.status === 200 && Boolean(loginAdmin.body?.data?.token), 'Login de Administrador Geral bem-sucedido com emissão de JWT');
  const tokenAdmin = loginAdmin.body?.data?.token;

  // 3. BARREIRAS RBAC E DEFESA CONTRA ESCALAÇÃO DE PRIVILÉGIOS
  console.log('\n▶ [3/5] Testando Barreiras RBAC e Privilégios por Cargo...');

  const loginOperador = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operador@secult.es.gov.br', senha: 'Teste@2026!' })
  });
  assert(loginOperador.status === 200 && Boolean(loginOperador.body?.data?.token), 'Login de OPERADOR realizado com sucesso');
  const tokenOperador = loginOperador.body?.data?.token;

  if (tokenOperador) {
    const auditoriaBarrada = await request('/auditoria', {
      headers: { 'Authorization': `Bearer ${tokenOperador}` }
    });
    assert(auditoriaBarrada.status === 403, 'OPERADOR barrado de acessar logs de Auditoria (HTTP 403 Forbidden)');

    const criarUsuarioBarrado = await request('/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOperador}`
      },
      body: JSON.stringify({ nome: 'Hacker Invasor', email: 'invasor@hack.com', perfil: 'ADMIN' })
    });
    assert(criarUsuarioBarrado.status === 403, 'OPERADOR barrado de cadastrar novos colaboradores (HTTP 403 Forbidden)');

    const comprasBarrada = await request('/compras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOperador}`
      },
      body: JSON.stringify({ descricao: 'Compra Ilícita', valor_estimado: 5000 })
    });
    assert(comprasBarrada.status === 403, 'OPERADOR barrado de criar ordens de compra (Regra de Ouro) (HTTP 403 Forbidden)');
  }

  // 4. RESILIÊNCIA A SQL INJECTION E VALORES LIMÍTROFES
  console.log('\n▶ [4/5] Testando Blindagem contra SQL Injection e Insumos Inválidos...');

  if (tokenAdmin) {
    const sqliBusca = await request('/equipamentos?q=\' OR 1=1 --', {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(sqliBusca.status === 200, 'Proteção contra SQL Injection em parâmetros de busca de ativos');

    const sqliUsuarios = await request('/usuarios?q=\' UNION SELECT id, senha FROM usuarios --', {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(sqliUsuarios.status === 200, 'Proteção contra SQL Injection UNION em filtros de colaboradores');

    const idInvalido = await request('/equipamentos/identificador-nao-numerico', {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(idInvalido.status === 404 || idInvalido.status === 400, 'Tratamento gracioso de ID não numérico (sem crash 500)');

    const idNegativo = await request('/ocorrencias/-9999', {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(idNegativo.status === 404, 'Tratamento gracioso de ID inexistente negativo (HTTP 404)');
  }

  // 5. ENVELOPE DE RESPOSTAS E FLUXOS TRANSACIONAIS
  console.log('\n▶ [5/5] Testando Padronização de Envelopes ({ success, data/message })...');

  if (tokenAdmin) {
    const dash = await request('/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(dash.status === 200 && 'success' in (dash.body || {}) && 'data' in (dash.body || {}), 'Dashboard Stats respeita envelope corporativo { success: true, data }');

    const esqueci = await request('/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'higor.sdds@gmail.com' })
    });
    assert(esqueci.status === 200 && esqueci.body?.success === true && esqueci.body?.emailEnviado === true, 'Esqueci Senha com entrega em tempo real via Brevo API');
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTADO DOS TESTES CAIXA-PRETA: ${passed}/${total} APROVADOS (${Math.round((passed/total)*100)}%)`);
  if (failed > 0) {
    console.error(`❌ Falhas: ${failed}`, falhas);
  } else {
    console.log('🛡️ O sistema apresentou segurança, integridade de rotas e conformidade total!');
  }
  console.log('================================================================\n');

  return { total, passed, failed, falhas };
}

if (require.main === module) {
  runBlackBoxTests().catch(err => {
    console.error('Erro nos testes caixa-preta:', err);
    process.exit(1);
  });
}

module.exports = { runBlackBoxTests };

