/**
 * HUB ES+ - Módulo 6: Ocorrências Técnicas
 * Tabela: ocorrencias (id, usuario_id, local, status)
 * Funcionalidades: listagem de chamados prediais e técnicos, status (aberto, em_andamento, resolvido),
 * vínculo usuario_id, filtro por local/status, busca em tempo real e modais CRUD.
 */

window.OcorrenciasModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  statusFilter: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [ocorrencias, usuarios] = await Promise.all([
        window.API.getOcorrencias(),
        window.API.getUsuarios()
      ]);
      this.items = ocorrencias;
      this.usuarios = usuarios;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar ocorrências:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Falha na comunicação',
        description: 'Não foi possível carregar os chamados técnicos.',
        actionLabel: 'Recarregar',
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
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 tracking-wide uppercase">
                Suporte & Manutenção
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} chamados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Ocorrências Técnicas</h1>
            <p class="text-xs text-slate-500 font-medium">Registro e acompanhamento de incidentes de infraestrutura e TI</p>
          </div>
          <button id="btn-nova-ocorrencia" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/20 transition-all">
            <i data-lucide="alert-octagon" class="w-4 h-4"></i>
            Registrar Ocorrência
          </button>
        </div>

        <!-- Barra de Busca e Filtro -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-ocorrencia" 
              type="text" 
              placeholder="Buscar por local ou espaço..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div class="w-full sm:w-auto">
            <select id="select-filtro-status-ocorrencia" class="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white">
              <option value="">Todos os Status</option>
              <option value="aberto" ${this.statusFilter === 'aberto' ? 'selected' : ''}>Aberto</option>
              <option value="em_andamento" ${this.statusFilter === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="resolvido" ${this.statusFilter === 'resolvido' ? 'selected' : ''}>Resolvido</option>
            </select>
          </div>
        </div>

        <!-- Tabela -->
        ${filtered.length === 0 ?
        window.UI.renderEmptyState({
          title: 'Nenhuma ocorrência encontrada',
          description: 'Todas as ocorrências registradas já foram resolvidas ou não correspondem ao filtro.',
          actionLabel: 'Abrir Novo Chamado',
          onActionClick: () => this._openFormModal(container)
        })
        : `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Local da Ocorrência</th>
                    <th class="px-6 py-3.5">Usuário Solicitante</th>
                    <th class="px-6 py-3.5">Status</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
          const solicitante = this.usuarios.find(u => Number(u.id) === Number(item.usuario_id))?.nome || 'Usuário #' + item.usuario_id;
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
                          <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                              ${solicitante.charAt(0)}
                            </div>
                            <span>${solicitante}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          ${window.UI.renderBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.OcorrenciasModule._openStatusModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Atualizar Status">
                              <i data-lucide="activity" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.OcorrenciasModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.OcorrenciasModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-oc-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-oc-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    container.querySelector('#input-busca-ocorrencia')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-status-ocorrencia')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-oc-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-oc-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-nova-ocorrencia')?.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-ocorrencia" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Local da Ocorrência *</label>
          <input 
            type="text" 
            name="local" 
            required 
            value="${item ? item.local : ''}" 
            placeholder="Ex: Laboratório Maker - Bancada 04" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Usuário Solicitante (usuario_id) *</label>
          <select name="usuario_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white">
            <option value="">Selecione o usuário...</option>
            ${this.usuarios.map(u => `
              <option value="${u.id}" ${item && Number(item.usuario_id) === Number(u.id) ? 'selected' : ''}>${u.nome} (${u.email})</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Status da Ocorrência *</label>
          <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white">
            <option value="aberto" ${item && item.status === 'aberto' ? 'selected' : ''}>Aberto</option>
            <option value="em_andamento" ${item && item.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="resolvido" ${item && item.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Ocorrência' : 'Registrar Nova Ocorrência',
      subtitle: 'Mapeamento direto com a tabela ocorrencias do banco',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Abrir Chamado',
      onSave: async () => {
        const form = document.getElementById('form-ocorrencia');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          local: formData.get('local').trim(),
          usuario_id: Number(formData.get('usuario_id')),
          status: formData.get('status')
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /ocorrencias/:id
          await window.API.updateOcorrencia(editId, payload);
          window.UI.toast({ title: 'Ocorrência Atualizada', message: 'Dados salvos com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /ocorrencias
          await window.API.createOcorrencia(payload);
          window.UI.toast({ title: 'Chamado Aberto', message: 'A ocorrência foi registrada para a equipe técnica.' });
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
        <p class="text-xs text-slate-600">Alterar status da ocorrência em: <strong class="text-slate-800">${item.local}</strong></p>
        <div class="space-y-2">
          ${['aberto', 'em_andamento', 'resolvido'].map(st => `
            <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="radio" name="oc_status_radio" value="${st}" ${item.status === st ? 'checked' : ''} class="text-rose-600 focus:ring-rose-500">
              <span class="text-xs font-semibold uppercase">${st.replace('_', ' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Status do Chamado',
      contentHtml: modalContent,
      saveLabel: 'Atualizar Status',
      maxWidth: 'max-w-sm',
      onSave: async () => {
        const checked = document.querySelector('input[name="oc_status_radio"]:checked');
        if (!checked) return;
        // TODO: conectar endpoint PUT /ocorrencias/:id
        await window.API.updateOcorrencia(id, { status: checked.value });
        window.UI.toast({ title: 'Status Atualizado', message: `Chamado agora está ${checked.value.replace('_', ' ')}.` });
        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Ocorrência?',
      message: 'Tem certeza que deseja apagar o registro deste chamado técnico?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /ocorrencias/:id
        await window.API.deleteOcorrencia(id);
        window.UI.toast({ title: 'Ocorrência Excluída', message: 'Chamado removido com sucesso.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
