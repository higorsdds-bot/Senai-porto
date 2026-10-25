/**
 * HUB ES+ - Módulo 9: Controle de Limpeza
 * Tabela: limpeza (id, responsavel_id, local, status)
 * Funcionalidades: gestão de rotinas e vistorias de higienização por local e responsável,
 * status (Limpo / Não Limpo / Em Execução), alternância rápida de status, filtros e CRUD.
 */

window.LimpezaModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  statusFilter: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [tarefas, usuarios] = await Promise.all([
        window.API.getLimpeza(),
        window.API.getUsuarios().catch(() => [])
      ]);
      this.items = tarefas || [];
      this.usuarios = usuarios || [];
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar limpeza:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a escala de limpeza.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _isLimpo(status) {
    const s = String(status || '').toLowerCase().trim();
    return s === 'concluido' || s === 'limpo';
  },

  _renderStatusBadge(status) {
    const s = String(status || '').toLowerCase().trim();

    if (s === 'concluido' || s === 'limpo') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
          <span>Limpo</span>
        </span>
      `;
    }

    if (s === 'pendente' || s === 'nao_limpo') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
          <span>Não Limpo</span>
        </span>
      `;
    }

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i>
        <span>Em Execução</span>
      </span>
    `;
  },

  _renderView(container) {
    let filtered = this.items.filter(item => {
      const matchLocal = (item.local || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (this.statusFilter === 'limpo' || this.statusFilter === 'concluido') {
        matchStatus = this._isLimpo(item.status);
      } else if (this.statusFilter === 'nao_limpo' || this.statusFilter === 'pendente') {
        matchStatus = !this._isLimpo(item.status) && item.status !== 'em_execucao';
      } else if (this.statusFilter === 'em_execucao') {
        matchStatus = item.status === 'em_execucao';
      }

      return matchLocal && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    // Métricas rápidas de status
    const totalLimpos = this.items.filter(i => this._isLimpo(i.status)).length;
    const totalNaoLimpos = this.items.filter(i => !this._isLimpo(i.status) && i.status !== 'em_execucao').length;
    const totalEmExecucao = this.items.filter(i => i.status === 'em_execucao').length;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 tracking-wide uppercase">
                Zeladoria & Higiene
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} rotinas registradas</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Controle de Limpeza</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Acompanhe se os ambientes estão limpos ou necessitam de higienização</p>
          </div>
          <button id="btn-nova-limpeza" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-md shadow-teal-600/20 transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            Nova Rotina de Limpeza
          </button>
        </div>

        <!-- Cards de Resumo Rápido -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Ambientes Limpos</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">${totalLimpos}</h3>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Higienizados
            </span>
          </div>

          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <i data-lucide="alert-triangle" class="w-5 h-5"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Ambientes Não Limpos</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">${totalNaoLimpos}</h3>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              Aguardando
            </span>
          </div>

          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <i data-lucide="loader-2" class="w-5 h-5"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Em Higienização</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">${totalEmExecucao}</h3>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Em atividade
            </span>
          </div>
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-limpeza" 
              type="text" 
              placeholder="Buscar por local ou área..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div class="w-full sm:w-auto">
            <select id="select-filtro-status-limpeza" class="w-full sm:w-56 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="">Todos os Status</option>
              <option value="limpo" ${this.statusFilter === 'limpo' ? 'selected' : ''}>Limpo (Higienizado)</option>
              <option value="nao_limpo" ${this.statusFilter === 'nao_limpo' ? 'selected' : ''}>Não Limpo (Pendente)</option>
              <option value="em_execucao" ${this.statusFilter === 'em_execucao' ? 'selected' : ''}>Em Execução</option>
            </select>
          </div>
        </div>

        <!-- Tabela -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhuma tarefa de limpeza',
            description: 'Não foram encontradas tarefas com os filtros especificados.',
            actionLabel: 'Agendar Limpeza',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Local / Área</th>
                    <th class="px-6 py-3.5">Responsável Designado</th>
                    <th class="px-6 py-3.5">Situação / Status</th>
                    <th class="px-6 py-3.5 text-right">Ações & Vistoria</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${paginatedItems.map(item => {
                    const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || 'Responsável #' + item.responsavel_id;
                    const isLimpo = this._isLimpo(item.status);

                    return `
                      <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                          <div class="flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-4 h-4 text-teal-600 dark:text-teal-400"></i>
                            <span>${item.local}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${resp}
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          ${this._renderStatusBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-2">
                            <!-- Ação rápida: Alternar se tá limpo ou não -->
                            ${isLimpo ? `
                              <button 
                                onclick="window.LimpezaModule.alternarStatusRapido(document.getElementById('main-content'), ${item.id}, 'nao_limpo')" 
                                class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors shadow-sm" 
                                title="Marcar este ambiente como Não Limpo"
                              >
                                <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                <span>Marcar Não Limpo</span>
                              </button>
                            ` : `
                              <button 
                                onclick="window.LimpezaModule.alternarStatusRapido(document.getElementById('main-content'), ${item.id}, 'limpo')" 
                                class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm" 
                                title="Marcar este ambiente como Limpo"
                              >
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                <span>Marcar Limpo</span>
                              </button>
                            `}

                            <!-- Editar Status completo / Vistoria -->
                            <button 
                              onclick="window.LimpezaModule._openStatusModal(document.getElementById('main-content'), ${item.id})" 
                              class="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-teal-200 dark:hover:border-teal-800" 
                              title="Alterar Status / Vistoria"
                            >
                              <i data-lucide="clipboard-check" class="w-4 h-4"></i>
                            </button>

                            <!-- Editar Dados Cadastrais -->
                            <button 
                              onclick="window.LimpezaModule._openFormModal(document.getElementById('main-content'), ${item.id})" 
                              class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors" 
                              title="Editar Detalhes"
                            >
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>

                            <!-- Excluir -->
                            <button 
                              onclick="window.LimpezaModule._confirmDelete(document.getElementById('main-content'), ${item.id})" 
                              class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors" 
                              title="Excluir"
                            >
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Paginação -->
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-limpeza-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-limpeza-next" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    container.querySelector('#input-busca-limpeza')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-status-limpeza')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-limpeza-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-limpeza-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-nova-limpeza')?.addEventListener('click', () => this._openFormModal(container));
  },

  async alternarStatusRapido(container, id, novoStatus) {
    try {
      await window.API.updateLimpezaStatus(id, novoStatus);
      const isNovoLimpo = novoStatus === 'limpo' || novoStatus === 'concluido';
      window.UI.toast({
        title: 'Status de Limpeza Atualizado',
        message: isNovoLimpo 
          ? 'Ambiente marcado como LIMPO com sucesso.' 
          : 'Ambiente marcado como NÃO LIMPO (necessita de higienização).'
      });
      await this.render(container);
    } catch (err) {
      console.error('Erro ao alternar status de limpeza:', err);
      window.UI.toast({
        title: 'Falha ao Atualizar',
        message: err.message || 'Não foi possível alterar o status de limpeza.',
        type: 'error'
      });
    }
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-limpeza" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Local / Espaço *</label>
          <input 
            type="text" 
            name="local" 
            required 
            value="${item ? item.local : ''}" 
            placeholder="Ex: Foyer Principal e Sanitários Bloco A" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Responsável Designado *</label>
          <select name="responsavel_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
            <option value="">Selecione o responsável...</option>
            ${(this.usuarios.length > 0 ? this.usuarios : (window.Auth?.getUser() ? [window.Auth.getUser()] : [])).map(u => `
              <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : (!item && window.Auth?.getUser()?.id === u.id ? 'selected' : '')}>${u.nome}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Situação / Status *</label>
          <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
            <option value="concluido" ${item && (item.status === 'concluido' || item.status === 'limpo') ? 'selected' : ''}>Limpo (Higienizado)</option>
            <option value="pendente" ${item && (item.status === 'pendente' || item.status === 'nao_limpo') ? 'selected' : ''}>Não Limpo (Pendente)</option>
            <option value="em_execucao" ${item && item.status === 'em_execucao' ? 'selected' : ''}>Em Execução</option>
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Tarefa de Limpeza' : 'Cadastrar Rotina de Limpeza',
      subtitle: 'Controle de higienização de ambientes do HUB ES+',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Cadastrar Tarefa',
      onSave: async () => {
        const form = document.getElementById('form-limpeza');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          local: formData.get('local').trim(),
          responsavel_id: Number(formData.get('responsavel_id')),
          status: formData.get('status')
        };

        try {
          if (isEdit) {
            await window.API.updateLimpeza(editId, payload);
            window.UI.toast({ title: 'Limpeza Atualizada', message: 'Dados salvos com sucesso.' });
          } else {
            await window.API.createLimpeza(payload);
            window.UI.toast({ title: 'Rotina Cadastrada', message: 'Tarefa de higienização agendada.' });
          }

          await this.render(container);
          return true;
        } catch (err) {
          console.error('Erro ao salvar limpeza:', err);
          window.UI.toast({
            title: 'Erro ao Salvar',
            message: err.message || 'Verifique os dados informados.',
            type: 'error'
          });
          return false;
        }
      }
    });
  },

  _openStatusModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const isAtualLimpo = this._isLimpo(item.status);
    const isAtualEmExecucao = item.status === 'em_execucao';

    const modalContent = `
      <div class="space-y-4">
        <div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Ambiente selecionado:</p>
          <div class="flex items-center gap-2 mt-0.5">
            <i data-lucide="map-pin" class="w-4 h-4 text-teal-600"></i>
            <h4 class="text-sm font-bold text-slate-800 dark:text-white">${item.local}</h4>
          </div>
        </div>

        <div class="space-y-2.5">
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Selecione o estado atual do ambiente:</p>
          
          <!-- Opção Limpo -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-900 cursor-pointer transition-all hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
            <input type="radio" name="limpeza_status_radio" value="limpo" ${isAtualLimpo ? 'checked' : ''} class="mt-0.5 text-emerald-600 focus:ring-emerald-500">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Limpo / Higienizado</span>
                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Liberado</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Ambiente limpo, organizado e pronto para uso.</p>
            </div>
          </label>

          <!-- Opção Não Limpo -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 bg-white dark:bg-slate-900 cursor-pointer transition-all hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
            <input type="radio" name="limpeza_status_radio" value="nao_limpo" ${(!isAtualLimpo && !isAtualEmExecucao) ? 'checked' : ''} class="mt-0.5 text-rose-600 focus:ring-rose-500">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Não Limpo / Pendente</span>
                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">Atenção</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Ambiente necessita de limpeza ou higienização.</p>
            </div>
          </label>

          <!-- Opção Em Execução -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-900 cursor-pointer transition-all hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
            <input type="radio" name="limpeza_status_radio" value="em_execucao" ${isAtualEmExecucao ? 'checked' : ''} class="mt-0.5 text-blue-600 focus:ring-blue-500">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Em Execução / Limpando</span>
                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">Em curso</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Equipe de zeladoria atuando no local neste momento.</p>
            </div>
          </label>
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Vistoria e Status de Higiene',
      subtitle: 'Atualização rápida do status do local',
      contentHtml: modalContent,
      saveLabel: 'Salvar Status',
      maxWidth: 'max-w-md',
      onSave: async () => {
        const checked = document.querySelector('input[name="limpeza_status_radio"]:checked');
        if (!checked) return false;

        try {
          await window.API.updateLimpezaStatus(id, checked.value);
          
          let msg = 'Ambiente marcado como Limpo.';
          if (checked.value === 'nao_limpo') msg = 'Ambiente marcado como Não Limpo (necessita limpeza).';
          if (checked.value === 'em_execucao') msg = 'Ambiente marcado como Em Higienização.';

          window.UI.toast({
            title: 'Status Atualizado',
            message: msg
          });

          await this.render(container);
          return true;
        } catch (err) {
          console.error('Erro ao atualizar status:', err);
          window.UI.toast({
            title: 'Falha na Atualização',
            message: err.message || 'Não foi possível atualizar o status.',
            type: 'error'
          });
          return false;
        }
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Rotina de Limpeza?',
      message: 'Tem certeza que deseja apagar esta rotina de limpeza? O registro será arquivado.',
      confirmLabel: 'Excluir Rotina',
      onConfirm: async () => {
        try {
          await window.API.deleteLimpeza(id);
          window.UI.toast({ title: 'Rotina Removida', message: 'A tarefa foi excluída com sucesso.', type: 'warning' });
          await this.render(container);
        } catch (err) {
          console.error('Erro ao excluir rotina:', err);
          window.UI.toast({
            title: 'Erro ao Excluir',
            message: err.message || 'Não foi possível excluir a rotina.',
            type: 'error'
          });
        }
      }
    });
  }
};
