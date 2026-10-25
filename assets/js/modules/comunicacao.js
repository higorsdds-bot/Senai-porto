/**
 * HUB ES+ - Módulo 7: Central de Comunicação
 * Gestão de comunicados oficiais, avisos prediais e boletins informativos internos.
 */

window.ComunicacaoModule = {
  items: [],
  usuarios: [],
  filtroPrioridade: 'todas',
  filtroBusca: '',

  async render(container) {
    container.innerHTML = window.UI.renderCardsSkeleton(3);

    try {
      const isVisitante = window.Auth?.isVisitante();
      let comunicados, usuarios;

      if (isVisitante) {
        // Modo visitante: usa rota pública, sem buscar usuários
        comunicados = await window.API.getPublicComunicados();
        usuarios = [];
      } else {
        [comunicados, usuarios] = await Promise.all([
          window.API.getComunicados(),
          window.API.getUsuarios().catch(() => [])
        ]);
      }

      this.items = Array.isArray(comunicados) ? comunicados : [];
      this.usuarios = Array.isArray(usuarios) ? usuarios : [];
      this._renderView(container);
    } catch (err) {
      console.error('[COMUNICACAO] Erro ao carregar comunicados:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Central inacessível',
        description: 'Não foi possível carregar os comunicados internos.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const podeCriar = window.Auth?.hasPermission('comunicados.criar') || window.Auth?.isAdmin();
    const podeExcluir = window.Auth?.hasPermission('comunicados.excluir') || window.Auth?.isAdmin();

    // Filtragem local dos comunicados
    const filtrados = this.items.filter(item => {
      const matchPrioridade = this.filtroPrioridade === 'todas' || item.prioridade === this.filtroPrioridade;
      const q = this.filtroBusca.toLowerCase().trim();
      const matchBusca = !q || 
        (item.titulo && item.titulo.toLowerCase().includes(q)) ||
        (item.mensagem && item.mensagem.toLowerCase().includes(q)) ||
        (item.autor_nome && item.autor_nome.toLowerCase().includes(q));
      return matchPrioridade && matchBusca;
    });

    const contagemTodas = this.items.length;
    const contagemAlta = this.items.filter(i => i.prioridade === 'alta').length;
    const contagemMedia = this.items.filter(i => i.prioridade === 'media').length;
    const contagemNormal = this.items.filter(i => i.prioridade === 'normal' || !i.prioridade).length;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 tracking-wide uppercase">
                Endomarketing & Avisos
              </span>
              <span class="text-xs text-slate-400">• ${contagemTodas} comunicados cadastrados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Central de Comunicação</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Transmissão de informativos gerais, avisos de manutenção e notícias institucionais</p>
          </div>
          ${podeCriar ? `
            <button id="btn-novo-comunicado" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-md shadow-purple-600/20 transition-all">
              <i data-lucide="send" class="w-4 h-4"></i>
              Novo Comunicado
            </button>
          ` : ''}
        </div>

        <!-- Barra de Busca e Filtros -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <!-- Filtros de Prioridade -->
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button data-filtro-prioridade="todas" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroPrioridade === 'todas' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Todos (${contagemTodas})
            </button>
            <button data-filtro-prioridade="alta" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroPrioridade === 'alta' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Alta (${contagemAlta})
            </button>
            <button data-filtro-prioridade="media" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroPrioridade === 'media' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Média (${contagemMedia})
            </button>
            <button data-filtro-prioridade="normal" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroPrioridade === 'normal' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Normal (${contagemNormal})
            </button>
          </div>

          <!-- Campo de Busca Rápida -->
          <div class="relative w-full sm:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-comunicados" 
              type="text" 
              value="${this.filtroBusca}" 
              placeholder="Filtrar comunicados..." 
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>

        <!-- Grade de Comunicados -->
        ${filtrados.length === 0 ? 
          window.UI.renderEmptyState({
            title: this.items.length === 0 ? 'Nenhum comunicado recente' : 'Nenhum comunicado encontrado',
            description: this.items.length === 0 ? 'Todos os informativos anteriores foram arquivados.' : 'Tente alterar os termos de busca ou filtros selecionados.',
            actionLabel: (podeCriar && this.items.length === 0) ? 'Publicar Aviso' : null,
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${filtrados.map(item => {
              const autor = item.autor_nome || this.usuarios.find(u => Number(u.id) === Number(item.autor_id))?.nome || 'Administração HUB ES+';
              const isAlta = item.prioridade === 'alta';
              const isMedia = item.prioridade === 'media';

              const dataObj = item.created_at ? new Date(item.created_at) : (item.data ? new Date(item.data) : new Date());
              const dataFmt = !isNaN(dataObj) 
                ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : (item.data || 'Hoje');

              return `
                <div class="hub-card bg-white dark:bg-slate-800 rounded-2xl p-6 border ${
                  isAlta ? 'border-rose-200 dark:border-rose-800/80 shadow-rose-500/5' : 
                  isMedia ? 'border-amber-200 dark:border-amber-800/80' : 
                  'border-slate-200 dark:border-slate-700'
                } shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAlta ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                        isMedia ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }">
                        Prioridade ${item.prioridade || 'Normal'}
                      </span>
                      <span class="text-[11px] text-slate-400 font-medium">${dataFmt}</span>
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      ${item.titulo}
                    </h3>
                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      ${item.mensagem}
                    </p>
                  </div>

                  <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                        ${autor.charAt(0).toUpperCase()}
                      </div>
                      <span class="text-xs text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">${autor}</span>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button onclick="window.ComunicacaoModule.abrirDetalhes(${item.id})" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors" title="Visualizar comunicado completo">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Ver</span>
                      </button>

                      ${podeExcluir ? `
                        <button onclick="window.ComunicacaoModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors" title="Excluir comunicado">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
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

    this._bindEvents(container);
  },

  _bindEvents(container) {
    // Botão Novo Comunicado
    container.querySelector('#btn-novo-comunicado')?.addEventListener('click', () => this._openFormModal(container));

    // Filtros de prioridade
    container.querySelectorAll('[data-filtro-prioridade]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroPrioridade = btn.getAttribute('data-filtro-prioridade');
        this._renderView(container);
      });
    });

    // Busca textual com listener
    const inputBusca = container.querySelector('#input-busca-comunicados');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        this.filtroBusca = e.target.value;
        // Debounce simples ou re-render
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this._renderView(container);
          // Manter o foco no input
          const novoInput = container.querySelector('#input-busca-comunicados');
          if (novoInput) {
            novoInput.focus();
            novoInput.setSelectionRange(novoInput.value.length, novoInput.value.length);
          }
        }, 200);
      });
    }
  },

  abrirDetalhes(comunicadoId) {
    const item = this.items.find(c => Number(c.id) === Number(comunicadoId));
    if (item && window.UI && typeof window.UI.visualizarComunicado === 'function') {
      window.UI.visualizarComunicado(item);
    } else if (window.UI) {
      window.UI.visualizarComunicado(comunicadoId);
    }
  },

  _openFormModal(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const modalContent = `
      <form id="form-comunicado" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Título do Comunicado *</label>
          <input 
            type="text" 
            name="titulo" 
            required 
            minlength="3"
            placeholder="Ex: Atualização nos horários de funcionamento no feriado" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
          <span class="text-[10px] text-slate-400">Mínimo de 3 caracteres</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Autor / Responsável *</label>
            <select name="autor_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
              <option value="">Selecione...</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${usuarioLogado && Number(usuarioLogado.id) === Number(u.id) ? 'selected' : ''}>
                  ${u.nome} (${u.perfil || 'Colaborador'})
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nível de Prioridade *</label>
            <select name="prioridade" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
              <option value="normal" selected>Normal</option>
              <option value="media">Média</option>
              <option value="alta">Alta / Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mensagem do Comunicado *</label>
          <textarea 
            name="mensagem" 
            required 
            minlength="3"
            rows="5" 
            placeholder="Escreva aqui os detalhes do informativo para a comunidade do HUB ES+..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          ></textarea>
          <span class="text-[10px] text-slate-400">Mínimo de 3 caracteres</span>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Novo Comunicado Interno',
      subtitle: 'Divulgação oficial para colaboradores, residentes e comunidade',
      contentHtml: modalContent,
      saveLabel: 'Publicar Comunicado',
      onSave: async () => {
        const form = document.getElementById('form-comunicado');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const titulo = (formData.get('titulo') || '').trim();
        const mensagem = (formData.get('mensagem') || '').trim();
        const prioridade = (formData.get('prioridade') || 'normal').toLowerCase();
        const autorId = Number(formData.get('autor_id')) || usuarioLogado?.id;

        if (titulo.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'O título deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }

        if (mensagem.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'A mensagem deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }

        const payload = {
          titulo,
          autor_id: autorId,
          prioridade,
          mensagem,
          data: new Date().toISOString().slice(0, 10)
        };

        try {
          await window.API.createComunicado(payload);
          window.UI.toast({ title: 'Aviso Publicado', message: 'O comunicado já está disponível em todos os locais da plataforma.' });
          
          if (window.App && typeof window.App.atualizarBadgeComunicados === 'function') {
            window.App.atualizarBadgeComunicados();
          }

          await this.render(container);
          return true;
        } catch (err) {
          console.error('[COMUNICACAO] Erro ao criar:', err);
          window.UI.toast({ title: 'Erro ao Publicar', message: err.message || 'Falha ao salvar comunicado.', type: 'error' });
          return false;
        }
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Comunicado?',
      message: 'Tem certeza que deseja apagar este comunicado da central? Ele deixará de ser visível no painel e na barra de notificações.',
      onConfirm: async () => {
        try {
          await window.API.deleteComunicado(id);
          window.UI.toast({ title: 'Comunicado Removido', message: 'O aviso foi excluído com sucesso.', type: 'warning' });
          
          if (window.App && typeof window.App.atualizarBadgeComunicados === 'function') {
            window.App.atualizarBadgeComunicados();
          }

          await this.render(container);
        } catch (err) {
          console.error('[COMUNICACAO] Erro ao excluir:', err);
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao excluir comunicado.', type: 'error' });
        }
      }
    });
  }
};
