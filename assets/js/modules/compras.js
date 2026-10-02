/**
 * HUB ES+ - Módulo 4: Compras
 * Tabela: compras (id, solicitante_id, setor_id, produto, status)
 * Funcionalidades: listagem de solicitações, fluxo de status (pendente, aprovado, entregue, cancelado),
 * vínculo solicitante_id / setor_id carregados da API, busca, filtros e modais CRUD.
 */

window.ComprasModule = {
  items: [],
  usuarios: [],
  setores: [],
  searchTerm: '',
  statusFilter: '',
  setorFilter: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [compras, usuarios, setores] = await Promise.all([
        window.API.getCompras(),
        window.API.getUsuarios(),
        window.API.getSetores()
      ]);
      this.items = compras;
      this.usuarios = usuarios;
      this.setores = setores;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar os pedidos de compra.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    let filtered = this.items.filter(item => {
      const matchText = (item.produto || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchSetor = !this.setorFilter || Number(item.setor_id) === Number(this.setorFilter);
      return matchText && matchStatus && matchSetor;
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
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 tracking-wide uppercase">
                Suprimentos
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} pedidos</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Gestão de Compras</h1>
            <p class="text-xs text-slate-500 font-medium">Fluxo de requisição, autorização e entrega de materiais e serviços</p>
          </div>
          <button id="btn-nova-compra" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            Nova Solicitação
          </button>
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-compra" 
              type="text" 
              placeholder="Buscar por produto/item..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select id="select-filtro-status-compra" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Status</option>
              <option value="pendente" ${this.statusFilter === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="aprovado" ${this.statusFilter === 'aprovado' ? 'selected' : ''}>Aprovado</option>
              <option value="entregue" ${this.statusFilter === 'entregue' ? 'selected' : ''}>Entregue</option>
              <option value="cancelado" ${this.statusFilter === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>

            <select id="select-filtro-setor-compra" class="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Tabela de Compras -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhuma solicitação de compra',
            description: 'Nenhum pedido atende aos filtros selecionados.',
            actionLabel: 'Criar Solicitação',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Produto / Descrição</th>
                    <th class="px-6 py-3.5">Solicitante</th>
                    <th class="px-6 py-3.5">Setor</th>
                    <th class="px-6 py-3.5">Status</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
                    const solicitante = this.usuarios.find(u => Number(u.id) === Number(item.solicitante_id))?.nome || 'Usuário #' + item.solicitante_id;
                    const setor = this.setores.find(s => Number(s.id) === Number(item.setor_id))?.nome || 'Setor #' + item.setor_id;
                    return `
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800">
                          <span class="max-w-xs line-clamp-1">${item.produto}</span>
                        </td>
                        <td class="px-6 py-4 text-slate-600">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${solicitante}
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600">${setor}</td>
                        <td class="px-6 py-4">
                          ${window.UI.renderBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.ComprasModule._openStatusModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mudar Status">
                              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.ComprasModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.ComprasModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-compra-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-compra-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    // Eventos
    container.querySelector('#input-busca-compra')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-status-compra')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-setor-compra')?.addEventListener('change', (e) => {
      this.setorFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-compra-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-compra-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-nova-compra')?.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-compra" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Produto / Serviço Solicitado *</label>
          <input 
            type="text" 
            name="produto" 
            required 
            value="${item ? item.produto : ''}" 
            placeholder="Ex: Câmera PTZ para videoconferências" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Solicitante (solicitante_id) *</label>
            <select name="solicitante_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Selecione o solicitante...</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${item && Number(item.solicitante_id) === Number(u.id) ? 'selected' : ''}>${u.nome}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Setor de Destino (setor_id) *</label>
            <select name="setor_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Selecione o setor...</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${item && Number(item.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Status do Pedido *</label>
          <select name="status" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
            <option value="pendente" ${item && item.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="aprovado" ${item && item.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
            <option value="entregue" ${item && item.status === 'entregue' ? 'selected' : ''}>Entregue</option>
            <option value="cancelado" ${item && item.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Pedido de Compra' : 'Nova Solicitação de Compra',
      subtitle: 'Estruturado estritamente segundo a tabela compras do banco de dados',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Enviar Solicitação',
      onSave: async () => {
        const form = document.getElementById('form-compra');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          produto: formData.get('produto').trim(),
          solicitante_id: Number(formData.get('solicitante_id')),
          setor_id: Number(formData.get('setor_id')),
          status: formData.get('status')
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /compras/:id
          await window.API.updateCompra(editId, payload);
          window.UI.toast({ title: 'Pedido Atualizado', message: 'Solicitação de compra salva com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /compras
          await window.API.createCompra(payload);
          window.UI.toast({ title: 'Solicitação Enviada', message: 'Pedido registrado no fluxo de compras.' });
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
        <p class="text-xs text-slate-600">Altere o estágio do fluxo do item: <strong class="text-slate-800">${item.produto}</strong></p>
        <div class="space-y-2">
          ${['pendente', 'aprovado', 'entregue', 'cancelado'].map(st => `
            <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="radio" name="quick_status" value="${st}" ${item.status === st ? 'checked' : ''} class="text-blue-600 focus:ring-blue-500">
              <span class="text-xs font-semibold uppercase">${st}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Atualizar Status da Compra',
      contentHtml: modalContent,
      saveLabel: 'Confirmar Status',
      maxWidth: 'max-w-sm',
      onSave: async () => {
        const checked = document.querySelector('input[name="quick_status"]:checked');
        if (!checked) return;
        // TODO: conectar endpoint PUT /compras/:id
        await window.API.updateCompra(id, { status: checked.value });
        window.UI.toast({ title: 'Status Atualizado', message: `Pedido agora está ${checked.value}.` });
        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Solicitação?',
      message: 'Tem certeza que deseja cancelar e excluir esta requisição de compra?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /compras/:id
        await window.API.deleteCompra(id);
        window.UI.toast({ title: 'Pedido Removido', message: 'A solicitação foi excluída.', type: 'warning' });
        await this.render(container);
      }
    });
  }
};
