/**
 * HUB ES+ - Módulo 10: Controle de Equipamentos
 * Tabela: equipamentos (id, nome, patrimonio, responsavel_id)
 * Funcionalidades: listagem de ativos patrimoniais, busca por patrimônio ou nome,
 * vínculo responsavel_id, CRUD completo e modais.
 */

window.EquipamentosModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [equipamentos, usuarios] = await Promise.all([
        window.API.getEquipamentos(),
        window.API.getUsuarios()
      ]);
      this.items = equipamentos;
      this.usuarios = usuarios;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro de inventário',
        description: 'Não foi possível carregar os equipamentos cadastrados.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    let filtered = this.items.filter(item => {
      const q = this.searchTerm.toLowerCase();
      const matchNome = (item.nome || '').toLowerCase().includes(q);
      const matchPatrimonio = (item.patrimonio || '').toLowerCase().includes(q);
      return matchNome || matchPatrimonio;
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
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase">
                Ativos & Patrimônio
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} itens tombados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Controle de Equipamentos</h1>
            <p class="text-xs text-slate-500 font-medium">Gestão patrimonial de bens duráveis, TI e infraestrutura do HUB ES+</p>
          </div>
          <button id="btn-novo-equipamento" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/20 transition-all">
            <i data-lucide="hard-drive" class="w-4 h-4"></i>
            Cadastrar Equipamento
          </button>
        </div>

        <!-- Barra de Busca -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-equip" 
              type="text" 
              placeholder="Buscar por nome ou número de patrimônio..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <!-- Tabela -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum equipamento localizado',
            description: 'Verifique os termos de pesquisa informados.',
            actionLabel: 'Novo Equipamento',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Equipamento / Ativo</th>
                    <th class="px-6 py-3.5">Nº Patrimônio</th>
                    <th class="px-6 py-3.5">Responsável (Guarda)</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
                    const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || 'Não vinculado';
                    return `
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <i data-lucide="cpu" class="w-4 h-4"></i>
                            </div>
                            <span class="max-w-md line-clamp-1">${item.nome}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            ${item.patrimonio}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-slate-600">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${resp}
                          </div>
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.EquipamentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.EquipamentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-equip-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-equip-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    container.querySelector('#input-busca-equip')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-equip-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-equip-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-novo-equipamento')?.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-equipamento" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nome / Descrição do Equipamento *</label>
          <input 
            type="text" 
            name="nome" 
            required 
            value="${item ? item.nome : ''}" 
            placeholder="Ex: Câmera Sony Alpha 4K com Lente 24-70mm" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Número de Patrimônio *</label>
          <input 
            type="text" 
            name="patrimonio" 
            required 
            value="${item ? item.patrimonio : ''}" 
            placeholder="Ex: HUB-PAT-00999" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono uppercase"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Responsável pela Guarda (responsavel_id) *</label>
          <select name="responsavel_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
            <option value="">Selecione o responsável...</option>
            ${this.usuarios.map(u => `
              <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>${u.nome} (${u.email})</option>
            `).join('')}
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Equipamento' : 'Cadastrar Equipamento',
      subtitle: 'Tabela equipamentos do banco de dados HUB ES+',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Tornar Patrimônio',
      onSave: async () => {
        const form = document.getElementById('form-equipamento');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          nome: formData.get('nome').trim(),
          patrimonio: formData.get('patrimonio').trim(),
          responsavel_id: Number(formData.get('responsavel_id'))
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /equipamentos/:id
          await window.API.updateEquipamento(editId, payload);
          window.UI.toast({ title: 'Equipamento Atualizado', message: 'Dados salvos com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /equipamentos
          await window.API.createEquipamento(payload);
          window.UI.toast({ title: 'Equipamento Cadastrado', message: 'Item registrado no patrimônio do HUB ES+.' });
        }

        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Remover Equipamento?',
      message: 'Tem certeza que deseja desincorporar este equipamento do controle patrimonial?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /equipamentos/:id
        await window.API.deleteEquipamento(id);
        window.UI.toast({ title: 'Equipamento Removido', message: 'Registro de patrimônio apagado.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
