/**
 * HUB ES+ - Módulo 2: Gestão Documental
 * Tabela: documentos (id, titulo, setor_id, arquivo)
 * Funcionalidades: listagem, busca por título, filtro por setor, upload/cadastro, download simulado, edição e exclusão.
 */

window.DocumentosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  setorFilter: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(4, 5);

    try {
      const [docs, setores] = await Promise.all([
        window.API.getDocumentos(),
        window.API.getSetores()
      ]);
      this.items = docs;
      this.setores = setores;
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível conectar com o serviço de documentos.',
        actionLabel: 'Recarregar',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    // Filtros
    let filtered = this.items.filter(doc => {
      const matchText = (doc.titulo || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchSetor = !this.setorFilter || Number(doc.setor_id) === Number(this.setorFilter);
      return matchText && matchSetor;
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
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
                Repositório
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} itens</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Gestão Documental</h1>
            <p class="text-xs text-slate-500 font-medium">Arquivos normativos, termos, atas e relatórios oficiais do HUB ES+</p>
          </div>
          <button id="btn-novo-doc" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all">
            <i data-lucide="upload" class="w-4 h-4"></i>
            Novo Documento
          </button>
        </div>

        <!-- Barra de Ferramentas: Busca e Filtros -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="relative w-full md:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-doc" 
              type="text" 
              placeholder="Buscar por título do documento..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto">
            <select id="select-filtro-setor" class="w-full md:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Tabela de Documentos -->
        ${filtered.length === 0 ?
        window.UI.renderEmptyState({
          title: 'EM MANUTENÇÃO! AGUARDE O TI TERMINAR',
          description: 'FORA DO AR',
          actionLabel: 'Cadastrar Documento',
          onActionClick: () => this._openFormModal(container)
        })
        : `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3.5">Título do Documento</th>
                    <th class="px-6 py-3.5">Setor Responsável</th>
                    <th class="px-6 py-3.5">Nome do Arquivo</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${paginatedItems.map(item => {
          const setor = this.setores.find(s => Number(s.id) === Number(item.setor_id))?.nome || 'Não definido';
          return `
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 font-semibold text-slate-800">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <i data-lucide="file-text" class="w-4 h-4"></i>
                            </div>
                            <span class="max-w-md line-clamp-1">${item.titulo}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600">${setor}</td>
                        <td class="px-6 py-4">
                          <span class="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            ${item.arquivo || 'sem-arquivo.pdf'}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.DocumentosModule._downloadDoc('${item.arquivo}')" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Baixar Arquivo">
                              <i data-lucide="download" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.DocumentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.DocumentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-doc-prev" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-doc-next" class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    // Eventos de Busca e Filtro
    const inputBusca = container.querySelector('#input-busca-doc');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.currentPage = 1;
        this._renderView(container);
      });
    }

    const selectFiltro = container.querySelector('#select-filtro-setor');
    if (selectFiltro) {
      selectFiltro.addEventListener('change', (e) => {
        this.setorFilter = e.target.value;
        this.currentPage = 1;
        this._renderView(container);
      });
    }

    // Paginação
    const btnPrev = container.querySelector('#btn-doc-prev');
    const btnNext = container.querySelector('#btn-doc-next');
    if (btnPrev) btnPrev.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    if (btnNext) btnNext.addEventListener('click', () => { this.currentPage++; this._renderView(container); });

    // Botão Novo Documento
    const btnNovo = container.querySelector('#btn-novo-doc');
    if (btnNovo) btnNovo.addEventListener('click', () => this._openFormModal(container));
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const doc = isEdit ? this.items.find(d => Number(d.id) === Number(editId)) : null;

    const modalContent = `
      <form id="form-documento" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Título do Documento *</label>
          <input 
            type="text" 
            name="titulo" 
            required 
            value="${doc ? doc.titulo : ''}" 
            placeholder="Ex: Normas Operacionais de Segurança 2026" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Setor Responsável (setor_id) *</label>
          <select name="setor_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
            <option value="">Selecione o setor...</option>
            ${this.setores.map(s => `
              <option value="${s.id}" ${doc && Number(doc.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nome do Arquivo / Anexo *</label>
          <input 
            type="text" 
            name="arquivo" 
            required 
            value="${doc ? doc.arquivo : ''}" 
            placeholder="Ex: portaria_hub_01_2026.pdf" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
          />
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Documento' : 'Novo Documento',
      subtitle: isEdit ? 'Atualize as informações do documento oficial' : 'Faça o registro e indexação de um novo arquivo',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Atualizar Documento' : 'Cadastrar Documento',
      onSave: async () => {
        const form = document.getElementById('form-documento');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const payload = {
          titulo: formData.get('titulo').trim(),
          setor_id: Number(formData.get('setor_id')),
          arquivo: formData.get('arquivo').trim()
        };

        if (isEdit) {
          // TODO: conectar endpoint PUT /documentos/:id
          await window.API.updateDocumento(editId, payload);
          window.UI.toast({ title: 'Documento Atualizado', message: 'Os dados foram salvos com sucesso.' });
        } else {
          // TODO: conectar endpoint POST /documentos
          await window.API.createDocumento(payload);
          window.UI.toast({ title: 'Documento Criado', message: 'O arquivo foi registrado no repositório.' });
        }

        await this.render(container);
        return true;
      }
    });
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Excluir Documento?',
      message: 'Tem certeza que deseja remover este documento do repositório digital?',
      onConfirm: async () => {
        // TODO: conectar endpoint DELETE /documentos/:id
        await window.API.deleteDocumento(id);
        window.UI.toast({ title: 'Documento Removido', message: 'O registro foi excluído.', type: 'warning' });
        await this.render(container);
      }
    });
  },

  _downloadDoc(arquivo) {
    window.UI.toast({
      title: 'Download Iniciado',
      message: `O arquivo ${arquivo || 'documento.pdf'} está sendo baixado.`,
      type: 'info'
    });
  }
};
