/**
 * ============================================================================
 * HUB ES+ / SECULT - Chatbot Inteligente Flutuante (Base de Conhecimento)
 * ============================================================================
 * Bonequinho flutuante interativo com balão de fala + chat de respostas
 * inteligentes por palavras-chave, sinônimos e pontuação contextual.
 * Totalmente isolado por sessão/perfil e compatível com Tema Claro e Escuro.
 * ============================================================================
 */
(function () {
  'use strict';

  const KNOWLEDGE_BASE = [
    {
      id: 'saudacao',
      keywords: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'e ai', 'tudo bem', 'fala', 'opa'],
      phrases: ['tudo bem', 'bom dia', 'boa tarde', 'boa noite'],
      weight: 2,
      title: 'Olá! Eu sou o Edu, Assistente Virtual do HUB ES+.',
      answer: 'Posso tirar dúvidas sobre como usar a plataforma, abrir ocorrências, gerar documentos, solicitar compras, gerenciar acessos e muito mais! Digite sua dúvida abaixo ou escolha um atalho.',
      quickReplies: ['Como abrir ocorrência?', 'Quem assumiu um chamado?', 'Gerar carta de anuência', 'Esqueci minha senha']
    },
    {
      id: 'quem_sou',
      keywords: ['quem e voce', 'seu nome', 'robo', 'bonequinho', 'assistente', 'chatbot', 'ajuda', 'help', 'como funciona', 'funcionalidades', 'o que voce faz'],
      phrases: ['quem e voce', 'o que voce faz', 'como funciona'],
      weight: 2,
      title: 'Sobre o Assistente HUB ES+',
      answer: 'Sou o assistente inteligente de dúvidas do sistema HUB ES+ / SECULT. Reconheço palavras-chave sobre Ocorrências, Documentos, Compras, Equipamentos, Insumos, Agenda, Comunicados, Limpeza, Advertências, Auditoria e Acessos.',
      quickReplies: ['Ocorrências', 'Documentos', 'Compras', 'Acessos e Senha']
    },
    {
      id: 'ocorrencias_assumir',
      keywords: ['assumir', 'assumiu', 'responsavel', 'tecnico', 'quem', 'atendimento', 'listagem', 'listar responsaveis'],
      phrases: ['quem assumiu', 'assumir chamado', 'assumir ocorrencia', 'listar responsaveis', 'quem esta atendendo'],
      weight: 4,
      title: 'Ver quem assumiu os chamados & Assumir atendimento',
      answer: 'No módulo **Ocorrências Técnicas**, clique no botão **"Listar Responsáveis"** (ao lado de *+ Abrir Ocorrência*) para alternar para a tabela com a coluna **Quem Assumiu** e filtrar por chamados atribuídos ou aguardando técnico. Para voltar aos cards, clique em **"Voltar para Cards"**. Técnicos N1/N2/N3 ou gestores também podem clicar em **"Assumir"** direto na linha ou dentro de **Detalhes**.',
      route: '#ocorrencias',
      routeLabel: 'Ir para Ocorrências',
      requiresAuth: true,
      quickReplies: ['Como abrir ocorrência?', 'Escalonar chamado N1/N2/N3', 'Resolver ocorrência']
    },
    {
      id: 'ocorrencias',
      keywords: ['ocorrencia', 'ocorrencias', 'chamado', 'chamados', 'suporte', 'manutencao', 'defeito', 'problema', 'quebrou', 'camera', 'foto', 'escalonar', 'resolver', 'parecer'],
      phrases: ['abrir ocorrencia', 'abrir chamado', 'suporte tecnico', 'escalonar chamado', 'resolver ocorrencia'],
      weight: 3,
      title: 'Ocorrências Técnicas & Suporte',
      answer: 'Em **Ocorrências**, clique em **"+ Abrir Ocorrência"**, informe o local, categoria, nível inicial (N1 Helpdesk, N2 Hardware/Redes ou N3 Infra Crítica) e, se desejar, vincule um patrimônio, capture foto pela webcam/celular ou anexe arquivos (até 20MB). Ao marcar um chamado como **Resolvido** com parecer técnico, o equipamento vinculado volta automaticamente ao estado **bom**.',
      route: '#ocorrencias',
      routeLabel: 'Abrir Ocorrências',
      requiresAuth: true,
      quickReplies: ['Quem assumiu o problema?', 'Equipamentos', 'Dashboard']
    },
    {
      id: 'documentos',
      keywords: ['documento', 'documentos', 'carta', 'anuencia', 'repositorio', 'anexar', 'armazenar', 'pdf', 'baixar', 'download', 'arquivo', 'oficio', 'memorando'],
      phrases: ['carta de anuencia', 'armazenar documento', 'gerar documento', 'baixar documento', 'repositorio digital'],
      weight: 3,
      title: 'Documentos & Carta de Anuência',
      answer: 'Na aba **Documentos**, você pode gerar **Cartas de Anuência** e autorizações oficiais com pré-visualização e impressão em PDF, ou clicar em **"Armazenar Documento"** na aba **Repositório Digital** para enviar PDFs, imagens, planilhas e textos com segurança.',
      route: '#documentos',
      routeLabel: 'Ir para Documentos',
      requiresAuth: true,
      quickReplies: ['Como exportar métricas?', 'Agenda', 'Ocorrências']
    },
    {
      id: 'compras',
      keywords: ['compra', 'compras', 'pedido', 'pedidos', 'aprovar', 'aprovacao', 'solicitacao', 'orcamento', 'material', 'adquirir'],
      phrases: ['solicitar compra', 'pedido de compra', 'aprovar compra'],
      weight: 3,
      title: 'Pedidos de Compras & Suprimentos',
      answer: 'Em **Compras**, colaboradores autorizados podem registrar novos pedidos de materiais informando produto, quantidade, setor e justificativa. Gestores e Administradores analisam, aprovam ou rejeitam os pedidos pendentes conforme as permissões do cargo.',
      route: '#compras',
      routeLabel: 'Ir para Compras',
      requiresAuth: true,
      quickReplies: ['Insumos e estoque', 'Dashboard', 'Permissões']
    },
    {
      id: 'equipamentos',
      keywords: ['equipamento', 'equipamentos', 'patrimonio', 'patrimonios', 'inventario', 'tombamento', 'ativo', 'notebook', 'computador', 'projetor'],
      phrases: ['controle de patrimonio', 'cadastrar equipamento', 'equipamento em manutencao'],
      weight: 3,
      title: 'Equipamentos & Patrimônio',
      answer: 'O módulo **Equipamentos** concentra o inventário patrimonial com código de tombamento, setor alocado, estado de conservação e fotos. Quando uma ocorrência vincula um equipamento, ele entra em **manutenção** automaticamente e retorna para **bom** quando a ocorrência é resolvida.',
      route: '#equipamentos',
      routeLabel: 'Ir para Equipamentos',
      requiresAuth: true,
      quickReplies: ['Como abrir ocorrência?', 'Insumos']
    },
    {
      id: 'insumos',
      keywords: ['insumo', 'insumos', 'estoque', 'almoxarifado', 'baixa', 'entrada', 'saida', 'transferencia', 'minimo', 'critico'],
      phrases: ['dar baixa', 'estoque minimo', 'estoque critico', 'movimentar estoque'],
      weight: 3,
      title: 'Almoxarifado & Insumos',
      answer: 'Em **Insumos**, você acompanha saldos, alertas de **estoque crítico** (abaixo do mínimo) e realiza movimentações de **Entrada**, **Saída / Baixa**, **Transferência entre setores** e **Ajuste**, mantendo todo o histórico auditável.',
      route: '#insumos',
      routeLabel: 'Ir para Insumos',
      requiresAuth: true,
      quickReplies: ['Compras', 'Dashboard']
    },
    {
      id: 'agenda',
      keywords: ['agenda', 'evento', 'eventos', 'espaco', 'espacos', 'auditorio', 'sala', 'reserva', 'agendar', 'horario', 'calendario'],
      phrases: ['agendar evento', 'reservar espaco', 'minha agenda'],
      weight: 3,
      title: 'Agenda & Programação de Espaços',
      answer: 'A **Agenda** exibe os eventos programados no HUB ES+ com horário, responsável e espaço reservado. É acessível inclusive em **modo visitante**, e perfis autorizados podem cadastrar ou gerenciar novos agendamentos.',
      route: '#agenda',
      routeLabel: 'Ver Agenda',
      requiresAuth: false,
      quickReplies: ['Comunicados', 'Documentos']
    },
    {
      id: 'comunicacao',
      keywords: ['comunicado', 'comunicados', 'aviso', 'avisos', 'mural', 'noticia', 'prioridade', 'alta prioridade', 'publico', 'visitante'],
      phrases: ['central de comunicados', 'modo visitante', 'aviso importante'],
      weight: 3,
      title: 'Central de Comunicados',
      answer: 'A **Central de Comunicados** publica avisos institucionais por público-alvo (geral ou por cargo). Avisos marcados para **TODOS** ficam disponíveis também sem login na navegação de visitante, e comunicados de **alta prioridade** exibem destaque ao entrar.',
      route: '#comunicacao',
      routeLabel: 'Ver Comunicados',
      requiresAuth: false,
      quickReplies: ['Agenda', 'Como fazer login?']
    },
    {
      id: 'limpeza',
      keywords: ['limpeza', 'higienizacao', 'zeladoria', 'faxina', 'checklist', 'higienizado', 'banheiro', 'copa'],
      phrases: ['controle de limpeza', 'registro de limpeza'],
      weight: 3,
      title: 'Controle de Limpeza & Zeladoria',
      answer: 'No módulo **Limpeza**, a equipe registra as rotinas de higienização por ambiente, turno e responsável, mantendo rastreabilidade diária da conservação dos espaços do HUB ES+.',
      route: '#limpeza',
      routeLabel: 'Ir para Limpeza',
      requiresAuth: true,
      quickReplies: ['Ocorrências', 'Insumos']
    },
    {
      id: 'acesso_login_senha',
      keywords: ['login', 'entrar', 'senha', 'esqueci', 'ativacao', 'email', 'cadastro', 'solicitar acesso', 'conta', 'bloqueado', 'pendente', 'aprovar usuario', 'perfil', 'cargo', 'cargos', 'permissao', 'permissoes', 'sair', 'logout'],
      phrases: ['esqueci minha senha', 'solicitar acesso', 'alterar senha', 'editar perfil', 'ativacao por email', 'sair da plataforma'],
      weight: 3,
      title: 'Login, Senha, Ativação & Permissões (RBAC)',
      answer: 'Para acessar áreas internas: use seu e-mail e senha ou clique em **"Solicitar Acesso"** na tela inicial (o Administrador Geral aprova o cargo e envia o link de ativação por e-mail). Se esqueceu a senha, clique em **"Esqueci minha senha"** no login. Para editar perfil, alternar tema ou sair, clique no seu **avatar no canto superior direito**.',
      quickReplies: ['Tema claro / escuro', 'Auditoria', 'Central de Comunicados']
    },
    {
      id: 'advertencias',
      keywords: ['advertencia', 'advertencias', 'disciplinar', 'disciplina', 'homologar', 'revogar', 'infracao', 'conduta'],
      phrases: ['aplicar advertencia', 'homologar advertencia'],
      weight: 3,
      title: 'Gestão de Advertências',
      answer: 'Em **Advertências**, gestores autorizados registram ocorrências disciplinares com descrição dos fatos. A homologação (**Aprovar/Aplicar**, **Rejeitar** ou **Revogar**) é privativa do **Administrador Geral (ADMIN)** com trilha completa de auditoria.',
      route: '#advertencias',
      routeLabel: 'Ir para Advertências',
      requiresAuth: true,
      quickReplies: ['Auditoria', 'Indicadores']
    },
    {
      id: 'dashboard_indicadores',
      keywords: ['dashboard', 'inicio', 'fila', 'indicador', 'indicadores', 'bi', 'metricas', 'exportar', 'csv', 'grafico', 'graficos', 'relatorio'],
      phrases: ['fila operacional', 'exportar metricas', 'indicadores e bi'],
      weight: 3,
      title: 'Dashboard, Fila Crítica & Indicadores',
      answer: 'No **Início (Dashboard)**, você acompanha os KPIs em tempo real, o feed de ações e a **Fila Operacional Crítica** filtrada por Chamados, Compras, Advertências e Insumos. Em **Indicadores & BI**, gestores visualizam painéis analíticos e exportações.',
      route: '#dashboard',
      routeLabel: 'Ir para Início',
      requiresAuth: true,
      quickReplies: ['Auditoria', 'Ocorrências']
    },
    {
      id: 'auditoria',
      keywords: ['auditoria', 'seguranca', 'log', 'logs', 'online', 'usuarios online', 'brevo', 'smtp', 'testar email'],
      phrases: ['usuarios online', 'logs de acesso', 'testar email'],
      weight: 3,
      title: 'Auditoria & Segurança',
      answer: 'Em **Auditoria & Segurança**, o Administrador Geral acompanha os logs de auditoria em tempo real, usuários online nos últimos minutos, aprova solicitações de acesso pendentes, ajusta permissões extras e testa a entrega de e-mails transacionais.',
      route: '#auditoria',
      routeLabel: 'Ir para Auditoria',
      requiresAuth: true,
      quickReplies: ['Usuários', 'Acessos e Senha']
    },
    {
      id: 'tema_acessibilidade_lgpd',
      keywords: ['tema', 'claro', 'escuro', 'noturno', 'branco', 'dark', 'light', 'acessibilidade', 'fonte', 'daltonismo', 'libras', 'vlibras', 'lgpd', 'privacidade', 'cookie', 'cookies'],
      phrases: ['modo noturno', 'tema claro', 'tema escuro', 'trocar tema', 'privacidade e cookies'],
      weight: 3,
      title: 'Tema Claro/Escuro, Acessibilidade & LGPD',
      answer: 'Você pode alternar entre **Tema Claro e Escuro** no menu do seu perfil (canto superior direito) ou no ícone de sol/lua da tela de login. Os botões azuis no **canto inferior direito** abrem o menu de **Acessibilidade** (aumento de fonte, contraste, daltonismo) e o **VLibras**. Preferências de **Cookies/LGPD** ficam no rodapé da página.',
      quickReplies: ['Como abrir ocorrência?', 'Documentos', 'Agenda']
    },
    {
      id: 'agradecimento',
      keywords: ['obrigado', 'obrigada', 'valeu', 'show', 'perfeito', 'otimo', 'legal', 'top', 'massa', 'ajudou'],
      phrases: ['muito obrigado', 'deu certo', 'valeu mesmo'],
      weight: 2,
      title: 'Por nada!',
      answer: 'Sempre que precisar, é só clicar em mim aqui no canto esquerdo! Bom trabalho no HUB ES+.',
      quickReplies: ['Ocorrências', 'Documentos', 'Dashboard']
    }
  ];

  const GREETING_TIPS = [
    'Oi! Precisa de ajuda no HUB ES+? Clique em mim!',
    'Dúvidas sobre ocorrências ou documentos? Pergunte aqui!',
    'Quer saber quem assumiu um chamado? Eu te mostro!'
  ];

  const ChatbotManager = {
    _isOpen: false,
    _bubbleDismissed: false,
    _tipIndex: 0,
    _tipInterval: null,
    _messages: [],
    _initialized: false,

    _esc(str) {
      if (window.UI?.escapeHtml) return window.UI.escapeHtml(str);
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    _normalize(str) {
      return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    _formatAnswer(text) {
      const escaped = this._esc(text);
      return escaped
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    },

    _canNavigate(entry) {
      if (!entry?.route) return false;
      const logged = Boolean(window.Auth?.estaLogado?.());
      if (!entry.requiresAuth) return true;
      return logged;
    },

    _encontrarMelhorResposta(queryText) {
      const norm = this._normalize(queryText);
      if (!norm) return null;

      const tokens = norm.split(' ').filter(t => t.length >= 2);
      let bestEntry = null;
      let bestScore = 0;

      for (const entry of KNOWLEDGE_BASE) {
        let score = 0;

        // Pontuação extra para correspondência exata de frase-chave
        if (Array.isArray(entry.phrases)) {
          for (const ph of entry.phrases) {
            if (norm.includes(ph)) {
              score += 6 + (entry.weight || 1);
            }
          }
        }

        // Pontuação por palavras-chave individuais e correspondência parcial de radical
        for (const kw of entry.keywords) {
          const kwNorm = this._normalize(kw);
          if (!kwNorm) continue;
          if (kwNorm.includes(' ')) {
            if (norm.includes(kwNorm)) score += 5;
            continue;
          }
          if (tokens.includes(kwNorm)) {
            score += 3 + (entry.weight || 1);
          } else if (kwNorm.length >= 4 && tokens.some(t => t.includes(kwNorm) || kwNorm.includes(t))) {
            score += 2;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestEntry = entry;
        }
      }

      if (bestEntry && bestScore >= 2) {
        return bestEntry;
      }

      return {
        id: 'fallback',
        title: 'Não encontrei uma correspondência exata',
        answer: 'Ainda estou aprendendo sobre esse termo específico. Tente usar palavras-chave como **ocorrência**, **quem assumiu**, **carta de anuência**, **compras**, **insumos**, **equipamentos**, **agenda**, **senha** ou **auditoria**.',
        quickReplies: ['Quem assumiu o problema?', 'Como abrir ocorrência?', 'Carta de anuência', 'Esqueci minha senha']
      };
    },

    init() {
      if (this._initialized || !document.body) return;
      this._initialized = true;
      this._renderShell();
      this._seedGreeting();
      this._startTipRotation();
    },

    _seedGreeting() {
      if (this._messages.length > 0) return;
      const user = window.Auth?.getUsuario?.();
      const firstName = user?.nome ? String(user.nome).trim().split(' ')[0] : '';
      const saudacaoNome = firstName ? `Olá, **${firstName}**! ` : 'Olá! ';
      this._messages.push({
        sender: 'bot',
        title: 'Assistente Virtual HUB ES+',
        text: `${saudacaoNome}Sou o **Edu**, seu assistente de dúvidas. Pergunte sobre módulos, permissões, ocorrências, documentos ou escolha um tópico rápido abaixo.`,
        quickReplies: ['Quem assumiu um chamado?', 'Como abrir ocorrência?', 'Carta de anuência', 'Esqueci minha senha'],
        time: this._nowLabel()
      });
    },

    _nowLabel() {
      return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    _startTipRotation() {
      if (this._tipInterval) clearInterval(this._tipInterval);
      this._tipInterval = setInterval(() => {
        if (this._isOpen || this._bubbleDismissed) return;
        this._tipIndex = (this._tipIndex + 1) % GREETING_TIPS.length;
        const tipEl = document.getElementById('hub-chatbot-bubble-text');
        if (tipEl) tipEl.textContent = GREETING_TIPS[this._tipIndex];
      }, 7000);
    },

    _renderShell() {
      if (document.getElementById('hub-chatbot-root')) return;

      const root = document.createElement('div');
      root.id = 'hub-chatbot-root';
      root.className = 'fixed left-3 sm:left-5 bottom-4 sm:bottom-6 z-[995] flex flex-col items-start gap-2.5 select-none print:hidden';

      root.innerHTML = `
        <!-- JANELA DO CHAT -->
        <div id="hub-chatbot-panel" role="dialog" aria-label="Chat de Ajuda HUB ES+"
          class="hidden w-[calc(100vw-1.5rem)] sm:w-[370px] max-h-[72vh] flex flex-col rounded-3xl bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-700/90 shadow-2xl overflow-hidden transition-all origin-bottom-left">
          <!-- Cabeçalho -->
          <div class="bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
                ${this._getMiniAvatarSvg()}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-extrabold text-sm tracking-tight truncate">Edu • Ajuda HUB ES+</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Online"></span>
                </div>
                <span class="text-[10px] text-sky-100/90 block truncate">Respostas rápidas por palavras-chave</span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" id="hub-chatbot-clear" title="Limpar conversa"
                class="p-1.5 rounded-xl hover:bg-white/15 text-white/85 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              </button>
              <button type="button" id="hub-chatbot-close" title="Minimizar chat" aria-label="Fechar chat"
                class="p-1.5 rounded-xl hover:bg-white/15 text-white/85 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Área de mensagens -->
          <div id="hub-chatbot-messages"
            class="flex-1 overflow-y-auto hub-scrollbar p-3.5 space-y-3 bg-slate-50/90 dark:bg-slate-900/70 select-text min-h-[240px]">
          </div>

          <!-- Formulário de envio -->
          <form id="hub-chatbot-form" class="p-2.5 bg-white dark:bg-[#0b1320] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <input id="hub-chatbot-input" type="text" maxlength="240" autocomplete="off"
              placeholder="Digite uma dúvida (ex: ocorrência, compra)..."
              class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <button type="submit" id="hub-chatbot-send" aria-label="Enviar pergunta"
              class="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm shadow-blue-600/25 transition-all shrink-0 cursor-pointer">
              <i data-lucide="send" class="w-4 h-4"></i>
            </button>
          </form>
        </div>

        <!-- BONEQUINHO FLUTUANTE + BALÃO DE FALA -->
        <div class="flex items-end gap-2.5">
          <button type="button" id="hub-chatbot-mascot-btn" aria-label="Abrir Assistente de Dúvidas HUB ES+"
            title="Clique para conversar com o Edu (Assistente HUB ES+)"
            class="relative group focus:outline-none cursor-pointer hub-mascot-float">
            <span class="absolute -inset-1 rounded-full bg-blue-500/25 dark:bg-sky-400/25 blur-md group-hover:bg-blue-500/40 transition-all"></span>
            <div class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-sky-500 p-1.5 shadow-xl shadow-blue-900/30 border-2 border-white/90 dark:border-sky-300/60 flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95">
              ${this._getMascotSvg()}
            </div>
            <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-sm"></span>
          </button>

          <!-- Balão de fala flutuante -->
          <div id="hub-chatbot-bubble"
            class="hub-bubble-float relative max-w-[220px] sm:max-w-[250px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold leading-snug cursor-pointer group">
            <button type="button" id="hub-chatbot-bubble-dismiss" aria-label="Ocultar balão"
              class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shadow transition-colors cursor-pointer">
              ×
            </button>
            <div id="hub-chatbot-bubble-trigger" class="flex items-start gap-2">
              <span id="hub-chatbot-bubble-text">${this._esc(GREETING_TIPS[0])}</span>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(root);

      const mascotBtn = root.querySelector('#hub-chatbot-mascot-btn');
      const bubbleTrigger = root.querySelector('#hub-chatbot-bubble-trigger');
      const bubbleDismiss = root.querySelector('#hub-chatbot-bubble-dismiss');
      const closeBtn = root.querySelector('#hub-chatbot-close');
      const clearBtn = root.querySelector('#hub-chatbot-clear');
      const form = root.querySelector('#hub-chatbot-form');

      mascotBtn?.addEventListener('click', () => this.toggle());
      bubbleTrigger?.addEventListener('click', () => this.open());
      bubbleDismiss?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._bubbleDismissed = true;
        document.getElementById('hub-chatbot-bubble')?.classList.add('hidden');
      });
      closeBtn?.addEventListener('click', () => this.close());
      clearBtn?.addEventListener('click', () => {
        this._messages = [];
        this._seedGreeting();
        this._renderMessages();
      });

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('hub-chatbot-input');
        const text = input?.value?.trim();
        if (!text) return;
        input.value = '';
        this.ask(text);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._isOpen) {
          this.close();
        }
      });

      if (window.lucide) lucide.createIcons({ root });
      this._renderMessages();
    },

    _getMascotSvg() {
      return `
        <svg viewBox="0 0 64 64" fill="none" class="w-full h-full" aria-hidden="true">
          <!-- Antena -->
          <line x1="32" y1="8" x2="32" y2="15" stroke="#BAE6FD" stroke-width="3" stroke-linecap="round"/>
          <circle cx="32" cy="7" r="3.5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5"/>
          <!-- Orelhas / Fones -->
          <rect x="8" y="26" width="6" height="14" rx="3" fill="#BAE6FD"/>
          <rect x="50" y="26" width="6" height="14" rx="3" fill="#BAE6FD"/>
          <!-- Cabeça do Bonequinho -->
          <rect x="13" y="15" width="38" height="32" rx="13" fill="#FFFFFF"/>
          <!-- Visor Facial -->
          <rect x="18" y="22" width="28" height="16" rx="7" fill="#0F172A"/>
          <!-- Olhos Animados -->
          <ellipse cx="26" cy="30" rx="3" ry="3.8" fill="#38BDF8" class="hub-mascot-eye"/>
          <ellipse cx="38" cy="30" rx="3" ry="3.8" fill="#38BDF8" class="hub-mascot-eye"/>
          <!-- Sorriso simpático -->
          <path d="M27 35 C29.5 37.2 34.5 37.2 37 35" stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"/>
          <!-- Corpo / Gola -->
          <path d="M20 49 C20 45 44 45 44 49 L46 57 C46 59 18 59 18 57 Z" fill="#E0F2FE"/>
          <circle cx="32" cy="52" r="3" fill="#0284C7"/>
        </svg>
      `;
    },

    _getMiniAvatarSvg() {
      return `
        <svg viewBox="0 0 64 64" fill="none" class="w-6 h-6" aria-hidden="true">
          <circle cx="32" cy="7" r="3.5" fill="#38BDF8"/>
          <line x1="32" y1="9" x2="32" y2="16" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
          <rect x="13" y="16" width="38" height="32" rx="13" fill="#FFFFFF"/>
          <rect x="18" y="23" width="28" height="16" rx="7" fill="#0F172A"/>
          <circle cx="26" cy="31" r="3" fill="#38BDF8"/>
          <circle cx="38" cy="31" r="3" fill="#38BDF8"/>
        </svg>
      `;
    },

    toggle() {
      if (this._isOpen) this.close();
      else this.open();
    },

    open() {
      this._isOpen = true;
      const panel = document.getElementById('hub-chatbot-panel');
      const bubble = document.getElementById('hub-chatbot-bubble');
      if (panel) panel.classList.remove('hidden');
      if (bubble) bubble.classList.add('hidden');
      this._renderMessages();
      setTimeout(() => {
        document.getElementById('hub-chatbot-input')?.focus();
      }, 60);
    },

    close() {
      this._isOpen = false;
      const panel = document.getElementById('hub-chatbot-panel');
      const bubble = document.getElementById('hub-chatbot-bubble');
      if (panel) panel.classList.add('hidden');
      if (bubble && !this._bubbleDismissed) bubble.classList.remove('hidden');
    },

    ask(questionText) {
      const clean = String(questionText || '').trim();
      if (!clean) return;

      this._messages.push({
        sender: 'user',
        text: clean,
        time: this._nowLabel()
      });

      const match = this._encontrarMelhorResposta(clean);
      const reply = {
        sender: 'bot',
        title: match.title,
        text: match.answer,
        route: this._canNavigate(match) ? match.route : null,
        routeLabel: match.routeLabel || null,
        quickReplies: Array.isArray(match.quickReplies) ? match.quickReplies : [],
        time: this._nowLabel()
      };
      this._messages.push(reply);
      this._renderMessages();
    },

    _renderMessages() {
      const box = document.getElementById('hub-chatbot-messages');
      if (!box) return;

      box.innerHTML = this._messages.map((m, idx) => {
        if (m.sender === 'user') {
          return `
            <div class="flex justify-end">
              <div class="max-w-[82%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-xs shadow-sm">
                <p class="leading-relaxed break-words">${this._esc(m.text)}</p>
                <span class="block text-[9px] text-blue-100/80 text-right mt-1 font-mono">${this._esc(m.time)}</span>
              </div>
            </div>
          `;
        }

        const isLastBot = idx === this._messages.length - 1;
        return `
          <div class="flex items-start gap-2">
            <div class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              ${this._getMiniAvatarSvg()}
            </div>
            <div class="max-w-[85%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs shadow-sm space-y-2">
              ${m.title ? `<div class="font-extrabold text-slate-900 dark:text-white text-[11px] leading-snug">${this._esc(m.title)}</div>` : ''}
              <p class="leading-relaxed text-[11.5px] break-words">${this._formatAnswer(m.text)}</p>
              ${m.route ? `
                <div>
                  <button type="button" data-chatbot-route="${this._esc(m.route)}"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-sky-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer">
                    <span>${this._esc(m.routeLabel || 'Abrir módulo')}</span>
                    <span>→</span>
                  </button>
                </div>
              ` : ''}
              ${isLastBot && m.quickReplies?.length ? `
                <div class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/70">
                  ${m.quickReplies.map(qr => `
                    <button type="button" data-chatbot-quick="${this._esc(qr)}"
                      class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700/70 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-[10.5px] font-semibold transition-colors cursor-pointer">
                      ${this._esc(qr)}
                    </button>
                  `).join('')}
                </div>
              ` : ''}
              <span class="block text-[9px] text-slate-400 font-mono">${this._esc(m.time)}</span>
            </div>
          </div>
        `;
      }).join('');

      box.querySelectorAll('[data-chatbot-quick]').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = btn.getAttribute('data-chatbot-quick');
          if (q) this.ask(q);
        });
      });

      box.querySelectorAll('[data-chatbot-route]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = btn.getAttribute('data-chatbot-route');
          if (r) {
            window.location.hash = r;
          }
        });
      });

      if (window.lucide) lucide.createIcons({ root: box });
      box.scrollTop = box.scrollHeight;
    }
  };

  window.ChatbotModule = ChatbotManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChatbotManager.init());
  } else {
    ChatbotManager.init();
  }
})();

