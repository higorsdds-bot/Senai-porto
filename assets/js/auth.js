/**
 * HUB ES+ - Módulo de Autenticação (Frontend)
 * Tela de login, solicitação de cadastro (status PENDENTE), sessão JWT, heartbeat e verificação de Admin.
 */

class AuthManager {
    constructor() {
        this.usuario = null;
        this._heartbeatInterval = null;
    }

    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_TOKEN);
    }

    getUsuario() {
        if (!this.usuario) {
            const raw = localStorage.getItem(CONFIG.STORAGE_USUARIO);
            if (raw) {
                try { this.usuario = JSON.parse(raw); } catch { this.usuario = null; }
            }
        }
        return this.usuario;
    }

    estaLogado() {
        return !!this.getToken();
    }

    isAdmin() {
        const u = this.getUsuario();
        if (!u || !u.perfil) return false;
        const p = String(u.perfil).toUpperCase();
        return p === 'ADMIN' || p === 'ADMINISTRADOR';
    }

    async login(email, senha) {
        const res = await window.API.login(email, senha);
        if (res?.success && res.data?.token) {
            localStorage.setItem(CONFIG.STORAGE_TOKEN, res.data.token);
            localStorage.setItem(CONFIG.STORAGE_USUARIO, JSON.stringify(res.data.usuario));
            this.usuario = res.data.usuario;
            this.iniciarHeartbeat();
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
        localStorage.removeItem(CONFIG.STORAGE_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_USUARIO);
        this.usuario = null;
        this.renderizarTelaLogin();
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

    /** Guard: bloqueia o app se não estiver autenticado */
    exigirAutenticacao() {
        if (!this.estaLogado()) {
            this.renderizarTelaLogin();
            return false;
        }
        this.ocultarTelaLogin();
        this.preencherInfoUsuario();
        this.iniciarHeartbeat();
        this.atualizarVisibilidadeAdmin();
        return true;
    }

    preencherInfoUsuario() {
        const u = this.getUsuario();
        if (!u) return;
        document.querySelectorAll('[data-usuario-nome]').forEach(el => el.textContent = u.nome);
        document.querySelectorAll('[data-usuario-email]').forEach(el => el.textContent = u.email);
        document.querySelectorAll('[data-usuario-perfil]').forEach(el => el.textContent = u.perfil || '');
        this.atualizarVisibilidadeAdmin();
    }

    atualizarVisibilidadeAdmin() {
        const admin = this.isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            if (admin) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
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
          <form id="form-cadastro" class="space-y-3 hidden" novalidate>
            <p class="text-[11px] text-slate-500 bg-blue-50 border border-blue-100 rounded-xl p-3 leading-relaxed">
              <strong>Novo por aqui?</strong> Solicite seu cadastro preenchendo os dados abaixo. Sua conta será criada com status <strong>PENDENTE</strong> e liberada após aprovação de um Administrador.
            </p>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">Nome Completo *</label>
              <input id="cad-nome" type="text" required minlength="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Seu nome completo">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">E-mail Institucional *</label>
              <input id="cad-email" type="email" required
                class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="seu.email@dominio.com">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">Senha de Acesso *</label>
              <input id="cad-senha" type="password" required minlength="8"
                class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Mínimo 8 caracteres">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">Confirmar Senha *</label>
              <input id="cad-senha-conf" type="password" required minlength="8"
                class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Repita a senha">
            </div>
            <button type="submit" id="btn-solicitar"
              class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
              Enviar Solicitação de Cadastro
            </button>
          </form>

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
                const senha = tela.querySelector('#cad-senha').value;
                const senhaConf = tela.querySelector('#cad-senha-conf').value;
                const btn = tela.querySelector('#btn-solicitar');

                if (!nome || nome.length < 3) {
                    mostrarFeedback('Nome precisa ter no mínimo 3 caracteres.');
                    return;
                }
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    mostrarFeedback('Por favor, informe um e-mail válido.');
                    return;
                }
                if (!senha || senha.length < 8) {
                    mostrarFeedback('A senha precisa ter no mínimo 8 caracteres.');
                    return;
                }
                if (senha !== senhaConf) {
                    mostrarFeedback('As senhas digitadas não coincidem.');
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Enviando Solicitação...';
                try {
                    const res = await window.API.solicitarCadastro({ nome, email, senha });
                    formCadastro.reset();
                    mostrarFeedback(
                        res?.message || 'Solicitação enviada com sucesso! Aguarde a aprovação do Administrador.',
                        'sucesso'
                    );
                    // Alterna para a aba de login após 3 segundos
                    setTimeout(() => tabLogin.click(), 3000);
                } catch (err) {
                    mostrarFeedback(err.message || 'Erro ao enviar solicitação de cadastro.', 'erro');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Enviar Solicitação de Cadastro';
                }
            });
        }
        tela.classList.remove('hidden');
        document.getElementById('app-conteudo')?.classList.add('hidden');
    }
}

window.Auth = new AuthManager();
document.addEventListener('DOMContentLoaded', () => {
    window.Auth.exigirAutenticacao();
    if (window.lucide) lucide.createIcons();
});