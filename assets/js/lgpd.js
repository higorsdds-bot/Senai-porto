/**
 * HUB ES+ - Sistema Integrado de Conformidade com a LGPD (assets/js/lgpd.js)
 * Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018)
 * 
 * Controlador: Secretaria de Estado da Cultura do Espírito Santo (SECULT ES)
 * Operador Técnico: SENAI ES / FINDES
 * Encarregado de Proteção de Dados (DPO): dpo@secult.es.gov.br
 * 
 * Gerencia:
 * 1. Banner flutuante de consentimento de cookies e armazenamento local.
 * 2. Modal granular de preferências (Essenciais, Acessibilidade/Preferências, Telemetria).
 * 3. Modal oficial de Política de Privacidade e Governança de Dados Públicos.
 * 4. Revogação e alteração imediata de consentimento a qualquer momento (Art. 8º, § 5º).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'hub_es_lgpd_consent_v1';
  const CURRENT_VERSION = '2026.1';

  const LGPD = {
    versao: CURRENT_VERSION,
    dpoEmail: 'dpo@secult.es.gov.br',

    /**
     * Retorna o estado atual de consentimento salvo no navegador
     */
    getConsent() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return {
              consented: Boolean(parsed.consented),
              timestamp: parsed.timestamp || null,
              version: parsed.version || CURRENT_VERSION,
              categories: {
                necessary: true, // Sempre verdadeiro por segurança e sessão
                preferences: parsed.categories?.preferences !== false,
                telemetry: parsed.categories?.telemetry !== false
              }
            };
          }
        }
      } catch (e) {
        console.warn('[LGPD] Erro ao ler consentimento local:', e);
      }

      return {
        consented: false,
        timestamp: null,
        version: CURRENT_VERSION,
        categories: {
          necessary: true,
          preferences: true,
          telemetry: true
        }
      };
    },

    /**
     * Verifica se o usuário já registrou uma opção de consentimento
     */
    hasConsented() {
      return this.getConsent().consented;
    },

    /**
     * Salva as preferências de consentimento no localStorage
     */
    salvarConsentimento(categories, silencioso = false) {
      const consentData = {
        consented: true,
        timestamp: new Date().toISOString(),
        version: CURRENT_VERSION,
        categories: {
          necessary: true,
          preferences: Boolean(categories?.preferences),
          telemetry: Boolean(categories?.telemetry)
        }
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
      } catch (err) {
        console.error('[LGPD] Falha ao gravar no localStorage:', err);
      }

      this.ocultarBanner();
      this.fecharModais();

      // Dispara evento customizado para módulos que escutam alterações de consentimento
      window.dispatchEvent(new CustomEvent('hub_lgpd_consent_updated', {
        detail: consentData
      }));

      if (!silencioso && window.UI?.toast) {
        window.UI.toast({
          title: 'Preferências de Privacidade Salvas',
          message: 'Suas escolhas de cookies e proteção de dados foram registradas com sucesso.',
          type: 'success'
        });
      }

      return consentData;
    },

    /**
     * Aceitar todos os cookies e recursos
     */
    aceitarTodos() {
      return this.salvarConsentimento({
        necessary: true,
        preferences: true,
        telemetry: true
      });
    },

    /**
     * Aceitar apenas os estritamente essenciais
     */
    aceitarEssenciais() {
      const result = this.salvarConsentimento({
        necessary: true,
        preferences: false,
        telemetry: false
      });

      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Apenas Cookies Essenciais Ativos',
          message: 'Apenas dados indispensáveis à autenticação e segurança de sessão serão armazenados.',
          type: 'info'
        });
      }
      return result;
    },

    /**
     * Revogar consentimento e reabrir configurações
     */
    revogarConsentimento() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error('[LGPD] Falha ao revogar consentimento:', err);
      }

      this.fecharModais();
      this.exibirBanner();

      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Consentimento Revogado',
          message: 'Seu consentimento foi reinicializado. Você pode redefinir suas opções a qualquer momento.',
          type: 'warning'
        });
      }

      window.dispatchEvent(new CustomEvent('hub_lgpd_consent_revoked'));
    },

    /**
     * Inicializa a interface LGPD no DOM
     */
    init() {
      this._injetarEstruturaDOM();
      this._vincularEventosGlobais();

      const consent = this.getConsent();
      if (!consent.consented) {
        this.exibirBanner();
      }
    },

    /**
     * Injeta o banner e modais no final do body se ainda não existirem
     */
    _injetarEstruturaDOM() {
      if (document.getElementById('hub-lgpd-container')) return;

      const container = document.createElement('div');
      container.id = 'hub-lgpd-container';
      container.innerHTML = `
        <!-- ============================================================= -->
        <!-- BANNER FLUTUANTE DE CONSENTIMENTO DE COOKIES (LGPD)          -->
        <!-- ============================================================= -->
        <div id="hub-lgpd-banner" class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-xl z-50 hidden transition-all duration-300 transform translate-y-4">
          <div class="bg-white/95 dark:bg-[#071322]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-slate-950/20 text-slate-800 dark:text-slate-100 ring-1 ring-black/5 dark:ring-white/10">
            <div class="flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
                <i data-lucide="shield-check" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Privacidade & Cookies no HUB ES+
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                      LGPD 13.709/2018
                    </span>
                  </h3>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Utilizamos armazenamento local e cookies para autenticação segura (JWT), manutenção de sessão por aba e preferências de acessibilidade. Dados de telemetria são agregados de forma anônima.
                </p>
                <div class="mt-2.5 flex items-center gap-3 text-xs">
                  <button type="button" id="btn-lgpd-abrir-politica-link" class="text-blue-600 dark:text-sky-400 hover:underline font-bold cursor-pointer">
                    Ler Política de Privacidade ↗
                  </button>
                  <span class="text-slate-300 dark:text-slate-700">•</span>
                  <button type="button" id="btn-lgpd-abrir-preferencias-link" class="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer">
                    Personalizar Opções
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-end gap-2">
              <button type="button" id="btn-lgpd-apenas-essenciais" class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Apenas Essenciais
              </button>
              <button type="button" id="btn-lgpd-personalizar" class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Preferências
              </button>
              <button type="button" id="btn-lgpd-aceitar-todos" class="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer">
                Aceitar Todos
              </button>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- MODAL DE PREFERÊNCIAS GRANULARES DE COOKIES                   -->
        <!-- ============================================================= -->
        <div id="hub-lgpd-modal-prefs" class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md hidden flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div class="bg-white dark:bg-[#071322] rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[92vh] overflow-y-auto transform transition-all text-slate-800 dark:text-slate-100">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                  <i data-lucide="sliders" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Preferências de Privacidade & Cookies
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Controle granular em conformidade com a Lei Geral de Proteção de Dados (Art. 8º da Lei 13.709/2018)
                  </p>
                </div>
              </div>
              <button type="button" id="btn-lgpd-fechar-prefs" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Fechar">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <div class="py-5 space-y-4">
              <!-- Categoria 1: Essenciais (Obrigatórios) -->
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="lock" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                    <span class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Estritamente Necessários (Sessão & Segurança)
                    </span>
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Sempre Ativo • Obrigatório
                  </span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Essenciais para o funcionamento básico: autenticação JWT criptografada, proteção contra CSRF, isolamento de sessão por aba (<code class="text-[11px] font-mono text-blue-600 dark:text-sky-400">sessionStorage</code>) e integridade de conexões com o banco de dados TiDB Cloud. Não podem ser desativados.
                </p>
              </div>

              <!-- Categoria 2: Acessibilidade & Preferências -->
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="eye" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                    <span class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Preferências de Interface & Acessibilidade
                    </span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="lgpd-check-preferencias" class="sr-only peer" checked>
                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Armazena suas configurações visuais: alternância de Tema Claro/Escuro, escala tipográfica de acessibilidade, modo alto contraste e estado do VLibras (Língua Brasileira de Sinais), garantindo inclusão e conformidade com a Lei 13.146/2015.
                </p>
              </div>

              <!-- Categoria 3: Telemetria & Desempenho -->
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="activity" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                    <span class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Telemetria Operacional & Diagnóstico de Borda
                    </span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="lgpd-check-telemetria" class="sr-only peer" checked>
                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Métricas técnicas agregadas e anônimas sobre latência de rede na borda Cloudflare, detecção de indisponibilidade de API e contagem de sessões simultâneas para balanceamento de carga. Nenhum dado pessoal identificável é vendido ou compartilhado para fins publicitários.
                </p>
              </div>

              <!-- Detalhes do Consentimento Atual -->
              <div id="lgpd-info-consentimento-atual" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Versão dos Termos: <strong>v${CURRENT_VERSION}</strong></span>
                <span id="lgpd-status-data-consentimento">Não registrado</span>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button type="button" id="btn-lgpd-revogar" class="text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                Revogar Todo Consentimento
              </button>
              <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button type="button" id="btn-lgpd-salvar-preferencias" class="btn-primary text-xs w-full sm:w-auto">
                  Salvar Minhas Escolhas
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- MODAL OFICIAL: POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS   -->
        <!-- ============================================================= -->
        <div id="hub-lgpd-modal-policy" class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md hidden flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div class="bg-white dark:bg-[#071322] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[92vh] overflow-y-auto transform transition-all text-slate-800 dark:text-slate-100">
            <div class="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Política de Privacidade & Governança de Dados
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Secretaria de Estado da Cultura (SECULT ES) • Parceria SENAI ES / Sistema FINDES
                  </p>
                </div>
              </div>
              <button type="button" id="btn-lgpd-fechar-policy" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Fechar">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <!-- Corpo Textual Jurídico Formatado -->
            <div class="py-5 space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              
              <section class="space-y-2">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="landmark" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                  1. Apresentação e Identificação Institucional
                </h4>
                <p>
                  Esta Política de Privacidade disciplina o tratamento de dados pessoais no âmbito da <strong>Plataforma Integrada HUB ES+</strong>, instrumento tecnológico oficial de governança, patrimônio e compras do Polo de Economia Criativa do Espírito Santo, instituído pela <strong>Secretaria de Estado da Cultura do Espírito Santo (SECULT ES)</strong> e operado tecnicamente em cooperação com o <strong>SENAI ES / Federação das Indústrias do Estado do Espírito Santo (FINDES)</strong>.
                </p>
              </section>

              <section class="space-y-2">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="scale" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                  2. Bases Legais do Tratamento (Lei 13.709/2018 - LGPD)
                </h4>
                <p>
                  O tratamento de dados pessoais realizado nesta plataforma fundamenta-se estritamente nas seguintes hipóteses legais previstas no Art. 7º da LGPD:
                </p>
                <ul class="list-disc pl-5 space-y-1">
                  <li><strong>Inciso II (Cumprimento de Obrigação Legal ou Regulatória):</strong> Manutenção de trilhas de auditoria administrativa, prestação de contas aos órgãos de controle (TCE-ES, CGE-ES) e conformidade com o Marco Civil da Internet (Lei 12.965/2014);</li>
                  <li><strong>Inciso III (Execução de Políticas Públicas):</strong> Gestão operacional do HUB ES+ voltada ao desenvolvimento da economia criativa e artística capixaba;</li>
                  <li><strong>Inciso I e Art. 8º (Consentimento Expresso):</strong> Armazenamento de preferências opcionais de usabilidade, personalização de acessibilidade e métricas de telemetria de rede.</li>
                </ul>
              </section>

              <section class="space-y-2">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="database" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                  3. Dados Pessoais Coletados e Finalidades
                </h4>
                <div class="overflow-x-auto hub-scrollbar">
                  <table class="w-full min-w-[500px] text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <thead class="bg-slate-50 dark:bg-slate-900/60 font-bold uppercase text-[10px] text-slate-500">
                      <tr>
                        <th class="p-2.5 border-b border-slate-200 dark:border-slate-800">Dado Coletado</th>
                        <th class="p-2.5 border-b border-slate-200 dark:border-slate-800">Finalidade Estrita</th>
                        <th class="p-2.5 border-b border-slate-200 dark:border-slate-800">Retenção</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      <tr>
                        <td class="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Nome, E-mail e Cargo</td>
                        <td class="p-2.5">Identificação funcional e controle de acesso RBAC</td>
                        <td class="p-2.5">Vínculo institucional ativo</td>
                      </tr>
                      <tr>
                        <td class="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Hash de Senha (bcrypt)</td>
                        <td class="p-2.5">Autenticação segura (sem armazenamento de senha em texto plano)</td>
                        <td class="p-2.5">Substituível pelo usuário</td>
                      </tr>
                      <tr>
                        <td class="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Logs de Auditoria (IP, Data, Ação)</td>
                        <td class="p-2.5">Segurança da informação e compliance administrativo</td>
                        <td class="p-2.5">5 anos (Marco Civil / CGE)</td>
                      </tr>
                      <tr>
                        <td class="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Preferências Visuais & VLibras</td>
                        <td class="p-2.5">Acessibilidade e usabilidade individual (localStorage)</td>
                        <td class="p-2.5">Até a limpeza pelo usuário</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="space-y-2">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="shield" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                  4. Medidas Técnicas de Segurança da Informação
                </h4>
                <p>
                  O ecossistema adota padrões de segurança estritos para resguardar a integridade, confidencialidade e disponibilidade dos dados:
                </p>
                <ul class="list-disc pl-5 space-y-1">
                  <li>Trânsito de dados 100% criptografado através do protocolo <strong>TLS 1.3 / HTTPS</strong>;</li>
                  <li>Proteção perimetral contra ataques DDoS, mitigação de botnets e firewall de aplicação na borda Cloudflare;</li>
                  <li>Banco de dados distribuído <strong>TiDB Cloud</strong> em cluster certificado SOC 2 Type II e ISO 27001;</li>
                  <li>Controle de acesso rigoroso baseado em papéis (RBAC) com validação dupla em backend e frontend;</li>
                  <li>Exclusão lógica mandatória (<em>soft delete</em> com <code>deleted_at</code>), prevenindo perda involuntária de acervo e permitindo auditoria forense.</li>
                </ul>
              </section>

              <section class="space-y-2">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="user-check" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                  5. Direitos dos Titulares de Dados (Art. 18 da LGPD)
                </h4>
                <p>
                  Você, na qualidade de titular de dados pessoais, tem o direito garantido de obter da SECULT ES e SENAI ES, a qualquer momento e mediante requisição:
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <span class="font-bold text-slate-800 dark:text-slate-200 block">✓ Confirmação & Acesso</span>
                    <span class="text-[11px] text-slate-500">Saber se seus dados são tratados e obter cópia integral.</span>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <span class="font-bold text-slate-800 dark:text-slate-200 block">✓ Correção de Dados</span>
                    <span class="text-[11px] text-slate-500">Solicitar retificação de dados incorretos ou desatualizados.</span>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <span class="font-bold text-slate-800 dark:text-slate-200 block">✓ Revogação de Consentimento</span>
                    <span class="text-[11px] text-slate-500">Revogar preferências e cookies não essenciais com 1 clique.</span>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <span class="font-bold text-slate-800 dark:text-slate-200 block">✓ Informações de Compartilhamento</span>
                    <span class="text-[11px] text-slate-500">Conhecer os órgãos com os quais houve cooperação.</span>
                  </div>
                </div>
              </section>

              <section class="space-y-2 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                <h4 class="text-sm font-bold text-blue-900 dark:text-sky-300 flex items-center gap-2">
                  <i data-lucide="mail" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
                  6. Encarregado pelo Tratamento de Dados Pessoais (DPO)
                </h4>
                <p class="text-blue-950 dark:text-sky-100">
                  Para exercer seus direitos de titular ou esclarecer qualquer dúvida sobre o tratamento de seus dados pessoais neste sistema, entre em contato direto com o nosso Encarregado de Dados:
                </p>
                <div class="mt-2 text-xs font-mono">
                  <p><strong>Encarregado Institucional:</strong> Assessoria de Proteção de Dados e Governança Digital (SECULT ES / SENAI ES)</p>
                  <p><strong>Canal Direto:</strong> <a href="mailto:dpo@secult.es.gov.br" class="text-blue-600 dark:text-sky-400 font-bold underline">dpo@secult.es.gov.br</a> / <a href="mailto:privacidade@findes.org.br" class="text-blue-600 dark:text-sky-400 font-bold underline">privacidade@findes.org.br</a></p>
                  <p><strong>Prazo de Resposta:</strong> Até 15 (quinze) dias conforme regulamentação da Autoridade Nacional de Proteção de Dados (ANPD).</p>
                </div>
              </section>

            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button type="button" id="btn-lgpd-policy-ajustar-cookies" class="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                Configurar Meus Cookies
              </button>
              <button type="button" id="btn-lgpd-fechar-policy-btn" class="btn-primary text-xs">
                Entendido e Ciente
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      if (window.lucide) {
        window.lucide.createIcons({ root: container });
      }
    },

    /**
     * Vincula listeners de cliques nos botões do banner e modais
     */
    _vincularEventosGlobais() {
      // Banner
      document.getElementById('btn-lgpd-aceitar-todos')?.addEventListener('click', () => {
        this.aceitarTodos();
      });

      document.getElementById('btn-lgpd-apenas-essenciais')?.addEventListener('click', () => {
        this.aceitarEssenciais();
      });

      document.getElementById('btn-lgpd-personalizar')?.addEventListener('click', () => {
        this.abrirPreferencias();
      });

      document.getElementById('btn-lgpd-abrir-preferencias-link')?.addEventListener('click', () => {
        this.abrirPreferencias();
      });

      document.getElementById('btn-lgpd-abrir-politica-link')?.addEventListener('click', () => {
        this.abrirPolitica();
      });

      // Modal Preferências
      document.getElementById('btn-lgpd-fechar-prefs')?.addEventListener('click', () => {
        this.fecharModais();
      });

      document.getElementById('btn-lgpd-revogar')?.addEventListener('click', () => {
        this.revogarConsentimento();
      });

      document.getElementById('btn-lgpd-salvar-preferencias')?.addEventListener('click', () => {
        const prefs = {
          necessary: true,
          preferences: document.getElementById('lgpd-check-preferencias')?.checked ?? true,
          telemetry: document.getElementById('lgpd-check-telemetria')?.checked ?? true
        };
        this.salvarConsentimento(prefs);
      });

      // Modal Política
      document.getElementById('btn-lgpd-fechar-policy')?.addEventListener('click', () => {
        this.fecharModais();
      });

      document.getElementById('btn-lgpd-fechar-policy-btn')?.addEventListener('click', () => {
        this.fecharModais();
      });

      document.getElementById('btn-lgpd-policy-ajustar-cookies')?.addEventListener('click', () => {
        this.fecharModais();
        this.abrirPreferencias();
      });

      // Fechamento de modal com clique fora ou tecla ESC
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.fecharModais();
        }
      });
    },

    /**
     * Mostra o banner com animação suave
     */
    exibirBanner() {
      const banner = document.getElementById('hub-lgpd-banner');
      if (banner) {
        banner.classList.remove('hidden');
        requestAnimationFrame(() => {
          banner.classList.remove('translate-y-4');
          banner.classList.add('translate-y-0');
        });
      }
    },

    /**
     * Oculta o banner
     */
    ocultarBanner() {
      const banner = document.getElementById('hub-lgpd-banner');
      if (banner) {
        banner.classList.add('translate-y-4');
        setTimeout(() => banner.classList.add('hidden'), 250);
      }
    },

    /**
     * Abre o modal de preferências granulares
     */
    abrirPreferencias() {
      const modal = document.getElementById('hub-lgpd-modal-prefs');
      if (!modal) return;

      const consent = this.getConsent();
      const checkPrefs = document.getElementById('lgpd-check-preferencias');
      const checkTelem = document.getElementById('lgpd-check-telemetria');
      const statusData = document.getElementById('lgpd-status-data-consentimento');

      if (checkPrefs) checkPrefs.checked = consent.categories.preferences;
      if (checkTelem) checkTelem.checked = consent.categories.telemetry;
      if (statusData) {
        if (consent.timestamp) {
          const dataFmt = new Date(consent.timestamp).toLocaleString('pt-BR');
          statusData.innerHTML = `Consentimento ativo desde: <strong class="text-slate-700 dark:text-slate-300">${dataFmt}</strong>`;
        } else {
          statusData.textContent = 'Nenhuma preferência personalizada salva ainda';
        }
      }

      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons({ root: modal });
    },

    /**
     * Abre o modal oficial de política de privacidade
     */
    abrirPolitica() {
      const modal = document.getElementById('hub-lgpd-modal-policy');
      if (!modal) return;

      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons({ root: modal });
    },

    /**
     * Fecha todos os modais da LGPD
     */
    fecharModais() {
      document.getElementById('hub-lgpd-modal-prefs')?.classList.add('hidden');
      document.getElementById('hub-lgpd-modal-policy')?.classList.add('hidden');
    }
  };

  // Expõe no escopo global
  window.LGPD = LGPD;

  // Auto-inicialização quando o DOM estiver pronto
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => LGPD.init());
    } else {
      LGPD.init();
    }
  }
})();
