/**
 * HUB ES+ / SECULT - Módulo de Advertências Disciplinares
 * Exclusivo para Administrador Geral (ADMIN), Administradores e Gestores.
 * Regra Central: É o Administrador Geral que possui competência institucional para
 * avaliar, homologar e ACEITAR as advertências disciplinares submetidas.
 */

window.AdvertenciasModule = {
  items: [],
  usuarios: [],
  filtroStatus: 'TODOS',
  filtroGravidade: 'TODOS',
  filtroBusca: '',

  async render(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const perfil = String(usuarioLogado?.perfil || '').toUpperCase().trim();
    const ehPermitido = ['ADMIN', 'ADMIN_GERAL', 'ADMINISTRADOR', 'ADMINISTRACAO', 'GESTOR'].includes(perfil)
      || window.Auth?.isAdmin()
      || window.Auth?.hasPermission('advertencias.visualizar');

    if (!ehPermitido) {
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Acesso Restrito',
        description: 'Este módulo é exclusivo para a Administração, Gestão e Administrador Geral.',
        actionLabel: 'Voltar ao Início',
        onActionClick: () => { window.location.hash = '#dashboard'; }
      });
      return;
    }

    container.innerHTML = window.UI.renderTableSkeleton(6, 6);

    try {
      const [resAdv, resUsu] = await Promise.all([
        window.API.getAdvertencias().catch(() => []),
        window.API.getUsuarios().catch(() => [])
      ]);

      this.items = Array.isArray(resAdv) ? resAdv : (resAdv?.data || []);
      this.usuarios = Array.isArray(resUsu) ? resUsu : (resUsu?.data || []);
      this._renderView(container);
    } catch (err) {
      console.error('[ADVERTENCIAS] Erro ao carregar dados:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Falha ao carregar advertências',
        description: err.message || 'Não foi possível carregar os registros disciplinares.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const ehAdminGeral = window.Auth?.isAdminGeral
      ? window.Auth.isAdminGeral()
      : ['ADMIN', 'ADMIN_GERAL'].includes(String(usuarioLogado?.perfil || '').toUpperCase().trim());

    // Contadores para KPIs
    const total = this.items.length;
    const pendentes = this.items.filter(i => i.status === 'PENDENTE').length;
    const aplicadas = this.items.filter(i => i.status === 'APLICADA').length;
    const revogadas = this.items.filter(i => i.status === 'REVOGADA').length;
    const rejeitadas = this.items.filter(i => i.status === 'REJEITADA').length;

    // Filtragem local
    const filtradas = this.items.filter(item => {
      const matchStatus = this.filtroStatus === 'TODOS' || item.status === this.filtroStatus;
      const matchGravidade = this.filtroGravidade === 'TODOS' || item.gravidade === this.filtroGravidade;
      const q = this.filtroBusca.toLowerCase().trim();
      const matchBusca = !q ||
        (item.colaborador_nome && item.colaborador_nome.toLowerCase().includes(q)) ||
        (item.motivo && item.motivo.toLowerCase().includes(q)) ||
        (item.descricao && item.descricao.toLowerCase().includes(q));
      return matchStatus && matchGravidade && matchBusca;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 tracking-wide uppercase">
                Governança & Disciplina
              </span>
              <span class="text-xs text-slate-400">• Homologação pelo Administrador Geral</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Gestão de Advertências</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ${ehAdminGeral 
                ? 'Painel de Homologação: Avalie, aceite ou rejeite advertências disciplinares solicitadas para os colaboradores' 
                : 'Registro e acompanhamento formal de medidas disciplinares sob apreciação do Administrador Geral'}
            </p>
          </div>
          <button id="btn-nova-advertencia" class="btn-primary bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            Registrar Advertência
          </button>
        </div>

        <!-- Banner de Destaque da Fila de Aceite para o Administrador Geral -->
        ${ehAdminGeral && pendentes > 0 ? `
          <div class="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400 dark:border-amber-600/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/30 shrink-0">
                <i data-lucide="scale" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Fila de Aceite do Administrador Geral
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white animate-pulse">
                    ${pendentes} aguardando seu aceite
                  </span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Existem advertências disciplinares pendentes que dependem exclusivamente do seu <strong>aceite formal</strong> para entrar em vigência oficial.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button id="btn-ver-pendentes-banner" class="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer">
                <i data-lucide="inbox" class="w-4 h-4"></i>
                Visualizar Fila de Aceite (${pendentes})
              </button>
            </div>
          </div>
        ` : ''}

        <!-- KPIs Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Geral</span>
              <div class="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300">
                <i data-lucide="files" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-slate-900 dark:text-white mt-2">${total}</p>
            <p class="text-[11px] text-slate-400 mt-1">Registros totais</p>
          </div>

          <div id="card-kpi-pendentes" class="p-4 rounded-2xl bg-white dark:bg-slate-800 border ${pendentes > 0 ? 'border-amber-400 dark:border-amber-600/80 bg-amber-50/30 dark:bg-amber-950/20 ring-2 ring-amber-400/20' : 'border-slate-200 dark:border-slate-700'} shadow-sm cursor-pointer transition-all hover:scale-[1.01]">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                ${ehAdminGeral ? 'Aguardando Seu Aceite' : 'Pendentes'}
              </span>
              <div class="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-700 dark:text-amber-300">
                <i data-lucide="clock" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">${pendentes}</p>
            <p class="text-[11px] text-slate-400 mt-1">
              ${ehAdminGeral ? 'Clique para aceitar' : 'Aguardando Admin Geral'}
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Aceitas / Aplicadas</span>
              <div class="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300">
                <i data-lucide="alert-octagon" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">${aplicadas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Homologadas pelo Admin Geral</p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rejeitadas</span>
              <div class="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-slate-600 dark:text-slate-300 mt-2">${rejeitadas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Não aceitas</p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Revogadas</span>
              <div class="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-300">
                <i data-lucide="undo-2" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">${revogadas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Anuladas formalmente</p>
          </div>
        </div>

        <!-- Filtros e Barra de Pesquisa -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button data-filtro-status="TODOS" class="px-3 py-1.5 rounded-xl transition-all cursor-pointer ${this.filtroStatus === 'TODOS' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Todas (${total})
            </button>
            <button data-filtro-status="PENDENTE" class="px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${this.filtroStatus === 'PENDENTE' ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/30' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              <span class="w-2 h-2 rounded-full ${pendentes > 0 ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}"></span>
              Aguardando Aceite (${pendentes})
            </button>
            <button data-filtro-status="APLICADA" class="px-3 py-1.5 rounded-xl transition-all cursor-pointer ${this.filtroStatus === 'APLICADA' ? 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-600/30' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Aceitas / Aplicadas (${aplicadas})
            </button>
            <button data-filtro-status="REJEITADA" class="px-3 py-1.5 rounded-xl transition-all cursor-pointer ${this.filtroStatus === 'REJEITADA' ? 'bg-slate-700 text-white font-bold' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Rejeitadas (${rejeitadas})
            </button>
            <button data-filtro-status="REVOGADA" class="px-3 py-1.5 rounded-xl transition-all cursor-pointer ${this.filtroStatus === 'REVOGADA' ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Revogadas (${revogadas})
            </button>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select id="select-filtro-gravidade" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
              <option value="TODOS" ${this.filtroGravidade === 'TODOS' ? 'selected' : ''}>Todas as Gravidades</option>
              <option value="LEVE" ${this.filtroGravidade === 'LEVE' ? 'selected' : ''}>Leve</option>
              <option value="MEDIA" ${this.filtroGravidade === 'MEDIA' ? 'selected' : ''}>Média</option>
              <option value="GRAVE" ${this.filtroGravidade === 'GRAVE' ? 'selected' : ''}>Grave</option>
            </select>

            <div class="relative w-full sm:w-64">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input 
                id="input-busca-advertencias" 
                type="text" 
                value="${this.filtroBusca}" 
                placeholder="Buscar colaborador ou infração..." 
                class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>
        </div>

        <!-- Tabela de Advertências -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="p-3.5">Colaborador Advertido</th>
                  <th class="p-3.5">Motivo / Infração</th>
                  <th class="p-3.5">Gravidade</th>
                  <th class="p-3.5">Status Formal</th>
                  <th class="p-3.5">Solicitante</th>
                  <th class="p-3.5">Data Ocorrência</th>
                  <th class="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                ${filtradas.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-10 text-center text-slate-400">
                      <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                      Nenhum registro de advertência localizado com os filtros selecionados.
                    </td>
                  </tr>
                ` : filtradas.map((item, idx) => {
                  const dataOcorr = item.data_ocorrencia 
                    ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR') 
                    : '-';

                  const badgeStatus = {
                    'PENDENTE': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                    'APLICADA': 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
                    'REJEITADA': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                    'REVOGADA': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  }[item.status] || 'bg-slate-100 text-slate-700';

                  const badgeGravidade = {
                    'LEVE': 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                    'MEDIA': 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                    'GRAVE': 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
                  }[item.gravidade] || 'bg-slate-100 text-slate-700';

                  const statusTexto = {
                    'PENDENTE': 'Aguardando Aceite',
                    'APLICADA': 'Aceita / Aplicada',
                    'REJEITADA': 'Rejeitada',
                    'REVOGADA': 'Revogada'
                  }[item.status] || item.status;

                  const nomeEscapado = (item.colaborador_nome || '').replace(/'/g, "\\'");
                  const ehPendente = item.status === 'PENDENTE';
                  const linhaDestaque = ehPendente && ehAdminGeral ? 'bg-amber-50/40 dark:bg-amber-950/15' : (idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-850/40' : '');

                  return `
                    <tr class="${linhaDestaque} hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td class="p-3.5">
                        <div class="font-bold text-slate-900 dark:text-white">${item.colaborador_nome}</div>
                        <div class="text-[11px] text-slate-400">${item.colaborador_email || item.colaborador_perfil || ''}</div>
                      </td>
                      <td class="p-3.5">
                        <div class="font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">${item.motivo}</div>
                        <div class="text-[11px] text-slate-400 max-w-xs truncate">${item.descricao}</div>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeGravidade}">
                          ${item.gravidade}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStatus}">
                          ${statusTexto}
                        </span>
                      </td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">
                        ${item.solicitante_nome}
                      </td>
                      <td class="p-3.5 text-slate-500 whitespace-nowrap">
                        ${dataOcorr}
                      </td>
                      <td class="p-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          ${ehAdminGeral && ehPendente ? `
                            <button onclick="window.AdvertenciasModule.aceitar(${item.id}, '${nomeEscapado}')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer" title="Aceitar Advertência Formalmente">
                              <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                              <span>Aceitar</span>
                            </button>
                            <button onclick="window.AdvertenciasModule.rejeitar(${item.id}, '${nomeEscapado}')" class="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition-all cursor-pointer" title="Rejeitar Solicitação">
                              <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                              <span>Rejeitar</span>
                            </button>
                          ` : ''}

                          <button onclick="window.AdvertenciasModule.abrirDetalhes(${item.id})" class="btn-action-table action-primary" title="Visualizar Detalhes">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                          </button>

                          ${ehAdminGeral && item.status === 'APLICADA' ? `
                            <button onclick="window.AdvertenciasModule.revogar(${item.id}, '${nomeEscapado}')" class="btn-action-table text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" title="Revogar Advertência">
                              <i data-lucide="undo-2" class="w-4 h-4"></i>
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
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    this._bindEvents(container);
  },

  _bindEvents(container) {
    container.querySelector('#btn-nova-advertencia')?.addEventListener('click', () => this._openFormModal(container));

    container.querySelector('#btn-ver-pendentes-banner')?.addEventListener('click', () => {
      this.filtroStatus = 'PENDENTE';
      this._renderView(container);
    });

    container.querySelector('#card-kpi-pendentes')?.addEventListener('click', () => {
      this.filtroStatus = 'PENDENTE';
      this._renderView(container);
    });

    container.querySelectorAll('[data-filtro-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroStatus = btn.getAttribute('data-filtro-status');
        this._renderView(container);
      });
    });

    container.querySelector('#select-filtro-gravidade')?.addEventListener('change', (e) => {
      this.filtroGravidade = e.target.value;
      this._renderView(container);
    });

    const inputBusca = container.querySelector('#input-busca-advertencias');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        this.filtroBusca = e.target.value;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this._renderView(container);
          const novoInput = container.querySelector('#input-busca-advertencias');
          if (novoInput) {
            novoInput.focus();
            novoInput.setSelectionRange(novoInput.value.length, novoInput.value.length);
          }
        }, 200);
      });
    }
  },

  abrirDetalhes(id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const usuarioLogado = window.Auth?.getUsuario();
    const ehAdminGeral = window.Auth?.isAdminGeral
      ? window.Auth.isAdminGeral()
      : ['ADMIN', 'ADMIN_GERAL'].includes(String(usuarioLogado?.perfil || '').toUpperCase().trim());

    const dataOcorr = item.data_ocorrencia ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR') : '-';
    const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-';
    const dataDecisao = item.data_decisao ? new Date(item.data_decisao).toLocaleString('pt-BR') : null;
    const ehPendente = item.status === 'PENDENTE';

    const contentHtml = `
      <div class="space-y-4 text-xs">
        ${ehPendente ? `
          <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3">
            <i data-lucide="scale" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></i>
            <div>
              <p class="font-bold text-amber-900 dark:text-amber-200">Aguardando Aceite do Administrador Geral</p>
              <p class="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Esta advertência foi registrada e aguarda homologação e aceite formal da Direção Geral para produzir efeitos disciplinares.
              </p>
            </div>
          </div>
        ` : ''}

        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-slate-400 font-medium">Colaborador Advertido:</span>
              <p class="font-bold text-slate-900 dark:text-white text-sm">${item.colaborador_nome}</p>
              <p class="text-[11px] text-slate-500">${item.colaborador_email || ''}</p>
            </div>
            <div>
              <span class="text-slate-400 font-medium">Situação & Gravidade:</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-bold uppercase tracking-wider text-slate-900 dark:text-white">${item.status}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700">${item.gravidade}</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Registrado em: ${dataCriacao}</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo / Infração Disciplinar:</label>
          <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium">
            ${item.motivo}
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição Circunstanciada dos Fatos:</label>
          <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            ${item.descricao}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <span class="text-slate-400 font-medium">Solicitante da Medida:</span>
            <p class="font-semibold text-slate-800 dark:text-slate-200">${item.solicitante_nome}</p>
            <p class="text-[10px] text-slate-500">Data do fato: ${dataOcorr}</p>
          </div>
          <div>
            <span class="text-slate-400 font-medium">Homologação / Aceite:</span>
            <p class="font-semibold text-slate-800 dark:text-slate-200">${item.homologador_nome || 'Pendente de homologação'}</p>
            <p class="text-[10px] text-slate-500">${dataDecisao ? `Decidido em: ${dataDecisao}` : 'Aguardando decisão do Admin Geral'}</p>
          </div>
        </div>

        ${item.motivo_decisao ? `
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Parecer Institucional / Motivo da Decisão:</label>
            <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              ${item.motivo_decisao}
            </div>
          </div>
        ` : ''}

        <!-- Se for o Administrador Geral e estiver PENDENTE, exibe bloco de decisão direta no modal -->
        ${ehAdminGeral && ehPendente ? `
          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <label class="block font-bold text-slate-800 dark:text-slate-200">
              Parecer / Despacho do Administrador Geral:
            </label>
            <textarea id="txt-parecer-decisao-modal" rows="2" placeholder="Observações para o aceite ou recusa..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">Aceita e homologada formalmente pelo Administrador Geral.</textarea>
            
            <div class="flex items-center justify-end gap-2 pt-2">
              <button id="btn-modal-rejeitar" type="button" class="px-4 py-2 text-xs font-bold rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
                Rejeitar Solicitação
              </button>
              <button id="btn-modal-aceitar" type="button" class="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                Aceitar Advertência Formalmente
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    window.UI.openModal({
      title: `Advertência #${item.id}`,
      subtitle: `Registro disciplinar do colaborador ${item.colaborador_nome}`,
      contentHtml: contentHtml,
      saveLabel: null
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (ehAdminGeral && ehPendente) {
      const modalEl = document.getElementById('global-modal');
      modalEl?.querySelector('#btn-modal-aceitar')?.addEventListener('click', () => {
        const parecer = (modalEl.querySelector('#txt-parecer-decisao-modal')?.value || '').trim();
        window.UI.closeModal();
        this.aceitar(item.id, item.colaborador_nome, parecer);
      });

      modalEl?.querySelector('#btn-modal-rejeitar')?.addEventListener('click', () => {
        window.UI.closeModal();
        this.rejeitar(item.id, item.colaborador_nome);
      });
    }
  },

  _openFormModal(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const ehAdminGeral = window.Auth?.isAdminGeral
      ? window.Auth.isAdminGeral()
      : ['ADMIN', 'ADMIN_GERAL'].includes(String(usuarioLogado?.perfil || '').toUpperCase().trim());

    // Filtrar apenas colaboradores ativos para advertência (exclui o próprio usuário logado)
    const colaboradores = this.usuarios.filter(u => Number(u.id) !== Number(usuarioLogado?.id));
    const dataHoje = new Date().toISOString().slice(0, 10);

    const contentHtml = `
      <form id="form-advertencia" class="space-y-4">
        <div class="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5"></i>
          <div>
            <strong>Fluxo Institucional de Aceite:</strong>
            ${ehAdminGeral 
              ? ' Como <strong>Administrador Geral</strong>, você pode registrar para análise na fila de aceite ou homologar imediatamente no prontuário do colaborador.' 
              : ' Esta advertência entrará com status <strong>PENDENTE</strong> e dependerá do <strong>aceite formal do Administrador Geral</strong> para ter validade oficial.'}
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Colaborador Advertido *</label>
          <select name="colaborador_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            <option value="">Selecione o colaborador...</option>
            ${colaboradores.map(u => `
              <option value="${u.id}">${u.nome} (${u.perfil || 'Colaborador'}) - ${u.email}</option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gravidade da Infração *</label>
            <select name="gravidade" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="LEVE">Leve (Orientação / Desatenção pontual)</option>
              <option value="MEDIA" selected>Média (Descumprimento de norma operacional)</option>
              <option value="GRAVE">Grave (Conduta grave / Reincidência)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Ocorrência / Fato *</label>
            <input 
              type="date" 
              name="data_ocorrencia" 
              required 
              value="${dataHoje}" 
              max="${dataHoje}"
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo / Infração Disciplinar *</label>
          <input 
            type="text" 
            name="motivo" 
            required 
            minlength="3" 
            placeholder="Ex: Atraso recorrente injustificado ou descumprimento de norma de segurança" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição Circunstanciada dos Fatos *</label>
          <textarea 
            name="descricao" 
            required 
            minlength="5" 
            rows="4" 
            placeholder="Relate detalhadamente o ocorrido, locais, testemunhas ou impactos causados..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          ></textarea>
        </div>

        ${ehAdminGeral ? `
          <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">Aceitar no mesmo ato</span>
              <span class="block text-[11px] text-slate-500">Oficializar como APLICADA imediatamente pelo Administrador Geral</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="aceitar_imediatamente" value="1" class="sr-only peer">
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        ` : ''}
      </form>
    `;

    window.UI.openModal({
      title: ehAdminGeral ? 'Registrar Advertência Disciplinar' : 'Solicitar Advertência Disciplinar',
      subtitle: 'Controle corporativo de conduta e governança do HUB ES+',
      contentHtml: contentHtml,
      saveLabel: 'Salvar Registro',
      onSave: async () => {
        const form = document.getElementById('form-advertencia');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const colaborador_id = Number(formData.get('colaborador_id'));
        const gravidade = formData.get('gravidade');
        const data_ocorrencia = formData.get('data_ocorrencia');
        const motivo = (formData.get('motivo') || '').trim();
        const descricao = (formData.get('descricao') || '').trim();
        const aceitar_imediatamente = formData.get('aceitar_imediatamente') === '1';

        if (!colaborador_id) {
          window.UI.toast({ title: 'Atenção', message: 'Selecione o colaborador advertido.', type: 'warning' });
          return false;
        }

        try {
          await window.API.createAdvertencia({
            colaborador_id,
            gravidade,
            data_ocorrencia,
            motivo,
            descricao,
            aceitar_imediatamente
          });

          window.UI.toast({
            title: 'Sucesso',
            message: aceitar_imediatamente
              ? 'Advertência registrada e aplicada com sucesso.'
              : 'Advertência registrada. Enviada para a fila de aceite do Administrador Geral.'
          });

          await this.render(container);
          return true;
        } catch (err) {
          console.error('[ADVERTENCIAS] Erro ao salvar:', err);
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao salvar advertência.', type: 'error' });
          return false;
        }
      }
    });
  },

  aceitar(id, nomeColaborador, parecerPredefinido) {
    const modalHtml = `
      <div class="space-y-3 text-xs">
        <p class="text-slate-600 dark:text-slate-300">
          Você está formalizando o <strong>aceite institucional</strong> da advertência do colaborador <strong>${nomeColaborador}</strong>.
          Após o seu aceite, a advertência será considerada <strong>APLICADA</strong> e terá validade oficial.
        </p>
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Parecer / Termo de Aceite do Administrador Geral:</label>
          <textarea id="txt-parecer-aceite" rows="2" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">${parecerPredefinido || 'Aceita e homologada formalmente pelo Administrador Geral.'}</textarea>
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Aceitar Advertência Disciplinar?',
      subtitle: `Colaborador: ${nomeColaborador}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar e Aceitar Advertência',
      onSave: async () => {
        const parecer = (document.getElementById('txt-parecer-aceite')?.value || '').trim();
        try {
          await window.API.aceitarAdvertencia(id, parecer);
          window.UI.toast({ title: 'Advertência Aceita', message: 'A advertência foi homologada e aplicada com sucesso.' });
          await this.render(document.getElementById('main-content'));
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao aceitar advertência.', type: 'error' });
          return false;
        }
      }
    });
  },

  rejeitar(id, nomeColaborador) {
    const modalHtml = `
      <div class="space-y-3 text-xs">
        <p class="text-slate-600 dark:text-slate-300">
          Informe o motivo institucional pelo qual a solicitação de advertência para <strong>${nomeColaborador}</strong> está sendo rejeitada:
        </p>
        <textarea id="txt-motivo-rejeicao" rows="3" required placeholder="Justificativa da não aprovação..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"></textarea>
      </div>
    `;

    window.UI.openModal({
      title: 'Rejeitar Solicitação de Advertência',
      subtitle: `Colaborador: ${nomeColaborador}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar Rejeição',
      onSave: async () => {
        const txt = (document.getElementById('txt-motivo-rejeicao')?.value || '').trim();
        if (txt.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Preencha a justificativa da rejeição.', type: 'warning' });
          return false;
        }

        try {
          await window.API.rejeitarAdvertencia(id, txt);
          window.UI.toast({ title: 'Solicitação Rejeitada', message: 'A solicitação foi arquivada como rejeitada.', type: 'warning' });
          await this.render(document.getElementById('main-content'));
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao rejeitar solicitação.', type: 'error' });
          return false;
        }
      }
    });
  },

  revogar(id, nomeColaborador) {
    const modalHtml = `
      <div class="space-y-3 text-xs">
        <p class="text-slate-600 dark:text-slate-300">
          Informe a justificativa institucional para revogar a advertência de <strong>${nomeColaborador}</strong>:
        </p>
        <textarea id="txt-motivo-revogacao" rows="3" required placeholder="Ex: Cumprimento de termo de ajustamento de conduta ou retratação formal..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"></textarea>
      </div>
    `;

    window.UI.openModal({
      title: 'Revogar Advertência Aplicada',
      subtitle: `Colaborador: ${nomeColaborador}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar Revogação',
      onSave: async () => {
        const txt = (document.getElementById('txt-motivo-revogacao')?.value || '').trim();
        if (txt.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Preencha a justificativa da revogação.', type: 'warning' });
          return false;
        }

        try {
          await window.API.revogarAdvertencia(id, txt);
          window.UI.toast({ title: 'Advertência Revogada', message: 'A advertência foi revogada com sucesso.' });
          await this.render(document.getElementById('main-content'));
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao revogar advertência.', type: 'error' });
          return false;
        }
      }
    });
  }
};
