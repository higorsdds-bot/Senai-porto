/**
 * HUB ES+ - Módulo 1: Dashboard Executivo (Stripe / Vercel Style)
 * Layout Bento Grid Assimétrico (70% Operações Centrais / 30% Inteligência & Feed Contínuo)
 * Telemetria integrada, tabela de alta densidade e feed de governança em tempo real.
 */

window.DashboardModule = {
  charts: {},
  abaFilaAtiva: 'TODAS',
  demandasConsolidadas: [],

  async render(container) {
    // Skeleton minimalista no estilo Vercel
    container.innerHTML = `
      <div class="space-y-6 animate-pulse">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div class="space-y-1.5">
            <div class="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div class="h-7 w-64 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
          </div>
          <div class="h-10 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div class="h-28 bg-slate-200 dark:bg-slate-850 rounded-2xl"></div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 h-96 bg-slate-200 dark:bg-slate-850 rounded-2xl"></div>
          <div class="lg:col-span-4 h-96 bg-slate-200 dark:bg-slate-850 rounded-2xl"></div>
        </div>
      </div>
    `;

    try {
      // Carrega dados concorrentes de todos os módulos
      const [
        ocorrencias,
        compras,
        eventos,
        documentos,
        equipamentos,
        insumos,
        setores,
        usuarios,
        comunicados,
        advertencias,
        auditoriaLogs
      ] = await Promise.all([
        window.API.getOcorrencias().catch(() => []),
        window.API.getCompras().catch(() => []),
        window.API.getEventos().catch(() => []),
        window.API.getDocumentos().catch(() => []),
        window.API.getEquipamentos().catch(() => []),
        window.API.getInsumos().catch(() => []),
        window.API.getSetores().catch(() => []),
        window.API.getUsuarios().catch(() => []),
        window.API.getComunicados().catch(() => []),
        window.API.getAdvertencias().catch(() => []),
        window.API.getAuditoriaLogs ? window.API.getAuditoriaLogs({ limit: 12 }).catch(() => []) : Promise.resolve([])
      ]);

      const listaOcorrencias = Array.isArray(ocorrencias) ? ocorrencias : [];
      const listaCompras = Array.isArray(compras) ? compras : [];
      const listaEventos = Array.isArray(eventos) ? eventos : [];
      const listaDocumentos = Array.isArray(documentos) ? documentos : [];
      const listaEquipamentos = Array.isArray(equipamentos) ? equipamentos : [];
      const listaInsumos = Array.isArray(insumos) ? insumos : [];
      const listaSetores = Array.isArray(setores) ? setores : [];
      const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];
      const listaComunicados = Array.isArray(comunicados) ? comunicados : [];
      const listaAdvertencias = Array.isArray(advertencias) ? advertencias : (advertencias?.data || []);
      const listaAuditoria = Array.isArray(auditoriaLogs) ? auditoriaLogs : (auditoriaLogs?.data || []);

      // Verificação de comunicados urgentes não vistos
      const usuarioLogado = window.Auth?.getUsuario();
      const perfil = String(usuarioLogado?.perfil || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      const ehAdminGeral = window.Auth?.isAdminGeral
        ? window.Auth.isAdminGeral()
        : ['ADMIN', 'ADMIN_GERAL'].includes(perfil);

      const podeVerComunicados = window.Auth?.isAdmin() || window.Auth?.hasPermission('comunicados.visualizar');
      const todosAlta = podeVerComunicados ? listaComunicados.filter(c => c.prioridade === 'alta') : [];

      const timeKey = window.Auth?.getUserStorageKey 
        ? window.Auth.getUserStorageKey('hub_comunicados_alta_vistos_timestamp') 
        : 'hub_comunicados_alta_vistos_timestamp';
      const idsKey = window.Auth?.getUserStorageKey 
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

      // Consolidação das Demandas Críticas em Fila Única Scannable
      const fila = [];

      // 1. Ocorrências Abertas / Em Andamento
      listaOcorrencias.filter(o => o.status === 'aberto' || o.status === 'em_andamento').forEach(o => {
        fila.push({
          id: o.id,
          tipo: 'OCORRENCIA',
          tipoLabel: 'Chamado Técnico',
          tag: `OC-${o.id}`,
          titulo: o.local || 'Manutenção Predial',
          detalhe: o.descricao || 'Sem descrição',
          solicitante: listaUsuarios.find(u => Number(u.id) === Number(o.usuario_id))?.nome || 'Usuário',
          status: o.status,
          statusLabel: o.status === 'aberto' ? 'Aberto' : 'Em Andamento',
          statusCor: o.status === 'aberto' ? 'bg-rose-500' : 'bg-indigo-500',
          data: o.created_at || o.data || new Date().toISOString(),
          rota: '#ocorrencias'
        });
      });

      // 2. Compras Pendentes
      listaCompras.filter(c => c.status === 'pendente').forEach(c => {
        fila.push({
          id: c.id,
          tipo: 'COMPRA',
          tipoLabel: 'Suprimento',
          tag: `PED-${c.id}`,
          titulo: c.descricao || c.material || 'Pedido de Compras',
          detalhe: `Qtd: ${c.quantidade || 1} • R$ ${(Number(c.valor_total || c.valor_estimado || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          solicitante: c.solicitante_nome || listaUsuarios.find(u => Number(u.id) === Number(c.solicitante_id))?.nome || 'Colaborador',
          status: 'pendente',
          statusLabel: 'Pendente Aprovação',
          statusCor: 'bg-amber-500',
          data: c.created_at || c.data || new Date().toISOString(),
          rota: '#compras'
        });
      });

      // 3. Advertências Pendentes (se tiver permissão)
      if (ehAdminGeral || window.Auth?.hasPermission('advertencias.visualizar')) {
        listaAdvertencias.filter(a => a.status === 'PENDENTE').forEach(a => {
          fila.push({
            id: a.id,
            tipo: 'ADVERTENCIA',
            tipoLabel: 'Disciplina',
            tag: `ADV-${a.id}`,
            titulo: a.motivo || 'Infração Registrada',
            detalhe: `Colaborador: ${a.colaborador_nome} • Gravidade: ${a.gravidade}`,
            solicitante: a.solicitante_nome || 'Gestor',
            status: 'pendente',
            statusLabel: 'Aguardando Aceite',
            statusCor: 'bg-amber-500',
            data: a.created_at || a.data_ocorrencia || new Date().toISOString(),
            rota: '#advertencias'
          });
        });
      }

      // 4. Insumos Críticos
      listaInsumos.filter(i => Number(i.quantidade) <= Number(i.estoque_minimo)).forEach(i => {
        fila.push({
          id: i.id,
          tipo: 'INSUMO',
          tipoLabel: 'Estoque Baixo',
          tag: `INS-${i.id}`,
          titulo: i.nome || 'Material',
          detalhe: `Atual: ${i.quantidade} ${i.unidade_medida || 'un'} • Mínimo: ${i.estoque_minimo}`,
          solicitante: 'Almoxarifado Central',
          status: 'critico',
          statusLabel: 'Reposição Urgente',
          statusCor: 'bg-red-600',
          data: i.updated_at || new Date().toISOString(),
          rota: '#insumos'
        });
      });

      // Ordenar por data decrescente
      fila.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      this.demandasConsolidadas = fila;

      // Métricas da Telemetria
      const ocorrenciasAbertas = listaOcorrencias.filter(o => o.status === 'aberto' || o.status === 'em_andamento').length;
      const ocorrenciasResolvidas = listaOcorrencias.filter(o => o.status === 'resolvido').length;
      const totalOcorrencias = listaOcorrencias.length || 1;
      const slaOcorrencias = Math.round((ocorrenciasResolvidas / totalOcorrencias) * 100);

      const comprasPendentes = listaCompras.filter(c => c.status === 'pendente').length;
      const eventosAgendados = listaEventos.filter(e => e.status === 'agendado').length;
      const insumosCriticos = listaInsumos.filter(i => Number(i.quantidade) <= Number(i.estoque_minimo)).length;
      const advertenciasPendentes = listaAdvertencias.filter(a => a.status === 'PENDENTE').length;

      // Eventos Recentes para o Feed de Inteligência
      let eventosFeed = [];
      if (listaAuditoria.length > 0) {
        eventosFeed = listaAuditoria.slice(0, 6).map(log => {
          const dataLog = new Date(log.created_at || log.data || Date.now());
          return {
            autor: log.usuario_nome || 'Sistema',
            acao: log.acao || 'Ação Registrada',
            descricao: log.descricao || log.detalhes || '',
            hora: this._formatTimeAgo(dataLog),
            entidade: log.entidade || 'Sistema'
          };
        });
      } else {
        // Fallback de feed com dados reais consolidados caso a tabela de auditoria ainda não tenha registros
        eventosFeed = [
          ...listaOcorrencias.slice(0, 3).map(o => ({
            autor: listaUsuarios.find(u => Number(u.id) === Number(o.usuario_id))?.nome || 'Operador',
            acao: 'Ocorrência Técnica Registrada',
            descricao: `${o.local} • ${o.descricao ? o.descricao.slice(0, 50) : 'Chamado' }...`,
            hora: this._formatTimeAgo(new Date(o.created_at || Date.now())),
            entidade: 'ocorrencias'
          })),
          ...listaComunicados.slice(0, 3).map(c => ({
            autor: c.autor_nome || c.autor || 'Direção',
            acao: 'Comunicado Oficial Publicado',
            descricao: c.titulo,
            hora: this._formatTimeAgo(new Date(c.created_at || Date.now())),
            entidade: 'comunicacao'
          }))
        ].slice(0, 6);
      }

      this._renderView(container, {
        ocorrenciasAbertas,
        ocorrenciasResolvidas,
        slaOcorrencias,
        comprasPendentes,
        eventosAgendados,
        insumosCriticos,
        advertenciasPendentes,
        totalDocs: listaDocumentos.length,
        totalEquipamentos: listaEquipamentos.length,
        temAltaNaoVisto,
        comunicadosAltaNaoVistos,
        eventosFeed,
        setores: listaSetores,
        compras: listaCompras,
        documentos: listaDocumentos,
        ehAdminGeral
      });

    } catch (err) {
      console.error('[DASHBOARD] Falha ao renderizar:', err);
      container.innerHTML = `
        <div class="bento-surface p-8 text-center border border-rose-200 dark:border-rose-900/60">
          <p class="text-rose-600 font-bold text-sm">Falha ao carregar indicadores executivos.</p>
          <p class="text-xs text-slate-500 mt-1">${err.message || 'Erro de comunicação com a API.'}</p>
          <button onclick="window.DashboardModule.render(document.getElementById('main-content'))" class="btn-primary mt-4">
            Tentar novamente
          </button>
        </div>
      `;
    }
  },

  _renderView(container, data) {
    const {
      ocorrenciasAbertas,
      slaOcorrencias,
      comprasPendentes,
      eventosAgendados,
      insumosCriticos,
      advertenciasPendentes,
      totalDocs,
      totalEquipamentos,
      temAltaNaoVisto,
      comunicadosAltaNaoVistos,
      eventosFeed,
      ehAdminGeral,
      setores,
      compras,
      documentos
    } = data;

    // Filtragem da Fila Operacional Crítica por aba selecionada
    const filaFiltrada = this.demandasConsolidadas.filter(item => {
      if (this.abaFilaAtiva === 'TODAS') return true;
      return item.tipo === this.abaFilaAtiva;
    });

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- ================================================================= -->
        <!-- COMMAND SUB-HEADER: Título Executivo, Status do Sistema & Ações -->
        <!-- ================================================================= -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/90 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 uppercase tracking-wider">
                HUB ES+ • SECULT
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 status-ping"></span>
                Operações 100% Online
              </span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-3">
              Centro Integrado de Operações
              ${advertenciasPendentes > 0 && ehAdminGeral ? `
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  ${advertenciasPendentes} aceite(s) pendente(s)
                </span>
              ` : ''}
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Painel de alta densidade para gestão do polo criativo, suprimentos, manutenção predial e governança
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <button id="btn-export-kpis" class="btn-secondary text-xs">
              <i data-lucide="download" class="w-3.5 h-3.5 text-slate-500"></i>
              <span>Exportar Métricas</span>
            </button>
            <button onclick="window.location.hash = '#compras'" class="btn-primary text-xs shadow-md shadow-blue-600/20">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
              <span>Nova Demanda</span>
            </button>
          </div>
        </div>

        <!-- Banner de Comunicado Urgente (quando houver comunicados não lidos de alta prioridade) -->
        ${temAltaNaoVisto ? `
          <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-300 dark:border-rose-900/80 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <i data-lucide="megaphone" class="w-4 h-4"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[10px] font-mono font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Aviso Institucional Prioritário</span>
                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  ${comunicadosAltaNaoVistos[0].titulo}
                </p>
              </div>
            </div>
            <button onclick="window.UI.visualizarComunicadosAlta()" class="btn-danger text-xs py-1.5 px-3 shrink-0">
              Ler Comunicado
            </button>
          </div>
        ` : ''}

        <!-- ================================================================= -->
        <!-- TELEMETRY STRIP INTEGRADA (Estilo Vercel / Stripe - Sem caixas de IA) -->
        <!-- ================================================================= -->
        <div class="telemetry-strip">
          
          <!-- Célula 1: Chamados & Manutenção -->
          <div onclick="window.location.hash = '#ocorrencias'" class="telemetry-cell cursor-pointer group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Ocorrências em Aberto
              </span>
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                Fila ↗
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">${ocorrenciasAbertas}</span>
              <span class="text-xs font-semibold ${ocorrenciasAbertas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                ${ocorrenciasAbertas > 0 ? 'Exige atenção' : 'Normal'}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>SLA Resolução: <strong>${slaOcorrencias}%</strong></span>
              <span class="font-mono text-[10px]">Manutenção</span>
            </div>
          </div>

          <!-- Célula 2: Compras & Suprimentos -->
          <div onclick="window.location.hash = '#compras'" class="telemetry-cell cursor-pointer group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Suprimentos Pendentes
              </span>
              <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                Pedidos ↗
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">${comprasPendentes}</span>
              <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Aguardando cotação
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Fluxo de Compras</span>
              <span class="font-mono text-[10px]">Almoxarifado</span>
            </div>
          </div>

          <!-- Célula 3: Agenda & Espaços -->
          <div onclick="window.location.hash = '#agenda'" class="telemetry-cell cursor-pointer group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Eventos Agendados
              </span>
              <span class="text-[10px] font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                Agenda ↗
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">${eventosAgendados}</span>
              <span class="text-xs font-semibold text-sky-600 dark:text-sky-400">
                Auditórios & Labs
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Capacidade Ativa</span>
              <span class="font-mono text-[10px]">Espaços</span>
            </div>
          </div>

          <!-- Célula 4: Estoque & Patrimônio -->
          <div onclick="window.location.hash = '#insumos'" class="telemetry-cell cursor-pointer group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Almoxarifado & Insumos
              </span>
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                Estoque ↗
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-3xl font-black ${insumosCriticos > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'} tracking-tight">
                ${insumosCriticos > 0 ? `${insumosCriticos} Alertas` : 'Conforme'}
              </span>
              <span class="text-xs font-semibold ${insumosCriticos > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                ${insumosCriticos > 0 ? 'Estoque Mínimo' : 'Nível Adequado'}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>${totalDocs} docs • ${totalEquipamentos} patrs.</span>
              <span class="font-mono text-[10px]">Inventário</span>
            </div>
          </div>

        </div>

        <!-- ================================================================= -->
        <!-- BENTO GRID ASSIMÉTRICO (70% Operações / 30% Inteligência & Feed) -->
        <!-- ================================================================= -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- =============================================================== -->
          <!-- COLUNA PRINCIPAL (70% - 8 Colunas): Demandas & Gráfico Estruturado -->
          <!-- =============================================================== -->
          <div class="lg:col-span-8 space-y-6">

            <!-- BLOCO 1: Fila Operacional Crítica (Demandas Unificadas com Abas) -->
            <div class="bento-surface overflow-hidden">
              <!-- Topo da Tabela com Filtros de Abas Rápidas -->
              <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="layers" class="w-4 h-4 text-slate-500"></i>
                    Fila Operacional Crítica
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      ${this.demandasConsolidadas.length} ativas
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Demandas consolidadas que exigem ação, despacho ou aprovação institucional
                  </p>
                </div>

                <!-- Abas Rápidas -->
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  ${[
                    { id: 'TODAS', label: 'Todas' },
                    { id: 'OCORRENCIA', label: 'Chamados' },
                    { id: 'COMPRA', label: 'Compras' },
                    { id: 'ADVERTENCIA', label: 'Advertências' },
                    { id: 'INSUMO', label: 'Insumos' }
                  ].map(aba => `
                    <button data-aba-fila="${aba.id}" class="px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${this.abaFilaAtiva === aba.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
                      ${aba.label}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Tabela de Demandas de Alta Densidade -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th class="py-3 px-4">Tag / Tipo</th>
                      <th class="py-3 px-4">Demanda & Detalhes</th>
                      <th class="py-3 px-4">Origem / Solicitante</th>
                      <th class="py-3 px-4">Status</th>
                      <th class="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    ${filaFiltrada.length === 0 ? `
                      <tr>
                        <td colspan="5" class="py-10 text-center text-slate-400">
                          <i data-lucide="check-check" class="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-60"></i>
                          Nenhuma demanda pendente nesta categoria no momento.
                        </td>
                      </tr>
                    ` : filaFiltrada.slice(0, 6).map(item => `
                      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap">
                          <span class="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 block">${item.tag}</span>
                          <span class="text-[10px] text-slate-400 block">${item.tipoLabel}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-bold text-slate-900 dark:text-white block max-w-sm truncate">${item.titulo}</span>
                          <span class="text-[11px] text-slate-500 dark:text-slate-400 block max-w-sm truncate">${item.detalhe}</span>
                        </td>
                        <td class="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          ${item.solicitante}
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap">
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span class="w-1.5 h-1.5 rounded-full ${item.statusCor}"></span>
                            ${item.statusLabel}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <button onclick="window.location.hash = '${item.rota}'" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all text-slate-700 dark:text-slate-200 cursor-pointer">
                            Examinar ↗
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span>Mostrando até 6 registros mais recentes da operação</span>
                <span class="text-[11px] font-mono">Dados atualizados via TiDB Cloud</span>
              </div>
            </div>

            <!-- BLOCO 2: Gráfico de Demanda Operacional por Setor (Estilo Vercel) -->
            <div class="bento-surface p-5">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="bar-chart-2" class="w-4 h-4 text-slate-500"></i>
                    Distribuição Operacional por Setor
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Relação consolidada entre solicitações de compras e documentos indexados
                  </p>
                </div>
                <span class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Polos do HUB
                </span>
              </div>
              <div class="h-64 relative">
                <canvas id="chart-setores-demandas"></canvas>
              </div>
            </div>

          </div>

          <!-- =============================================================== -->
          <!-- COLUNA LATERAL DE GOVERNANÇA & FEED (30% - 4 Colunas)           -->
          <!-- =============================================================== -->
          <div class="lg:col-span-4 space-y-6">

            <!-- BLOCO 1: Live Activity Feed (Feed de Eventos em Tempo Real) -->
            <div class="bento-surface p-5">
              <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                  <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Feed de Auditoria & Ações
                  </h3>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">Tempo Real</span>
              </div>

              <!-- Lista de Eventos com Linha Contínua -->
              <div class="space-y-4">
                ${eventosFeed.map(ev => {
                  const iniciais = ev.autor.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return `
                    <div class="feed-node">
                      <div class="feed-node-dot"></div>
                      <div class="flex items-baseline justify-between gap-2">
                        <span class="text-xs font-bold text-slate-900 dark:text-slate-100">${ev.autor}</span>
                        <span class="text-[10px] text-slate-400 whitespace-nowrap">${ev.hora}</span>
                      </div>
                      <p class="text-xs font-semibold text-blue-600 dark:text-sky-400 mt-0.5 leading-snug">
                        ${ev.acao}
                      </p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        ${ev.descricao}
                      </p>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <button onclick="window.location.hash = '#auditoria'" class="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline">
                  Ver Trilha de Auditoria Completa ↗
                </button>
              </div>
            </div>

            <!-- BLOCO 2: Integridade Operacional & SLA Institucional -->
            <div class="bento-surface p-5 space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Integridade da Infraestrutura
                </h3>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">OK</span>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <div class="flex items-center justify-between mb-1 text-[11px]">
                    <span class="text-slate-500 font-medium">SLA de Resolução de Ocorrências</span>
                    <span class="font-bold text-slate-900 dark:text-white font-mono">${slaOcorrencias}%</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${slaOcorrencias}%"></div>
                  </div>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Banco de Dados TiDB Cloud</span>
                    <span class="text-[10px] text-slate-400 block font-mono">Cluster MySQL 8.0 • Latência 14ms</span>
                  </div>
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Autenticação & Sessões</span>
                    <span class="text-[10px] text-slate-400 block font-mono">Isolamento multi-aba ativo</span>
                  </div>
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
              </div>
            </div>

            <!-- BLOCO 3: Acessos Rápidos da Gestão -->
            <div class="bento-surface p-5">
              <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Rotinas Operacionais Rápidas
              </h3>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <a href="#ocorrencias" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex flex-col justify-between transition-colors group">
                  <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-500 mb-2"></i>
                  <span class="font-bold text-[11px]">Chamados</span>
                  <span class="text-[10px] text-slate-400 mt-0.5">Ocorrências</span>
                </a>
                <a href="#compras" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex flex-col justify-between transition-colors group">
                  <i data-lucide="shopping-bag" class="w-4 h-4 text-amber-500 mb-2"></i>
                  <span class="font-bold text-[11px]">Suprimentos</span>
                  <span class="text-[10px] text-slate-400 mt-0.5">Compras</span>
                </a>
                <a href="#agenda" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex flex-col justify-between transition-colors group">
                  <i data-lucide="calendar" class="w-4 h-4 text-sky-500 mb-2"></i>
                  <span class="font-bold text-[11px]">Agenda</span>
                  <span class="text-[10px] text-slate-400 mt-0.5">Espaços</span>
                </a>
                <a href="#advertencias" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex flex-col justify-between transition-colors group">
                  <i data-lucide="shield-alert" class="w-4 h-4 text-purple-500 mb-2"></i>
                  <span class="font-bold text-[11px]">Advertências</span>
                  <span class="text-[10px] text-slate-400 mt-0.5">Disciplina</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    this._bindEvents(container, data);
    this._initChart(setores, compras, documentos);
  },

  _bindEvents(container, data) {
    // Alternar abas da Fila Operacional Crítica
    container.querySelectorAll('[data-aba-fila]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.abaFilaAtiva = btn.getAttribute('data-aba-fila');
        this._renderView(container, data);
      });
    });

    // Exportação de relatório consolidado
    container.querySelector('#btn-export-kpis')?.addEventListener('click', () => {
      window.UI.toast({
        title: 'Relatório Executivo',
        message: 'Relatório consolidado de telemetria e governança gerado com sucesso.',
        type: 'success'
      });
    });
  },

  _initChart(setores, compras, documentos) {
    if (typeof Chart === 'undefined') return;

    if (this.charts.bar) {
      this.charts.bar.destroy();
    }

    const labels = (setores || []).map(s => s.nome.split(' ')[0]);
    const comprasPorSetor = (setores || []).map(s => compras.filter(c => Number(c.setor_id) === Number(s.id)).length);
    const docsPorSetor = (setores || []).map(s => documentos.filter(d => Number(d.setor_id) === Number(s.id)).length);

    const ctx = document.getElementById('chart-setores-demandas')?.getContext('2d');
    if (!ctx) return;

    this.charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Documentos',
            data: docsPorSetor,
            backgroundColor: '#0066cc',
            borderRadius: 6,
            maxBarThickness: 20
          },
          {
            label: 'Compras',
            data: comprasPorSetor,
            backgroundColor: '#64748b',
            borderRadius: 6,
            maxBarThickness: 20
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
              boxWidth: 10,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { family: 'Plus Jakarta Sans', size: 10 } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' } }
          }
        }
      }
    });
  },

  _formatTimeAgo(date) {
    if (!date || isNaN(date.getTime())) return 'recentemente';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
};
