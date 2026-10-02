/**
 * HUB ES+ - Módulo 7: Central de Comunicação
 * Gestão de comunicados oficiais, avisos prediais e boletins informativos internos.
 */

window.ComunicacaoModule = {
  items: [],
  usuarios: [],

  async render(container) {
    container.innerHTML = window.UI.renderCardsSkeleton(3);

    try {
      const [comunicados, usuarios] = await Promise.all([
        window.API.getComunicados(),
        window.API.getUsuarios()
      ]);
      this.items = comunicados;
      this.usuarios = usuarios;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar comunicados:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Central inacessível',
        description: 'Não foi possível carregar os comunicados internos.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 tracking-wide uppercase">
                Endomarketing & Avisos
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} comunicados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Central de Comunicação</h1>
            <p class="text-xs text-slate-500 font-medium">Transmissão de informativos gerais, avisos de manutenção e notícias institucionais</p>
          </div>
          <button id="btn-novo-comunicado" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-md shadow-purple-600/20 transition-all">
            <i data-lucide="send" class="w-4 h-4"></i>
            Novo Comunicado
          </button>
        </div>

        <!-- Grade de Comunicados -->
        ${this.items.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum comunicado recente',
            description: 'Todos os informativos anteriores foram arquivados.',
            actionLabel: 'Publicar Aviso',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${this.items.map(item => {
              const autor = this.usuarios.find(u => Number(u.id) === Number(item.autor_id))?.nome || 'Administração HUB ES+';
              const isAlta = item.prioridade === 'alta';

              return `
                <div class="hub-card bg-white rounded-2xl p-6 border ${isAlta ? 'border-rose-200 shadow-rose-500/5' : 'border-slate-200'} shadow-sm flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isAlta ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        item.prioridade === 'media' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }">
                        Prioridade ${item.prioridade || 'Normal'}
                      </span>
                      <span class="text-[11px] text-slate-400 font-medium">${item.data || 'Hoje'}</span>
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 leading-snug mb-2">${item.titulo}</h3>
                    <p class="text-xs text-slate-600 leading-relaxed">${item.mensagem}</p>
                  </div>

                  <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                        ${autor.charAt(0)}
                      </div>
                      <span class="text-xs text-slate-600 font-medium truncate max-w-[130px]">${autor}</span>
                    </div>

                    <button onclick="window.ComunicacaoModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir comunicado">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
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

    container.querySelector('#btn-novo-comunicado')?.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container) {
    const modalContent = `
      <form id="form-comunicado" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Título do Comunicado *</label>
          <input 
            type="text" 
            name="titulo" 
            required 
            placeholder="Ex: Atualização nos horários de funcionamento no feriado" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Autor / Responsável *</label>
            <select name="autor_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white">
              <option value="">Selecione...</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}">${u.nome}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nível de Prioridade *</label>
            <select name="prioridade" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white">
              <option value="normal">Normal</option>
              <option value="media">Média</option>
              <option value="alta">Alta / Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Mensagem do Comunicado *</label>
          <textarea 
            name="mensagem" 
            required 
            rows="4" 
            placeholder="Escreva aqui os detalhes do informativo para a comunidade do HUB ES+..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          ></textarea>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Novo Comunicado Interno',
      subtitle: 'Divulgação oficial para os colaboradores e residentes',
      contentHtml: modalContent,
      saveLabel: 'Publicar Comunicado',
      onSave: async () => {
        const form = document.getElementById('form-comunicado');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          titulo: formData.get('titulo').trim(),
          autor_id: Number(formData.get('autor_id')),
          prioridade: formData.get('prioridade'),
          mensagem: formData.get('mensagem').trim(),
          data: new Date().toISOString().slice(0, 10)
        };

        // TODO: conectar endpoint POST /comunicados
        await window.API.createComunicado(payload);
        window.UI.toast({ title: 'Aviso Publicado', message: 'O comunicado já está disponível na plataforma.' });
        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Comunicado?',
      message: 'Tem certeza que deseja apagar este comunicado da central?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /comunicados/:id
        await window.API.deleteComunicado(id);
        window.UI.toast({ title: 'Comunicado Removido', message: 'O aviso foi excluído.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
