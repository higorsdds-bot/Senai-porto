/**
 * HUB ES+ - Módulo 5: Agenda Inteligente
 * Tabela: eventos (id, responsavel_id, local, data, status)
 * Funcionalidades: listagem de eventos com visualização em lista/cards, filtro por data/local/responsável,
 * status (agendado, em_andamento, concluido, cancelado), cadastro e edição.
 */

window.AgendaModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  statusFilter: '',
  responsavelFilter: '',

  async render(container) {
    container.innerHTML = window.UI.renderCardsSkeleton(4);

    try {
      const [eventos, usuarios] = await Promise.all([
        window.API.getEventos(),
        window.API.getUsuarios()
      ]);
      this.items = eventos;
      this.usuarios = usuarios;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro na agenda',
        description: 'Não foi possível carregar a programação de eventos.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    let filtered = this.items.filter(item => {
      const matchLocal = (item.local || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchResp = !this.responsavelFilter || Number(item.responsavel_id) === Number(this.responsavelFilter);
      return matchLocal && matchStatus && matchResp;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-700 tracking-wide uppercase">
                Espaços & Pautas
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} eventos</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Agenda Inteligente</h1>
            <p class="text-xs text-slate-500 font-medium">Gestão de auditórios, laboratórios e programações do ecossistema HUB ES+</p>
          </div>
          <button id="btn-novo-evento" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i>
            Agendar Evento
          </button>
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-evento" 
              type="text" 
              placeholder="Buscar por local ou espaço..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select id="select-filtro-status-evento" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Status</option>
              <option value="agendado" ${this.statusFilter === 'agendado' ? 'selected' : ''}>Agendado</option>
              <option value="em_andamento" ${this.statusFilter === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="concluido" ${this.statusFilter === 'concluido' ? 'selected' : ''}>Concluído</option>
              <option value="cancelado" ${this.statusFilter === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>

            <select id="select-filtro-resp-evento" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Responsáveis</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${Number(this.responsavelFilter) === Number(u.id) ? 'selected' : ''}>${u.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Grade de Eventos -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum evento agendado',
            description: 'Não constam eventos nos critérios ou datas selecionadas.',
            actionLabel: 'Novo Agendamento',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${filtered.map(item => {
              const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || 'Responsável #' + item.responsavel_id;
              const dateObj = new Date(item.data);
              const dataFmt = isNaN(dateObj) ? item.data : dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
              const horaFmt = isNaN(dateObj) ? '' : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return `
                <div class="hub-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group">
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-3">
                      <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex flex-col items-center justify-center font-bold text-xs border border-sky-100">
                          <span class="text-[9px] uppercase font-sans text-sky-500">${dataFmt.split(',')[0] || 'DIA'}</span>
                          <span>${dateObj.getDate() || '01'}</span>
                        </div>
                        <div>
                          <span class="text-xs font-bold text-slate-800">${horaFmt ? `${horaFmt}h` : 'Horário livre'}</span>
                          <p class="text-[11px] text-slate-400 font-medium">${dataFmt}</p>
                        </div>
                      </div>
                      ${window.UI.renderBadge(item.status)}
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 line-clamp-2 mt-2">${item.local}</h3>
                    
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                      <div class="flex items-center gap-2">
                        <i data-lucide="user-check" class="w-4 h-4 text-slate-400"></i>
                        <span>Responsável: <strong class="text-slate-700">${resp}</strong></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                        <span class="truncate">Local cadastrado: ${item.local}</span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] font-mono text-slate-400">#EVT-${item.id}</span>
                    <div class="flex items-center gap-1">
                      <button onclick="window.AgendaModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>
                      <button onclick="window.AgendaModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    container.querySelector('#input-busca-evento')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-status-evento')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-resp-evento')?.addEventListener('change', (e) => {
      this.responsavelFilter = e.target.value;
      this._renderView(container);
    });

    container.querySelector('#btn-novo-evento')?.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    // Converte timestamp para formato de input datetime-local
    let defaultDate = new Date().toISOString().slice(0, 16);
    if (item && item.data) {
      try {
        defaultDate = new Date(item.data).toISOString().slice(0, 16);
      } catch (e) {
        defaultDate = item.data;
      }
    }

    const modalContent = `
      <form id="form-evento" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Local / Espaço do Evento *</label>
          <input 
            type="text" 
            name="local" 
            required 
            value="${item ? item.local : ''}" 
            placeholder="Ex: Auditório Master - Painel de Inovação Aberta" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Data e Horário *</label>
            <input 
              type="datetime-local" 
              name="data" 
              required 
              value="${defaultDate}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Responsável (responsavel_id) *</label>
            <select name="responsavel_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Selecione o responsável...</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>${u.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Status do Evento *</label>
          <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
            <option value="agendado" ${item && item.status === 'agendado' ? 'selected' : ''}>Agendado</option>
            <option value="em_andamento" ${item && item.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="concluido" ${item && item.status === 'concluido' ? 'selected' : ''}>Concluído</option>
            <option value="cancelado" ${item && item.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Evento' : 'Agendar Novo Evento',
      subtitle: 'Mapeamento de banco de dados tabela eventos',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Confirmar Agendamento',
      onSave: async () => {
        const form = document.getElementById('form-evento');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          local: formData.get('local').trim(),
          responsavel_id: Number(formData.get('responsavel_id')),
          data: formData.get('data'),
          status: formData.get('status')
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /eventos/:id
          await window.API.updateEvento(editId, payload);
          window.UI.toast({ title: 'Evento Atualizado', message: 'Agendamento salvo com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /eventos
          await window.API.createEvento(payload);
          window.UI.toast({ title: 'Evento Agendado', message: 'Novo evento incluído na agenda do HUB ES+.' });
        }

        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Remover Evento?',
      message: 'Deseja realmente desmarcar e remover este evento da agenda?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /eventos/:id
        await window.API.deleteEvento(id);
        window.UI.toast({ title: 'Evento Removido', message: 'O evento foi excluído da pauta.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
