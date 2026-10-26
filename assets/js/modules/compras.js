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
      const compras = await window.API.getCompras();
      const setores = window.Auth.hasPermission('setores.visualizar')
        ? await window.API.getSetores()
        : [];
      this.items = compras;
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
    const ownRequestsOnly = window.Auth.hasPermission('compras.visualizar_proprias') &&
      !window.Auth.hasPermission('compras.visualizar');
    const orderEntryOnly = window.Auth.hasPermission('compras.visualizar_pedidos') &&
      !window.Auth.hasPermission('compras.visualizar');
    const isAdminGeral = window.Auth.isAdmin();
    const canCreate = window.Auth.hasPermission('compras.criar');
    const canApprove = window.Auth.hasPermission('compras.aprovar');
    const canReceive = window.Auth.hasPermission('compras.receber');
    const canEdit = window.Auth.hasPermission('compras.editar');
    const canDelete = window.Auth.hasPermission('compras.excluir');
    const currentUserId = window.Auth.getUsuario()?.id;

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
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">${ownRequestsOnly ? 'Solicitação de Materiais de Consumo' : orderEntryOnly ? 'Entrada em Pedidos de Compra' : 'Gestão de Compras'}</h1>
            <p class="text-xs text-slate-500 font-medium">${ownRequestsOnly ? 'Solicite materiais e acompanhe o status das suas solicitações.' : orderEntryOnly ? 'Consulte pedidos aprovados e registre a entrada dos materiais.' : 'Pedidos gerados, aprovação e entrada de materiais.'}</p>
          </div>
          ${canCreate ? `<button id="btn-nova-compra" class="btn-primary">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            ${ownRequestsOnly ? 'Solicitar Material' : isAdminGeral ? 'Gerar Pedido' : 'Nova Solicitação'}
          </button>` : ''}
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
          <div class="relative w-full lg:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-compra" 
              type="text" 
              placeholder="Buscar por produto/item..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select id="select-filtro-status-compra" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900">
              <option value="">Todos os Status</option>
              <option value="pendente" ${this.statusFilter === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="aprovado" ${this.statusFilter === 'aprovado' ? 'selected' : ''}>Aprovado</option>
              <option value="entregue" ${this.statusFilter === 'entregue' ? 'selected' : ''}>Entregue</option>
              <option value="cancelado" ${this.statusFilter === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>

            ${this.setores.length ? `<select id="select-filtro-setor-compra" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>` : ''}
          </div>
        </div>

        <!-- Tabela de Compras -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhuma solicitação de compra',
            description: 'Nenhum pedido atende aos filtros selecionados.',
            actionLabel: canCreate ? 'Criar Solicitação' : null,
            onActionClick: canCreate ? () => this._openFormModal(container) : null
          })
          : `
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="px-6 py-3.5">ID</th>
                    <th class="px-6 py-3.5">Produto / Descrição</th>
                    ${ownRequestsOnly ? '' : '<th class="px-6 py-3.5">Solicitante</th><th class="px-6 py-3.5">Setor</th>'}
                    <th class="px-6 py-3.5">Status</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${paginatedItems.map(item => {
                    const isOwner = Number(item.solicitante_id) === Number(currentUserId);
                    const canEditThisItem = canEdit || (isOwner && item.status === 'pendente');

                    return `
                      <tr class="hub-table-row">
                        <td class="px-6 py-4 font-mono font-medium text-slate-400">#${item.id}</td>
                        <td class="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          <span class="max-w-xs line-clamp-1">${item.produto}</span>
                          ${item.valor_estimado ? `<span class="block text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">R$ ${Number(item.valor_estimado).toFixed(2)}</span>` : ''}
                        </td>
                        ${ownRequestsOnly ? '' : `<td class="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${item.solicitante_nome || '—'}
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${item.setor_nome || '—'}</td>`}
                        <td class="px-6 py-4">
                          ${window.UI.renderBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            ${canReceive && item.status === 'aprovado' ? `<button onclick="window.ComprasModule._registrarEntrada(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-success" title="Dar entrada no pedido">
                              <i data-lucide="package-check" class="w-4 h-4"></i>
                            </button>` : ''}
                            ${canApprove ? `<button onclick="window.ComprasModule._openStatusModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-primary" title="Mudar Status">
                              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>` : ''}
                            ${canEditThisItem ? `<button onclick="window.ComprasModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-edit" title="${isAdminGeral ? 'Digitar / Editar Tudo (Administrador)' : isOwner ? 'Editar minha solicitação' : 'Editar Pedido'}">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>` : ''}
                            ${canDelete ? `<button onclick="window.ComprasModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-delete" title="Excluir">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Paginação -->
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-2">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-compra-prev" class="btn-secondary py-1 px-3 text-xs">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-compra-next" class="btn-secondary py-1 px-3 text-xs">Próxima</button>
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
    const isAdmin = window.Auth.isAdmin();
    const currentUserId = window.Auth.getUsuario()?.id;
    const isOwner = item && Number(item.solicitante_id) === Number(currentUserId);

    const modalContent = `
      <form id="form-compra" class="space-y-4">
        ${isAdmin ? `
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-4 h-4 text-blue-600 shrink-0"></i>
            <span><strong>Modo Administrador:</strong> Você tem permissão total para digitar e editar todos os campos do pedido.</span>
          </div>
        ` : isOwner && isEdit ? `
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <i data-lucide="edit-3" class="w-4 h-4 text-amber-600 shrink-0"></i>
            <span><strong>Edição da sua solicitação:</strong> Altere os detalhes do material antes da aprovação final.</span>
          </div>
        ` : ''}

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Produto / Serviço Solicitado *</label>
          <input 
            type="text" 
            name="produto" 
            required 
            value="${item ? item.produto : ''}" 
            placeholder="Ex: Detergente concentrado, papel toalha ou equipamento"
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada</label>
          <textarea name="descricao" rows="2" placeholder="Especificações técnicas, marca de preferência ou detalhes..." class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">${item?.descricao || ''}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Quantidade *</label>
            <input type="number" name="quantidade" min="1" required value="${item ? item.quantidade : 1}" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
          </div>
          ${this.setores.length ? `<div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Setor de Destino</label>
            <select name="setor_id" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">Meu setor</option>
              ${this.setores.map(s => `<option value="${s.id}" ${item && Number(item.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>

        ${isAdmin ? `
          <!-- CAMPOS EXCLUSIVOS DO ADMINISTRADOR: DIGITAÇÃO COMPLETA -->
          <div class="pt-3 border-t border-slate-100 space-y-4">
            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="sliders" class="w-3.5 h-3.5 text-blue-600"></i> Parâmetros Administrativos & Financeiros
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Valor Estimado / Cotação (R$)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    name="valor_estimado" 
                    value="${item?.valor_estimado ? Number(item.valor_estimado).toFixed(2) : ''}" 
                    placeholder="0.00"
                    class="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Estágio do Fluxo (Status)</label>
                <select name="status" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="pendente" ${(!item || item.status === 'pendente') ? 'selected' : ''}>Pendente (Aguardando Análise)</option>
                  <option value="aprovado" ${item?.status === 'aprovado' ? 'selected' : ''}>Aprovado (Liberado p/ Compra)</option>
                  <option value="entregue" ${item?.status === 'entregue' ? 'selected' : ''}>Entregue (Mercadoria Recebida)</option>
                  <option value="cancelado" ${item?.status === 'cancelado' ? 'selected' : ''}>Cancelado (Recusado)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Justificativa / Parecer Administrativo</label>
              <textarea 
                name="justificativa" 
                rows="2" 
                placeholder="Insira anotações, motivo de aprovação/rejeição ou dados da cotação..."
                class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >${item?.justificativa || ''}</textarea>
            </div>
          </div>
        ` : ''}
      </form>
    `;

    const tituloModal = isEdit
      ? (isAdmin ? 'Editar Pedido de Compra (Administrador)' : isOwner ? 'Editar Minha Solicitação de Compra' : 'Editar Solicitação')
      : (
        (window.Auth.hasPermission('compras.visualizar_proprias') &&
          !window.Auth.hasPermission('compras.visualizar'))
          ? 'Solicitar Material de Consumo'
          : isAdmin ? 'Gerar Pedido de Compra' : 'Nova Solicitação de Compra'
      );

    const subtituloModal = isEdit
      ? (isAdmin ? 'Edite qualquer dado, valor, status ou parecer administrativo.' : 'Altere os dados da sua solicitação que já foi pedida.')
      : 'O registro será vinculado automaticamente ao usuário autenticado.';

    window.UI.openModal({
      title: tituloModal,
      subtitle: subtituloModal,
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Enviar Solicitação',
      maxWidth: isAdmin ? 'max-w-xl' : 'max-w-lg',
      onSave: async () => {
        const form = document.getElementById('form-compra');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          produto: formData.get('produto').trim(),
          descricao: formData.get('descricao')?.trim() || null,
          quantidade: Number(formData.get('quantidade')),
          setor_id: formData.get('setor_id') ? Number(formData.get('setor_id')) : null
        };

        if (isAdmin) {
          const valorVal = formData.get('valor_estimado');
          payload.valor_estimado = (valorVal !== null && valorVal !== '') ? Number(valorVal) : null;
          if (formData.get('status')) payload.status = formData.get('status');
          payload.justificativa = formData.get('justificativa')?.trim() || null;
        }

        try {
          if (isEdit) {
            await window.API.updateCompra(editId, payload);
            window.UI.toast({
              title: 'Solicitação Atualizada',
              message: isAdmin ? 'O pedido foi atualizado com sucesso com todos os parâmetros.' : 'Sua solicitação de compra foi atualizada com sucesso!'
            });
          } else {
            await window.API.createCompra(payload);
            window.UI.toast({ title: 'Solicitação Enviada', message: 'Pedido registrado no fluxo de compras.' });
          }

          await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Salvar',
            message: err.message || 'Não foi possível salvar a alteração.',
            type: 'error'
          });
          return false;
        }
      }
    });

    if (window.lucide) {
      const modalEl = document.getElementById('modal-container');
      if (modalEl) window.lucide.createIcons({ root: modalEl });
    }
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
        await window.API.updateStatusCompra(id, checked.value);
        window.UI.toast({ title: 'Status Atualizado', message: `Pedido agora está ${checked.value}.` });
        await this.render(container);
        return true;
      }
    });
  },

  async _registrarEntrada(container, id) {
    try {
      await window.API.registrarEntradaCompra(id);
      window.UI.toast({ title: 'Entrada registrada', message: 'Pedido marcado como entregue.' });
      await this.render(container);
    } catch (err) {
      window.UI.toast({ title: 'Não foi possível registrar', message: err.message, type: 'error' });
    }
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
