/**
 * HUB ES+ - Módulo de Ocorrências Técnicas (ocorrencias.js)
 * Permite registro e consulta de ocorrências com evidência fotográfica (câmera ao vivo / arquivo)
 * e upload de documentos/anexos (PDFs, relatórios técnicos, etc.).
 */

window.Modules = window.Modules || {};

const OcorrenciasModule = {
  _fotoSelecionada: null,
  _fotoPreviewUrl: null,
  _fotoBase64: null,
  _anexoSelecionado: null,
  _streamCamera: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- HEADER DA SEÇÃO -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Ocorrências Técnicas</h2>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">Registre e acompanhe chamados e problemas com fotos e anexos.</p>
          </div>
          <button id="btn-nova-ocorrencia" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i> Nova Ocorrência
          </button>
        </div>

        <!-- FILTROS E BUSCA -->
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="relative flex-1">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input id="oc-busca" type="text" placeholder="Buscar por local, descrição ou tipo..."
              class="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all">
          </div>
          <select id="oc-filtro-status" class="rounded-xl border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30">
            <option value="">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>

        <!-- FORMULÁRIO DE REGISTRO (EXPANSÍVEL) -->
        <div id="oc-form-wrap" class="hidden bg-white rounded-2xl border border-slate-200 shadow-hub-sm p-6 transition-all">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="alert-circle" class="w-4 h-4 text-blue-600"></i> Registrar Nova Ocorrência
            </h3>
            <button type="button" id="oc-btn-fechar-form" class="text-slate-400 hover:text-slate-600 p-1">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="form-ocorrencia" class="grid grid-cols-1 sm:grid-cols-2 gap-4" novalidate>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Local *</label>
              <input name="local" required minlength="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Ex: Sala 203, Estúdio de Áudio, Corredor B...">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Tipo / Categoria</label>
              <input name="tipo"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Ex: Elétrica, Hidráulica, TI, Ar-condicionado...">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Descrição Detalhada do Problema</label>
              <textarea name="descricao" rows="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Descreva a ocorrência observada com detalhes..."></textarea>
            </div>

            <!-- SEÇÃO DE FOTO COM CÂMERA AO VIVO OU ARQUIVO -->
            <div class="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i data-lucide="camera" class="w-4 h-4 text-blue-600"></i> Evidência Fotográfica (Câmera / Imagem)
              </label>
              <p class="text-[11px] text-slate-400 mb-3">Tire uma foto diretamente da câmera do dispositivo ou anexe uma imagem salva.</p>
              
              <div class="flex flex-wrap items-center gap-2">
                <!-- Botão 1: Abrir Câmera ao vivo (Desktop/Mobile) -->
                <button type="button" id="oc-btn-abrir-camera"
                  class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm">
                  <i data-lucide="video" class="w-3.5 h-3.5"></i> Abrir Câmera
                </button>

                <!-- Botão 2: Câmera nativa mobile -->
                <label class="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                  <i data-lucide="camera" class="w-3.5 h-3.5"></i> Tirar Foto (Nativo)
                  <input id="oc-foto-captura" type="file" accept="image/*" capture="environment" class="hidden">
                </label>

                <!-- Botão 3: Escolher arquivo de imagem -->
                <label class="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                  <i data-lucide="image" class="w-3.5 h-3.5"></i> Escolher Arquivo
                  <input id="oc-foto-arquivo" type="file" accept="image/*" class="hidden">
                </label>

                <!-- Preview e botão remover -->
                <div id="oc-foto-preview-wrap" class="hidden flex items-center gap-2 ml-2">
                  <img id="oc-foto-preview" class="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Prévia">
                  <button type="button" id="oc-foto-remover" class="text-xs font-bold text-rose-600 hover:text-rose-700 p-1">
                    Remover Foto
                  </button>
                </div>
              </div>
            </div>

            <!-- SEÇÃO DE ANEXO DE ARQUIVOS (PDFs, DOCUMENTOS) -->
            <div class="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i data-lucide="paperclip" class="w-4 h-4 text-emerald-600"></i> Anexar Documentos ou Arquivos Técnicos
              </label>
              <p class="text-[11px] text-slate-400 mb-3">Adicione laudos, relatórios, manuais ou ordens de serviço (PDF, DOCX, XLSX, TXT, etc.). Máx: 20MB.</p>

              <div class="flex flex-wrap items-center gap-3">
                <label class="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                  <i data-lucide="upload" class="w-3.5 h-3.5 text-slate-500"></i> Selecionar Documento / Arquivo
                  <input id="oc-anexo-arquivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,image/*" class="hidden">
                </label>

                <div id="oc-anexo-preview-wrap" class="hidden flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i>
                  <span id="oc-anexo-nome" class="text-xs font-semibold text-slate-700 max-w-[200px] truncate">arquivo.pdf</span>
                  <span id="oc-anexo-tamanho" class="text-[10px] text-slate-400"></span>
                  <button type="button" id="oc-anexo-remover" class="text-slate-400 hover:text-rose-600 ml-1">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- BOTÕES DE SUBMIT -->
            <div class="sm:col-span-2 flex items-center gap-3 pt-2">
              <button type="submit" id="oc-btn-salvar"
                class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer">
                Salvar Ocorrência
              </button>
              <button type="button" id="oc-btn-cancelar"
                class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <!-- LISTA DE OCORRÊNCIAS EM GRID -->
        <div id="oc-lista" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>

      <!-- MODAL DE CÂMERA AO VIVO (WEBCAM / CÂMERA) -->
      <div id="modal-camera" class="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="camera" class="w-4 h-4 text-blue-600"></i> Capturar Foto com a Câmera
            </h4>
            <button type="button" id="btn-fechar-camera" class="p-1 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            <video id="camera-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <canvas id="camera-canvas" class="hidden"></canvas>
            <div id="camera-loading" class="absolute text-xs text-white flex items-center gap-2">
              <span>Iniciando câmera...</span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <button type="button" id="btn-inverter-camera" class="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Alternar Câmera
            </button>
            <button type="button" id="btn-disparar-foto"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer">
              <i data-lucide="camera" class="w-4 h-4"></i> Capturar Foto
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL DE DETALHES COMPLETOS DA OCORRÊNCIA -->
      <div id="modal-detalhes-ocorrencia" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto">
        <div id="conteudo-detalhes-ocorrencia" class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
          <!-- Preenchido dinamicamente -->
        </div>
      </div>
    `;

    this._bind(container);
    await this._carregar(container);
    if (window.lucide) lucide.createIcons();
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

    // Filtros
    container.querySelector('#oc-busca')?.addEventListener('input', () => this._carregar(container));
    container.querySelector('#oc-filtro-status')?.addEventListener('change', () => this._carregar(container));

    // Upload de Imagem (Arquivo comum ou captura nativa)
    const handleFileFoto = (input) => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione um arquivo de imagem (JPG, PNG, WebP).');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert('A imagem é muito grande. Tamanho máximo: 10MB.');
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
          alert('Arquivo muito grande. Tamanho máximo: 20MB.');
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

    // Câmera ao vivo (Webcam / Stream)
    this._bindCamera(container);

    // Envio do formulário
    const form = container.querySelector('#form-ocorrencia');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = container.querySelector('#oc-btn-salvar');
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando ocorrência...';

        try {
          const localVal = form.local.value.trim();
          const tipoVal = form.tipo.value.trim();
          const descVal = form.descricao.value.trim();

          if (!localVal || localVal.length < 3) {
            throw new Error('Informe um local com pelo menos 3 caracteres.');
          }

          const fd = new FormData();
          fd.append('local', localVal);
          fd.append('tipo', tipoVal);
          fd.append('descricao', descVal);

          if (this._fotoSelecionada) {
            fd.append('foto', this._fotoSelecionada);
          } else if (this._fotoBase64) {
            fd.append('foto_base64', this._fotoBase64);
          }

          if (this._anexoSelecionado) {
            fd.append('anexo', this._anexoSelecionado);
          }

          const res = await window.API.createOcorrencia(fd);
          if (!res?.success && !res?.id) {
            // Em caso de retorno simples de id
          }

          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Ocorrência Registrada',
              message: 'A ocorrência foi cadastrada com sucesso!',
              type: 'success'
            });
          } else {
            alert('Ocorrência cadastrada com sucesso!');
          }

          form.reset();
          this._limparTudo();
          formWrap.classList.add('hidden');
          await this._carregar(container);
        } catch (err) {
          alert(err.message || 'Erro ao registrar ocorrência.');
        } finally {
          btnSalvar.disabled = false;
          btnSalvar.textContent = 'Salvar Ocorrência';
        }
      });
    }
  },

  _bindCamera(container) {
    const btnAbrir = container.querySelector('#oc-btn-abrir-camera');
    const modal = container.querySelector('#modal-camera');
    const btnFechar = container.querySelector('#btn-fechar-camera');
    const btnDisparar = container.querySelector('#btn-disparar-foto');
    const video = container.querySelector('#camera-video');
    const canvas = container.querySelector('#camera-canvas');
    const loading = container.querySelector('#camera-loading');

    let facingMode = 'environment';

    const fecharCamera = () => {
      if (this._streamCamera) {
        this._streamCamera.getTracks().forEach(t => t.stop());
        this._streamCamera = null;
      }
      modal.classList.add('hidden');
    };

    const abrirCamera = async () => {
      modal.classList.remove('hidden');
      loading?.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Câmera não suportada neste navegador.');
        }

        if (this._streamCamera) {
          this._streamCamera.getTracks().forEach(t => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });

        this._streamCamera = stream;
        video.srcObject = stream;
        await video.play();
        loading?.classList.add('hidden');
      } catch (err) {
        console.warn('[CAMERA] Falha ao iniciar stream:', err);
        alert('Não foi possível acessar a câmera: ' + (err.message || 'Permissão negada.'));
        fecharCamera();
      }
    };

    btnAbrir?.addEventListener('click', abrirCamera);
    btnFechar?.addEventListener('click', fecharCamera);

    // Alternar câmera frontal/traseira se houver
    container.querySelector('#btn-inverter-camera')?.addEventListener('click', async () => {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      await abrirCamera();
    });

    // Disparar captura
    btnDisparar?.addEventListener('click', () => {
      if (!video.videoWidth) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this._fotoBase64 = dataUrl;
      this._fotoSelecionada = null;

      // Exibe preview
      const wrap = container.querySelector('#oc-foto-preview-wrap');
      const img = container.querySelector('#oc-foto-preview');
      img.src = dataUrl;
      wrap.classList.remove('hidden');

      fecharCamera();
    });
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
    const map = {
      aberto: 'bg-amber-50 text-amber-700 border-amber-200',
      em_andamento: 'bg-blue-50 text-blue-700 border-blue-200',
      resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    const label = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido' }[status] || status;
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wide ${map[status] || 'bg-slate-50 text-slate-600 border-slate-200'}">${label}</span>`;
  },

  async _carregar(container) {
    const lista = container.querySelector('#oc-lista');
    const q = container.querySelector('#oc-busca')?.value.trim() || '';
    const status = container.querySelector('#oc-filtro-status')?.value || '';

    lista.innerHTML = '<div class="col-span-full py-12 text-center text-xs text-slate-400 font-semibold">Carregando ocorrências...</div>';

    try {
      const res = await window.API.getOcorrencias({ q, status });
      const itens = Array.isArray(res) ? res : (res?.data || []);

      if (!itens.length) {
        lista.innerHTML = `
          <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-hub-sm">
            <i data-lucide="check-circle" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-700">Nenhuma ocorrência encontrada</h4>
            <p class="text-xs text-slate-400 mt-1">Nenhum chamado corresponde aos filtros aplicados.</p>
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      lista.innerHTML = itens.map(o => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm p-5 flex flex-col justify-between hover:shadow-hub-md transition-all group">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <span class="text-[10px] font-mono text-slate-400 font-bold">#${o.id}</span>
                <h4 class="text-sm font-extrabold text-slate-900 truncate tracking-tight">${this._esc(o.local)}</h4>
                ${o.tipo ? `<span class="inline-block mt-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${this._esc(o.tipo)}</span>` : ''}
              </div>
              ${this._statusBadge(o.status)}
            </div>

            <!-- EVIDÊNCIA FOTOGRÁFICA -->
            ${o.foto_url ? `
              <div class="relative rounded-xl overflow-hidden border border-slate-200 group/img">
                <img src="${this._esc(o.foto_url)}" alt="Evidência Fotográfica" class="w-full h-40 object-cover group-hover/img:scale-105 transition-transform duration-300">
                <a href="${this._esc(o.foto_url)}" target="_blank" rel="noopener"
                  class="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                  <i data-lucide="zoom-in" class="w-4 h-4 mr-1"></i> Abrir Foto
                </a>
              </div>` : ''}

            <!-- DESCRIÇÃO -->
            ${o.descricao ? `<p class="text-xs text-slate-600 leading-relaxed line-clamp-3">${this._esc(o.descricao)}</p>` : ''}

            <!-- ANEXO/DOCUMENTO -->
            ${o.anexo_url ? `
              <a href="${this._esc(o.anexo_url)}" target="_blank" rel="noopener"
                class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl transition-colors text-xs font-bold text-slate-700">
                <i data-lucide="file-text" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                <span class="truncate flex-1">${this._esc(o.anexo_nome || 'Visualizar Arquivo Anexo')}</span>
                <i data-lucide="external-link" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
              </a>` : ''}
          </div>

          <!-- RODAPÉ DO CARD COM METADADOS E BOTÃO DETALHES -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <span>${o.usuario_nome ? this._esc(o.usuario_nome) : 'Sistema'}</span>
              <span class="block text-[10px] text-slate-400 font-mono">${o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : ''}</span>
            </div>
            <button type="button" onclick="OcorrenciasModule.abrirDetalhes(${o.id})"
              class="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 cursor-pointer">
              Ver Detalhes <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>`).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      lista.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-red-500 bg-red-50 rounded-2xl border border-red-100 p-4">
          ${this._esc(err.message || 'Erro ao carregar lista de ocorrências.')}
        </div>`;
    }
  },

  async abrirDetalhes(id) {
    const modal = document.getElementById('modal-detalhes-ocorrencia');
    const conteudo = document.getElementById('conteudo-detalhes-ocorrencia');
    if (!modal || !conteudo) return;

    modal.classList.remove('hidden');
    conteudo.innerHTML = '<div class="py-12 text-center text-xs text-slate-400">Carregando detalhes da ocorrência...</div>';

    try {
      const res = await window.API.request(`/ocorrencias/${id}`);
      const o = res?.data || res;

      conteudo.innerHTML = `
        <div class="space-y-5">
          <div class="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-slate-400">Ocorrência #${o.id}</span>
                ${this._statusBadge(o.status)}
              </div>
              <h3 class="text-base font-extrabold text-slate-900 mt-1">${this._esc(o.local)}</h3>
            </div>
            <button type="button" onclick="document.getElementById('modal-detalhes-ocorrencia').classList.add('hidden')"
              class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Tipo</span>
              <span class="font-extrabold text-slate-800">${this._esc(o.tipo || 'Não especificado')}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Registrado por</span>
              <span class="font-extrabold text-slate-800">${this._esc(o.usuario_nome || 'N/A')}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Data e Hora</span>
              <span class="font-mono text-slate-700">${o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : 'N/A'}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Responsável</span>
              <span class="font-extrabold text-slate-800">${this._esc(o.responsavel_nome || 'Não atribuído')}</span>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição do Problema</h4>
            <div class="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              ${this._esc(o.descricao || 'Sem descrição adicional.')}
            </div>
          </div>

          <!-- FOTO AMPLIADA -->
          ${o.foto_url ? `
            <div>
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Evidência Fotográfica</h4>
              <div class="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                <img src="${this._esc(o.foto_url)}" alt="Foto da ocorrência" class="w-full max-h-80 object-contain bg-slate-900/5">
                <div class="p-2.5 bg-white border-t border-slate-100 flex justify-end">
                  <a href="${this._esc(o.foto_url)}" target="_blank" rel="noopener"
                    class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Abrir Foto em Tamanho Real
                  </a>
                </div>
              </div>
            </div>` : ''}

          <!-- DOCUMENTO/ANEXO -->
          ${o.anexo_url ? `
            <div>
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Documento / Anexo</h4>
              <a href="${this._esc(o.anexo_url)}" target="_blank" rel="noopener"
                class="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-2xl transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-emerald-950 block">${this._esc(o.anexo_nome || 'Arquivo Anexo')}</span>
                    <span class="text-[10px] text-emerald-700 font-medium">Clique para visualizar ou baixar o documento</span>
                  </div>
                </div>
                <i data-lucide="download" class="w-4 h-4 text-emerald-700"></i>
              </a>
            </div>` : ''}

          <!-- ALTERAR STATUS DA OCORRÊNCIA -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-600">Alterar status:</span>
              <select id="sel-mudar-status-${o.id}" class="text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <option value="aberto" ${o.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                <option value="em_andamento" ${o.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="resolvido" ${o.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
              </select>
              <button type="button" onclick="OcorrenciasModule.atualizarStatus(${o.id})"
                class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                Atualizar
              </button>
            </div>
            <button type="button" onclick="document.getElementById('modal-detalhes-ocorrencia').classList.add('hidden')"
              class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors">
              Fechar
            </button>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      conteudo.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar detalhes.')}</div>`;
    }
  },

  async atualizarStatus(id) {
    const sel = document.getElementById(`sel-mudar-status-${id}`);
    if (!sel) return;
    const novoStatus = sel.value;

    try {
      await window.API.request(`/ocorrencias/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus })
      });

      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Status Atualizado',
          message: `Status da ocorrência alterado para ${novoStatus}.`,
          type: 'success'
        });
      } else {
        alert('Status alterado com sucesso!');
      }

      document.getElementById('modal-detalhes-ocorrencia')?.classList.add('hidden');
      const container = document.getElementById('main-content');
      if (container) await this._carregar(container);
    } catch (err) {
      alert(err.message || 'Erro ao alterar status.');
    }
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

window.OcorrenciasModule = OcorrenciasModule;
window.Modules.ocorrencias = OcorrenciasModule;