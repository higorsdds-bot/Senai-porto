/**
 * HUB ES+ - Módulo de Autenticação (Frontend)
 * Tela de login, solicitação de cadastro (status PENDENTE), sessão JWT, heartbeat e verificação de Admin.
 * Suporta modo VISITANTE: acesso público sem login a comunicados e agenda.
 */

class AuthManager {
    constructor() {
        this.usuario = null;
        this.permissoes = [];
        this.modulos = [];
        this.permissionsReady = false;
        this._heartbeatInterval = null;
        this._modoVisitante = false;
    }

    getToken() {
        return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(CONFIG.STORAGE_TOKEN))
            || (typeof localStorage !== 'undefined' && localStorage.getItem(CONFIG.STORAGE_TOKEN))
            || null;
    }

    getUsuario() {
        if (!this.usuario) {
            // Prioridade primária: sessionStorage (isolamento individual por aba)
            // Fallback: localStorage (persistência entre reinicializações do navegador)
            const raw = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(CONFIG.STORAGE_USUARIO))
                || (typeof localStorage !== 'undefined' && localStorage.getItem(CONFIG.STORAGE_USUARIO));
            if (raw) {
                try {
                    this.usuario = JSON.parse(raw);
                    this.permissoes = Array.isArray(this.usuario?.permissoes) ? this.usuario.permissoes : [];
                    this.modulos = Array.isArray(this.usuario?.modulos) ? this.usuario.modulos : [];
                    this.permissionsReady = Array.isArray(this.usuario?.permissoes);

                    // Sincroniza para o sessionStorage da aba atual caso tenha vindo do fallback
                    if (typeof sessionStorage !== 'undefined') {
                        if (!sessionStorage.getItem(CONFIG.STORAGE_TOKEN)) {
                            const t = localStorage.getItem(CONFIG.STORAGE_TOKEN);
                            if (t) sessionStorage.setItem(CONFIG.STORAGE_TOKEN, t);
                        }
                        if (!sessionStorage.getItem(CONFIG.STORAGE_USUARIO)) {
                            sessionStorage.setItem(CONFIG.STORAGE_USUARIO, raw);
                        }
                    }
                } catch { this.usuario = null; }
            }
        }
        return this.usuario;
    }

    /** Alias de compatibilidade para getUsuario */
    getUser() {
        return this.getUsuario();
    }

    estaLogado() {
        return !!this.getToken();
    }

    /** Verifica se é visitante (modo anônimo público ou perfil VISITANTE no banco) */
    isVisitante() {
        const u = this.getUsuario();
        const p = u && u.perfil ? String(u.perfil).toUpperCase().trim() : '';
        if (p === 'VISITANTE') return true;
        if (this._modoVisitante) return true;
        return !this.estaLogado();
    }

    isAdmin() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase();
        return p === 'ADMIN' || p === 'ADMINISTRADOR';
    }

    /** Verifica se é o Administrador Geral (autoridade máxima institucional) */
    isAdminGeral() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return p === 'ADMIN' || p === 'ADMIN_GERAL';
    }

    isGestorRH() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return this.isAdmin() || p === 'GESTOR_RH';
    }

    isGestorInfra() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return this.isAdmin() || p === 'GESTOR_INFRA';
    }

    isGestorOperador() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return this.isAdmin() || p === 'GESTOR_OPERADOR';
    }

    isTecnico() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return this.isAdmin() || p.startsWith('TECNICO') || p === 'GESTOR_INFRA';
    }

    isRH() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase().trim();
        return this.isAdmin() || p.includes('RH');
    }

    hasPermission(chave) {
        // Visitante público: só pode ver comunicados e eventos
        if (this.isVisitante()) {
            return chave === 'comunicados.visualizar' || chave === 'eventos.visualizar';
        }
        return this.isAdmin() || this.permissoes.includes(chave);
    }

    hasAnyPermission(chaves = []) {
        if (this.isVisitante()) {
            return chaves.some(c => c === 'comunicados.visualizar' || c === 'eventos.visualizar');
        }
        return this.isAdmin() || chaves.some(chave => this.permissoes.includes(chave));
    }

    canAccessModule(moduleName, permissionKeys = []) {
        if (this.isVisitante()) {
            return moduleName === 'comunicacao' || moduleName === 'agenda';
        }
        if (this.isAdmin()) return true;
        if (this.modulos.length > 0) return this.modulos.includes(moduleName);
        return this.hasAnyPermission(permissionKeys);
    }

    getUserStorageKey(prefix) {
        const u = this.getUsuario();
        if (!u) return `${prefix}_guest`;
        const perfil = String(u.perfil || 'perfil').toLowerCase().trim();
        const id = u.id || 'anon';
        return `${prefix}_${perfil}_${id}`;
    }

    /** Ativa o modo visitante público: exibe o app sem login */
    entrarComoVisitante() {
        this._modoVisitante = true;
        this.permissionsReady = true;
        this.ocultarTelaLogin();
        this._atualizarUIVisitante();
        window.App?.atualizarVisibilidadeRotas();
        // Redireciona para comunicados (página inicial do visitante)
        window.location.hash = '#comunicacao';
        window.App?.handleRoute();
    }

    /** Atualiza a topbar e sidebar para modo visitante */
    _atualizarUIVisitante() {
        // Esconde elementos que não fazem sentido para visitante
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

        // Atualiza info do usuário na topbar para mostrar "Visitante"
        document.querySelectorAll('[data-usuario-nome]').forEach(el => el.textContent = 'Visitante');
        document.querySelectorAll('[data-usuario-primeiro-nome]').forEach(el => el.textContent = 'Visitante');
        document.querySelectorAll('[data-usuario-iniciais]').forEach(el => el.textContent = 'V');
        document.querySelectorAll('[data-usuario-email]').forEach(el => el.textContent = 'Acesso público');
        document.querySelectorAll('[data-usuario-perfil]').forEach(el => el.textContent = 'Visitante');

        // Mostra o botão de login na topbar
        this._criarBotaoLoginTopbar();
    }

    /** Cria botão "Fazer Login" na topbar para visitantes */
    _criarBotaoLoginTopbar() {
        // Remove botão anterior se existir
        document.getElementById('btn-visitante-login')?.remove();

        // Esconde o botão de logout se existir
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.classList.add('hidden');

        // Insere botão de login ao lado das notificações
        const topbarRight = document.querySelector('.topbar-right') || document.querySelector('header .flex.items-center.gap-2');
        if (!topbarRight) return;

        const btn = document.createElement('button');
        btn.id = 'btn-visitante-login';
        btn.className = 'inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all';
        btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i><span>Fazer Login</span>';
        btn.addEventListener('click', () => {
            this._modoVisitante = false;
            this.renderizarTelaLogin();
        });
        topbarRight.prepend(btn);
        if (window.lucide) lucide.createIcons();
    }

    /** Remove o botão de login da topbar (quando o usuário faz login) */
    _removerBotaoLoginTopbar() {
        document.getElementById('btn-visitante-login')?.remove();
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.classList.remove('hidden');
    }

    async login(email, senha) {
        const res = await window.API.login(email, senha);
        if (res?.success && res.data?.token) {
            const usuario = {
                ...res.data.usuario,
                permissoes: res.data.permissoes || [],
                modulos: res.data.modulos || []
            };
            // Isola a sessão ativamente nesta aba via sessionStorage
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(CONFIG.STORAGE_TOKEN, res.data.token);
                sessionStorage.setItem(CONFIG.STORAGE_USUARIO, JSON.stringify(usuario));
            }
            // Mantém no localStorage como fallback global de persistência
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(CONFIG.STORAGE_TOKEN, res.data.token);
                localStorage.setItem(CONFIG.STORAGE_USUARIO, JSON.stringify(usuario));
            }
            this.usuario = usuario;
            this.permissoes = usuario.permissoes;
            this.modulos = usuario.modulos;
            this.permissionsReady = true;
            this._modoVisitante = false;
            this.iniciarHeartbeat();
            this._removerBotaoLoginTopbar();

            // Atualiza imediatamente o badge de notificações para o perfil logado
            if (window.App && typeof window.App.atualizarBadgeComunicados === 'function') {
                window.App.atualizarBadgeComunicados();
            }

            return res.data;
        }
        throw new Error(res?.message || 'Falha no login.');
    }

    async logout() {
        this.pararHeartbeat();
        try { await window.API.logout(); } catch (_) { }
        this.forcarLogout();
    }

    forcarLogout() {
        this.pararHeartbeat();
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(CONFIG.STORAGE_TOKEN);
            sessionStorage.removeItem(CONFIG.STORAGE_USUARIO);
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(CONFIG.STORAGE_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_USUARIO);
        }
        this.usuario = null;
        this.permissoes = [];
        this.modulos = [];
        this.permissionsReady = false;

        // Limpa badge do sino na tela de login
        const badge = document.getElementById('badge-topbar-notifications');
        if (badge) {
            badge.classList.add('hidden');
            badge.classList.remove('animate-pulse');
        }

        // Volta para modo visitante ao invés de forçar tela de login
        this.entrarComoVisitante();
    }

    iniciarHeartbeat() {
        this.pararHeartbeat();
        // Heartbeat inicial
        window.API.heartbeat();
        // A cada 60 segundos
        this._heartbeatInterval = setInterval(() => {
            if (this.estaLogado()) {
                window.API.heartbeat();
            } else {
                this.pararHeartbeat();
            }
        }, 60000);
    }

    pararHeartbeat() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }

    /** Guard: verifica autenticação ou ativa modo visitante */
    exigirAutenticacao() {
        // Verifica se a URL contém token de ativação de conta
        const tokenAtivacao = this.verificarRotaAtivacao();
        if (tokenAtivacao) {
            this.mostrarTelaAtivacao(tokenAtivacao);
            return false;
        }

        if (this.estaLogado()) {
            this.ocultarTelaLogin();
            this.preencherInfoUsuario();
            this.iniciarHeartbeat();
            this._atualizarPermissoes();
            this.atualizarVisibilidadeAdmin();
            return true;
        }
        // Sem login: entra diretamente como visitante
        this.entrarComoVisitante();
        return false;
    }

    verificarRotaAtivacao() {
        const hash = window.location.hash || '';
        if (hash.toLowerCase().includes('ativar-conta')) {
            if (hash.includes('token=')) {
                const raw = hash.split('token=')[1];
                return raw.split('&')[0].trim();
            }
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('token')?.trim() || '';
        }
        return null;
    }

    async _atualizarPermissoes() {
        try {
            const session = await window.API.me();
            if (!session?.usuario) throw new Error('Resposta de sessão inválida.');
            this.permissoes = Array.isArray(session.permissoes) ? session.permissoes : [];
            this.modulos = Array.isArray(session.modulos) ? session.modulos : [];
            this.usuario = { ...session.usuario, permissoes: this.permissoes, modulos: this.modulos };
            this.permissionsReady = true;
            const usuarioSerializado = JSON.stringify(this.usuario);
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(CONFIG.STORAGE_USUARIO, usuarioSerializado);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(CONFIG.STORAGE_USUARIO, usuarioSerializado);
            }
            this.preencherInfoUsuario();
            window.App?.handleRoute();
        } catch (err) {
            console.error('[AUTH] Não foi possível atualizar as permissões da sessão:', err.message);
            if (!this.estaLogado()) return;
            this.permissionsReady = true;
            window.App?.handleRoute();
        }
    }

    preencherInfoUsuario() {
        const u = this.getUsuario();
        if (!u) return;
        document.querySelectorAll('[data-usuario-nome]').forEach(el => el.textContent = u.nome);
        document.querySelectorAll('[data-usuario-email]').forEach(el => el.textContent = u.email);
        
        const partes = (u.nome || '').trim().split(/\s+/);
        const primeiroNome = partes[0] || 'Usuário';
        document.querySelectorAll('[data-usuario-primeiro-nome]').forEach(el => el.textContent = primeiroNome);
        
        const iniciais = partes.length >= 2
            ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
            : (partes[0] ? partes[0].slice(0, 2).toUpperCase() : 'HB');
        document.querySelectorAll('[data-usuario-iniciais]').forEach(el => el.textContent = iniciais);

        const nomesPerfil = {
            ADMIN: 'Super Administrador (Admin)',
            ADMINISTRADOR: 'Administrador Institucional',
            ADMINISTRACAO: 'Administração',
            GESTOR_RH: 'Gestor de Recursos Humanos',
            GESTOR_INFRA: 'Gestor de Infra & TI',
            GESTOR_OPERADOR: 'Gestor Operacional',
            GESTOR: 'Gestor Geral',
            ANALISTA_RH: 'Analista de RH',
            RH: 'Recursos Humanos',
            TECNICO_N3: 'Técnico N3 (Avançado)',
            TECNICO_N2: 'Técnico N2 (Hardware/Redes)',
            TECNICO_N1: 'Técnico N1 (Helpdesk)',
            TECNICO: 'Técnico',
            OPERADOR: 'Operador',
            LIMPEZA: 'Limpeza',
            VISITANTE: 'Visitante'
        };
        document.querySelectorAll('[data-usuario-perfil]').forEach(el => {
            el.textContent = nomesPerfil[String(u.perfil || '').toUpperCase()] || u.perfil || '';
        });
        this._removerBotaoLoginTopbar();
        this.atualizarVisibilidadeAdmin();
    }

    atualizarVisibilidadeAdmin() {
        const admin = this.isAdmin() || this.hasPermission('auditoria.visualizar');
        document.querySelectorAll('.admin-only').forEach(el => {
            if (admin) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
        window.App?.atualizarVisibilidadeRotas();
    }

    ocultarTelaLogin() {
        document.getElementById('tela-login')?.classList.add('hidden');
        document.getElementById('app-conteudo')?.classList.remove('hidden');
    }

    renderizarTelaLogin() {
        let tela = document.getElementById('tela-login');
        if (!tela) {
            tela = document.createElement('div');
            tela.id = 'tela-login';
            tela.className = 'fixed inset-0 z-[999] bg-hub-navy/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
            tela.innerHTML = `
        <div class="w-full max-w-md bg-white rounded-3xl shadow-hub-lg p-6 sm:p-8 my-8 border border-slate-100 transition-all">
          <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-blue-600/30 mb-3">ES+</div>
            <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">HUB ES+</h1>
            <p class="text-xs text-slate-400 font-semibold mt-1">Plataforma Administrativa Integrada</p>
          </div>

          <!-- ABAS DE NAVEGAÇÃO: ENTRAR / SOLICITAR ACESSO -->
          <div class="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button type="button" id="tab-login"
              class="flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm">
              Entrar
            </button>
            <button type="button" id="tab-cadastro"
              class="flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800">
              Solicitar Acesso
            </button>
          </div>

          <!-- MENSAGEM DE ALERTA GLOBAL -->
          <div id="login-feedback" class="hidden mb-4 text-xs font-semibold rounded-xl px-4 py-3"></div>

          <!-- FORMULÁRIO 1: LOGIN -->
          <form id="form-login" class="space-y-4" novalidate>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">E-mail</label>
              <input id="login-email" type="email" required autocomplete="username"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                placeholder="seu.email@secult.es.gov.br">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Senha</label>
              <input id="login-senha" type="password" required autocomplete="current-password"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                placeholder="••••••••">
            </div>
            <button type="submit" id="btn-login"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
              Entrar no Sistema
            </button>
          </form>

          <!-- FORMULÁRIO 2: SOLICITAÇÃO DE CADASTRO (STATUS PENDENTE) -->
          <form id="form-cadastro" class="space-y-4 hidden" novalidate>
            <div class="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
              <i data-lucide="mail-check" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5"></i>
              <div>
                <strong class="text-blue-900 block font-bold mb-0.5">Ativação Segura via E-mail</strong>
                Preencha seus dados abaixo. Após a análise do Administrador Geral, você receberá um <strong>link seguro no seu e-mail</strong> para criar sua senha confidencial e ativar seu acesso.
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">Nome Completo *</label>
              <input id="cad-nome" type="text" required minlength="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Seu nome completo">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">E-mail Institucional *</label>
              <input id="cad-email" type="email" required
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="seu.email@dominio.com">
            </div>
            <button type="submit" id="btn-solicitar"
              class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              Enviar Solicitação de Cadastro
            </button>
          </form>

          <!-- BOTÃO VOLTAR AO MODO VISITANTE -->
          <button type="button" id="btn-voltar-visitante"
            class="w-full mt-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            Continuar como Visitante
          </button>

          <div class="mt-6 pt-4 border-t border-slate-100 text-center">
            <span class="text-[11px] text-slate-400">HUB ES+ • Segurança e Governança Integrada</span>
          </div>
        </div>`;
            document.body.appendChild(tela);

            // Alternância entre Login e Solicitar Cadastro
            const tabLogin = tela.querySelector('#tab-login');
            const tabCadastro = tela.querySelector('#tab-cadastro');
            const formLogin = tela.querySelector('#form-login');
            const formCadastro = tela.querySelector('#form-cadastro');
            const feedbackEl = tela.querySelector('#login-feedback');

            const mostrarFeedback = (msg, tipo = 'erro') => {
                feedbackEl.textContent = msg;
                feedbackEl.className = 'mb-4 text-xs font-semibold rounded-xl px-4 py-3 leading-relaxed ' + (
                    tipo === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : tipo === 'aviso'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                );
                feedbackEl.classList.remove('hidden');
            };

            const limparFeedback = () => feedbackEl.classList.add('hidden');

            tabLogin.addEventListener('click', () => {
                limparFeedback();
                tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm';
                tabCadastro.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800';
                formLogin.classList.remove('hidden');
                formCadastro.classList.add('hidden');
            });

            tabCadastro.addEventListener('click', () => {
                limparFeedback();
                tabCadastro.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm';
                tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800';
                formCadastro.classList.remove('hidden');
                formLogin.classList.add('hidden');
            });

            // Submit: Formulário de Login
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                limparFeedback();
                const email = tela.querySelector('#login-email').value.trim();
                const senha = tela.querySelector('#login-senha').value;
                const btn = tela.querySelector('#btn-login');

                if (!email || !senha) {
                    mostrarFeedback('Preencha o e-mail e a senha.');
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Autenticando...';
                try {
                    await this.login(email, senha);
                    this.ocultarTelaLogin();
                    this.preencherInfoUsuario();
                    window.dispatchEvent(new Event('hub:login'));
                    if (window.lucide) lucide.createIcons();
                } catch (err) {
                    const msg = err.message || 'Credenciais inválidas.';
                    if (msg.toLowerCase().includes('pendente')) {
                        mostrarFeedback(msg, 'aviso');
                    } else {
                        mostrarFeedback(msg, 'erro');
                    }
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Entrar no Sistema';
                }
            });

            // Submit: Solicitação de Cadastro
            formCadastro.addEventListener('submit', async (e) => {
                e.preventDefault();
                limparFeedback();
                const nome = tela.querySelector('#cad-nome').value.trim();
                const email = tela.querySelector('#cad-email').value.trim();
                const btn = tela.querySelector('#btn-solicitar');

                if (!nome || nome.length < 3) {
                    mostrarFeedback('Nome precisa ter no mínimo 3 caracteres.');
                    return;
                }
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    mostrarFeedback('Por favor, informe um e-mail válido.');
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Enviando Solicitação...';
                try {
                    const res = await window.API.solicitarCadastro({ nome, email });
                    formCadastro.reset();
                    mostrarFeedback(
                        res?.message || 'Solicitação enviada com sucesso! Aguarde a notificação por e-mail após a aprovação do Administrador.',
                        'sucesso'
                    );
                    // Alterna para a aba de login após 3.5 segundos
                    setTimeout(() => tabLogin.click(), 3500);
                } catch (err) {
                    mostrarFeedback(err.message || 'Erro ao enviar solicitação de cadastro.', 'erro');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Enviar Solicitação de Cadastro';
                }
            });

            // Botão "Continuar como Visitante"
            tela.querySelector('#btn-voltar-visitante')?.addEventListener('click', () => {
                this.entrarComoVisitante();
            });
        }
        tela.classList.remove('hidden');
        document.getElementById('app-conteudo')?.classList.add('hidden');
        if (window.lucide) lucide.createIcons();
    }

    ocultarTelaAtivacao() {
        const tela = document.getElementById('tela-ativacao');
        if (tela) {
            tela.classList.add('hidden');
            tela.innerHTML = '';
        }
        document.getElementById('app-conteudo')?.classList.remove('hidden');
    }

    /**
     * Tela dedicada de Ativação de Conta e Definição de Senha
     * Carregada ao acessar o link seguro enviado por e-mail (#ativar-conta?token=...)
     */
    async mostrarTelaAtivacao(token) {
        this.ocultarTelaLogin();
        let tela = document.getElementById('tela-ativacao');
        if (!tela) {
            tela = document.createElement('div');
            tela.id = 'tela-ativacao';
            tela.className = 'fixed inset-0 z-[999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';
            document.body.appendChild(tela);
        }

        tela.classList.remove('hidden');
        document.getElementById('app-conteudo')?.classList.add('hidden');

        // Estado inicial de carregamento
        tela.innerHTML = `
          <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center animate-pulse">
            <div class="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <i data-lucide="shield" class="w-7 h-7 animate-spin"></i>
            </div>
            <h3 class="text-base font-extrabold text-slate-900">Validando link de ativação...</h3>
            <p class="text-xs text-slate-500 mt-2">Aguarde enquanto verificamos a segurança e autenticidade do seu link.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();

        try {
            const res = await window.API.verificarTokenAtivacao(token);
            const dadosUsuario = res?.data || res;

            tela.innerHTML = `
              <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 my-8 border border-slate-100 transition-all">
                <div class="flex flex-col items-center mb-5 text-center">
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-600/30 mb-3">
                    <i data-lucide="shield-check" class="w-8 h-8"></i>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider mb-1">
                    Solicitação Aprovada
                  </span>
                  <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">Ativação de Conta</h1>
                  <p class="text-xs text-slate-400 font-medium mt-0.5">HUB ES+ • Defina sua senha pessoal confidencial</p>
                </div>

                <!-- DADOS DO USUÁRIO IDENTIFICADO -->
                <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-5 text-xs text-slate-600 space-y-1.5">
                  <div class="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                    <span class="text-slate-400 font-semibold">Colaborador:</span>
                    <strong class="text-slate-900">${dadosUsuario.nome || 'Usuário'}</strong>
                  </div>
                  <div class="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                    <span class="text-slate-400 font-semibold">E-mail:</span>
                    <strong class="font-mono text-slate-800">${dadosUsuario.email || ''}</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400 font-semibold">Perfil / Setor:</span>
                    <span class="font-bold text-blue-600">${dadosUsuario.perfil || 'OPERADOR'} • ${dadosUsuario.setor_nome || 'Geral'}</span>
                  </div>
                </div>

                <div id="ativacao-feedback" class="hidden mb-4 text-xs font-semibold rounded-xl px-4 py-3 leading-relaxed"></div>

                <form id="form-ativar-conta" class="space-y-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Nova Senha de Acesso *</label>
                    <div class="relative">
                      <input id="ativar-senha" type="password" required minlength="8"
                        class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all pr-10"
                        placeholder="Mínimo de 8 caracteres">
                      <button type="button" id="btn-toggle-senha-ativar" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Confirmar Nova Senha *</label>
                    <input id="ativar-senha-conf" type="password" required minlength="8"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                      placeholder="Repita exatamente a nova senha">
                  </div>

                  <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                    <strong>Importante:</strong> Este link é de <strong>uso único</strong> e deixará de funcionar imediatamente após a confirmação. Guarde sua senha com cuidado.
                  </div>

                  <button type="submit" id="btn-confirmar-ativacao"
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                    Definir Senha e Ativar Minha Conta
                  </button>
                </form>

                <div class="mt-6 pt-4 border-t border-slate-100 text-center">
                  <button type="button" id="btn-ir-login-ativacao" class="text-xs text-blue-600 hover:text-blue-700 font-bold">
                    Já tem acesso? Fazer Login
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) lucide.createIcons();

            // Alternar visualização da senha
            const btnEye = tela.querySelector('#btn-toggle-senha-ativar');
            const inputSenha = tela.querySelector('#ativar-senha');
            btnEye?.addEventListener('click', () => {
                const isPass = inputSenha.type === 'password';
                inputSenha.type = isPass ? 'text' : 'password';
                btnEye.innerHTML = isPass ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' : '<i data-lucide="eye" class="w-4 h-4"></i>';
                if (window.lucide) lucide.createIcons();
            });

            // Botão ir para login
            tela.querySelector('#btn-ir-login-ativacao')?.addEventListener('click', () => {
                window.location.hash = '';
                this.ocultarTelaAtivacao();
                this.mostrarTelaLogin();
            });

            // Submit do formulário de ativação
            const formAtivar = tela.querySelector('#form-ativar-conta');
            const feedbackEl = tela.querySelector('#ativacao-feedback');

            const mostrarFeedbackAtivacao = (msg, tipo = 'erro') => {
                feedbackEl.textContent = msg;
                feedbackEl.className = 'mb-4 text-xs font-semibold rounded-xl px-4 py-3 leading-relaxed ' + (
                    tipo === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                );
                feedbackEl.classList.remove('hidden');
            };

            formAtivar?.addEventListener('submit', async (e) => {
                e.preventDefault();
                feedbackEl.classList.add('hidden');
                const senha = tela.querySelector('#ativar-senha').value;
                const senhaConf = tela.querySelector('#ativar-senha-conf').value;
                const btn = tela.querySelector('#btn-confirmar-ativacao');

                if (!senha || senha.length < 8) {
                    mostrarFeedbackAtivacao('A senha precisa ter no mínimo 8 caracteres.');
                    return;
                }
                if (senha !== senhaConf) {
                    mostrarFeedbackAtivacao('As senhas digitadas não coincidem.');
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Ativando sua conta...';

                try {
                    await window.API.ativarConta({
                        token,
                        senha,
                        confirmacao_senha: senhaConf
                    });

                    // Sucesso na ativação
                    tela.innerHTML = `
                      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center animate-in fade-in duration-300">
                        <div class="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                          <i data-lucide="check-circle" class="w-9 h-9"></i>
                        </div>
                        <h2 class="text-xl font-extrabold text-slate-900">Conta Ativada com Sucesso!</h2>
                        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                          Sua senha confidencial foi registrada e sua conta está pronta para uso no <strong>HUB ES+</strong>.
                        </p>
                        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 my-6 text-xs text-emerald-800 text-left">
                          <p><strong>E-mail:</strong> ${dadosUsuario.email}</p>
                          <p><strong>Nível de Acesso:</strong> ${dadosUsuario.perfil || 'OPERADOR'}</p>
                          <p class="mt-2 text-[11px] text-emerald-700">Utilize seu e-mail e a senha que acabou de cadastrar para entrar.</p>
                        </div>
                        <button id="btn-concluir-ativacao-login"
                          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                          Acessar Plataforma Agora
                        </button>
                      </div>
                    `;
                    if (window.lucide) lucide.createIcons();

                    tela.querySelector('#btn-concluir-ativacao-login')?.addEventListener('click', () => {
                        window.location.hash = '';
                        this.ocultarTelaAtivacao();
                        this.mostrarTelaLogin();
                        const inputEmail = document.getElementById('login-email');
                        if (inputEmail) inputEmail.value = dadosUsuario.email || '';
                    });
                } catch (err) {
                    mostrarFeedbackAtivacao(err.message || 'Erro ao concluir ativação.', 'erro');
                    btn.disabled = false;
                    btn.textContent = 'Definir Senha e Ativar Minha Conta';
                }
            });

        } catch (err) {
            // Token inválido, expirado ou já utilizado
            tela.innerHTML = `
              <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center animate-in fade-in duration-300">
                <div class="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                </div>
                <h2 class="text-lg font-extrabold text-slate-900">Link Indisponível ou Expirado</h2>
                <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                  ${err.message || 'Este link de ativação é de uso único e já foi utilizado ou sua validade de 24 horas expirou.'}
                </p>
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl my-5 text-[11px] text-slate-600 text-left">
                  <p><strong>O que fazer:</strong></p>
                  <ul class="list-disc pl-4 mt-1 space-y-1 text-slate-500">
                    <li>Se você já definiu sua senha, basta acessar a tela de login.</li>
                    <li>Caso o prazo tenha expirado, solicite ao Administrador Geral o reenvio do link de ativação.</li>
                  </ul>
                </div>
                <div class="space-y-2">
                  <button id="btn-erro-ir-login"
                    class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer">
                    Ir para a Tela de Login
                  </button>
                  <button id="btn-erro-visitante"
                    class="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer">
                    Acessar como Visitante
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) lucide.createIcons();

            tela.querySelector('#btn-erro-ir-login')?.addEventListener('click', () => {
                window.location.hash = '';
                this.ocultarTelaAtivacao();
                this.mostrarTelaLogin();
            });

            tela.querySelector('#btn-erro-visitante')?.addEventListener('click', () => {
                window.location.hash = '#comunicacao';
                this.ocultarTelaAtivacao();
                this.entrarComoVisitante();
            });
        }
    }
}

window.Auth = new AuthManager();
document.addEventListener('DOMContentLoaded', () => {
    window.Auth.exigirAutenticacao();
    if (window.lucide) lucide.createIcons();
});

// Listener global para capturar clique em links de ativação dinamicamente
window.addEventListener('hashchange', () => {
    const token = window.Auth?.verificarRotaAtivacao?.();
    if (token) {
        window.Auth.mostrarTelaAtivacao(token);
    }
});