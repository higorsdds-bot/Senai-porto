/**
 * HUB ES+ - Módulo de Auditoria e Governança (auditoria.js)
 * Painel Administrativo com controle de acesso estrito a Administradores (ADMIN).
 * Recursos:
 * 1. Indicadores e Métricas de Governança
 * 2. Gestão e Aprovação de Solicitações de Cadastro (Status PENDENTE)
 * 3. Usuários Conectados Online em Tempo Real (Heartbeat)
 * 4. Listagem Geral de Usuários e Histórico Individual de Ações Auditadas
 * 5. Trilha Geral de Logs de Auditoria do Sistema
 */

window.Modules = window.Modules || {};

const AuditoriaModule = {
  _abaAtiva: 'solicitacoes', // 'solicitacoes' | 'online' | 'usuarios' | 'logs'
  _timerAutoRefresh: null,

  async render(container) {
    // Verificação de permissão no frontend (o backend já valida estritamente no banco)
    if (!window.Auth?.isAdmin()) {
      container.innerHTML = `
        <div class="max-w-md mx-auto my-16 bg-white rounded-3xl border border-rose-200 p-8 shadow-hub-md text-center">
          <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold">
            <i data-lucide="shield-alert" class="w-7 h-7"></i>
          </div>
          <h3 class="text-base font-extrabold text-slate-900">Acesso Restrito</h3>
          <p class="text-xs text-slate-500 mt-2 leading-relaxed">
            O módulo de Auditoria é restrito exclusivamente a usuários com perfil <strong>Administrador (ADMIN)</strong>.
          </p>
          <a href="#dashboard" class="inline-block mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all">
            Voltar ao Dashboard
          </a>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <!-- HEADER DO MÓDULO -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] uppercase tracking-wider">
                Controle de Acesso Admin
              </span>
            </div>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight mt-1">Painel de Auditoria & Governança</h2>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">
              Monitoramento em tempo real de acessos, histórico de ações e gestão de novos cadastros.
            </p>
          </div>
          <button id="btn-refresh-auditoria"
            class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
            <i data-lucide="refresh-cw" class="w-4 h-4 text-blue-600"></i> Atualizar Dados
          </button>
        </div>

        <!-- CARDS DE MÉTRICAS RÁPIDAS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="auditoria-kpis">
          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-hub-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuários Online</span>
              <div class="text-2xl font-black text-slate-900 mt-1" id="kpi-online">--</div>
              <span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ativos nos últimos 5 min
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="radio" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-hub-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cadastros Pendentes</span>
              <div class="text-2xl font-black text-amber-600 mt-1" id="kpi-pendentes">--</div>
              <span class="text-[10px] text-amber-600 font-bold mt-0.5" id="kpi-pendentes-desc">Aguardando aprovação</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <i data-lucide="user-check" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-hub-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</span>
              <div class="text-2xl font-black text-slate-900 mt-1" id="kpi-total-usuarios">--</div>
              <span class="text-[10px] text-slate-400 font-medium mt-0.5">Cadastrados no banco</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="users" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-hub-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ações Auditadas</span>
              <div class="text-2xl font-black text-slate-900 mt-1" id="kpi-total-logs">--</div>
              <span class="text-[10px] text-slate-400 font-medium mt-0.5">Eventos registrados</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i data-lucide="shield" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <!-- NAVEGAÇÃO POR ABAS -->
        <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button type="button" data-tab="solicitacoes"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-blue-600 border-blue-600">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Solicitações de Cadastro</span>
            <span id="badge-aba-pendentes" class="hidden px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">0</span>
          </button>
          <button type="button" data-tab="online"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800">
            <i data-lucide="activity" class="w-4 h-4"></i>
            <span>Usuários Online</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>
          <button type="button" data-tab="usuarios"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Todos os Usuários & Histórico</span>
          </button>
          <button type="button" data-tab="logs"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Trilha de Auditoria (Logs)</span>
          </button>
        </div>

        <!-- CONTEÚDO DAS ABAS -->
        <div id="aba-conteudo-solicitacoes" class="tab-content space-y-4"></div>
        <div id="aba-conteudo-online" class="tab-content hidden space-y-4"></div>
        <div id="aba-conteudo-usuarios" class="tab-content hidden space-y-4"></div>
        <div id="aba-conteudo-logs" class="tab-content hidden space-y-4"></div>
      </div>

      <!-- MODAL DE HISTÓRICO INDIVIDUAL DE USUÁRIO -->
      <div id="modal-historico-usuario" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto">
        <div id="conteudo-historico-usuario" class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"></div>
      </div>

      <!-- MODAL DE APROVAÇÃO COM ESCOLHA DE PERFIL -->
      <div id="modal-aprovar-usuario" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i> Liberar Acesso ao Usuário
            </h3>
            <button type="button" onclick="document.getElementById('modal-aprovar-usuario').classList.add('hidden')" class="p-1 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <form id="form-aprovar-usuario" class="space-y-4">
            <input type="hidden" id="aprovar-user-id">
            <p class="text-xs text-slate-600 leading-relaxed">
              Você está aprovando o acesso de <strong id="aprovar-user-nome" class="text-slate-900"></strong> (<span id="aprovar-user-email"></span>).
            </p>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1">Perfil de Permissões</label>
              <select id="aprovar-user-perfil" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold">
                <option value="OPERADOR" selected>OPERADOR (Acesso Padrão às Rotinas)</option>
                <option value="GESTOR">GESTOR (Gestão Operacional e Aprovações)</option>
                <option value="LIMPEZA">LIMPEZA (Solicitação de Materiais de Consumo)</option>
                <option value="ADMINISTRACAO">ADMINISTRAÇÃO (Estoque, Agenda e Entrada de Pedidos)</option>
                <option value="ADMIN">ADMINISTRADOR GERAL (Acesso Total e Auditoria)</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onclick="document.getElementById('modal-aprovar-usuario').classList.add('hidden')"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" id="btn-confirmar-aprovacao"
                class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer">
                Confirmar Liberação
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this._bind(container);
    await this._carregarTudo(container);

    if (window.lucide) lucide.createIcons();
  },

  _bind(container) {
    // Botão de refresh manual
    container.querySelector('#btn-refresh-auditoria')?.addEventListener('click', () => {
      this._carregarTudo(container);
    });

    // Alternador de abas
    const tabs = container.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this._abaAtiva = target;

        tabs.forEach(t => {
          t.className = 'tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800';
        });
        btn.className = 'tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-blue-600 border-blue-600';

        container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        container.querySelector(`#aba-conteudo-${target}`)?.classList.remove('hidden');

        if (window.lucide) lucide.createIcons();
      });
    });

    // Form de aprovação
    const formAprovar = container.querySelector('#form-aprovar-usuario');
    if (formAprovar) {
      formAprovar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = container.querySelector('#aprovar-user-id').value;
        const perfil = container.querySelector('#aprovar-user-perfil').value;
        const btn = container.querySelector('#btn-confirmar-aprovacao');

        btn.disabled = true;
        btn.textContent = 'Liberando acesso...';

        try {
          await window.API.aprovarSolicitacaoCadastro(id, { perfil });
          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Cadastro Aprovado',
              message: 'O acesso do usuário foi liberado com sucesso!',
              type: 'success'
            });
          }
          document.getElementById('modal-aprovar-usuario')?.classList.add('hidden');
          await this._carregarTudo(container);
        } catch (err) {
          alert(err.message || 'Erro ao aprovar cadastro.');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Confirmar Liberação';
        }
      });
    }
  },

  async _carregarTudo(container) {
    await Promise.all([
      this._carregarSolicitacoes(container),
      this._carregarOnline(container),
      this._carregarUsuarios(container),
      this._carregarLogs(container)
    ]);
    if (window.lucide) lucide.createIcons();
  },

  // ─── ABA 1: SOLICITAÇÕES DE CADASTRO (STATUS PENDENTE) ────────────────────
  async _carregarSolicitacoes(container) {
    const wrap = container.querySelector('#aba-conteudo-solicitacoes');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaSolicitacoes();
      const pendentes = Array.isArray(res) ? res : (res?.data || []);

      // Atualiza KPI e badge
      const kpiPendentes = container.querySelector('#kpi-pendentes');
      const badgeAba = container.querySelector('#badge-aba-pendentes');
      if (kpiPendentes) kpiPendentes.textContent = pendentes.length;
      if (badgeAba) {
        badgeAba.textContent = pendentes.length;
        if (pendentes.length > 0) badgeAba.classList.remove('hidden');
        else badgeAba.classList.add('hidden');
      }

      if (!pendentes.length) {
        wrap.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-hub-sm">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="check-check" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-extrabold text-slate-800">Nenhuma solicitação pendente</h4>
            <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Todas as contas solicitadas já foram analisadas. Novos cadastros aparecerão aqui automaticamente.
            </p>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 shrink-0"></i>
            <div>
              <h5 class="text-xs font-bold text-amber-900">Solicitações de Acesso Pendentes (${pendentes.length})</h5>
              <p class="text-[11px] text-amber-700">Usuários cadastrados na tela de login que necessitam de aprovação administrativa para acessar.</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Usuário</th>
                  <th class="py-3 px-4">E-mail</th>
                  <th class="py-3 px-4">Setor</th>
                  <th class="py-3 px-4">Data do Pedido</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${pendentes.map(u => `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        ${this._iniciais(u.nome)}
                      </div>
                      <span>${this._esc(u.nome)}</span>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-slate-600">${this._esc(u.email)}</td>
                    <td class="py-3.5 px-4 text-slate-500">${this._esc(u.setor_nome || 'Geral / Não atribuído')}</td>
                    <td class="py-3.5 px-4 text-slate-400 font-mono">${u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PENDENTE
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-2">
                      <button type="button" onclick="AuditoriaModule.abrirModalAprovacao(${u.id}, '${this._esc(u.nome)}', '${this._esc(u.email)}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i> Liberar Acesso
                      </button>
                      <button type="button" onclick="AuditoriaModule.rejeitarCadastro(${u.id}, '${this._esc(u.nome)}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i> Rejeitar
                      </button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500 bg-red-50 rounded-2xl">${this._esc(err.message || 'Erro ao carregar solicitações.')}</div>`;
    }
  },

  abrirModalAprovacao(id, nome, email) {
    const modal = document.getElementById('modal-aprovar-usuario');
    if (!modal) return;
    document.getElementById('aprovar-user-id').value = id;
    document.getElementById('aprovar-user-nome').textContent = nome;
    document.getElementById('aprovar-user-email').textContent = email;
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  async rejeitarCadastro(id, nome) {
    if (!confirm(`Deseja realmente rejeitar a solicitação de cadastro do usuário "${nome}"?`)) return;

    try {
      await window.API.rejeitarSolicitacaoCadastro(id);
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Solicitação Rejeitada',
          message: `O cadastro do usuário "${nome}" foi rejeitado.`,
          type: 'info'
        });
      }
      const container = document.getElementById('main-content');
      if (container) await this._carregarTudo(container);
    } catch (err) {
      alert(err.message || 'Erro ao rejeitar cadastro.');
    }
  },

  // ─── ABA 2: USUÁRIOS ONLINE EM TEMPO REAL ──────────────────────────────────
  async _carregarOnline(container) {
    const wrap = container.querySelector('#aba-conteudo-online');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaUsuariosOnline();
      const onlineList = Array.isArray(res) ? res : (res?.data || []);

      const kpiOnline = container.querySelector('#kpi-online');
      if (kpiOnline) kpiOnline.textContent = onlineList.length;

      if (!onlineList.length) {
        wrap.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-hub-sm">
            <i data-lucide="wifi-off" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-700">Nenhum usuário online no momento</h4>
            <p class="text-xs text-slate-400 mt-1">Nenhum heartbeat foi detectado nos últimos 5 minutos.</p>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${onlineList.map(u => `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-hub-sm flex items-start gap-3 relative overflow-hidden">
              <span class="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-bl-lg"></span>
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
                ${this._iniciais(u.nome)}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <h4 class="text-xs font-extrabold text-slate-900 truncate">${this._esc(u.nome)}</h4>
                </div>
                <span class="text-[11px] font-mono text-slate-500 block truncate">${this._esc(u.email)}</span>
                <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${this._esc(u.perfil)}</span>
                  <span>${u.setor_nome ? this._esc(u.setor_nome) : 'Geral'}</span>
                  <span class="ml-auto font-mono text-emerald-600 font-bold">Online</span>
                </div>
              </div>
            </div>`).join('')}
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar usuários online.')}</div>`;
    }
  },

  // ─── ABA 3: TODOS OS USUÁRIOS & HISTÓRICO DE AÇÕES ────────────────────────
  async _carregarUsuarios(container) {
    const wrap = container.querySelector('#aba-conteudo-usuarios');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaUsuarios();
      const usuarios = Array.isArray(res) ? res : (res?.data || []);

      const kpiTotal = container.querySelector('#kpi-total-usuarios');
      if (kpiTotal) kpiTotal.textContent = usuarios.length;

      wrap.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
          <input id="input-filtro-usuarios" type="text" placeholder="Filtrar por nome ou e-mail..."
            class="rounded-xl border border-slate-200 px-4 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 w-full sm:w-72">
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Nome</th>
                  <th class="py-3 px-4">E-mail</th>
                  <th class="py-3 px-4">Perfil</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Ações Auditadas</th>
                  <th class="py-3 px-4">Último Acesso</th>
                  <th class="py-3 px-4 text-right">Auditoria</th>
                </tr>
              </thead>
              <tbody id="tbody-usuarios" class="divide-y divide-slate-100">
                ${usuarios.map(u => `
                  <tr class="hover:bg-slate-50/60 transition-colors user-row" data-nome="${this._esc(u.nome).toLowerCase()}" data-email="${this._esc(u.email).toLowerCase()}">
                    <td class="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-bold">
                        ${this._iniciais(u.nome)}
                      </div>
                      <span>${this._esc(u.nome)}</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-600">${this._esc(u.email)}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${u.perfil === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'}">
                        ${this._esc(u.perfil)}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${this._statusBadgeUser(u.status)}">
                        ${this._esc(u.status)}
                      </span>
                    </td>
                    <td class="py-3 px-4 font-bold text-slate-700">
                      <span class="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                        ${u.total_acoes || 0} ações
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      ${u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca'}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button type="button" onclick="AuditoriaModule.abrirHistoricoUsuario(${u.id})"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl font-bold text-xs transition-all cursor-pointer">
                        <i data-lucide="history" class="w-3.5 h-3.5"></i> Histórico
                      </button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      // Filtro local instantâneo
      container.querySelector('#input-filtro-usuarios')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        container.querySelectorAll('.user-row').forEach(row => {
          const nome = row.dataset.nome || '';
          const email = row.dataset.email || '';
          row.style.display = (nome.includes(q) || email.includes(q)) ? '' : 'none';
        });
      });
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar lista de usuários.')}</div>`;
    }
  },

  async abrirHistoricoUsuario(id) {
    const modal = document.getElementById('modal-historico-usuario');
    const conteudo = document.getElementById('conteudo-historico-usuario');
    if (!modal || !conteudo) return;

    modal.classList.remove('hidden');
    conteudo.innerHTML = '<div class="py-12 text-center text-xs text-slate-400">Carregando trilha de auditoria do usuário...</div>';

    try {
      const res = await window.API.getAuditoriaHistoricoUsuario(id);
      const data = res?.data || res;
      const u = data.usuario;
      const acoes = data.acoes || [];

      conteudo.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Atividades</span>
              <h3 class="text-base font-extrabold text-slate-900 mt-0.5">${this._esc(u.nome)}</h3>
              <p class="text-xs font-mono text-slate-500">${this._esc(u.email)} • Perfil: ${this._esc(u.perfil)}</p>
            </div>
            <button type="button" onclick="document.getElementById('modal-historico-usuario').classList.add('hidden')"
              class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-700">Registros Recentes (${acoes.length})</h4>
            ${!acoes.length ? `
              <p class="text-xs text-slate-400 py-6 text-center">Nenhuma ação registrada para este usuário.</p>` : `
              <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                ${acoes.map(a => `
                  <div class="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors text-xs flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200/80">${this._esc(a.acao)}</span>
                      <span class="text-[10px] font-mono text-slate-400">${a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : ''}</span>
                    </div>
                    ${a.descricao ? `<p class="text-slate-600 mt-1">${this._esc(a.descricao)}</p>` : ''}
                    <div class="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/50">
                      ${a.entidade ? `<span>Entidade: ${this._esc(a.entidade)} #${a.entidade_id || ''}</span>` : ''}
                      ${a.ip ? `<span>IP: ${this._esc(a.ip)}</span>` : ''}
                    </div>
                  </div>`).join('')}
              </div>`}
          </div>

          <div class="pt-3 border-t border-slate-100 text-right">
            <button type="button" onclick="document.getElementById('modal-historico-usuario').classList.add('hidden')"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
              Fechar
            </button>
          </div>
        </div>`;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      conteudo.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar histórico.')}</div>`;
    }
  },

  // ─── ABA 4: TRILHA GERAL DE AUDITORIA (LOGS) ──────────────────────────────
  async _carregarLogs(container) {
    const wrap = container.querySelector('#aba-conteudo-logs');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaLogs({ limit: 50 });
      const logs = res?.data || [];
      const total = res?.meta?.total || logs.length;

      const kpiLogs = container.querySelector('#kpi-total-logs');
      if (kpiLogs) kpiLogs.textContent = total;

      wrap.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <h4 class="text-xs font-extrabold text-slate-900">Últimos Eventos Auditados (${total} registros)</h4>
            <span class="text-[11px] text-slate-400">Exibindo os 50 mais recentes</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Data/Hora</th>
                  <th class="py-3 px-4">Ação</th>
                  <th class="py-3 px-4">Usuário</th>
                  <th class="py-3 px-4">Descrição</th>
                  <th class="py-3 px-4">IP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                ${logs.map(l => `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      ${l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : ''}
                    </td>
                    <td class="py-2.5 px-4 font-bold text-slate-800">
                      <span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        ${this._esc(l.acao)}
                      </span>
                    </td>
                    <td class="py-2.5 px-4 text-slate-700 font-sans font-bold">
                      ${this._esc(l.usuario_nome || 'Sistema')}
                    </td>
                    <td class="py-2.5 px-4 text-slate-600 font-sans max-w-md truncate">
                      ${this._esc(l.descricao || '-')}
                    </td>
                    <td class="py-2.5 px-4 text-slate-400 text-[10px]">
                      ${this._esc(l.ip || '-')}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar logs.')}</div>`;
    }
  },

  _statusBadgeUser(status) {
    const s = String(status).toUpperCase();
    if (s === 'ATIVO') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'PENDENTE') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (s === 'BLOQUEADO') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
  },

  _iniciais(nome) {
    if (!nome) return 'ES';
    const partes = String(nome).trim().split(' ').filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

window.AuditoriaModule = AuditoriaModule;
window.Modules.auditoria = AuditoriaModule;
