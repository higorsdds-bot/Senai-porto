/**
 * HUB ES+ - Módulo 3: Controle de Insumos
 * Gestão de insumos e consumíveis com níveis de alerta de estoque mínimo,
 * unidade de medida, vínculo de setor e reabastecimento.
 */

window.InsumosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  setorFilter: '',
  alertOnlyFilter: false,
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [insumos, setores] = await Promise.all([
        window.API.getInsumos(),
        window.API.getSetores()
      ]);
      this.items = insumos;
      this.setores = setores;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar insumos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro de almoxarifado',
        description: 'Não foi possível carregar os itens de insumo.',
        actionLabel: 'Recarregar',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
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

    const totalCriticos = this.items.filter(i => i.quantidade <= i.estoque_minimo).length;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 tracking-wide uppercase">
                Almoxarifado & Estoque
              </span>
              ${totalCriticos > 0 ? `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  ${totalCriticos} em nível crítico
                </span>
              ` : ''}
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Controle de Insumos</h1>
            <p class="text-xs text-slate-500 font-medium">Controle de materiais de consumo com monitoramento automático de estoque mínimo</p>
          </div>
          <button id="btn-novo-insumo" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 transition-all">
            <i data-lucide="package-plus" class="w-4 h-4"></i>
            Cadastrar Insumo
          </button>
        </div>

        <!-- Barra de Busca e Filtros -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-insumo" 
              type="text" 
              placeholder="Buscar insumo por nome..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <label class="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer select-none">
              <input type="checkbox" id="check-alerta-insumo" ${this.alertOnlyFilter ? 'checked' : ''} class="rounded text-rose-600 focus:ring-rose-500">
              <span class="text-slate-700">Apenas Alertas Críticos</span>
            </label>

            <select id="select-filtro-setor-insumo" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Tabela -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum insumo encontrado',
            description: 'Nenhum material atende aos filtros de busca ou estoque selecionados.',
            actionLabel: 'Novo Insumo',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Material / Insumo</th>
                    <th class="px-6 py-3.5">Quantidade em Estoque</th>
                    <th class="px-6 py-3.5">Estoque Mínimo</th>
                    <th class="px-6 py-3.5">Setor Atendido</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
                    const isCritical = item.quantidade <= item.estoque_minimo;
                    const setor = this.setores.find(s => Number(s.id) === Number(item.setor_id))?.nome || 'Setor Geral';
                    return `
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg ${isCritical ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center shrink-0">
                              <i data-lucide="${isCritical ? 'alert-triangle' : 'box'}" class="w-4 h-4"></i>
                            </div>
                            <span class="max-w-md line-clamp-1">${item.nome}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-extrabold ${isCritical ? 'text-rose-600' : 'text-slate-800'}">${item.quantidade}</span>
                            <span class="text-slate-500 font-mono text-[11px]">${item.unidade}</span>
                            ${isCritical ? `
                              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">Crítico</span>
                            ` : ''}
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600 font-mono">${item.estoque_minimo} ${item.unidade}</td>
                        <td class="px-6 py-4 text-slate-600">${setor}</td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.InsumosModule._openAdjustModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ajustar Quantidade">
                              <i data-lucide="plus-minus" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.InsumosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.InsumosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-ins-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-ins-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

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
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-insumo" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nome do Insumo / Material *</label>
          <input 
            type="text" 
            name="nome" 
            required 
            value="${item ? item.nome : ''}" 
            placeholder="Ex: Café em Grãos Gourmet 1kg" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Qtd Atual *</label>
            <input 
              type="number" 
              name="quantidade" 
              required 
              min="0"
              value="${item ? item.quantidade : '0'}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Estoque Mínimo *</label>
            <input 
              type="number" 
              name="estoque_minimo" 
              required 
              min="1"
              value="${item ? item.estoque_minimo : '5'}" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Unidade *</label>
            <input 
              type="text" 
              name="unidade" 
              required 
              value="${item ? item.unidade : 'unid'}" 
              placeholder="ex: cx, pct, unid" 
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Setor Designado *</label>
          <select name="setor_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white">
            <option value="">Selecione o setor...</option>
            ${this.setores.map(s => `
              <option value="${s.id}" ${item && Number(item.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
          </select>
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
          setor_id: Number(formData.get('setor_id'))
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /insumos/:id
          await window.API.updateInsumo(editId, payload);
          window.UI.toast({ title: 'Insumo Atualizado', message: 'Alterações salvas com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /insumos
          await window.API.createInsumo(payload);
          window.UI.toast({ title: 'Insumo Cadastrado', message: 'Material adicionado ao almoxarifado.' });
        }

        await this.render(container);
        return true;
      }
    });
  },

  _openAdjustModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const modalContent = `
      <div class="space-y-4">
        <p class="text-xs text-slate-600">Ajuste de saldo físico para: <strong class="text-slate-800">${item.nome}</strong></p>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nova Quantidade (${item.unidade})</label>
          <input 
            type="number" 
            id="input-novo-saldo" 
            min="0"
            value="${item.quantidade}" 
            class="w-full px-3.5 py-2 text-sm font-bold font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Ajuste de Saldo de Estoque',
      contentHtml: modalContent,
      saveLabel: 'Salvar Novo Saldo',
      maxWidth: 'max-w-sm',
      onSave: async () => {
        const val = document.getElementById('input-novo-saldo').value;
        const newQtd = Number(val);
        if (isNaN(newQtd) || newQtd < 0) return false;

        // TODO: conectar endpoint PUT /insumos/:id
        await window.API.updateInsumo(id, { quantidade: newQtd });
        window.UI.toast({ title: 'Estoque Ajustado', message: `Novo saldo: ${newQtd} ${item.unidade}.` });
        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Insumo?',
      message: 'Tem certeza que deseja apagar este item de material do inventário?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /insumos/:id
        await window.API.deleteInsumo(id);
        window.UI.toast({ title: 'Insumo Removido', message: 'Item apagado com sucesso.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
