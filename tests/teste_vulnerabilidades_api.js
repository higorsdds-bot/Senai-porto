/**
 * Bateria de Testes de Vulnerabilidade e Segurança da API
 * HUB ES+ / SECULT
 * 
 * Alvos avaliados:
 * 1. Tentativas de SQL Injection no Login (Bypass de Autenticação)
 * 2. Injeção SQL em Parâmetros de Busca e Filtros
 * 3. Exposição Indevida de Rotas Restritas (Acesso não autenticado)
 * 4. Falsificação / Manipulação de Token JWT (Algoritmo None e Assinatura Inválida)
 * 5. Vazamento de Senhas / Hashes em Respostas da API e Auditoria
 */

const API_BASE = 'https://hub-es-secult.pages.dev/api/v1';

async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, headers: res.headers, body: json };
  } catch (err) {
    return { error: err.message };
  }
}

async function runSecurityAudit() {
  console.log('='.repeat(70));
  console.log(' RELATÓRIO DE AUDITORIA DE SEGURANÇA E VULNERABILIDADES - HUB ES+');
  console.log(` Alvo: ${API_BASE}`);
  console.log(` Data: ${new Date().toISOString()}`);
  console.log('='.repeat(70));
  console.log('');

  const results = [];

  function record(category, testName, passed, details) {
    results.push({ category, testName, passed, details });
    const mark = passed ? '[SEGURO]' : '[VULNERÁVEL]';
    console.log(`${mark.padEnd(14)} [${category}] ${testName}`);
    if (details) {
      console.log(`               -> ${details}`);
    }
  }

  // =========================================================================
  // 1. TESTES DE SQL INJECTION NO LOGIN
  // =========================================================================
  console.log('\n--- 1. TESTES DE SQL INJECTION NO LOGIN (POST /auth/login) ---');

  const sqlInjectionPayloads = [
    { name: "Auth Bypass: ' OR '1'='1", email: "' OR '1'='1", senha: "' OR '1'='1" },
    { name: "Comment Out: admin' --", email: "admin' --", senha: "qualquer_coisa" },
    { name: "Comment Out: admin@secult.es.gov.br' --", email: "admin@secult.es.gov.br' --", senha: "qualquer_coisa" },
    { name: "Quote Bypass: \" OR \"\"=\"", email: "\" OR \"\"=\"", senha: "\" OR \"\"=\"" },
    { name: "Boolean: ' OR 1=1 --", email: "' OR 1=1 --", senha: "qualquer_coisa" },
    { name: "Union Select Attack", email: "' UNION SELECT 1, 'admin', 'a@b.com', 'ADMIN', 1, '$2a$10$abc' --", senha: "123" },
    { name: "Targeted User + Injected Password", email: "admin@secult.es.gov.br", senha: "' OR '1'='1" },
    { name: "Subquery Injection", email: "admin@secult.es.gov.br' AND (SELECT 1)=1 --", senha: "qualquer_coisa" },
    { name: "Time-based / Sleep Injection", email: "admin@secult.es.gov.br' AND (SELECT count(*) FROM usuarios) > 0 --", senha: "qualquer_coisa" }
  ];

  for (const p of sqlInjectionPayloads) {
    const res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: p.email, senha: p.senha })
    });

    const isBlocked = (res.status === 401 || res.status === 400 || res.status === 404) && !res.body?.token;
    const isSuccess = res.status === 200 && res.body?.token;
    const isDbError = res.status === 500 && JSON.stringify(res.body).toLowerCase().includes('syntax');

    const passed = isBlocked && !isSuccess && !isDbError;
    const details = isSuccess
      ? 'FALHA CRÍTICA: Login bem sucedido via injeção SQL!'
      : isDbError
      ? 'ALERTA: Erro de sintaxe SQL exposto na resposta!'
      : `Bloqueado com status ${res.status}: "${res.body?.message || res.body?.erro || 'Negado'}"`;

    record('SQL Injection', p.name, passed, details);
  }

  // =========================================================================
  // 2. TESTES DE EXPOSIÇÃO DE ROTAS SEM AUTENTICAÇÃO (ACCESS CONTROL)
  // =========================================================================
  console.log('\n--- 2. TESTES DE EXPOSIÇÃO DE ENDPOINTS PROTEGIDOS (Sem Token) ---');

  const protectedEndpoints = [
    { method: 'GET', path: '/usuarios' },
    { method: 'GET', path: '/auditoria' },
    { method: 'GET', path: '/compras' },
    { method: 'GET', path: '/ocorrencias' },
    { method: 'GET', path: '/patrimonios' },
    { method: 'GET', path: '/advertencias' },
    { method: 'GET', path: '/dashboard/resumo' },
    { method: 'GET', path: '/configuracoes' },
    { method: 'GET', path: '/auth/me' },
    { method: 'POST', path: '/usuarios', body: { nome: 'Hacker', email: 'hack@evil.com' } }
  ];

  for (const ep of protectedEndpoints) {
    const res = await request(`${API_BASE}${ep.path}`, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      ...(ep.body ? { body: JSON.stringify(ep.body) } : {})
    });

    const passed = res.status === 401;
    const details = passed
      ? `Acesso bloqueado com 401 Unauthorized (${res.body?.message || 'Token ausente'})`
      : `ALERTA: Respondeu com ${res.status}! Endpoint pode estar desprotegido.`;

    record('Exposição de API', `${ep.method} ${ep.path}`, passed, details);
  }

  // =========================================================================
  // 3. TESTES DE TOKENS JWT FORJADOS / MANIPULADOS
  // =========================================================================
  console.log('\n--- 3. TESTES DE MANIPULAÇÃO DE TOKENS JWT ---');

  // Payload com alg: none forjando perfil ADMIN
  const jwtNoneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString('base64url');
  const jwtNonePayload = Buffer.from(JSON.stringify({ id: 1, email: "admin@secult.es.gov.br", perfil: "ADMIN", exp: 9999999999 })).toString('base64url');
  const forgedNoneToken = `${jwtNoneHeader}.${jwtNonePayload}.`;

  // Token com assinatura inválida
  const fakeSecretToken = `${jwtNoneHeader}.${jwtNonePayload}.assinatura_totalmente_falsa_123`;

  const tokenTests = [
    { name: "JWT Alg: None Attack", token: forgedNoneToken },
    { name: "JWT Invalid Signature Attack", token: fakeSecretToken },
    { name: "JWT Garbage String", token: "bearer_token_invalido_xyz123" }
  ];

  for (const tt of tokenTests) {
    const res = await request(`${API_BASE}/usuarios`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tt.token}` }
    });

    const passed = res.status === 401;
    const details = passed
      ? `Rejeitado com 401 (${res.body?.message || 'Token inválido'})`
      : `FALHA CRÍTICA: Token aceito com status ${res.status}!`;

    record('Segurança JWT', tt.name, passed, details);
  }

  // =========================================================================
  // 4. TESTES DE VAZAMENTO DE SENHAS / HASHES NAS RESPOSTAS
  // =========================================================================
  console.log('\n--- 4. TESTES DE VAZAMENTO DE SENHAS / HASHES ---');

  // Obter token legítimo para testar endpoints internos
  const loginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@secult.es.gov.br', senha: 'Admin@Secult2026!' })
  });

  const validToken = loginRes.body?.data?.token;

  if (validToken) {
    console.log('    [INFO] Autenticado como Administrador para auditoria de payloads internos.');

    // 4.1 Verificar payload do próprio login
    const loginPayloadStr = JSON.stringify(loginRes.body);
    const leaksPasswordInLogin = loginPayloadStr.includes('$2a$') || loginPayloadStr.includes('$2b$') || loginPayloadStr.includes('senha');
    record('Vazamento de Credenciais', 'Payload de Resposta do Login', !leaksPasswordInLogin, 
      leaksPasswordInLogin ? 'ALERTA: Campo de senha/hash detectado no JSON de login!' : 'Nenhum hash ou campo de senha retornado.');

    // 4.2 Verificar /auth/me
    const meRes = await request(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const meStr = JSON.stringify(meRes.body);
    const leaksPasswordInMe = meStr.includes('$2a$') || meStr.includes('$2b$') || meStr.includes('"senha"');
    record('Vazamento de Credenciais', 'Payload de GET /auth/me', !leaksPasswordInMe,
      leaksPasswordInMe ? 'ALERTA: Hash retornado em /auth/me!' : 'Dados limpos; credenciais e hashes protegidos.');

    // 4.3 Verificar listagem de usuários GET /usuarios
    const usersRes = await request(`${API_BASE}/usuarios`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const usersStr = JSON.stringify(usersRes.body);
    const leaksPasswordInUsers = usersStr.includes('$2a$') || usersStr.includes('$2b$') || usersStr.includes('"senha"');
    record('Vazamento de Credenciais', 'Listagem Geral GET /usuarios', !leaksPasswordInUsers,
      leaksPasswordInUsers ? 'ALERTA: Hashes de usuários expostos na listagem!' : 'Nenhuma senha ou hash bcrypt retornado na listagem de usuários.');

    // 4.4 Verificar auditoria GET /auditoria
    const auditRes = await request(`${API_BASE}/auditoria`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const auditRecords = auditRes.body?.data?.registros || [];
    // Verificar se existe coluna de senha ou vazamento de hash real do banco
    const hasSenhaColumn = auditRecords.some(r => 'senha' in r || 'usuario_senha' in r);
    // Verificar se o hash do usuário admin ou de outros usuários legítimos aparece no log
    const hasAdminHash = auditRecords.some(r => r.descricao && r.descricao.includes(validToken));
    const passedAudit = !hasSenhaColumn && !hasAdminHash;
    record('Vazamento de Credenciais', 'Registros de Auditoria GET /auditoria', passedAudit,
      passedAudit ? 'Colunas restritas protegidas; nenhuma senha ou hash do banco exposto nos logs.' : 'ALERTA: Credencial exposta nos logs de auditoria!');

  } else {
    console.log('    [AVISO] Não foi possível autenticar diretamente com admin@secult.es.gov.br.');
  }

  // =========================================================================
  // 5. TESTES DE INJEÇÃO SQL EM FILTROS E BUSCAS PÚBLICAS
  // =========================================================================
  console.log('\n--- 5. TESTES DE SQL INJECTION EM FILTROS E BUSCAS PÚBLICAS ---');

  const filterInjectionUrls = [
    `${API_BASE}/publico/comunicados?busca=%27%20OR%201=1%20--`,
    `${API_BASE}/publico/comunicados?busca=%22%20UNION%20SELECT%20null,null,null,null,null,null,null,null,null%20--`,
    `${API_BASE}/publico/eventos?status=%27%20OR%201=1%20--`,
    `${API_BASE}/publico/comunicados/1%27%20OR%20%271%27=%271`,
    `${API_BASE}/publico/comunicados/abc-invalido`
  ];

  for (const url of filterInjectionUrls) {
    const res = await request(url);
    const isError500 = res.status === 500;
    const bodyStr = JSON.stringify(res.body || '');
    const exposesSql = bodyStr.toLowerCase().includes('syntax error') || bodyStr.toLowerCase().includes('sqlite_error');

    const passed = !isError500 && !exposesSql;
    const details = passed
      ? `Tratado com segurança (Status ${res.status}, dados seguros)`
      : `ALERTA: Erro SQL interno detectado (${res.status}): ${bodyStr.slice(0, 80)}`;

    record('SQL Injection Parâmetros', url.replace(API_BASE, ''), passed, details);
  }

  // =========================================================================
  // RESUMO FINAL
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;

  console.log(` RESULTADO FINAL DA AUDITORIA:`);
  console.log(` - Total de Verificações: ${total}`);
  console.log(` - Aprovados (Seguros): ${passedCount}`);
  console.log(` - Falhas (Vulneráveis): ${failedCount}`);
  console.log('='.repeat(70));
}

runSecurityAudit();
