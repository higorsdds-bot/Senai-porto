/**
 * HUB ES+ - Módulo 9: Gestão de Ocorrências Técnicas (Chamados)
 * Otimizado com carregamento sob demanda (Lazy Loading) de blocos do formulário,
 * busca com debounce, paginação leve de cards e modal de detalhes refinado com alta legibilidade.
 */

window.OcorrenciasModule = {
  _fotoSelecionada: null,
  _fotoBase64: null,
  _fotoPreviewUrl: null,
  _anexoSelecionado: null,
  _streamCamera: null,
  _facingMode: 'environment',
  _equipamentosCarregados: false,
  _buscaTimer: null,
  _paginaAtual: 1,
  _itensPorPagina: 9,
  _itensFiltrados: [],

  async render(container) {
    this._equipamentosCarregados = false;
    this._paginaAtual = 1;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- CABEÇALHO -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 tracking-wide uppercase">
                Suporte & Manutenção
              </span>
            </div>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Ocorrências Técnicas</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Registre e acompanhe chamados e problemas operacionais com fotos e pareceres técnicos.</p>
          </div>
          <button id="btn-nova-ocorrencia" class="btn-primary">
            <i data-lucide="plus" class="w-4 h-4"></i> Abrir Ocorrência
          </button>
        </div>

        <!-- FILTROS E BUSCA OTIMIZADA -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div class="relative flex-1 max-w-lg">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input id="oc-busca" type="text" placeholder="Buscar por local, descrição, categoria ou número..."
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all">
          </div>
          <div class="flex items-center gap-2">
            <select id="oc-filtro-status" class="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20">
              <option value="">Todos os status</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="resolvido">Resolvido</option>
            </select>
          </div>
        </div>

        <!-- FORMULÁRIO DE REGISTRO MODULAR COM CARREGAMENTO SOB DEMANDA (LAZY BLOCKS) -->
        <div id="oc-form-wrap" class="hidden bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 sm:p-7 transition-all">
          <div class="flex items-center justify-between pb-3 mb-5 border-b border-slate-100 dark:border-slate-700/80">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-5 h-5 text-blue-600"></i> Registrar Nova Ocorrência
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Preencha os dados do chamado. Blocos opcionais podem ser expandidos conforme a necessidade.</p>
            </div>
            <button type="button" id="oc-btn-fechar-form" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="form-ocorrencia" class="space-y-4" novalidate>
            <!-- BLOCO 1: DADOS BÁSICOS (OBRIGATÓRIO / PRINCIPAL) -->
            <div class="bg-slate-50/80 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-4">
              <div class="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                Dados Essenciais do Chamado
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Local / Ambiente afetado *</label>
                  <input name="local" required minlength="3"
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    placeholder="Ex: Sala 203, Estúdio de Áudio, Corredor B...">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipo / Categoria</label>
                  <input name="tipo"
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    placeholder="Ex: Elétrica, Hidráulica, TI, Ar-condicionado...">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nível Inicial de Suporte</label>
                  <select name="nivel_atendimento"
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30">
                    <option value="N1" selected>N1 • Helpdesk / Atendimento Básico Operacional</option>
                    <option value="N2">N2 • Hardware / Redes / Manutenção Técnica</option>
                    <option value="N3">N3 • Servidores / Infraestrutura Crítica e Engenharia</option>
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Descrição Detalhada do Problema *</label>
                  <textarea name="descricao" rows="3" required
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    placeholder="Descreva a ocorrência observada com detalhes para orientar o diagnóstico da equipe técnica..."></textarea>
                </div>
              </div>
            </div>

            <!-- BLOCO 2: EQUIPAMENTO RELACIONADO (CARREGAMENTO SOB DEMANDA - LAZY LOAD) -->
            <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
              <button type="button" id="oc-btn-toggle-equipamento"
                class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">2</span>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Vincular Equipamento / Patrimônio</span>
                  <span class="text-[10px] font-semibold text-slate-400">(Opcional • Carregamento sob demanda)</span>
                </div>
                <i data-lucide="chevron-down" id="oc-icon-toggle-equip" class="w-4 h-4 text-slate-400 transition-transform"></i>
              </button>

              <div id="oc-bloco-equipamento" class="hidden p-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Selecione o Equipamento Afetado</label>
                <div id="oc-equip-loading" class="text-xs text-slate-400 py-1 hidden flex items-center gap-2">
                  <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-blue-600"></i> Carregando inventário de equipamentos...
                </div>
                <select name="equipamento_id" id="oc-select-equipamento"
                  class="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/30">
                  <option value="">Nenhum equipamento vinculado</option>
                </select>
                <p class="text-[11px] text-slate-400 mt-1.5">Ao vincular, o status do equipamento será sinalizado para a equipe de infraestrutura.</p>
              </div>
            </div>

            <!-- BLOCO 3: EVIDÊNCIA FOTOGRÁFICA (EXPANSÍVEL) -->
            <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
              <button type="button" id="oc-btn-toggle-foto"
                class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">3</span>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Evidência Fotográfica (Câmera / Imagem)</span>
                  <span class="text-[10px] font-semibold text-slate-400">(Opcional)</span>
                </div>
                <i data-lucide="chevron-down" id="oc-icon-toggle-foto" class="w-4 h-4 text-slate-400 transition-transform"></i>
              </button>

              <div id="oc-bloco-foto" class="hidden p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p class="text-[11px] text-slate-400">Tire uma foto ao vivo usando a câmera do computador ou celular, ou anexe um arquivo JPG/PNG.</p>
                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" id="oc-btn-abrir-camera"
                    class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm">
                    <i data-lucide="video" class="w-3.5 h-3.5"></i> Abrir Câmera ao Vivo
                  </button>

                  <label class="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                    <i data-lucide="camera" class="w-3.5 h-3.5 text-blue-600"></i> Câmera do Celular
                    <input id="oc-foto-captura" type="file" accept="image/*" capture="environment" class="hidden">
                  </label>

                  <label class="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                    <i data-lucide="image" class="w-3.5 h-3.5 text-indigo-500"></i> Selecionar Arquivo
                    <input id="oc-foto-arquivo" type="file" accept="image/*" class="hidden">
                  </label>

                  <div id="oc-foto-preview-wrap" class="hidden flex items-center gap-2 ml-2">
                    <img id="oc-foto-preview" class="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="Prévia">
                    <button type="button" id="oc-foto-remover" class="text-xs font-bold text-rose-600 hover:text-rose-700 p-1">
                      Remover Foto
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- BLOCO 4: DOCUMENTOS E ANEXOS TÉCNICOS (EXPANSÍVEL) -->
            <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
              <button type="button" id="oc-btn-toggle-anexo"
                class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">4</span>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Anexar Documentos ou Arquivos Técnicos</span>
                  <span class="text-[10px] font-semibold text-slate-400">(Opcional)</span>
                </div>
                <i data-lucide="chevron-down" id="oc-icon-toggle-anexo" class="w-4 h-4 text-slate-400 transition-transform"></i>
              </button>

              <div id="oc-bloco-anexo" class="hidden p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p class="text-[11px] text-slate-400">Adicione relatórios, laudos, ordens de serviço ou planilhas (PDF, DOCX, XLSX, TXT - até 20MB).</p>
                <div class="flex flex-wrap items-center gap-3">
                  <label class="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                    <i data-lucide="upload" class="w-3.5 h-3.5 text-slate-500"></i> Selecionar Arquivo
                    <input id="oc-anexo-arquivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,image/*" class="hidden">
                  </label>

                  <div id="oc-anexo-preview-wrap" class="hidden flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i>
                    <span id="oc-anexo-nome" class="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[200px] truncate">arquivo.pdf</span>
                    <span id="oc-anexo-tamanho" class="text-[10px] text-slate-400"></span>
                    <button type="button" id="oc-anexo-remover" class="text-slate-400 hover:text-rose-600 ml-1">
                      <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOTÕES DE SUBMIT -->
            <div class="flex items-center gap-3 pt-3">
              <button type="submit" id="oc-btn-salvar" class="btn-primary">
                Salvar e Abrir Chamado
              </button>
              <button type="button" id="oc-btn-cancelar" class="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <!-- LISTA DE OCORRÊNCIAS EM GRID -->
        <div id="oc-lista" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>

        <!-- PAGINAÇÃO LEVE -->
        <div id="oc-paginacao" class="hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 shadow-sm">
          <span id="oc-paginacao-info">Exibindo 0 de 0 ocorrências</span>
          <div class="flex items-center gap-2">
            <button id="oc-btn-anterior" class="btn-secondary px-3 py-1 text-xs">Anterior</button>
            <span id="oc-paginacao-pagina" class="font-bold text-slate-700 dark:text-slate-300">1 / 1</span>
            <button id="oc-btn-proxima" class="btn-secondary px-3 py-1 text-xs">Próxima</button>
          </div>
        </div>
      </div>

      <!-- MODAL DE DETALHES COMPLETOS DA OCORRÊNCIA (REFINADO COM ALTA LEGIBILIDADE) -->
      <div id="modal-detalhes-ocorrencia" class="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm hidden flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div id="conteudo-detalhes-ocorrencia" class="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-slate-800 my-8 max-h-[90vh] overflow-y-auto">
          <!-- Preenchido dinamicamente -->
        </div>
      </div>
    `;

    this._bind(container);
    await this._carregar(container);
    if (window.lucide) lucide.createIcons();
  },

  _ensureCameraModal() {
    let modal = document.getElementById('oc-modal-camera-global');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'oc-modal-camera-global';
      modal.className = 'fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md hidden flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="camera" class="w-4 h-4 text-blue-600"></i> Capturar Foto da Ocorrência
            </h4>
            <button type="button" id="oc-global-btn-fechar-camera" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
            <video id="oc-global-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <canvas id="oc-global-canvas" class="hidden"></canvas>
            <div id="oc-global-camera-loading" class="absolute text-xs text-white flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
              <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Conectando à câmera...
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <button type="button" id="oc-global-btn-inverter-camera" class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Alternar Câmera
            </button>
            <button type="button" id="oc-global-btn-disparar-foto"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer">
              <i data-lucide="camera" class="w-4 h-4"></i> Capturar Fotografia
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#oc-global-btn-fechar-camera')?.addEventListener('click', () => this._fecharCameraGlobal());
      modal.querySelector('#oc-global-btn-inverter-camera')?.addEventListener('click', () => {
        this._facingMode = this._facingMode === 'user' ? 'environment' : 'user';
        this._abrirCameraGlobal();
      });
      modal.querySelector('#oc-global-btn-disparar-foto')?.addEventListener('click', () => this._capturarFotoGlobal());
    }
    return modal;
  },

  async _abrirCameraGlobal() {
    const modal = this._ensureCameraModal();
    modal.classList.remove('hidden');

    const video = modal.querySelector('#oc-global-video');
    const loading = modal.querySelector('#oc-global-camera-loading');
    if (loading) loading.style.display = 'flex';
    if (window.lucide) lucide.createIcons({ root: modal });

    try {
      if (this._streamCamera) {
        this._streamCamera.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sem suporte direto à webcam.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      this._streamCamera = stream;
      video.srcObject = stream;
      await video.play();
      if (loading) loading.style.display = 'none';
    } catch (err) {
      if (loading) loading.style.display = 'none';
      let msg = 'Não foi possível acessar a câmera do computador.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera negada. Ative a permissão ou utilize a seleção de imagem.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Nenhuma câmera detectada neste computador.';
      }
      if (window.UI?.toast) {
        window.UI.toast({ title: 'Aviso da Câmera', message: msg, type: 'warning' });
      }
      this._fecharCameraGlobal();
    }
  },

  _fecharCameraGlobal() {
    if (this._streamCamera) {
      this._streamCamera.getTracks().forEach(t => t.stop());
      this._streamCamera = null;
    }
    const modal = document.getElementById('oc-modal-camera-global');
    if (modal) modal.classList.add('hidden');
  },

  _capturarFotoGlobal() {
    const modal = document.getElementById('oc-modal-camera-global');
    const video = modal?.querySelector('#oc-global-video');
    const canvas = modal?.querySelector('#oc-global-canvas');
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    this._fotoBase64 = dataUrl;
    this._fotoSelecionada = null;

    const wrap = document.getElementById('oc-foto-preview-wrap');
    const img = document.getElementById('oc-foto-preview');
    if (img) img.src = dataUrl;
    if (wrap) wrap.classList.remove('hidden');

    this._fecharCameraGlobal();
    if (window.UI?.toast) {
      window.UI.toast({ title: 'Foto Capturada', message: 'Evidência fotográfica vinculada ao chamado.', type: 'success' });
    }
  },

  _bind(container) {
    const formWrap = container.querySelector('#oc-form-wrap');
    const btnNova = container.querySelector('#btn-nova-ocorrencia');
    const btnFechar = container.querySelector('#oc-btn-fechar-form');
    const btnCanc = container.querySelector('#oc-btn-cancelar');

    const toggleForm = () => {
      formWrap.classList.toggle('hidden');
      if (!formWrap.classList.contains('hidden')) {
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (btnNova) btnNova.addEventListener('click', toggleForm);
    if (btnFechar) btnFechar.addEventListener('click', () => { this._limparTudo(); formWrap.classList.add('hidden'); });
    if (btnCanc) btnCanc.addEventListener('click', () => { this._limparTudo(); formWrap.classList.add('hidden'); });

    // Accordions / Blocos Expansíveis com Carregamento sob Demanda (Lazy Loading)
    const btnEquip = container.querySelector('#oc-btn-toggle-equipamento');
    const blocoEquip = container.querySelector('#oc-bloco-equipamento');
    const iconEquip = container.querySelector('#oc-icon-toggle-equip');

    btnEquip?.addEventListener('click', async () => {
      blocoEquip.classList.toggle('hidden');
      iconEquip.classList.toggle('rotate-180', !blocoEquip.classList.contains('hidden'));
      if (!blocoEquip.classList.contains('hidden') && !this._equipamentosCarregados) {
        await this._carregarEquipamentos(container);
      }
    });

    const btnFoto = container.querySelector('#oc-btn-toggle-foto');
    const blocoFoto = container.querySelector('#oc-bloco-foto');
    const iconFoto = container.querySelector('#oc-icon-toggle-foto');
    btnFoto?.addEventListener('click', () => {
      blocoFoto.classList.toggle('hidden');
      iconFoto.classList.toggle('rotate-180', !blocoFoto.classList.contains('hidden'));
    });

    const btnAnexo = container.querySelector('#oc-btn-toggle-anexo');
    const blocoAnexo = container.querySelector('#oc-bloco-anexo');
    const iconAnexo = container.querySelector('#oc-icon-toggle-anexo');
    btnAnexo?.addEventListener('click', () => {
      blocoAnexo.classList.toggle('hidden');
      iconAnexo.classList.toggle('rotate-180', !blocoAnexo.classList.contains('hidden'));
    });

    // Busca com Debounce (evita processamento desnecessário a cada tecla)
    const inputBusca = container.querySelector('#oc-busca');
    inputBusca?.addEventListener('input', () => {
      clearTimeout(this._buscaTimer);
      this._buscaTimer = setTimeout(() => {
        this._paginaAtual = 1;
        this._carregar(container);
      }, 250);
    });

    container.querySelector('#oc-filtro-status')?.addEventListener('change', () => {
      this._paginaAtual = 1;
      this._carregar(container);
    });

    // Paginação
    container.querySelector('#oc-btn-anterior')?.addEventListener('click', () => {
      if (this._paginaAtual > 1) {
        this._paginaAtual--;
        this._renderCards(container);
      }
    });

    container.querySelector('#oc-btn-proxima')?.addEventListener('click', () => {
      const maxPag = Math.ceil(this._itensFiltrados.length / this._itensPorPagina) || 1;
      if (this._paginaAtual < maxPag) {
        this._paginaAtual++;
        this._renderCards(container);
      }
    });

    // Upload de Imagem (Arquivo comum ou captura nativa)
    const handleFileFoto = (input) => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          if (window.UI?.toast) {
            window.UI.toast({ title: 'Formato Inválido', message: 'Selecione JPG, PNG ou WebP.', type: 'warning' });
          }
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          if (window.UI?.toast) {
            window.UI.toast({ title: 'Arquivo Grande', message: 'Tamanho máximo: 10MB.', type: 'warning' });
          }
          return;
        }

        this._fotoSelecionada = file;
        this._fotoBase64 = null;
        if (this._fotoPreviewUrl) URL.revokeObjectURL(this._fotoPreviewUrl);
        this._fotoPreviewUrl = URL.createObjectURL(file);

        const wrap = container.querySelector('#oc-foto-preview-wrap');
        const img = container.querySelector('#oc-foto-preview');
        img.src = this._fotoPreviewUrl;
        wrap.classList.remove('hidden');
      });
    };

    const inputCaptura = container.querySelector('#oc-foto-captura');
    const inputArquivo = container.querySelector('#oc-foto-arquivo');
    if (inputCaptura) handleFileFoto(inputCaptura);
    if (inputArquivo) handleFileFoto(inputArquivo);

    container.querySelector('#oc-foto-remover')?.addEventListener('click', () => this._limparFoto());

    // Upload de Arquivo / Anexo (PDF, Documentos)
    const inputAnexo = container.querySelector('#oc-anexo-arquivo');
    if (inputAnexo) {
      inputAnexo.addEventListener('change', () => {
        const file = inputAnexo.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
          if (window.UI?.toast) {
            window.UI.toast({ title: 'Arquivo Grande', message: 'Tamanho máximo: 20MB.', type: 'warning' });
          }
          return;
        }

        this._anexoSelecionado = file;
        const wrap = container.querySelector('#oc-anexo-preview-wrap');
        const nomeEl = container.querySelector('#oc-anexo-nome');
        const tamEl = container.querySelector('#oc-anexo-tamanho');

        nomeEl.textContent = file.name;
        tamEl.textContent = `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        wrap.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      });
    }

    container.querySelector('#oc-anexo-remover')?.addEventListener('click', () => this._limparAnexo());

    // Câmera ao vivo global
    container.querySelector('#oc-btn-abrir-camera')?.addEventListener('click', () => this._abrirCameraGlobal());

    // Envio do formulário
    const form = container.querySelector('#form-ocorrencia');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = container.querySelector('#oc-btn-salvar');
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Gravando ocorrência...';

        try {
          const localVal = form.local.value.trim();
          const tipoVal = form.tipo.value.trim();
          const descVal = form.descricao.value.trim();

          if (!localVal || localVal.length < 3) {
            throw new Error('Informe o local com pelo menos 3 caracteres.');
          }
          if (!descVal || descVal.length < 5) {
            throw new Error('Descreva a ocorrência detalhadamente.');
          }

          const fd = new FormData();
          fd.append('local', localVal);
          fd.append('tipo', tipoVal);
          fd.append('descricao', descVal);

          if (form.equipamento_id?.value) {
            fd.append('equipamento_id', form.equipamento_id.value);
          }
          if (form.nivel_atendimento?.value) {
            fd.append('nivel_atendimento', form.nivel_atendimento.value);
          }

          if (this._fotoSelecionada) {
            fd.append('foto', this._fotoSelecionada);
          } else if (this._fotoBase64) {
            fd.append('foto_base64', this._fotoBase64);
          }

          if (this._anexoSelecionado) {
            fd.append('anexo', this._anexoSelecionado);
          }

          await window.API.createOcorrencia(fd);

          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Chamado Aberto!',
              message: 'Ocorrência registrada com sucesso.',
              type: 'success'
            });
          }

          form.reset();
          this._limparTudo();
          formWrap.classList.add('hidden');
          await this._carregar(container);
        } catch (err) {
          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Falha ao Salvar',
              message: err.message || 'Erro ao registrar ocorrência.',
              type: 'error'
            });
          }
        } finally {
          btnSalvar.disabled = false;
          btnSalvar.textContent = 'Salvar e Abrir Chamado';
        }
      });
    }
  },

  _limparFoto() {
    this._fotoSelecionada = null;
    this._fotoBase64 = null;
    if (this._fotoPreviewUrl) {
      URL.revokeObjectURL(this._fotoPreviewUrl);
      this._fotoPreviewUrl = null;
    }
    const wrap = document.getElementById('oc-foto-preview-wrap');
    if (wrap) wrap.classList.add('hidden');
    const cap = document.getElementById('oc-foto-captura');
    if (cap) cap.value = '';
    const arq = document.getElementById('oc-foto-arquivo');
    if (arq) arq.value = '';
  },

  _limparAnexo() {
    this._anexoSelecionado = null;
    const wrap = document.getElementById('oc-anexo-preview-wrap');
    if (wrap) wrap.classList.add('hidden');
    const arq = document.getElementById('oc-anexo-arquivo');
    if (arq) arq.value = '';
  },

  _limparTudo() {
    this._limparFoto();
    this._limparAnexo();
  },

  _statusBadge(status) {
    if (window.UI?.renderBadge) {
      return window.UI.renderBadge(status);
    }
    const label = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido' }[status] || status;
    const cls = {
      aberto: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      em_andamento: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    }[status] || 'bg-slate-50 text-slate-700 border-slate-200';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wide ${cls}">${label}</span>`;
  },

  _nivelBadge(nivel) {
    const n = String(nivel || 'N1').toUpperCase();
    if (n === 'N3') {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">N3 • Infra Crítica</span>`;
    }
    if (n === 'N2') {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">N2 • Hardware/Rede</span>`;
    }
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">N1 • Helpdesk</span>`;
  },

  async _carregarEquipamentos(container) {
    const sel = container.querySelector('#oc-select-equipamento');
    const loading = container.querySelector('#oc-equip-loading');
    if (!sel || (window.Auth && !window.Auth.hasPermission('equipamentos.visualizar'))) return;

    if (loading) loading.classList.remove('hidden');
    try {
      const res = await window.API.getEquipamentos();
      const lista = Array.isArray(res) ? res : (res?.data || []);
      sel.innerHTML = '<option value="">Nenhum equipamento vinculado</option>' +
        lista.map(eq => `<option value="${eq.id}">${this._esc(eq.nome)} (${this._esc(eq.patrimonio || eq.codigo || 'S/N')})</option>`).join('');
      this._equipamentosCarregados = true;
    } catch (_) {
      sel.innerHTML = '<option value="">Nenhum equipamento vinculado</option>';
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  },

  async _carregar(container) {
    const lista = container.querySelector('#oc-lista');
    const q = container.querySelector('#oc-busca')?.value.trim() || '';
    const status = container.querySelector('#oc-filtro-status')?.value || '';

    lista.innerHTML = '<div class="col-span-full py-12 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin text-blue-600"></i> Carregando ocorrências...</div>';
    if (window.lucide) lucide.createIcons({ root: lista });

    try {
      const res = await window.API.getOcorrencias({ q, status });
      const itens = Array.isArray(res) ? res : (res?.data || []);
      this._itensFiltrados = itens;
      this._renderCards(container);
    } catch (err) {
      lista.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-4">
          ${this._esc(err.message || 'Erro ao carregar lista de ocorrências.')}
        </div>`;
    }
  },

  _renderCards(container) {
    const lista = container.querySelector('#oc-lista');
    const wrapPaginacao = container.querySelector('#oc-paginacao');
    const infoPaginacao = container.querySelector('#oc-paginacao-info');
    const paginaEl = container.querySelector('#oc-paginacao-pagina');
    const btnAnt = container.querySelector('#oc-btn-anterior');
    const btnProx = container.querySelector('#oc-btn-proxima');

    const total = this._itensFiltrados.length;
    if (!total) {
      lista.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <i data-lucide="check-circle" class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2"></i>
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">Nenhuma ocorrência encontrada</h4>
          <p class="text-xs text-slate-400 mt-1">Nenhum chamado corresponde aos filtros aplicados.</p>
        </div>`;
      if (wrapPaginacao) wrapPaginacao.classList.add('hidden');
      if (window.lucide) lucide.createIcons({ root: lista });
      return;
    }

    const totalPaginas = Math.ceil(total / this._itensPorPagina) || 1;
    if (this._paginaAtual > totalPaginas) this._paginaAtual = totalPaginas;
    const inicio = (this._paginaAtual - 1) * this._itensPorPagina;
    const paginados = this._itensFiltrados.slice(inicio, inicio + this._itensPorPagina);

    lista.innerHTML = paginados.map(o => `
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all group">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-mono text-slate-400 font-bold">#OC-${o.id}</span>
                ${this._nivelBadge(o.nivel_atendimento)}
                ${o.tipo ? `<span class="inline-block text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">${this._esc(o.tipo)}</span>` : ''}
              </div>
              <h4 class="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight mt-1.5">${this._esc(o.local)}</h4>
              ${o.equipamento_nome ? `
                <div class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md mt-1">
                  <i data-lucide="cpu" class="w-3 h-3 text-slate-400"></i> ${this._esc(o.equipamento_nome)} ${o.equipamento_codigo ? `(${this._esc(o.equipamento_codigo)})` : ''}
                </div>` : ''}
            </div>
            ${this._statusBadge(o.status)}
          </div>

          <!-- EVIDÊNCIA FOTOGRÁFICA -->
          ${o.foto_url ? `
            <div class="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group/img bg-slate-900">
              <img src="${this._esc(this._url(o.foto_url))}" alt="Evidência Fotográfica" class="w-full h-36 object-cover group-hover/img:scale-105 transition-transform duration-300">
              <div onclick="OcorrenciasModule.abrirDetalhes(${o.id})" class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer">
                <i data-lucide="zoom-in" class="w-4 h-4 mr-1"></i> Ver Detalhes
              </div>
            </div>` : ''}

          <!-- DESCRIÇÃO -->
          ${o.descricao ? `<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">${this._esc(o.descricao)}</p>` : ''}

          <!-- ANEXO/DOCUMENTO -->
          ${o.anexo_url ? `
            <a href="${this._esc(this._url(o.anexo_url))}" target="_blank" rel="noopener"
              class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
              <i data-lucide="file-text" class="w-4 h-4 text-emerald-600 shrink-0"></i>
              <span class="truncate flex-1">${this._esc(o.anexo_nome || 'Arquivo Anexo')}</span>
              <i data-lucide="download" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
            </a>` : ''}
        </div>

        <!-- RODAPÉ DO CARD -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            <span class="font-medium">${o.usuario_nome ? this._esc(o.usuario_nome) : 'Colaborador'}</span>
            <span class="block text-[10px] text-slate-400 font-mono">${o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : ''}</span>
          </div>
          <button type="button" onclick="OcorrenciasModule.abrirDetalhes(${o.id})"
            class="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer">
            Detalhes <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>`).join('');

    if (wrapPaginacao) {
      wrapPaginacao.classList.toggle('hidden', total <= this._itensPorPagina);
      if (infoPaginacao) infoPaginacao.textContent = `Exibindo ${inicio + 1} - ${Math.min(inicio + this._itensPorPagina, total)} de ${total} chamado(s)`;
      if (paginaEl) paginaEl.textContent = `${this._paginaAtual} / ${totalPaginas}`;
      if (btnAnt) btnAnt.disabled = this._paginaAtual <= 1;
      if (btnProx) btnProx.disabled = this._paginaAtual >= totalPaginas;
    }

    if (window.lucide) lucide.createIcons({ root: container });
  },

  // ─── REFINAMENTO VISUAL DO MODAL DE DETALHES DAS OCORRÊNCIAS ───────────────
  async abrirDetalhes(id) {
    const modal = document.getElementById('modal-detalhes-ocorrencia');
    const conteudo = document.getElementById('conteudo-detalhes-ocorrencia');
    if (!modal || !conteudo) return;

    modal.classList.remove('hidden');
    conteudo.innerHTML = `
      <div class="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-blue-600"></i>
        <span>Carregando dossiê da ocorrência #${id}...</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: conteudo });

    try {
      const res = await window.API.request(`/ocorrencias/${id}`);
      const o = res?.data || res;

      const canAtender = window.Auth?.hasPermission('ocorrencias.atender') || window.Auth?.isAdmin();
      const canEscalonar = window.Auth?.hasPermission('ocorrencias.escalonar') || window.Auth?.isAdmin();
      const canMudarStatus = window.Auth?.hasAnyPermission(['ocorrencias.editar', 'ocorrencias.atender', 'ocorrencias.fechar']) || window.Auth?.isAdmin();

      conteudo.innerHTML = `
        <div class="space-y-6">
          <!-- CABEÇALHO COM IDENTIFICAÇÃO E STATUS -->
          <div class="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div class="flex items-center gap-2 flex-wrap mb-1.5">
                <span class="text-xs font-mono font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  #OC-${o.id}
                </span>
                ${this._nivelBadge(o.nivel_atendimento)}
                ${this._statusBadge(o.status)}
              </div>
              <h3 class="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                ${this._esc(o.local)}
              </h3>
            </div>
            <button type="button" onclick="document.getElementById('modal-detalhes-ocorrencia').classList.add('hidden')"
              class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- GRID DE INFORMAÇÕES CHAVE (ALTA LEGIBILIDADE E CONTRASTE) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Categoria</span>
              <span class="font-extrabold text-slate-900 dark:text-slate-100 block truncate mt-1 text-xs">
                ${this._esc(o.tipo || 'Geral')}
              </span>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Equipamento</span>
              <span class="font-extrabold text-slate-900 dark:text-slate-100 block truncate mt-1 text-xs" title="${this._esc(o.equipamento_nome || '')}">
                ${o.equipamento_nome ? this._esc(o.equipamento_nome) : 'Não vinculado'}
              </span>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Responsável Técnico</span>
              <span class="font-extrabold text-slate-900 dark:text-slate-100 block truncate mt-1 text-xs">
                ${this._esc(o.responsavel_nome || 'Aguardando atribuição')}
              </span>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Data de Abertura</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 block truncate mt-1 text-xs">
                ${o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : 'N/A'}
              </span>
            </div>
          </div>

          <!-- AÇÕES OPERACIONAIS TÉCNICAS (SE PERMITIDO) -->
          ${(canAtender || canEscalonar) ? `
            <div class="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-blue-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div class="flex items-center gap-2">
                <i data-lucide="shield-check" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Ações de Governança Técnica:</span>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                ${canAtender ? `
                  <button type="button" onclick="OcorrenciasModule.assumirChamado(${o.id})"
                    class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                    <i data-lucide="user-check" class="w-3.5 h-3.5"></i> Assumir Atendimento
                  </button>
                ` : ''}
                ${canEscalonar ? `
                  <button type="button" onclick="OcorrenciasModule.abrirModalEscalonar(${o.id}, '${o.nivel_atendimento || 'N1'}')"
                    class="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> Escalonar Suporte
                  </button>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- DESCRIÇÃO DO PROBLEMA -->
          <div>
            <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i data-lucide="align-left" class="w-3.5 h-3.5 text-blue-600"></i> Descrição do Problema
            </h4>
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              ${this._esc(o.descricao || 'Sem descrição adicional.')}
            </div>
          </div>

          <!-- PARECER TÉCNICO & DIAGNÓSTICO -->
          ${o.parecer_tecnico ? `
            <div>
              <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i data-lucide="wrench" class="w-3.5 h-3.5 text-blue-600"></i> Parecer Técnico & Diagnóstico
              </h4>
              <div class="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 text-xs text-blue-950 dark:text-blue-200 leading-relaxed whitespace-pre-wrap font-mono">
                ${this._esc(o.parecer_tecnico)}
              </div>
            </div>` : ''}

          <!-- EVIDÊNCIA FOTOGRÁFICA -->
          ${o.foto_url ? `
            <div>
              <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-blue-600"></i> Evidência Fotográfica Anexada
              </h4>
              <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-sm">
                <img src="${this._esc(this._url(o.foto_url))}" alt="Evidência da ocorrência" class="w-full max-h-80 object-contain mx-auto">
                <div class="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <a href="${this._esc(this._url(o.foto_url))}" target="_blank" rel="noopener"
                    class="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Abrir Imagem em Alta Resolução
                  </a>
                </div>
              </div>
            </div>` : ''}

          <!-- DOCUMENTO/ANEXO -->
          ${o.anexo_url ? `
            <div>
              <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i data-lucide="paperclip" class="w-3.5 h-3.5 text-emerald-600"></i> Anexos & Laudos Vinculados
              </h4>
              <a href="${this._esc(this._url(o.anexo_url))}" target="_blank" rel="noopener"
                class="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 border border-emerald-200 dark:border-emerald-800 rounded-2xl transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                    <i data-lucide="file-text" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">${this._esc(o.anexo_nome || 'Arquivo Técnico')}</span>
                    <span class="text-[10px] text-emerald-700 dark:text-emerald-400">Clique para visualizar ou baixar o documento</span>
                  </div>
                </div>
                <i data-lucide="download" class="w-4 h-4 text-emerald-700 dark:text-emerald-400"></i>
              </a>
            </div>` : ''}

          <!-- ALTERAR STATUS DA OCORRÊNCIA -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="${canMudarStatus ? 'text-xs font-bold text-slate-600 dark:text-slate-400' : 'hidden'}">Status do Chamado:</span>
              <select id="sel-mudar-status-${o.id}" class="${canMudarStatus ? 'text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2' : 'hidden'}">
                <option value="aberto" ${o.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                <option value="em_andamento" ${o.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="resolvido" ${o.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
              </select>
              <button type="button" onclick="OcorrenciasModule.atualizarStatus(${o.id})"
                class="${canMudarStatus ? 'btn-primary py-2 px-3 text-xs' : 'hidden'}">
                Salvar Status
              </button>
            </div>
            <button type="button" onclick="document.getElementById('modal-detalhes-ocorrencia').classList.add('hidden')"
              class="btn-secondary py-2 px-5 text-xs">
              Fechar Janela
            </button>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons({ root: conteudo });
    } catch (err) {
      conteudo.innerHTML = `
        <div class="py-8 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-4">
          ${this._esc(err.message || 'Erro ao carregar detalhes da ocorrência.')}
        </div>`;
    }
  },

  async assumirChamado(id) {
    try {
      await window.API.assumirOcorrencia(id);
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Chamado Atribuído',
          message: 'Você assumiu o atendimento deste chamado com sucesso!',
          type: 'success'
        });
      }
      await this.abrirDetalhes(id);
      const container = document.getElementById('main-content');
      if (container) await this._carregar(container);
    } catch (err) {
      if (window.UI?.toast) {
        window.UI.toast({ title: 'Erro', message: err.message || 'Não foi possível assumir o chamado.', type: 'error' });
      }
    }
  },

  abrirModalEscalonar(id, nivelAtual) {
    const modalHtml = `
      <div class="space-y-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Selecione o novo nível de especialização para transferência do chamado.
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Novo Nível</label>
          <select id="modal-sel-escalonar" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold">
            <option value="N1" ${nivelAtual === 'N1' ? 'selected' : ''}>N1 • Helpdesk / Atendimento Básico</option>
            <option value="N2" ${nivelAtual === 'N2' ? 'selected' : ''}>N2 • Hardware / Redes / Manutenção</option>
            <option value="N3" ${nivelAtual === 'N3' ? 'selected' : ''}>N3 • Servidores / Infraestrutura Crítica</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parecer de Escalonamento</label>
          <textarea id="modal-motivo-escalonar" rows="3"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            placeholder="Descreva o motivo da transferência e informações de diagnóstico..."></textarea>
        </div>
      </div>
    `;

    window.UI.openModal({
      title: 'Escalonar Suporte Técnico',
      subtitle: `Ocorrência #OC-${id}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar Escalonamento',
      onSave: async () => {
        const nivel = document.getElementById('modal-sel-escalonar')?.value;
        const motivo = document.getElementById('modal-motivo-escalonar')?.value?.trim();
        if (!motivo) {
          if (window.UI?.toast) window.UI.toast({ title: 'Aviso', message: 'Informe o parecer de escalonamento.', type: 'warning' });
          return false;
        }

        try {
          await window.API.escalonarOcorrencia(id, { nivel, motivo });
          if (window.UI?.toast) window.UI.toast({ title: 'Chamado Escalonado', message: `Transferido para o nível ${nivel}.`, type: 'success' });
          await this.abrirDetalhes(id);
          const container = document.getElementById('main-content');
          if (container) await this._carregar(container);
          return true;
        } catch (err) {
          if (window.UI?.toast) window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao escalonar.', type: 'error' });
          return false;
        }
      }
    });
  },

  async atualizarStatus(id) {
    const sel = document.getElementById(`sel-mudar-status-${id}`);
    if (!sel) return;
    const novoStatus = sel.value;

    if (novoStatus === 'resolvido') {
      window.UI.openModal({
        title: 'Concluir e Resolver Ocorrência',
        subtitle: `Ocorrência #OC-${id}`,
        contentHtml: `
          <div class="space-y-3">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Descreva a solução aplicada e diagnóstico final para alimentar a base de conhecimento.
            </p>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parecer Técnico / Solução Final *</label>
              <textarea id="modal-parecer-resolucao" rows="3" required
                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                placeholder="Ex: Substituída fonte de alimentação danificada. Testes de bancada aprovados..."></textarea>
            </div>
          </div>
        `,
        saveLabel: 'Concluir Ocorrência',
        onSave: async () => {
          const parecer = document.getElementById('modal-parecer-resolucao')?.value?.trim();
          if (!parecer) {
            if (window.UI?.toast) window.UI.toast({ title: 'Parecer Obrigatório', message: 'Descreva a solução técnica aplicada.', type: 'warning' });
            return false;
          }

          try {
            await window.API.updateOcorrenciaStatus(id, { status: novoStatus, parecer_tecnico: parecer });
            if (window.UI?.toast) window.UI.toast({ title: 'Chamado Resolvido!', message: 'Ocorrência concluída com sucesso.', type: 'success' });
            await this.abrirDetalhes(id);
            const container = document.getElementById('main-content');
            if (container) await this._carregar(container);
            return true;
          } catch (err) {
            if (window.UI?.toast) window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao resolver.', type: 'error' });
            return false;
          }
        }
      });
      return;
    }

    try {
      await window.API.updateOcorrenciaStatus(id, { status: novoStatus });
      if (window.UI?.toast) window.UI.toast({ title: 'Status Atualizado', message: `Ocorrência atualizada para "${novoStatus}".`, type: 'success' });
      await this.abrirDetalhes(id);
      const container = document.getElementById('main-content');
      if (container) await this._carregar(container);
    } catch (err) {
      if (window.UI?.toast) window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao alterar status.', type: 'error' });
    }
  },

  _url(path) {
    if (!path) return '';
    return window.API?.resolveAssetUrl ? window.API.resolveAssetUrl(path) : path;
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
