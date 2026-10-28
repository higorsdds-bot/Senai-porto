/**
 * HUB ES+ / SECULT - Módulo de Advertências Disciplinares
 * Exclusivo para Administrador Geral (ADMIN) e Administrador (ADMINISTRADOR).
 * Administrador pode solicitar aplicação (PENDENTE).
 * Administrador Geral pode aplicar diretamente, homologar (aprovar), rejeitar ou revogar.
 */

window.AdvertenciasModule = {
  items: [],
  usuarios: [],
  filtroStatus: 'TODOS',
  filtroGravidade: 'TODOS',
  filtroBusca: '',

  async render(container) {
    const perfil = window.Auth?.getUsuario()?.perfil;
    const ehPermitido = ['ADMIN', 'ADMINISTRADOR'].includes(perfil);

    if (!ehPermitido) {
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Acesso Restrito',
        description: 'Este módulo é exclusivo para a Administração e Administrador Geral.',
        actionLabel: 'Voltar ao Início',
        onActionClick: () => { window.location.hash = '#dashboard'; }
      });
      return;
    }

    container.innerHTML = window.UI.renderTableSkeleton(6, 6);

    try {
      const [resAdv, resUsu] = await Promise.all([
        window.API.getAdvertencias().catch(() => []),
        window.API.getUsuarios().catch(() => [])
      ]);

      this.items = Array.isArray(resAdv) ? resAdv : (resAdv?.data || []);
      this.usuarios = Array.isArray(resUsu) ? resUsu : (resUsu?.data || []);
      this._renderView(container);
    } catch (err) {
      console.error('[ADVERTENCIAS] Erro ao carregar dados:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Falha ao carregar advertências',
        description: err.message || 'Não foi possível carregar os registros disciplinares.',
        actionLabel: 'Tentar novamente',
        onActionClick: () => this.render(container)
      });
    }
  },

  _renderView(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const ehAdminGeral = usuarioLogado?.perfil === 'ADMIN';

    // Contadores para KPIs
    const total = this.items.length;
    const pendentes = this.items.filter(i => i.status === 'PENDENTE').length;
    const aplicadas = this.items.filter(i => i.status === 'APLICADA').length;
    const revogadas = this.items.filter(i => i.status === 'REVOGADA').length;

    // Filtragem local
    const filtradas = this.items.filter(item => {
      const matchStatus = this.filtroStatus === 'TODOS' || item.status === this.filtroStatus;
      const matchGravidade = this.filtroGravidade === 'TODOS' || item.gravidade === this.filtroGravidade;
      const q = this.filtroBusca.toLowerCase().trim();
      const matchBusca = !q ||
        (item.colaborador_nome && item.colaborador_nome.toLowerCase().includes(q)) ||
        (item.motivo && item.motivo.toLowerCase().includes(q)) ||
        (item.descricao && item.descricao.toLowerCase().includes(q));
      return matchStatus && matchGravidade && matchBusca;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Cabeçalho -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 tracking-wide uppercase">
                Governança & Disciplina
              </span>
              <span class="text-xs text-slate-400">• Gestão de Advertências Formais</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Controle de Advertências</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Registro, solicitação e homologação de medidas disciplinares com trilha de auditoria</p>
          </div>
          <button id="btn-nova-advertencia" class="btn-primary bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            ${ehAdminGeral ? 'Aplicar Advertência' : 'Solicitar Advertência'}
          </button>
        </div>

        <!-- KPIs Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Geral</span>
              <div class="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300">
                <i data-lucide="files" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-slate-900 dark:text-white mt-2">${total}</p>
            <p class="text-[11px] text-slate-400 mt-1">Registros no histórico</p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border ${pendentes > 0 ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20' : 'border-slate-200 dark:border-slate-700'} shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendentes</span>
              <div class="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-700 dark:text-amber-300">
                <i data-lucide="clock" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">${pendentes}</p>
            <p class="text-[11px] text-slate-400 mt-1">${ehAdminGeral ? 'Aguardando sua homologação' : 'Aguardando Admin Geral'}</p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Aplicadas</span>
              <div class="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300">
                <i data-lucide="alert-octagon" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">${aplicadas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Em vigência institucional</p>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Revogadas</span>
              <div class="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-300">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              </div>
            </div>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">${revogadas}</p>
            <p class="text-[11px] text-slate-400 mt-1">Anuladas formalmente</p>
          </div>
        </div>

        <!-- Filtros e Barra de Pesquisa -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button data-filtro-status="TODOS" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroStatus === 'TODOS' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Todas (${total})
            </button>
            <button data-filtro-status="PENDENTE" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroStatus === 'PENDENTE' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Pendentes (${pendentes})
            </button>
            <button data-filtro-status="APLICADA" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroStatus === 'APLICADA' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Aplicadas (${aplicadas})
            </button>
            <button data-filtro-status="REVOGADA" class="px-3 py-1.5 rounded-xl transition-all ${this.filtroStatus === 'REVOGADA' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
              Revogadas (${revogadas})
            </button>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select id="select-filtro-gravidade" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
              <option value="TODOS" ${this.filtroGravidade === 'TODOS' ? 'selected' : ''}>Todas as Gravidades</option>
              <option value="LEVE" ${this.filtroGravidade === 'LEVE' ? 'selected' : ''}>Leve</option>
              <option value="MEDIA" ${this.filtroGravidade === 'MEDIA' ? 'selected' : ''}>Média</option>
              <option value="GRAVE" ${this.filtroGravidade === 'GRAVE' ? 'selected' : ''}>Grave</option>
            </select>

            <div class="relative w-full sm:w-64">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input 
                id="input-busca-advertencias" 
                type="text" 
                value="${this.filtroBusca}" 
                placeholder="Buscar por colaborador ou motivo..." 
                class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>
        </div>

        <!-- Tabela de Advertências -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th class="p-3.5">Colaborador</th>
                  <th class="p-3.5">Motivo / Infração</th>
                  <th class="p-3.5">Gravidade</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5">Solicitante</th>
                  <th class="p-3.5">Data Fato</th>
                  <th class="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                ${filtradas.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-8 text-center text-slate-400">
                      Nenhum registro de advertência localizado com os filtros aplicados.
                    </td>
                  </tr>
                ` : filtradas.map(item => {
                  const dataOcorr = item.data_ocorrencia 
                    ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR') 
                    : '-';

                  const badgeStatus = {
                    'PENDENTE': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                    'APLICADA': 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                    'REJEITADA': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                    'REVOGADA': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }[item.status] || 'bg-slate-100 text-slate-700';

                  const badgeGravidade = {
                    'LEVE': 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                    'MEDIA': 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                    'GRAVE': 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
                  }[item.gravidade] || 'bg-slate-100 text-slate-700';

                  return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td class="p-3.5">
                        <div class="font-bold text-slate-900 dark:text-white">${item.colaborador_nome}</div>
                        <div class="text-[11px] text-slate-400">${item.colaborador_email || item.colaborador_perfil || ''}</div>
                      </td>
                      <td class="p-3.5">
                        <div class="font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">${item.motivo}</div>
                        <div class="text-[11px] text-slate-400 max-w-xs truncate">${item.descricao}</div>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeGravidade}">
                          ${item.gravidade}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStatus}">
                          ${item.status}
                        </span>
                      </td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">
                        ${item.solicitante_nome}
                      </td>
                      <td class="p-3.5 text-slate-500 whitespace-nowrap">
                        ${dataOcorr}
                      </td>
                      <td class="p-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="window.AdvertenciasModule.abrirDetalhes(${item.id})" class="btn-action-table action-primary" title="Visualizar Detalhes">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                          </button>

                          ${ehAdminGeral && item.status === 'PENDENTE' ? `
                            <button onclick="window.AdvertenciasModule.homologar(${item.id}, '${item.colaborador_nome.replace(/'/g, "\\'")}')" class="btn-action-table text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title="Homologar e Aplicar">
                              <i data-lucide="check" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.AdvertenciasModule.rejeitar(${item.id}, '${item.colaborador_nome.replace(/'/g, "\\'")}')" class="btn-action-table text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Rejeitar Solicitação">
                              <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                          ` : ''}

                          ${ehAdminGeral && item.status === 'APLICADA' ? `
                            <button onclick="window.AdvertenciasModule.revogar(${item.id}, '${item.colaborador_nome.replace(/'/g, "\\'")}')" class="btn-action-table text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" title="Revogar Advertência">
                              <i data-lucide="undo-2" class="w-4 h-4"></i>
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
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    this._bindEvents(container);
  },

  _bindEvents(container) {
    container.querySelector('#btn-nova-advertencia')?.addEventListener('click', () => this._openFormModal(container));

    container.querySelectorAll('[data-filtro-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filtroStatus = btn.getAttribute('data-filtro-status');
        this._renderView(container);
      });
    });

    container.querySelector('#select-filtro-gravidade')?.addEventListener('change', (e) => {
      this.filtroGravidade = e.target.value;
      this._renderView(container);
    });

    const inputBusca = container.querySelector('#input-busca-advertencias');
    if (inputBusca) {
      inputBusca.addEventListener('input', (e) => {
        this.filtroBusca = e.target.value;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this._renderView(container);
          const novoInput = container.querySelector('#input-busca-advertencias');
          if (novoInput) {
            novoInput.focus();
            novoInput.setSelectionRange(novoInput.value.length, novoInput.value.length);
          }
        }, 200);
      });
    }
  },

  abrirDetalhes(id) {
    const item = this.items.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const dataOcorr = item.data_ocorrencia ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR') : '-';
    const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-';
    const dataDecisao = item.data_decisao ? new Date(item.data_decisao).toLocaleString('pt-BR') : null;

    const contentHtml = `
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-slate-400 font-medium">Colaborador:</span>
              <p class="font-bold text-slate-900 dark:text-white">${item.colaborador_nome}</p>
              <p class="text-[11px] text-slate-500">${item.colaborador_email || ''}</p>
            </div>
            <div>
              <span class="text-slate-400 font-medium">Status Atual:</span>
              <p class="font-bold uppercase tracking-wider text-slate-900 dark:text-white">${item.status}</p>
              <p class="text-[11px] text-slate-500">Gravidade: <strong>${item.gravidade}</strong></p>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo / Título da Infração:</label>
          <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium">
            ${item.motivo}
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição Circunstanciada dos Fatos:</label>
          <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            ${item.descricao}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <span class="text-slate-400 font-medium">Solicitante:</span>
            <p class="font-semibold text-slate-800 dark:text-slate-200">${item.solicitante_nome}</p>
            <p class="text-[10px] text-slate-500">Data do fato: ${dataOcorr}</p>
          </div>
          <div>
            <span class="text-slate-400 font-medium">Homologador:</span>
            <p class="font-semibold text-slate-800 dark:text-slate-200">${item.homologador_nome || 'Ainda não homologado'}</p>
            <p class="text-[10px] text-slate-500">${dataDecisao ? `Decidido em: ${dataDecisao}` : 'Aguardando decisão'}</p>
          </div>
        </div>

        ${item.motivo_decisao ? `
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Justificativa da Decisão / Homologação:</label>
            <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              ${item.motivo_decisao}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    window.UI.openModal({
      title: `Advertência #${item.id}`,
      subtitle: `Registro disciplinar do colaborador ${item.colaborador_nome}`,
      contentHtml: contentHtml,
      saveLabel: null
    });
  },

  _openFormModal(container) {
    const usuarioLogado = window.Auth?.getUsuario();
    const ehAdminGeral = usuarioLogado?.perfil === 'ADMIN';

    // Filtrar apenas colaboradores ativos para advertência (exclui o próprio usuário logado)
    const colaboradores = this.usuarios.filter(u => Number(u.id) !== Number(usuarioLogado?.id));
    const dataHoje = new Date().toISOString().slice(0, 10);

    const contentHtml = `
      <form id="form-advertencia" class="space-y-4">
        ${!ehAdminGeral ? `
          <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
            <i data-lucide="info" class="w-4 h-4 inline-block mr-1 -mt-0.5"></i>
            Como <strong>Administrador</strong>, seu registro será enviado como <strong>solicitação pendente</strong> e dependerá da aprovação do <strong>Administrador Geral</strong> para ter efeito oficial.
          </div>
        ` : `
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
            <i data-lucide="shield-check" class="w-4 h-4 inline-block mr-1 -mt-0.5"></i>
            Como <strong>Administrador Geral</strong>, esta advertência será <strong>aplicada e homologada imediatamente</strong> no prontuário do colaborador.
          </div>
        `}

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Colaborador Advertido *</label>
          <select name="colaborador_id" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            <option value="">Selecione o colaborador...</option>
            ${colaboradores.map(u => `
              <option value="${u.id}">${u.nome} (${u.perfil || 'Colaborador'}) - ${u.email}</option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gravidade da Infração *</label>
            <select name="gravidade" required class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="LEVE">Leve (Orientação / Desatenção pontual)</option>
              <option value="MEDIA" selected>Média (Descumprimento de norma operacional)</option>
              <option value="GRAVE">Grave (Conduta grave / Reincidência)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Ocorrência / Fato *</label>
            <input 
              type="date" 
              name="data_ocorrencia" 
              required 
              value="${dataHoje}" 
              max="${dataHoje}"
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo / Infração Disciplinar *</label>
          <input 
            type="text" 
            name="motivo" 
            required 
            minlength="3" 
            placeholder="Ex: Atraso injustificado recorrente ou descumprimento de procedimento de segurança" 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição Circunstanciada dos Fatos *</label>
          <textarea 
            name="descricao" 
            required 
            minlength="5" 
            rows="4" 
            placeholder="Relate detalhadamente o ocorrido, locais, testemunhas ou impactos causados..." 
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          ></textarea>
        </div>
      </form>
    `;

    window.UI.openModal({
      title: ehAdminGeral ? 'Aplicar Nova Advertência' : 'Solicitar Advertência Disciplinar',
      subtitle: 'Controle corporativo de conduta e governança do HUB ES+',
      contentHtml: contentHtml,
      saveLabel: ehAdminGeral ? 'Aplicar Advertência' : 'Enviar Solicitação',
      onSave: async () => {
        const form = document.getElementById('form-advertencia');
        if (!window.UI.validateForm(form)) return false;

        const formData = new FormData(form);
        const colaborador_id = Number(formData.get('colaborador_id'));
        const gravidade = formData.get('gravidade');
        const data_ocorrencia = formData.get('data_ocorrencia');
        const motivo = (formData.get('motivo') || '').trim();
        const descricao = (formData.get('descricao') || '').trim();

        if (!colaborador_id) {
          window.UI.toast({ title: 'Atenção', message: 'Selecione o colaborador advertido.', type: 'warning' });
          return false;
        }

        try {
          await window.API.createAdvertencia({
            colaborador_id,
            gravidade,
            data_ocorrencia,
            motivo,
            descricao
          });

          window.UI.toast({
            title: 'Sucesso',
            message: ehAdminGeral ? 'Advertência aplicada com sucesso.' : 'Solicitação enviada para o Administrador Geral.'
          });

          await this.render(container);
          return true;
        } catch (err) {
          console.error('[ADVERTENCIAS] Erro ao salvar:', err);
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao salvar advertência.', type: 'error' });
          return false;
        }
      }
    });
  },

  homologar(id, nomeColaborador) {
    window.UI.confirmModal({
      title: 'Homologar Advertência?',
      message: `Deseja aprovar e oficializar a aplicação da advertência para <strong>${nomeColaborador}</strong>?`,
      confirmLabel: 'Homologar Advertência',
      onConfirm: async () => {
        try {
          await window.API.aprovarAdvertencia(id, 'Homologada e validada pelo Administrador Geral.');
          window.UI.toast({ title: 'Advertência Homologada', message: 'A medida foi aplicada oficialmente no sistema.' });
          await this.render(document.getElementById('main-content'));
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao homologar advertência.', type: 'error' });
        }
      }
    });
  },

  rejeitar(id, nomeColaborador) {
    const modalHtml = `
      <div class="space-y-3">
        <p class="text-xs text-slate-600 dark:text-slate-300">
          Informe o motivo pelo qual a solicitação de advertência para <strong>${nomeColaborador}</strong> está sendo rejeitada:
        </p>
        <textarea id="txt-motivo-rejeicao" rows="3" required placeholder="Justificativa da não aprovação..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"></textarea>
      </div>
    `;

    window.UI.openModal({
      title: 'Rejeitar Solicitação',
      subtitle: `Colaborador: ${nomeColaborador}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar Rejeição',
      onSave: async () => {
        const txt = (document.getElementById('txt-motivo-rejeicao')?.value || '').trim();
        if (txt.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Preencha a justificativa da rejeição.', type: 'warning' });
          return false;
        }

        try {
          await window.API.rejeitarAdvertencia(id, txt);
          window.UI.toast({ title: 'Solicitação Rejeitada', message: 'O registro foi arquivado como rejeitado.', type: 'warning' });
          await this.render(document.getElementById('main-content'));
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao rejeitar solicitação.', type: 'error' });
          return false;
        }
      }
    });
  },

  revogar(id, nomeColaborador) {
    const modalHtml = `
      <div class="space-y-3">
        <p class="text-xs text-slate-600 dark:text-slate-300">
          Informe a justificativa institucional para revogar a advertência de <strong>${nomeColaborador}</strong>:
        </p>
        <textarea id="txt-motivo-revogacao" rows="3" required placeholder="Ex: Cumprimento de termo de ajustamento de conduta ou retratação formal..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"></textarea>
      </div>
    `;

    window.UI.openModal({
      title: 'Revogar Advertência Aplicada',
      subtitle: `Colaborador: ${nomeColaborador}`,
      contentHtml: modalHtml,
      saveLabel: 'Confirmar Revogação',
      onSave: async () => {
        const txt = (document.getElementById('txt-motivo-revogacao')?.value || '').trim();
        if (txt.length < 3) {
          window.UI.toast({ title: 'Atenção', message: 'Preencha a justificativa da revogação.', type: 'warning' });
          return false;
        }

        try {
          await window.API.revogarAdvertencia(id, txt);
          window.UI.toast({ title: 'Advertência Revogada', message: 'A advertência foi revogada com sucesso.' });
          await this.render(document.getElementById('main-content'));
          return true;
        } catch (err) {
          window.UI.toast({ title: 'Erro', message: err.message || 'Falha ao revogar advertência.', type: 'error' });
          return false;
        }
      }
    });
  }
};
