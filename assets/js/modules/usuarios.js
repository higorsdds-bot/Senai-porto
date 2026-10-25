/**
 * HUB ES+ - Módulo de Gestão e Pré-Cadastro de Usuários
 * - Perfil ADMIN / GESTOR: Gestão completa de usuários, setores e status.
 * - Perfil ADMINISTRACAO: Pré-cadastro de novos colaboradores sem seleção de setor
 *   (o cadastro fica PENDENTE e vai para o Administrador Geral definir setor e função).
 */

window.UsuariosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  statusFilter: '',
  setorFilter: '',
  currentPage: 1,
  pageSize: 8,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    const isAdministracao = String(window.Auth?.getUsuario()?.perfil || '').toUpperCase() === 'ADMINISTRACAO';

    if (isAdministracao) {
      await this._renderPreCadastroAdministracao(container);
    } else {
      await this._renderGestaoCompleta(container);
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // VISÃO EXCLUSIVA DO PERFIL ADMINISTRAÇÃO: PRÉ-CADASTRO SEM SELEÇÃO DE SETOR
  // ───────────────────────────────────────────────────────────────────────────
  async _renderPreCadastroAdministracao(container) {
    try {
      const preCadastros = await window.API.getPreCadastros().catch(() => []);
      this.items = Array.isArray(preCadastros) ? preCadastros : [];
    } catch (err) {
      console.warn('[USUARIOS] Falha ao listar pré-cadastros:', err);
      this.items = [];
    }

    container.innerHTML = `
      <div class="space-y-6 max-w-6xl mx-auto">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
                Administração
              </span>
              <span class="text-xs text-slate-400">• Admissão e Credenciamento</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Pré-Cadastro de Colaborador</h1>
            <p class="text-xs text-slate-500 font-medium">Cadastre novos integrantes para encaminhamento e aprovação do Administrador Geral</p>
          </div>
        </div>

        <!-- Alerta Informativo de Fluxo de Governança -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 flex items-start gap-3 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
          </div>
          <div class="text-xs leading-relaxed space-y-1">
            <h4 class="font-bold text-blue-950">Fluxo Institucional de Aprovação</h4>
            <p class="text-slate-600">
              Como membro do setor <strong>Administrativo</strong>, você registra os dados básicos do colaborador. 
              Por normas de governança, <strong>o setor de lotação e a função do usuário serão definidos e homologados exclusivamente pelo Administrador Geral</strong> na tela de aprovação de acessos.
            </p>
          </div>
        </div>

        <!-- Grid Principal: Formulário + Lista Recente -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Coluna Formulário de Cadastro -->
          <div class="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">Novo Colaborador</h3>
                <p class="text-[11px] text-slate-400">Preencha os dados de acesso</p>
              </div>
            </div>

            <form id="form-pre-cadastro-admin" class="space-y-4" novalidate>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                <div class="relative">
                  <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="text" 
                    id="pre-cad-nome" 
                    required 
                    minlength="3" 
                    placeholder="Ex: Mariana Vasconcelos Costa"
                    class="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
                <div class="relative">
                  <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="email" 
                    id="pre-cad-email" 
                    required 
                    placeholder="Ex: mariana.costa@secult.es.gov.br"
                    class="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700">Senha Provisória *</label>
                  <button type="button" id="btn-gerar-senha-pre" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                    <i data-lucide="sparkles" class="w-3 h-3"></i>
                    <span>Gerar Senha</span>
                  </button>
                </div>
                <div class="relative">
                  <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="password" 
                    id="pre-cad-senha" 
                    required 
                    minlength="8" 
                    placeholder="Mínimo 8 caracteres"
                    class="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                  <button type="button" id="btn-toggle-senha-pre" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                <div class="relative">
                  <i data-lucide="check" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input 
                    type="password" 
                    id="pre-cad-senha-conf" 
                    required 
                    minlength="8" 
                    placeholder="Repita a senha provisória"
                    class="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              <!-- Aviso visual: Sem seleção de setor ou perfil -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-2">
                <i data-lucide="info" class="w-4 h-4 text-blue-500 shrink-0"></i>
                <span>Setor e função serão atribuídos pelo <strong>Administrador Geral</strong>.</span>
              </div>

              <button 
                type="submit" 
                id="btn-enviar-pre-cad" 
                class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <i data-lucide="send" class="w-4 h-4"></i>
                <span>Enviar para Aprovação do Admin Geral</span>
              </button>
            </form>
          </div>

          <!-- Coluna Acompanhamento de Solicitações -->
          <div class="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">Solicitações Registradas</h3>
                <p class="text-[11px] text-slate-400">Acompanhe o andamento das admissões encaminhadas</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                ${this.items.length} cadastros
              </span>
            </div>

            ${this.items.length === 0 ? `
              <div class="p-8 text-center text-slate-400">
                <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <i data-lucide="users" class="w-5 h-5"></i>
                </div>
                <p class="text-xs font-semibold text-slate-600">Nenhum colaborador registrado recentemente.</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Use o formulário ao lado para pré-cadastrar novos integrantes.</p>
              </div>
            ` : `
              <div class="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                ${this.items.map(u => {
                  const isPendente = u.status === 'PENDENTE';
                  const isAtivo = u.status === 'ATIVO';
                  return `
                    <div class="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors rounded-xl px-2">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl ${isPendente ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
                          ${this._iniciais(u.nome)}
                        </div>
                        <div>
                          <h4 class="text-xs font-bold text-slate-800">${this._esc(u.nome)}</h4>
                          <p class="text-[11px] text-slate-500 font-mono">${this._esc(u.email)}</p>
                          <p class="text-[10px] text-slate-400 mt-0.5">
                            Setor: <strong class="text-slate-600">${this._esc(u.setor_nome || (isPendente ? 'Aguardando definição do Admin' : 'Não atribuído'))}</strong>
                          </p>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        ${isPendente ? `
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Aguardando Admin
                          </span>
                        ` : isAtivo ? `
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aprovado (${u.perfil})
                          </span>
                        ` : `
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                            ${u.status}
                          </span>
                        `}
                        <div class="text-[10px] text-slate-400 mt-1">
                          ${u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this._bindPreCadastroEvents(container);
  },

  _bindPreCadastroEvents(container) {
    const form = container.querySelector('#form-pre-cadastro-admin');
    const btnGerarSenha = container.querySelector('#btn-gerar-senha-pre');
    const inputSenha = container.querySelector('#pre-cad-senha');
    const inputSenhaConf = container.querySelector('#pre-cad-senha-conf');
    const btnToggle = container.querySelector('#btn-toggle-senha-pre');
    const btnEnviar = container.querySelector('#btn-enviar-pre-cad');

    // Gerador de senha forte automática
    btnGerarSenha?.addEventListener('click', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
      let pass = '';
      for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
      if (inputSenha) inputSenha.value = pass;
      if (inputSenhaConf) inputSenhaConf.value = pass;
      inputSenha?.setAttribute('type', 'text');
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Senha Gerada',
          message: `Senha provisória gerada: ${pass}`,
          type: 'info'
        });
      }
    });

    // Alternar visibilidade de senha
    btnToggle?.addEventListener('click', () => {
      const type = inputSenha?.getAttribute('type') === 'password' ? 'text' : 'password';
      inputSenha?.setAttribute('type', type);
      inputSenhaConf?.setAttribute('type', type);
    });

    // Submissão do formulário
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = container.querySelector('#pre-cad-nome')?.value.trim();
      const email = container.querySelector('#pre-cad-email')?.value.trim();
      const senha = inputSenha?.value;
      const senhaConf = inputSenhaConf?.value;

      if (!nome || nome.length < 3) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe o nome completo do colaborador.', type: 'warning' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
        return;
      }
      if (!senha || senha.length < 8) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'A senha provisória precisa ter no mínimo 8 caracteres.', type: 'warning' });
        return;
      }
      if (senha !== senhaConf) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'As senhas informadas não coincidem.', type: 'warning' });
        return;
      }

      btnEnviar.disabled = true;
      btnEnviar.innerHTML = '<span class="animate-pulse">Enviando Solicitação...</span>';

      try {
        const res = await window.API.preCadastrarUsuario({ nome, email, senha });
        if (window.UI?.toast) {
          window.UI.toast({
            title: 'Colaborador Registrado',
            message: res?.message || 'Cadastro enviado com sucesso para aprovação do Administrador Geral!',
            type: 'success'
          });
        }
        form.reset();
        await this.render(container);
      } catch (err) {
        if (window.UI?.toast) {
          window.UI.toast({
            title: 'Erro ao Registrar',
            message: err.message || 'Não foi possível enviar o pré-cadastro.',
            type: 'error'
          });
        }
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Enviar para Aprovação do Admin Geral</span>';
        if (window.lucide) lucide.createIcons();
      }
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // VISÃO COMPLETA (ADMIN / GESTOR): GESTÃO GERAL DE USUÁRIOS
  // ───────────────────────────────────────────────────────────────────────────
  async _renderGestaoCompleta(container) {
    try {
      const [usuarios, setores] = await Promise.all([
        window.API.getUsuarios().catch(() => []),
        window.API.getSetores().catch(() => [])
      ]);
      this.items = Array.isArray(usuarios) ? usuarios : [];
      this.setores = Array.isArray(setores) ? setores : [];
    } catch (err) {
      this.items = [];
      this.setores = [];
    }

    const filtered = this.items.filter(u => {
      const q = this.searchTerm.toLowerCase();
      const matchNome = (u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      const matchStatus = !this.statusFilter || u.status === this.statusFilter;
      const matchSetor = !this.setorFilter || Number(u.setor_id) === Number(this.setorFilter);
      return matchNome && matchStatus && matchSetor;
    });

    const totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
                Governança
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} cadastros</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Gestão de Usuários</h1>
            <p class="text-xs text-slate-500 font-medium">Controle de credenciais, perfis de acesso e lotação setorial</p>
          </div>
          ${window.Auth?.isAdmin() ? `
            <button id="btn-novo-usuario-admin" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>Novo Usuário</span>
            </button>
          ` : ''}
        </div>

        <!-- Barra de Busca e Filtros -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="relative w-full md:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-usuario" 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto">
            <select id="select-filtro-setor-user" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `<option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>`).join('')}
            </select>

            <select id="select-filtro-status-user" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Status</option>
              <option value="ATIVO" ${this.statusFilter === 'ATIVO' ? 'selected' : ''}>Ativo</option>
              <option value="PENDENTE" ${this.statusFilter === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
              <option value="INATIVO" ${this.statusFilter === 'INATIVO' ? 'selected' : ''}>Inativo</option>
              <option value="BLOQUEADO" ${this.statusFilter === 'BLOQUEADO' ? 'selected' : ''}>Bloqueado</option>
            </select>
          </div>
        </div>

        <!-- Tabela -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="px-6 py-3.5">Colaborador</th>
                  <th class="px-6 py-3.5">E-mail</th>
                  <th class="px-6 py-3.5">Perfil</th>
                  <th class="px-6 py-3.5">Setor</th>
                  <th class="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${paginatedItems.length === 0 ? `
                  <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-slate-400">
                      Nenhum usuário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ` : paginatedItems.map(u => `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs">
                        ${this._iniciais(u.nome)}
                      </div>
                      <span>${this._esc(u.nome)}</span>
                    </td>
                    <td class="px-6 py-4 text-slate-600 font-mono text-[11px]">${this._esc(u.email)}</td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        ${u.perfil}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-slate-600">${this._esc(u.setor_nome || 'Geral')}</td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${u.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : u.status === 'PENDENTE' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                        <span class="w-1.5 h-1.5 rounded-full ${u.status === 'ATIVO' ? 'bg-emerald-500' : u.status === 'PENDENTE' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}"></span>
                        ${u.status}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Eventos de busca e filtro
    container.querySelector('#input-busca-usuario')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderGestaoCompleta(container);
    });
    container.querySelector('#select-filtro-setor-user')?.addEventListener('change', (e) => {
      this.setorFilter = e.target.value;
      this.currentPage = 1;
      this._renderGestaoCompleta(container);
    });
    container.querySelector('#select-filtro-status-user')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this._renderGestaoCompleta(container);
    });
  },

  _iniciais(nome) {
    if (!nome) return 'U';
    const partes = String(nome).trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

window.Modules = window.Modules || {};
window.Modules.usuarios = window.UsuariosModule;
