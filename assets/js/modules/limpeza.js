/**
 * HUB ES+ - Módulo 9: Controle de Limpeza
 * Tabela: limpeza (id, responsavel_id, local, status)
 * Funcionalidades: gestão de rotinas e vistorias de higienização por local e responsável,
 * status (pendente, em_execucao, concluido), filtros e CRUD.
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
        window.API.getUsuarios()
      ]);
      this.items = tarefas;
      this.usuarios = usuarios;
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

  _renderView(container) {
    let filtered = this.items.filter(item => {
      const matchLocal = (item.local || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.statusFilter || item.status === this.statusFilter;
      return matchLocal && matchStatus;
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
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-700 tracking-wide uppercase">
                Zeladoria & Higiene
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} rotinas</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Controle de Limpeza</h1>
            <p class="text-xs text-slate-500 font-medium">Acompanhamento de rotinas de higienização dos blocos e setores</p>
          </div>
          <button id="btn-nova-limpeza" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-md shadow-teal-600/20 transition-all">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            Nova Rotina de Limpeza
          </button>
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-limpeza" 
              type="text" 
              placeholder="Buscar por local ou área..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div class="w-full sm:w-auto">
            <select id="select-filtro-status-limpeza" class="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white">
              <option value="">Todos os Status</option>
              <option value="pendente" ${this.statusFilter === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="em_execucao" ${this.statusFilter === 'em_execucao' ? 'selected' : ''}>Em Execução</option>
              <option value="concluido" ${this.statusFilter === 'concluido' ? 'selected' : ''}>Concluído</option>
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
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Local / Área</th>
                    <th class="px-6 py-3.5">Responsável Designado</th>
                    <th class="px-6 py-3.5">Status</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
                    const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || 'Responsável #' + item.responsavel_id;
                    return `
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800">
                          <div class="flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                            <span>${item.local}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${resp}
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          ${window.UI.renderBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.LimpezaModule._openStatusModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Atualizar Status">
                              <i data-lucide="check-circle" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.LimpezaModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.LimpezaModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
            <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-limpeza-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-limpeza-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
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

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-limpeza" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Local / Espaço *</label>
          <input 
            type="text" 
            name="local" 
            required 
            value="${item ? item.local : ''}" 
            placeholder="Ex: Foyer Principal e Sanitários Bloco A" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Responsável Designado (responsavel_id) *</label>
          <select name="responsavel_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white">
            <option value="">Selecione o responsável...</option>
            ${this.usuarios.map(u => `
              <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>${u.nome}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Status da Rotina *</label>
          <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white">
            <option value="pendente" ${item && item.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="em_execucao" ${item && item.status === 'em_execucao' ? 'selected' : ''}>Em Execução</option>
            <option value="concluido" ${item && item.status === 'concluido' ? 'selected' : ''}>Concluído</option>
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Tarefa de Limpeza' : 'Cadastrar Rotina de Limpeza',
      subtitle: 'Tabela limpeza do banco de dados HUB ES+',
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

        if (isEdit) {
          // TODO: conectar endpoint PUT /limpeza/:id
          await window.API.updateLimpeza(editId, payload);
          window.UI.toast({ title: 'Limpeza Atualizada', message: 'Dados salvos com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /limpeza
          await window.API.createLimpeza(payload);
          window.UI.toast({ title: 'Rotina Cadastrada', message: 'Tarefa de higienização agendada.' });
        }

        await this.render(container);
        return true;
      }
    });
  },

  _openStatusModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const modalContent = `
      <div class="space-y-4">
        <p class="text-xs text-slate-600">Atualizar status de limpeza para: <strong class="text-slate-800">${item.local}</strong></p>
        <div class="space-y-2">
          ${['pendente', 'em_execucao', 'concluido'].map(st => `
            <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="radio" name="limpeza_status_radio" value="${st}" ${item.status === st ? 'checked' : ''} class="text-teal-600 focus:ring-teal-500">
              <span class="text-xs font-semibold uppercase">${st.replace('_', ' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Progresso da Limpeza',
      contentHtml: modalContent,
      saveLabel: 'Confirmar',
      maxWidth: 'max-w-sm',
      onSave: async () => {
        const checked = document.querySelector('input[name="limpeza_status_radio"]:checked');
        if (!checked) return;
        // TODO: conectar endpoint PUT /limpeza/:id
        await window.API.updateLimpeza(id, { status: checked.value });
        window.UI.toast({ title: 'Status Atualizado', message: `Tarefa marcada como ${checked.value.replace('_', ' ')}.` });
        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Tarefa?',
      message: 'Tem certeza que deseja apagar esta rotina de limpeza?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /limpeza/:id
        await window.API.deleteLimpeza(id);
        window.UI.toast({ title: 'Rotina Removida', message: 'A tarefa foi excluída.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
