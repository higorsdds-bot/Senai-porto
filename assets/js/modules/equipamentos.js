/**
 * HUB ES+ - Módulo 10: Controle de Equipamentos (Patrimônio)
 * Suporte completo a fotos (upload JPG/PNG/WebP ou captura via Câmera/Webcam).
 * Tabela com miniaturas, modal ampliado, busca otimizada com debounce e validação obrigatória de fotografia.
 */

window.EquipamentosModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  currentPage: 1,
  pageSize: 8,
  _searchTimer: null,

  // Estado temporário de foto e NF no formulário
  _fotoArquivo: null,
  _fotoBase64: null,
  _removerImagem: false,
  _nfArquivo: null,
  _removerNf: false,
  _streamCamera: null,
  _facingMode: 'environment',

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(6, 6);

    try {
      // Reutiliza lista de usuários em cache caso já carregada
      const fetchUsuarios = (this.usuarios && this.usuarios.length > 0)
        ? Promise.resolve(this.usuarios)
        : window.API.getUsuarios().catch(() => []);

      const [equipamentos, usuarios] = await Promise.all([
        window.API.getEquipamentos().catch(e => {
          console.warn('[EQUIPAMENTOS] Falha ao carregar ativos:', e);
          return null;
        }),
        fetchUsuarios
      ]);

      if (equipamentos !== null) {
        this.items = Array.isArray(equipamentos) ? equipamentos : (equipamentos?.data || []);
      }
      this.usuarios = Array.isArray(usuarios) ? usuarios : (usuarios?.data || []);

      if (equipamentos === null && (!this.items || this.items.length === 0)) {
        throw new Error('Não foi possível conectar ao catálogo de patrimônio. Verifique sua conexão e tente novamente.');
      }
      this._renderView(container);
    } catch (err) {
      console.error('[EQUIPAMENTOS] Erro ao carregar ativos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Inventário Indisponível',
        description: err.message || 'Não foi possível carregar os equipamentos cadastrados.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const q = this.searchTerm.toLowerCase().trim();
    const filtered = this.items.filter(item => {
      const matchNome = (item.nome || '').toLowerCase().includes(q);
      const matchPatrimonio = (item.patrimonio || '').toLowerCase().includes(q);
      const matchLocal = (item.localizacao || '').toLowerCase().includes(q);
      return matchNome || matchPatrimonio || matchLocal;
    });

    const totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 tracking-wide uppercase">
                Ativos & Patrimônio
              </span>
              <span class="text-xs text-slate-400">• ${this.items.length} itens tombados</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Controle de Equipamentos</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Gestão patrimonial de bens duráveis, equipamentos com fotos e rastreio de guarda</p>
          </div>
          <button id="btn-novo-equipamento" class="${window.Auth?.hasPermission('equipamentos.criar') ? 'btn-primary' : 'hidden'}">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            Cadastrar Patrimônio
          </button>
        </div>

        <!-- Barra de Busca com Otimização -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="relative w-full sm:w-96">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-equip" 
              type="text" 
              placeholder="Buscar por nome, patrimônio ou localização..." 
              value="${this._esc(this.searchTerm)}"
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div class="text-xs text-slate-400 font-medium self-center">
            Mostrando ${filtered.length} equipamento(s)
          </div>
        </div>

        <!-- Tabela -->
        ${filtered.length === 0 ? 
          window.UI.renderEmptyState({
            title: 'Nenhum equipamento localizado',
            description: 'Verifique os termos de pesquisa informados ou cadastre um novo item.',
            actionLabel: window.Auth?.hasPermission('equipamentos.criar') ? 'Cadastrar Patrimônio' : null,
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto hub-scrollbar">
              <table class="w-full min-w-[780px] text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="p-3.5 w-16 text-center">Foto</th>
                    <th class="p-3.5">Equipamento / Ativo</th>
                    <th class="p-3.5">Nº Patrimônio</th>
                    <th class="p-3.5">Estado</th>
                    <th class="p-3.5">Responsável (Guarda)</th>
                    <th class="p-3.5">Localização</th>
                    <th class="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                  ${paginatedItems.map(item => {
                    const resp = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || 'Não vinculado';
                    const fotoUrl = item.imagem_url ? window.API.resolveAssetUrl(item.imagem_url) : null;

                    const badgeEstado = {
                      'bom': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                      'manutencao': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                      'descartado': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }[item.estado || 'bom'] || 'bg-slate-100 text-slate-700';

                    return `
                      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="p-3 text-center">
                          ${fotoUrl ? `
                            <div class="relative group/thumb inline-block cursor-pointer" onclick="window.EquipamentosModule.visualizarFoto('${this._esc(fotoUrl)}', '${this._esc(item.nome)}')">
                              <img src="${this._esc(fotoUrl)}" alt="${this._esc(item.nome)}" class="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group-hover/thumb:scale-105 transition-transform" />
                              <div class="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <i data-lucide="zoom-in" class="w-3.5 h-3.5"></i>
                              </div>
                            </div>
                          ` : `
                            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
                              <i data-lucide="image" class="w-4 h-4"></i>
                            </div>
                          `}
                        </td>
                        <td class="p-3.5">
                          <div class="font-bold text-slate-900 dark:text-white leading-tight" title="${this._esc(item.nome)}">${this._esc(item.nome)}</div>
                          ${item.descricao ? `<div class="text-[11px] text-slate-400 max-w-xs truncate mt-0.5" title="${this._esc(item.descricao)}">${this._esc(item.descricao)}</div>` : ''}
                          ${(item.numero_nf || item.data_aquisicao || item.nota_fiscal_url) ? `
                            <div class="flex flex-wrap items-center gap-1.5 mt-1">
                              ${item.data_aquisicao ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Aq: ${this._esc(this._fmtDateOnly(item.data_aquisicao))}</span>` : ''}
                              ${item.numero_nf ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono">NF: ${this._esc(item.numero_nf)}</span>` : ''}
                              ${item.nota_fiscal_url ? `<a href="${this._esc(window.API.resolveAssetUrl(item.nota_fiscal_url))}" target="_blank" rel="noopener" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:underline inline-flex items-center gap-1" title="Abrir Nota Fiscal anexada"><i data-lucide="file-text" class="w-3 h-3"></i> Ver NF</a>` : ''}
                            </div>
                          ` : ''}
                        </td>
                        <td class="p-3.5 font-mono">
                          <span class="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            ${this._esc(item.patrimonio)}
                          </span>
                        </td>
                        <td class="p-3.5">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeEstado}">
                            ${this._esc(item.estado || 'bom')}
                          </span>
                          ${(item.estado === 'descartado' && item.baixa_data) ? `<div class="text-[10px] text-rose-500 mt-0.5" title="Baixado por ${this._esc(item.baixa_usuario_nome || '-')}">Baixa: ${this._esc(this._fmtDateOnly(item.baixa_data))}</div>` : ''}
                        </td>
                        <td class="p-3.5 text-slate-600 dark:text-slate-300">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span>${this._esc(resp)}</span>
                          </div>
                        </td>
                        <td class="p-3.5 text-slate-500">
                          ${this._esc(item.localizacao || '-')}
                        </td>
                        <td class="p-3.5 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1">
                            <button type="button" onclick="window.EquipamentosModule._openHistoricoModal(${item.id})" class="btn-action-table action-primary" title="Ficha & Histórico de Movimentações">
                              <i data-lucide="history" class="w-4 h-4"></i>
                            </button>
                            ${(window.Auth?.hasPermission('equipamentos.editar') && item.estado !== 'descartado') ? `
                              <button type="button" onclick="window.EquipamentosModule._openMovimentarModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-success" title="Movimentar Patrimônio">
                                <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                              </button>
                              <button type="button" onclick="window.EquipamentosModule._openBaixaModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" title="Registrar Baixa Patrimonial">
                                <i data-lucide="archive-x" class="w-4 h-4"></i>
                              </button>
                            ` : ''}
                            <button type="button" onclick="window.EquipamentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="${window.Auth?.hasPermission('equipamentos.editar') ? 'btn-action-table action-edit' : 'hidden'}" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button type="button" onclick="window.EquipamentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="${window.Auth?.hasPermission('equipamentos.excluir') ? 'btn-action-table action-delete' : 'hidden'}" title="Excluir">
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
            <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, filtered.length)} de ${filtered.length}</span>
              <div class="flex items-center gap-1.5">
                <button ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-equip-prev" class="btn-secondary px-2.5 py-1 text-xs">Anterior</button>
                <span class="px-2 font-medium">${this.currentPage} / ${totalPages}</span>
                <button ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : ''} id="btn-equip-next" class="btn-secondary px-2.5 py-1 text-xs">Próxima</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    this._bindView(container);
  },

  _bindView(container) {
    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    // Busca otimizada com debounce (evita re-render pesado a cada caractere)
    const inputBusca = container.querySelector('#input-busca-equip');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this.searchTerm = e.target.value;
          this.currentPage = 1;
          this._renderView(container);
          // Restaura foco e cursor
          const novoInput = container.querySelector('#input-busca-equip');
          if (novoInput) {
            novoInput.focus();
            novoInput.setSelectionRange(novoInput.value.length, novoInput.value.length);
          }
        }, 220);
      });
    }

    container.querySelector('#btn-equip-prev')?.addEventListener('click', () => { this.currentPage--; this._renderView(container); });
    container.querySelector('#btn-equip-next')?.addEventListener('click', () => { this.currentPage++; this._renderView(container); });
    container.querySelector('#btn-novo-equipamento')?.addEventListener('click', () => this._openFormModal(container));
  },

  visualizarFoto(url, titulo) {
    window.UI.openModal({
      title: titulo || 'Foto do Patrimônio',
      subtitle: 'Visualização fotográfica do ativo',
      contentHtml: `
        <div class="flex items-center justify-center p-2 bg-slate-900 rounded-2xl overflow-hidden">
          <img src="${url}" alt="${this._esc(titulo)}" class="max-h-[70vh] w-auto object-contain rounded-xl" />
        </div>
      `,
      saveLabel: null
    });
  },

  // ─── Modal de Formulário com Validação Obrigatória de Foto ────────────────
  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    // Reset de estado temporário
    this._fotoArquivo = null;
    this._fotoBase64 = null;
    this._removerImagem = false;
    this._nfArquivo = null;
    this._removerNf = false;

    const fotoExistente = item && item.imagem_url ? window.API.resolveAssetUrl(item.imagem_url) : null;
    const nfExistente = item && item.nota_fiscal_url ? window.API.resolveAssetUrl(item.nota_fiscal_url) : null;
    const temFotoInicial = !!fotoExistente;

    const modalContent = `
      <form id="form-equipamento" class="space-y-4 text-xs" novalidate onsubmit="return false;">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome / Descrição do Ativo *</label>
            <input 
              type="text" 
              name="nome" 
              required 
              minlength="3"
              value="${item ? this._esc(item.nome) : ''}" 
              placeholder="Ex: Câmera Sony Alpha 4K com Lente 24-70mm" 
              class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Número de Patrimônio *</label>
            <input 
              type="text" 
              name="patrimonio" 
              required 
              value="${item ? this._esc(item.patrimonio) : ''}" 
              placeholder="Ex: HUB-PAT-00999" 
              class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono uppercase"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado de Conservação *</label>
            <select name="estado" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="bom" ${!item || item.estado === 'bom' ? 'selected' : ''}>Bom (Operacional)</option>
              <option value="manutencao" ${item && item.estado === 'manutencao' ? 'selected' : ''}>Em Manutenção</option>
              <option value="descartado" ${item && item.estado === 'descartado' ? 'selected' : ''}>Descartado / Baixado</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Responsável pela Guarda</label>
            <select name="responsavel_id" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Sem responsável vinculado</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>
                  ${this._esc(u.nome)} (${this._esc(u.perfil || 'Colaborador')})
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Localização Física</label>
            <input 
              type="text" 
              name="localizacao" 
              value="${item && item.localizacao ? this._esc(item.localizacao) : ''}" 
              placeholder="Ex: Sala 204 - Laboratório Audiovisual" 
              class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Especificações Técnicas / Observações</label>
          <textarea 
            name="descricao" 
            rows="2" 
            placeholder="Número de série, acessórios inclusos, voltagem ou especificações..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >${item && item.descricao ? this._esc(item.descricao) : ''}</textarea>
        </div>

        <!-- AQUISIÇÃO & NOTA FISCAL -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <i data-lucide="file-text" class="w-4 h-4 text-indigo-600"></i> Aquisição & Nota Fiscal
            </span>
            <span class="text-[10px] text-slate-400">Opcional (quando aplicável)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data de Aquisição</label>
              <input
                type="date"
                name="data_aquisicao"
                value="${item && item.data_aquisicao ? this._esc(String(item.data_aquisicao).slice(0, 10)) : ''}"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Número da Nota Fiscal (NF)</label>
              <input
                type="text"
                name="numero_nf"
                value="${item && item.numero_nf ? this._esc(item.numero_nf) : ''}"
                placeholder="Ex: NF-e 00012345"
                class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="paperclip" class="w-3.5 h-3.5 text-indigo-600"></i> Anexar Nota Fiscal (PDF / Imagem)
              <input id="input-equip-nf" type="file" accept=".pdf,image/*" class="hidden">
            </label>
            ${nfExistente ? `
              <a id="link-equip-nf-atual" href="${this._esc(nfExistente)}" target="_blank" rel="noopener" class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1 hover:underline">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> ${this._esc(item.nota_fiscal_nome || 'Ver NF anexada')}
              </a>
            ` : ''}
            <span id="lbl-equip-nf-nome" class="text-[11px] text-slate-600 dark:text-slate-300 font-medium ${nfExistente ? 'hidden' : ''}"></span>
            <button type="button" id="btn-remover-nf-equip" class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 font-semibold flex items-center gap-1 ${nfExistente ? '' : 'hidden'}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remover NF
            </button>
          </div>
        </div>

        <!-- SEÇÃO DE FOTO DO PATRIMÔNIO COM VALIDAÇÃO OBRIGATÓRIA -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border-2 ${temFotoInicial ? 'border-emerald-300 dark:border-emerald-800' : 'border-amber-300 dark:border-amber-700/80'} transition-colors" id="box-foto-equip-container">
          <div class="flex items-center justify-between mb-1">
            <label class="block font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <i data-lucide="camera" class="w-4 h-4 text-indigo-600"></i> Fotografia do Ativo *
            </label>
            <span id="badge-foto-status" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${temFotoInicial ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
              ${temFotoInicial ? 'Foto vinculada' : 'Foto Obrigatória'}
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mb-3">Tire uma foto utilizando a câmera ou anexe um arquivo de imagem (JPG, PNG ou WebP).</p>

          <div class="flex flex-wrap items-center gap-2 mb-3">
            <!-- Botão 1: Upload de Arquivo -->
            <label class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i> Escolher Imagem
              <input id="input-equip-arquivo" type="file" accept="image/*" class="hidden">
            </label>

            <!-- Botão 2: Câmera Desktop / Webcam -->
            <button type="button" id="btn-abrir-webcam-equip" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <i data-lucide="video" class="w-3.5 h-3.5 text-indigo-600"></i> Tirar Foto (Câmera)
            </button>

            <!-- Botão 3: Câmera Nativa Mobile/Tablet -->
            <label class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer sm:hidden">
              <i data-lucide="camera" class="w-3.5 h-3.5 text-indigo-600"></i> Câmera do Celular
              <input id="input-equip-captura-nativa" type="file" accept="image/*" capture="environment" class="hidden">
            </label>

            <!-- Botão 4: Remover Foto -->
            <button type="button" id="btn-remover-foto-equip" class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5 font-semibold flex items-center gap-1 ${fotoExistente ? '' : 'hidden'}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remover Foto
            </button>
          </div>

          <!-- Preview da Imagem -->
          <div id="wrap-equip-preview" class="${fotoExistente ? '' : 'hidden'} flex items-center gap-3 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <img id="img-equip-preview" src="${fotoExistente || ''}" alt="Preview" class="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0" />
            <div class="min-w-0 flex-1">
              <p id="lbl-equip-status-foto" class="font-bold text-slate-800 dark:text-white text-xs">
                ${fotoExistente ? 'Foto cadastrada no patrimônio' : 'Nova foto capturada com sucesso'}
              </p>
              <p class="text-[10px] text-slate-400 mt-0.5">Esta imagem será o registro visual oficial do bem no sistema.</p>
              <div class="flex items-center gap-2 mt-1.5">
                <button type="button" id="btn-refazer-foto-equip" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> Refazer Fotografia
                </button>
              </div>
            </div>
          </div>

          <!-- Mensagem Clara de Alerta / Validação da Foto -->
          <div id="alerta-validacao-foto" class="mt-2.5 ${temFotoInicial ? 'hidden' : ''} p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0"></i>
            <span><strong>Atenção:</strong> É obrigatório adicionar ou capturar uma foto do equipamento para habilitar o cadastro.</span>
          </div>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: isEdit ? 'Editar Ativo Patrimonial' : 'Cadastrar Novo Equipamento',
      subtitle: 'Controle de bens e patrimônio do HUB ES+',
      contentHtml: modalContent,
      saveLabel: isEdit ? 'Salvar Alterações' : 'Tornar Patrimônio',
      onSave: async () => {
        const form = document.getElementById('form-equipamento');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const nome = (formData.get('nome') || '').trim();
        const patrimonio = (formData.get('patrimonio') || '').trim();
        const responsavel_id = formData.get('responsavel_id') ? Number(formData.get('responsavel_id')) : null;
        const localizacao = (formData.get('localizacao') || '').trim();
        const estado = formData.get('estado') || 'bom';
        const descricao = (formData.get('descricao') || '').trim();
        const data_aquisicao = (formData.get('data_aquisicao') || '').trim();
        const numero_nf = (formData.get('numero_nf') || '').trim();

        if (nome.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'O nome do equipamento deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }

        if (patrimonio.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Informe o número de patrimônio corretamente.', type: 'warning' });
          return false;
        }

        // Validação obrigatória da fotografia
        const temFoto = !!(this._fotoArquivo || this._fotoBase64 || (isEdit && fotoExistente && !this._removerImagem));
        if (!temFoto) {
          window.UI.toast({
            title: 'Fotografia Obrigatória',
            message: 'Não é permitido cadastrar um equipamento sem uma fotografia válida. Tire uma foto com a câmera ou anexe um arquivo.',
            type: 'warning'
          });
          const boxContainer = document.getElementById('box-foto-equip-container');
          if (boxContainer) {
            boxContainer.classList.add('ring-2', 'ring-rose-500');
            boxContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return false;
        }

        try {
          const dataToSend = new FormData();
          dataToSend.append('nome', nome);
          dataToSend.append('patrimonio', patrimonio);
          if (responsavel_id) dataToSend.append('responsavel_id', responsavel_id);
          if (localizacao) dataToSend.append('localizacao', localizacao);
          dataToSend.append('estado', estado);
          if (descricao) dataToSend.append('descricao', descricao);
          dataToSend.append('data_aquisicao', data_aquisicao);
          dataToSend.append('numero_nf', numero_nf);
          if (this._nfArquivo) {
            dataToSend.append('nota_fiscal', this._nfArquivo);
          } else if (this._removerNf) {
            dataToSend.append('remover_nota_fiscal', 'true');
          }

          if (this._fotoArquivo) {
            dataToSend.append('imagem', this._fotoArquivo);
          } else if (this._fotoBase64) {
            dataToSend.append('imagem_base64', this._fotoBase64);
          } else if (this._removerImagem) {
            dataToSend.append('remover_imagem', 'true');
          }

          if (isEdit) {
            await window.API.updateEquipamento(editId, dataToSend);
            window.UI.toast({ title: 'Equipamento Atualizado', message: 'Dados e fotos do patrimônio salvos com sucesso.' });
          } else {
            await window.API.createEquipamento(dataToSend);
            window.UI.toast({ title: 'Equipamento Cadastrado', message: 'Item registrado com fotografia oficial no inventário do HUB ES+.' });
          }

          await this.render(container);
          return true;
        } catch (err) {
          console.error('[EQUIPAMENTOS] Erro ao salvar:', err);
          window.UI.toast({ title: 'Erro ao Salvar', message: err.message || 'Falha ao processar patrimônio.', type: 'error' });
          return false;
        }
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Configuração dos controles de foto e atualização dinâmica da validação
    const inputArquivo = document.getElementById('input-equip-arquivo');
    const inputNativa = document.getElementById('input-equip-captura-nativa');
    const btnWebcam = document.getElementById('btn-abrir-webcam-equip');
    const btnRemover = document.getElementById('btn-remover-foto-equip');
    const btnRefazer = document.getElementById('btn-refazer-foto-equip');
    const wrapPreview = document.getElementById('wrap-equip-preview');
    const imgPreview = document.getElementById('img-equip-preview');
    const lblStatus = document.getElementById('lbl-equip-status-foto');
    const badgeStatus = document.getElementById('badge-foto-status');
    const alertaValidacao = document.getElementById('alerta-validacao-foto');
    const boxContainer = document.getElementById('box-foto-equip-container');

    // Identifica o botão de Salvar do modal do window.UI
    const btnSalvarModal = document.getElementById('modal-save-btn');

    // Controles de Nota Fiscal
    const inputNf = document.getElementById('input-equip-nf');
    const lblNfNome = document.getElementById('lbl-equip-nf-nome');
    const linkNfAtual = document.getElementById('link-equip-nf-atual');
    const btnRemoverNf = document.getElementById('btn-remover-nf-equip');

    inputNf?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        window.UI.toast({ title: 'Arquivo grande', message: 'A Nota Fiscal deve ter no máximo 10 MB.', type: 'warning' });
        e.target.value = '';
        return;
      }
      this._nfArquivo = file;
      this._removerNf = false;
      if (linkNfAtual) linkNfAtual.classList.add('hidden');
      if (lblNfNome) {
        lblNfNome.textContent = `Selecionado: ${file.name}`;
        lblNfNome.classList.remove('hidden');
      }
      if (btnRemoverNf) btnRemoverNf.classList.remove('hidden');
    });

    btnRemoverNf?.addEventListener('click', () => {
      this._nfArquivo = null;
      this._removerNf = true;
      if (inputNf) inputNf.value = '';
      if (linkNfAtual) linkNfAtual.classList.add('hidden');
      if (lblNfNome) {
        lblNfNome.textContent = 'Nota fiscal será removida ao salvar';
        lblNfNome.classList.remove('hidden');
      }
      btnRemoverNf.classList.add('hidden');
    });

    const atualizarEstadoValidacaoFoto = () => {
      const temFoto = !!(this._fotoArquivo || this._fotoBase64 || (isEdit && fotoExistente && !this._removerImagem));
      
      if (btnSalvarModal && !isEdit) {
        if (!temFoto) {
          btnSalvarModal.disabled = true;
          btnSalvarModal.classList.add('opacity-50', 'cursor-not-allowed');
          btnSalvarModal.title = 'Adicione uma fotografia para liberar o cadastro';
        } else {
          btnSalvarModal.disabled = false;
          btnSalvarModal.classList.remove('opacity-50', 'cursor-not-allowed');
          btnSalvarModal.title = '';
        }
      }

      if (temFoto) {
        if (boxContainer) {
          boxContainer.className = 'p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border-2 border-emerald-400 dark:border-emerald-700 transition-colors';
        }
        if (badgeStatus) {
          badgeStatus.textContent = 'Foto válida vinculada';
          badgeStatus.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
        }
        if (alertaValidacao) alertaValidacao.classList.add('hidden');
      } else {
        if (boxContainer) {
          boxContainer.className = 'p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border-2 border-amber-300 dark:border-amber-700/80 transition-colors';
        }
        if (badgeStatus) {
          badgeStatus.textContent = 'Foto Obrigatória';
          badgeStatus.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
        }
        if (alertaValidacao) alertaValidacao.classList.remove('hidden');
      }
    };

    // Estado inicial de bloqueio no cadastro novo
    if (!isEdit && !temFotoInicial) {
      if (btnSalvarModal) {
        btnSalvarModal.disabled = true;
        btnSalvarModal.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }

    const processarArquivoFoto = (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        window.UI.toast({ title: 'Formato Inválido', message: 'Selecione um arquivo de imagem (JPG, PNG ou WebP).', type: 'warning' });
        return;
      }
      this._fotoArquivo = file;
      this._fotoBase64 = null;
      this._removerImagem = false;

      const url = URL.createObjectURL(file);
      if (imgPreview) imgPreview.src = url;
      if (wrapPreview) wrapPreview.classList.remove('hidden');
      if (btnRemover) btnRemover.classList.remove('hidden');
      if (lblStatus) lblStatus.textContent = `Arquivo anexado: ${file.name}`;

      atualizarEstadoValidacaoFoto();
    };

    inputArquivo?.addEventListener('change', (e) => processarArquivoFoto(e.target.files?.[0]));
    inputNativa?.addEventListener('change', (e) => processarArquivoFoto(e.target.files?.[0]));

    btnRemover?.addEventListener('click', () => {
      this._fotoArquivo = null;
      this._fotoBase64 = null;
      this._removerImagem = true;
      if (wrapPreview) wrapPreview.classList.add('hidden');
      if (btnRemover) btnRemover.classList.add('hidden');
      if (imgPreview) imgPreview.src = '';
      if (inputArquivo) inputArquivo.value = '';
      if (inputNativa) inputNativa.value = '';

      atualizarEstadoValidacaoFoto();
    });

    // Abertura da câmera
    const dispararCamera = () => {
      this._iniciarCameraGlobal(() => {
        atualizarEstadoValidacaoFoto();
      });
    };

    btnWebcam?.addEventListener('click', dispararCamera);
    btnRefazer?.addEventListener('click', dispararCamera);
  },

  // ─── Modal de Câmera Global Acima de Qualquer Modal (z-[9999]) ─────────────
  _ensureCameraModal() {
    let modal = document.getElementById('equip-modal-camera-global');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'equip-modal-camera-global';
      modal.className = 'fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md hidden flex items-center justify-center p-4 transition-all duration-300';
      modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="camera" class="w-4 h-4 text-indigo-600"></i> Câmera do Dispositivo
              </h4>
              <p class="text-[11px] text-slate-400 mt-0.5">Posicione o equipamento no centro da tela e capture a imagem</p>
            </div>
            <button type="button" id="equip-global-fechar-camera" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
            <video id="equip-global-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <canvas id="equip-global-canvas" class="hidden"></canvas>
            <div id="equip-global-camera-loading" class="absolute text-xs text-white flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              <span>Acessando câmera...</span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <button type="button" id="equip-global-inverter-camera" class="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Alternar Lente
            </button>
            <div class="flex items-center gap-2">
              <button type="button" id="equip-global-cancelar-camera" class="btn-secondary text-xs px-3.5 py-2">
                Cancelar
              </button>
              <button type="button" id="equip-global-disparar-camera"
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer">
                <i data-lucide="camera" class="w-4 h-4"></i> Capturar Fotografia
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#equip-global-fechar-camera')?.addEventListener('click', () => this._fecharCameraGlobal());
      modal.querySelector('#equip-global-cancelar-camera')?.addEventListener('click', () => this._fecharCameraGlobal());
      modal.querySelector('#equip-global-inverter-camera')?.addEventListener('click', () => {
        this._facingMode = this._facingMode === 'user' ? 'environment' : 'user';
        this._iniciarCameraGlobal(this._onCaptureCallback);
      });
      modal.querySelector('#equip-global-disparar-camera')?.addEventListener('click', () => this._capturarFotoGlobal());
    }
    return modal;
  },

  async _iniciarCameraGlobal(onCaptureCallback = null) {
    this._onCaptureCallback = onCaptureCallback;
    const modal = this._ensureCameraModal();
    modal.classList.remove('hidden');

    const video = modal.querySelector('#equip-global-video');
    const loading = modal.querySelector('#equip-global-camera-loading');
    if (loading) loading.style.display = 'flex';

    if (window.lucide) lucide.createIcons({ root: modal });

    try {
      if (this._streamCamera) {
        this._streamCamera.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sem suporte direto à câmera. Utilize a opção "Escolher Imagem" ou "Câmera do Celular".');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this._facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this._streamCamera = stream;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        if (loading) loading.style.display = 'none';
      };
    } catch (err) {
      console.warn('[CÂMERA] Erro ao inicializar webcam:', err.name, err.message);
      if (loading) loading.style.display = 'none';

      let msg = 'Não foi possível acessar a câmera do computador.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera negada pelo usuário ou navegador. Ative a permissão ou anexe uma foto existente.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera ou webcam detectada neste computador. Você pode selecionar um arquivo com a foto.';
      }

      window.UI.toast({ title: 'Aviso da Câmera', message: msg, type: 'warning' });
      this._fecharCameraGlobal();
    }
  },

  _fecharCameraGlobal() {
    if (this._streamCamera) {
      this._streamCamera.getTracks().forEach(t => t.stop());
      this._streamCamera = null;
    }
    const modal = document.getElementById('equip-modal-camera-global');
    if (modal) modal.classList.add('hidden');
  },

  _capturarFotoGlobal() {
    const modal = document.getElementById('equip-modal-camera-global');
    const video = modal?.querySelector('#equip-global-video');
    const canvas = modal?.querySelector('#equip-global-canvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.90);
    this._fotoBase64 = base64;
    this._fotoArquivo = null;
    this._removerImagem = false;

    // Atualiza preview no modal de formulário
    const wrapPreview = document.getElementById('wrap-equip-preview');
    const imgPreview = document.getElementById('img-equip-preview');
    const lblStatus = document.getElementById('lbl-equip-status-foto');
    const btnRemover = document.getElementById('btn-remover-foto-equip');

    if (imgPreview) imgPreview.src = base64;
    if (wrapPreview) wrapPreview.classList.remove('hidden');
    if (btnRemover) btnRemover.classList.remove('hidden');
    if (lblStatus) lblStatus.textContent = 'Fotografia capturada via câmera';

    this._fecharCameraGlobal();

    if (typeof this._onCaptureCallback === 'function') {
      this._onCaptureCallback();
    }

    window.UI.toast({ title: 'Foto Capturada!', message: 'Imagem vinculada ao equipamento com sucesso.', type: 'success' });
  },

  // ─── Modal de Movimentação Patrimonial ───────────────────────────────────
  _openMovimentarModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const respAtual = this.usuarios.find(u => Number(u.id) === Number(item.responsavel_id))?.nome || item.responsavel_nome || 'Sem responsável';
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const modalContent = `
      <form id="form-movimentar-equip" class="space-y-4 text-xs" novalidate onsubmit="return false;">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
          <div class="font-bold text-slate-900 dark:text-white">${this._esc(item.nome)} <span class="font-mono text-indigo-600">(${this._esc(item.patrimonio)})</span></div>
          <div class="text-[11px] text-slate-500">Local atual: <strong>${this._esc(item.localizacao || 'Não informada')}</strong> • Responsável atual: <strong>${this._esc(respAtual)}</strong></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nova Localização (Destino) *</label>
            <input type="text" name="local_destino" required placeholder="Ex: Auditório Principal / Sala 102"
              class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Novo Responsável pela Guarda</label>
            <select name="responsavel_novo_id" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Sem responsável vinculado</option>
              ${this.usuarios.map(u => `<option value="${u.id}" ${Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>${this._esc(u.nome)} (${this._esc(u.perfil || 'Colaborador')})</option>`).join('')}
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data e Hora da Movimentação</label>
          <input type="datetime-local" name="data_movimentacao" value="${nowLocal}"
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo / Observação da Movimentação</label>
          <textarea name="observacao" rows="2" placeholder="Descreva o motivo da transferência ou observações de entrega..."
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"></textarea>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Movimentar Patrimônio',
      subtitle: 'Transferência de local e/ou responsável com registro em histórico',
      contentHtml: modalContent,
      saveLabel: 'Confirmar Movimentação',
      maxWidth: 'max-w-lg',
      onSave: async () => {
        const form = document.getElementById('form-movimentar-equip');
        if (!window.UI.validateForm(form)) return false;
        const fd = new FormData(form);
        const payload = {
          local_destino: (fd.get('local_destino') || '').trim(),
          responsavel_novo_id: fd.get('responsavel_novo_id') ? Number(fd.get('responsavel_novo_id')) : null,
          data_movimentacao: fd.get('data_movimentacao') || null,
          observacao: (fd.get('observacao') || '').trim() || null
        };
        try {
          await window.API.movimentarEquipamento(id, payload);
          window.UI.toast({ title: 'Patrimônio Movimentado', message: 'Transferência registrada no histórico do bem.' });
          await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro ao Movimentar', message: err.message || 'Falha ao registrar movimentação.', type: 'error' });
          return false;
        }
      }
    });
  },

  // ─── Modal de Baixa Patrimonial ──────────────────────────────────────────
  _openBaixaModal(container, id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const usuarioAtual = window.Auth?.getUsuario()?.nome || 'Usuário Autenticado';
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const modalContent = `
      <form id="form-baixa-equip" class="space-y-4 text-xs" novalidate onsubmit="return false;">
        <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
          <div class="font-bold">Baixa do Patrimônio: ${this._esc(item.nome)} (${this._esc(item.patrimonio)})</div>
          <div class="text-[11px]">Responsável pelo registro da baixa: <strong>${this._esc(usuarioAtual)}</strong></div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Baixa *</label>
          <input type="datetime-local" name="data_baixa" required value="${nowLocal}"
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Destino do Bem *</label>
          <input type="text" name="destino" required list="lista-destinos-baixa" placeholder="Ex: Descarte Ecológico, Doação, Leilão, Depósito de Inservíveis..."
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          <datalist id="lista-destinos-baixa">
            <option value="Descarte Ecológico / Reciclagem"></option>
            <option value="Depósito de Inservíveis"></option>
            <option value="Doação Institucional"></option>
            <option value="Leilão Público"></option>
            <option value="Transferência Externa"></option>
            <option value="Extravio / Sinistro"></option>
          </datalist>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo da Baixa *</label>
          <textarea name="motivo" required rows="3" placeholder="Descreva detalhadamente o motivo da baixa (ex: dano irreparável, obsolescência, laudo técnico nº...)..."
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"></textarea>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: 'Registrar Baixa Patrimonial',
      subtitle: 'Esta ação altera o estado do bem para Descartado / Baixado com registro permanente',
      contentHtml: modalContent,
      saveLabel: 'Confirmar Baixa',
      maxWidth: 'max-w-lg',
      onSave: async () => {
        const form = document.getElementById('form-baixa-equip');
        if (!window.UI.validateForm(form)) return false;
        const fd = new FormData(form);
        const payload = {
          data_baixa: fd.get('data_baixa') || null,
          destino: (fd.get('destino') || '').trim(),
          motivo: (fd.get('motivo') || '').trim()
        };
        if (payload.motivo.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Informe o motivo da baixa (mín. 3 caracteres).', type: 'warning' });
          return false;
        }
        try {
          await window.API.baixarEquipamento(id, payload);
          window.UI.toast({ title: 'Baixa Registrada', message: 'Baixa patrimonial gravada com sucesso no histórico.', type: 'warning' });
          await this.render(container);
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro ao Baixar', message: err.message || 'Falha ao registrar baixa.', type: 'error' });
          return false;
        }
      }
    });
  },

  // ─── Modal de Ficha & Histórico Completo do Patrimônio ───────────────────
  async _openHistoricoModal(id) {
    window.UI.openModal({
      title: 'Ficha & Histórico Patrimonial',
      subtitle: 'Carregando linha do tempo do bem...',
      contentHtml: '<div class="py-10 text-center text-xs text-slate-400">Carregando histórico completo...</div>',
      saveLabel: null,
      cancelLabel: 'Fechar',
      maxWidth: 'max-w-2xl'
    });

    try {
      const resp = await window.API.getEquipamentoHistorico(id);
      const eq = resp?.equipamento || resp?.data?.equipamento || this.items.find(i => Number(i.id) === Number(id)) || {};
      const movs = resp?.movimentacoes || resp?.data?.movimentacoes || [];

      const fotoUrl = eq.imagem_url ? window.API.resolveAssetUrl(eq.imagem_url) : null;
      const nfUrl = eq.nota_fiscal_url ? window.API.resolveAssetUrl(eq.nota_fiscal_url) : null;

      const html = `
        <div class="space-y-4 text-xs">
          <!-- Resumo do Bem -->
          <div class="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            ${fotoUrl ? `<img src="${this._esc(fotoUrl)}" alt="${this._esc(eq.nome)}" class="w-20 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0" />` : ''}
            <div class="flex-1 space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">${this._esc(eq.nome)}</h4>
                <span class="font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">${this._esc(eq.patrimonio)}</span>
              </div>
              <p class="text-slate-500">Localização atual: <strong class="text-slate-800 dark:text-slate-200">${this._esc(eq.localizacao || 'Não informada')}</strong></p>
              <p class="text-slate-500">Responsável atual: <strong class="text-slate-800 dark:text-slate-200">${this._esc(eq.responsavel_nome || 'Não vinculado')}</strong></p>
              <p class="text-slate-500">Estado: <strong class="uppercase">${this._esc(eq.estado || 'bom')}</strong></p>
            </div>
          </div>

          <!-- Aquisição & Nota Fiscal -->
          <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-0.5">
              <div class="font-bold text-slate-800 dark:text-slate-200">Aquisição & Nota Fiscal</div>
              <div class="text-slate-500">
                Data de Aquisição: <strong>${eq.data_aquisicao ? this._esc(this._fmtDateOnly(eq.data_aquisicao)) : 'Não informada'}</strong>
                • Número NF: <strong class="font-mono">${this._esc(eq.numero_nf || 'Não informado')}</strong>
              </div>
            </div>
            ${nfUrl ? `
              <a href="${this._esc(nfUrl)}" target="_blank" rel="noopener" class="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Abrir Nota Fiscal
              </a>
            ` : '<span class="text-[11px] text-slate-400">Sem anexo de NF</span>'}
          </div>

          <!-- Registro de Baixa (se baixado) -->
          ${(eq.estado === 'descartado' || eq.baixa_data) ? `
            <div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-1.5">
              <div class="font-extrabold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <i data-lucide="archive-x" class="w-4 h-4"></i> Registro de Baixa Patrimonial
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-rose-900 dark:text-rose-100">
                <div><strong>Quem baixou:</strong> ${this._esc(eq.baixa_usuario_nome || 'Não informado')}</div>
                <div><strong>Data da Baixa:</strong> ${this._esc(this._fmtDate(eq.baixa_data))}</div>
                <div><strong>Destino:</strong> ${this._esc(eq.baixa_destino || 'Não informado')}</div>
                <div><strong>Motivo:</strong> ${this._esc(eq.baixa_motivo || 'Não informado')}</div>
              </div>
            </div>
          ` : ''}

          <!-- Timeline de Movimentações -->
          <div>
            <h5 class="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
              <i data-lucide="history" class="w-3.5 h-3.5 text-indigo-600"></i> Histórico de Movimentações (${movs.length})
            </h5>
            ${movs.length === 0 ? `
              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center text-slate-400">
                Nenhuma movimentação registrada ainda para este patrimônio.
              </div>
            ` : `
              <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1 hub-scrollbar">
                ${movs.map(m => {
                  const tipoLabel = m.tipo === 'cadastro' ? 'Cadastro' : m.tipo === 'baixa' ? 'Baixa' : 'Movimentação';
                  const tipoClass = m.tipo === 'baixa'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : m.tipo === 'cadastro'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300';
                  return `
                    <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 space-y-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tipoClass}">${tipoLabel}</span>
                        <span class="text-[11px] text-slate-400 font-mono">${this._esc(this._fmtDate(m.data_movimentacao || m.created_at))}</span>
                      </div>
                      <div class="text-slate-700 dark:text-slate-200">
                        <strong>Local:</strong> ${this._esc(m.local_origem || '—')} <span class="text-slate-400">→</span> <strong>${this._esc(m.local_destino || '—')}</strong>
                      </div>
                      <div class="text-slate-600 dark:text-slate-300">
                        <strong>Responsável:</strong> ${this._esc(m.responsavel_anterior_nome || '—')} <span class="text-slate-400">→</span> <strong>${this._esc(m.responsavel_novo_nome || '—')}</strong>
                      </div>
                      <div class="text-[11px] text-slate-500">
                        <strong>Movimentado por:</strong> ${this._esc(m.movimentado_por_nome || 'Sistema')}
                        ${m.observacao ? ` • <em>${this._esc(m.observacao)}</em>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      window.UI.openModal({
        title: 'Ficha & Histórico Patrimonial',
        subtitle: `${eq.nome || 'Patrimônio'} • ${eq.patrimonio || ''}`,
        contentHtml: html,
        saveLabel: null,
        cancelLabel: 'Fechar',
        maxWidth: 'max-w-2xl'
      });
    } catch (err) {
      window.UI.openModal({
        title: 'Erro ao Carregar Histórico',
        contentHtml: `<div class="p-4 text-xs text-rose-600">${this._esc(err.message || 'Não foi possível carregar o histórico.')}</div>`,
        saveLabel: null,
        cancelLabel: 'Fechar'
      });
    }
  },

  _fmtDate(dt) {
    if (!dt) return '-';
    const d = new Date(String(dt).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(dt);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  },

  _fmtDateOnly(dt) {
    if (!dt) return '-';
    const s = String(dt).slice(0, 10);
    const parts = s.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return s;
  },

  _confirmDelete(container, id) {
    window.UI.confirmModal({
      title: 'Remover Equipamento?',
      message: 'Tem certeza que deseja desincorporar este equipamento do controle patrimonial? A imagem associada também será removida.',
      onConfirm: async () => {
        try {
          await window.API.deleteEquipamento(id);
          window.UI.toast({ title: 'Equipamento Removido', message: 'Registro de patrimônio apagado.', type: 'warning' });
          await this.render(container);
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao remover equipamento.', type: 'error' });
        }
      }
    });
  },

  _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
