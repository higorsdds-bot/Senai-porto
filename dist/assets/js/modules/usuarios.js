/**
 * HUB ES+ - Módulo de Gestão e Pré-Cadastro de Usuários
 * - Perfil ADMIN / ADMINISTRADOR / GESTOR: Gestão completa de usuários, cargos, setores, status e permissões adicionais por módulo.
 * - Perfil ADMINISTRACAO: Pré-cadastro de novos colaboradores sem seleção de setor
 *   (o cadastro fica PENDENTE e vai para o Administrador Geral definir setor e função).
 */

const PERMISSOES_MODULOS_CATALOGO = [
  { chave: 'dashboard.visualizar', modulo: 'Dashboard', label: 'Acessar Dashboard Executivo' },
  { chave: 'indicadores.visualizar', modulo: 'Indicadores', label: 'Acessar Indicadores & BI' },
  { chave: 'documentos.visualizar', modulo: 'Documentos', label: 'Visualizar e Baixar Documentos' },
  { chave: 'documentos.enviar', modulo: 'Documentos', label: 'Anexar / Enviar Documentos' },
  { chave: 'equipamentos.visualizar', modulo: 'Equipamentos', label: 'Visualizar Patrimônio' },
  { chave: 'equipamentos.criar', modulo: 'Equipamentos', label: 'Cadastrar / Editar Equipamentos' },
  { chave: 'ocorrencias.visualizar', modulo: 'Ocorrências', label: 'Visualizar e Abrir Chamados' },
  { chave: 'ocorrencias.atender', modulo: 'Ocorrências', label: 'Assumir Chamados Técnicos' },
  { chave: 'ocorrencias.escalonar', modulo: 'Ocorrências', label: 'Escalonar N1 / N2 / N3' },
  { chave: 'insumos.visualizar', modulo: 'Insumos', label: 'Visualizar Estoque de Insumos' },
  { chave: 'insumos.movimentar', modulo: 'Insumos', label: 'Movimentar / Dar Baixa no Estoque' },
  { chave: 'compras.visualizar', modulo: 'Compras', label: 'Visualizar Pedidos de Compra' },
  { chave: 'compras.criar', modulo: 'Compras', label: 'Solicitar Compras / Materiais' },
  { chave: 'compras.aprovar', modulo: 'Compras', label: 'Aprovar Solicitações de Compra' },
  { chave: 'limpeza.visualizar', modulo: 'Limpeza', label: 'Visualizar Escala de Limpeza' },
  { chave: 'limpeza.criar', modulo: 'Limpeza', label: 'Criar / Editar Rotinas de Limpeza' },
  { chave: 'eventos.criar', modulo: 'Agenda', label: 'Agendar e Editar Eventos' },
  { chave: 'comunicados.criar', modulo: 'Comunicação', label: 'Publicar Comunicados Oficiais' },
  { chave: 'usuarios.visualizar', modulo: 'Usuários', label: 'Visualizar Lista de Colaboradores' },
  { chave: 'usuarios.pre_cadastrar', modulo: 'Usuários', label: 'Pré-Cadastrar Colaboradores' },
  { chave: 'advertencias.visualizar', modulo: 'Advertências', label: 'Visualizar Advertências' },
  { chave: 'advertencias.solicitar', modulo: 'Advertências', label: 'Solicitar Advertências' },
  { chave: 'auditoria.visualizar', modulo: 'Auditoria', label: 'Visualizar Painel de Auditoria' }
];

window.UsuariosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  statusFilter: '',
  setorFilter: '',
  currentPage: 1,
  pageSize: 15,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 6);

    const isAdministracao = String(window.Auth?.getUsuario()?.perfil || '').toUpperCase() === 'ADMINISTRACAO';

    if (isAdministracao) {
      await this._renderPreCadastroAdministracao(container);
    } else {
      await this._renderGestaoCompleta(container);
    }
  },

  _renderCheckboxesPermissoes(className, selecionadas = []) {
    const selSet = new Set(Array.isArray(selecionadas) ? selecionadas : []);
    return PERMISSOES_MODULOS_CATALOGO.map(item => `
      <label class="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-colors">
        <input type="checkbox" value="${item.chave}" class="${className} rounded text-blue-600 shrink-0" ${selSet.has(item.chave) ? 'checked' : ''}>
        <span class="leading-tight text-[11px] text-slate-700 dark:text-slate-200">
          <strong class="text-slate-900 dark:text-white">${item.modulo}:</strong> ${item.label}
        </span>
      </label>
    `).join('');
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
                class="btn-primary w-full justify-center py-2.5"
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

                      <div class="text-right shrink-0 flex flex-col items-end gap-1">
                        ${isPendente ? `
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Aguardando Admin
                          </span>
                          <button type="button" onclick="window.UsuariosModule._openEditPreCadastroModal(${u.id})"
                            class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                            title="Editar solicitação de colaborador que já foi pedida">
                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                            <span>Editar</span>
                          </button>
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
                        <div class="text-[10px] text-slate-400">
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

    btnToggle?.addEventListener('click', () => {
      const type = inputSenha?.getAttribute('type') === 'password' ? 'text' : 'password';
      inputSenha?.setAttribute('type', type);
      inputSenhaConf?.setAttribute('type', type);
    });

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
  // VISÃO COMPLETA (ADMIN / GESTOR): GESTÃO GERAL DE USUÁRIOS E ACESSOS
  // ───────────────────────────────────────────────────────────────────────────
  async _renderGestaoCompleta(container) {
    try {
      const [usuarios, setores] = await Promise.all([
        window.API.getUsuarios().catch(() => []),
        window.API.getSetores().catch(() => [])
      ]);
      this.items = Array.isArray(usuarios) ? usuarios : (usuarios?.data || []);
      this.setores = Array.isArray(setores) ? setores : (setores?.data || []);
    } catch (err) {
      this.items = [];
      this.setores = [];
    }

    const canEdit = window.Auth?.isAdmin() || window.Auth?.hasPermission('usuarios.editar');
    const canCreate = window.Auth?.isAdmin() || window.Auth?.hasPermission('usuarios.criar');
    const canBlock = window.Auth?.isAdmin() || window.Auth?.hasPermission('usuarios.bloquear');
    const usuarioAtual = window.Auth?.getUsuario();

    const filtered = this.items.filter(u => {
      const q = this.searchTerm.toLowerCase();
      const matchNome = (u.nome || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.perfil || '').toLowerCase().includes(q);
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
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 tracking-wide uppercase">
                Governança & Acessos
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} cadastros</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Gestão de Usuários e Permissões</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Edite cargos, setores, status e conceda acesso específico a módulos do sistema</p>
          </div>
          <div class="flex items-center gap-2">
            ${canCreate ? `
              <button id="btn-novo-usuario-admin" class="btn-primary">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                <span>Novo Usuário</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Barra de Busca e Filtros -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="relative w-full md:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-usuario" 
              type="text" 
              placeholder="Buscar por nome, e-mail ou cargo..." 
              value="${this._esc(this.searchTerm)}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select id="select-filtro-setor-user" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `<option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${this._esc(s.nome)}</option>`).join('')}
            </select>

            <select id="select-filtro-status-user" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              <option value="">Todos os Status</option>
              <option value="ATIVO" ${this.statusFilter === 'ATIVO' ? 'selected' : ''}>Ativo</option>
              <option value="PENDENTE" ${this.statusFilter === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
              <option value="AGUARDANDO_ATIVACAO" ${this.statusFilter === 'AGUARDANDO_ATIVACAO' ? 'selected' : ''}>Aguardando Ativação</option>
              <option value="INATIVO" ${this.statusFilter === 'INATIVO' ? 'selected' : ''}>Inativo</option>
              <option value="BLOQUEADO" ${this.statusFilter === 'BLOQUEADO' ? 'selected' : ''}>Bloqueado</option>
            </select>
          </div>
        </div>

        <!-- Tabela -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Colaborador</th>
                  <th class="px-5 py-3.5">E-mail</th>
                  <th class="px-5 py-3.5">Cargo / Acessos Extras</th>
                  <th class="px-5 py-3.5">Setor</th>
                  <th class="px-5 py-3.5">Status</th>
                  <th class="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${paginatedItems.length === 0 ? `
                  <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                      Nenhum usuário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ` : paginatedItems.map(u => {
      const isMe = usuarioAtual && Number(usuarioAtual.id) === Number(u.id);
      const isAtivo = u.status === 'ATIVO';
      const extras = Array.isArray(u.permissoes_adicionais) ? u.permissoes_adicionais : [];

      return `
                  <tr class="hub-table-row hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                          ${this._iniciais(u.nome)}
                        </div>
                        <div>
                          <div class="leading-tight">${this._esc(u.nome)}</div>
                          ${isMe ? '<span class="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">(Sua Conta)</span>' : ''}
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">${this._esc(u.email)}</td>
                    <td class="px-5 py-4">
                      <div class="flex flex-col gap-1 items-start">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${u.perfil === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                          ${this._esc(u.perfil)}
                        </span>
                        ${extras.length > 0 ? `
                          <div class="flex flex-wrap gap-1 mt-0.5">
                            ${extras.slice(0, 3).map(p => `
                              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                                +${this._esc(p)}
                              </span>
                            `).join('')}
                            ${extras.length > 3 ? `<span class="text-[9px] font-bold text-blue-600">+${extras.length - 3}</span>` : ''}
                          </div>
                        ` : ''}
                      </div>
                    </td>
                    <td class="px-5 py-4 text-slate-600 dark:text-slate-400">${this._esc(u.setor_nome || 'Geral')}</td>
                    <td class="px-5 py-4">
                      ${window.UI.renderBadge(u.status)}
                    </td>
                    <td class="px-5 py-4 text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        ${canEdit ? `
                          <button type="button" onclick="window.UsuariosModule._openEditarUsuarioModal(${u.id})"
                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 text-[11px] font-bold transition-colors cursor-pointer"
                            title="Editar dados, cargo e adicionar acesso a módulos específicos">
                            <i data-lucide="user-cog" class="w-3.5 h-3.5"></i>
                            <span>Editar / Acessos</span>
                          </button>
                        ` : ''}

                        ${canBlock ? (isAtivo ? `
                          <button type="button" ${isMe ? 'disabled' : `onclick="window.UsuariosModule._toggleStatusUsuario(${u.id}, 'INATIVO')"`}
                            title="${isMe ? 'Você não pode inativar sua própria conta' : 'Inativar usuário'}"
                            class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 transition-colors ${isMe ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}">
                            <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : `
                          <button type="button" onclick="window.UsuariosModule._toggleStatusUsuario(${u.id}, 'ATIVO')"
                            title="Ativar usuário"
                            class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer">
                            <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                          </button>
                        `) : ''}

                        ${window.Auth?.isAdmin() ? `
                          <button type="button" ${isMe ? 'disabled' : `onclick="window.UsuariosModule._excluirUsuario(${u.id})"`}
                            title="${isMe ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}"
                            class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors ${isMe ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Paginação -->
          ${filtered.length > 0 ? `
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length} usuário(s)</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 text-xs"' : 'class="btn-secondary px-2.5 py-1 text-xs cursor-pointer"'} id="btn-user-prev">Anterior</button>
                <span class="px-2 font-bold">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 text-xs"' : 'class="btn-secondary px-2.5 py-1 text-xs cursor-pointer"'} id="btn-user-next">Próxima</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Eventos de busca, filtro e paginação
    container.querySelector('#btn-novo-usuario-admin')?.addEventListener('click', () => {
      this._openNovoUsuarioModal(container);
    });
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
    container.querySelector('#btn-user-prev')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this._renderGestaoCompleta(container);
      }
    });
    container.querySelector('#btn-user-next')?.addEventListener('click', () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this._renderGestaoCompleta(container);
      }
    });
  },

  _openNovoUsuarioModal(container) {
    const setoresOptions = (this.setores || []).map(s => `<option value="${s.id}">${this._esc(s.nome)}</option>`).join('');

    const modalContent = `
      <form id="form-novo-usuario-modal" class="space-y-4">
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <i data-lucide="user-plus" class="w-4 h-4 text-blue-600 shrink-0"></i>
          <span>Cadastre um novo usuário com acesso direto ao sistema (status <strong>ATIVO</strong>).</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
            <input 
              type="text" 
              id="novo-user-nome" 
              required 
              minlength="3" 
              placeholder="Ex: Carlos Eduardo de Oliveira"
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
            <input 
              type="email" 
              id="novo-user-email" 
              required 
              placeholder="Ex: carlos.oliveira@secult.es.gov.br"
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Perfil de Acesso / Hierarquia *</label>
            <select id="novo-user-perfil" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium">
              <optgroup label="Administração e Governança">
                <option value="ADMIN">ADMIN (Super Administrador Geral)</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR (Gestão Institucional)</option>
                <option value="ADMINISTRACAO">ADMINISTRAÇÃO (Admissão e Pedidos)</option>
              </optgroup>
              <optgroup label="Gestores Setoriais">
                <option value="GESTOR_RH">GESTOR_RH (Supervisão de RH e Acessos)</option>
                <option value="GESTOR_INFRA">GESTOR_INFRA (Comando N1, N2, N3 e Redes)</option>
                <option value="GESTOR_OPERADOR">GESTOR_OPERADOR (Comando de Operadores)</option>
                <option value="GESTOR">GESTOR (Gestão Geral Operacional)</option>
              </optgroup>
              <optgroup label="Suporte Técnico & TI">
                <option value="TECNICO_N3">TECNICO_N3 (Avançado / Infra / Servidores)</option>
                <option value="TECNICO_N2">TECNICO_N2 (Hardware / Redes / Bancadas)</option>
                <option value="TECNICO_N1">TECNICO_N1 (Helpdesk / Atendimento N1)</option>
                <option value="TECNICO">TECNICO (Suporte Técnico)</option>
              </optgroup>
              <optgroup label="Recursos Humanos">
                <option value="ANALISTA_RH">ANALISTA_RH (Analista de RH)</option>
                <option value="RH">RH (Assistente / Operações de RH)</option>
              </optgroup>
              <optgroup label="Operacional">
                <option value="OPERADOR" selected>OPERADOR (Operações Básicas)</option>
                <option value="LIMPEZA">LIMPEZA (Consumo e Higienização)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Setor de Lotação</label>
            <select id="novo-user-setor" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium">
              <option value="">Sem setor definido</option>
              ${setoresOptions}
            </select>
          </div>
        </div>

        <!-- PERMISSÕES ADICIONAIS / EXCEÇÕES GRANULARES -->
        <div class="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/70 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i data-lucide="key" class="w-3.5 h-3.5 text-blue-600"></i> Liberar Acesso Específico a Módulos / Funções
            </span>
            <span class="text-[10px] text-slate-400 font-medium">Além do perfil base</span>
          </div>
          <p class="text-[11px] text-slate-500">Marque abaixo qualquer tela ou permissão extra que deseja liberar especificamente para este colaborador:</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
            ${this._renderCheckboxesPermissoes('perm-extra-cb', [])}
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold text-slate-700">Senha de Acesso *</label>
            <button type="button" id="btn-gerar-senha-novo-user" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
              <i data-lucide="sparkles" class="w-3 h-3"></i>
              <span>Gerar Senha</span>
            </button>
          </div>
          <input 
            type="password" 
            id="novo-user-senha" 
            required 
            minlength="8" 
            placeholder="Mínimo de 8 caracteres"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
          />
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Cadastrar Novo Usuário',
      subtitle: 'Crie uma nova credencial com acesso liberado e permissões customizadas.',
      maxWidth: 'max-w-2xl',
      contentHtml: modalContent,
      saveLabel: 'Cadastrar Usuário',
      onSave: async () => {
        const nome = document.getElementById('novo-user-nome')?.value.trim();
        const email = document.getElementById('novo-user-email')?.value.trim();
        const perfil = document.getElementById('novo-user-perfil')?.value;
        const setor_id = document.getElementById('novo-user-setor')?.value;
        const senha = document.getElementById('novo-user-senha')?.value;
        const permissoes_adicionais = Array.from(document.querySelectorAll('.perm-extra-cb:checked')).map(cb => cb.value);

        if (!nome || nome.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'O nome deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return false;
        }
        if (!senha || senha.length < 8) {
          window.UI.toast({ title: 'Atenção', message: 'A senha de acesso precisa ter pelo menos 8 caracteres.', type: 'warning' });
          return false;
        }

        try {
          await window.API.createUsuario({
            nome,
            email,
            senha,
            perfil,
            setor_id: setor_id ? Number(setor_id) : null,
            status: 'ATIVO',
            permissoes_adicionais
          });

          window.UI.toast({
            title: 'Usuário Criado',
            message: `O colaborador "${nome}" foi cadastrado com sucesso!`,
            type: 'success'
          });

          if (container) await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Cadastrar',
            message: err.message || 'Não foi possível cadastrar o usuário.',
            type: 'error'
          });
          return false;
        }
      }
    });

    setTimeout(() => {
      document.getElementById('btn-gerar-senha-novo-user')?.addEventListener('click', () => {
        const input = document.getElementById('novo-user-senha');
        if (input) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
          let pass = '';
          for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
          input.value = pass;
          input.type = 'text';
          window.UI.toast({ title: 'Senha Gerada', message: `Senha gerada: ${pass}`, type: 'info' });
        }
      });
      if (window.lucide) {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) window.lucide.createIcons({ root: modalContainer });
      }
    }, 50);
  },

  async _openEditarUsuarioModal(userId) {
    let item = this.items.find(u => Number(u.id) === Number(userId));
    try {
      const fresh = await window.API.getUsuarioById(userId);
      if (fresh && fresh.id) item = fresh;
    } catch (_) { }

    if (!item) {
      window.UI.toast({ title: 'Erro', message: 'Usuário não localizado.', type: 'error' });
      return;
    }

    const setoresOptions = (this.setores || []).map(s =>
      `<option value="${s.id}" ${Number(s.id) === Number(item.setor_id) ? 'selected' : ''}>${this._esc(s.nome)}</option>`
    ).join('');

    const perfis = [
      {
        group: 'Administração e Governança', items: [
          ['ADMIN', 'ADMIN (Super Administrador Geral)'],
          ['ADMINISTRADOR', 'ADMINISTRADOR (Gestão Institucional)'],
          ['ADMINISTRACAO', 'ADMINISTRAÇÃO (Admissão e Pedidos)']
        ]
      },
      {
        group: 'Gestores Setoriais', items: [
          ['GESTOR_RH', 'GESTOR_RH (Supervisão de RH e Acessos)'],
          ['GESTOR_INFRA', 'GESTOR_INFRA (Comando N1, N2, N3 e Redes)'],
          ['GESTOR_OPERADOR', 'GESTOR_OPERADOR (Comando de Operadores)'],
          ['GESTOR', 'GESTOR (Gestão Geral Operacional)']
        ]
      },
      {
        group: 'Suporte Técnico & TI', items: [
          ['TECNICO_N3', 'TECNICO_N3 (Avançado / Infra / Servidores)'],
          ['TECNICO_N2', 'TECNICO_N2 (Hardware / Redes / Bancadas)'],
          ['TECNICO_N1', 'TECNICO_N1 (Helpdesk / Atendimento N1)'],
          ['TECNICO', 'TECNICO (Suporte Técnico)']
        ]
      },
      {
        group: 'Recursos Humanos', items: [
          ['ANALISTA_RH', 'ANALISTA_RH (Analista de RH)'],
          ['RH', 'RH (Assistente / Operações de RH)']
        ]
      },
      {
        group: 'Operacional', items: [
          ['OPERADOR', 'OPERADOR (Operações Básicas)'],
          ['LIMPEZA', 'LIMPEZA (Consumo e Higienização)']
        ]
      }
    ];

    const perfilAtual = String(item.perfil || 'OPERADOR').toUpperCase();
    const perfisHtml = perfis.map(g => `
      <optgroup label="${g.group}">
        ${g.items.map(([val, label]) => `<option value="${val}" ${perfilAtual === val ? 'selected' : ''}>${label}</option>`).join('')}
      </optgroup>
    `).join('');

    const userPerms = Array.isArray(item.permissoes_adicionais) ? item.permissoes_adicionais : [];

    const modalContent = `
      <form id="form-editar-usuario-gestao" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
            <input 
              type="text" 
              id="edit-gestao-nome" 
              required 
              minlength="3" 
              value="${this._esc(item.nome)}"
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
            <input 
              type="email" 
              id="edit-gestao-email" 
              required 
              value="${this._esc(item.email)}"
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Cargo / Perfil *</label>
            <select id="edit-gestao-perfil" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold">
              ${perfisHtml}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Setor de Lotação</label>
            <select id="edit-gestao-setor" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium">
              <option value="">Sem setor definido</option>
              ${setoresOptions}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Status da Conta *</label>
            <select id="edit-gestao-status" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold">
              <option value="ATIVO" ${item.status === 'ATIVO' ? 'selected' : ''}>ATIVO (Liberado)</option>
              <option value="INATIVO" ${item.status === 'INATIVO' ? 'selected' : ''}>INATIVO (Pausado)</option>
              <option value="BLOQUEADO" ${item.status === 'BLOQUEADO' ? 'selected' : ''}>BLOQUEADO (Revogado)</option>
              <option value="PENDENTE" ${item.status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
            </select>
          </div>
        </div>

        <!-- PERMISSÕES ADICIONAIS / EXCEÇÕES GRANULARES -->
        <div class="border border-blue-200 rounded-2xl p-3.5 bg-blue-50/40 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <i data-lucide="key" class="w-3.5 h-3.5 text-blue-600"></i> Liberar Acesso Específico a Módulos / Lugares
            </span>
            <span class="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">Permissões Extras</span>
          </div>
          <p class="text-[11px] text-slate-600">Marque abaixo os lugares/módulos específicos que este usuário poderá acessar além das permissões padrão do cargo:</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
            ${this._renderCheckboxesPermissoes('edit-gestao-perm-cb', userPerms)}
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold text-slate-700">Redefinir Senha (Opcional)</label>
            <button type="button" id="btn-gerar-senha-edit-gestao" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
              <i data-lucide="sparkles" class="w-3 h-3"></i>
              <span>Gerar Nova Senha</span>
            </button>
          </div>
          <input 
            type="password" 
            id="edit-gestao-senha" 
            minlength="8" 
            placeholder="Deixe em branco para manter a senha atual"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
          />
        </div>
      </form>
    `;

    window.UI.openModal({
      title: `Editar Usuário: ${item.nome}`,
      subtitle: 'Altere cargo, setor, status ou adicione acesso a módulos específicos.',
      maxWidth: 'max-w-2xl',
      contentHtml: modalContent,
      saveLabel: 'Salvar Alterações',
      onSave: async () => {
        const nome = document.getElementById('edit-gestao-nome')?.value.trim();
        const email = document.getElementById('edit-gestao-email')?.value.trim();
        const perfil = document.getElementById('edit-gestao-perfil')?.value;
        const setor_id = document.getElementById('edit-gestao-setor')?.value;
        const status = document.getElementById('edit-gestao-status')?.value;
        const senha = document.getElementById('edit-gestao-senha')?.value;
        const permissoes_adicionais = Array.from(document.querySelectorAll('.edit-gestao-perm-cb:checked')).map(cb => cb.value);

        if (!nome || nome.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'O nome deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return false;
        }
        if (senha && senha.length < 8) {
          window.UI.toast({ title: 'Atenção', message: 'A nova senha precisa ter pelo menos 8 caracteres.', type: 'warning' });
          return false;
        }

        const payload = {
          nome,
          email,
          perfil,
          setor_id: setor_id ? Number(setor_id) : null,
          status: status || 'ATIVO',
          permissoes_adicionais
        };
        if (senha && senha.length >= 8) {
          payload.senha = senha;
        }

        try {
          await window.API.updateUsuario(userId, payload);
          window.UI.toast({
            title: 'Usuário Atualizado',
            message: `Os dados e permissões de "${nome}" foram salvos com sucesso!`,
            type: 'success'
          });
          const container = document.getElementById('main-content');
          if (container) await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Atualizar',
            message: err.message || 'Não foi possível atualizar o usuário.',
            type: 'error'
          });
          return false;
        }
      }
    });

    setTimeout(() => {
      document.getElementById('btn-gerar-senha-edit-gestao')?.addEventListener('click', () => {
        const input = document.getElementById('edit-gestao-senha');
        if (input) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
          let pass = '';
          for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
          input.value = pass;
          input.type = 'text';
          window.UI.toast({ title: 'Senha Gerada', message: `Nova senha gerada: ${pass}`, type: 'info' });
        }
      });
      if (window.lucide) {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) window.lucide.createIcons({ root: modalContainer });
      }
    }, 50);
  },

  _toggleStatusUsuario(userId, novoStatus) {
    const item = this.items.find(u => Number(u.id) === Number(userId));
    const nome = item?.nome || 'Usuário';
    const isAtivar = novoStatus === 'ATIVO';

    window.UI.confirmModal({
      title: `${isAtivar ? 'Ativar' : 'Inativar'} Usuário`,
      message: isAtivar
        ? `Deseja reativar o acesso de "${nome}" ao sistema?`
        : `Deseja inativar o acesso de "${nome}"?`,
      confirmText: isAtivar ? 'Sim, Ativar' : 'Sim, Inativar',
      danger: !isAtivar,
      onConfirm: async () => {
        try {
          await window.API.updateUsuarioStatus(userId, novoStatus);
          window.UI.toast({
            title: `Status Atualizado`,
            message: `O status de "${nome}" foi alterado para ${novoStatus}.`,
            type: 'success'
          });
          const container = document.getElementById('main-content');
          if (container) await this.render(container);
        } catch (err) {
          window.UI.toast({
            title: 'Erro',
            message: err.message || 'Não foi possível alterar o status.',
            type: 'error'
          });
        }
      }
    });
  },

  _excluirUsuario(userId) {
    const item = this.items.find(u => Number(u.id) === Number(userId));
    const nome = item?.nome || 'Usuário';

    window.UI.confirmModal({
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja remover o usuário "${nome}"? Esta operação desativa o acesso mantendo o histórico de auditoria preservado.`,
      confirmText: 'Sim, Excluir',
      danger: true,
      onConfirm: async () => {
        try {
          await window.API.deleteUsuario(userId);
          window.UI.toast({
            title: 'Usuário Removido',
            message: `O usuário "${nome}" foi removido com sucesso.`,
            type: 'success'
          });
          const container = document.getElementById('main-content');
          if (container) await this.render(container);
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Excluir',
            message: err.message || 'Não foi possível remover o usuário.',
            type: 'error'
          });
        }
      }
    });
  },

  _openEditPreCadastroModal(userId) {
    const item = this.items.find(u => Number(u.id) === Number(userId));
    if (!item) return;

    const modalContent = `
      <form id="form-edit-pre-cad" class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <i data-lucide="edit-3" class="w-4 h-4 text-amber-600 shrink-0"></i>
          <span><strong>Edição da Solicitação:</strong> Corrija o nome, e-mail ou redefina a senha provisória do colaborador antes da aprovação do Administrador Geral.</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
          <input 
            type="text" 
            id="edit-pre-nome" 
            required 
            minlength="3" 
            value="${this._esc(item.nome)}" 
            placeholder="Ex: Mariana Vasconcelos Costa"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
          <input 
            type="email" 
            id="edit-pre-email" 
            required 
            value="${this._esc(item.email)}" 
            placeholder="Ex: mariana.costa@secult.es.gov.br"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold text-slate-700">Nova Senha Provisória (Opcional)</label>
            <button type="button" id="btn-gerar-senha-edit-pre" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
              <i data-lucide="sparkles" class="w-3 h-3"></i>
              <span>Gerar Senha</span>
            </button>
          </div>
          <input 
            type="password" 
            id="edit-pre-senha" 
            minlength="8" 
            placeholder="Deixe em branco para manter a senha atual"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
          />
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Editar Solicitação de Colaborador',
      subtitle: 'Altere os dados informados para este cadastro pendente.',
      contentHtml: modalContent,
      saveLabel: 'Salvar Alterações',
      onSave: async () => {
        const nome = document.getElementById('edit-pre-nome')?.value.trim();
        const email = document.getElementById('edit-pre-email')?.value.trim();
        const senha = document.getElementById('edit-pre-senha')?.value;

        if (!nome || nome.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Informe o nome completo (mínimo 3 caracteres).', type: 'warning' });
          return false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return false;
        }
        if (senha && senha.length < 8) {
          window.UI.toast({ title: 'Atenção', message: 'A senha precisa ter pelo menos 8 caracteres.', type: 'warning' });
          return false;
        }

        try {
          await window.API.updatePreCadastro(userId, { nome, email, senha: senha || undefined });
          window.UI.toast({
            title: 'Solicitação Atualizada',
            message: 'Os dados do colaborador foram alterados com sucesso!',
            type: 'success'
          });
          const container = document.getElementById('main-content');
          if (container) await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Salvar',
            message: err.message || 'Não foi possível atualizar a solicitação.',
            type: 'error'
          });
          return false;
        }
      }
    });

    setTimeout(() => {
      document.getElementById('btn-gerar-senha-edit-pre')?.addEventListener('click', () => {
        const input = document.getElementById('edit-pre-senha');
        if (input) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
          let pass = '';
          for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
          input.value = pass;
          input.type = 'text';
          window.UI.toast({ title: 'Senha Gerada', message: `Nova senha gerada: ${pass}`, type: 'info' });
        }
      });
      if (window.lucide) {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) window.lucide.createIcons({ root: modalContainer });
      }
    }, 50);
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
