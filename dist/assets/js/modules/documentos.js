/**
 * HUB ES+ - Módulo: Gestão Documental & Gerador de Documentos Oficiais
 * Tabela: documentos (id, titulo, descricao, setor_id, responsavel_id, nome_original, caminho, mime_type, tamanho, extensao, status)
 * Funcionalidades: 
 * 1. Repositório digital completo com upload de arquivos reais (PDF, DOCX, XLSX, etc.),
 *    metadados, download autêntico, controle de status (ativo/arquivado), busca e auditoria.
 * 2. Gerador Oficial de Documentos (Cartas de Anuência, Autorizações de Uso de Espaço e Relatórios)
 *    com emissão exclusiva para ADMIN, ADMINISTRADOR e GESTOR.
 */

window.DocumentosModule = {
  items: [],
  setores: [],
  searchTerm: '',
  setorFilter: '',
  statusFilter: '',
  currentPage: 1,
  pageSize: 6,
  activeTab: 'repositorio', // 'repositorio' | 'gerador'

  dadosGerador: {
    numero: '2024/089',
    solicitante: 'Instituto de Artes Visuais do ES',
    dataEvento: '15/07/2024',
    espaco: 'Auditório Principal (150 pax)',
    finalidade: 'Exposição fotográfica itinerante de artistas capixabas, com vernissage aberto ao público no dia de abertura.',
    publico: '80 pessoas'
  },

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  },

  _getDataExtenso() {
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const agora = new Date();
    return `${agora.getDate().toString().padStart(2, '0')} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;
  },

  _podeGerarDocumentos() {
    const perfil = String(window.Auth?.getUsuario()?.perfil || '').toUpperCase();
    return (
      window.Auth?.isAdmin() ||
      ['ADMIN', 'ADMINISTRADOR', 'GESTOR'].includes(perfil) ||
      window.Auth?.hasAnyPermission(['documentos.gerar', 'documentos.criar', 'documentos.enviar'])
    );
  },

  async render(container) {
    const hash = window.location.hash || '';
    if (hash.includes('gerador') && this._podeGerarDocumentos()) {
      this.activeTab = 'gerador';
    }

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
    const totalDocs = this.items.length;
    const canUpload = window.Auth?.isAdmin() || window.Auth?.hasAnyPermission(['documentos.enviar', 'documentos.criar']);
    const podeGerar = this._podeGerarDocumentos();

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho Principal -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 tracking-wide uppercase">
                ${this.activeTab === 'gerador' ? 'Governança & Atos Oficiais' : 'Repositório Digital'}
              </span>
              <span class="text-xs text-slate-400">• ${totalDocs} documentos armazenados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              ${this.activeTab === 'gerador' ? 'Gerador de Documentos' : 'Gestão Documental'}
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ${this.activeTab === 'gerador' 
                ? 'Cartas de Anuência, Autorizações e Relatórios Oficiais com validade institucional' 
                : 'Armazenamento oficial de portarias, atas, contratos, normativas e termos do HUB ES+'}
            </p>
          </div>

          <!-- Ações e Alternância de Abas -->
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
              <button 
                type="button" 
                id="btn-tab-repositorio" 
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${this.activeTab === 'repositorio' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}"
              >
                <i data-lucide="folder" class="w-3.5 h-3.5"></i>
                <span>Repositório</span>
              </button>
              ${podeGerar ? `
                <button 
                  type="button" 
                  id="btn-tab-gerador" 
                  class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${this.activeTab === 'gerador' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}"
                  title="Acesso exclusivo para Administradores e Gestores"
                >
                  <i data-lucide="file-signature" class="w-3.5 h-3.5"></i>
                  <span>Gerador Oficial</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 uppercase tracking-tighter">Gestão</span>
                </button>
              ` : ''}
            </div>

            ${this.activeTab === 'repositorio' && canUpload ? `
              <button id="btn-novo-doc" onclick="window.DocumentosModule._openFormModal(document.getElementById('main-content'))" class="btn-primary cursor-pointer text-xs">
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                Armazenar Documento
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Conteúdo da Aba Ativa -->
        ${this.activeTab === 'gerador' ? this._renderGeradorHTML() : this._renderRepositorioHTML()}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    // Vincular eventos das abas
    container.querySelector('#btn-tab-repositorio')?.addEventListener('click', () => {
      this.activeTab = 'repositorio';
      this._renderView(container);
    });

    container.querySelector('#btn-tab-gerador')?.addEventListener('click', () => {
      this.activeTab = 'gerador';
      this._renderView(container);
    });

    if (this.activeTab === 'gerador') {
      this._bindGeradorEvents(container);
    } else {
      this._bindRepositorioEvents(container);
    }
  },

  _renderRepositorioHTML() {
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

    const totalDocs = this.items.length;
    const totalAtivos = this.items.filter(d => d.status === 'ativo').length;
    const totalArquivados = this.items.filter(d => d.status === 'arquivado').length;
    const bytesTotal = this.items.reduce((acc, d) => acc + Number(d.tamanho || 0), 0);
    const canUpload = window.Auth?.isAdmin() || window.Auth?.hasAnyPermission(['documentos.enviar', 'documentos.criar']);

    return `
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
          onActionClick: canUpload ? () => this._openFormModal(document.getElementById('main-content')) : null
        })
        : `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="overflow-x-auto hub-scrollbar">
            <table class="w-full min-w-[720px] text-left text-xs">
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
                            <p class="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-2">${item.descricao || 'Sem descrição cadastrada.'}</p>
                            <span class="inline-flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                              <span>Ref #${item.id}</span>
                              <span>•</span>
                              <span>${dataUpload}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400"></i>
                          ${setor}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex flex-col gap-0.5">
                          <span class="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">${item.nome_original || 'documento.pdf'}</span>
                          <span class="text-[11px] text-slate-400 font-mono">${this._formatBytes(item.tamanho)} • ${item.mime_type || 'application/pdf'}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${isAtivo ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                          <span class="w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                          ${isAtivo ? 'Vigente' : 'Arquivado'}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button 
                            type="button" 
                            onclick="window.DocumentosModule._downloadDoc(${item.id}, '${this._escapeAttr(item.nome_original || 'documento.pdf')}')" 
                            class="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Baixar Arquivo"
                          >
                            <i data-lucide="download" class="w-4 h-4"></i>
                          </button>
                          
                          ${canUpload ? `
                            <button 
                              type="button" 
                              onclick="window.DocumentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" 
                              class="p-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Editar Metadados"
                            >
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            
                            <button 
                              type="button" 
                              onclick="window.DocumentosModule._toggleStatus(document.getElementById('main-content'), ${item.id}, '${isAtivo ? 'arquivado' : 'ativo'}')" 
                              class="p-2 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                              title="${isAtivo ? 'Arquivar Documento' : 'Reativar Documento'}"
                            >
                              <i data-lucide="${isAtivo ? 'archive' : 'rotate-ccw'}" class="w-4 h-4"></i>
                            </button>
                            
                            <button 
                              type="button" 
                              onclick="window.DocumentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" 
                              class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Excluir Permanentemente"
                            >
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          ` : ''}
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
    `;
  },

  _renderGeradorHTML() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Coluna Esquerda: Formulário de Emissão (lg:col-span-5) -->
        <div class="lg:col-span-5 bg-white dark:bg-[#0b1320] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Carta de Anuência
              </span>
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                Parâmetros do Documento
              </h3>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Oficial SECULT
            </span>
          </div>

          <form id="form-gerador-anuencia" class="space-y-4" onsubmit="event.preventDefault()">
            <!-- Solicitante / Organização -->
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Solicitante / Organização *
              </label>
              <input 
                id="gerador-solicitante" 
                type="text" 
                required
                value="${this._esc(this.dadosGerador.solicitante)}" 
                placeholder="Ex: Instituto de Artes Visuais do ES"
                class="w-full text-xs rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
              />
            </div>

            <!-- Data do Evento & Espaço Solicitado -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Data do Evento *
                </label>
                <input 
                  id="gerador-data" 
                  type="text" 
                  required
                  value="${this._esc(this.dadosGerador.dataEvento)}" 
                  placeholder="Ex: 15/07/2024"
                  class="w-full text-xs rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Espaço Solicitado *
                </label>
                <select 
                  id="gerador-espaco" 
                  class="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
                >
                  <option value="Auditório Principal (150 pax)" ${this.dadosGerador.espaco.includes('Auditório Principal') ? 'selected' : ''}>Auditório Principal (150 pax)</option>
                  <option value="Espaço Coworking (60 pax)" ${this.dadosGerador.espaco.includes('Coworking') ? 'selected' : ''}>Espaço Coworking (60 pax)</option>
                  <option value="Galeria Central de Exposições (100 pax)" ${this.dadosGerador.espaco.includes('Galeria') ? 'selected' : ''}>Galeria Central de Exposições (100 pax)</option>
                  <option value="Laboratório Criativo / FabLab (25 pax)" ${this.dadosGerador.espaco.includes('FabLab') ? 'selected' : ''}>Laboratório Criativo / FabLab (25 pax)</option>
                  <option value="Estúdio de Gravação e Podcast (10 pax)" ${this.dadosGerador.espaco.includes('Podcast') ? 'selected' : ''}>Estúdio de Gravação e Podcast (10 pax)</option>
                  <option value="Estúdio de Vídeo e Transmissão (15 pax)" ${this.dadosGerador.espaco.includes('Vídeo') ? 'selected' : ''}>Estúdio de Vídeo e Transmissão (15 pax)</option>
                  <option value="Sala Multiuso de Reuniões (20 pax)" ${this.dadosGerador.espaco.includes('Sala Multiuso') ? 'selected' : ''}>Sala Multiuso de Reuniões (20 pax)</option>
                  <option value="Pátio Aberto / Área Externa (200 pax)" ${this.dadosGerador.espaco.includes('Pátio') ? 'selected' : ''}>Pátio Aberto / Área Externa (200 pax)</option>
                </select>
              </div>
            </div>

            <!-- Finalidade do Evento -->
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Finalidade do Evento *
              </label>
              <textarea 
                id="gerador-finalidade" 
                rows="3" 
                required
                placeholder="Ex: Exposição fotográfica itinerante de artistas capixabas, com vernissage aberto ao público no dia de abertura."
                class="w-full text-xs rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium resize-none"
              >${this._esc(this.dadosGerador.finalidade)}</textarea>
            </div>

            <!-- Público Estimado -->
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Público Estimado *
              </label>
              <input 
                id="gerador-publico" 
                type="text" 
                required
                value="${this._esc(this.dadosGerador.publico)}" 
                placeholder="Ex: 80 pessoas"
                class="w-full text-xs rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
              />
            </div>

            <!-- Botão Gerar Carta de Anuência -->
            <button 
              id="btn-submit-gerar" 
              type="button" 
              class="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] text-white shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-5"
            >
              <i data-lucide="file-check-2" class="w-4 h-4"></i>
              <span>Gerar Carta de Anuência</span>
            </button>
          </form>
        </div>

        <!-- Coluna Direita: Pré-Visualização Oficial A4 (lg:col-span-7) -->
        <div class="lg:col-span-7 bg-white dark:bg-[#0b1320] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <div class="flex items-center justify-between pb-3 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Visualização Oficial
              </span>
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                Pré-Visualização em Tempo Real
              </h3>
            </div>

            <div class="flex items-center gap-2.5">
              <button 
                id="btn-imprimir-pdf" 
                type="button" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Imprimir documento ou salvar como PDF"
              >
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Imprimir / PDF</span>
              </button>

              <button 
                id="btn-salvar-repositorio" 
                type="button" 
                class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                title="Arquivar carta gerada no Repositório Digital de Documentos"
              >
                <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
                <span>Salvar no Repositório</span>
              </button>
            </div>
          </div>

          <!-- Folha A4 Simulação de Papel Oficial -->
          <div 
            id="folha-documento-oficial" 
            class="bg-white text-slate-900 shadow-2xl p-7 sm:p-11 rounded-2xl border border-slate-200 font-serif leading-relaxed text-justify select-text max-w-xl mx-auto"
          >
            <!-- Cabeçalho Oficial -->
            <div class="text-center border-b border-slate-300 pb-3 mb-5">
              <h2 class="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-slate-900 font-sans">
                SECRETARIA DE ESTADO DA CULTURA — SECULT/ES
              </h2>
              <p class="font-bold text-[11px] text-slate-700 font-sans mt-0.5">
                HUB ES+ — Centro de Inovação Cultural
              </p>
              <p class="text-[10px] text-slate-500 italic font-sans">
                Vitória – ES | hub.esmaiscriativo.es.gov.br
              </p>
            </div>

            <!-- Título da Carta com Número -->
            <div class="text-center my-5">
              <h3 class="font-black text-sm sm:text-base tracking-widest text-slate-900 uppercase font-sans">
                CARTA DE ANUÊNCIA Nº <span id="view-doc-numero">${this._esc(this.dadosGerador.numero)}</span>
              </h3>
            </div>

            <!-- Corpo da Carta -->
            <div class="space-y-3.5 text-xs text-slate-800">
              <p>
                A Coordenação do <strong>HUB ES+</strong>, vinculado à Secretaria de Estado da Cultura do Espírito Santo — SECULT/ES, vem por meio desta <strong>AUTORIZAR</strong> o uso do espaço <strong id="view-doc-espaco">${this._esc(this.dadosGerador.espaco)}</strong> pelo(a) <strong><span id="view-doc-solicitante">${this._esc(this.dadosGerador.solicitante)}</span></strong> para a realização de:
              </p>

              <!-- Finalidade destacada -->
              <div class="bg-slate-50 border-l-4 border-amber-500 p-3 my-2 rounded-r-lg italic text-slate-700">
                "<span id="view-doc-finalidade">${this._esc(this.dadosGerador.finalidade)}</span>"
              </div>

              <p class="pt-1">
                <strong>Data de realização:</strong> <span id="view-doc-data">${this._esc(this.dadosGerador.dataEvento)}</span><br>
                <strong>Público estimado:</strong> <span id="view-doc-publico">${this._esc(this.dadosGerador.publico)}</span>
              </p>

              <p class="text-[10.5px] text-slate-600 border-t border-slate-200 pt-3">
                Esta carta de anuência está condicionada ao cumprimento das normas de uso do espaço público, incluindo responsabilidade civil, devolução do espaço nas condições originais e apresentação de comprovante de seguro de responsabilidade civil quando aplicável.
              </p>
            </div>

            <!-- Bloco de Assinatura -->
            <div class="text-center mt-10 pt-4">
              <p class="text-[11px] text-slate-600 mb-8" id="view-doc-cidade-data">
                Vitória, ${this._getDataExtenso()}
              </p>
              <div class="inline-block border-t border-slate-800 pt-1.5 px-8">
                <p class="font-bold text-xs text-slate-900 font-sans">Coordenador do HUB ES+</p>
                <p class="text-[10px] text-slate-600 font-sans">SECULT/ES — Espírito Santo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindRepositorioEvents(container) {
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

  _bindGeradorEvents(container) {
    const syncField = (inputId, viewId, dataKey) => {
      const input = container.querySelector(inputId);
      const view = container.querySelector(viewId);
      if (input && view) {
        input.addEventListener('input', (e) => {
          this.dadosGerador[dataKey] = e.target.value;
          view.textContent = e.target.value || '-';
        });
      }
    };

    syncField('#gerador-solicitante', '#view-doc-solicitante', 'solicitante');
    syncField('#gerador-data', '#view-doc-data', 'dataEvento');
    syncField('#gerador-finalidade', '#view-doc-finalidade', 'finalidade');
    syncField('#gerador-publico', '#view-doc-publico', 'publico');

    container.querySelector('#gerador-espaco')?.addEventListener('change', (e) => {
      this.dadosGerador.espaco = e.target.value;
      const v = container.querySelector('#view-doc-espaco');
      if (v) v.textContent = e.target.value;
    });

    container.querySelector('#btn-submit-gerar')?.addEventListener('click', () => {
      const ano = new Date().getFullYear();
      const numRandom = String(Math.floor(Math.random() * 900) + 100);
      this.dadosGerador.numero = `${ano}/${numRandom}`;
      const numEl = container.querySelector('#view-doc-numero');
      if (numEl) numEl.textContent = this.dadosGerador.numero;

      window.UI.toast({
        title: 'Carta de Anuência Emitida!',
        message: `Documento nº ${this.dadosGerador.numero} gerado e pronto para impressão ou arquivamento.`,
        type: 'success'
      });

      const folha = container.querySelector('#folha-documento-oficial');
      if (folha) {
        folha.classList.add('ring-2', 'ring-amber-500/50');
        setTimeout(() => folha.classList.remove('ring-2', 'ring-amber-500/50'), 1500);
      }
    });

    container.querySelector('#btn-imprimir-pdf')?.addEventListener('click', () => {
      this._imprimirDocumento();
    });

    container.querySelector('#btn-salvar-repositorio')?.addEventListener('click', () => {
      this._salvarNoRepositorio(container);
    });
  },

  _imprimirDocumento() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Carta de Anuência Nº ${this.dadosGerador.numero} - HUB ES+</title>
        <style>
          @page { size: A4; margin: 2.2cm 2.0cm; }
          body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.6; font-size: 11pt; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 25px; font-family: Arial, Helvetica, sans-serif; }
          .header h2 { font-size: 13pt; margin: 0 0 4px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { font-size: 10pt; margin: 2px 0; color: #333; }
          .header .meta { font-size: 9pt; color: #666; font-style: italic; }
          .title { text-align: center; margin: 30px 0 25px 0; font-family: Arial, Helvetica, sans-serif; }
          .title h3 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1.5px; margin: 0; font-weight: 900; }
          .content { text-align: justify; font-size: 11pt; }
          .content p { margin: 14px 0; text-indent: 1.5cm; }
          .quote-box { margin: 18px 0 18px 1.5cm; padding: 10px 16px; border-left: 3px solid #666; font-style: italic; background: #fafafa; }
          .details { margin: 16px 0 16px 1.5cm; line-height: 1.8; }
          .disclaimer { font-size: 9.5pt; color: #444; border-top: 1px solid #ccc; padding-top: 12px; margin-top: 25px; }
          .signature-block { text-align: center; margin-top: 45px; font-family: Arial, Helvetica, sans-serif; page-break-inside: avoid; }
          .signature-line { display: inline-block; border-top: 1.5px solid #222; width: 280px; padding-top: 6px; }
          .sig-name { font-weight: 700; font-size: 10.5pt; margin: 0; }
          .sig-sub { font-size: 9pt; color: #444; margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SECRETARIA DE ESTADO DA CULTURA — SECULT/ES</h2>
          <p><strong>HUB ES+ — Centro de Inovação Cultural</strong></p>
          <p class="meta">Vitória – ES | hub.esmaiscriativo.es.gov.br</p>
        </div>

        <div class="title">
          <h3>CARTA DE ANUÊNCIA Nº ${this.dadosGerador.numero}</h3>
        </div>

        <div class="content">
          <p>
            A Coordenação do <strong>HUB ES+</strong>, vinculado à Secretaria de Estado da Cultura do Espírito Santo — SECULT/ES, vem por meio desta <strong>AUTORIZAR</strong> o uso do espaço <strong>${this._esc(this.dadosGerador.espaco)}</strong> pelo(a) <strong>${this._esc(this.dadosGerador.solicitante)}</strong> para a realização de:
          </p>

          <div class="quote-box">
            "${this._esc(this.dadosGerador.finalidade)}"
          </div>

          <div class="details">
            <strong>Data de realização:</strong> ${this._esc(this.dadosGerador.dataEvento)}<br>
            <strong>Público estimado:</strong> ${this._esc(this.dadosGerador.publico)}
          </div>

          <div class="disclaimer">
            Esta carta de anuência está condicionada ao cumprimento integral das normas de uso do espaço público, incluindo responsabilidade civil, preservação do patrimônio, devolução do espaço nas condições originais e apresentação de comprovante de seguro de responsabilidade civil quando aplicável.
          </div>
        </div>

        <div class="signature-block">
          <p style="margin-bottom: 30px; font-size: 10pt;">Vitória, ${this._getDataExtenso()}</p>
          <div class="signature-line">
            <p class="sig-name">Coordenador do HUB ES+</p>
            <p class="sig-sub">SECULT/ES — Governo do Estado do Espírito Santo</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  },

  async _salvarNoRepositorio(container) {
    try {
      window.UI.toast({
        title: 'Arquivando Documento',
        message: 'Registrando a Carta de Anuência no repositório digital...',
        type: 'info'
      });

      const titulo = `Carta de Anuência Nº ${this.dadosGerador.numero} - ${this.dadosGerador.solicitante}`;
      const descricao = `Autorização formal para uso do espaço "${this.dadosGerador.espaco}" em ${this.dadosGerador.dataEvento} (Público: ${this.dadosGerador.publico}). Finalidade: ${this.dadosGerador.finalidade}`;

      await window.API.createDocumento({
        titulo,
        descricao,
        setor_id: 1,
        nome_original: `carta_anuencia_${this.dadosGerador.numero.replace(/\//g, '_')}.pdf`,
        caminho: `/documentos/cartas_anuencia/carta_${Date.now()}.pdf`,
        mime_type: 'application/pdf',
        extensao: 'pdf'
      });

      window.UI.toast({
        title: 'Documento Arquivado!',
        message: 'A Carta de Anuência foi salva com sucesso no Repositório Digital.',
        type: 'success'
      });

      const docs = await window.API.getDocumentos().catch(() => []);
      if (Array.isArray(docs)) this.items = docs;

    } catch (err) {
      console.error('Erro ao salvar documento:', err);
      window.UI.toast({
        title: 'Falha ao Salvar',
        message: err.message || 'Não foi possível arquivar o documento.',
        type: 'error'
      });
    }
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
            ${(this.setores || []).map(s => `
              <option value="${s.id}" ${doc && Number(doc.setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
          </select>
        </div>

        <!-- Ementa / Descrição -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ementa / Descrição</label>
          <textarea 
            name="descricao" 
            rows="3" 
            placeholder="Breve resumo sobre o conteúdo do documento, finalidade e vigência..." 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          >${doc ? (doc.descricao || '') : ''}</textarea>
        </div>

        <!-- Arquivo Físico -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Arquivo Digital ${isEdit ? '(Opcional se desejar substituir)' : '*'}</label>
          <div id="drop-zone-doc" class="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-800/40">
            <input type="file" name="arquivo" id="input-arquivo-doc" ${isEdit ? '' : 'required'} class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg" />
            <i data-lucide="file-up" class="w-8 h-8 mx-auto text-blue-500 mb-2"></i>
            <p id="label-arquivo-doc" class="text-xs text-slate-600 dark:text-slate-400 font-medium">
              ${doc ? `Arquivo atual: <span class="font-mono font-bold">${doc.nome_original}</span>` : 'Arraste ou clique para selecionar o arquivo (PDF, Office, Imagem)'}
            </p>
            <p class="text-[10px] text-slate-400 mt-1">Tamanho máximo suportado: 15MB</p>
          </div>
        </div>

        <!-- Feedback e Botões -->
        <div id="modal-doc-feedback" class="hidden text-xs rounded-xl p-3 font-semibold"></div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="window.UI.closeModal()" class="btn-secondary py-2 px-4 text-xs">Cancelar</button>
          <button type="submit" id="btn-salvar-doc-modal" class="btn-primary py-2 px-4 text-xs">
            <i data-lucide="check" class="w-4 h-4"></i>
            ${isEdit ? 'Atualizar Documento' : 'Armazenar Arquivo'}
          </button>
        </div>
      </form>
    `;

    window.UI.modal({
      title: isEdit ? 'Editar Metadados do Documento' : 'Armazenar Novo Documento',
      content: modalContent,
      size: 'md'
    });

    setTimeout(() => {
      const form = document.getElementById('form-documento');
      const fileInput = document.getElementById('input-arquivo-doc');
      const dropZone = document.getElementById('drop-zone-doc');
      const fileText = document.getElementById('label-arquivo-doc');
      const feedback = document.getElementById('modal-doc-feedback');
      const btnSalvar = document.getElementById('btn-salvar-doc-modal');

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          feedback.className = 'hidden';
          btnSalvar.disabled = true;
          btnSalvar.classList.add('opacity-50', 'cursor-not-allowed');

          const formData = new FormData(form);
          const titulo = formData.get('titulo');
          const setorId = formData.get('setor_id');
          const descricao = formData.get('descricao');
          const arq = fileInput.files[0];

          if (!isEdit && !arq) {
            feedback.className = 'text-xs rounded-xl p-3 font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 block';
            feedback.textContent = 'Por favor, anexe o arquivo digital a ser armazenado.';
            btnSalvar.disabled = false;
            btnSalvar.classList.remove('opacity-50', 'cursor-not-allowed');
            return;
          }

          try {
            let filePayload = null;
            if (arq) {
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(arq);
              });
              filePayload = {
                name: arq.name,
                type: arq.type,
                size: arq.size,
                dataUrl
              };
            }

            const payload = {
              titulo,
              setor_id: setorId,
              descricao,
              ...(filePayload ? { _arquivo: filePayload, nome_original: filePayload.name, tamanho: filePayload.size, mime_type: filePayload.type } : {})
            };

            if (isEdit) {
              await window.API.updateDocumento(editId, payload);
              window.UI.toast({
                title: 'Documento Atualizado',
                message: 'Os metadados foram salvos com sucesso.',
                type: 'success'
              });
            } else {
              await window.API.createDocumento(payload);
              window.UI.toast({
                title: 'Documento Armazenado',
                message: 'O arquivo oficial foi incorporado ao repositório digital.',
                type: 'success'
              });
            }

            window.UI.closeModal();
            await this.render(mainContainer);

          } catch (err) {
            console.error('Erro ao salvar documento:', err);
            feedback.className = 'text-xs rounded-xl p-3 font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 block';
            feedback.textContent = err.message || 'Falha ao processar o arquivo. Tente novamente.';
          } finally {
            btnSalvar.disabled = false;
            btnSalvar.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        });
      }

      if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            const f = fileInput.files[0];
            fileText.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-extrabold font-mono">${f.name}</span> <span class="text-slate-400">(${this._formatBytes(f.size)})</span>`;
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
