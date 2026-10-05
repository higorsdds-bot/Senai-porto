/**
 * HUB ES+ - Módulo de Autenticação (Frontend)
 * Tela de login, sessão JWT e guard de rotas.
 */

class AuthManager {
    constructor() {
        this.usuario = null;
    }

    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_TOKEN);
    }

    getUsuario() {
        if (!this.usuario) {
            const raw = localStorage.getItem(CONFIG.STORAGE_USUARIO);
            if (raw) { try { this.usuario = JSON.parse(raw); } catch { this.usuario = null; } }
        }
        return this.usuario;
    }

    estaLogado() {
        return !!this.getToken();
    }

    async login(email, senha) {
        const res = await window.API.login(email, senha);
        if (res?.success && res.data?.token) {
            localStorage.setItem(CONFIG.STORAGE_TOKEN, res.data.token);
            localStorage.setItem(CONFIG.STORAGE_USUARIO, JSON.stringify(res.data.usuario));
            this.usuario = res.data.usuario;
            return res.data;
        }
        throw new Error(res?.message || 'Falha no login.');
    }

    async logout() {
        try { await window.API.logout(); } catch (_) { }
        this.forcarLogout();
    }

    forcarLogout() {
        localStorage.removeItem(CONFIG.STORAGE_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_USUARIO);
        this.usuario = null;
        this.renderizarTelaLogin();
    }

    /** Guard: bloqueia o app se não estiver autenticado */
    exigirAutenticacao() {
        if (!this.estaLogado()) {
            this.renderizarTelaLogin();
            return false;
        }
        this.ocultarTelaLogin();
        this.preencherInfoUsuario();
        return true;
    }

    preencherInfoUsuario() {
        const u = this.getUsuario();
        if (!u) return;
        document.querySelectorAll('[data-usuario-nome]').forEach(el => el.textContent = u.nome);
        document.querySelectorAll('[data-usuario-email]').forEach(el => el.textContent = u.email);
        document.querySelectorAll('[data-usuario-perfil]').forEach(el => el.textContent = u.perfil || '');
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
            tela.className = 'fixed inset-0 z-[999] bg-hub-navy flex items-center justify-center p-4';
            tela.innerHTML = `
        <div class="w-full max-w-md bg-white rounded-2xl shadow-hub-lg p-8">
          <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-600/30 mb-3">ES+</div>
            <h1 class="text-xl font-extrabold text-slate-900">HUB ES+</h1>
            <p class="text-xs text-slate-400 font-semibold mt-1">Acesse com suas credenciais</p>
          </div>
          <form id="form-login" class="space-y-4" novalidate>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">E-mail</label>
              <input id="login-email" type="email" required autocomplete="username"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="seu.email@secult.es.gov.br">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Senha</label>
              <input id="login-senha" type="password" required autocomplete="current-password"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="••••••••">
            </div>
            <p id="login-erro" class="hidden text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"></p>
            <button type="submit" id="btn-login"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              Entrar
            </button>
          </form>
        </div>`;
            document.body.appendChild(tela);

            tela.querySelector('#form-login').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = tela.querySelector('#login-email').value.trim();
                const senha = tela.querySelector('#login-senha').value;
                const erroEl = tela.querySelector('#login-erro');
                const btn = tela.querySelector('#btn-login');
                erroEl.classList.add('hidden');
                btn.disabled = true;
                btn.textContent = 'Entrando...';
                try {
                    await this.login(email, senha);
                    this.ocultarTelaLogin();
                    this.preencherInfoUsuario();
                    window.dispatchEvent(new Event('hub:login'));
                    if (window.lucide) lucide.createIcons();
                } catch (err) {
                    erroEl.textContent = err.message || 'Credenciais inválidas.';
                    erroEl.classList.remove('hidden');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Entrar';
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