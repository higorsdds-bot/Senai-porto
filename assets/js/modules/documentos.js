/**
 * HUB ES+ - Módulo: Gestão Documental
 * Tabela: documentos (id, titulo, descricao, setor_id, responsavel_id, nome_original, caminho, mime_type, tamanho, extensao, status)
 * Funcionalidades: repositório digital completo com upload de arquivos reais (PDF, DOCX, XLSX, etc.),
 * metadados, download autêntico, controle de status (ativo/arquivado), busca avançada e auditoria.
 */

window.DocumentosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  setorFilter: '',
  statusFilter: '',
  currentPage: 1,
  pageSize: 6,

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(5, 5);

    try {
      const [docs, setores] = await Promise.all([
        window.API.getDocumentos(),
        window.API.getSetores().catch(() => [])
      ]);
      this.items = Array.isArray(docs) ? docs : [];
      this.setores = Array.isArray(setores) ? setores : [];
      this._renderView(container);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível conectar com o repositório documental.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  _getFileMeta(ext, mimeType) {
    const e = String(ext || '').toLowerCase().replace(/^\./, '');
    if (['pdf'].includes(e)) {
      return {
        icon: 'file-text',
        badge: 'PDF',
        colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
      };
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) {
      return {
        icon: 'file-spreadsheet',
        badge: e.toUpperCase(),
        colorClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
      };
    }
    if (['doc', 'docx', 'odt', 'txt'].includes(e)) {
      return {
        icon: 'file-text',
        badge: e.toUpperCase(),
        colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
      };
    }
    if (['ppt', 'pptx'].includes(e)) {
      return {
        icon: 'presentation',
        badge: 'PPT',
        colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
      };
    }
    if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) {
      return {
        icon: 'image',
        badge: 'IMG',
        colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
      };
    }
    if (['zip', 'rar', '7z'].includes(e)) {
      return {
        icon: 'archive',
        badge: 'ZIP',
        colorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
      };
    }
    return {
      icon: 'file',
      badge: e ? e.toUpperCase() : 'DOC',
      colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };
  },

  _renderView(container) {
    const q = this.searchTerm.toLowerCase().trim();
    let filtered = this.items.filter(doc => {
      const matchText = !q || (doc.titulo || '').toLowerCase().includes(q) || (doc.descricao || '').toLowerCase().includes(q) || (doc.nome_original || '').toLowerCase().includes(q);
      const matchSetor = !this.setorFilter || Number(doc.setor_id) === Number(this.setorFilter);
      const matchStatus = !this.statusFilter || doc.status === this.statusFilter;
      return matchText && matchSetor && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    // Métricas do repositório
    const totalDocs = this.items.length;
    const totalAtivos = this.items.filter(d => d.status === 'ativo').length;
    const totalArquivados = this.items.filter(d => d.status === 'arquivado').length;
    const bytesTotal = this.items.reduce((acc, d) => acc + Number(d.tamanho || 0), 0);

    const canUpload = window.Auth?.isAdmin() || window.Auth?.hasAnyPermission(['documentos.enviar', 'documentos.criar']);

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 tracking-wide uppercase">
                Repositório Digital
              </span>
              <span class="text-xs text-slate-400">• ${totalDocs} documentos armazenados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Gestão Documental</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Armazenamento oficial de portarias, atas, contratos, normativas e termos do HUB ES+</p>
          </div>
          ${canUpload ? `
            <button id="btn-novo-doc" onclick="window.DocumentosModule._openFormModal(document.getElementById('main-content'))" class="btn-primary cursor-pointer">
              <i data-lucide="upload-cloud" class="w-4 h-4"></i>
              Armazenar Documento
            </button>
          ` : ''}
        </div>

        <!-- Cards de Métricas -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Armazenado</p>
              <h3 class="text-xl font-black text-slate-900 dark:text-white mt-0.5">${totalDocs}</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <i data-lucide="folder" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Documentos Ativos</p>
              <h3 class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">${totalAtivos}</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Arquivados</p>
              <h3 class="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">${totalArquivados}</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <i data-lucide="archive" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Espaço Ocupado</p>
              <h3 class="text-xl font-black text-slate-900 dark:text-white mt-0.5">${this._formatBytes(bytesTotal)}</h3>
            </div>
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <i data-lucide="hard-drive" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Barra de Ferramentas: Busca e Filtros -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="relative w-full md:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-doc" 
              type="text" 
              placeholder="Buscar por título, ementa ou arquivo..." 
              value="${this.searchTerm}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select id="select-filtro-setor" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">Todos os Setores</option>
              ${this.setores.map(s => `
                <option value="${s.id}" ${Number(this.setorFilter) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
              `).join('')}
            </select>

            <select id="select-filtro-status" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">Todos os Status</option>
              <option value="ativo" ${this.statusFilter === 'ativo' ? 'selected' : ''}>Ativo</option>
              <option value="arquivado" ${this.statusFilter === 'arquivado' ? 'selected' : ''}>Arquivado</option>
            </select>
          </div>
        </div>

        <!-- Tabela de Documentos -->
        ${filtered.length === 0 ?
          window.UI.renderEmptyState({
            title: 'Nenhum documento encontrado',
            description: 'Não foram encontrados registros para os filtros selecionados.',
            actionLabel: canUpload ? 'Armazenar Documento' : null,
            onActionClick: canUpload ? () => this._openFormModal(container) : null
          })
          : `
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="px-6 py-3.5">Documento Oficial</th>
                    <th class="px-6 py-3.5">Setor de Origem</th>
                    <th class="px-6 py-3.5">Arquivo & Metadados</th>
                    <th class="px-6 py-3.5">Status</th>
                    <th class="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${paginatedItems.map(item => {
                    const setor = this.setores.find(s => Number(s.id) === Number(item.setor_id))?.nome || item.setor_nome || 'Setor Geral';
                    const fileMeta = this._getFileMeta(item.extensao || (item.nome_original ? item.nome_original.split('.').pop() : ''));
                    const isAtivo = item.status === 'ativo';
                    const dataUpload = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '';

                    return `
                      <tr class="hub-table-row">
                        <td class="px-6 py-4">
                          <div class="flex items-start gap-3">
                            <div class="w-9 h-9 rounded-xl ${fileMeta.colorClass} border flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <i data-lucide="${fileMeta.icon}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0 max-w-md">
                              <h4 class="font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">${item.titulo}</h4>
                              ${item.descricao ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">${item.descricao}</p>` : ''}
                              <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Cadastrado por: <strong class="text-slate-600 dark:text-slate-300">${item.responsavel_nome || 'Sistema'}</strong> em ${dataUpload}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400"></i>
                            ${setor}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex flex-col gap-0.5">
                            <div class="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                              <span class="max-w-[180px] truncate" title="${item.nome_original || 'documento'}">${item.nome_original || 'arquivo.pdf'}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">${this._formatBytes(item.tamanho)}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          ${window.UI.renderBadge(item.status)}
                        </td>
                        <td class="px-6 py-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <!-- Download do Arquivo Real -->
                            <button onclick="window.DocumentosModule._downloadDoc(${item.id}, '${this._escapeAttr(item.nome_original || item.titulo)}')" class="btn-action-table action-primary" title="Baixar Documento">
                              <i data-lucide="download" class="w-4 h-4"></i>
                            </button>

                            <!-- Editar Metadados -->
                            <button onclick="window.DocumentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-edit" title="Editar Metadados">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>

                            <!-- Alternar Status (Arquivar / Reativar) -->
                            <button onclick="window.DocumentosModule._toggleStatus(document.getElementById('main-content'), ${item.id}, '${isAtivo ? 'arquivado' : 'ativo'}')" class="btn-action-table action-edit" title="${isAtivo ? 'Arquivar Documento' : 'Reativar Documento'}">
                              <i data-lucide="${isAtivo ? 'archive' : 'rotate-ccw'}" class="w-4 h-4"></i>
                            </button>

                            <!-- Excluir -->
                            <button onclick="window.DocumentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-delete" title="Excluir Documento">
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
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-doc-prev" class="btn-secondary py-1 px-3 text-xs">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-doc-next" class="btn-secondary py-1 px-3 text-xs">Próxima</button>
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
    container.querySelector('#input-busca-doc')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-setor')?.addEventListener('change', (e) => {
      this.setorFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#select-filtro-status')?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this._renderView(container);
    });

    container.querySelector('#btn-doc-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-doc-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
  },

  _escapeAttr(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  },

  async _openFormModal(container, editId = null) {
    const mainContainer = container || document.getElementById('main-content');
    const isEdit = !!editId;
    const doc = isEdit ? (this.items || []).find(d => Number(d.id) === Number(editId)) : null;

    if (!Array.isArray(this.setores) || this.setores.length === 0) {
      try {
        const s = await window.API.getSetores().catch(() => []);
        if (Array.isArray(s) && s.length > 0) this.setores = s;
      } catch (_) {}
    }

    const modalContent = `
      <form id="form-documento" class="space-y-4" enctype="multipart/form-data">
        <!-- Título Oficial -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título do Documento *</label>
          <input 
            type="text" 
            name="titulo" 
            required 
            minlength="3"
            value="${doc ? doc.titulo : ''}" 
            placeholder="Ex: Portaria Normativa nº 04/2026 - Uso de Equipamentos" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <!-- Setor de Vinculação -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Setor Responsável *</label>
          <select name="setor_id" required class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="">Selecione o setor de lotação...</option>
            ${this.setores.map(s => `
              <option value="${s.id}" ${doc && Number(doc.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
          </select>
        </div>

        <!-- Descrição / Ementa do Documento -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Ementa (Opcional)</label>
          <textarea 
            name="descricao" 
            rows="3" 
            placeholder="Informe a ementa, resumo do teor normativo, número do processo ou observações..."
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
          >${doc && doc.descricao ? doc.descricao : ''}</textarea>
        </div>

        <!-- Campo de Upload de Arquivo Real -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Arquivo do Documento ${isEdit ? '(Opcional se desejar manter o atual)' : '*'}
          </label>
          
          ${isEdit && doc && doc.nome_original ? `
            <div class="mb-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 truncate">
                <i data-lucide="file-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                <span class="font-medium text-slate-700 dark:text-slate-200 truncate">Arquivo Atual: <strong>${doc.nome_original}</strong> (${this._formatBytes(doc.tamanho)})</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">Envie outro abaixo para substituir</span>
            </div>
          ` : ''}

          <div id="drop-zone-doc" class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40">
            <input 
              type="file" 
              name="arquivo" 
              id="file-input-documento" 
              ${isEdit ? '' : 'required'}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.odt,.ods" 
              class="hidden" 
            />
            <div class="flex flex-col items-center justify-center gap-1.5 py-2 pointer-events-none">
              <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <i data-lucide="upload-cloud" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200" id="file-label-text">
                Clique aqui ou arraste o arquivo do documento
              </p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500">
                PDF, Word (.docx), Excel (.xlsx), Imagens ou ZIP (Máx. 20 MB)
              </p>
            </div>
          </div>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Documento Oficial' : 'Armazenar Novo Documento',
      subtitle: isEdit ? 'Atualize as informações cadastrais e substitua o arquivo se necessário' : 'Repositório de documentos oficiais do HUB ES+ / SECULT',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Armazenar Documento',
      onSave: async () => {
        const form = document.getElementById('form-documento');
        if (!window.UI.validateForm(form)) return false;

        const fileInput = document.getElementById('file-input-documento');
        if (!isEdit && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
          window.UI.toast({
            title: 'Arquivo Obrigatório',
            message: 'Por favor, selecione um arquivo para armazenar.',
            type: 'warning'
          });
          return false;
        }

        const formData = new FormData(form);

        try {
          if (isEdit) {
            await window.API.updateDocumento(editId, formData);
            window.UI.toast({ title: 'Documento Atualizado', message: 'Dados e arquivo salvos com sucesso.' });
          } else {
            await window.API.createDocumento(formData);
            window.UI.toast({ title: 'Documento Armazenado', message: 'Arquivo salvo com sucesso no repositório.' });
          }

          await this.render(mainContainer);
          return true;
        } catch (err) {
          console.error('Erro ao salvar documento:', err);
          window.UI.toast({
            title: 'Erro ao Armazenar',
            message: err.message || 'Verifique os dados e o tamanho do arquivo.',
            type: 'error'
          });
          return false;
        }
      }
    });

    // Configuração do drag & drop e label do arquivo no modal
    setTimeout(() => {
      const dropZone = document.getElementById('drop-zone-doc');
      const fileInput = document.getElementById('file-input-documento');
      const fileText = document.getElementById('file-label-text');

      if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            if (fileText) {
              fileText.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-extrabold font-mono">${f.name}</span> <span class="text-slate-400">(${this._formatBytes(f.size)})</span>`;
            }
          }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50/20');
          });
        });

        ['dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50/20');
          });
        });

        dropZone.addEventListener('drop', (e) => {
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            const f = e.dataTransfer.files[0];
            if (fileText) {
              fileText.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-extrabold font-mono">${f.name}</span> <span class="text-slate-400">(${this._formatBytes(f.size)})</span>`;
            }
          }
        });
      }

      if (window.lucide) {
        window.lucide.createIcons({ root: document.getElementById('hub-modal-container') });
      }
    }, 50);
  },

  async _downloadDoc(id, nomeOriginal) {
    try {
      window.UI.toast({
        title: 'Baixando Arquivo',
        message: `Iniciando download de "${nomeOriginal}"...`,
        type: 'info'
      });
      await window.API.downloadDocumento(id, nomeOriginal);
      window.UI.toast({
        title: 'Download Concluído',
        message: 'O documento foi transferido para seu dispositivo.',
        type: 'success'
      });
    } catch (err) {
      console.error('Erro no download:', err);
      window.UI.toast({
        title: 'Falha no Download',
        message: err.message || 'Não foi possível baixar o arquivo do servidor.',
        type: 'error'
      });
    }
  },

  async _toggleStatus(container, id, novoStatus) {
    const mainContainer = container || document.getElementById('main-content');
    const isArquivar = novoStatus === 'arquivado';

    window.UI.confirmModal({
      title: isArquivar ? 'Arquivar Documento?' : 'Reativar Documento?',
      message: isArquivar 
        ? 'O documento continuará salvo no repositório, porém sinalizado como histórico arquivado.'
        : 'O documento voltará a figurar na listagem de documentos vigentes.',
      danger: false,
      confirmText: isArquivar ? 'Arquivar' : 'Reativar',
      onConfirm: async () => {
        try {
          await window.API.alterarStatusDocumento(id, novoStatus);
          window.UI.toast({
            title: isArquivar ? 'Documento Arquivado' : 'Documento Reativado',
            message: `Status atualizado com sucesso para "${novoStatus}".`
          });
          await this.render(mainContainer);
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Alterar Status',
            message: err.message || 'Falha ao atualizar status.',
            type: 'error'
          });
        }
      }
    });
  },

  _confirmDelete(container, id) {
    const mainContainer = container || document.getElementById('main-content');
    window.UI.confirmModal({
      title: 'Excluir Documento do Repositório?',
      message: 'Tem certeza que deseja excluir permanentemente este documento? Esta ação será registrada na trilha de auditoria.',
      onConfirm: async () => {
        try {
          await window.API.deleteDocumento(id);
          window.UI.toast({
            title: 'Documento Removido',
            message: 'O arquivo foi excluído com sucesso do repositório.',
            type: 'warning'
          });
          await this.render(mainContainer);
        } catch (err) {
          window.UI.toast({
            title: 'Erro ao Excluir',
            message: err.message || 'Não foi possível remover o documento.',
            type: 'error'
          });
        }
      }
    });
  }
};
