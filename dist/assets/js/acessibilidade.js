/**
 * HUB ES+ / SECULT — Módulo de Acessibilidade Visual e WCAG 2.1 (Frontend)
 * - Janelas flutuantes fixas de Acessibilidade e VLibras
 * - 3 Tamanhos de letras: Normal (padrão), Médio e Grande
 * - Modo Daltônico com matrizes de cor SVG (Deuteranopia, Protanopia, Tritanopia, Acromatopsia)
 * - Alto Contraste adaptativo (Claro e Escuro)
 * - Destaque de links e tipografia facilitada
 * - Integração oficial com API VLibras (Língua Brasileira de Sinais)
 * - Modal/Etapa pós-login para escolha imediata de Tema (Dark/Light) e preferências visuais
 */

(function () {
    const CHAVE_STORAGE = 'hub_es_acessibilidade';

    const PADROES = {
        tamanhoFonte: 'normal', // 'normal' | 'medio' | 'grande'
        altoContraste: false,
        daltonismo: 'padrao',   // 'padrao' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'acromatopsia'
        destaqueLinks: false,
        fonteLegivel: false,
        vlibrasAtivo: false
    };

    class GerenciadorAcessibilidade {
        constructor() {
            this.config = this._carregarConfig();
            this.menuAberto = false;
            this._vlibrasIniciado = false;
        }

        _carregarConfig() {
            try {
                const salvo = localStorage.getItem(CHAVE_STORAGE);
                if (salvo) {
                    return { ...PADROES, ...JSON.parse(salvo) };
                }
            } catch (_) { }
            return { ...PADROES };
        }

        _salvarConfig() {
            try {
                localStorage.setItem(CHAVE_STORAGE, JSON.stringify(this.config));
            } catch (_) { }
        }

        /** Inicialização completa no carregamento da página */
        init() {
            this._injetarFiltrosSVG();
            this.aplicarConfiguracoes();
            this._criarBotoesFlutuantes();
            this._criarMenuFlutuante();
            this._inicializarVLibras();
            this._escutarEventosGlobais();
        }

        /** Injeta as definições de feColorMatrix para os tipos de daltonismo */
        _injetarFiltrosSVG() {
            if (document.getElementById('hub-svg-filtros-daltonismo')) return;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'hub-svg-filtros-daltonismo';
            svg.setAttribute('style', 'position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none;');
            svg.setAttribute('aria-hidden', 'true');

            svg.innerHTML = `
                <defs>
                    <!-- Protanopia (Dificuldade com vermelho) -->
                    <filter id="filtro-protanopia">
                        <feColorMatrix type="matrix" values="
                            0.567, 0.433, 0.000, 0, 0
                            0.558, 0.442, 0.000, 0, 0
                            0.000, 0.242, 0.758, 0, 0
                            0.000, 0.000, 0.000, 1, 0" />
                    </filter>
                    <!-- Deuteranopia (Dificuldade com verde - tipo mais frequente) -->
                    <filter id="filtro-deuteranopia">
                        <feColorMatrix type="matrix" values="
                            0.625, 0.375, 0.000, 0, 0
                            0.700, 0.300, 0.000, 0, 0
                            0.000, 0.300, 0.700, 0, 0
                            0.000, 0.000, 0.000, 1, 0" />
                    </filter>
                    <!-- Tritanopia (Dificuldade com azul/amarelo) -->
                    <filter id="filtro-tritanopia">
                        <feColorMatrix type="matrix" values="
                            0.950, 0.050, 0.000, 0, 0
                            0.000, 0.433, 0.567, 0, 0
                            0.000, 0.475, 0.525, 0, 0
                            0.000, 0.000, 0.000, 1, 0" />
                    </filter>
                    <!-- Acromatopsia (Monocromático / Escala de cinza de alta sensibilidade) -->
                    <filter id="filtro-acromatopsia">
                        <feColorMatrix type="matrix" values="
                            0.299, 0.587, 0.114, 0, 0
                            0.299, 0.587, 0.114, 0, 0
                            0.299, 0.587, 0.114, 0, 0
                            0.000, 0.000, 0.000, 1, 0" />
                    </filter>
                </defs>
            `;
            document.body.appendChild(svg);
        }

        /** Aplica todas as configurações atuais no DOM */
        aplicarConfiguracoes() {
            this.setTamanhoFonte(this.config.tamanhoFonte, false);
            this.setAltoContraste(this.config.altoContraste, false);
            this.setModoDaltonico(this.config.daltonismo, false);
            this.setDestaqueLinks(this.config.destaqueLinks, false);
            this.setFonteLegivel(this.config.fonteLegivel, false);
        }

        // =====================================================================
        // CONTROLES DE ACESSIBILIDADE
        // =====================================================================

        /**
         * Define o tamanho das letras: 'normal', 'medio' ou 'grande'
         */
        setTamanhoFonte(tamanho, persistir = true) {
            const tamanhosValidos = ['normal', 'medio', 'grande'];
            const t = tamanhosValidos.includes(tamanho) ? tamanho : 'normal';

            const root = document.documentElement;
            root.classList.remove('fonte-normal', 'fonte-media', 'fonte-grande');
            root.classList.add(`fonte-${t}`);

            this.config.tamanhoFonte = t;
            if (persistir) this._salvarConfig();
            this._sincronizarUI();
        }

        aumentarFonte() {
            if (this.config.tamanhoFonte === 'normal') {
                this.setTamanhoFonte('medio');
            } else if (this.config.tamanhoFonte === 'medio') {
                this.setTamanhoFonte('grande');
            }
        }

        diminuirFonte() {
            if (this.config.tamanhoFonte === 'grande') {
                this.setTamanhoFonte('medio');
            } else if (this.config.tamanhoFonte === 'medio') {
                this.setTamanhoFonte('normal');
            }
        }

        /** Alterna o modo de Alto Contraste */
        setAltoContraste(ativo, persistir = true) {
            const estado = Boolean(ativo);
            document.documentElement.classList.toggle('alto-contraste', estado);
            this.config.altoContraste = estado;
            if (persistir) this._salvarConfig();
            this._sincronizarUI();
        }

        alternarAltoContraste() {
            this.setAltoContraste(!this.config.altoContraste);
        }

        /**
         * Define o modo daltônico via filtros SVG
         * 'padrao' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'acromatopsia'
         */
        setModoDaltonico(tipo, persistir = true) {
            const validos = ['padrao', 'protanopia', 'deuteranopia', 'tritanopia', 'acromatopsia'];
            const t = validos.includes(tipo) ? tipo : 'padrao';

            const root = document.documentElement;
            if (t === 'padrao') {
                root.removeAttribute('data-daltonismo');
            } else {
                root.setAttribute('data-daltonismo', t);
            }

            this.config.daltonismo = t;
            if (persistir) this._salvarConfig();
            this._sincronizarUI();
        }

        setDestaqueLinks(ativo, persistir = true) {
            const estado = Boolean(ativo);
            document.documentElement.classList.toggle('destaque-links', estado);
            this.config.destaqueLinks = estado;
            if (persistir) this._salvarConfig();
            this._sincronizarUI();
        }

        setFonteLegivel(ativo, persistir = true) {
            const estado = Boolean(ativo);
            document.documentElement.classList.toggle('fonte-legivel', estado);
            this.config.fonteLegivel = estado;
            if (persistir) this._salvarConfig();
            this._sincronizarUI();
        }

        /** Restaura todas as preferências para os valores padrão */
        restaurarPadroes() {
            this.config = { ...PADROES };
            this._salvarConfig();
            this.aplicarConfiguracoes();
            if (window.UI?.toast) {
                window.UI.toast({
                    title: 'Acessibilidade Redefinida',
                    message: 'Todas as configurações visuais voltaram ao padrão original.',
                    type: 'info'
                });
            }
        }

        // =====================================================================
        // INTEGRAÇÃO COM VLIBRAS
        // =====================================================================

        _inicializarVLibras() {
            // Garante que a estrutura HTML do VLibras esteja presente
            if (!document.getElementById('vlibras-container-base')) {
                const vlDiv = document.createElement('div');
                vlDiv.id = 'vlibras-container-base';
                vlDiv.setAttribute('vw', '');
                vlDiv.className = 'enabled';
                vlDiv.innerHTML = `
                    <div vw-access-button class="active"></div>
                    <div vw-plugin-wrapper>
                        <div class="vw-plugin-top-wrapper"></div>
                    </div>
                `;
                document.body.appendChild(vlDiv);
            }

            // Inicializa a biblioteca VLibras caso já esteja carregada
            const tentarIniciar = () => {
                try {
                    if (window.VLibras && typeof window.VLibras.Widget === 'function' && !this._vlibrasIniciado) {
                        new window.VLibras.Widget('https://vlibras.gov.br/app');
                        this._vlibrasIniciado = true;
                    }
                } catch (err) {
                    console.warn('[VLibras] Falha ao instanciar widget:', err);
                }
            };

            if (window.VLibras) {
                tentarIniciar();
            } else {
                window.addEventListener('load', tentarIniciar, { once: true });
            }
        }

        /** Abre ou ativa o avatar VLibras */
        abrirVLibras() {
            try {
                // Se a API global já possui o método de abertura
                if (window.VLibrasWidget && typeof window.VLibrasWidget.open === 'function') {
                    window.VLibrasWidget.open();
                    return;
                }

                // Tenta acionar o botão de acesso gerado no shadowRoot
                const wrapper = document.getElementById('vlibras-access-wrapper');
                const btn = wrapper?.shadowRoot?.querySelector('#vlibras-button') || document.querySelector('[vw-access-button]');
                if (btn) {
                    btn.click();
                    return;
                }

                // Fallback: se o script do VLibras ainda não foi carregado, carrega sob demanda
                if (!window.VLibras) {
                    const script = document.createElement('script');
                    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
                    script.async = true;
                    script.onload = () => {
                        try {
                            new window.VLibras.Widget('https://vlibras.gov.br/app');
                            setTimeout(() => {
                                if (window.VLibrasWidget?.open) window.VLibrasWidget.open();
                            }, 300);
                        } catch (_) { }
                    };
                    document.body.appendChild(script);
                }
            } catch (err) {
                console.error('[VLibras] Erro ao abrir VLibras:', err);
            }
        }

        // =====================================================================
        // BOTÕES FLUTUANTES FIXOS (IMAGE 1)
        // =====================================================================

        _criarBotoesFlutuantes() {
            if (document.getElementById('hub-floating-accessibility')) return;

            const container = document.createElement('div');
            container.id = 'hub-floating-accessibility';
            container.className = 'fixed right-3 sm:right-4 bottom-8 sm:bottom-12 z-[1001] flex flex-col gap-2.5 select-none print:hidden';

            // Botão 1: Menu de Acessibilidade (Pessoa no Círculo)
            // Botão 2: VLibras (Mãos em Língua de Sinais)
            container.innerHTML = `
                <!-- Botão 1: Menu de Acessibilidade -->
                <button id="btn-floating-acessibilidade" type="button"
                    class="hub-fab-btn"
                    aria-label="Menu de Acessibilidade Visual"
                    title="Menu de Acessibilidade Visual (Texto, Contraste, Daltonismo)">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
                        <circle cx="50" cy="50" r="42" stroke-width="7" />
                        <circle cx="50" cy="27" r="7.5" fill="currentColor" stroke="none" />
                        <path d="M22 43 h56" />
                        <path d="M50 43 v19" />
                        <path d="M34 80 L48 62" />
                        <path d="M66 80 L52 62" />
                    </svg>
                </button>

                <!-- Botão 2: VLibras -->
                <button id="btn-floating-vlibras" type="button"
                    class="hub-fab-btn"
                    aria-label="Abrir Tradutor de Libras (VLibras)"
                    title="Ativar Tradutor de Libras 3D (VLibras)">
                    <svg viewBox="0 0 40 40" fill="none" class="w-6 h-6">
                        <path fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd" d="M14.35 8a1 1 0 0 0-.38.24c-.22.21-.22.21-.17.72l.11 1.35c.3 3.62.34 4.7.21 4.78-.21.14-.33-.06-2.35-3.97-.69-1.33-.82-1.48-1.24-1.34-.68.23-.63.57.45 2.9l.26.58c0 .01.12.3.27.61.8 1.76 1.01 2.47.75 2.57-.18.07-.51-.1-.78-.42-.14-.16-.3-.36-.38-.43a19 19 0 0 1-.78-.95l-.72-.86a7 7 0 0 0-.8-.86c-.34-.13-.8.13-.8.46 0 .29.7 1.44 2.13 3.56.9 1.33 1.11 1.8 1.32 2.97q.64 3.7 1.78 4.6c.51.4.53.4 1.75.35l1.11-.04.85-1.14.93-1.23c.33-.43 1.17-1.92 1.17-2.07 0-.02-.44-.02-.97 0q-.98.05-1.43-.04c-.52-.1-1.18-.4-1.55-.7a1.55 1.55 0 0 1-.38-1.94c.27-.45.64-.65 1.41-.74.63-.08 1.3-.26 2.27-.62l.51-.19v-.82c0-.84.16-3.78.29-5.16.1-1.09.1-1.08-.17-1.34-.19-.19-.3-.24-.5-.24-.5 0-.52.07-1.02 2.57l-.54 2.8c-.12.68-.21.93-.37 1-.2.07-.39-.25-.48-.82l-.27-1.68c-.19-1.19-.56-3.4-.64-3.8-.05-.24-.36-.6-.57-.65a1 1 0 0 0-.28 0m9.37 7.25a14 14 0 0 0-2.12.8l-1.31.62c-1.49.74-3.2 1.34-3.8 1.34-.4 0-.84.18-.88.37-.04.2.4.6.82.76.38.15.48.15 1.83.11 1.22-.03 1.47-.02 1.67.07.33.16.42.43.31.93-.11.51-.74 1.77-1.25 2.5-.33.48-2.29 3.1-3.43 4.57-.4.53-.42.8-.07 1.15.45.45.39.49 2.8-1.94 2.26-2.27 2.45-2.42 2.55-2.01.07.24.08.2-.92 2.35a16 16 0 0 0-.57 1.25c-1.15 2.49-1.2 2.65-.86 3.08.12.15.2.18.47.18.18 0 .38-.04.44-.09s.4-.62.77-1.28c.63-1.15 1-1.82 1.32-2.37 1.17-2.04 1.16-2.03 1.38-2.03.13 0 .13.03.1.86-.05.76-.14 1.66-.4 3.75-.1.79-.1 1.45.02 1.6.14.19.63.24.85.1.23-.15.33-.53.6-2.12.55-3.38.7-4.02.91-4.22.14-.13.15-.13.3 0 .07.08.17.19.2.26.04.06.15.85.24 1.76.27 2.53.29 2.66.5 2.85q.35.3.7 0c.2-.17.2-.21.26-1.12.04-.52.05-1.54.03-2.28-.03-1.43.04-2.63.17-3.04l.49-1.21c.22-.52.54-1.36.7-1.87.5-1.55.47-2.8-.1-3.36a5 5 0 0 0-.8-.54 6 6 0 0 1-1.32-1c-.57-.54-.78-.68-1.04-.75a6 6 0 0 0-1.56-.03m5.5 2.06c-.04.08.02.32.12.58.23.58.28 1.1.18 1.78-.13.88-.12.98.06 1 .24.04.36-.24.45-1 .1-.85.01-1.49-.28-2.08-.2-.42-.45-.55-.54-.28m1.27.24c-.02.05.03.3.1.54.19.58.15 1.5-.08 2.2-.15.43-.15.48-.05.59.24.24.49-.1.65-.88a4 4 0 0 0-.17-2.4c-.1-.17-.4-.2-.45-.05m-19.45 6.03c-.14.15-.1.35.2.9.52.94 1.77 2.01 2.06 1.77.21-.17.13-.33-.3-.6a4 4 0 0 1-1.38-1.56c-.29-.55-.42-.67-.58-.5m-1 .45c-.11.13-.02.46.3 1.12.45.91 1.41 1.84 1.77 1.7.18-.07.14-.35-.09-.48a4 4 0 0 1-1.45-1.99q-.25-.68-.53-.35" />
                    </svg>
                </button>
            `;

            document.body.appendChild(container);

            container.querySelector('#btn-floating-acessibilidade')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.alternarMenu();
            });

            container.querySelector('#btn-floating-vlibras')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.abrirVLibras();
            });
        }

        // =====================================================================
        // MENU FLUTUANTE DE ACESSIBILIDADE (IMAGE 2)
        // =====================================================================

        _criarMenuFlutuante() {
            if (document.getElementById('hub-menu-acessibilidade')) return;

            const menu = document.createElement('div');
            menu.id = 'hub-menu-acessibilidade';
            menu.className = 'hidden fixed right-3 sm:right-5 bottom-24 sm:bottom-28 z-[1002] w-[calc(100vw-1.5rem)] max-w-sm bg-white dark:bg-[#0b1320] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 select-none transition-all';

            menu.innerHTML = `
                <!-- Cabeçalho (Padrão Image 2) -->
                <div class="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase text-blue-900 dark:text-blue-400 tracking-wider">
                            MENU DE ACESSIBILIDADE
                        </span>
                        <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                            Ajuste as opções de acessibilidade do site
                        </h2>
                    </div>
                    <button id="btn-fechar-menu-acess" type="button"
                        class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                        aria-label="Fechar menu de acessibilidade">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Lista de Itens do Menu -->
                <div class="py-3.5 space-y-4">

                    <!-- ITEM 1: Tamanho do Texto (Image 2: (-) Normal (+)) -->
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Tamanho do texto
                            </span>
                            <span class="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                Ajuste o tamanho do texto para melhorar a leitura.
                            </span>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button id="btn-fonte-diminuir" type="button"
                                class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                aria-label="Diminuir tamanho da fonte" title="Diminuir fonte">
                                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                            </button>
                            <span id="label-tamanho-fonte" class="text-xs font-semibold text-slate-800 dark:text-slate-200 px-1 min-w-[50px] text-center select-none">
                                Normal
                            </span>
                            <button id="btn-fonte-aumentar" type="button"
                                class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                aria-label="Aumentar tamanho da fonte" title="Aumentar fonte">
                                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"/>
                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- ITEM 2: Contraste (Image 2: Switch On/Off) -->
                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div class="min-w-0 flex-1">
                            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Contraste
                            </span>
                            <span class="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                Ative o contraste para facilitar a visualização da página.
                            </span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input id="toggle-alto-contraste" type="checkbox" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <!-- ITEM 3: Modo Daltônico (Filtros de Visão Cromática) -->
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Modo Daltônico
                            </span>
                            <span class="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase" id="badge-daltonismo-status">
                                Desativado
                            </span>
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            Adapte as cores para diferentes tipos de percepção visual.
                        </p>
                        <select id="select-modo-daltonico"
                            class="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                            <option value="padrao">Padrão (Sem filtro cromático)</option>
                            <option value="deuteranopia">Deuteranopia (Dificuldade com tons verdes)</option>
                            <option value="protanopia">Protanopia (Dificuldade com tons vermelhos)</option>
                            <option value="tritanopia">Tritanopia (Dificuldade com tons azuis/amarelos)</option>
                            <option value="acromatopsia">Acromatopsia (Escala monocromática)</option>
                        </select>
                    </div>

                    <!-- ITEM 4: Tema do Sistema (Claro / Escuro) -->
                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div class="min-w-0 flex-1">
                            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Tema da Interface
                            </span>
                            <span class="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                Alterne entre o tema Claro e o Modo Noturno.
                            </span>
                        </div>
                        <div class="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                            <button id="btn-tema-claro" type="button"
                                class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1">
                                ☀️ Claro
                            </button>
                            <button id="btn-tema-escuro" type="button"
                                class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1">
                                🌙 Escuro
                            </button>
                        </div>
                    </div>

                    <!-- ITEM 5: VLibras (Ativação Rápida de Língua de Sinais) -->
                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div class="min-w-0 flex-1">
                            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Tradutor em Libras
                            </span>
                            <span class="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                Ativar intérprete virtual 3D oficial (VLibras).
                            </span>
                        </div>
                        <button id="btn-menu-abrir-vlibras" type="button"
                            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer">
                            <span>Abrir VLibras</span>
                        </button>
                    </div>

                    <!-- ITEM 6: Recursos Visuais Extras (Destaque de Links & Leitura Fácil) -->
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2">
                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input id="toggle-destaque-links" type="checkbox" class="rounded text-blue-600 focus:ring-blue-500">
                            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">Destacar Links</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input id="toggle-fonte-legivel" type="checkbox" class="rounded text-blue-600 focus:ring-blue-500">
                            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">Leitura Fácil</span>
                        </label>
                    </div>

                </div>

                <!-- Rodapé do Menu (Restaurar Padrões) -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span class="text-[10px] text-slate-400 font-medium">HUB ES+ • Acessibilidade</span>
                    <button id="btn-restaurar-acess" type="button"
                        class="text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        <span>Restaurar Padrões</span>
                    </button>
                </div>
            `;

            document.body.appendChild(menu);
            this._vincularEventosMenu(menu);
        }

        _vincularEventosMenu(menu) {
            // Fechar Menu
            menu.querySelector('#btn-fechar-menu-acess')?.addEventListener('click', () => this.fecharMenu());

            // Tamanho da Fonte
            menu.querySelector('#btn-fonte-diminuir')?.addEventListener('click', () => this.diminuirFonte());
            menu.querySelector('#btn-fonte-aumentar')?.addEventListener('click', () => this.aumentarFonte());

            // Alto Contraste
            const toggleContraste = menu.querySelector('#toggle-alto-contraste');
            toggleContraste?.addEventListener('change', (e) => this.setAltoContraste(e.target.checked));

            // Modo Daltônico
            const selectDaltonico = menu.querySelector('#select-modo-daltonico');
            selectDaltonico?.addEventListener('change', (e) => this.setModoDaltonico(e.target.value));

            // Tema Claro / Escuro
            const btnClaro = menu.querySelector('#btn-tema-claro');
            const btnEscuro = menu.querySelector('#btn-tema-escuro');
            btnClaro?.addEventListener('click', () => {
                if (window.Tema) window.Tema.aplicarTema('claro');
                this._sincronizarBotoesTema();
            });
            btnEscuro?.addEventListener('click', () => {
                if (window.Tema) window.Tema.aplicarTema('escuro');
                this._sincronizarBotoesTema();
            });

            // Abrir VLibras
            menu.querySelector('#btn-menu-abrir-vlibras')?.addEventListener('click', () => {
                this.abrirVLibras();
                this.fecharMenu();
            });

            // Extras
            menu.querySelector('#toggle-destaque-links')?.addEventListener('change', (e) => this.setDestaqueLinks(e.target.checked));
            menu.querySelector('#toggle-fonte-legivel')?.addEventListener('change', (e) => this.setFonteLegivel(e.target.checked));

            // Restaurar Padrões
            menu.querySelector('#btn-restaurar-acess')?.addEventListener('click', () => this.restaurarPadroes());
        }

        _sincronizarBotoesTema() {
            const menu = document.getElementById('hub-menu-acessibilidade');
            if (!menu) return;
            const temaAtual = window.Tema ? window.Tema.getTemaAtual() : (document.documentElement.classList.contains('dark') ? 'escuro' : 'claro');
            const btnClaro = menu.querySelector('#btn-tema-claro');
            const btnEscuro = menu.querySelector('#btn-tema-escuro');

            if (btnClaro && btnEscuro) {
                if (temaAtual === 'escuro') {
                    btnEscuro.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm flex items-center gap-1';
                    btnClaro.className = 'px-2.5 py-1 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1';
                } else {
                    btnClaro.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-slate-900 shadow-sm flex items-center gap-1';
                    btnEscuro.className = 'px-2.5 py-1 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1';
                }
            }
        }

        _sincronizarUI() {
            const menu = document.getElementById('hub-menu-acessibilidade');
            if (!menu) return;

            // Rótulo da fonte
            const labelFonte = menu.querySelector('#label-tamanho-fonte');
            const btnMenos = menu.querySelector('#btn-fonte-diminuir');
            const btnMais = menu.querySelector('#btn-fonte-aumentar');
            const mapaNomes = { normal: 'Normal', medio: 'Médio', grande: 'Grande' };

            if (labelFonte) labelFonte.textContent = mapaNomes[this.config.tamanhoFonte] || 'Normal';
            if (btnMenos) btnMenos.disabled = this.config.tamanhoFonte === 'normal';
            if (btnMais) btnMais.disabled = this.config.tamanhoFonte === 'grande';

            // Toggle contraste
            const toggleContraste = menu.querySelector('#toggle-alto-contraste');
            if (toggleContraste) toggleContraste.checked = this.config.altoContraste;

            // Select daltonismo
            const selectDaltonico = menu.querySelector('#select-modo-daltonico');
            if (selectDaltonico) selectDaltonico.value = this.config.daltonismo;

            const badgeDaltonismo = menu.querySelector('#badge-daltonismo-status');
            if (badgeDaltonismo) {
                badgeDaltonismo.textContent = this.config.daltonismo === 'padrao' ? 'Desativado' : 'Ativado';
            }

            // Extras
            const toggleDestaque = menu.querySelector('#toggle-destaque-links');
            if (toggleDestaque) toggleDestaque.checked = this.config.destaqueLinks;

            const toggleLegivel = menu.querySelector('#toggle-fonte-legivel');
            if (toggleLegivel) toggleLegivel.checked = this.config.fonteLegivel;

            this._sincronizarBotoesTema();
        }

        abrirMenu() {
            const menu = document.getElementById('hub-menu-acessibilidade');
            if (menu) {
                this._sincronizarUI();
                menu.classList.remove('hidden');
                this.menuAberto = true;
            }
        }

        fecharMenu() {
            const menu = document.getElementById('hub-menu-acessibilidade');
            if (menu) {
                menu.classList.add('hidden');
                this.menuAberto = false;
            }
        }

        alternarMenu() {
            if (this.menuAberto) {
                this.fecharMenu();
            } else {
                this.abrirMenu();
            }
        }

        _escutarEventosGlobais() {
            // Fecha o menu ao clicar fora dele
            document.addEventListener('click', (e) => {
                if (!this.menuAberto) return;
                const menu = document.getElementById('hub-menu-acessibilidade');
                const btnFloating = document.getElementById('btn-floating-acessibilidade');
                if (menu && !menu.contains(e.target) && (!btnFloating || !btnFloating.contains(e.target))) {
                    this.fecharMenu();
                }
            });

            // Fecha no ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.menuAberto) {
                    this.fecharMenu();
                }
            });
        }

        // =====================================================================
        // MODAL / ETAPA DE PREFERÊNCIAS PÓS-LOGIN
        // (Solicitado: Escolha de tema e acessibilidade antes de entrar no site)
        // =====================================================================

        /**
         * Exibe a tela de configuração de preferências e acessibilidade pós-login.
         * O usuário define tema (dark/light), tamanho das letras e daltonismo/contraste
         * antes de ir para a página do sistema.
         */
        mostrarModalPosLogin(usuario, callbackConcluir) {
            let container = document.getElementById('modal-acessibilidade-pos-login');
            if (!container) {
                container = document.createElement('div');
                container.id = 'modal-acessibilidade-pos-login';
                container.className = 'fixed inset-0 z-[1003] bg-hub-navy/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';
                document.body.appendChild(container);
            }

            const primeiroNome = (usuario?.nome || 'Colaborador').split(' ')[0];
            const temaAtual = window.Tema ? window.Tema.getTemaAtual() : 'claro';

            container.innerHTML = `
                <div class="w-full max-w-lg bg-white dark:bg-[#0b1320] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 border border-slate-200/90 dark:border-slate-800 transition-all text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
                    
                    <!-- Topo de Boas-vindas -->
                    <div class="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            ES+
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                                    Login Autorizado
                                </span>
                                <span class="text-[10px] text-slate-400 font-medium">Acessibilidade Inicial</span>
                            </div>
                            <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                                Olá, ${primeiroNome}! Personalize sua Visualização
                            </h2>
                        </div>
                    </div>

                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Antes de acessar a plataforma, defina suas preferências de <strong>tema</strong> e <strong>acessibilidade</strong>. Você poderá alterá-las a qualquer momento pelas janelas flutuantes fixas no canto da tela.
                    </p>

                    <!-- SEÇÃO 1: Escolha do Tema (Dark ou Light) -->
                    <div class="mb-5">
                        <label class="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                            1. Tema da Interface (Claro ou Escuro)
                        </label>
                        <div class="grid grid-cols-2 gap-3" id="poslogin-selecao-tema">
                            <!-- Card Tema Claro -->
                            <button type="button" data-tema-val="claro"
                                class="p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer text-center ${temaAtual === 'claro' ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'}">
                                <span class="text-2xl">☀️</span>
                                <div>
                                    <span class="block text-xs font-extrabold">Modo Claro</span>
                                    <span class="block text-[10px] text-slate-400 mt-0.5">Fundo branco e alto brilho</span>
                                </div>
                            </button>
                            <!-- Card Tema Escuro -->
                            <button type="button" data-tema-val="escuro"
                                class="p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer text-center ${temaAtual === 'escuro' ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'}">
                                <span class="text-2xl">🌙</span>
                                <div>
                                    <span class="block text-xs font-extrabold">Modo Noturno</span>
                                    <span class="block text-[10px] text-slate-400 mt-0.5">Fundo escuro e conforto visual</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- SEÇÃO 2: Tamanho das Letras (3 Tamanhos) -->
                    <div class="mb-5">
                        <label class="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                            2. Tamanho das Letras (Tipografia)
                        </label>
                        <div class="grid grid-cols-3 gap-2" id="poslogin-selecao-fonte">
                            <button type="button" data-fonte-val="normal"
                                class="py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${this.config.tamanhoFonte === 'normal' ? 'border-blue-600 bg-blue-600 text-white font-black shadow-md' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'}">
                                <span class="block text-sm">A</span>
                                <span class="block text-[10px] mt-0.5">Normal</span>
                            </button>
                            <button type="button" data-fonte-val="medio"
                                class="py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${this.config.tamanhoFonte === 'medio' ? 'border-blue-600 bg-blue-600 text-white font-black shadow-md' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'}">
                                <span class="block text-base">A+</span>
                                <span class="block text-[10px] mt-0.5">Médio</span>
                            </button>
                            <button type="button" data-fonte-val="grande"
                                class="py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${this.config.tamanhoFonte === 'grande' ? 'border-blue-600 bg-blue-600 text-white font-black shadow-md' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'}">
                                <span class="block text-lg">A++</span>
                                <span class="block text-[10px] mt-0.5">Grande</span>
                            </button>
                        </div>
                    </div>

                    <!-- SEÇÃO 3: Visual & Daltonismo -->
                    <div class="mb-5 space-y-3 bg-slate-50 dark:bg-slate-850/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="block text-xs font-bold text-slate-900 dark:text-slate-100">Alto Contraste</span>
                                <span class="block text-[10px] text-slate-400">Realça bordas e texto</span>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input id="poslogin-toggle-contraste" type="checkbox" class="sr-only peer" ${this.config.altoContraste ? 'checked' : ''}>
                                <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <label class="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                                Modo Daltônico
                            </label>
                            <select id="poslogin-select-daltonismo"
                                class="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="padrao" ${this.config.daltonismo === 'padrao' ? 'selected' : ''}>Padrão (Sem filtro cromático)</option>
                                <option value="deuteranopia" ${this.config.daltonismo === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Tons verdes)</option>
                                <option value="protanopia" ${this.config.daltonismo === 'protanopia' ? 'selected' : ''}>Protanopia (Tons vermelhos)</option>
                                <option value="tritanopia" ${this.config.daltonismo === 'tritanopia' ? 'selected' : ''}>Tritanopia (Tons azuis/amarelos)</option>
                                <option value="acromatopsia" ${this.config.daltonismo === 'acromatopsia' ? 'selected' : ''}>Acromatopsia (Monocromático)</option>
                            </select>
                        </div>
                    </div>

                    <!-- SEÇÃO 4: VLibras (Opção Rápida) -->
                    <div class="mb-6 flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 40 40" fill="none" class="w-5 h-5">
                                    <path fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd" d="M14.35 8a1 1 0 0 0-.38.24c-.22.21-.22.21-.17.72l.11 1.35c.3 3.62.34 4.7.21 4.78-.21.14-.33-.06-2.35-3.97-.69-1.33-.82-1.48-1.24-1.34-.68.23-.63.57.45 2.9l.26.58c0 .01.12.3.27.61.8 1.76 1.01 2.47.75 2.57-.18.07-.51-.1-.78-.42-.14-.16-.3-.36-.38-.43a19 19 0 0 1-.78-.95l-.72-.86a7 7 0 0 0-.8-.86c-.34-.13-.8.13-.8.46 0 .29.7 1.44 2.13 3.56.9 1.33 1.11 1.8 1.32 2.97q.64 3.7 1.78 4.6c.51.4.53.4 1.75.35l1.11-.04.85-1.14.93-1.23c.33-.43 1.17-1.92 1.17-2.07 0-.02-.44-.02-.97 0q-.98.05-1.43-.04c-.52-.1-1.18-.4-1.55-.7a1.55 1.55 0 0 1-.38-1.94c.27-.45.64-.65 1.41-.74.63-.08 1.3-.26 2.27-.62l.51-.19v-.82c0-.84.16-3.78.29-5.16.1-1.09.1-1.08-.17-1.34-.19-.19-.3-.24-.5-.24-.5 0-.52.07-1.02 2.57l-.54 2.8c-.12.68-.21.93-.37 1-.2.07-.39-.25-.48-.82l-.27-1.68c-.19-1.19-.56-3.4-.64-3.8-.05-.24-.36-.6-.57-.65a1 1 0 0 0-.28 0m9.37 7.25a14 14 0 0 0-2.12.8l-1.31.62c-1.49.74-3.2 1.34-3.8 1.34-.4 0-.84.18-.88.37-.04.2.4.6.82.76.38.15.48.15 1.83.11 1.22-.03 1.47-.02 1.67.07.33.16.42.43.31.93-.11.51-.74 1.77-1.25 2.5-.33.48-2.29 3.1-3.43 4.57-.4.53-.42.8-.07 1.15.45.45.39.49 2.8-1.94 2.26-2.27 2.45-2.42 2.55-2.01.07.24.08.2-.92 2.35a16 16 0 0 0-.57 1.25c-1.15 2.49-1.2 2.65-.86 3.08.12.15.2.18.47.18.18 0 .38-.04.44-.09s.4-.62.77-1.28c.63-1.15 1-1.82 1.32-2.37 1.17-2.04 1.16-2.03 1.38-2.03.13 0 .13.03.1.86-.05.76-.14 1.66-.4 3.75-.1.79-.1 1.45.02 1.6.14.19.63.24.85.1.23-.15.33-.53.6-2.12.55-3.38.7-4.02.91-4.22.14-.13.15-.13.3 0 .07.08.17.19.2.26.04.06.15.85.24 1.76.27 2.53.29 2.66.5 2.85q.35.3.7 0c.2-.17.2-.21.26-1.12.04-.52.05-1.54.03-2.28-.03-1.43.04-2.63.17-3.04l.49-1.21c.22-.52.54-1.36.7-1.87.5-1.55.47-2.8-.1-3.36a5 5 0 0 0-.8-.54 6 6 0 0 1-1.32-1c-.57-.54-.78-.68-1.04-.75a6 6 0 0 0-1.56-.03" />
                                </svg>
                            </div>
                            <div>
                                <span class="block text-xs font-bold text-slate-900 dark:text-slate-100">Ativar VLibras</span>
                                <span class="block text-[10px] text-slate-400">Intérprete 3D de Língua de Sinais</span>
                            </div>
                        </div>
                        <button id="poslogin-btn-vlibras" type="button"
                            class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                            Testar VLibras
                        </button>
                    </div>

                    <!-- Botões de Conclusão -->
                    <div class="space-y-2">
                        <button type="button" id="poslogin-btn-salvar-entrar"
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer">
                            <span>Salvar e Acessar o HUB ES+</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                            </svg>
                        </button>

                        <button type="button" id="poslogin-btn-pular"
                            class="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-center cursor-pointer">
                            Pular e Usar Configurações Atuais
                        </button>
                    </div>

                </div>
            `;

            container.classList.remove('hidden');

            // ── Eventos dos Seletores no Modal ──

            // 1. Alternância de tema com preview ao vivo
            const btnsTema = container.querySelectorAll('#poslogin-selecao-tema button');
            btnsTema.forEach(btn => {
                btn.addEventListener('click', () => {
                    const temaEscolhido = btn.getAttribute('data-tema-val');
                    if (window.Tema) {
                        window.Tema.aplicarTema(temaEscolhido);
                    }
                    btnsTema.forEach(b => {
                        const ativo = b.getAttribute('data-tema-val') === temaEscolhido;
                        b.className = `p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer text-center ${ativo ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'}`;
                    });
                });
            });

            // 2. Alternância do tamanho de fonte com preview ao vivo
            const btnsFonte = container.querySelectorAll('#poslogin-selecao-fonte button');
            btnsFonte.forEach(btn => {
                btn.addEventListener('click', () => {
                    const fonteEscolhida = btn.getAttribute('data-fonte-val');
                    this.setTamanhoFonte(fonteEscolhida, true);
                    btnsFonte.forEach(b => {
                        const ativo = b.getAttribute('data-fonte-val') === fonteEscolhida;
                        b.className = `py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${ativo ? 'border-blue-600 bg-blue-600 text-white font-black shadow-md' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'}`;
                    });
                });
            });

            // 3. Alto Contraste ao vivo
            container.querySelector('#poslogin-toggle-contraste')?.addEventListener('change', (e) => {
                this.setAltoContraste(e.target.checked, true);
            });

            // 4. Modo Daltônico ao vivo
            container.querySelector('#poslogin-select-daltonismo')?.addEventListener('change', (e) => {
                this.setModoDaltonico(e.target.value, true);
            });

            // 5. Testar VLibras
            container.querySelector('#poslogin-btn-vlibras')?.addEventListener('click', () => {
                this.abrirVLibras();
            });

            // 6. Botões de Concluir
            const concluir = () => {
                container.classList.add('hidden');
                container.remove();
                if (typeof callbackConcluir === 'function') {
                    callbackConcluir();
                }
            };

            container.querySelector('#poslogin-btn-salvar-entrar')?.addEventListener('click', () => {
                this._salvarConfig();
                concluir();
            });

            container.querySelector('#poslogin-btn-pular')?.addEventListener('click', () => {
                concluir();
            });
        }
    }

    // Instanciação Global
    window.Acessibilidade = new GerenciadorAcessibilidade();

    // Inicia assim que o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.Acessibilidade.init());
    } else {
        window.Acessibilidade.init();
    }
})();
