/**
 * HUB ES+ - Módulo 5: Agenda Inteligente
 * Tabela: eventos (id, responsavel_id, titulo, local, descricao, data, data_fim, status)
 * Funcionalidades: listagem de eventos com visualização em cards responsivos,
 * filtro por texto/local/responsável/status, suporte completo a tema escuro e
 * agendamento de eventos para Operador, Gestor e Administrador.
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
      const isVisitante = window.Auth?.isVisitante();
      let eventos, usuarios;

      if (isVisitante) {
        // Modo visitante: consome rota pública sem requisição de usuários
        eventos = await window.API.getPublicEventos();
        usuarios = [];
      } else {
        eventos = await window.API.getEventos();
        // Usuários para seleção de responsável são carregados se tiver permissão de visualização
        usuarios = window.Auth.hasPermission('usuarios.visualizar')
          ? await window.API.getUsuarios()
          : [];
      }

      this.items = Array.isArray(eventos) ? eventos : [];
      this.usuarios = Array.isArray(usuarios) ? usuarios : [];
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
    const canCreate = window.Auth.hasPermission('eventos.criar');
    const canEdit = window.Auth.hasPermission('eventos.editar');
    const canDelete = window.Auth.hasPermission('eventos.excluir');
    const currentUser = window.Auth.getUsuario();
    const term = (this.searchTerm || '').toLowerCase().trim();

    const filtered = this.items.filter(item => {
      const matchSearch = !term ||
        (item.local || '').toLowerCase().includes(term) ||
        (item.titulo || '').toLowerCase().includes(term) ||
        (item.descricao || '').toLowerCase().includes(term);
      const matchStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchResp = !this.responsavelFilter || Number(item.responsavel_id) === Number(this.responsavelFilter);
      return matchSearch && matchStatus && matchResp;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 tracking-wide uppercase">
                Espaços & Pautas
              </span>
              <span class="text-xs text-slate-400 dark:text-slate-500">• ${this.items.length} eventos</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Agenda Inteligente</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Gestão de auditórios, laboratórios, estúdios e eventos do HUB ES+</p>
          </div>
          ${canCreate ? `
            <button id="btn-novo-evento" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer">
              <i data-lucide="calendar-plus" class="w-4 h-4"></i>
              Agendar Evento
            </button>
          ` : ''}
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-evento" 
              type="text" 
              placeholder="Buscar por título, espaço ou pauta..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select id="select-filtro-status-evento" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option value="">Todos os Status</option>
              <option value="agendado" ${this.statusFilter === 'agendado' ? 'selected' : ''}>Agendado</option>
              <option value="em_andamento" ${this.statusFilter === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="concluido" ${this.statusFilter === 'concluido' ? 'selected' : ''}>Concluído</option>
              <option value="cancelado" ${this.statusFilter === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>

            ${this.usuarios.length > 0 ? `
              <select id="select-filtro-resp-evento" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">Todos os Responsáveis</option>
                ${this.usuarios.map(u => `
                  <option value="${u.id}" ${Number(this.responsavelFilter) === Number(u.id) ? 'selected' : ''}>${u.nome}</option>
                `).join('')}
              </select>
            ` : ''}
          </div>
        </div>

        <!-- Grade de Eventos -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum evento encontrado',
            description: 'Não constam eventos nos critérios ou datas selecionadas.',
            actionLabel: canCreate ? 'Novo Agendamento' : null,
            onActionClick: canCreate ? () => this._openFormModal(container) : null
          })
          : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${filtered.map(item => {
              const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome ||
                           item.responsavel_nome ||
                           (currentUser && Number(item.responsavel_id) === Number(currentUser.id) ? currentUser.nome : null) ||
                           (item.responsavel_id ? 'Responsável #' + item.responsavel_id : 'Responsável');

              const dateObj = new Date(item.data);
              const dataFmt = isNaN(dateObj.getTime()) ? item.data : dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
              const horaFmt = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const diaNumero = isNaN(dateObj.getTime()) ? '01' : String(dateObj.getDate()).padStart(2, '0');
              const diaSemana = isNaN(dateObj.getTime()) ? 'DIA' : (dataFmt.split(',')[0] || 'DIA');

              let terminoFmt = '';
              if (item.data_fim) {
                const dateFimObj = new Date(item.data_fim);
                if (!isNaN(dateFimObj.getTime())) {
                  terminoFmt = `${dateFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`;
                }
              }

              return `
                <div class="hub-card bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between group hover:border-blue-400 dark:hover:border-blue-500/60 transition-all">
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-3">
                      <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex flex-col items-center justify-center font-bold text-xs border border-sky-100 dark:border-sky-800/50 shrink-0">
                          <span class="text-[9px] uppercase font-sans text-sky-500 dark:text-sky-400">${diaSemana}</span>
                          <span>${diaNumero}</span>
                        </div>
                        <div>
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${horaFmt ? `${horaFmt}h` : 'Horário livre'}${terminoFmt ? ` - ${terminoFmt}` : ''}</span>
                          <p class="text-[11px] text-slate-400 dark:text-slate-400 font-medium">${dataFmt}</p>
                        </div>
                      </div>
                      ${window.UI.renderBadge(item.status)}
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mt-2">
                      ${item.titulo || item.local}
                    </h3>
                    ${item.descricao ? `<p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${item.descricao}</p>` : ''}
                    
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div class="flex items-center gap-2">
                        <i data-lucide="user-check" class="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0"></i>
                        <span class="truncate">Responsável: <strong class="text-slate-700 dark:text-slate-200 font-medium">${resp}</strong></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <i data-lucide="map-pin" class="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0"></i>
                        <span class="truncate">Espaço: <strong class="text-slate-700 dark:text-slate-200 font-medium">${item.local}</strong></span>
                      </div>
                      ${terminoFmt ? `
                      <div class="flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0"></i>
                        <span>Previsão de Término: <strong class="text-slate-700 dark:text-slate-200 font-medium">${terminoFmt}</strong></span>
                      </div>` : ''}
                    </div>
                  </div>

                  <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span class="text-[11px] font-mono text-slate-400 dark:text-slate-500">#EVT-${item.id}</span>
                    <div class="flex items-center gap-1">
                      ${canEdit ? `<button onclick="window.AgendaModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer" title="Editar">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>` : ''}
                      ${canDelete ? `<button onclick="window.AgendaModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>` : ''}
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
    const currentUser = window.Auth?.getUsuario();

    // Helper para converter data para o formato datetime-local preservando fuso horário local
    const formatToInputDate = (d) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        const pad = n => String(n).padStart(2, '0');
        const yyyy = date.getFullYear();
        const mm = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const min = pad(date.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      } catch (e) {
        return '';
      }
    };

    let defaultDate = '';
    let defaultDateFim = '';

    if (item && item.data) {
      defaultDate = formatToInputDate(item.data);
    } else {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      defaultDate = formatToInputDate(now);
    }

    if (item && item.data_fim) {
      defaultDateFim = formatToInputDate(item.data_fim);
    }

    const modalContent = `
      <form id="form-evento" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Título do Evento *</label>
          <input 
            type="text" 
            name="titulo" 
            required 
            value="${item && item.titulo ? item.titulo : ''}" 
            placeholder="Ex: Workshop de Design Thinking & Economia Criativa" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Local / Espaço do Evento *</label>
          <input 
            type="text" 
            name="local" 
            required 
            minlength="3"
            value="${item && item.local ? item.local : ''}" 
            placeholder="Ex: Auditório Master, Laboratório Maker, Estúdio Audiovisual..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Espaço físico ou sala reservada do HUB ES+ (mínimo 3 caracteres).</p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição / Pauta (Opcional)</label>
          <textarea 
            name="descricao" 
            rows="2"
            placeholder="Pauta da programação, público-alvo ou necessidades de infraestrutura..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >${item && item.descricao ? item.descricao : ''}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data e Horário de Início *</label>
            <input 
              type="datetime-local" 
              name="data" 
              required 
              value="${defaultDate}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data e Horário de Término (Opcional)</label>
            <input 
              type="datetime-local" 
              name="data_fim" 
              value="${defaultDateFim}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Responsável *</label>
            ${this.usuarios && this.usuarios.length > 0 ? `
              <select name="responsavel_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Selecione o responsável...</option>
                ${this.usuarios.map(u => `
                  <option value="${u.id}" ${(item ? Number(item.responsavel_id) === Number(u.id) : Number(currentUser?.id) === Number(u.id)) ? 'selected' : ''}>${u.nome}</option>
                `).join('')}
              </select>
            ` : `
              <div class="flex items-center gap-2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200">
                <i data-lucide="user" class="w-4 h-4 text-slate-400 shrink-0"></i>
                <span class="font-medium truncate">${currentUser?.nome || 'Operador Logado'}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold ml-auto shrink-0">${currentUser?.perfil || 'OPERADOR'}</span>
              </div>
              <input type="hidden" name="responsavel_id" value="${item ? item.responsavel_id : (currentUser?.id || '')}" />
            `}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status do Evento *</label>
            <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="agendado" ${(!item || item.status === 'agendado') ? 'selected' : ''}>Agendado</option>
              <option value="em_andamento" ${item && item.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="concluido" ${item && item.status === 'concluido' ? 'selected' : ''}>Concluído</option>
              <option value="cancelado" ${item && item.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Evento' : 'Agendar Novo Evento',
      subtitle: 'Reserva de espaços e programação oficial do HUB ES+',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Confirmar Agendamento',
      onSave: async () => {
        const form = document.getElementById('form-evento');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const titulo = (formData.get('titulo') || '').trim();
        const local = (formData.get('local') || '').trim();
        const descricao = (formData.get('descricao') || '').trim();
        const data = formData.get('data');
        const dataFim = formData.get('data_fim') || null;
        const status = formData.get('status') || 'agendado';
        const respIdRaw = formData.get('responsavel_id');
        const responsavelId = respIdRaw ? Number(respIdRaw) : (currentUser?.id || null);

        if (!local || local.length < 3) {
          window.UI.toast({
            title: 'Campo obrigatório',
            message: 'O local do evento deve ter no mínimo 3 caracteres.',
            type: 'warning'
          });
          return false;
        }

        if (!data) {
          window.UI.toast({
            title: 'Campo obrigatório',
            message: 'A data e horário de início são obrigatórios.',
            type: 'warning'
          });
          return false;
        }

        if (dataFim && new Date(dataFim) < new Date(data)) {
          window.UI.toast({
            title: 'Data inválida',
            message: 'A data/horário de término não pode ser anterior ao início.',
            type: 'warning'
          });
          return false;
        }

        const payload = {
          titulo: titulo || null,
          local,
          descricao: descricao || null,
          data,
          data_fim: dataFim || null,
          responsavel_id: responsavelId,
          status
        };

        try {
          if (isEdit) {
            await window.API.updateEvento(editId, payload);
            window.UI.toast({ title: 'Evento Atualizado', message: 'Agendamento salvo com sucesso.', type: 'success' });
          } else {
            await window.API.createEvento(payload);
            window.UI.toast({ title: 'Evento Agendado', message: 'Novo evento incluído na agenda do HUB ES+.', type: 'success' });
          }

          await this.render(container);
          return true;
        } catch (err) {
          console.error('Erro ao salvar evento:', err);
          window.UI.toast({
            title: 'Erro ao salvar',
            message: err.message || 'Falha ao salvar o evento na agenda.',
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
      title: 'Remover Evento?',
      message: 'Deseja realmente desmarcar e remover este evento da agenda?',
      isDanger: true,
      confirmText: 'Sim, Remover',
      onConfirm: async () => {
        try {
          await window.API.deleteEvento(id);
          window.UI.toast({ title: 'Evento Removido', message: 'O evento foi excluído da pauta.', type: 'warning' });
          await this.render(container);
        } catch (err) {
          console.error('Erro ao excluir evento:', err);
          window.UI.toast({ title: 'Erro ao excluir', message: err.message || 'Não foi possível remover o evento.', type: 'error' });
        }
      }
    });
  }
};
