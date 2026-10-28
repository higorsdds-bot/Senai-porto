/**
 * HUB ES+ - Módulo 10: Controle de Equipamentos (Patrimônio)
 * Suporte completo a anexar fotos (upload de arquivos JPG/PNG/WebP ou captura via Webcam).
 * Tabela com miniaturas, modal ampliado, busca e paginação.
 */

window.EquipamentosModule = {
  items: [],
  usuarios: [],
  searchTerm: '',
  currentPage: 1,
  pageSize: 8,

  // Estado temporário de foto no modal
  _fotoArquivo: null,
  _fotoBase64: null,
  _fotoPreviewUrl: null,
  _removerImagem: false,
  _streamCamera: null,
  _facingMode: 'environment',

  async render(container) {
    container.innerHTML = window.UI.renderTableSkeleton(6, 6);

    try {
      const [equipamentos, usuarios] = await Promise.all([
        window.API.getEquipamentos(),
        window.API.getUsuarios().catch(() => [])
      ]);
      this.items = Array.isArray(equipamentos) ? equipamentos : (equipamentos?.data || []);
      this.usuarios = Array.isArray(usuarios) ? usuarios : (usuarios?.data || []);
      this._renderView(container);
    } catch (err) {
      console.error('[EQUIPAMENTOS] Erro ao carregar ativos:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Inventário Indisponível',
        description: 'Não foi possível carregar os equipamentos cadastrados.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const q = this.searchTerm.toLowerCase().trim();
    let filtered = this.items.filter(item => {
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
          <button id="btn-novo-equipamento" class="btn-primary">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            Cadastrar Patrimônio
          </button>
        </div>

        <!-- Barra de Busca -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="relative w-full sm:w-96">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-busca-equip" 
              type="text" 
              placeholder="Buscar por nome, patrimônio ou localização..." 
              value="${this.searchTerm}"
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
            actionLabel: 'Cadastrar Patrimônio',
            onActionClick: () => this._openFormModal(container)
          })
          : `
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
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
                            <div class="relative group/thumb inline-block cursor-pointer" onclick="window.EquipamentosModule.visualizarFoto('${fotoUrl}', '${item.nome.replace(/'/g, "\\'")}')">
                              <img src="${fotoUrl}" alt="${item.nome}" class="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group-hover/thumb:scale-105 transition-transform" />
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
                          <div class="font-bold text-slate-900 dark:text-white leading-tight">${item.nome}</div>
                          ${item.descricao ? `<div class="text-[11px] text-slate-400 max-w-xs truncate mt-0.5">${item.descricao}</div>` : ''}
                        </td>
                        <td class="p-3.5 font-mono">
                          <span class="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            ${item.patrimonio}
                          </span>
                        </td>
                        <td class="p-3.5">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeEstado}">
                            ${item.estado || 'bom'}
                          </span>
                        </td>
                        <td class="p-3.5 text-slate-600 dark:text-slate-300">
                          <div class="flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span>${resp}</span>
                          </div>
                        </td>
                        <td class="p-3.5 text-slate-500">
                          ${item.localizacao || '-'}
                        </td>
                        <td class="p-3.5 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.EquipamentosModule._openFormModal(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-edit" title="Editar">
                              <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.EquipamentosModule._confirmDelete(document.getElementById('main-content'), ${item.id})" class="btn-action-table action-delete" title="Excluir">
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

      <!-- MODAL DE WEBCAM AO VIVO -->
      <div id="equip-modal-camera" class="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="camera" class="w-4 h-4 text-indigo-600"></i> Capturar Foto do Patrimônio
            </h4>
            <button type="button" id="equip-btn-fechar-camera" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            <video id="equip-camera-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <canvas id="equip-camera-canvas" class="hidden"></canvas>
            <div id="equip-camera-loading" class="absolute text-xs text-white flex items-center gap-2">
              <span>Iniciando câmera...</span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <button type="button" id="equip-btn-inverter-camera" class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Alternar Câmera
            </button>
            <button type="button" id="equip-btn-disparar-foto"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer">
              <i data-lucide="camera" class="w-4 h-4"></i> Capturar Foto
            </button>
          </div>
        </div>
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

    // Listeners do modal de câmera
    const modalCam = container.querySelector('#equip-modal-camera');
    container.querySelector('#equip-btn-fechar-camera')?.addEventListener('click', () => this._fecharCamera(modalCam));
    container.querySelector('#equip-btn-inverter-camera')?.addEventListener('click', () => this._alternarCamera(modalCam));
    container.querySelector('#equip-btn-disparar-foto')?.addEventListener('click', () => this._capturarFoto(modalCam));
  },

  visualizarFoto(url, titulo) {
    window.UI.openModal({
      title: titulo || 'Foto do Patrimônio',
      subtitle: 'Visualização fotográfica do ativo',
      contentHtml: `
        <div class="flex items-center justify-center p-2 bg-slate-900 rounded-2xl overflow-hidden">
          <img src="${url}" alt="${titulo}" class="max-h-[70vh] w-auto object-contain rounded-xl" />
        </div>
      `,
      saveLabel: null
    });
  },

  _openFormModal(container, editId = null) {
    const isEdit = !!editId;
    const item = isEdit ? this.items.find(i => Number(i.id) === Number(editId)) : null;

    // Reset de estado temporário
    this._fotoArquivo = null;
    this._fotoBase64 = null;
    this._fotoPreviewUrl = null;
    this._removerImagem = false;

    const fotoExistente = item && item.imagem_url ? window.API.resolveAssetUrl(item.imagem_url) : null;

    const modalContent = `
      <form id="form-equipamento" class="space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome / Descrição do Ativo *</label>
            <input 
              type="text" 
              name="nome" 
              required 
              minlength="3"
              value="${item ? item.nome : ''}" 
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
              value="${item ? item.patrimonio : ''}" 
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
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Responsável pela Guarda *</label>
            <select name="responsavel_id" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Sem responsável vinculado</option>
              ${this.usuarios.map(u => `
                <option value="${u.id}" ${item && Number(item.responsavel_id) === Number(u.id) ? 'selected' : ''}>
                  ${u.nome} (${u.perfil || 'Colaborador'})
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Localização Física</label>
            <input 
              type="text" 
              name="localizacao" 
              value="${item && item.localizacao ? item.localizacao : ''}" 
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
          >${item && item.descricao ? item.descricao : ''}</textarea>
        </div>

        <!-- SEÇÃO DE FOTO DO PATRIMÔNIO -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
            <i data-lucide="camera" class="w-4 h-4 text-indigo-600"></i> Foto do Equipamento / Patrimônio
          </label>
          <p class="text-[11px] text-slate-400 mb-3">Tire uma foto ao vivo pela câmera ou faça upload de um arquivo de imagem (JPG, PNG ou WebP).</p>

          <div class="flex flex-wrap items-center gap-2 mb-3">
            <label class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i> Escolher Imagem
              <input id="input-equip-arquivo" type="file" accept="image/*" class="hidden">
            </label>

            <button type="button" id="btn-abrir-webcam-equip" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <i data-lucide="video" class="w-3.5 h-3.5 text-indigo-600"></i> Tirar com a Câmera
            </button>

            <button type="button" id="btn-remover-foto-equip" class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5 font-semibold flex items-center gap-1 ${fotoExistente ? '' : 'hidden'}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remover Foto
            </button>
          </div>

          <!-- Preview da Imagem -->
          <div id="wrap-equip-preview" class="${fotoExistente ? '' : 'hidden'} flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <img id="img-equip-preview" src="${fotoExistente || ''}" alt="Preview" class="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
            <div class="min-w-0">
              <p id="lbl-equip-status-foto" class="font-bold text-slate-800 dark:text-white text-xs">
                ${fotoExistente ? 'Foto cadastrada no patrimônio' : 'Nova foto selecionada'}
              </p>
              <p class="text-[10px] text-slate-400">Esta imagem será exibida na tabela e no prontuário do bem.</p>
            </div>
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

        if (nome.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'O nome do equipamento deve ter no mínimo 3 caracteres.', type: 'warning' });
          return false;
        }

        if (patrimonio.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Informe o número de patrimônio corretamente.', type: 'warning' });
          return false;
        }

        try {
          // Prepara FormData se houver arquivo ou imagem
          const dataToSend = new FormData();
          dataToSend.append('nome', nome);
          dataToSend.append('patrimonio', patrimonio);
          if (responsavel_id) dataToSend.append('responsavel_id', responsavel_id);
          if (localizacao) dataToSend.append('localizacao', localizacao);
          dataToSend.append('estado', estado);
          if (descricao) dataToSend.append('descricao', descricao);

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
            window.UI.toast({ title: 'Equipamento Cadastrado', message: 'Item registrado no inventário do HUB ES+.' });
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

    // Configurar listeners do formulário de foto
    const inputArquivo = document.getElementById('input-equip-arquivo');
    const btnWebcam = document.getElementById('btn-abrir-webcam-equip');
    const btnRemover = document.getElementById('btn-remover-foto-equip');
    const wrapPreview = document.getElementById('wrap-equip-preview');
    const imgPreview = document.getElementById('img-equip-preview');
    const lblStatus = document.getElementById('lbl-equip-status-foto');

    inputArquivo?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        window.UI.toast({ title: 'Formato Inválido', message: 'Selecione um arquivo de imagem (JPG, PNG ou WebP).', type: 'warning' });
        return;
      }

      this._fotoArquivo = file;
      this._fotoBase64 = null;
      this._removerImagem = false;

      const url = URL.createObjectURL(file);
      imgPreview.src = url;
      wrapPreview.classList.remove('hidden');
      btnRemover.classList.remove('hidden');
      lblStatus.textContent = `Arquivo selecionado: ${file.name}`;
    });

    btnRemover?.addEventListener('click', () => {
      this._fotoArquivo = null;
      this._fotoBase64 = null;
      this._removerImagem = true;
      wrapPreview.classList.add('hidden');
      btnRemover.classList.add('hidden');
      imgPreview.src = '';
      if (inputArquivo) inputArquivo.value = '';
    });

    btnWebcam?.addEventListener('click', () => {
      const modalCam = container.querySelector('#equip-modal-camera');
      this._iniciarCamera(modalCam);
    });
  },

  async _iniciarCamera(modalCam) {
    if (!modalCam) return;
    modalCam.classList.remove('hidden');

    const video = modalCam.querySelector('#equip-camera-video');
    const loading = modalCam.querySelector('#equip-camera-loading');
    if (loading) loading.style.display = 'block';

    try {
      if (this._streamCamera) {
        this._streamCamera.getTracks().forEach(t => t.stop());
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
      console.error('[WEBCAM] Falha ao acessar câmera:', err);
      if (loading) loading.style.display = 'none';
      window.UI.toast({ title: 'Câmera Indisponível', message: 'Não foi possível acessar a câmera do dispositivo.', type: 'warning' });
      this._fecharCamera(modalCam);
    }
  },

  _fecharCamera(modalCam) {
    if (this._streamCamera) {
      this._streamCamera.getTracks().forEach(t => t.stop());
      this._streamCamera = null;
    }
    if (modalCam) modalCam.classList.add('hidden');
  },

  _alternarCamera(modalCam) {
    this._facingMode = this._facingMode === 'user' ? 'environment' : 'user';
    this._iniciarCamera(modalCam);
  },

  _capturarFoto(modalCam) {
    const video = modalCam?.querySelector('#equip-camera-video');
    const canvas = modalCam?.querySelector('#equip-camera-canvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.88);
    this._fotoBase64 = base64;
    this._fotoArquivo = null;
    this._removerImagem = false;

    // Atualiza preview no modal de edição
    const wrapPreview = document.getElementById('wrap-equip-preview');
    const imgPreview = document.getElementById('img-equip-preview');
    const lblStatus = document.getElementById('lbl-equip-status-foto');
    const btnRemover = document.getElementById('btn-remover-foto-equip');

    if (imgPreview) imgPreview.src = base64;
    if (wrapPreview) wrapPreview.classList.remove('hidden');
    if (btnRemover) btnRemover.classList.remove('hidden');
    if (lblStatus) lblStatus.textContent = 'Foto capturada via câmera ao vivo';

    this._fecharCamera(modalCam);
    window.UI.toast({ title: 'Foto Capturada', message: 'A imagem foi anexada ao equipamento com sucesso.' });
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
  }
};
