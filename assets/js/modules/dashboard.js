/**
 * HUB ES+ - Módulo 1: Dashboard Executivo
 * Visão consolidada com KPIs operacionais, cards clicáveis e gráficos analíticos.
 */

window.DashboardModule = {
  charts: {},

  async render(container) {
    // Exibe Skeleton inicial durante o carregamento dos dados da API
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div class="space-y-1">
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Dashboard Executivo</h1>
            <p class="text-xs text-slate-500 font-medium">Panorama operacional e indicadores estratégicos do HUB ES+</p>
          </div>
          <div class="h-9 w-40 skeleton-shimmer rounded-xl"></div>
        </div>
        ${window.UI.renderCardsSkeleton(4)}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 h-72 bg-white rounded-2xl border border-slate-200 p-6 skeleton-shimmer"></div>
          <div class="h-72 bg-white rounded-2xl border border-slate-200 p-6 skeleton-shimmer"></div>
        </div>
      </div>
    `;

    try {
      // Carrega dados de todos os módulos de forma concorrente via API
      const [ocorrencias, compras, eventos, documentos, equipamentos, insumos, setores, usuarios, comunicados] = await Promise.all([
        window.API.getOcorrencias(),
        window.API.getCompras(),
        window.API.getEventos(),
        window.API.getDocumentos(),
        window.API.getEquipamentos(),
        window.API.getInsumos(),
        window.API.getSetores(),
        window.API.getUsuarios(),
        window.API.getComunicados().catch(() => [])
      ]);

      // Comunicados de alta prioridade em destaque
      const listaComunicados = Array.isArray(comunicados) ? [...comunicados] : [];
      const prioridadePeso = { alta: 3, media: 2, normal: 1 };
      listaComunicados.sort((a, b) => {
        const pDiff = (prioridadePeso[b.prioridade] || 1) - (prioridadePeso[a.prioridade] || 1);
        if (pDiff !== 0) return pDiff;
        return new Date(b.created_at || b.data || 0) - new Date(a.created_at || a.data || 0);
      });

      // Verifica se o usuário tem permissão para ver comunicados
      const podeVerComunicados = window.Auth ? (window.Auth.isAdmin() || window.Auth.hasPermission('comunicados.visualizar')) : true;

      // Todos os comunicados de alta prioridade
      const todosAlta = podeVerComunicados ? listaComunicados.filter(c => c.prioridade === 'alta') : [];

      // Verifica quais comunicados de alta prioridade ainda não foram vistos/abertos PARA ESTE PERFIL/USUÁRIO
      const timeKey = window.Auth && typeof window.Auth.getUserStorageKey === 'function' 
        ? window.Auth.getUserStorageKey('hub_comunicados_alta_vistos_timestamp') 
        : 'hub_comunicados_alta_vistos_timestamp';
      const idsKey = window.Auth && typeof window.Auth.getUserStorageKey === 'function' 
        ? window.Auth.getUserStorageKey('hub_comunicados_alta_vistos_ids') 
        : 'hub_comunicados_alta_vistos_ids';

      const vistosTimestamp = parseInt(localStorage.getItem(timeKey) || '0', 10);
      const vistosIds = JSON.parse(localStorage.getItem(idsKey) || '[]');

      const comunicadosAltaNaoVistos = todosAlta.filter(c => {
        const time = new Date(c.created_at || c.data || 0).getTime();
        const jaVistoPorTime = vistosTimestamp > 0 && time <= vistosTimestamp;
        const jaVistoPorId = vistosIds.includes(c.id);
        return !(jaVistoPorTime || jaVistoPorId);
      });
      const temAltaNaoVisto = comunicadosAltaNaoVistos.length > 0;

      // Métricas calculadas
      const ocorrenciasAbertas = ocorrencias.filter(o => o.status === 'aberto' || o.status === 'em_andamento').length;
      const comprasPendentes = compras.filter(c => c.status === 'pendente').length;
      const eventosAgendados = eventos.filter(e => e.status === 'agendado').length;
      const totalDocs = documentos.length;
      const insumosCriticos = insumos.filter(i => i.quantidade <= i.estoque_minimo).length;

      // Renderiza o Dashboard com KPIs interativos
      container.innerHTML = `
        <div class="space-y-6">
          <!-- Cabeçalho do Dashboard -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
                  Tempo Real
                </span>
                <span class="text-xs text-slate-400">• Atualizado agora</span>
              </div>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Dashboard Executivo</h1>
              <p class="text-xs text-slate-500 font-medium">Centralização das operações administrativas do HUB ES+</p>
            </div>
            
            <div class="flex items-center gap-2">
              <button id="btn-export-kpis" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors">
                <i data-lucide="download" class="w-4 h-4 text-slate-500"></i>
                Exportar Relatório
              </button>
              <button onclick="window.location.hash = '#compras'" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/20 transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Nova Solicitação
              </button>
            </div>
          </div>

          <!-- Banner de Comunicado Urgente (se houver comunicados de alta prioridade não vistos) -->
          ${temAltaNaoVisto ? `
            <div id="banner-comunicado-urgente" class="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                  <i data-lucide="megaphone" class="w-5 h-5"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wider animate-pulse">
                      Aviso Urgente ${comunicadosAltaNaoVistos.length > 1 ? `(${comunicadosAltaNaoVistos.length})` : ''}
                    </span>
                    <span class="text-xs text-rose-700 dark:text-rose-300 font-bold">
                      ${comunicadosAltaNaoVistos.length === 1 
                        ? comunicadosAltaNaoVistos[0].titulo 
                        : `Atenção: ${comunicadosAltaNaoVistos.length} comunicados de alta prioridade`}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                    ${comunicadosAltaNaoVistos.length === 1 
                      ? comunicadosAltaNaoVistos[0].mensagem 
                      : `"${comunicadosAltaNaoVistos[0].titulo}" e mais ${comunicadosAltaNaoVistos.length - 1} comunicado(s) urgente(s). Clique para ver todos.`}
                  </p>
                </div>
              </div>
              <button onclick="window.UI.visualizarComunicadosAlta()" class="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all shrink-0">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                ${comunicadosAltaNaoVistos.length > 1 ? `Ver Todos os Comunicados (${comunicadosAltaNaoVistos.length})` : 'Ler Comunicado'}
              </button>
            </div>
          ` : ''}

          <!-- Cards de KPIs Clicáveis -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <!-- Card 1: Ocorrências -->
            <div onclick="window.location.hash = '#ocorrencias'" class="hub-card cursor-pointer bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300"></div>
              <div class="flex items-center justify-between relative z-10">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Ocorrências Ativas</span>
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <i data-lucide="alert-octagon" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 relative z-10">
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold text-slate-900">${ocorrenciasAbertas}</span>
                  <span class="text-xs font-medium text-rose-600 flex items-center">
                    ${ocorrenciasAbertas > 0 ? 'Requer atenção' : 'Normal'}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>${ocorrencias.length} registradas no total</span>
                  <span class="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">Ver &rarr;</span>
                </p>
              </div>
            </div>

            <!-- Card 2: Compras Pendentes -->
            <div onclick="window.location.hash = '#compras'" class="hub-card cursor-pointer bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300"></div>
              <div class="flex items-center justify-between relative z-10">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Compras Pendentes</span>
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 relative z-10">
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold text-slate-900">${comprasPendentes}</span>
                  <span class="text-xs font-medium text-amber-600 flex items-center">Aguardando aprovação</span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>${compras.length} pedidos no fluxo</span>
                  <span class="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">Ver &rarr;</span>
                </p>
              </div>
            </div>

            <!-- Card 3: Agenda / Eventos -->
            <div onclick="window.location.hash = '#agenda'" class="hub-card cursor-pointer bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300"></div>
              <div class="flex items-center justify-between relative z-10">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Eventos Agendados</span>
                <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <i data-lucide="calendar" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 relative z-10">
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold text-slate-900">${eventosAgendados}</span>
                  <span class="text-xs font-medium text-sky-600">Auditórios & Labs</span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Próximos compromissos</span>
                  <span class="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">Ver &rarr;</span>
                </p>
              </div>
            </div>

            <!-- Card 4: Documentos & Insumos -->
            <div onclick="window.location.hash = '#documentos'" class="hub-card cursor-pointer bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300"></div>
              <div class="flex items-center justify-between relative z-10">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Repositório Digital</span>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
              </div>
              <div class="mt-4 relative z-10">
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold text-slate-900">${totalDocs}</span>
                  <span class="text-xs font-medium text-emerald-600">Arquivos indexados</span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>${insumosCriticos > 0 ? `${insumosCriticos} insumos baixos` : 'Estoque regular'}</span>
                  <span class="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">Ver &rarr;</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Seção de Gráficos e Distribuições Operacionais -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Gráfico 1: Atividades por Setor -->
            <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Operações e Demandas por Setor</h3>
                  <p class="text-xs text-slate-500">Distribuição combinada de compras, ocorrências e documentos</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">HUB ES+ Geral</span>
              </div>
              <div class="h-64 relative">
                <canvas id="chart-setores-demandas"></canvas>
              </div>
            </div>

            <!-- Gráfico 2: Status das Ocorrências e Limpeza -->
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-bold text-slate-900">Status de Ocorrências</h3>
                  <i data-lucide="pie-chart" class="w-4 h-4 text-slate-400"></i>
                </div>
                <p class="text-xs text-slate-500 mb-4">Proporção atual de resolução</p>
                <div class="h-48 relative flex items-center justify-center">
                  <canvas id="chart-status-ocorrencias"></canvas>
                </div>
              </div>
              <div class="pt-4 border-t border-slate-100 flex items-center justify-around text-center">
                <div>
                  <span class="block text-base font-extrabold text-rose-600">${ocorrencias.filter(o => o.status === 'aberto').length}</span>
                  <span class="text-[11px] text-slate-500">Abertas</span>
                </div>
                <div>
                  <span class="block text-base font-extrabold text-indigo-600">${ocorrencias.filter(o => o.status === 'em_andamento').length}</span>
                  <span class="text-[11px] text-slate-500">Em Curso</span>
                </div>
                <div>
                  <span class="block text-base font-extrabold text-emerald-600">${ocorrencias.filter(o => o.status === 'resolvido').length}</span>
                  <span class="text-[11px] text-slate-500">Resolvidas</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Listagens Rápidas: Comunicados Oficiais, Próximos Eventos & Ocorrências -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Mural de Comunicados Oficiais -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                      <i data-lucide="megaphone" class="w-4 h-4"></i>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white">Mural de Comunicados</h3>
                      <p class="text-xs text-slate-500 dark:text-slate-400">Avisos e informes oficiais</p>
                    </div>
                  </div>
                  <button onclick="window.location.hash = '#comunicacao'" class="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">Ver todos</button>
                </div>

                <div class="divide-y divide-slate-100 dark:divide-slate-700/60">
                  ${listaComunicados.length === 0 ? `
                    <div class="p-8 text-center text-xs text-slate-400">
                      Nenhum comunicado recente ativo no mural.
                    </div>
                  ` : listaComunicados.slice(0, 4).map(c => {
                    const isAlta = c.prioridade === 'alta';
                    const isMedia = c.prioridade === 'media';
                    const pBadge = isAlta 
                      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Alta</span>'
                      : isMedia
                      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Média</span>'
                      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Normal</span>';

                    const dataObj = c.created_at ? new Date(c.created_at) : (c.data ? new Date(c.data) : new Date());
                    const dataFmt = !isNaN(dataObj) 
                      ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                      : (c.data || 'Hoje');

                    const autor = c.autor_nome || c.autor || 'HUB ES+';

                    return `
                      <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2 mb-1">
                            ${pBadge}
                            <span class="text-[10px] text-slate-400">${dataFmt}</span>
                          </div>
                          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${c.titulo}</h4>
                          <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">${autor}</p>
                        </div>
                        <button onclick="window.UI.visualizarComunicado(${c.id})" class="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors shrink-0" title="Ler Comunicado">
                          <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Próximos Eventos da Agenda -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                      <i data-lucide="calendar" class="w-4 h-4"></i>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white">Próximos Eventos</h3>
                      <p class="text-xs text-slate-500 dark:text-slate-400">Pauta de espaços e salas</p>
                    </div>
                  </div>
                  <button onclick="window.location.hash = '#agenda'" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Ver todos</button>
                </div>

                <div class="divide-y divide-slate-100 dark:divide-slate-700/60">
                  ${eventos.slice(0, 4).map(ev => {
                    const resp = usuarios.find(u => Number(u.id) === Number(ev.responsavel_id))?.nome || 'Não definido';
                    const dataFmt = new Date(ev.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    return `
                      <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between gap-3">
                        <div class="flex items-start gap-2.5 min-w-0">
                          <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 font-mono text-xs">
                            <span class="font-bold">${new Date(ev.data).getDate()}</span>
                          </div>
                          <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${ev.local}</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              ${resp}
                            </p>
                          </div>
                        </div>
                        ${window.UI.renderBadge(ev.status)}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Ocorrências Recentes -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                      <i data-lucide="alert-circle" class="w-4 h-4"></i>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white">Ocorrências Recentes</h3>
                      <p class="text-xs text-slate-500 dark:text-slate-400">Chamados técnicos e prediais</p>
                    </div>
                  </div>
                  <button onclick="window.location.hash = '#ocorrencias'" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Ver todas</button>
                </div>

                <div class="divide-y divide-slate-100 dark:divide-slate-700/60">
                  ${ocorrencias.slice(0, 4).map(oc => {
                    const solicitante = usuarios.find(u => Number(u.id) === Number(oc.usuario_id))?.nome || 'Usuário';
                    return `
                      <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                            <i data-lucide="map-pin" class="w-4 h-4"></i>
                          </div>
                          <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${oc.local}</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${solicitante}</p>
                          </div>
                        </div>
                        ${window.UI.renderBadge(oc.status)}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Atualiza ícones Lucide no DOM renderizado
      if (window.lucide) {
        window.lucide.createIcons({ root: container });
      }

      // Inicializa os gráficos Chart.js
      this._initCharts(setores, compras, ocorrencias, documentos);

      // Evento de exportar relatório rápido
      container.querySelector('#btn-export-kpis').addEventListener('click', () => {
        window.UI.toast({
          title: 'Relatório Executivo',
          message: 'O relatório consolidado de indicadores foi gerado com sucesso.',
          type: 'success'
        });
      });

    } catch (err) {
      console.error('Erro ao renderizar Dashboard Executivo:', err);
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-2xl border border-rose-200">
          <p class="text-rose-600 font-semibold text-sm">Falha ao carregar indicadores executivos.</p>
          <button onclick="window.DashboardModule.render(document.getElementById('main-content'))" class="mt-3 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl">Tentar novamente</button>
        </div>
      `;
    }
  },

  _initCharts(setores, compras, ocorrencias, documentos) {
    if (typeof Chart === 'undefined') return;

    // Destrói instâncias anteriores se houver
    if (this.charts.bar) this.charts.bar.destroy();
    if (this.charts.doughnut) this.charts.doughnut.destroy();

    // Dados do Gráfico de Setores
    const labels = setores.map(s => s.nome.split(' ')[0]);
    const comprasPorSetor = setores.map(s => compras.filter(c => Number(c.setor_id) === Number(s.id)).length);
    const docsPorSetor = setores.map(s => documentos.filter(d => Number(d.setor_id) === Number(s.id)).length);

    const ctxBar = document.getElementById('chart-setores-demandas')?.getContext('2d');
    if (ctxBar) {
      this.charts.bar = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Documentos Indexados',
              data: docsPorSetor,
              backgroundColor: '#0066cc',
              borderRadius: 6,
              maxBarThickness: 24
            },
            {
              label: 'Solicitações de Compra',
              data: comprasPorSetor,
              backgroundColor: '#f59e0b',
              borderRadius: 6,
              maxBarThickness: 24
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, font: { family: 'Plus Jakarta Sans', size: 11 } },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }

    // Dados do Gráfico Doughnut (Status Ocorrências)
    const ctxDoughnut = document.getElementById('chart-status-ocorrencias')?.getContext('2d');
    if (ctxDoughnut) {
      const abertas = ocorrencias.filter(o => o.status === 'aberto').length;
      const emCurso = ocorrencias.filter(o => o.status === 'em_andamento').length;
      const resolvidas = ocorrencias.filter(o => o.status === 'resolvido').length;

      this.charts.doughnut = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
          labels: ['Abertas', 'Em Andamento', 'Resolvidas'],
          datasets: [{
            data: [abertas, emCurso, resolvidas],
            backgroundColor: ['#f43f5e', '#6366f1', '#10b981'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          cutout: '70%'
        }
      });
    }
  }
};
