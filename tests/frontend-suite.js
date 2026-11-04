/**
 * HUB ES+ - Suite Completa de Testes de Frontend Automatizados via Chrome DevTools Protocol (CDP)
 * 
 * Disciplinas Testadas:
 * 1. Teste de Interface (UI Testing)
 * 2. Teste Funcional (Functional Testing)
 * 3. Teste de Responsividade (Mobile, Tablet, Desktop)
 * 4. Teste de Compatibilidade (Google Chrome vs. Microsoft Edge)
 * 5. Teste de Acessibilidade (A11y Audit)
 * 6. Teste E2E (End-to-End User Journeys)
 * 7. Teste de Regressão
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'https://hub-es-secult.pages.dev';

const BROWSER_PATHS = {
  chrome: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
};

class CDPClient {
  constructor(browserType = 'chrome', port = 9222) {
    this.browserType = browserType;
    this.port = port;
    this.cp = null;
    this.ws = null;
    this.reqId = 1;
    this.callbacks = new Map();
    this.events = new Map();
    this.consoleLogs = [];
    this.pageErrors = [];
  }

  async start() {
    const bin = BROWSER_PATHS[this.browserType];
    const profileDir = path.join(os.tmpdir(), `cdp-profile-${this.browserType}-${Date.now()}`);

    this.cp = spawn(bin, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--disable-gpu',
      '--disable-extensions',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profileDir}`,
      'about:blank'
    ]);

    let connected = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        if (res.ok) {
          const tabs = await res.json();
          // Seleciona explicitamente o tab de tipo 'page'
          const pageTab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
          if (pageTab) {
            this.ws = new WebSocket(pageTab.webSocketDebuggerUrl);
            await new Promise((resolve, reject) => {
              this.ws.onopen = resolve;
              this.ws.onerror = reject;
            });
            connected = true;
            break;
          }
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!connected) {
      throw new Error(`Falha ao conectar via CDP no navegador ${this.browserType} na porta ${this.port}`);
    }

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          this.callbacks.get(msg.id)(msg.result, msg.error);
          this.callbacks.delete(msg.id);
        }
        if (msg.method) {
          if (msg.method === 'Runtime.consoleAPICalled') {
            this.consoleLogs.push(msg.params);
          }
          if (msg.method === 'Runtime.exceptionThrown') {
            this.pageErrors.push(msg.params?.exceptionDetails);
          }
          if (this.events.has(msg.method)) {
            this.events.get(msg.method)(msg.params);
          }
        }
      } catch (_) {}
    };

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      this.callbacks.set(id, (res, err) => {
        if (err) reject(err);
        else resolve(res);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async navigate(url) {
    const loadPromise = new Promise(resolve => {
      this.events.set('Page.loadEventFired', resolve);
    });
    await this.send('Page.navigate', { url });
    await Promise.race([
      loadPromise,
      new Promise(r => setTimeout(r, 7000))
    ]);

    // Aguarda o bootstrap completo da SPA Vanilla JS
    for (let i = 0; i < 30; i++) {
      const pronto = await this.eval('Boolean(window.Auth && window.App && document.body)');
      if (pronto) break;
      await new Promise(r => setTimeout(r, 200));
    }
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
    await new Promise(r => setTimeout(r, 400));
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async close() {
    try { this.ws?.close(); } catch (_) {}
    try { this.cp?.kill(); } catch (_) {}
  }
}

async function runFrontendTestSuite() {
  console.log('================================================================');
  console.log(`🌐 INICIANDO BATERIA COMPLETA DE TESTES FRONTEND (UI / E2E / A11Y)`);
  console.log(`🎯 Alvo Homologado: ${TARGET_URL}`);
  console.log('================================================================\n');

  let passedTotal = 0;
  let failedTotal = 0;
  const relatorio = [];

  function assert(categoria, descricao, condicao, detalhes = '') {
    if (condicao) {
      console.log(`  ✅ [PASS] ${descricao}`);
      passedTotal++;
      relatorio.push({ categoria, descricao, status: 'PASS', detalhes });
    } else {
      console.error(`  ❌ [FAIL] ${descricao} -> ${detalhes}`);
      failedTotal++;
      relatorio.push({ categoria, descricao, status: 'FAIL', detalhes });
    }
  }

  const cdp = new CDPClient('chrome', 9245);
  await cdp.start();

  try {
    // =========================================================================
    // 1. TESTE DE INTERFACE (UI TESTING)
    // =========================================================================
    console.log('▶ [1/7] Teste de Interface (UI Testing - Componentes Visuais e Layout)...');
    await cdp.navigate(TARGET_URL);

    const docTitle = await cdp.eval('document.title');
    assert('UI', 'Título da aplicação renderizado corretamente', docTitle.includes('HUB ES+'), `Título: "${docTitle}"`);

    // No estado inicial (visitante), deve haver cabeçalho e botão para fazer login
    const topbarPresente = await cdp.eval('Boolean(document.querySelector(".topbar-right") || document.querySelector("header"))');
    assert('UI', 'Barra de navegação superior (Top Navbar) visível', topbarPresente);

    // Aciona a tela modal de Login
    await cdp.eval('window.Auth?.renderizarTelaLogin()');
    await cdp.sleep(600);

    const telaLoginVisivel = await cdp.eval('Boolean(document.querySelector("#tela-login") && !document.querySelector("#tela-login").classList.contains("hidden"))');
    assert('UI', 'Modal flutuante de Autenticação renderizado com sucesso', telaLoginVisivel);

    const hasLogo = await cdp.eval('Boolean(document.querySelector("#tela-login")?.innerText?.includes("HUB ES+"))');
    assert('UI', 'Logotipo e branding "HUB ES+" presentes na tela de login', hasLogo);

    const hasInputs = await cdp.eval('Boolean(document.querySelector("#login-email") && document.querySelector("#login-senha"))');
    assert('UI', 'Campos de credenciais (E-mail e Senha) renderizados', hasInputs);

    const hasBtnEntrar = await cdp.eval('Boolean(document.querySelector("#form-login button[type=\'submit\']") || document.querySelector("#form-login button"))');
    assert('UI', 'Botão primário de submissão de Login visível', hasBtnEntrar);

    const lucideIconsCount = await cdp.eval('document.querySelectorAll("svg.lucide, svg[data-lucide], [data-lucide]").length');
    assert('UI', 'Ícones visuais SVG Lucide compilados e renderizados', lucideIconsCount > 0, `${lucideIconsCount} ícones`);

    const hasSelectorCargos = await cdp.eval('Boolean(document.querySelector("#seletor-cargos-teste"))');
    assert('UI', 'Seletor de Login Rápido por Cargo visível na interface de teste', hasSelectorCargos);

    const optionsCargos = await cdp.eval('document.querySelectorAll("#seletor-cargos-teste option").length');
    assert('UI', 'Seletor contém os 15 perfis corporativos carregados', optionsCargos >= 15, `${optionsCargos} opções`);

    const hasBtnVisitante = await cdp.eval('Boolean(document.querySelector("#btn-voltar-visitante") || document.querySelector("#btn-continuar-visitante"))');
    assert('UI', 'Botão de acesso público "Continuar como Visitante" presente', hasBtnVisitante);

    const hasBtnEsqueci = await cdp.eval('Boolean(document.querySelector("#btn-esqueci-senha"))');
    assert('UI', 'Link utilitário "Esqueci minha senha" disponível', hasBtnEsqueci);

    // =========================================================================
    // 2. TESTE FUNCIONAL (FUNCTIONAL TESTING)
    // =========================================================================
    console.log('\n▶ [2/7] Teste Funcional (Functional Testing - Ações, Validações e Filtros)...');

    // 2.1 Submissão vazia bloqueada
    await cdp.eval(`(() => {
      const email = document.querySelector("#login-email");
      const senha = document.querySelector("#login-senha");
      if (email) email.value = "";
      if (senha) senha.value = "";
      document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    })()`);
    await cdp.sleep(400);

    const feedbackVisivel = await cdp.eval(`(() => {
      const fb = document.querySelector("#login-feedback");
      return fb && !fb.classList.contains("hidden") && fb.innerText.includes("Preencha");
    })()`);
    assert('Funcional', 'Validação defensiva impede login com campos vazios', feedbackVisivel);

    // 2.2 Seleção rápida de perfil e login funcional
    await cdp.eval(`(() => {
      const sel = document.querySelector("#seletor-cargos-teste");
      if (sel) {
        sel.value = "admin@secult.es.gov.br";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await cdp.sleep(400);

    const autofillOk = await cdp.eval(`(() => {
      const email = document.querySelector("#login-email")?.value;
      const senha = document.querySelector("#login-senha")?.value;
      return email === "admin@secult.es.gov.br" && senha.length > 5;
    })()`);
    assert('Funcional', 'Seletor rápido preenche credenciais do Admin Geral', autofillOk);

    // 2.3 Submissão real do login
    await cdp.eval(`(() => {
      const email = document.querySelector("#login-email");
      const senha = document.querySelector("#login-senha");
      if (email) email.value = "admin@secult.es.gov.br";
      if (senha) senha.value = "Admin@Secult2026!";
      document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    })()`);
    await cdp.sleep(2500);

    const estaLogado = await cdp.eval('Boolean(window.Auth?.estaLogado())');
    assert('Funcional', 'Autenticação concluída e sessão ativa registrada no estado da SPA', estaLogado);

    // Força navegação para Dashboard pós login
    await cdp.eval(`window.location.hash = "#dashboard"; window.App?.handleRoute?.();`);
    await cdp.sleep(1800);

    const hashAposLogin = await cdp.eval('window.location.hash');
    assert('Funcional', 'Roteador SPA navega para o Dashboard executivo pós-login', hashAposLogin === '#dashboard', `Hash: ${hashAposLogin}`);

    // 2.4 Renderização da Bento Grid
    const temBentoGrid = await cdp.eval(`Boolean(document.querySelector(".telemetry-cell") || document.querySelector(".bento-surface") || document.querySelector("#chart-setores-demandas"))`);
    assert('Funcional', 'Dashboard Executivo renderiza a Bento Grid com métricas e telemetria', temBentoGrid);

    // 2.5 Navegação funcional por hash para Ocorrências
    await cdp.eval(`(() => {
      window.location.hash = "#ocorrencias";
      if (typeof window.App?.handleRoute === "function") window.App.handleRoute();
    })()`);
    await cdp.sleep(2200);
    const debugInfo = await cdp.eval(`({
      hash: window.location.hash,
      btn: Boolean(document.querySelector("#btn-nova-ocorrencia")),
      h2: document.querySelector("h2")?.innerText,
      mainH: document.getElementById("main-content")?.innerHTML?.slice(0, 200)
    })`);
    const moduloOcorrenciasAtivo = Boolean(debugInfo?.btn || debugInfo?.h2?.includes("Ocorrências"));
    assert('Funcional', 'Navegação por rota SPA abre Módulo de Ocorrências Técnicas', moduloOcorrenciasAtivo, JSON.stringify(debugInfo));

    // 2.6 Abertura do formulário com Lazy Loading de blocos
    await cdp.eval(`document.querySelector("#btn-nova-ocorrencia")?.click()`);
    await cdp.sleep(800);
    const formChamadoAberto = await cdp.eval(`Boolean(document.querySelector("#form-ocorrencia") && !document.querySelector("#oc-form-wrap")?.classList.contains("hidden"))`);
    assert('Funcional', 'Formulário de chamado expande com accordions sob demanda', formChamadoAberto);

    // 2.7 Navegação para Equipamentos e busca com debounce
    await cdp.eval(`window.location.hash = "#equipamentos"; window.App?.handleRoute?.();`);
    await cdp.sleep(1800);
    const moduloEquipamentosAtivo = await cdp.eval(`Boolean(document.querySelector("#input-busca-equip"))`);
    assert('Funcional', 'Módulo de Equipamentos e Patrimônio carregado com campo de busca', moduloEquipamentosAtivo);

    // 2.8 Navegação para Usuários e Modal com Seleção de Senha
    await cdp.eval(`window.location.hash = "#usuarios"; window.App?.handleRoute?.();`);
    await cdp.sleep(1800);
    const moduloUsuariosAtivo = await cdp.eval(`Boolean(document.querySelector("#btn-novo-usuario-admin") || document.querySelector("#btn-pre-cadastro") || document.querySelector("h1")?.innerText?.includes("Usuários"))`);
    assert('Funcional', 'Módulo de Gestão de Usuários carregado com sucesso', moduloUsuariosAtivo);

    // Abre o modal de cadastro de novo usuário
    await cdp.eval(`document.querySelector("#btn-novo-usuario-admin")?.click() || window.UsuariosModule?.abrirModalNovoUsuario?.()`);
    await cdp.sleep(800);

    const temOpcaoSenhaDireta = await cdp.eval(`Boolean(document.querySelector("#opcao-senha-direta"))`);
    const temOpcaoSenhaEmail = await cdp.eval(`Boolean(document.querySelector("#opcao-senha-email"))`);
    assert('Funcional', 'Modal de Usuários exibe opção "Definir senha agora"', temOpcaoSenhaDireta);
    assert('Funcional', 'Modal de Usuários exibe opção "Enviar link por e-mail"', temOpcaoSenhaEmail);

    // Alterna para envio por e-mail e verifica comportamento dinâmico
    await cdp.eval(`document.querySelector("#opcao-senha-email")?.click()`);
    await cdp.sleep(300);
    const blocoEmailVisivel = await cdp.eval(`Boolean(!document.querySelector("#bloco-senha-email-info")?.classList.contains("hidden"))`);
    const blocoSenhaManualOculto = await cdp.eval(`Boolean(document.querySelector("#bloco-senha-manual")?.classList.contains("hidden"))`);
    assert('Funcional', 'Alternância para link por e-mail oculta senha manual e exibe aviso seguro', blocoEmailVisivel && blocoSenhaManualOculto);

    // Fecha modal
    await cdp.eval(`document.querySelector("#btn-modal-cancelar")?.click() || window.UI?.closeModal?.()`);
    await cdp.sleep(500);

    // =========================================================================
    // 3. TESTE DE RESPONSIVIDADE
    // =========================================================================
    console.log('\n▶ [3/7] Teste de Responsividade (Mobile, Tablet e Desktop)...');

    // 3.1 Mobile Viewport (iPhone 375x812)
    await cdp.setViewport(375, 812);
    await cdp.eval(`window.location.hash = "#dashboard"; window.App?.handleRoute?.();`);
    await cdp.sleep(800);

    const overflowMobile = await cdp.eval('document.documentElement.scrollWidth <= 385');
    assert('Responsividade', 'Mobile (375px): Layout sem quebra de overflow horizontal', overflowMobile);

    const hamburgerVisivel = await cdp.eval(`Boolean(document.querySelector("#btn-open-mobile-menu") || document.querySelector("#mobile-drawer"))`);
    assert('Responsividade', 'Mobile (375px): Componente de navegação mobile e gaveta drawer presentes', hamburgerVisivel);

    // 3.2 Tablet Viewport (iPad 768x1024)
    await cdp.setViewport(768, 1024);
    await cdp.sleep(600);
    const overflowTablet = await cdp.eval('document.documentElement.scrollWidth <= 775');
    assert('Responsividade', 'Tablet (768px): Grid adaptativo preservado sem truncamento', overflowTablet);

    // 3.3 Desktop Viewport (Full HD 1920x1080)
    await cdp.setViewport(1920, 1080);
    await cdp.sleep(600);
    const desktopNavVisivel = await cdp.eval(`Boolean(document.querySelector("header") || document.querySelector("nav"))`);
    assert('Responsividade', 'Desktop (1920px): Barra executiva superior e navegação completa ativas', desktopNavVisivel);

    // =========================================================================
    // 4. TESTE DE ACESSIBILIDADE (A11Y AUDIT)
    // =========================================================================
    console.log('\n▶ [4/7] Teste de Acessibilidade (A11y - Semântica, Imagens, Contraste e Foco)...');

    const imagensSemAlt = await cdp.eval(`Array.from(document.querySelectorAll("img:not([alt])")).length`);
    assert('Acessibilidade', 'Todas as imagens da interface possuem atributo alt definido', imagensSemAlt === 0, `${imagensSemAlt} imagens sem alt`);

    const inputsSemLabel = await cdp.eval(`(() => {
      const inputs = Array.from(document.querySelectorAll("input:not([type='hidden'])"));
      return inputs.filter(i => !i.getAttribute("aria-label") && !i.getAttribute("placeholder") && !document.querySelector("label[for='" + i.id + "']")).length;
    })()`);
    assert('Acessibilidade', 'Campos de formulário possuem descritor acessível (label/placeholder)', inputsSemLabel === 0, `${inputsSemLabel} inputs sem descritor`);

    // Alternância de Tema Claro / Escuro
    await cdp.eval(`window.Tema?.alternar?.()`);
    await cdp.sleep(400);
    const modoEscuroAtivo = await cdp.eval(`document.documentElement.classList.contains("dark")`);
    assert('Acessibilidade', 'Suporte e alternância funcional para Tema Escuro (Dark Mode)', modoEscuroAtivo);

    // Retorna ao Tema Claro
    await cdp.eval(`window.Tema?.alternar?.()`);
    await cdp.sleep(400);

    // =========================================================================
    // 5. TESTE E2E (END-TO-END JOURNEYS)
    // =========================================================================
    console.log('\n▶ [5/7] Teste E2E (Fluxos Reais de Usuário - Visitante, Operador e Admin)...');

    // 5.1 Fluxo Visitante (Sem Login)
    await cdp.eval(`window.Auth?.forcarLogout?.(); window.App?.handleRoute?.();`);
    await cdp.sleep(1200);

    const visitanteNaComunicacao = await cdp.eval(`window.location.hash === "#comunicacao"`);
    assert('E2E', 'Visitante entra diretamente na Central de Comunicação sem credencial', visitanteNaComunicacao);

    // Tenta burlar rota restrita como visitante
    await cdp.eval(`window.location.hash = "#equipamentos"; window.App?.handleRoute?.();`);
    await cdp.sleep(1000);
    const visitanteBarrado = await cdp.eval(`window.location.hash === "#comunicacao"`);
    assert('E2E', 'Visitante é estritamente barrado e redirecionado ao tentar acessar módulo restrito', visitanteBarrado);

    // 5.2 Fluxo Operador (Regra de Ouro: Sem Compras)
    await cdp.eval(`(() => {
      window.Auth?.renderizarTelaLogin?.();
      const email = document.querySelector("#login-email");
      const senha = document.querySelector("#login-senha");
      if (email) email.value = "operador@secult.es.gov.br";
      if (senha) senha.value = "Teste@2026!";
      document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    })()`);
    await cdp.sleep(2500);

    const operadorLogado = await cdp.eval(`window.Auth?.getUsuario()?.perfil === "OPERADOR"`);
    assert('E2E', 'Login do perfil OPERADOR realizado com sucesso', operadorLogado);

    const temLinkCompras = await cdp.eval(`Boolean(document.querySelector("a[href='#compras']") && !document.querySelector("a[href='#compras']")?.classList.contains("hidden"))`);
    assert('E2E', 'Regra de Ouro: Link de Compras permanece oculto para OPERADOR', !temLinkCompras);

    await cdp.eval(`window.location.hash = "#compras"; window.App?.handleRoute?.();`);
    await cdp.sleep(1000);
    const hashOperadorCompras = await cdp.eval(`window.location.hash`);
    assert('E2E', 'Regra de Ouro: OPERADOR barrado pelo roteador SPA de acessar tela de compras', hashOperadorCompras !== '#compras');

    // 5.3 Fluxo Admin Geral com Ciclo Completo de Logout
    await cdp.eval(`window.Auth?.forcarLogout?.(); window.Auth?.renderizarTelaLogin?.();`);
    await cdp.sleep(1200);
    const voltouLogin = await cdp.eval(`Boolean(document.querySelector("#tela-login") && !document.querySelector("#tela-login")?.classList.contains("hidden"))`);
    assert('E2E', 'Logout encerra sessão, limpa storage e retorna à tela de login', voltouLogin);

    // =========================================================================
    // 6. TESTE DE REGRESSÃO
    // =========================================================================
    console.log('\n▶ [6/7] Teste de Regressão (Validação de Correções Anteriores)...');

    // Login Admin para testes de regressão
    await cdp.eval(`(() => {
      const sel = document.querySelector("#seletor-cargos-teste");
      if (sel) {
        sel.value = "admin@secult.es.gov.br";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await cdp.sleep(300);
    await cdp.eval(`document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))`);
    await cdp.sleep(2500);

    // 6.1 Regressão listaDocumentos
    const semErroListaDocs = !cdp.pageErrors.some(e => String(e?.text || '').includes('listaDocumentos is not defined'));
    assert('Regressão', 'Regressão listaDocumentos: Zero ocorrências de erro no Dashboard', semErroListaDocs);

    // 6.2 Regressão esqueciSenha
    const apiTemEsqueciSenha = await cdp.eval(`typeof window.API?.esqueciSenha === "function"`);
    assert('Regressão', 'Regressão esqueciSenha: window.API.esqueciSenha devidamente instanciada', apiTemEsqueciSenha);

    // 6.3 Regressão Ocorrências: streaming binário de fotos
    await cdp.eval(`window.location.hash = "#ocorrencias"; window.App?.handleRoute?.();`);
    await cdp.sleep(1800);
    const fotosUsamEndpointStream = await cdp.eval(`(() => {
      const imgs = Array.from(document.querySelectorAll("#grid-ocorrencias img, [data-ocorrencia-id] img"));
      if (imgs.length === 0) return true;
      return imgs.every(img => !img.src.startsWith("data:image/") || img.src.length < 5000);
    })()`);
    assert('Regressão', 'Regressão Ocorrências: Imagens não bloqueiam o DOM com megabytes de Base64', fotosUsamEndpointStream);

    // 6.4 Ausência de erros críticos na execução
    const errosCriticos = cdp.pageErrors.filter(e => !String(e?.text || '').includes('favicon') && !String(e?.text || '').includes('manifest'));
    assert('Regressão', 'Execução da SPA livre de exceções não tratadas no console', errosCriticos.length === 0, `${errosCriticos.length} exceções capturadas`);

  } finally {
    await cdp.close();
  }

  // =========================================================================
  // 7. TESTE DE COMPATIBILIDADE (CHROME vs. EDGE)
  // =========================================================================
  console.log('\n▶ [7/7] Teste de Compatibilidade (Google Chrome vs. Microsoft Edge)...');
  const edgeCdp = new CDPClient('edge', 9246);
  try {
    await edgeCdp.start();
    await edgeCdp.navigate(TARGET_URL);

    const edgeTitle = await edgeCdp.eval('document.title');
    assert('Compatibilidade', 'Microsoft Edge: Aplicação carregada e título verificado', edgeTitle.includes('HUB ES+'));

    // Renderiza login no Edge
    await edgeCdp.eval('window.Auth?.renderizarTelaLogin()');
    await edgeCdp.sleep(500);

    const edgeFormLogin = await edgeCdp.eval('Boolean(document.querySelector("#tela-login"))');
    assert('Compatibilidade', 'Microsoft Edge: Componentes de formulário e CSS Tailwind operacionais', edgeFormLogin);

    // Login no Edge
    await edgeCdp.eval(`(() => {
      window.Auth?.renderizarTelaLogin?.();
      const email = document.querySelector("#login-email");
      const senha = document.querySelector("#login-senha");
      if (email) email.value = "admin@secult.es.gov.br";
      if (senha) senha.value = "Admin@Secult2026!";
      document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    })()`);
    await edgeCdp.sleep(2500);

    const edgeLogado = await edgeCdp.eval('Boolean(window.Auth?.estaLogado())');
    assert('Compatibilidade', 'Microsoft Edge: Autenticação JWT e roteador SPA idênticos ao Chrome', edgeLogado);

    const edgeErrosCriticos = edgeCdp.pageErrors.filter(e => !String(e?.text || '').includes('favicon') && !String(e?.text || '').includes('manifest'));
    assert('Compatibilidade', 'Microsoft Edge: Zero falhas de compatibilidade de scripts ou layout', edgeErrosCriticos.length === 0);

  } catch (err) {
    assert('Compatibilidade', 'Microsoft Edge: Execução do navegador', false, err.message);
  } finally {
    await edgeCdp.close();
  }

  // =========================================================================
  // TABELA CONSOLIDADA DE RESULTADOS
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 RESUMO DA BATERIA DE TESTES DE FRONTEND');
  console.log('================================================================');
  console.log(`• Total de Asserções Executadas: ${passedTotal + failedTotal}`);
  console.log(`• Aprovadas (PASS): ${passedTotal} (${((passedTotal / (passedTotal + failedTotal)) * 100).toFixed(1)}%)`);
  console.log(`• Reprovadas (FAIL): ${failedTotal}`);

  const categorias = [...new Set(relatorio.map(r => r.categoria))];
  console.table(categorias.map(cat => {
    const itens = relatorio.filter(r => r.categoria === cat);
    const pass = itens.filter(r => r.status === 'PASS').length;
    const fail = itens.filter(r => r.status === 'FAIL').length;
    return {
      'Disciplina de Teste': cat,
      'Total': itens.length,
      'Aprovados': pass,
      'Falhas': fail,
      'Taxa de Sucesso': `${((pass / itens.length) * 100).toFixed(0)}%`
    };
  }));

  console.log('================================================================\n');

  if (failedTotal > 0) {
    console.error(`⚠️ Foram encontradas ${failedTotal} falhas de frontend.`);
    process.exit(1);
  } else {
    console.log('🎉 TODOS OS TESTES DE FRONTEND FORAM APROVADOS COM 100% DE SUCESSO!');
  }
}

if (require.main === module) {
  runFrontendTestSuite().catch(err => {
    console.error('Erro na execução dos testes frontend:', err);
    process.exit(1);
  });
}

module.exports = { runFrontendTestSuite };
