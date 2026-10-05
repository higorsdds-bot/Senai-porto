/**
 * HUB ES+ - Módulo de Ocorrências Técnicas
 * Registro com foto (câmera no celular / arquivo no PC).
 */
window.Modules = window.Modules || {};

window.Modules.ocorrencias = {
  _fotoSelecionada: null,
  _fotoPreviewUrl: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">Ocorrências Técnicas</h2>
            <p class="text-xs text-slate-400 font-semibold">Registre e acompanhe problemas com evidência fotográfica.</p>
          </div>
          <button id="btn-nova-ocorrencia" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
            <i data-lucide="plus" class="w-4 h-4"></i> Nova Ocorrência
          </button>
        </div>

        <div class="flex gap-2">
          <input id="oc-busca" type="text" placeholder="Buscar por local ou descrição..."
            class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
          <select id="oc-filtro-status" class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30">
            <option value="">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>

        <div id="oc-form-wrap" class="hidden bg-white rounded-2xl border border-slate-200 shadow-hub-sm p-6">
          <h3 class="text-sm font-extrabold text-slate-900 mb-4">Registrar Ocorrência</h3>
          <form id="form-ocorrencia" class="grid grid-cols-1 sm:grid-cols-2 gap-4" novalidate>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Local *</label>
              <input name="local" required minlength="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Ex: Sala 203, Corredor B...">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Tipo</label>
              <input name="tipo"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Ex: Elétrica, Hidráulica, TI...">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Descrição</label>
              <textarea name="descricao" rows="3"
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                placeholder="Descreva o problema..."></textarea>
            </div>

            <!-- FOTO: câmera no celular / arquivo no PC -->
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-500 mb-1.5">Foto da ocorrência (opcional)</label>
              <div class="flex flex-wrap items-center gap-3">
                <label class="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
                  <i data-lucide="camera" class="w-4 h-4"></i> Tirar Foto
                  <input id="oc-foto-captura" type="file" accept="image/*" capture="environment" class="hidden">
                </label>
                <label class="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
                  <i data-lucide="image" class="w-4 h-4"></i> Escolher Arquivo
                  <input id="oc-foto-arquivo" type="file" accept="image/*" class="hidden">
                </label>
                <img id="oc-foto-preview" class="hidden w-20 h-20 object-cover rounded-xl border border-slate-200" alt="Prévia da foto">
                <button type="button" id="oc-foto-remover" class="hidden text-xs font-bold text-red-600 hover:text-red-700">Remover</button>
              </div>
              <p class="text-[11px] text-slate-400 mt-2">No celular, "Tirar Foto" abre a câmera. Formatos: JPG, PNG, WebP. Máx. 10MB.</p>
            </div>

            <div class="sm:col-span-2 flex gap-2 pt-2">
              <button type="submit" id="oc-btn-salvar"
                class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Salvar Ocorrência
              </button>
              <button type="button" id="oc-btn-cancelar"
                class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div id="oc-lista" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      </div>`;

    this._bind(container);
    await this._carregar(container);
    if (window.lucide) lucide.createIcons();
  },

  _bind(container) {
    const formWrap = container.querySelector('#oc-form-wrap');
    container.querySelector('#btn-nova-ocorrencia').addEventListener('click', () => formWrap.classList.toggle('hidden'));
    container.querySelector('#oc-btn-cancelar').addEventListener('click', () => { this._limparFoto(); formWrap.classList.add('hidden'); });
    container.querySelector('#oc-busca').addEventListener('input', () => this._carregar(container));
    container.querySelector('#oc-filtro-status').addEventListener('change', () => this._carregar(container));

    const aoEscolherFoto = (input) => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem.'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('Imagem muito grande. Máximo 10MB.'); return; }
        this._fotoSelecionada = file;
        if (this._fotoPreviewUrl) URL.revokeObjectURL(this._fotoPreviewUrl);
        this._fotoPreviewUrl = URL.createObjectURL(file);
        const prev = container.querySelector('#oc-foto-preview');
        prev.src = this._fotoPreviewUrl;
        prev.classList.remove('hidden');
        container.querySelector('#oc-foto-remover').classList.remove('hidden');
      });
    };
    aoEscolherFoto(container.querySelector('#oc-foto-captura'));
    aoEscolherFoto(container.querySelector('#oc-foto-arquivo'));

    container.querySelector('#oc-foto-remover').addEventListener('click', () => this._limparFoto());

    container.querySelector('#form-ocorrencia').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const btn = container.querySelector('#oc-btn-salvar');
      btn.disabled = true; btn.textContent = 'Salvando...';
      try {
        const fd = new FormData();
        fd.append('local', form.local.value.trim());
        fd.append('tipo', form.tipo.value.trim());
        fd.append('descricao', form.descricao.value.trim());
        if (this._fotoSelecionada) fd.append('foto', this._fotoSelecionada);

        const res = await window.API.createOcorrencia(fd);
        if (!res?.success) throw new Error(res?.message || 'Erro ao salvar.');
        form.reset();
        this._limparFoto();
        formWrap.classList.add('hidden');
        await this._carregar(container);
      } catch (err) {
        alert(err.message || 'Erro ao registrar ocorrência.');
      } finally {
        btn.disabled = false; btn.textContent = 'Salvar Ocorrência';
      }
    });
  },

  _limparFoto() {
    this._fotoSelecionada = null;
    if (this._fotoPreviewUrl) { URL.revokeObjectURL(this._fotoPreviewUrl); this._fotoPreviewUrl = null; }
    const prev = document.getElementById('oc-foto-preview');
    if (prev) { prev.src = ''; prev.classList.add('hidden'); }
    document.getElementById('oc-foto-remover')?.classList.add('hidden');
    const c = document.getElementById('oc-foto-captura'); if (c) c.value = '';
    const a = document.getElementById('oc-foto-arquivo'); if (a) a.value = '';
  },

  _statusBadge(status) {
    const map = {
      aberto: 'bg-amber-50 text-amber-700 border-amber-200',
      em_andamento: 'bg-blue-50 text-blue-700 border-blue-200',
      resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    const label = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido' }[status] || status;
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${map[status] || 'bg-slate-50 text-slate-600 border-slate-200'}">${label}</span>`;
  },

  async _carregar(container) {
    const lista = container.querySelector('#oc-lista');
    const q = container.querySelector('#oc-busca').value.trim();
    const status = container.querySelector('#oc-filtro-status').value;
    lista.innerHTML = '<p class="text-sm text-slate-400 col-span-full py-8 text-center">Carregando...</p>';
    try {
      const res = await window.API.getOcorrencias({ q, status });
      const itens = res?.data || [];
      if (!itens.length) {
        lista.innerHTML = '<p class="text-sm text-slate-400 col-span-full py-8 text-center">Nenhuma ocorrência encontrada.</p>';
        return;
      }
      lista.innerHTML = itens.map(o => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm p-5 flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-extrabold text-slate-900 truncate">${this._esc(o.local)}</h4>
              ${o.tipo ? `<span class="text-[11px] font-semibold text-slate-400">${this._esc(o.tipo)}</span>` : ''}
            </div>
            ${this._statusBadge(o.status)}
          </div>
          ${o.foto_url ? `
            <a href="${this._esc(o.foto_url)}" target="_blank" rel="noopener">
              <img src="${this._esc(o.foto_url)}" alt="Foto da ocorrência" class="w-full h-40 object-cover rounded-xl border border-slate-200">
            </a>` : ''}
          ${o.descricao ? `<p class="text-xs text-slate-600 leading-relaxed">${this._esc(o.descricao)}</p>` : ''}
          <div class="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>${o.usuario_nome ? 'Por ' + this._esc(o.usuario_nome) : ''}</span>
            <span>${o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : ''}</span>
          </div>
        </div>`).join('');
    } catch (err) {
      lista.innerHTML = `<p class="text-sm text-red-500 col-span-full py-8 text-center">${this._esc(err.message || 'Erro ao carregar.')}</p>`;
    }
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};