/**
 * HUB ES+ - Aplicação Principal e Roteador SPA (app.js)
 * Gerencia a navegação entre todos os 10 módulos através de rotas por Hash (#modulo),
 * sincroniza os estados de navegação na sidebar, menu mobile e topbar.
 */

class AppRouter {
  constructor() {
    this.contentContainer = null;
    this.mobileMenu = null;
    this.currentRoute = '';
    
    // Mapeamento dos 10 módulos exigidos
    this.routes = {
      'dashboard': {
        title: 'Dashboard Executivo',
        module: window.DashboardModule,
        navId: 'nav-dashboard',
        moduleKey: 'dashboard',
        permissions: ['dashboard.visualizar']
      },
      'documentos': {
        title: 'Gestão Documental',
        module: window.DocumentosModule,
        navId: 'nav-documentos',
        moduleKey: 'documentos',
        permissions: ['documentos.visualizar']
      },
      'insumos': {
        title: 'Controle de Insumos',
        module: window.InsumosModule,
        navId: 'nav-insumos',
        moduleKey: 'insumos',
        permissions: ['insumos.visualizar']
      },
      'compras': {
        title: 'Compras & Suprimentos',
        module: window.ComprasModule,
        navId: 'nav-compras',
        moduleKey: 'compras',
        permissions: ['compras.visualizar', 'compras.visualizar_pedidos', 'compras.visualizar_proprias']
      },
      'agenda': {
        title: 'Agenda Inteligente',
        module: window.AgendaModule,
        navId: 'nav-agenda',
        moduleKey: 'agenda',
        permissions: ['eventos.visualizar']
      },
      'ocorrencias': {
        title: 'Ocorrências Técnicas',
        module: window.OcorrenciasModule || (window.Modules && window.Modules.ocorrencias),
        navId: 'nav-ocorrencias',
        moduleKey: 'ocorrencias',
        permissions: ['ocorrencias.visualizar']
      },
      'comunicacao': {
        title: 'Central de Comunicação',
        module: window.ComunicacaoModule,
        navId: 'nav-comunicacao',
        moduleKey: 'comunicacao',
        permissions: ['comunicados.visualizar']
      },
      'indicadores': {
        title: 'Painel de Indicadores',
        module: window.IndicadoresModule,
        navId: 'nav-indicadores',
        moduleKey: 'indicadores',
        permissions: ['indicadores.visualizar']
      },
      'limpeza': {
        title: 'Controle de Limpeza',
        module: window.LimpezaModule,
        navId: 'nav-limpeza',
        moduleKey: 'limpeza',
        permissions: ['limpeza.visualizar']
      },
      'equipamentos': {
        title: 'Controle de Equipamentos',
        module: window.EquipamentosModule,
        navId: 'nav-equipamentos',
        moduleKey: 'equipamentos',
        permissions: ['equipamentos.visualizar']
      },
      'usuarios': {
        title: 'Gestão de Usuários',
        module: window.UsuariosModule || (window.Modules && window.Modules.usuarios),
        navId: 'nav-usuarios',
        moduleKey: 'usuarios',
        permissions: ['usuarios.visualizar', 'usuarios.pre_cadastrar']
      },
      'auditoria': {
        title: 'Auditoria & Governança',
        module: window.AuditoriaModule || (window.Modules && window.Modules.auditoria),
        navId: 'nav-auditoria',
        adminOnly: true,
        moduleKey: 'auditoria',
        permissions: ['auditoria.visualizar']
      }
    };
  }

  init() {
    this.contentContainer = document.getElementById('main-content');
    this.mobileMenu = document.getElementById('mobile-drawer');

    // Listener para mudanças no hash da URL
    window.addEventListener('hashchange', () => this.handleRoute());

    // Inicialização da interface e eventos globais
    this._setupGlobalEvents();
    window.addEventListener('hub:login', () => {
      this.atualizarVisibilidadeRotas();
      this.atualizarBadgeComunicados();
      this.handleRoute();
    });

    // Atualiza imediatamente a visibilidade dos links no menu
    this.atualizarVisibilidadeRotas();

    // Atualiza badge de comunicados na inicialização e a cada 60s
    this.atualizarBadgeComunicados();
    setInterval(() => this.atualizarBadgeComunicados(), 60000);

    // Rota inicial
    this.handleRoute();
  }

  handleRoute() {
    let hash = window.location.hash.replace('#', '').trim().toLowerCase();

    // Rota de ativação de conta com link seguro de uso único
    if (hash.startsWith('ativar-conta')) {
      const token = window.Auth?.verificarRotaAtivacao?.();
      if (token) {
        window.Auth.mostrarTelaAtivacao(token);
        return;
      }
    }

    const isVisitante = window.Auth?.isVisitante();

    // REGRA ESTRITA DE VISITANTE:
    // Visitante (anônimo ou com perfil VISITANTE) SÓ PODE ACESSAR comunicacao e agenda.
    if (isVisitante) {
      if (!hash || (hash !== 'comunicacao' && hash !== 'agenda')) {
        if (hash && hash !== 'comunicacao' && hash !== 'agenda') {
          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Acesso Restrito a Visitantes',
              message: 'Como visitante, seu acesso é restrito à Central de Comunicação e à Agenda.',
              type: 'warning'
            });
          }
        }
        window.location.hash = '#comunicacao';
        this.atualizarVisibilidadeRotas();
        return;
      }
    }

    // Calcula rota padrão dinâmica com base nas permissões reais do perfil autenticado
    let defaultRoute = 'dashboard';
    if (isVisitante) {
      defaultRoute = 'comunicacao';
    } else if (window.Auth?.estaLogado()) {
      if (this.routes['dashboard'] && this._canAccess(this.routes['dashboard'])) {
        defaultRoute = 'dashboard';
      } else {
        const allowed = Object.entries(this.routes).find(([, route]) => this._canAccess(route));
        if (allowed) {
          defaultRoute = allowed[0];
        }
      }
    }

    if (!hash || !this.routes[hash]) {
      hash = defaultRoute;
      window.location.hash = `#${defaultRoute}`;
      return;
    }

    this.currentRoute = hash;
    const target = this.routes[hash];

    // Atualiza visibilidade dos menus para a rota atual
    this.atualizarVisibilidadeRotas();

    if (window.Auth?.estaLogado() && !window.Auth.permissionsReady && !isVisitante) {
      this.contentContainer.innerHTML = '<p class="p-6 text-sm text-slate-600">Carregando permissões do usuário...</p>';
      return;
    }

    if (!this._canAccess(target)) {
      const allowed = Object.entries(this.routes).find(([, route]) => this._canAccess(route));
      const nextRoute = allowed ? allowed[0] : null;

      // Redirecionamento suave se o perfil caiu no dashboard por padrão pós-login mas não tem permissão
      if (hash === 'dashboard' && nextRoute) {
        window.location.hash = `#${nextRoute}`;
        return;
      }

      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Acesso Restrito',
          message: 'Seu perfil não possui permissão para acessar este módulo.',
          type: 'error'
        });
      }
      if (nextRoute) {
        if (hash !== nextRoute) window.location.hash = `#${nextRoute}`;
        else this.contentContainer.innerHTML = '<p class="p-6 text-sm text-slate-600">Seu perfil não possui módulos disponíveis.</p>';
      } else {
        this.contentContainer.innerHTML = '<p class="p-6 text-sm text-slate-600">Seu perfil não possui módulos disponíveis.</p>';
      }
      return;
    }

    // Atualiza links ativos na Sidebar
    this._updateActiveNav(target.navId);

    // Fecha o menu mobile se estiver aberto
    this._closeMobileMenu();

    // Renderiza o módulo alvo com fallback dinâmico
    const mod = target.module
      || (hash === 'ocorrencias' && (window.OcorrenciasModule || window.Modules?.ocorrencias))
      || (hash === 'auditoria' && (window.AuditoriaModule || window.Modules?.auditoria))
      || window[hash.charAt(0).toUpperCase() + hash.slice(1) + 'Module'];

    if (mod && typeof mod.render === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      mod.render(this.contentContainer);
    } else {
      console.warn(`Módulo ${hash} não possui método render.`);
    }
  }

  _canAccess(route) {
    if (!route) return false;
    if (window.Auth?.isVisitante()) {
      return route.moduleKey === 'comunicacao' || route.moduleKey === 'agenda';
    }
    if (route.adminOnly && !window.Auth?.isAdmin() && !window.Auth?.hasPermission('auditoria.visualizar')) return false;
    return !route.permissions || window.Auth?.canAccessModule(route.moduleKey, route.permissions);
  }

  atualizarVisibilidadeRotas() {
    const isVisitante = window.Auth?.isVisitante();
    for (const [hash, route] of Object.entries(this.routes)) {
      let visible = false;
      if (isVisitante) {
        visible = (hash === 'comunicacao' || hash === 'agenda');
      } else if (!window.Auth?.estaLogado()) {
        visible = (hash === 'comunicacao' || hash === 'agenda');
      } else {
        visible = window.Auth.permissionsReady ? this._canAccess(route) : false;
      }
      document.querySelectorAll(`nav a[href="#${hash}"]`).forEach(link => {
        link.classList.toggle('hidden', !visible);
      });
    }
    document.querySelectorAll('[data-nav-group]').forEach(group => {
      const hasVisibleLink = [...group.querySelectorAll('a[href^="#"]')]
        .some(link => !link.classList.contains('hidden'));
      group.classList.toggle('hidden', !hasVisibleLink);
    });

    // Atualiza visibilidade dos grupos dropdown desktop (ex: oculta para visitantes se não houver links acessíveis)
    document.querySelectorAll('[data-desktop-group]').forEach(group => {
      const hasVisibleLink = [...group.querySelectorAll('a[href^="#"]')]
        .some(link => !link.classList.contains('hidden'));
      group.classList.toggle('hidden', !hasVisibleLink);
    });

    const perfil = String(window.Auth?.getUsuario()?.perfil || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const isLimpeza = perfil === 'LIMPEZA';
    const isAdministracao = perfil === 'ADMINISTRACAO';
    document.querySelectorAll('[data-module-label="compras"]').forEach(label => {
      label.textContent = isLimpeza
        ? 'Solicitação de Materiais'
        : isAdministracao ? 'Entrada em Pedidos' : 'Compras';
    });
    document.querySelectorAll('[data-module-label="insumos"]').forEach(label => {
      label.textContent = isAdministracao ? 'Dar Baixa em Materiais' : 'Controle de Insumos';
    });
    document.querySelectorAll('[data-module-label="usuarios"]').forEach(label => {
      label.textContent = isAdministracao ? 'Cadastrar Colaborador' : 'Gestão de Usuários';
    });
  }

  _updateActiveNav(activeNavId) {
    // Reseta todos os links de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active-route');
      if (link.classList.contains('desktop-nav-link')) {
        link.classList.remove('bg-white/20', 'text-white', 'shadow-sm', 'ring-1', 'ring-white/15');
        link.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-white/10');
      } else if (link.classList.contains('desktop-subnav-link')) {
        link.classList.remove('active-route');
      } else {
        link.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/20');
        link.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100/80', 'dark:hover:bg-slate-800/60');
      }
    });

    // Reseta todos os botões-gatilho de grupos desktop
    document.querySelectorAll('.desktop-group-trigger').forEach(trigger => {
      trigger.classList.remove('active-parent');
    });

    // Ativa os links correspondentes à rota atual
    const activeLinks = document.querySelectorAll(`[data-nav-id="${activeNavId}"]`);
    activeLinks.forEach(link => {
      link.classList.add('active-route');

      if (link.classList.contains('desktop-nav-link')) {
        link.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-white/10');
        link.classList.add('bg-white/20', 'text-white', 'shadow-sm', 'ring-1', 'ring-white/15');
      } else if (link.classList.contains('desktop-subnav-link')) {
        // Destaca a categoria-pai correspondente no menu superior
        const groupEl = link.closest('[data-desktop-group]');
        if (groupEl) {
          const trigger = groupEl.querySelector('.desktop-group-trigger');
          if (trigger) {
            trigger.classList.add('active-parent');
          }
        }
      } else {
        link.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100/80', 'dark:hover:bg-slate-800/60');
        link.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/20');
      }
    });
  }

  _closeMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
    }
  }

  _openMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-backdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('-translate-x-full');
      backdrop.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  _setupGlobalEvents() {
    // Menu Hambúrguer Lateral (Mobile)
    const btnOpenMenu = document.getElementById('btn-open-mobile-menu');
    const btnCloseMenu = document.getElementById('btn-close-mobile-menu');
    const backdrop = document.getElementById('mobile-backdrop');

    if (btnOpenMenu) btnOpenMenu.addEventListener('click', () => this._openMobileMenu());
    if (btnCloseMenu) btnCloseMenu.addEventListener('click', () => this._closeMobileMenu());
    if (backdrop) backdrop.addEventListener('click', () => this._closeMobileMenu());

    // Fechar menu mobile ao clicar em qualquer link de navegação do drawer
    document.querySelectorAll('#mobile-drawer a').forEach(link => {
      link.addEventListener('click', () => this._closeMobileMenu());
    });

    // Tecla Escape fecha drawer e dropdown do usuário
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closeMobileMenu();
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        const userChevron = document.getElementById('user-chevron');
        if (userDropdownMenu) {
          userDropdownMenu.classList.add('hidden');
          if (userChevron) userChevron.style.transform = 'rotate(0deg)';
        }
      }
    });

    // Rolagem horizontal suave com a roda do mouse na top navbar desktop
    const desktopNav = document.getElementById('desktop-top-nav');
    if (desktopNav) {
      desktopNav.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          desktopNav.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }


    // Dropdown do Usuário (Higor ⌵)
    const btnUserDropdown = document.getElementById('btn-user-dropdown');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const userChevron = document.getElementById('user-chevron');

    if (btnUserDropdown && userDropdownMenu) {
      btnUserDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = userDropdownMenu.classList.contains('hidden');
        userDropdownMenu.classList.toggle('hidden', !isHidden);
        if (userChevron) {
          userChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });

      document.addEventListener('click', (e) => {
        if (!userDropdownMenu.contains(e.target) && !btnUserDropdown.contains(e.target)) {
          userDropdownMenu.classList.add('hidden');
          if (userChevron) userChevron.style.transform = 'rotate(0deg)';
        }
      });
    }

    // Alternar tema pelo dropdown do usuário
    const btnDropdownTema = document.getElementById('btn-dropdown-tema');
    if (btnDropdownTema) {
      btnDropdownTema.addEventListener('click', () => {
        const btnTema = document.getElementById('btn-tema');
        if (btnTema) btnTema.click();
        this._atualizarLabelTemaDropdown();
      });
      this._atualizarLabelTemaDropdown();
    }

    // Botão de Notificações / Comunicados na Topbar
    const btnNotif = document.getElementById('btn-topbar-notifications');
    if (btnNotif) {
      btnNotif.addEventListener('click', () => {
        this.abrirCentralComunicadosModal();
      });
    }

    // Busca Global no Header Desktop
    const inputGlobalSearch = document.getElementById('input-global-search');
    if (inputGlobalSearch) {
      inputGlobalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = inputGlobalSearch.value.trim().toLowerCase();
          if (!query) return;
          this._executarBuscaGlobal(query);
        }
      });
    }

    // Busca Rápida no Drawer Mobile
    const inputDrawerSearch = document.getElementById('input-drawer-search');
    if (inputDrawerSearch) {
      inputDrawerSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = inputDrawerSearch.value.trim().toLowerCase();
          if (!query) return;
          this._executarBuscaGlobal(query);
          this._closeMobileMenu();
        }
      });
    }
  }

  _atualizarLabelTemaDropdown() {
    const label = document.getElementById('label-tema-status');
    if (label) {
      const isDark = document.documentElement.classList.contains('dark');
      label.textContent = isDark ? 'Escuro' : 'Claro';
    }
  }

  _executarBuscaGlobal(query) {
    if (query.includes('comunicad') || query.includes('aviso') || query.includes('mural') || query.includes('noticia') || query.includes('informe')) {
      window.location.hash = '#comunicacao';
    } else if (query.includes('compra') || query.includes('pedido')) {
      window.location.hash = '#compras';
    } else if (query.includes('doc') || query.includes('termo') || query.includes('pdf')) {
      window.location.hash = '#documentos';
    } else if (query.includes('ocorr') || query.includes('suporte')) {
      window.location.hash = '#ocorrencias';
    } else if (query.includes('audit') || query.includes('govern')) {
      window.location.hash = '#auditoria';
    } else if (query.includes('evento')) {
      window.location.hash = '#agenda';
    } else if (query.includes('equip') || query.includes('patrimonio')) {
      window.location.hash = '#equipamentos';
    } else if (query.includes('limp')) {
      window.location.hash = '#limpeza';
    } else if (query.includes('insum') || query.includes('estoque')) {
      window.location.hash = '#insumos';
    } else if (query.includes('colab') || query.includes('usuario')) {
      window.location.hash = '#usuarios';
    } else {
      window.location.hash = '#documentos';
    }

    if (window.UI?.toast) {
      window.UI.toast({
        title: 'Busca Global',
        message: `Navegando para o módulo correspondente ao termo "${query}"`,
        type: 'info'
      });
    }
  }

  async atualizarBadgeComunicados() {
    try {
      const badge = document.getElementById('badge-topbar-notifications');
      const btnSino = document.getElementById('btn-topbar-notifications');
      if (!badge) return;

      const u = window.Auth ? window.Auth.getUsuario() : null;
      const isVisitante = window.Auth?.isVisitante();

      // Se não está logado e não é visitante, esconde
      if (!u && !isVisitante) {
        badge.classList.add('hidden');
        badge.classList.remove('animate-pulse');
        return;
      }

      // Notificações só aparecem para perfis autorizados (visitante pode ver comunicados)
      const podeVer = isVisitante || window.Auth.isAdmin() || window.Auth.hasPermission('comunicados.visualizar');
      if (!podeVer) {
        badge.classList.add('hidden');
        badge.classList.remove('animate-pulse');
        if (btnSino) btnSino.classList.add('hidden');
        return;
      } else {
        if (btnSino) btnSino.classList.remove('hidden');
      }

      if (!window.API) return;

      let comunicados = [];
      try {
        // Usa rota pública para visitante não autenticado
        const isVisitante = window.Auth?.isVisitante();
        comunicados = isVisitante
          ? await window.API.getPublicComunicados()
          : await window.API.getComunicados();
      } catch (errApi) {
        badge.classList.add('hidden');
        badge.classList.remove('animate-pulse');
        return;
      }

      const lista = Array.isArray(comunicados) ? comunicados : [];
      if (lista.length === 0) {
        badge.classList.add('hidden');
        badge.classList.remove('animate-pulse');
        return;
      }

      // Verifica se houve novos comunicados após a última abertura do sino PARA ESTE PERFIL/USUÁRIO
      const storageKey = window.Auth ? window.Auth.getUserStorageKey('hub_notificacoes_lidas_timestamp') : 'hub_notificacoes_lidas_timestamp';
      const ultimaLeitura = parseInt(localStorage.getItem(storageKey) || '0', 10);
      const naoLidos = lista.filter(c => {
        const time = new Date(c.created_at || c.data || 0).getTime();
        return time > ultimaLeitura;
      });

      if (naoLidos.length > 0) {
        badge.classList.remove('hidden');
        const temAlta = naoLidos.some(c => c.prioridade === 'alta');
        badge.classList.toggle('animate-pulse', temAlta);
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('animate-pulse');
      }
    } catch (err) {
      // Silencioso em caso de inicialização ou rede
    }
  }

  async abrirCentralComunicadosModal() {
    // Esconde imediatamente o ícone vermelho e registra a leitura para este usuário/perfil
    const storageKey = window.Auth ? window.Auth.getUserStorageKey('hub_notificacoes_lidas_timestamp') : 'hub_notificacoes_lidas_timestamp';
    localStorage.setItem(storageKey, Date.now().toString());
    const badge = document.getElementById('badge-topbar-notifications');
    if (badge) {
      badge.classList.add('hidden');
      badge.classList.remove('animate-pulse');
    }

    try {
      let comunicados = [];
      try {
        // Usa rota pública para visitante não autenticado
        const isVisitante = window.Auth?.isVisitante();
        comunicados = isVisitante
          ? await window.API.getPublicComunicados()
          : await window.API.getComunicados();
      } catch (e) {
        console.error('Erro ao buscar comunicados:', e);
      }

      const lista = Array.isArray(comunicados) ? [...comunicados] : [];
      const prioridadePeso = { alta: 3, media: 2, normal: 1 };
      lista.sort((a, b) => {
        const pesoDiff = (prioridadePeso[b.prioridade] || 1) - (prioridadePeso[a.prioridade] || 1);
        if (pesoDiff !== 0) return pesoDiff;
        return new Date(b.created_at || b.data || 0) - new Date(a.created_at || a.data || 0);
      });

      let contentHtml = '';
      if (lista.length === 0) {
        contentHtml = `
          <div class="py-12 text-center text-slate-500 dark:text-slate-400">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="bell-off" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum comunicado ativo</h4>
            <p class="text-xs mt-1">Todos os informativos e avisos oficiais estão em dia.</p>
          </div>
        `;
      } else {
        contentHtml = `
          <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            ${lista.map(c => {
              const isAlta = c.prioridade === 'alta';
              const isMedia = c.prioridade === 'media';
              const pBadge = isAlta 
                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Alta</span>'
                : isMedia
                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Média</span>'
                : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Normal</span>';

              const dataObj = c.created_at ? new Date(c.created_at) : (c.data ? new Date(c.data) : new Date());
              const dataFmt = !isNaN(dataObj) 
                ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : (c.data || 'Hoje');

              const autor = c.autor_nome || c.autor || 'Administração HUB ES+';

              return `
                <div class="p-4 rounded-xl border ${isAlta ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80'} hover:border-purple-300 dark:hover:border-purple-600 transition-all flex flex-col justify-between gap-3">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                      <div class="flex items-center gap-2">
                        ${pBadge}
                        <span class="text-[11px] font-medium text-slate-400">${dataFmt}</span>
                      </div>
                      <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                        ${autor}
                      </span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${c.titulo}</h4>
                    <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">${c.mensagem}</p>
                  </div>
                  <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
                    <button onclick="window.UI.visualizarComunicado(${c.id})" class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                      <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                      <span>Ler na Íntegra</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span class="text-xs text-slate-400">${lista.length} comunicado(s)</span>
            <button id="btn-ver-todos-central" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Ir para Central de Comunicação &rarr;
            </button>
          </div>
        `;
      }

      const modal = window.UI.openModal({
        title: 'Mural de Comunicados & Avisos',
        subtitle: 'Informativos oficiais acessíveis em tempo real',
        maxWidth: 'max-w-xl',
        contentHtml,
        cancelLabel: 'Fechar'
      });

      setTimeout(() => {
        document.getElementById('btn-ver-todos-central')?.addEventListener('click', () => {
          if (modal && typeof modal.close === 'function') modal.close();
          window.location.hash = '#comunicacao';
        });
      }, 50);

    } catch (err) {
      console.error('Erro ao abrir comunicados:', err);
      window.UI.toast({ title: 'Avisos', message: 'Falha ao carregar comunicados.', type: 'error' });
    }
  }
}

// Inicializa a aplicação ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  window.App = new AppRouter();
  window.App.init();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
