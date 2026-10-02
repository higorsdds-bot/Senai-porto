/**
 * HUB ES+ - Camada de Componentes de Interface (ui.js)
 * Modais, Toasts, Badges, Skeleton Loaders, Empty States e Validação de Formulários.
 */

class UIManager {
  constructor() {
    this.toastContainer = null;
    this.modalContainer = null;
    this._ensureContainers();
  }

  _ensureContainers() {
    // Container de Toasts
    if (!document.getElementById('hub-toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'hub-toast-container';
      tc.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(tc);
      this.toastContainer = tc;
    } else {
      this.toastContainer = document.getElementById('hub-toast-container');
    }

    // Container de Modais
    if (!document.getElementById('hub-modal-container')) {
      const mc = document.createElement('div');
      mc.id = 'hub-modal-container';
      mc.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300';
      document.body.appendChild(mc);
      this.modalContainer = mc;
    } else {
      this.modalContainer = document.getElementById('hub-modal-container');
    }
  }

  // =========================================================================
  // TOASTS DE FEEDBACK
  // =========================================================================
  toast({ title, message, type = 'success', duration = 3500 }) {
    this._ensureContainers();

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border toast-enter transition-all duration-300 ${
      type === 'success' ? 'bg-white text-slate-800 border-emerald-200 shadow-emerald-500/10' :
      type === 'error' ? 'bg-white text-slate-800 border-rose-200 shadow-rose-500/10' :
      type === 'warning' ? 'bg-white text-slate-800 border-amber-200 shadow-amber-500/10' :
      'bg-white text-slate-800 border-sky-200 shadow-sky-500/10'
    }`;

    const iconMap = {
      success: `<div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <i data-lucide="check" class="w-5 h-5"></i>
                </div>`,
      error: `<div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <i data-lucide="alert-circle" class="w-5 h-5"></i>
              </div>`,
      warning: `<div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                </div>`,
      info: `<div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
               <i data-lucide="info" class="w-5 h-5"></i>
             </div>`
    };

    toast.innerHTML = `
      ${iconMap[type] || iconMap.info}
      <div class="flex-1 min-w-0">
        ${title ? `<h4 class="text-sm font-semibold text-slate-900">${title}</h4>` : ''}
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${message}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1 -mt-1 rounded-md" aria-label="Fechar notificação">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    const dismiss = () => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 250);
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
  // MODAL GENÉRICO E MODAL DE CONFIRMAÇÃO
  // =========================================================================
  openModal({ title, subtitle, contentHtml, onSave, saveLabel = 'Salvar', cancelLabel = 'Cancelar', maxWidth = 'max-w-xl' }) {
    this._ensureContainers();
    const mc = this.modalContainer;

    mc.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 class="text-base font-bold text-slate-900">${title}</h3>
            ${subtitle ? `<p class="text-xs text-slate-500 mt-0.5">${subtitle}</p>` : ''}
          </div>
          <button id="modal-close-icon-btn" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Fechar modal">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-4 flex-1">
          ${contentHtml}
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button id="modal-cancel-btn" type="button" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors">
            ${cancelLabel}
          </button>
          ${onSave ? `
            <button id="modal-save-btn" type="button" class="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all">
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
      mc.classList.add('hidden');
      mc.classList.remove('flex');
      mc.innerHTML = '';
    };

    mc.querySelector('#modal-close-icon-btn').addEventListener('click', closeModal);
    mc.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);

    // Fecha ao clicar fora
    mc.addEventListener('click', (e) => {
      if (e.target === mc) closeModal();
    });

    if (onSave) {
      const saveBtn = mc.querySelector('#modal-save-btn');
      saveBtn.addEventListener('click', async () => {
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

    return { close: closeModal };
  }

  confirmModal({ title = 'Confirmação', message = 'Tem certeza que deseja prosseguir?', confirmText = 'Sim, Excluir', onConfirm, danger = true }) {
    this.openModal({
      title,
      maxWidth: 'max-w-md',
      contentHtml: `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl ${danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center shrink-0">
            <i data-lucide="${danger ? 'trash-2' : 'alert-triangle'}" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="text-sm text-slate-600 leading-relaxed">${message}</p>
            ${danger ? `<p class="text-xs text-rose-600 font-medium mt-2">Esta ação não poderá ser desfeita.</p>` : ''}
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
    if (saveBtn && danger) {
      saveBtn.className = 'px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/20 transition-all';
    }
  }

  // =========================================================================
  // BADGES VISUAIS DE STATUS
  // =========================================================================
  renderBadge(status) {
    const raw = String(status || '').toLowerCase().trim();
    let label = status;
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
    let dotClass = 'bg-slate-400';

    switch (raw) {
      // Compras / Geral
      case 'pendente':
        label = 'Pendente';
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80';
        dotClass = 'bg-amber-500';
        break;
      case 'aprovado':
        label = 'Aprovado';
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
        dotClass = 'bg-blue-500';
        break;
      case 'entregue':
      case 'concluido':
      case 'resolvido':
        label = raw === 'entregue' ? 'Entregue' : (raw === 'resolvido' ? 'Resolvido' : 'Concluído');
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
        dotClass = 'bg-emerald-500';
        break;
      case 'cancelado':
        label = 'Cancelado';
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
        dotClass = 'bg-rose-500';
        break;

      // Ocorrências / Limpeza
      case 'aberto':
        label = 'Aberto';
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
        dotClass = 'bg-rose-500';
        break;
      case 'em_andamento':
      case 'em_execucao':
        label = raw === 'em_execucao' ? 'Em Execução' : 'Em Andamento';
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
        dotClass = 'bg-indigo-500';
        break;

      // Eventos
      case 'agendado':
        label = 'Agendado';
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200/80';
        dotClass = 'bg-sky-500';
        break;

      default:
        label = status || 'N/A';
        break;
    }

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses}">
        <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
        ${label}
      </span>
    `;
  }

  // =========================================================================
  // SKELETON LOADERS
  // =========================================================================
  renderTableSkeleton(columns = 5, rows = 5) {
    let rowsHtml = '';
    for (let i = 0; i < rows; i++) {
      let colsHtml = '';
      for (let j = 0; j < columns; j++) {
        colsHtml += `
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="h-4 skeleton-shimmer rounded-md ${j === 0 ? 'w-24' : (j === 1 ? 'w-48' : 'w-28')}"></div>
          </td>
        `;
      }
      rowsHtml += `<tr class="border-b border-slate-100">${colsHtml}</tr>`;
    }

    return `
      <div class="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div class="h-6 w-44 skeleton-shimmer rounded-lg"></div>
          <div class="h-8 w-32 skeleton-shimmer rounded-xl"></div>
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
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <div class="h-4 w-28 skeleton-shimmer rounded-md"></div>
            <div class="w-10 h-10 skeleton-shimmer rounded-xl"></div>
          </div>
          <div class="mt-4 space-y-2">
            <div class="h-8 w-20 skeleton-shimmer rounded-lg"></div>
            <div class="h-3 w-36 skeleton-shimmer rounded-md"></div>
          </div>
        </div>
      `;
    }
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">${cards}</div>`;
  }

  // =========================================================================
  // ESTADO VAZIO (EMPTY STATE)
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
      <div class="py-16 px-6 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <i data-lucide="inbox" class="w-8 h-8"></i>
        </div>
        <h4 class="text-base font-bold text-slate-800">${title}</h4>
        <p class="text-xs text-slate-500 max-w-sm mt-1 mb-6">${description}</p>
        ${actionLabel ? `
          <button id="${id}" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
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
      // Remove erros anteriores
      const parent = input.closest('div');
      const prevError = parent ? parent.querySelector('.form-error-msg') : null;
      if (prevError) prevError.remove();
      input.classList.remove('border-rose-500', 'focus:ring-rose-500', 'bg-rose-50/20');

      if (!input.value || !String(input.value).trim()) {
        isValid = false;
        input.classList.add('border-rose-500', 'focus:ring-rose-500', 'bg-rose-50/20');
        const errorMsg = document.createElement('p');
        errorMsg.className = 'form-error-msg text-xs text-rose-600 font-medium mt-1 flex items-center gap-1';
        errorMsg.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Campo obrigatório`;
        if (parent) parent.appendChild(errorMsg);
      }
    });

    if (window.lucide) {
      window.lucide.createIcons({ root: formElement });
    }

    return isValid;
  }
}

window.UI = new UIManager();
