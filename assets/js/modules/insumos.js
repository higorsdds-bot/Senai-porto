/**
 * HUB ES+ - Módulo 3: Controle de Insumos & Histórico de Inventário
 * Rastreabilidade completa de movimentações (Entrada, Saída, Ajuste, Transferência).
 * Registra data/hora exata, local de origem, local de destino e responsável.
 */

window.InsumosModule = {
  activeTab: 'estoque', // 'estoque' | 'historico'
  items: [],
  setores: [],
  historico: [],
  searchTerm: '',
  setorFilter: '',
  alertOnlyFilter: false,
  currentPage: 1,
  pageSize: 8,

  // Filtros da aba de Histórico
  filtroHistTipo: 'TODOS',
  filtroHistInsumo: '',
  filtroHistBusca: '',
  histPage: 1,
  histPageSize: 10,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(6, 6);

    try {
      const podeVerSetores = window.Auth?.hasPermission('setores.visualizar');
      const [insumosRes, setoresRes, histRes] = await Promise.allSettled([
        window.API.getInsumos(),
        podeVerSetores ? window.API.getSetores() : Promise.resolve([]),
        window.API.getHistoricoInsumos().catch(() => [])
      ]);

      this.items = insumosRes.status === 'fulfilled' && Array.isArray(insumosRes.value) ? insumosRes.value : [];
      this.setores = setoresRes.status === 'fulfilled' && Array.isArray(setoresRes.value) ? setoresRes.value : [];
      this.historico = histRes.status === 'fulfilled' && Array.isArray(histRes.value) ? histRes.value : [];

      this._renderView(container);
    } catch (err) {
      console.error('[INSUMOS] Erro ao carregar dados:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro de almoxarifado',
        description: 'Não foi possível carregar os itens e o histórico do almoxarifado.',
        actionLabel: 'Recarregar',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const canCreate = window.Auth?.hasPermission('insumos.criar');
    const totalCriticos = this.items.filter(i => i.quantidade <= i.estoque_minimo).length;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 tracking-wide uppercase">
                Almoxarifado & Estoque
              </span>
              ${totalCriticos > 0 ? `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  ${totalCriticos} em nível crítico
                </span>
              ` : ''}
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Gestão de Insumos & Inventário</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle de consumo, níveis de suprimento e rastreabilidade total de movimentações</p>
          </div>
          ${canCreate ? `
            <button id="btn-novo-insumo" class="btn-primary">
              <i data-lucide="package-plus" class="w-4 h-4"></i>
              Cadastrar Insumo
            </button>
          ` : ''}
        </div>

        <!-- Abas de Navegação -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
          <button id="tab-btn-estoque" class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            this.activeTab === 'estoque' 
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }">
            <i data-lucide="boxes" class="w-4 h-4"></i>
            Materiais & Estoque Atual (${this.items.length})
          </button>
          <button id="tab-btn-historico" class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            this.activeTab === 'historico' 
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }">
            <i data-lucide="history" class="w-4 h-4"></i>
            Histórico & Rastreabilidade (${this.historico.length})
          </button>
        </div>

        <!-- Conteúdo da Aba Ativa -->
        <div id="insumos-tab-content">
          ${this.activeTab === 'estoque' ? this._renderTabEstoque() : this._renderTabHistorico()}
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    this._bindEvents(container);
  },

  _renderTabEstoque() {
    const canEdit = window.Auth.hasPermission('insumos.editar');
    const canDelete = window.Auth.hasPermission('insumos.excluir');
    const canStockOut = window.Auth.hasPermission('insumos.baixar');
    const canMoveStock = window.Auth.hasPermission('insumos.movimentar');

    let filtered = this.items.filter(item => {
      const matchNome = (item.nome || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchSetor = !this.setorFilter || Number(item.setor_id) === Number(this.setorFilter);
      const isCritical = item.quantidade <= item.estoque_minimo;
      const matchAlert = !this.alertOnlyFilter || isCritical;
      return matchNome && matchSetor && matchAlert;
    });

    const totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    return `
      <div class="space-y-4">
        <!-- Barra de Busca e Filtros -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-insumo" 
              type="text" 
              placeholder="Buscar insumo por nome..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <label class="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input type="checkbox" id="check-alerta-insumo" ${this.alertOnlyFilter ? 'checked' : ''} class="rounded text-rose-600 focus:ring-rose-500">
              <span>Apenas Nível Crítico</span>
            </label>

            ${this.setores.length ? `
              <select id="select-filtro-setor-insumo" class="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Todos os Setores</option>
                ${this.setores.map(s => `
                  <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
                `).join('')}
              </select>
            ` : ''}
          </div>
        </div>

        <!-- Tabela de Insumos -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum insumo encontrado',
            description: 'Nenhum material atende aos filtros de busca ou estoque selecionados.',
            actionLabel: window.Auth.hasPermission('insumos.criar') ? 'Novo Insumo' : null,
            onActionClick: () => this._openFormModal(document.getElementById('main-content'))
          })
          : `
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="p-3.5">ID</th>
                    <th class="p-3.5">Material / Insumo</th>
                    <th class="p-3.5">Qtd em Estoque</th>
                    <th class="p-3.5">Estoque Mínimo</th>
                    <th class="p-3.5">Setor Atendido</th>
                    <th class="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                  ${paginatedItems.map(item => {
                    const isCritical = item.quantidade <= item.estoque_minimo;
                    const setor = this.setores.find(s => Number(s.id) === Number(item.setor_id))?.nome || item.setor_nome || 'Setor Geral';
                    return `
                      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3.5 font-mono text-slate-400 font-medium">#${item.id}</td>
                        <td class="p-3.5">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg ${isCritical ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'} flex items-center justify-center shrink-0">
                              <i data-lucide="${isCritical ? 'alert-triangle' : 'box'}" class="w-4 h-4"></i>
                            </div>
                            <div>
                              <span class="font-bold text-slate-900 dark:text-white">${item.nome}</span>
                              ${item.descricao ? `<div class="text-[11px] text-slate-400 max-w-xs truncate">${item.descricao}</div>` : ''}
                            </div>
                          </div>
                        </td>
                        <td class="p-3.5">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-extrabold ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}">${item.quantidade}</span>
                            <span class="text-slate-500 font-mono text-[11px]">${item.unidade}</span>
                            ${isCritical ? `
                              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/50">Crítico</span>
                            ` : ''}
                          </div>
                        </td>
                        <td class="p-3.5 text-slate-600 dark:text-slate-400 font-mono">${item.estoque_minimo} ${item.unidade}</td>
                        <td class="p-3.5 text-slate-600 dark:text-slate-400">${setor}</td>
                        <td class="p-3.5 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            ${canStockOut || canMoveStock ? `
                              <button onclick="window.InsumosModule._openAdjustModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-primary" title="${canStockOut && !canMoveStock ? 'Dar baixa no estoque' : 'Movimentar ou Transferir'}">
                                <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                              </button>
                            ` : ''}
                            ${canEdit ? `
                              <button onclick="window.InsumosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-edit" title="Editar">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                              </button>
                            ` : ''}
                            ${canDelete ? `
                              <button onclick="window.InsumosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-delete" title="Excluir">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
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
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-ins-prev" class="btn-secondary px-2.5 py-1 text-xs">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-ins-next" class="btn-secondary px-2.5 py-1 text-xs">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  },

  _renderTabHistorico() {
    const q = this.filtroHistBusca.toLowerCase().trim();
    const filtrados = this.historico.filter(mov => {
      const matchTipo = this.filtroHistTipo === 'TODOS' || mov.tipo === this.filtroHistTipo;
      const matchInsumo = !this.filtroHistInsumo || Number(mov.insumo_id) === Number(this.filtroHistInsumo);
      const matchBusca = !q ||
        (mov.insumo_nome && mov.insumo_nome.toLowerCase().includes(q)) ||
        (mov.usuario_nome && mov.usuario_nome.toLowerCase().includes(q)) ||
        (mov.local_origem && mov.local_origem.toLowerCase().includes(q)) ||
        (mov.local_destino && mov.local_destino.toLowerCase().includes(q)) ||
        (mov.observacao && mov.observacao.toLowerCase().includes(q));
      return matchTipo && matchInsumo && matchBusca;
    });

    const totalMovs = this.historico.length;
    const totalEntradas = this.historico.filter(m => m.tipo === 'ENTRADA').length;
    const totalSaidas = this.historico.filter(m => m.tipo === 'SAIDA').length;
    const totalTransf = this.historico.filter(m => m.tipo === 'TRANSFERENCIA').length;

    const totalPages = Math.ceil(filtrados.length / this.histPageSize) || 1;
    if (this.histPage > totalPages) this.histPage = totalPages;
    const startIndex = (this.histPage - 1) * this.histPageSize;
    const paginados = filtrados.slice(startIndex, startIndex + this.histPageSize);

    return `
      <div class="space-y-4">
        <!-- KPIs de Rastreabilidade -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Movimentações</span>
            <p class="text-2xl font-black text-slate-900 dark:text-white mt-2">${totalMovs}</p>
            <p class="text-[11px] text-slate-400 mt-1">Registros rastreados</p>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Entradas / Aquisições</span>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">${totalEntradas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Acórdãos no estoque</p>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Saídas / Consumo</span>
            <p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">${totalSaidas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Baixas efetuadas</p>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Transferências</span>
            <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">${totalTransf}</p>
            <p class="text-[11px] text-slate-400 mt-1">Entre salas e setores</p>
          </div>
        </div>

        <!-- Filtros do Histórico -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button data-filtro-hist-tipo="TODOS" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroHistTipo === 'TODOS' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}">
              Todos (${totalMovs})
            </button>
            <button data-filtro-hist-tipo="ENTRADA" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroHistTipo === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}">
              Entradas (${totalEntradas})
            </button>
            <button data-filtro-hist-tipo="SAIDA" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroHistTipo === 'SAIDA' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}">
              Saídas (${totalSaidas})
            </button>
            <button data-filtro-hist-tipo="TRANSFERENCIA" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroHistTipo === 'TRANSFERENCIA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}">
              Transferências (${totalTransf})
            </button>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select id="select-filtro-hist-insumo" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
              <option value="">Todos os Materiais</option>
              ${this.items.map(i => `
                <option value="${i.id}" ${Number(this.filtroHistInsumo) === Number(i.id) ? 'selected' : ''}>${i.nome}</option>
              `).join('')}
            </select>

            <div class="relative w-full sm:w-64">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input 
                id="input-busca-hist" 
                type="text" 
                value="${this.filtroHistBusca}" 
                placeholder="Buscar por local, responsável..." 
                class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        <!-- Tabela de Histórico & Rastreabilidade -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th class="p-3.5">Data & Hora Exata</th>
                  <th class="p-3.5">Material / Insumo</th>
                  <th class="p-3.5">Ação / Tipo</th>
                  <th class="p-3.5">Qtd</th>
                  <th class="p-3.5">Local de Origem</th>
                  <th class="p-3.5">Local de Destino</th>
                  <th class="p-3.5">Responsável</th>
                  <th class="p-3.5">Observação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                ${paginados.length === 0 ? `
                  <tr>
                    <td colspan="8" class="p-8 text-center text-slate-400">
                      Nenhuma movimentação registrada com os filtros informados.
                    </td>
                  </tr>
                ` : paginados.map(mov => {
                  const dataHora = mov.created_at ? new Date(mov.created_at).toLocaleString('pt-BR') : '-';

                  const badgeTipo = {
                    'ENTRADA': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                    'SAIDA': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                    'TRANSFERENCIA': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
                    'AJUSTE': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }[mov.tipo] || 'bg-slate-100 text-slate-700';

                  return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td class="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ${dataHora}
                      </td>
                      <td class="p-3.5 font-bold text-slate-900 dark:text-white">
                        ${mov.insumo_nome || `Insumo #${mov.insumo_id}`}
                      </td>
                      <td class="p-3.5">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeTipo}">
                          ${mov.tipo}
                        </span>
                      </td>
                      <td class="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        ${mov.quantidade} ${mov.insumo_unidade || ''}
                      </td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">
                        ${mov.local_origem || '<span class="text-slate-400 italic">Não informado</span>'}
                      </td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">
                        ${mov.local_destino || '<span class="text-slate-400 italic">Não informado</span>'}
                      </td>
                      <td class="p-3.5">
                        <div class="font-semibold text-slate-800 dark:text-slate-200">${mov.usuario_nome || 'Sistema'}</div>
                        <div class="text-[10px] text-slate-400">${mov.usuario_perfil || ''}</div>
                      </td>
                      <td class="p-3.5 text-slate-500 max-w-xs truncate">
                        ${mov.observacao || '-'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Paginação do Histórico -->
          <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.histPageSize, filtrados.length)} de ${filtrados.length}</span>
            <div class="flex items-center gap-1.5">
              <button ${this.histPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-hist-prev" class="btn-secondary px-2.5 py-1 text-xs">Anterior</button>
              <span class="px-2 font-medium">${this.histPage} / ${totalPages}</span>
              <button ${this.histPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-hist-next" class="btn-secondary px-2.5 py-1 text-xs">Próxima</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindEvents(container) {
    // Alternância de abas
    container.querySelector('#tab-btn-estoque')?.addEventListener('click', () => {
      this.activeTab = 'estoque';
      this._renderView(container);
    });

    container.querySelector('#tab-btn-historico')?.addEventListener('click', () => {
      this.activeTab = 'historico';
      this._renderView(container);
    });

    // Eventos da aba de estoque
    container.querySelector('#input-busca-insumo')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#check-alerta-insumo')?.addEventListener('change', (e) => {
      this.alertOnlyFilter = e.target.checked;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-setor-insumo')?.addEventListener('change', (e) => {
      this.setorFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-ins-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-ins-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-novo-insumo')?.addEventListener('click', () => this._openFormModal(container));

    // Eventos da aba de histórico
    container.querySelectorAll('[data-filtro-hist-tipo]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroHistTipo = btn.getAttribute('data-filtro-hist-tipo');
        this.histPage = 1;
        this._renderView(container);
      });
    });

    container.querySelector('#select-filtro-hist-insumo')?.addEventListener('change', (e) => {
      this.filtroHistInsumo = e.target.value;
      this.histPage = 1;
      this._renderView(container);
    });

    const inputBuscaHist = container.querySelector('#input-busca-hist');
    if (inputBuscaHist) {
      inputBuscaHist.addEventListener('input', (e) => {
        this.filtroHistBusca = e.target.value;
        clearTimeout(this._histTimer);
        this._histTimer = setTimeout(() => {
          this.histPage = 1;
          this._renderView(container);
          const el = container.querySelector('#input-busca-hist');
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 200);
      });
    }

    container.querySelector('#btn-hist-prev')?.addEventListener('click', () => { this.histPage--; this._renderView(container); });
    container.querySelector('#btn-hist-next')?.addEventListener('click', () => { this.histPage++; this._renderView(container); });
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-insumo" class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Insumo / Suprimento *</label>
          <input 
            type="text" 
            name="nome" 
            required 
            value="${item ? item.nome : ''}" 
            placeholder="Ex: Café em Grãos Gourmet 1kg" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Qtd Atual *</label>
            <input 
              type="number" 
              name="quantidade" 
              required 
              min="0"
              value="${item ? item.quantidade : '0'}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estoque Mínimo *</label>
            <input 
              type="number" 
              name="estoque_minimo" 
              required 
              min="1"
              value="${item ? item.estoque_minimo : '5'}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unidade *</label>
            <input 
              type="text" 
              name="unidade" 
              required 
              value="${item ? item.unidade : 'unid'}" 
              placeholder="ex: cx, pct, unid, kg" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Setor Designado</label>
          <select name="setor_id" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Sem setor específico (Geral)</option>
            ${this.setores.map(s => `
              <option value="${s.id}" ${item && Number(item.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição / Especificação</label>
          <textarea 
            name="descricao" 
            rows="2" 
            placeholder="Marca, lote ou orientações de armazenagem..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >${item && item.descricao ? item.descricao : ''}</textarea>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Insumo' : 'Cadastrar Insumo',
      subtitle: 'Controle de suprimentos do HUB ES+',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Cadastrar Insumo',
      onSave: async () => {
        const form = document.getElementById('form-insumo');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          nome: formData.get('nome').trim(),
          quantidade: Number(formData.get('quantidade')),
          estoque_minimo: Number(formData.get('estoque_minimo')),
          unidade: formData.get('unidade').trim(),
          descricao: (formData.get('descricao') || '').trim() || null,
          setor_id: formData.get('setor_id') ? Number(formData.get('setor_id')) : null
        };

        try {
          if (isEdit) {
            await window.API.updateInsumo(editId, payload);
            window.UI.toast({ title: 'Insumo Atualizado', message: 'Alterações salvas com sucesso.' });
          } else {
            await window.API.createInsumo(payload);
            window.UI.toast({ title: 'Insumo Cadastrado', message: 'Material adicionado ao almoxarifado.' });
          }

          await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro ao Salvar', message: err.message || 'Falha ao processar material.', type: 'error' });
          return false;
        }
      }
    });
  },

  _openAdjustModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const onlyStockOut = window.Auth.hasPermission('insumos.baixar') &&
      !window.Auth.hasPermission('insumos.movimentar');

    const modalContent = `
      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p class="text-slate-600 dark:text-slate-300">
            Material: <strong class="text-slate-900 dark:text-white">${item.nome}</strong>
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            Saldo Atual Disponível: <strong>${item.quantidade} ${item.unidade}</strong>
          </p>
        </div>

        ${onlyStockOut ? '' : `
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Ação *</label>
            <select id="select-tipo-movimentacao" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="ENTRADA">Entrada / Aquisição de Estoque</option>
              <option value="SAIDA" selected>Saída / Baixa por Consumo</option>
              <option value="TRANSFERENCIA">Transferência entre Locais / Setores</option>
              <option value="AJUSTE">Ajuste de Balanço Físico</option>
            </select>
          </div>
        `}

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ${onlyStockOut ? `Quantidade de Saída (${item.unidade}) *` : 'Quantidade a Movimentar *'}
          </label>
          <input 
            type="number" 
            id="input-novo-saldo" 
            min="1"
            value="1"
            class="w-full px-3.5 py-2 text-sm font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Local de Origem</label>
            <input 
              type="text" 
              id="input-mov-origem" 
              placeholder="Ex: Almoxarifado Central" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Local de Destino</label>
            <input 
              type="text" 
              id="input-mov-destino" 
              placeholder="Ex: Sala 204 - Laboratório" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observação / Justificativa</label>
          <textarea 
            id="input-mov-observacao" 
            rows="2" 
            placeholder="Motivo da saída, requisição interna ou projeto atendido..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          ></textarea>
        </div>
      </div>
    `;

    window.UI.openModal({
      title: onlyStockOut ? 'Dar Baixa em Material' : 'Movimentar & Rastrear Estoque',
      subtitle: 'Registro com histórico de origem, destino e auditoria',
      contentHtml: modalContent,
      saveLabel: 'Registrar Movimentação',
      onSave: async () => {
        const val = document.getElementById('input-novo-saldo')?.value;
        const quantidade = Number(val);
        if (!Number.isInteger(quantidade) || quantidade <= 0) {
          window.UI.toast({ title: 'Atenção', message: 'Informe uma quantidade válida maior que zero.', type: 'warning' });
          return false;
        }

        const tipo = onlyStockOut
          ? 'SAIDA'
          : document.getElementById('select-tipo-movimentacao')?.value || 'SAIDA';

        const local_origem = (document.getElementById('input-mov-origem')?.value || '').trim();
        const local_destino = (document.getElementById('input-mov-destino')?.value || '').trim();
        const observacao = (document.getElementById('input-mov-observacao')?.value || '').trim();

        if (tipo === 'TRANSFERENCIA' && !local_destino) {
          window.UI.toast({ title: 'Atenção', message: 'Para transferências, informe o Local de Destino.', type: 'warning' });
          return false;
        }

        try {
          await window.API.movimentarInsumo(id, {
            tipo,
            quantidade,
            local_origem,
            local_destino,
            observacao
          });

          window.UI.toast({
            title: 'Estoque Atualizado',
            message: `Movimentação de ${tipo.toLowerCase()} registrada com rastreabilidade.`
          });

          await this.render(container);
          return true;
        } catch (err) {
          console.error('[INSUMOS] Erro na movimentação:', err);
          window.UI.toast({ title: 'Falha na Movimentação', message: err.message || 'Não foi possível registrar a movimentação.', type: 'error' });
          return false;
        }
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Insumo?',
      message: 'Tem certeza que deseja apagar este item de material do inventário?',
      onConfirm: async () => {
        try {
          await window.API.deleteInsumo(id);
          window.UI.toast({ title: 'Insumo Removido', message: 'Item apagado com sucesso.', type: 'warning' });
          await this.render(container);
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao excluir insumo.', type: 'error' });
        }
      }
    });
  }
};
