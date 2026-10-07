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
        permissions: ['dashboard.visualizar']
      },
      'documentos': {
        title: 'Gestão Documental',
        module: window.DocumentosModule,
        navId: 'nav-documentos',
        permissions: ['documentos.visualizar']
      },
      'insumos': {
        title: 'Controle de Insumos',
        module: window.InsumosModule,
        navId: 'nav-insumos',
        permissions: ['insumos.visualizar']
      },
      'compras': {
        title: 'Compras & Suprimentos',
        module: window.ComprasModule,
        navId: 'nav-compras',
        permissions: ['compras.visualizar', 'compras.visualizar_pedidos', 'compras.visualizar_proprias']
      },
      'agenda': {
        title: 'Agenda Inteligente',
        module: window.AgendaModule,
        navId: 'nav-agenda',
        permissions: ['eventos.visualizar']
      },
      'ocorrencias': {
        title: 'Ocorrências Técnicas',
        module: window.OcorrenciasModule || (window.Modules && window.Modules.ocorrencias),
        navId: 'nav-ocorrencias',
        permissions: ['ocorrencias.visualizar']
      },
      'comunicacao': {
        title: 'Central de Comunicação',
        module: window.ComunicacaoModule,
        navId: 'nav-comunicacao',
        permissions: ['comunicados.visualizar']
      },
      'indicadores': {
        title: 'Painel de Indicadores',
        module: window.IndicadoresModule,
        navId: 'nav-indicadores',
        permissions: ['indicadores.visualizar']
      },
      'limpeza': {
        title: 'Controle de Limpeza',
        module: window.LimpezaModule,
        navId: 'nav-limpeza',
        permissions: ['limpeza.visualizar']
      },
      'equipamentos': {
        title: 'Controle de Equipamentos',
        module: window.EquipamentosModule,
        navId: 'nav-equipamentos',
        permissions: ['equipamentos.visualizar']
      },
      'auditoria': {
        title: 'Auditoria & Governança',
        module: window.AuditoriaModule || (window.Modules && window.Modules.auditoria),
        navId: 'nav-auditoria',
        adminOnly: true,
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
      this.handleRoute();
    });

    // Rota inicial
    this.handleRoute();
  }

  handleRoute() {
    let hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (!hash || !this.routes[hash]) {
      hash = 'dashboard';
      window.location.hash = '#dashboard';
      return;
    }

    this.currentRoute = hash;
    const target = this.routes[hash];

    if (window.Auth?.estaLogado() && !window.Auth.permissionsReady) {
      this.contentContainer.innerHTML = '<p class="p-6 text-sm text-slate-600">Carregando permissões do usuário...</p>';
      this.atualizarVisibilidadeRotas();
      return;
    }

    if (window.Auth?.permissionsReady && !this._canAccess(target)) {
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Acesso Restrito',
          message: 'Seu perfil não possui permissão para acessar este módulo.',
          type: 'error'
        });
      }
      const allowed = Object.entries(this.routes).find(([, route]) => this._canAccess(route));
      if (allowed) {
        const nextRoute = allowed[0];
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
    if (route.adminOnly && !window.Auth?.isAdmin()) return false;
    return !route.permissions || window.Auth?.hasAnyPermission(route.permissions);
  }

  atualizarVisibilidadeRotas() {
    for (const [hash, route] of Object.entries(this.routes)) {
      const visible = !window.Auth?.estaLogado() ||
        (window.Auth.permissionsReady && this._canAccess(route));
      document.querySelectorAll(`nav a[href="#${hash}"]`).forEach(link => {
        link.classList.toggle('hidden', !visible);
      });
    }
  }

  _updateActiveNav(activeNavId) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/20');
      link.classList.add('text-slate-600', 'hover:bg-slate-100/80', 'hover:text-slate-900');
    });

    const activeLinks = document.querySelectorAll(`[data-nav-id="${activeNavId}"]`);
    activeLinks.forEach(link => {
      link.classList.remove('text-slate-600', 'hover:bg-slate-100/80', 'hover:text-slate-900');
      link.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/20');
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
    }
  }

  _setupGlobalEvents() {
    // Menu Hambúrguer (Mobile)
    const btnOpenMenu = document.getElementById('btn-open-mobile-menu');
    const btnCloseMenu = document.getElementById('btn-close-mobile-menu');
    const backdrop = document.getElementById('mobile-backdrop');

    if (btnOpenMenu) btnOpenMenu.addEventListener('click', () => this._openMobileMenu());
    if (btnCloseMenu) btnCloseMenu.addEventListener('click', () => this._closeMobileMenu());
    if (backdrop) backdrop.addEventListener('click', () => this._closeMobileMenu());

    // Botão de alternar Mock/API no rodapé da Sidebar
    const btnToggleMock = document.getElementById('btn-toggle-mock');
    if (btnToggleMock) {
      btnToggleMock.addEventListener('click', () => {
        window.UI.toast({
          title: 'Configuração de API',
          message: `Endpoint base configurado: ${window.CONFIG.API_BASE_URL} (Modo Mock: ${window.CONFIG.USE_MOCK ? 'Ativo' : 'Desativado'})`,
          type: 'info'
        });
      });
    }

    // Botão de Notificações na Topbar
    const btnNotif = document.getElementById('btn-topbar-notifications');
    if (btnNotif) {
      btnNotif.addEventListener('click', () => {
        window.UI.toast({
          title: 'Central de Notificações',
          message: 'Você possui 2 novas atualizações de compras e 1 chamado pendente.',
          type: 'info'
        });
      });
    }

    // Busca Global no Header
    const inputGlobalSearch = document.getElementById('input-global-search');
    if (inputGlobalSearch) {
      inputGlobalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = inputGlobalSearch.value.trim().toLowerCase();
          if (!query) return;

          // Redireciona de acordo com o termo buscado
          if (query.includes('compra') || query.includes('pedido')) {
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
          } else {
            window.location.hash = '#documentos';
          }

          window.UI.toast({
            title: 'Busca Global',
            message: `Navegando para o módulo correspondente ao termo "${query}"`,
            type: 'info'
          });
        }
      });
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
