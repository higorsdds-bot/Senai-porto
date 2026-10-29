/**
 * HUB ES+ - Módulo de Auditoria e Governança (auditoria.js)
 * Painel Administrativo com controle de acesso estrito a Administradores (ADMIN).
 * Recursos:
 * 1. Indicadores e Métricas de Governança
 * 2. Gestão e Aprovação de Solicitações de Cadastro (Status PENDENTE)
 * 3. Usuários Conectados Online em Tempo Real (Heartbeat)
 * 4. Listagem Geral de Usuários e Histórico Individual de Ações Auditadas
 * 5. Trilha Geral de Logs de Auditoria do Sistema
 */

window.Modules = window.Modules || {};

const AuditoriaModule = {
  _abaAtiva: 'solicitacoes', // 'solicitacoes' | 'online' | 'usuarios' | 'logs'
  _timerAutoRefresh: null,

  async render(container) {
    // Verificação de permissão no frontend (o backend já valida estritamente no banco)
    if (!window.Auth?.isAdmin() && !window.Auth?.hasPermission('auditoria.visualizar')) {
      container.innerHTML = `
        <div class="max-w-md mx-auto my-16 bg-white rounded-3xl border border-rose-200 p-8 shadow-hub-md text-center">
          <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold">
            <i data-lucide="shield-alert" class="w-7 h-7"></i>
          </div>
          <h3 class="text-base font-extrabold text-slate-900">Acesso Restrito</h3>
          <p class="text-xs text-slate-500 mt-2 leading-relaxed">
            O módulo de Auditoria é restrito exclusivamente a usuários com perfil <strong>Administrador (ADMIN)</strong> ou com permissão geral de governança.
          </p>
          <a href="#dashboard" class="inline-block mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all">
            Voltar ao Dashboard
          </a>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    this._container = container;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- HEADER DO MÓDULO -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] uppercase tracking-wider">
                Controle de Acesso Admin
              </span>
            </div>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight mt-1">Painel de Auditoria & Governança</h2>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">
              Monitoramento em tempo real de acessos, histórico de ações e gestão de novos cadastros.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-testar-email-auditoria"
              class="btn-secondary"
              title="Testar envio de e-mail e verificar provedor ativo">
              <i data-lucide="mail-check" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i> 
              <span>Testar E-mail</span>
            </button>
            <button id="btn-refresh-auditoria"
              class="btn-secondary"
              title="Atualizar dados de governança">
              <i data-lucide="refresh-cw" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i> 
              <span>Atualizar Dados</span>
            </button>
          </div>
        </div>

        <!-- CARDS DE MÉTRICAS RÁPIDAS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="auditoria-kpis">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuários Online</span>
              <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1" id="kpi-online">--</div>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ativos nos últimos 5 min
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <i data-lucide="radio" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cadastros Pendentes</span>
              <div class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1" id="kpi-pendentes">--</div>
              <span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5" id="kpi-pendentes-desc">Aguardando aprovação</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <i data-lucide="user-check" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</span>
              <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1" id="kpi-total-usuarios">--</div>
              <span class="text-[10px] text-slate-400 font-medium mt-0.5">Cadastrados no banco</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <i data-lucide="users" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ações Auditadas</span>
              <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1" id="kpi-total-logs">--</div>
              <span class="text-[10px] text-slate-400 font-medium mt-0.5">Eventos registrados</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <i data-lucide="shield" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <!-- NAVEGAÇÃO POR ABAS -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
          <button type="button" data-tab="solicitacoes"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-blue-600 border-blue-600">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Solicitações de Cadastro</span>
            <span id="badge-aba-pendentes" class="hidden px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">0</span>
          </button>
          <button type="button" data-tab="online"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200">
            <i data-lucide="activity" class="w-4 h-4"></i>
            <span>Usuários Online</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>
          <button type="button" data-tab="usuarios"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Todos os Usuários & Histórico</span>
          </button>
          <button type="button" data-tab="logs"
            class="tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Trilha de Auditoria (Logs)</span>
          </button>
        </div>

        <!-- CONTEÚDO DAS ABAS -->
        <div id="aba-conteudo-solicitacoes" class="tab-content space-y-4"></div>
        <div id="aba-conteudo-online" class="tab-content hidden space-y-4"></div>
        <div id="aba-conteudo-usuarios" class="tab-content hidden space-y-4"></div>
        <div id="aba-conteudo-logs" class="tab-content hidden space-y-4"></div>
      </div>

      <!-- MODAL DE HISTÓRICO INDIVIDUAL DE USUÁRIO -->
      <div id="modal-historico-usuario" class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md hidden flex items-center justify-center p-4 overflow-y-auto">
        <div id="conteudo-historico-usuario" class="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto modal-enter border border-slate-200 dark:border-slate-800"></div>
      </div>

      <!-- MODAL DE APROVAÇÃO COM DIGITAÇÃO E EDIÇÃO COMPLETA (ADMIN) -->
      <div id="modal-aprovar-usuario" class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8 max-h-[95vh] overflow-y-auto border border-slate-200 dark:border-slate-800 modal-enter">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <i data-lucide="user-check" class="w-4 h-4 text-emerald-600"></i> Gestão e Liberação de Cadastro
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5">Como administrador, você pode digitar e editar todos os campos do usuário.</p>
            </div>
            <button type="button" onclick="document.getElementById('modal-aprovar-usuario').classList.add('hidden')" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <form id="form-aprovar-usuario" class="space-y-4" novalidate>
            <input type="hidden" id="aprovar-user-id">

            <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
              <i data-lucide="shield-check" class="w-4 h-4 text-blue-600 shrink-0"></i>
              <span>Você pode corrigir o nome, e-mail, atribuir setor, perfil ou redefinir a senha antes de salvar ou liberar.</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
              <input type="text" id="aprovar-user-nome-input" required minlength="3" placeholder="Ex: Carlos Eduardo de Oliveira"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
              <input type="email" id="aprovar-user-email-input" required placeholder="Ex: carlos.oliveira@secult.es.gov.br"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Perfil de Permissões (Função) *</label>
                <select id="aprovar-user-perfil" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <optgroup label="Administração e Governança">
                    <option value="ADMIN">ADMIN (Super Administrador Geral)</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR (Gestão Institucional)</option>
                    <option value="ADMINISTRACAO">ADMINISTRAÇÃO (Estoque, Agenda e Entrada de Pedidos)</option>
                  </optgroup>
                  <optgroup label="Gestores Setoriais">
                    <option value="GESTOR_RH">GESTOR_RH (Supervisão de RH e Acessos)</option>
                    <option value="GESTOR_INFRA">GESTOR_INFRA (Comando N1, N2, N3 e Redes)</option>
                    <option value="GESTOR_OPERADOR">GESTOR_OPERADOR (Comando de Operadores)</option>
                    <option value="GESTOR">GESTOR (Gestão Operacional e Aprovações)</option>
                  </optgroup>
                  <optgroup label="Suporte Técnico & TI">
                    <option value="TECNICO_N3">TECNICO_N3 (Avançado / Infra / Servidores)</option>
                    <option value="TECNICO_N2">TECNICO_N2 (Hardware / Redes / Bancadas)</option>
                    <option value="TECNICO_N1">TECNICO_N1 (Helpdesk / Atendimento N1)</option>
                    <option value="TECNICO">TECNICO (Suporte Técnico)</option>
                  </optgroup>
                  <optgroup label="Recursos Humanos">
                    <option value="ANALISTA_RH">ANALISTA_RH (Analista de RH)</option>
                    <option value="RH">RH (Assistente / Operações de RH)</option>
                  </optgroup>
                  <optgroup label="Operacional">
                    <option value="OPERADOR" selected>OPERADOR (Acesso Padrão às Rotinas)</option>
                    <option value="LIMPEZA">LIMPEZA (Solicitação de Materiais de Consumo)</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Setor de Lotação</label>
                <select id="aprovar-user-setor" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="">Selecione o setor de lotação...</option>
                </select>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Redefinir Senha (Opcional)</label>
                <button type="button" id="btn-gerar-senha-aprovar" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  <i data-lucide="sparkles" class="w-3 h-3"></i> Gerar Senha
                </button>
              </div>
              <input type="password" id="aprovar-user-senha" minlength="8" placeholder="Deixe em branco para manter a senha atual"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="document.getElementById('modal-aprovar-usuario').classList.add('hidden')"
                class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <div class="flex items-center gap-2">
                <button type="button" id="btn-salvar-apenas-solicitacao"
                  class="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                  Salvar Alterações
                </button>
                <button type="submit" id="btn-confirmar-aprovacao"
                  class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer">
                  Confirmar e Liberar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL DE CADASTRO MANUAL DE NOVO USUÁRIO (ADMIN) -->
      <div id="modal-cadastrar-usuario" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8 max-h-[95vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="user-plus" class="w-4 h-4 text-blue-600"></i> Cadastrar Novo Usuário
            </h3>
            <button type="button" id="btn-fechar-modal-cadastro" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="form-cadastrar-usuario" class="space-y-4" novalidate>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
              <input type="text" id="cad-user-nome" required minlength="3"
                placeholder="Ex: Carlos Eduardo de Oliveira"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
              <input type="email" id="cad-user-email" required
                placeholder="Ex: carlos.oliveira@secult.es.gov.br"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Perfil de Permissão / Hierarquia *</label>
                <select id="cad-user-perfil" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
                  <optgroup label="Administração e Governança">
                    <option value="ADMIN">ADMIN (Super Administrador Geral)</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR (Gestão Institucional)</option>
                    <option value="ADMINISTRACAO">ADMINISTRAÇÃO (Pedidos e Insumos)</option>
                  </optgroup>
                  <optgroup label="Gestores Setoriais">
                    <option value="GESTOR_RH">GESTOR_RH (Supervisão de RH e Acessos)</option>
                    <option value="GESTOR_INFRA">GESTOR_INFRA (Comando N1, N2, N3 e Redes)</option>
                    <option value="GESTOR_OPERADOR">GESTOR_OPERADOR (Comando de Operadores)</option>
                    <option value="GESTOR">GESTOR (Gestão Operacional)</option>
                  </optgroup>
                  <optgroup label="Suporte Técnico & TI">
                    <option value="TECNICO_N3">TECNICO_N3 (Avançado / Infra / Servidores)</option>
                    <option value="TECNICO_N2">TECNICO_N2 (Hardware / Redes / Bancadas)</option>
                    <option value="TECNICO_N1">TECNICO_N1 (Helpdesk / Atendimento N1)</option>
                    <option value="TECNICO">TECNICO (Suporte Técnico)</option>
                  </optgroup>
                  <optgroup label="Recursos Humanos">
                    <option value="ANALISTA_RH">ANALISTA_RH (Analista de RH)</option>
                    <option value="RH">RH (Assistente / Operações de RH)</option>
                  </optgroup>
                  <optgroup label="Operacional">
                    <option value="OPERADOR" selected>OPERADOR (Operações Básicas)</option>
                    <option value="LIMPEZA">LIMPEZA (Consumo e Higienização)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Setor de Lotação</label>
                <select id="cad-user-setor" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
                  <option value="">Carregando setores...</option>
                </select>
              </div>
            </div>

            <!-- PERMISSÕES ADICIONAIS / EXCEÇÕES GRANULARES -->
            <div class="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <i data-lucide="key" class="w-3.5 h-3.5 text-blue-600"></i> Permissões Específicas / Acessos Adicionais
                </span>
                <span class="text-[10px] text-slate-400 font-medium">Além do perfil base</span>
              </div>
              <p class="text-[11px] text-slate-500">Marque privilégios extras que este colaborador deve receber (ex: permitir que RH acesse e anexe documentos):</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="documentos.visualizar" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Documentos:</strong> Visualizar</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="documentos.enviar" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Documentos:</strong> Anexar / Enviar</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="ocorrencias.atender" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Ocorrências:</strong> Assumir Chamados</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="ocorrencias.escalonar" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Ocorrências:</strong> Escalonar N1/N2/N3</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="insumos.visualizar" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Insumos:</strong> Visualizar Estoque</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="compras.criar" class="cad-perm-extra-cb rounded text-blue-600">
                  <span><strong>Compras:</strong> Solicitar Compras</span>
                </label>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Senha Provisória *</label>
                <button type="button" id="btn-gerar-senha-cad" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  <i data-lucide="key" class="w-3 h-3"></i> Gerar Senha Segura
                </button>
              </div>
              <input type="password" id="cad-user-senha" required minlength="8"
                placeholder="Mínimo de 8 caracteres"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white font-mono">
            </div>

            <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700 flex items-start gap-2">
              <i data-lucide="info" class="w-4 h-4 shrink-0 mt-0.5"></i>
              <span>O usuário cadastrado diretamente pelo administrador receberá status <strong>ATIVO</strong> e poderá realizar login imediatamente.</span>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" id="btn-cancelar-modal-cadastro"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" id="btn-salvar-novo-usuario"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                <i data-lucide="user-check" class="w-4 h-4"></i> Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL DE EDIÇÃO DE USUÁRIO & CARGO (ADMIN) -->
      <div id="modal-editar-usuario" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8 max-h-[95vh] overflow-y-auto border border-slate-100">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="user-cog" class="w-4 h-4 text-blue-600"></i> Editar Usuário & Cargo
            </h3>
            <button type="button" id="btn-fechar-modal-edicao" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="form-editar-usuario" class="space-y-4" novalidate>
            <input type="hidden" id="edit-user-id">

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
              <input type="text" id="edit-user-nome" required minlength="3"
                placeholder="Ex: Carlos Eduardo de Oliveira"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
              <input type="email" id="edit-user-email" required
                placeholder="Ex: carlos.oliveira@secult.es.gov.br"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Cargo / Perfil de Acesso *</label>
                <select id="edit-user-perfil" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
                  <optgroup label="Administração e Governança">
                    <option value="ADMIN">ADMIN (Super Administrador Geral)</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR (Gestão Institucional)</option>
                    <option value="ADMINISTRACAO">ADMINISTRAÇÃO (Pedidos e Insumos)</option>
                  </optgroup>
                  <optgroup label="Gestores Setoriais">
                    <option value="GESTOR_RH">GESTOR_RH (Supervisão de RH e Acessos)</option>
                    <option value="GESTOR_INFRA">GESTOR_INFRA (Comando N1, N2, N3 e Redes)</option>
                    <option value="GESTOR_OPERADOR">GESTOR_OPERADOR (Comando de Operadores)</option>
                    <option value="GESTOR">GESTOR (Gestão Operacional)</option>
                  </optgroup>
                  <optgroup label="Suporte Técnico & TI">
                    <option value="TECNICO_N3">TECNICO_N3 (Avançado / Infra / Servidores)</option>
                    <option value="TECNICO_N2">TECNICO_N2 (Hardware / Redes / Bancadas)</option>
                    <option value="TECNICO_N1">TECNICO_N1 (Helpdesk / Atendimento N1)</option>
                    <option value="TECNICO">TECNICO (Suporte Técnico)</option>
                  </optgroup>
                  <optgroup label="Recursos Humanos">
                    <option value="ANALISTA_RH">ANALISTA_RH (Analista de RH)</option>
                    <option value="RH">RH (Assistente / Operações de RH)</option>
                  </optgroup>
                  <optgroup label="Operacional">
                    <option value="OPERADOR">OPERADOR (Operações Básicas)</option>
                    <option value="LIMPEZA">LIMPEZA (Consumo e Higienização)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Setor de Lotação</label>
                <select id="edit-user-setor" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
                  <option value="">Sem setor definido</option>
                </select>
              </div>
            </div>

            <!-- PERMISSÕES ADICIONAIS / EXCEÇÕES GRANULARES -->
            <div class="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <i data-lucide="key" class="w-3.5 h-3.5 text-blue-600"></i> Permissões Específicas / Acessos Adicionais
                </span>
                <span class="text-[10px] text-slate-400 font-medium">Além do perfil base</span>
              </div>
              <p class="text-[11px] text-slate-500">Marque privilégios extras que este colaborador deve receber (ex: permitir que RH acesse e anexe documentos):</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="documentos.visualizar" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Documentos:</strong> Visualizar</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="documentos.enviar" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Documentos:</strong> Anexar / Enviar</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="ocorrencias.atender" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Ocorrências:</strong> Assumir Chamados</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="ocorrencias.escalonar" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Ocorrências:</strong> Escalonar N1/N2/N3</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="insumos.visualizar" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Insumos:</strong> Visualizar Estoque</span>
                </label>
                <label class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input type="checkbox" value="compras.criar" class="edit-perm-extra-cb rounded text-blue-600">
                  <span><strong>Compras:</strong> Solicitar Compras</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Status da Conta *</label>
              <select id="edit-user-status" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600">
                <option value="ATIVO">ATIVO (Acesso liberado)</option>
                <option value="INATIVO">INATIVO (Acesso pausado)</option>
                <option value="BLOQUEADO">BLOQUEADO (Acesso revogado)</option>
                <option value="PENDENTE">PENDENTE (Aguardando liberação)</option>
              </select>
            </div>

            <div class="border-t border-slate-100 pt-3">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Redefinir Senha (Opcional)</label>
                <button type="button" id="btn-gerar-senha-edit" class="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  <i data-lucide="key" class="w-3 h-3"></i> Gerar Senha Segura
                </button>
              </div>
              <input type="password" id="edit-user-senha" minlength="8"
                placeholder="Deixe em branco para manter a senha atual"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white font-mono">
              <p class="text-[11px] text-slate-400 mt-1">Preencha apenas caso deseje alterar a senha do usuário (mínimo 8 caracteres).</p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" id="btn-cancelar-modal-edicao"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" id="btn-salvar-edicao-usuario"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                <i data-lucide="save" class="w-4 h-4"></i> Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this._bind(container);
    await this._carregarTudo(container);

    if (window.lucide) lucide.createIcons();
  },

  _bind(container) {
    // Botão de refresh manual
    container.querySelector('#btn-refresh-auditoria')?.addEventListener('click', () => {
      this._carregarTudo(container);
    });

    // Botão de Diagnóstico de Envio de E-mail
    container.querySelector('#btn-testar-email-auditoria')?.addEventListener('click', () => {
      const userEmail = window.Auth?.getUsuario?.()?.email || '';
      const emailAdmin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail) ? userEmail : 'higor.sdds@gmail.com';
      const contentHtml = `
        <div class="space-y-4 text-xs">
          <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
            <p class="font-bold flex items-center gap-1.5">
              <i data-lucide="mail-check" class="w-4 h-4 text-indigo-600"></i> Diagnóstico Operacional de E-mail
            </p>
            <p class="mt-1 text-[11px] leading-relaxed text-indigo-800">
              Envie um e-mail de teste imediato para validar se seu provedor (Brevo API, Resend ou SMTP) está conectado e entregando mensagens sem bloqueios.
            </p>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">E-mail de Destino para Teste *</label>
            <input type="email" id="input-teste-email-destino" value="${emailAdmin}" required
              placeholder="Ex: seu-email@gmail.com"
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
          </div>
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] space-y-1.5 leading-relaxed">
            <p class="font-bold text-slate-700">Dicas para Provedor Brevo (Sendinblue):</p>
            <ul class="list-disc pl-4 space-y-1 text-slate-500">
              <li>O remetente configurado deve corresponder ao e-mail confirmado da sua conta Brevo.</li>
              <li>Contas novas no Brevo podem direcionar o primeiro e-mail para a pasta <strong>Spam / Lixo Eletrônico</strong> ou para a aba <strong>Promoções</strong> do Gmail.</li>
              <li>Acompanhe o status em tempo real pelo painel Brevo em <strong>Transactional &gt; Statistics</strong>.</li>
            </ul>
          </div>
        </div>
      `;

      if (window.UI?.openModal) {
        window.UI.openModal({
          title: 'Testar Conexão de E-mail',
          contentHtml,
          saveLabel: 'Disparar E-mail de Teste',
          cancelLabel: 'Fechar',
          onSave: async () => {
            const dest = document.getElementById('input-teste-email-destino')?.value?.trim();
            if (!dest || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
              if (window.UI?.toast) {
                window.UI.toast({ title: 'Atenção', message: 'Informe um endereço de e-mail válido.', type: 'warning' });
              }
              return false;
            }

            try {
              const res = await window.API.testarEmail(dest);
              if (window.UI?.toast) {
                window.UI.toast({
                  title: 'E-mail Enviado!',
                  message: res?.message || 'E-mail de teste disparado com sucesso.',
                  type: 'success'
                });
              }

              if (window.UI?.openModal) {
                setTimeout(() => {
                  window.UI.openModal({
                    title: 'Resultado do Teste de E-mail',
                    contentHtml: `
                      <div class="space-y-3 text-xs">
                        <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                          <p class="font-bold flex items-center gap-1.5 text-emerald-800">
                            ✅ Disparo Realizado com Sucesso!
                          </p>
                          <p class="mt-1 text-[11px] leading-relaxed text-emerald-700">
                            A requisição foi aceita pelo provedor <strong>${res?.provedor || 'BREVO_API'}</strong>.
                          </p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1.5">
                          <div><strong>Provedor:</strong> ${res?.provedor || 'BREVO_API'}</div>
                          <div><strong>Remetente:</strong> ${res?.remetente || 'Configurado'}</div>
                          <div><strong>Destinatário:</strong> ${dest}</div>
                          ${res?.messageId ? `<div><strong>ID da Mensagem:</strong> <code class="bg-white px-1.5 py-0.5 rounded border border-slate-200">${res.messageId}</code></div>` : ''}
                        </div>
                        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                          <p class="font-bold">⚠️ Não encontrou na Caixa de Entrada?</p>
                          <ol class="list-decimal pl-4 space-y-1 text-amber-800">
                            <li>Verifique a pasta <strong>Spam (Lixo Eletrônico)</strong> e a aba <strong>Promoções</strong> do Gmail.</li>
                            <li>No painel da Brevo, acesse <strong>Transactional &gt; Real-time / Logs</strong> para verificar se a mensagem está com status "Delivered" ou em análise de primeira ativação.</li>
                          </ol>
                        </div>
                      </div>
                    `,
                    cancelLabel: 'Entendido',
                    hideSave: true
                  });
                }, 300);
              }

              return true;
            } catch (err) {
              if (window.UI?.toast) {
                window.UI.toast({
                  title: 'Falha no Teste',
                  message: err.message || 'Erro ao enviar e-mail de teste.',
                  type: 'error'
                });
              }
              return false;
            }
          }
        });
      }
    });

    // Alternador de abas
    const tabs = container.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this._abaAtiva = target;

        tabs.forEach(t => {
          t.className = 'tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-slate-500 border-transparent hover:text-slate-800';
        });
        btn.className = 'tab-btn px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer text-blue-600 border-blue-600';

        container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        container.querySelector(`#aba-conteudo-${target}`)?.classList.remove('hidden');

        if (window.lucide) lucide.createIcons();
      });
    });

    // Form de aprovação / Edição de solicitação pelo Administrador
    const formAprovar = container.querySelector('#form-aprovar-usuario');
    if (formAprovar) {
      formAprovar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = container.querySelector('#aprovar-user-id').value;
        const nome = container.querySelector('#aprovar-user-nome-input')?.value.trim();
        const email = container.querySelector('#aprovar-user-email-input')?.value.trim();
        const perfil = container.querySelector('#aprovar-user-perfil').value;
        const setorId = container.querySelector('#aprovar-user-setor')?.value;
        const senha = container.querySelector('#aprovar-user-senha')?.value;
        const btn = container.querySelector('#btn-confirmar-aprovacao');

        if (!nome || nome.length < 3) {
          if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe o nome completo do usuário.', type: 'warning' });
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Liberando acesso...';

        try {
          const res = await window.API.aprovarSolicitacaoCadastro(id, {
            nome,
            email,
            perfil,
            setor_id: setorId ? Number(setorId) : null,
            senha: senha || undefined
          });

          document.getElementById('modal-aprovar-usuario')?.classList.add('hidden');
          await this._carregarTudo(container);

          if (res?.linkAtivacao) {
            window.UI.openModal({
              title: res?.emailEnviado ? 'Acesso Liberado com Sucesso' : 'Acesso Liberado (Atenção ao E-mail)',
              contentHtml: `
                <div class="space-y-3 text-xs">
                  <div class="p-3.5 ${res?.emailEnviado ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'} border rounded-xl">
                    <p class="font-bold">${res?.message}</p>
                  </div>
                  <div>
                    <label class="block font-bold text-slate-700 mb-1">Link Direto de Ativação (Uso Único):</label>
                    <div class="flex gap-2">
                      <input type="text" id="input-link-ativacao-copiar" readonly value="${res.linkAtivacao}"
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-700" />
                      <button type="button" id="btn-copiar-link-ativacao-modal"
                        class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs whitespace-nowrap">
                        Copiar
                      </button>
                    </div>
                    <p class="mt-1 text-[11px] text-slate-500">Você também pode enviar este link diretamente para o colaborador.</p>
                  </div>
                </div>
              `,
              cancelLabel: 'Fechar',
              hideSave: true
            });

            document.getElementById('btn-copiar-link-ativacao-modal')?.addEventListener('click', () => {
              const inp = document.getElementById('input-link-ativacao-copiar');
              if (inp) {
                inp.select();
                navigator.clipboard?.writeText(inp.value);
                if (window.UI?.toast) window.UI.toast({ title: 'Copiado', message: 'Link copiado para a área de transferência!', type: 'success' });
              }
            });
          } else if (window.UI?.toast) {
            window.UI.toast({
              title: 'Cadastro Aprovado',
              message: res?.message || `O acesso de "${nome}" foi liberado com sucesso!`,
              type: 'success'
            });
          }
        } catch (err) {
          if (window.UI?.toast) {
            window.UI.toast({ title: 'Erro na aprovação', message: err.message || 'Erro ao aprovar cadastro.', type: 'error' });
          }
        } finally {
          btn.disabled = false;
          btn.textContent = 'Confirmar e Liberar';
        }
      });
    }

    // Botão de Salvar Alterações na Solicitação (mantendo PENDENTE)
    const btnSalvarApenas = container.querySelector('#btn-salvar-apenas-solicitacao');
    btnSalvarApenas?.addEventListener('click', async () => {
      const id = container.querySelector('#aprovar-user-id').value;
      const nome = container.querySelector('#aprovar-user-nome-input')?.value.trim();
      const email = container.querySelector('#aprovar-user-email-input')?.value.trim();
      const perfil = container.querySelector('#aprovar-user-perfil')?.value;
      const setorId = container.querySelector('#aprovar-user-setor')?.value;
      const senha = container.querySelector('#aprovar-user-senha')?.value;

      if (!nome || nome.length < 3) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe o nome completo (mínimo 3 caracteres).', type: 'warning' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'Informe um e-mail válido.', type: 'warning' });
        return;
      }
      if (senha && senha.length < 8) {
        if (window.UI?.toast) window.UI.toast({ title: 'Atenção', message: 'A senha precisa ter pelo menos 8 caracteres.', type: 'warning' });
        return;
      }

      btnSalvarApenas.disabled = true;
      btnSalvarApenas.textContent = 'Salvando...';

      try {
        await window.API.updateAuditoriaSolicitacao(id, {
          nome,
          email,
          perfil,
          setor_id: setorId ? Number(setorId) : null,
          senha: senha || undefined
        });
        if (window.UI?.toast) {
          window.UI.toast({
            title: 'Solicitação Atualizada',
            message: `Dados da solicitação de "${nome}" salvos com sucesso!`,
            type: 'success'
          });
        }
        document.getElementById('modal-aprovar-usuario')?.classList.add('hidden');
        await this._carregarTudo(container);
      } catch (err) {
        if (window.UI?.toast) {
          window.UI.toast({ title: 'Erro ao Salvar', message: err.message || 'Não foi possível salvar os dados.', type: 'error' });
        }
      } finally {
        btnSalvarApenas.disabled = false;
        btnSalvarApenas.textContent = 'Salvar Alterações';
      }
    });

    // Gerador de senha no modal de aprovação/edição
    container.querySelector('#btn-gerar-senha-aprovar')?.addEventListener('click', () => {
      const inputSenha = container.querySelector('#aprovar-user-senha');
      if (inputSenha) {
        inputSenha.type = 'text';
        inputSenha.value = this._gerarSenhaAleatoria();
        inputSenha.select();
        if (window.UI?.toast) {
          window.UI.toast({ title: 'Senha Gerada', message: `Senha provisória gerada: ${inputSenha.value}`, type: 'info' });
        }
      }
    });

    // Modal de Cadastro Manual de Usuário
    const modalCad = container.querySelector('#modal-cadastrar-usuario');
    const fecharModalCad = () => modalCad?.classList.add('hidden');

    container.querySelector('#btn-fechar-modal-cadastro')?.addEventListener('click', fecharModalCad);
    container.querySelector('#btn-cancelar-modal-cadastro')?.addEventListener('click', fecharModalCad);

    // Gerador de senha aleatória no cadastro
    container.querySelector('#btn-gerar-senha-cad')?.addEventListener('click', () => {
      const inputSenha = container.querySelector('#cad-user-senha');
      if (inputSenha) {
        inputSenha.type = 'text';
        inputSenha.value = this._gerarSenhaAleatoria();
        inputSenha.select();
      }
    });

    // Submit do Cadastro de Usuário
    const formCad = container.querySelector('#form-cadastrar-usuario');
    if (formCad) {
      formCad.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = container.querySelector('#cad-user-nome')?.value.trim();
        const email = container.querySelector('#cad-user-email')?.value.trim();
        const perfil = container.querySelector('#cad-user-perfil')?.value;
        const setor_id = container.querySelector('#cad-user-setor')?.value;
        const senha = container.querySelector('#cad-user-senha')?.value;
        const btnSalvar = container.querySelector('#btn-salvar-novo-usuario');

        if (!nome || nome.length < 3) {
          if (window.UI?.toast) window.UI.toast({ title: 'Campo obrigatório', message: 'O nome deve ter no mínimo 3 caracteres.', type: 'warning' });
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (window.UI?.toast) window.UI.toast({ title: 'E-mail inválido', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return;
        }
        if (!senha || senha.length < 8) {
          if (window.UI?.toast) window.UI.toast({ title: 'Senha fraca', message: 'A senha provisória precisa ter pelo menos 8 caracteres.', type: 'warning' });
          return;
        }

        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Cadastrando...`;

        const permissoes_adicionais = Array.from(container.querySelectorAll('.cad-perm-extra-cb:checked')).map(cb => cb.value);

        try {
          await window.API.createUsuario({
            nome,
            email,
            senha,
            perfil,
            setor_id: setor_id ? Number(setor_id) : null,
            status: 'ATIVO',
            permissoes_adicionais
          });

          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Usuário Criado',
              message: `O colaborador "${nome}" foi cadastrado com sucesso e já está com acesso ativo!`,
              type: 'success'
            });
          }

          formCad.reset();
          fecharModalCad();
          await this._carregarTudo(container);
        } catch (err) {
          if (window.UI?.toast) window.UI.toast({ title: 'Erro no cadastro', message: err.message || 'Erro ao cadastrar novo usuário.', type: 'error' });
        } finally {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = `<i data-lucide="user-check" class="w-4 h-4"></i> Salvar Usuário`;
          if (window.lucide) lucide.createIcons({ root: btnSalvar });
        }
      });
    }

    // Modal de Edição de Usuário & Cargo
    const modalEdit = container.querySelector('#modal-editar-usuario');
    const fecharModalEdit = () => modalEdit?.classList.add('hidden');

    container.querySelector('#btn-fechar-modal-edicao')?.addEventListener('click', fecharModalEdit);
    container.querySelector('#btn-cancelar-modal-edicao')?.addEventListener('click', fecharModalEdit);

    // Gerador de senha aleatória na edição
    container.querySelector('#btn-gerar-senha-edit')?.addEventListener('click', () => {
      const inputSenha = container.querySelector('#edit-user-senha');
      if (inputSenha) {
        inputSenha.type = 'text';
        inputSenha.value = this._gerarSenhaAleatoria();
        inputSenha.select();
      }
    });

    // Submit da Edição de Usuário & Cargo
    const formEdit = container.querySelector('#form-editar-usuario');
    if (formEdit) {
      formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = container.querySelector('#edit-user-id')?.value;
        const nome = container.querySelector('#edit-user-nome')?.value.trim();
        const email = container.querySelector('#edit-user-email')?.value.trim();
        const perfil = container.querySelector('#edit-user-perfil')?.value;
        const setor_id = container.querySelector('#edit-user-setor')?.value;
        const status = container.querySelector('#edit-user-status')?.value;
        const senha = container.querySelector('#edit-user-senha')?.value;
        const btnSalvar = container.querySelector('#btn-salvar-edicao-usuario');

        if (!nome || nome.length < 3) {
          if (window.UI?.toast) window.UI.toast({ title: 'Campo obrigatório', message: 'O nome deve ter no mínimo 3 caracteres.', type: 'warning' });
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (window.UI?.toast) window.UI.toast({ title: 'E-mail inválido', message: 'Informe um e-mail corporativo válido.', type: 'warning' });
          return;
        }
        if (!perfil) {
          if (window.UI?.toast) window.UI.toast({ title: 'Cargo obrigatório', message: 'Selecione o cargo/perfil de permissão do usuário.', type: 'warning' });
          return;
        }
        if (senha && senha.length < 8) {
          if (window.UI?.toast) window.UI.toast({ title: 'Senha curta', message: 'A nova senha precisa ter pelo menos 8 caracteres.', type: 'warning' });
          return;
        }

        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Salvando...`;

        const permissoes_adicionais = Array.from(container.querySelectorAll('.edit-perm-extra-cb:checked')).map(cb => cb.value);

        const payload = {
          nome,
          email,
          perfil,
          setor_id: setor_id ? Number(setor_id) : null,
          status: status || 'ATIVO',
          permissoes_adicionais
        };
        if (senha && senha.length >= 8) {
          payload.senha = senha;
        }

        try {
          await window.API.updateUsuario(id, payload);

          if (window.UI?.toast) {
            window.UI.toast({
              title: 'Usuário Atualizado',
              message: `As informações e o cargo de "${nome}" foram atualizados com sucesso!`,
              type: 'success'
            });
          }

          fecharModalEdit();
          await this._carregarTudo(container);
        } catch (err) {
          if (window.UI?.toast) {
            window.UI.toast({ title: 'Erro ao salvar', message: err.message || 'Erro ao atualizar usuário.', type: 'error' });
          }
        } finally {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Salvar Alterações`;
          if (window.lucide) lucide.createIcons({ root: btnSalvar });
        }
      });
    }
  },

  async _carregarTudo(container) {
    await Promise.allSettled([
      this._carregarSolicitacoes(container),
      this._carregarOnline(container),
      this._carregarUsuarios(container),
      this._carregarLogs(container)
    ]);
    if (window.lucide) lucide.createIcons();
  },

  // ─── ABA 1: SOLICITAÇÕES DE CADASTRO (STATUS PENDENTE) ────────────────────
  async _carregarSolicitacoes(container) {
    const wrap = container.querySelector('#aba-conteudo-solicitacoes');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaSolicitacoes();
      const pendentes = Array.isArray(res) ? res : (res?.data || []);

      // Atualiza KPI e badge
      const kpiPendentes = container.querySelector('#kpi-pendentes');
      const badgeAba = container.querySelector('#badge-aba-pendentes');
      if (kpiPendentes) kpiPendentes.textContent = pendentes.length;
      if (badgeAba) {
        badgeAba.textContent = pendentes.length;
        if (pendentes.length > 0) badgeAba.classList.remove('hidden');
        else badgeAba.classList.add('hidden');
      }

      if (!pendentes.length) {
        wrap.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-hub-sm">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="check-check" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-extrabold text-slate-800">Nenhuma solicitação pendente</h4>
            <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Todas as contas solicitadas já foram analisadas. Novos cadastros aparecerão aqui automaticamente.
            </p>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 shrink-0"></i>
            <div>
              <h5 class="text-xs font-bold text-amber-900">Solicitações de Acesso Pendentes (${pendentes.length})</h5>
              <p class="text-[11px] text-amber-700">Usuários cadastrados na tela de login que necessitam de aprovação administrativa para acessar.</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Usuário</th>
                  <th class="py-3 px-4">E-mail</th>
                  <th class="py-3 px-4">Setor</th>
                  <th class="py-3 px-4">Data do Pedido</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${pendentes.map(u => `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        ${this._iniciais(u.nome)}
                      </div>
                      <span>${this._esc(u.nome)}</span>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-slate-600">${this._esc(u.email)}</td>
                    <td class="py-3.5 px-4 text-slate-500">${this._esc(u.setor_nome || 'Geral / Não atribuído')}</td>
                    <td class="py-3.5 px-4 text-slate-400 font-mono">${u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PENDENTE
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button type="button" onclick="AuditoriaModule.abrirModalAprovacao(${u.id}, '${this._esc(u.nome)}', '${this._esc(u.email)}', ${u.setor_id || 'null'}, '${u.perfil || 'OPERADOR'}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs border border-blue-200 transition-colors cursor-pointer" title="Digitar e editar dados da solicitação">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar
                      </button>
                      <button type="button" onclick="AuditoriaModule.abrirModalAprovacao(${u.id}, '${this._esc(u.nome)}', '${this._esc(u.email)}', ${u.setor_id || 'null'}, '${u.perfil || 'OPERADOR'}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer" title="Liberar acesso ao usuário">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i> Liberar Acesso
                      </button>
                      <button type="button" onclick="AuditoriaModule.rejeitarCadastro(${u.id}, '${this._esc(u.nome)}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer" title="Rejeitar cadastro">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i> Rejeitar
                      </button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500 bg-red-50 rounded-2xl">${this._esc(err.message || 'Erro ao carregar solicitações.')}</div>`;
    }
  },

  async abrirModalAprovacao(id, nome, email, setor_id = null, perfil = 'OPERADOR') {
    const modal = document.getElementById('modal-aprovar-usuario');
    if (!modal) return;
    document.getElementById('aprovar-user-id').value = id;
    const inputNome = document.getElementById('aprovar-user-nome-input');
    if (inputNome) inputNome.value = nome || '';
    const inputEmail = document.getElementById('aprovar-user-email-input');
    if (inputEmail) inputEmail.value = email || '';
    const selectPerfil = document.getElementById('aprovar-user-perfil');
    if (selectPerfil) selectPerfil.value = perfil || 'OPERADOR';
    const inputSenha = document.getElementById('aprovar-user-senha');
    if (inputSenha) {
      inputSenha.value = '';
      inputSenha.type = 'password';
    }

    const selectSetor = document.getElementById('aprovar-user-setor');
    if (selectSetor) {
      selectSetor.innerHTML = '<option value="">Carregando setores...</option>';
      try {
        const setores = await window.API.getSetores().catch(() => []);
        selectSetor.innerHTML = '<option value="">Selecione o setor de lotação...</option>' +
          (setores || []).map(s => `<option value="${s.id}" ${setor_id && Number(setor_id) === Number(s.id) ? 'selected' : ''}>${s.nome}</option>`).join('');
      } catch (_) {
        selectSetor.innerHTML = '<option value="">Setor não atribuído</option>';
      }
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  async rejeitarCadastro(id, nome) {
    const contentHtml = `
      <div class="space-y-4 text-xs">
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <p class="font-bold">Atenção ao rejeitar a solicitação:</p>
          <p class="mt-1">O acesso do usuário <strong>"${this._esc(nome)}"</strong> não será liberado e uma notificação formal será enviada ao e-mail cadastrado.</p>
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Motivo da Decisão (opcional, será incluído no e-mail)</label>
          <textarea id="modal-motivo-rejeicao" rows="3"
            class="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:outline-none"
            placeholder="Ex.: Dados cadastrais insuficientes, solicitação duplicada ou vínculo institucional não verificado."></textarea>
        </div>
      </div>
    `;

    if (window.UI?.openModal) {
      window.UI.openModal({
        title: 'Rejeitar Solicitação de Cadastro',
        contentHtml,
        saveLabel: 'Confirmar Rejeição',
        cancelLabel: 'Cancelar',
        onSave: async () => {
          const motivo = document.getElementById('modal-motivo-rejeicao')?.value?.trim() || '';
          try {
            await window.API.rejeitarSolicitacaoCadastro(id, { motivo });
            if (window.UI?.toast) {
              window.UI.toast({
                title: 'Solicitação Rejeitada',
                message: `O cadastro do usuário "${nome}" foi rejeitado e o solicitante foi notificado por e-mail.`,
                type: 'info'
              });
            }
            const container = document.getElementById('main-content');
            if (container) await this._carregarTudo(container);
            return true;
          } catch (err) {
            if (window.UI?.toast) {
              window.UI.toast({ title: 'Erro', message: err.message || 'Erro ao rejeitar cadastro.', type: 'error' });
            }
            return false;
          }
        }
      });
    }
  },

  async reenviarAtivacao(id, nome) {
    const confirmado = await new Promise(resolve => {
      if (window.UI?.confirmModal) {
        window.UI.confirmModal({
          title: 'Reenviar Link de Ativação',
          message: `Deseja gerar um novo link seguro de ativação e reenviar por e-mail para "${nome}"? O link anterior deixará de funcionar imediatamente.`,
          confirmText: 'Reenviar E-mail',
          cancelText: 'Cancelar',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      } else {
        resolve(false);
      }
    });
    if (!confirmado) return;

    try {
      const res = await window.API.reenviarLinkAtivacao(id);
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Link Reenviado',
          message: res?.message || `Novo link de ativação enviado com sucesso para "${nome}".`,
          type: 'success'
        });
      }
      const container = document.getElementById('main-content');
      if (container) await this._carregarTudo(container);
    } catch (err) {
      if (window.UI?.toast) {
        window.UI.toast({ title: 'Erro ao reenviar', message: err.message || 'Falha ao reenviar ativação.', type: 'error' });
      }
    }
  },

  // ─── ABA 2: USUÁRIOS ONLINE EM TEMPO REAL ──────────────────────────────────
  async _carregarOnline(container) {
    const wrap = container.querySelector('#aba-conteudo-online');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaUsuariosOnline();
      const onlineList = Array.isArray(res) ? res : (res?.data || []);

      const kpiOnline = container.querySelector('#kpi-online');
      if (kpiOnline) kpiOnline.textContent = onlineList.length;

      if (!onlineList.length) {
        wrap.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-hub-sm">
            <i data-lucide="wifi-off" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-700">Nenhum usuário online no momento</h4>
            <p class="text-xs text-slate-400 mt-1">Nenhum heartbeat foi detectado nos últimos 5 minutos.</p>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${onlineList.map(u => `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-hub-sm flex items-start gap-3 relative overflow-hidden">
              <span class="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-bl-lg"></span>
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
                ${this._iniciais(u.nome)}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <h4 class="text-xs font-extrabold text-slate-900 truncate">${this._esc(u.nome)}</h4>
                </div>
                <span class="text-[11px] font-mono text-slate-500 block truncate">${this._esc(u.email)}</span>
                <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${this._esc(u.perfil)}</span>
                  <span>${u.setor_nome ? this._esc(u.setor_nome) : 'Geral'}</span>
                  <span class="ml-auto font-mono text-emerald-600 font-bold">Online</span>
                </div>
              </div>
            </div>`).join('')}
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar usuários online.')}</div>`;
    }
  },

  // ─── ABA 3: TODOS OS USUÁRIOS & HISTÓRICO DE AÇÕES ────────────────────────
  async _carregarUsuarios(container) {
    const wrap = container.querySelector('#aba-conteudo-usuarios');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaUsuarios();
      const usuarios = Array.isArray(res) ? res : (res?.data || []);
      this._usuarios = usuarios;

      const kpiTotal = container.querySelector('#kpi-total-usuarios');
      if (kpiTotal) kpiTotal.textContent = usuarios.length;

      const usuarioAtual = window.Auth?.getUsuario?.();

      wrap.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
          <input id="input-filtro-usuarios" type="text" placeholder="Filtrar por nome ou e-mail..."
            class="rounded-xl border border-slate-200 px-4 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 w-full sm:w-72">
          <button type="button" onclick="AuditoriaModule.abrirModalCadastro()"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer whitespace-nowrap">
            <i data-lucide="user-plus" class="w-4 h-4"></i> Cadastrar Novo Usuário
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Nome</th>
                  <th class="py-3 px-4">E-mail</th>
                  <th class="py-3 px-4">Cargo / Perfil</th>
                  <th class="py-3 px-4">Setor</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Ações Auditadas</th>
                  <th class="py-3 px-4">Último Acesso</th>
                  <th class="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody id="tbody-usuarios" class="divide-y divide-slate-100">
                ${usuarios.map(u => {
                  const isMe = usuarioAtual && Number(usuarioAtual.id) === Number(u.id);
                  const isAtivo = u.status === 'ATIVO';

                  return `
                  <tr class="hover:bg-slate-50/60 transition-colors user-row" data-nome="${this._esc(u.nome).toLowerCase()}" data-email="${this._esc(u.email).toLowerCase()}">
                    <td class="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                        ${this._iniciais(u.nome)}
                      </div>
                      <div class="flex flex-col">
                        <span>${this._esc(u.nome)}</span>
                        ${isMe ? '<span class="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">(Sua Conta)</span>' : ''}
                      </div>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-600">${this._esc(u.email)}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${u.perfil === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'}">
                        ${this._esc(u.perfil)}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600">
                      ${this._esc(u.setor_nome || 'Não definido')}
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${this._statusBadgeUser(u.status)}">
                        ${this._esc(u.status)}
                      </span>
                    </td>
                    <td class="py-3 px-4 font-bold text-slate-700">
                      <span class="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                        ${u.total_acoes || 0} ações
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      ${u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca'}
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-1">
                        <!-- Alternar Status (Ativo / Inativo) -->
                        ${isAtivo ? `
                          <button type="button" ${isMe ? 'disabled' : `onclick="AuditoriaModule.alternarStatus(${u.id}, 'INATIVO', '${this._esc(u.nome)}')"`}
                            title="${isMe ? 'Você não pode inativar sua própria conta' : 'Inativar usuário'}"
                            class="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 transition-colors ${isMe ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}">
                            <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : `
                          <button type="button" onclick="AuditoriaModule.alternarStatus(${u.id}, 'ATIVO', '${this._esc(u.nome)}')"
                            title="Ativar usuário"
                            class="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer">
                            <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                          </button>
                        `}

                        <!-- Botão de Reenviar Link de Ativação caso esteja aguardando -->
                        ${u.status === 'AGUARDANDO_ATIVACAO' ? `
                          <button type="button" onclick="AuditoriaModule.reenviarAtivacao(${u.id}, '${this._esc(u.nome)}')"
                            title="Reenviar link seguro de ativação por e-mail"
                            class="p-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 hover:border-purple-300 text-purple-600 transition-colors cursor-pointer">
                            <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}

                        <!-- Editar Usuário & Trocar Cargo -->
                        <button type="button" onclick="AuditoriaModule.abrirModalEdicao(${u.id})"
                          title="Editar dados e trocar cargo"
                          class="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-blue-600 transition-colors cursor-pointer">
                          <i data-lucide="user-cog" class="w-3.5 h-3.5"></i>
                        </button>

                        <!-- Histórico de Auditoria -->
                        <button type="button" onclick="AuditoriaModule.abrirHistoricoUsuario(${u.id})"
                          title="Ver histórico de auditoria"
                          class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
                          <i data-lucide="history" class="w-3.5 h-3.5"></i>
                        </button>

                        <!-- Excluir Usuário (Soft Delete) -->
                        <button type="button" ${isMe ? 'disabled' : `onclick="AuditoriaModule.excluirUsuario(${u.id}, '${this._esc(u.nome)}')"`}
                          title="${isMe ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}"
                          class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors ${isMe ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      if (window.lucide) lucide.createIcons({ root: wrap });

      // Filtro local instantâneo
      container.querySelector('#input-filtro-usuarios')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        container.querySelectorAll('.user-row').forEach(row => {
          const nome = row.dataset.nome || '';
          const email = row.dataset.email || '';
          row.style.display = (nome.includes(q) || email.includes(q)) ? '' : 'none';
        });
      });
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar lista de usuários.')}</div>`;
    }
  },

  async abrirHistoricoUsuario(id) {
    const modal = document.getElementById('modal-historico-usuario');
    const conteudo = document.getElementById('conteudo-historico-usuario');
    if (!modal || !conteudo) return;

    modal.classList.remove('hidden');
    conteudo.innerHTML = '<div class="py-12 text-center text-xs text-slate-400">Carregando trilha de auditoria do usuário...</div>';

    try {
      const res = await window.API.getAuditoriaHistoricoUsuario(id);
      const data = res?.data || res;
      const u = data.usuario;
      const acoes = data.acoes || [];

      conteudo.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Atividades</span>
              <h3 class="text-base font-extrabold text-slate-900 mt-0.5">${this._esc(u.nome)}</h3>
              <p class="text-xs font-mono text-slate-500">${this._esc(u.email)} • Perfil: ${this._esc(u.perfil)}</p>
            </div>
            <button type="button" onclick="document.getElementById('modal-historico-usuario').classList.add('hidden')"
              class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-700">Registros Recentes (${acoes.length})</h4>
            ${!acoes.length ? `
              <p class="text-xs text-slate-400 py-6 text-center">Nenhuma ação registrada para este usuário.</p>` : `
              <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                ${acoes.map(a => `
                  <div class="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors text-xs flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200/80">${this._esc(a.acao)}</span>
                      <span class="text-[10px] font-mono text-slate-400">${a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : ''}</span>
                    </div>
                    ${a.descricao ? `<p class="text-slate-600 mt-1">${this._esc(a.descricao)}</p>` : ''}
                    <div class="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/50">
                      ${a.entidade ? `<span>Entidade: ${this._esc(a.entidade)} #${a.entidade_id || ''}</span>` : ''}
                      ${a.ip ? `<span>IP: ${this._esc(a.ip)}</span>` : ''}
                    </div>
                  </div>`).join('')}
              </div>`}
          </div>

          <div class="pt-3 border-t border-slate-100 text-right">
            <button type="button" onclick="document.getElementById('modal-historico-usuario').classList.add('hidden')"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
              Fechar
            </button>
          </div>
        </div>`;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      conteudo.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar histórico.')}</div>`;
    }
  },

  // ─── ABA 4: TRILHA GERAL DE AUDITORIA (LOGS) ──────────────────────────────
  async _carregarLogs(container) {
    const wrap = container.querySelector('#aba-conteudo-logs');
    if (!wrap) return;

    try {
      const res = await window.API.getAuditoriaLogs({ limit: 50 });
      const logs = res?.data || [];
      const total = res?.meta?.total || logs.length;

      const kpiLogs = container.querySelector('#kpi-total-logs');
      if (kpiLogs) kpiLogs.textContent = total;

      wrap.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-hub-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <h4 class="text-xs font-extrabold text-slate-900">Últimos Eventos Auditados (${total} registros)</h4>
            <span class="text-[11px] text-slate-400">Exibindo os 50 mais recentes</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Data/Hora</th>
                  <th class="py-3 px-4">Ação</th>
                  <th class="py-3 px-4">Usuário</th>
                  <th class="py-3 px-4">Descrição</th>
                  <th class="py-3 px-4">IP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                ${logs.map(l => `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      ${l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : ''}
                    </td>
                    <td class="py-2.5 px-4 font-bold text-slate-800">
                      <span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        ${this._esc(l.acao)}
                      </span>
                    </td>
                    <td class="py-2.5 px-4 text-slate-700 font-sans font-bold">
                      ${this._esc(l.usuario_nome || 'Sistema')}
                    </td>
                    <td class="py-2.5 px-4 text-slate-600 font-sans max-w-md truncate">
                      ${this._esc(l.descricao || '-')}
                    </td>
                    <td class="py-2.5 px-4 text-slate-400 text-[10px]">
                      ${this._esc(l.ip || '-')}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="p-6 text-center text-xs text-red-500">${this._esc(err.message || 'Erro ao carregar logs.')}</div>`;
    }
  },

  // ─── CADASTRO MANUAL DE USUÁRIO (ADMIN) ─────────────────────────────────────
  async abrirModalCadastro() {
    const modal = document.getElementById('modal-cadastrar-usuario');
    const form = document.getElementById('form-cadastrar-usuario');
    if (!modal) return;
    if (form) form.reset();

    // Carregar setores via window.API (padrão do projeto)
    const selectSetor = document.getElementById('cad-user-setor');
    if (selectSetor && (!this._setores || !this._setores.length)) {
      try {
        const res = await window.API.getSetores();
        this._setores = Array.isArray(res) ? res : (res?.data || []);
      } catch (_) {
        this._setores = [];
      }
    }
    if (selectSetor) {
      selectSetor.innerHTML = '<option value="">Sem setor definido</option>' +
        (this._setores || []).map(s =>
          `<option value="${s.id}">${this._esc(s.nome)}</option>`
        ).join('');
    }

    // Resetar campo de senha para type password
    const inputSenha = document.getElementById('cad-user-senha');
    if (inputSenha) inputSenha.type = 'password';

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  // ─── EDIÇÃO DE USUÁRIO & CARGO (ADMIN) ──────────────────────────────────────
  async abrirModalEdicao(id) {
    const modal = document.getElementById('modal-editar-usuario');
    const form = document.getElementById('form-editar-usuario');
    if (!modal) return;
    if (form) form.reset();

    // Carregar setores se necessário
    const selectSetor = document.getElementById('edit-user-setor');
    if (selectSetor && (!this._setores || !this._setores.length)) {
      try {
        const res = await window.API.getSetores();
        this._setores = Array.isArray(res) ? res : (res?.data || []);
      } catch (_) {
        this._setores = [];
      }
    }

    // Buscar dados completos do usuário da API para obter permissoes_adicionais atualizadas
    let u = null;
    try {
      const getFn = window.API.getUsuario ? window.API.getUsuario.bind(window.API) : window.API.getUsuarioById.bind(window.API);
      const res = await getFn(id);
      u = res?.data || res;
    } catch (_) {
      u = (this._usuarios || []).find(item => Number(item.id) === Number(id));
    }

    if (!u) {
      if (window.UI?.toast) {
        window.UI.toast({ title: 'Erro', message: 'Não foi possível carregar os dados do usuário.', type: 'error' });
      }
      return;
    }

    // Preencher campos
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-nome').value = u.nome || '';
    document.getElementById('edit-user-email').value = u.email || '';
    document.getElementById('edit-user-perfil').value = u.perfil || 'OPERADOR';
    document.getElementById('edit-user-status').value = u.status || 'ATIVO';

    // Marcar checkboxes de permissões adicionais
    const editPermCbs = modal.querySelectorAll('.edit-perm-extra-cb');
    const userPerms = Array.isArray(u.permissoes_adicionais) ? u.permissoes_adicionais : [];
    editPermCbs.forEach(cb => {
      cb.checked = userPerms.includes(cb.value);
    });

    const inputSenha = document.getElementById('edit-user-senha');
    if (inputSenha) {
      inputSenha.type = 'password';
      inputSenha.value = '';
    }

    if (selectSetor) {
      selectSetor.innerHTML = '<option value="">Sem setor definido</option>' +
        (this._setores || []).map(s =>
          `<option value="${s.id}" ${Number(s.id) === Number(u.setor_id) ? 'selected' : ''}>${this._esc(s.nome)}</option>`
        ).join('');
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  async alternarStatus(id, novoStatus, nome) {
    const usuarioAtual = window.Auth?.getUsuario?.();
    if (usuarioAtual && Number(usuarioAtual.id) === Number(id)) {
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Operação não permitida',
          message: 'Você não pode alterar o status da sua própria conta.',
          type: 'warning'
        });
      }
      return;
    }

    const isAtivar = novoStatus === 'ATIVO';
    const acaoTexto = isAtivar ? 'Ativar' : 'Inativar';

    if (window.UI?.confirmModal) {
      window.UI.confirmModal({
        title: `${acaoTexto} Usuário`,
        message: isAtivar
          ? `Deseja reativar o acesso de "${nome}" ao sistema?`
          : `Deseja inativar o acesso de "${nome}"? O colaborador perderá o acesso ao sistema até ser reativado.`,
        confirmText: `Sim, ${acaoTexto}`,
        danger: !isAtivar,
        onConfirm: async () => {
          try {
            await window.API.updateUsuarioStatus(id, novoStatus);
            if (window.UI?.toast) {
              window.UI.toast({
                title: `Usuário ${isAtivar ? 'Ativado' : 'Inativado'}`,
                message: `O status de "${nome}" foi alterado para ${novoStatus}.`,
                type: 'success'
              });
            }
            if (this._container) await this._carregarTudo(this._container);
          } catch (err) {
            if (window.UI?.toast) {
              window.UI.toast({
                title: 'Erro ao alterar status',
                message: err.message || 'Falha na alteração de status.',
                type: 'error'
              });
            }
          }
        }
      });
    }
  },

  async excluirUsuario(id, nome) {
    const usuarioAtual = window.Auth?.getUsuario?.();
    if (usuarioAtual && Number(usuarioAtual.id) === Number(id)) {
      if (window.UI?.toast) {
        window.UI.toast({
          title: 'Operação não permitida',
          message: 'Você não pode excluir sua própria conta de administrador.',
          type: 'warning'
        });
      }
      return;
    }

    if (window.UI?.confirmModal) {
      window.UI.confirmModal({
        title: 'Excluir Usuário',
        message: `Tem certeza que deseja remover o usuário "${nome}"? Esta operação desativará o usuário (Soft Delete) mantendo todo o histórico de auditoria preservado.`,
        confirmText: 'Sim, Excluir',
        danger: true,
        onConfirm: async () => {
          try {
            await window.API.deleteUsuario(id);
            if (window.UI?.toast) {
              window.UI.toast({
                title: 'Usuário Removido',
                message: `O usuário "${nome}" foi removido com sucesso.`,
                type: 'success'
              });
            }
            if (this._container) await this._carregarTudo(this._container);
          } catch (err) {
            if (window.UI?.toast) {
              window.UI.toast({
                title: 'Erro ao excluir usuário',
                message: err.message || 'Falha ao remover usuário.',
                type: 'error'
              });
            }
          }
        }
      });
    }
  },

  _gerarSenhaAleatoria() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  },

  _statusBadgeUser(status) {
    const s = String(status).toUpperCase();
    if (s === 'ATIVO') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'PENDENTE') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (s === 'AGUARDANDO_ATIVACAO') return 'bg-purple-50 text-purple-700 border border-purple-200';
    if (s === 'REJEITADO') return 'bg-rose-50 text-rose-700 border border-rose-200';
    if (s === 'INATIVO') return 'bg-slate-100 text-slate-700 border border-slate-300';
    if (s === 'BLOQUEADO') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
  },

  _iniciais(nome) {
    if (!nome) return 'ES';
    const partes = String(nome).trim().split(' ').filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

window.AuditoriaModule = AuditoriaModule;
window.Modules.auditoria = AuditoriaModule;
