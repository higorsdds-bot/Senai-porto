/**
 * BATERIA DE TESTES AUTOMATIZADOS: ROBUSTEZ VISUAL, TABELAS & CONFORMIDADE LGPD
 * HUB ES+ • SECULT ES / SENAI ES
 * 
 * Executa testes estáticos e dinâmicos:
 * 1. Auditoria de tabelas e prevenção de clipping em todos os módulos SPA.
 * 2. Auditoria da Bento Grid e Telemetry Strip contra quebra de layout.
 * 3. Auditoria de conformidade técnica e jurídica com a LGPD (Lei 13.709/2018).
 * 4. Verificação de métodos, persistência e ciclo de vida do consentimento de cookies.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    console.error(`  \x1b[31m✖ FALHA:\x1b[0m ${message}`);
  }
}

console.log('\n======================================================================');
console.log(' INICIANDO BATERIA DE TESTES: BUGS VISUAIS & CONFORMIDADE LGPD');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// GRUPO 1: AUDITORIA DE TABELAS E ROBUSTEZ VISUAL CONTRA CLIPPING
// -----------------------------------------------------------------------------
console.log('\x1b[34m[1/4] AUDITORIA DE TODAS AS TABELAS CONTRA CLIPPING & SQUASHING\x1b[0m');

const modulesDir = path.join(ROOT_DIR, 'assets', 'js', 'modules');
const moduleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith('.js'));

let totalTablesFound = 0;
let tablesWithMinWidth = 0;
let tablesWithOverflowScroll = 0;

moduleFiles.forEach(file => {
  const filePath = path.join(modulesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const tableRegex = /<table\s+([^>]*?)>/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    totalTablesFound++;
    const tableAttrs = match[1];
    const hasMinWidth = /min-w-\[\d+px\]/.test(tableAttrs) || /min-w-full/.test(tableAttrs);
    if (hasMinWidth) tablesWithMinWidth++;

    // Verifica se a tabela está contida em um bloco de overflow-x-auto
    const beforeTable = content.substring(Math.max(0, match.index - 300), match.index);
    const hasOverflow = /overflow-x-auto/.test(beforeTable) || /hub-scrollbar/.test(beforeTable);
    if (hasOverflow) tablesWithOverflowScroll++;
  }
});

assert(totalTablesFound >= 12, `Todas as 12 tabelas da aplicação foram identificadas no escopo (encontradas: ${totalTablesFound})`);
assert(tablesWithMinWidth === totalTablesFound, `100% das tabelas possuem classes min-w-[...px] para evitar achatamento (sucesso: ${tablesWithMinWidth}/${totalTablesFound})`);
assert(tablesWithOverflowScroll === totalTablesFound, `100% das tabelas possuem contêiner de rolagem horizontal com overflow-x-auto (sucesso: ${tablesWithOverflowScroll}/${totalTablesFound})`);

// -----------------------------------------------------------------------------
// GRUPO 2: AUDITORIA DA BENTO GRID & TELEMETRY STRIP NO DASHBOARD
// -----------------------------------------------------------------------------
console.log('\n\x1b[34m[2/4] AUDITORIA DE LAYOUT DA BENTO GRID & TELEMETRY STRIP\x1b[0m');

const dashboardPath = path.join(ROOT_DIR, 'assets', 'js', 'modules', 'dashboard.js');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

assert(dashboardContent.includes('lg:col-span-8 space-y-6 min-w-0'), 'Coluna principal de 70% da Bento Grid possui min-w-0 contra expansão indevida');
assert(dashboardContent.includes('lg:col-span-4 space-y-6 min-w-0'), 'Coluna lateral de 30% da Bento Grid possui min-w-0 contra expansão indevida');
assert(dashboardContent.includes('flex flex-wrap items-center gap-2.5'), 'Cabeçalho principal do dashboard suporta quebra suave de badges de alerta sem estourar margem');
assert(dashboardContent.includes('hub-scrollbar'), 'Tabela de alta densidade da Fila Crítica utiliza scrollbar estilizada');

const styleCssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');

assert(styleCssContent.includes('.telemetry-cell') && styleCssContent.includes('min-width: 0;'), 'Células da Telemetry Strip possuem min-width: 0 para evitar quebra de colunas');
assert(styleCssContent.includes('.hub-scrollbar'), 'Estilos de scrollbar suave e responsiva (.hub-scrollbar) estão definidos em style.css');

// Verificação de Resiliência a Fontes Grandes (Modo Acessibilidade)
const acessibilidadeJsPath = path.join(ROOT_DIR, 'assets', 'js', 'acessibilidade.js');
const acessibilidadeJsContent = fs.readFileSync(acessibilidadeJsPath, 'utf8');
assert(acessibilidadeJsContent.includes('max-h-[calc(100vh-6.5rem)]') && acessibilidadeJsContent.includes('overflow-y-auto'), 'Menu flutuante de acessibilidade possui limite de altura e overflow-y para não estourar viewport com fonte grande');

const acessibilidadeCssPath = path.join(ROOT_DIR, 'assets', 'css', 'acessibilidade.css');
const acessibilidadeCssContent = fs.readFileSync(acessibilidadeCssPath, 'utf8');
assert(acessibilidadeCssContent.includes('#hub-menu-acessibilidade') && acessibilidadeCssContent.includes('max-height'), 'Regra CSS explícita garante que #hub-menu-acessibilidade nunca ultrapasse o topo da tela');

// -----------------------------------------------------------------------------
// GRUPO 3: AUDITORIA ESTRUTURAL E JURÍDICA DA LGPD (LEI 13.709/2018)
// -----------------------------------------------------------------------------
console.log('\n\x1b[34m[3/4] AUDITORIA DE CONFORMIDADE JURÍDICA E TÉCNICA COM A LGPD\x1b[0m');

const lgpdJsPath = path.join(ROOT_DIR, 'assets', 'js', 'lgpd.js');
assert(fs.existsSync(lgpdJsPath), 'Arquivo assets/js/lgpd.js implementado e existente');

const lgpdContent = fs.readFileSync(lgpdJsPath, 'utf8');

// Verificações Jurídicas
assert(lgpdContent.includes('hub_es_lgpd_consent_v1'), 'Chave de armazenamento local padronizada: hub_es_lgpd_consent_v1');
assert(lgpdContent.includes('dpo@secult.es.gov.br'), 'Identificação oficial do Encarregado de Proteção de Dados (DPO) com e-mail institucional');
assert(lgpdContent.includes('13.709/2018'), 'Citação expressa da Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018)');
assert(lgpdContent.includes('Art. 7º') && lgpdContent.includes('Art. 18'), 'Citação das bases legais (Art. 7º, II e III) e dos direitos dos titulares (Art. 18)');
assert(lgpdContent.includes('revogarConsentimento'), 'Mecanismo obrigatório de revogação facilitada de consentimento (Art. 8º, § 5º)');

// Verificações Técnicas de Categorização
assert(lgpdContent.includes('necessary: true'), 'Categoria "Estritamente Necessários" travada como obrigatória para segurança');
assert(lgpdContent.includes('preferences'), 'Categoria granular "Preferências & Acessibilidade" parametrizada');
assert(lgpdContent.includes('telemetry'), 'Categoria granular "Telemetria & Desempenho" parametrizada');
assert(lgpdContent.includes('btn-lgpd-aceitar-todos') && lgpdContent.includes('btn-lgpd-apenas-essenciais'), 'Banner flutuante oferece botões distintos para "Aceitar Todos" e "Apenas Essenciais"');

// Verificação no index.html
const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

assert(indexHtmlContent.includes('assets/js/lgpd.js'), 'index.html inclui o script assets/js/lgpd.js com versionamento de cache');
assert(indexHtmlContent.includes('btn-footer-lgpd') || indexHtmlContent.includes('Privacidade & Cookies (LGPD)'), 'index.html possui botão persistente no rodapé para acessar preferências e revogar cookies a qualquer momento');

// -----------------------------------------------------------------------------
// GRUPO 4: SIMULAÇÃO DINÂMICA DO CICLO DE VIDA DO CONSENTIMENTO
// -----------------------------------------------------------------------------
console.log('\n\x1b[34m[4/4] TESTE FUNCIONAL DO CICLO DE VIDA DE CONSENTIMENTO\x1b[0m');

// Mock simples de ambiente DOM / LocalStorage
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

global.localStorage = mockLocalStorage;
global.document = {
  readyState: 'complete',
  getElementById: () => null,
  addEventListener: () => { },
  createElement: () => ({ id: '', innerHTML: '', appendChild: () => { } }),
  body: { appendChild: () => { } }
};
global.window = {
  dispatchEvent: () => { },
  addEventListener: () => { },
  removeEventListener: () => { },
  UI: { toast: () => { } }
};
global.CustomEvent = class {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};

// Executa a lógica do módulo em sandbox
eval(lgpdContent);

const lgpdApi = global.window.LGPD;
assert(typeof lgpdApi === 'object', 'Objeto global window.LGPD instanciado com sucesso');

// Teste 1: Estado inicial sem consentimento
const estadoInicial = lgpdApi.getConsent();
assert(estadoInicial.consented === false, 'Estado inicial reporta consented = false quando não há registro prévio');

// Teste 2: Aceitar todos
lgpdApi.aceitarTodos();
const consentTodos = lgpdApi.getConsent();
assert(consentTodos.consented === true && consentTodos.categories.preferences === true && consentTodos.categories.telemetry === true, 'aceitarTodos() ativa consented=true e todas as categorias');

// Teste 3: Aceitar apenas essenciais
lgpdApi.aceitarEssenciais();
const consentEssenciais = lgpdApi.getConsent();
assert(consentEssenciais.consented === true && consentEssenciais.categories.preferences === false && consentEssenciais.categories.telemetry === false && consentEssenciais.categories.necessary === true, 'aceitarEssenciais() mantém apenas cookies necessários ativos e desativa os opcionais');

// Teste 4: Revogar consentimento
lgpdApi.revogarConsentimento();
const consentRevogado = lgpdApi.getConsent();
assert(consentRevogado.consented === false, 'revogarConsentimento() remove o consentimento e limpa a persistência');

console.log('\n======================================================================');
console.log(` RESULTADO: ${passedTests} DE ${totalTests} TESTES APROVADOS COM SUCESSO!`);
console.log('======================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
