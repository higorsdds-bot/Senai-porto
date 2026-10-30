/**
 * HUB ES+ - Camada de Componentes de Interface (ui.js)
 * Modais Executivos, Toasts Modernos, Badges, Skeleton Loaders e Empty States.
 * Governo do Estado do Espírito Santo | SECULT & SENAI
 */

class UIManager {
  constructor() {
    this.toastContainer = null;
    this.modalContainer = null;
    this._ensureContainers();
  }

  _ensureContainers() {
    // Container de Toasts (canto inferior direito)
    if (!document.getElementById('hub-toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'hub-toast-container';
      tc.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(tc);
      this.toastContainer = tc;
    } else {
      this.toastContainer = document.getElementById('hub-toast-container');
    }

    // Container de Modais
    if (!document.getElementById('hub-modal-container')) {
      const mc = document.createElement('div');
      mc.id = 'hub-modal-container';
      mc.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 transition-all duration-300';
      document.body.appendChild(mc);
      this.modalContainer = mc;
    } else {
      this.modalContainer = document.getElementById('hub-modal-container');
    }
  }

  // =========================================================================
  // TOASTS DE FEEDBACK (DESIGN MODERNO & DIRETO)
  // =========================================================================
  toast({ title, message, type = 'success', duration = 3500 }) {
    this._ensureContainers();

    const toast = document.createElement('div');
    const borderAccent = 
      type === 'success' ? 'border-l-4 border-l-emerald-500 border-slate-200/80 dark:border-slate-700/80' :
      type === 'error' ? 'border-l-4 border-l-rose-500 border-slate-200/80 dark:border-slate-700/80' :
      type === 'warning' ? 'border-l-4 border-l-amber-500 border-slate-200/80 dark:border-slate-700/80' :
      'border-l-4 border-l-sky-500 border-slate-200/80 dark:border-slate-700/80';

    toast.className = `pointer-events-auto flex items-start gap-3.5 p-4 rounded-xl shadow-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border ${borderAccent} toast-enter transition-all duration-200`;

    const iconMap = {
      success: `<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                </div>`,
      error: `<div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <i data-lucide="alert-circle" class="w-4 h-4"></i>
              </div>`,
      warning: `<div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                </div>`,
      info: `<div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
               <i data-lucide="info" class="w-4 h-4"></i>
             </div>`
    };

    toast.innerHTML = `
      ${iconMap[type] || iconMap.info}
      <div class="flex-1 min-w-0 pr-1">
        ${title ? `<h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white leading-tight">${title}</h4>` : ''}
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">${message}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg" aria-label="Fechar notificação">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    const dismiss = () => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 220);
    };

    closeBtn.addEventListener('click', dismiss);
    this.toastContainer.appendChild(toast);

    if (window.lucide) {
      window.lucide.createIcons({ root: toast });
    }

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  // =========================================================================
  // MODAL GENÉRICO EXECUTIVO (SUPORTE A ESC, TRAVAMENTO DE SCROLL E HIERARQUIA)
  // =========================================================================
  openModal({ title, subtitle, contentHtml, onSave, saveLabel = 'Salvar', cancelLabel = 'Cancelar', maxWidth = 'max-w-xl' }) {
    this._ensureContainers();
    const mc = this.modalContainer;

    // Trava scroll do body enquanto o modal estiver aberto
    document.body.style.overflow = 'hidden';

    mc.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden transform transition-all modal-enter">
        <!-- Header Executivo -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">${title}</h3>
            ${subtitle ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${subtitle}</p>` : ''}
          </div>
          <button id="modal-close-icon-btn" class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors" aria-label="Fechar modal">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200">
          ${contentHtml}
        </div>

        <!-- Footer com Botões Padronizados -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90">
          <button id="modal-cancel-btn" type="button" class="btn-secondary">
            ${cancelLabel}
          </button>
          ${onSave ? `
            <button id="modal-save-btn" type="button" class="btn-primary">
              ${saveLabel}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    mc.classList.remove('hidden');
    mc.classList.add('flex');

    if (window.lucide) {
      window.lucide.createIcons({ root: mc });
    }

    const closeModal = () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
      mc.classList.add('hidden');
      mc.classList.remove('flex');
      mc.innerHTML = '';
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);

    mc.querySelector('#modal-close-icon-btn')?.addEventListener('click', closeModal);
    mc.querySelector('#modal-cancel-btn')?.addEventListener('click', closeModal);

    // Fecha ao clicar fora do card
    mc.addEventListener('click', (e) => {
      if (e.target === mc) closeModal();
    });

    if (onSave) {
      const saveBtn = mc.querySelector('#modal-save-btn');
      saveBtn?.addEventListener('click', async () => {
        try {
          saveBtn.disabled = true;
          saveBtn.classList.add('opacity-75', 'cursor-not-allowed');
          saveBtn.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Processando...</span>`;
          const result = await onSave();
          if (result !== false) {
            closeModal();
          }
        } catch (err) {
          console.error('Erro na ação do modal:', err);
        } finally {
          if (document.body.contains(saveBtn)) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            saveBtn.innerText = saveLabel;
          }
        }
      });
    }

    this._activeCloseModal = closeModal;
    return { close: closeModal };
  }

  closeModal() {
    if (typeof this._activeCloseModal === 'function') {
      this._activeCloseModal();
      this._activeCloseModal = null;
      return;
    }
    document.body.style.overflow = '';
    if (this.modalContainer) {
      this.modalContainer.classList.add('hidden');
      this.modalContainer.classList.remove('flex');
      this.modalContainer.innerHTML = '';
    }
  }

  // =========================================================================
  // MODAL DE CONFIRMAÇÃO SEGURO (DIÁLOGO VISUAL DE DECISÃO)
  // =========================================================================
  confirmModal({ title = 'Confirmação', message = 'Tem certeza que deseja prosseguir?', confirmText = 'Sim, Confirmar', onConfirm, danger = true }) {
    this.openModal({
      title,
      maxWidth: 'max-w-md',
      contentHtml: `
        <div class="flex items-start gap-4 pt-1">
          <div class="w-12 h-12 rounded-2xl ${danger ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-4 ring-rose-500/10' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-4 ring-amber-500/10'} flex items-center justify-center shrink-0">
            <i data-lucide="${danger ? 'alert-triangle' : 'help-circle'}" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1.5 flex-1">
            <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${message}</p>
            ${danger ? `<p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Esta ação é irreversível e será auditada.
            </p>` : ''}
          </div>
        </div>
      `,
      saveLabel: confirmText,
      cancelLabel: 'Cancelar',
      onSave: async () => {
        if (onConfirm) await onConfirm();
        return true;
      }
    });

    const saveBtn = this.modalContainer.querySelector('#modal-save-btn');
    if (saveBtn) {
      if (danger) {
        saveBtn.className = 'btn-danger';
      }
    }
  }

  // =========================================================================
  // BADGES VISUAIS DE STATUS (ALTO CONTRASTE E INDICADOR LUMINOSO)
  // =========================================================================
  renderBadge(status) {
    const raw = String(status || '').toLowerCase().trim();
    let label = status;
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    let dotClass = 'bg-slate-400';

    switch (raw) {
      // Pendências
      case 'pendente':
        label = 'Pendente';
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80';
        dotClass = 'bg-amber-500';
        break;

      // Aprovações
      case 'aprovado':
        label = 'Aprovado';
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/80';
        dotClass = 'bg-sky-500';
        break;

      // Conclusões / Entregas
      case 'entregue':
      case 'concluido':
      case 'resolvido':
      case 'limpo':
      case 'ativo':
        label = raw === 'entregue' ? 'Entregue' : (raw === 'resolvido' ? 'Resolvido' : (raw === 'limpo' ? 'Limpo' : (raw === 'ativo' ? 'Ativo' : 'Concluído')));
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80';
        dotClass = 'bg-emerald-500';
        break;

      // Cancelamentos / Falhas / Inativos
      case 'cancelado':
      case 'nao_limpo':
      case 'inativo':
        label = raw === 'nao_limpo' ? 'Não Limpo' : (raw === 'inativo' ? 'Inativo' : 'Cancelado');
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80';
        dotClass = 'bg-rose-500';
        break;

      // Aberturas (Ocorrências)
      case 'aberto':
        label = 'Aberto';
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80';
        dotClass = 'bg-rose-500 animate-pulse';
        break;

      // Execuções em Andamento
      case 'em_andamento':
      case 'em_execucao':
        label = raw === 'em_execucao' ? 'Em Execução' : 'Em Andamento';
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/80';
        dotClass = 'bg-indigo-500';
        break;

      // Agendamentos
      case 'agendado':
        label = 'Agendado';
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/80';
        dotClass = 'bg-blue-500';
        break;

      default:
        label = status || 'N/A';
        break;
    }

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${colorClasses}">
        <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
        ${label}
      </span>
    `;
  }

  // =========================================================================
  // SKELETON LOADERS POLIDOS
  // =========================================================================
  renderTableSkeleton(columns = 5, rows = 5) {
    let rowsHtml = '';
    for (let i = 0; i < rows; i++) {
      let colsHtml = '';
      for (let j = 0; j < columns; j++) {
        colsHtml += `
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="h-3.5 skeleton-shimmer rounded-md ${j === 0 ? 'w-20' : (j === 1 ? 'w-44' : 'w-24')}"></div>
          </td>
        `;
      }
      rowsHtml += `<tr class="border-b border-slate-100 dark:border-slate-800">${colsHtml}</tr>`;
    }

    return `
      <div class="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="h-5 w-44 skeleton-shimmer rounded-lg"></div>
          <div class="h-8 w-28 skeleton-shimmer rounded-xl"></div>
        </div>
        <table class="w-full text-left">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  renderCardsSkeleton(count = 4) {
    let cards = '';
    for (let i = 0; i < count; i++) {
      cards += `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <div class="h-3.5 w-24 skeleton-shimmer rounded-md"></div>
            <div class="w-9 h-9 skeleton-shimmer rounded-xl"></div>
          </div>
          <div class="mt-4 space-y-2">
            <div class="h-7 w-16 skeleton-shimmer rounded-lg"></div>
            <div class="h-3 w-32 skeleton-shimmer rounded-md"></div>
          </div>
        </div>
      `;
    }
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">${cards}</div>`;
  }

  // =========================================================================
  // ESTADO VAZIO (EMPTY STATE PROFISSIONAL)
  // =========================================================================
  renderEmptyState({ title = 'Nenhum registro encontrado', description = 'Não existem dados correspondentes aos filtros aplicados.', actionLabel, onActionClick }) {
    const id = 'empty-btn-' + Math.random().toString(36).substring(2, 7);
    setTimeout(() => {
      const btn = document.getElementById(id);
      if (btn && onActionClick) {
        btn.addEventListener('click', onActionClick);
      }
    }, 50);

    return `
      <div class="py-14 px-6 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
          <i data-lucide="inbox" class="w-7 h-7"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">${title}</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 mb-5 leading-relaxed">${description}</p>
        ${actionLabel ? `
          <button id="${id}" class="btn-primary text-xs">
            <i data-lucide="plus" class="w-4 h-4"></i>
            ${actionLabel}
          </button>
        ` : ''}
      </div>
    `;
  }

  // =========================================================================
  // VALIDAÇÃO DE FORMULÁRIO COM FEEDBACK AMIGÁVEL
  // =========================================================================
  validateForm(formElement) {
    let isValid = true;
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');

    inputs.forEach(input => {
      const parent = input.closest('div');
      const prevError = parent ? parent.querySelector('.form-error-msg') : null;
      if (prevError) prevError.remove();
      input.classList.remove('border-rose-500', 'focus:ring-rose-500', 'bg-rose-50/20');

      if (!input.value || !String(input.value).trim()) {
        isValid = false;
        input.classList.add('border-rose-500', 'focus:ring-rose-500', 'bg-rose-50/20');
        const errorMsg = document.createElement('p');
        errorMsg.className = 'form-error-msg text-xs text-rose-600 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1';
        errorMsg.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Campo obrigatório`;
        if (parent) parent.appendChild(errorMsg);
      }
    });

    if (window.lucide) {
      window.lucide.createIcons({ root: formElement });
    }

    return isValid;
  }

  // =========================================================================
  // VISUALIZAÇÃO DE COMUNICADOS
  // =========================================================================
  async visualizarComunicado(comunicadoOrId) {
    let item = comunicadoOrId;
    if (typeof comunicadoOrId === 'number' || typeof comunicadoOrId === 'string') {
      try {
        if (window.API && typeof window.API.getComunicado === 'function') {
          item = await window.API.getComunicado(comunicadoOrId);
        }
      } catch (e) {
        console.warn('Erro ao carregar comunicado por ID, buscando da lista:', e);
      }

      if (!item && window.API && typeof window.API.getComunicados === 'function') {
        try {
          const lista = await window.API.getComunicados();
          item = lista.find(c => Number(c.id) === Number(comunicadoOrId));
        } catch (e2) {
          console.warn('Falha ao listar comunicados:', e2);
        }
      }
    }

    if (!item) {
      this.toast({ title: 'Aviso', message: 'Comunicado não encontrado.', type: 'warning' });
      return;
    }

    const isAlta = item.prioridade === 'alta';
    const isMedia = item.prioridade === 'media';
    const prioridadeLabel = isAlta ? 'Alta Prioridade' : isMedia ? 'Prioridade Média' : 'Prioridade Normal';
    const prioridadeBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
        isAlta ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
        isMedia ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
      }">
        <span class="w-2 h-2 rounded-full ${isAlta ? 'bg-rose-500 animate-pulse' : isMedia ? 'bg-amber-500' : 'bg-blue-500'}"></span>
        ${prioridadeLabel}
      </span>
    `;

    const dataObj = item.created_at ? new Date(item.created_at) : (item.data ? new Date(item.data) : new Date());
    const dataFmt = !isNaN(dataObj) 
      ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : (item.data || 'Recente');

    const autor = item.autor_nome || item.autor || 'Administração HUB ES+';

    const contentHtml = `
      <div class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          ${prioridadeBadge}
          <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            <span>${dataFmt}</span>
          </div>
        </div>

        <div>
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            ${item.titulo}
          </h2>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line select-text">
            ${item.mensagem}
          </p>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              ${autor.charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-800 dark:text-slate-200">${autor}</span>
              <span class="block text-[10px] text-slate-400">Publicado no Mural Oficial</span>
            </div>
          </div>
          <button id="btn-modal-ir-central" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors">
            <span>Ir para Central de Comunicação</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    const modal = this.openModal({
      title: 'Comunicado Oficial',
      subtitle: 'Informativo interno do HUB ES+',
      maxWidth: 'max-w-2xl',
      contentHtml,
      cancelLabel: 'Fechar'
    });

    setTimeout(() => {
      document.getElementById('btn-modal-ir-central')?.addEventListener('click', () => {
        if (modal && typeof modal.close === 'function') modal.close();
        window.location.hash = '#comunicacao';
      });
    }, 50);

    return modal;
  }

  // =========================================================================
  // MODAL DE TODOS OS COMUNICADOS DE ALTA PRIORIDADE
  // =========================================================================
  async visualizarComunicadosAlta(listaCustom = null) {
    let lista = listaCustom;
    if (!lista || !Array.isArray(lista) || lista.length === 0) {
      if (window.API && typeof window.API.getComunicados === 'function') {
        try {
          const todos = await window.API.getComunicados();
          lista = (Array.isArray(todos) ? todos : []).filter(c => c.prioridade === 'alta');
        } catch (e) {
          console.error('Erro ao buscar comunicados de alta prioridade:', e);
        }
      }
    } else {
      lista = lista.filter(c => c.prioridade === 'alta');
    }

    if (!lista || lista.length === 0) {
      this.toast({ title: 'Aviso', message: 'Nenhum comunicado de alta prioridade ativo no momento.', type: 'info' });
      return;
    }

    lista.sort((a, b) => new Date(b.created_at || b.data || 0) - new Date(a.created_at || a.data || 0));

    // Marca imediatamente como visto no localStorage PARA ESTE PERFIL/USUÁRIO
    try {
      const timeKey = window.Auth && typeof window.Auth.getUserStorageKey === 'function' 
        ? window.Auth.getUserStorageKey('hub_comunicados_alta_vistos_timestamp') 
        : 'hub_comunicados_alta_vistos_timestamp';
      const idsKey = window.Auth && typeof window.Auth.getUserStorageKey === 'function' 
        ? window.Auth.getUserStorageKey('hub_comunicados_alta_vistos_ids') 
        : 'hub_comunicados_alta_vistos_ids';

      localStorage.setItem(timeKey, Date.now().toString());
      const vistosAtuais = JSON.parse(localStorage.getItem(idsKey) || '[]');
      const novosIds = lista.map(c => c.id);
      const unificados = Array.from(new Set([...vistosAtuais, ...novosIds]));
      localStorage.setItem(idsKey, JSON.stringify(unificados));
    } catch (e) {
      console.warn('Falha ao persistir visualização no localStorage:', e);
    }

    const banner = document.getElementById('banner-comunicado-urgente');
    if (banner) {
      banner.style.transition = 'all 0.3s ease-out';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (banner && banner.parentNode) banner.remove();
      }, 300);
    }

    const total = lista.length;
    const contentHtml = `
      <div class="space-y-4">
        <!-- Alerta Informativo Superior -->
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
            <p class="text-xs font-semibold text-rose-800 dark:text-rose-300">
              ${total === 1 ? 'Existe 1 comunicado de alta prioridade' : `Existem ${total} comunicados de alta prioridade que requerem atenção imediata.`}
            </p>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white shrink-0 tracking-wider">
            Urgente
          </span>
        </div>

        <!-- Lista com TODOS os comunicados de alta prioridade -->
        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          ${lista.map((item, idx) => {
            const dataObj = item.created_at ? new Date(item.created_at) : (item.data ? new Date(item.data) : new Date());
            const dataFmt = !isNaN(dataObj)
              ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : (item.data || 'Data recente');
            const autor = item.autor_nome || item.autor || 'Administração HUB ES+';

            return `
              <div class="p-5 rounded-2xl border-2 border-rose-200 dark:border-rose-900/80 bg-white dark:bg-slate-900/90 shadow-sm space-y-3 relative overflow-hidden transition-all hover:border-rose-400 dark:hover:border-rose-700">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-rose-100 dark:border-rose-900/40">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                      <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"></i>
                      Alta Prioridade ${total > 1 ? `(#${idx + 1} de ${total})` : ''}
                    </span>
                    <span class="text-[11px] text-slate-400 font-medium">• ${dataFmt}</span>
                  </div>
                  <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <i data-lucide="user" class="w-3 h-3 text-slate-400"></i>
                    ${autor}
                  </span>
                </div>

                <div>
                  <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug">
                    ${item.titulo}
                  </h3>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line select-text">
                    ${item.mensagem}
                  </p>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Rodapé informativo -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span class="text-slate-400">Estes avisos foram marcados como lidos.</span>
          <button id="btn-modal-alta-ir-central" class="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 transition-colors">
            <span>Acessar Central de Comunicação</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    const modal = this.openModal({
      title: 'Comunicados de Alta Prioridade',
      subtitle: `${total} aviso(s) urgente(s) ativo(s) no HUB ES+`,
      maxWidth: 'max-w-2xl',
      contentHtml,
      cancelLabel: 'Compreendi e Fechar'
    });

    setTimeout(() => {
      document.getElementById('btn-modal-alta-ir-central')?.addEventListener('click', () => {
        const mc = document.getElementById('hub-modal-container');
        if (mc) {
          document.body.style.overflow = '';
          mc.classList.add('hidden');
          mc.classList.remove('flex');
          mc.innerHTML = '';
        }
        window.location.hash = '#comunicacao';
      });
    }, 50);

    return modal;
  }
}

window.UI = new UIManager();
