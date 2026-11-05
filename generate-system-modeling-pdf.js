const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('🚀 Compilando Documento Enciclopédico e Definitivo de Modelagem de Sistemas HUB ES+...');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documento de Engenharia de Software e Modelagem de Sistemas - HUB ES+ SECULT</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
      @bottom-right {
        content: "Página " counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @top-left {
        content: "HUB ES+ • SECULT / SENAI-ES | Documentação Oficial de Engenharia de Software";
        font-family: 'Inter', sans-serif;
        font-size: 7.5pt;
        color: #94a3b8;
        font-weight: 600;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* CAPA OFICIAL */
    .cover-page {
      page-break-after: always;
      min-height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 45px 30px;
      border-radius: 12px;
      background: linear-gradient(135deg, #090d16 0%, #0f172a 40%, #0369a1 100%);
      color: #ffffff;
      box-shadow: inset 0 0 120px rgba(0,0,0,0.5);
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      padding-bottom: 25px;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: rgba(255,255,255,0.1);
      padding: 10px 20px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.25);
    }

    .brand-circle {
      width: 14px;
      height: 14px;
      background: #38bdf8;
      border-radius: 50%;
      box-shadow: 0 0 12px #38bdf8;
    }

    .gov-seal {
      font-size: 8.5pt;
      text-align: right;
      color: #cbd5e1;
      line-height: 1.35;
    }

    .cover-body {
      margin: auto 0;
      padding: 40px 0;
    }

    .doc-category {
      color: #38bdf8;
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 15px;
    }

    .doc-title {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.5px;
      margin: 0 0 15px 0;
      color: #ffffff;
    }

    .doc-subtitle {
      font-size: 12pt;
      color: #94a3b8;
      font-weight: 400;
      max-width: 680px;
      line-height: 1.5;
      margin-bottom: 30px;
    }

    .cover-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .cover-tag {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 8pt;
      color: #e2e8f0;
    }

    .cover-footer {
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }

    .meta-box h4 {
      margin: 0 0 4px 0;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    .meta-box p {
      margin: 0;
      font-size: 8.5pt;
      font-weight: 700;
      color: #ffffff;
    }

    /* PÁGINAS E SEÇÕES */
    .page-break {
      page-break-after: always;
    }

    h1, h2, h3, h4 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 22px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    h1 {
      font-size: 16pt;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 0;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1 .chap-num {
      background: #0284c7;
      color: #ffffff;
      font-size: 10pt;
      padding: 2px 8px;
      border-radius: 5px;
      font-weight: 800;
    }

    h2 {
      font-size: 12pt;
      border-left: 4px solid #0284c7;
      padding-left: 8px;
      margin-top: 18px;
      color: #1e293b;
    }

    h3 {
      font-size: 10pt;
      color: #334155;
      margin-top: 14px;
    }

    p {
      margin: 0 0 8px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 0 0 10px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }

    /* TABELAS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 7.8pt;
      page-break-inside: avoid;
      background: #ffffff;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.2pt;
      letter-spacing: 0.3px;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* CAIXAS DE DESTAQUE */
    .card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .card.alert-info { border-left: 4px solid #0284c7; background: #f0f9ff; }
    .card.alert-warning { border-left: 4px solid #f59e0b; background: #fffbeb; }
    .card.alert-success { border-left: 4px solid #10b981; background: #f0fdf4; }
    .card.alert-danger { border-left: 4px solid #ef4444; background: #fef2f2; }

    .card-title {
      font-weight: 700;
      font-size: 8.5pt;
      margin-bottom: 4px;
    }

    .card.alert-info .card-title { color: #0369a1; }
    .card.alert-warning .card-title { color: #b45309; }
    .card.alert-success .card-title { color: #047857; }
    .card.alert-danger .card-title { color: #b91c1c; }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
    .badge-gray { background: #f1f5f9; color: #475569; }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.8pt;
      background: #f1f5f9;
      padding: 1px 3px;
      border-radius: 3px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }

    pre {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.2pt;
      background: #0f172a;
      color: #e2e8f0;
      padding: 10px;
      border-radius: 6px;
      overflow-x: hidden;
      white-space: pre-wrap;
      line-height: 1.35;
      margin: 8px 0 12px 0;
      page-break-inside: avoid;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #cbd5e1;
      font-size: 8.5pt;
    }

    .toc-title { font-weight: 600; color: #1e293b; }
    .toc-page { font-weight: 700; color: #0284c7; }
    .toc-sub { padding-left: 18px; font-size: 8pt; color: #64748b; }
  </style>
</head>
<body>

  <!-- CAPA OFICIAL -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="brand-badge">
        <div class="brand-circle"></div>
        HUB ES+ • SECULT / SENAI-ES
      </div>
      <div class="gov-seal">
        <strong>GOVERNO DO ESTADO DO ESPÍRITO SANTO</strong><br>
        Secretaria de Estado da Cultura (SECULT)<br>
        Parceria Técnica SENAI / Sistema FINDES
      </div>
    </div>

    <div class="cover-body">
      <div class="doc-category">Documento de Engenharia de Software & Arquitetura Integral</div>
      <h1 class="doc-title">ENCICLOPÉDIA DE MODELAGEM DE SISTEMAS, DADOS & GOVERNANÇA</h1>
      <div class="doc-subtitle">
        Documentação exaustiva de Engenharia de Software da plataforma integrada HUB ES+: Arquitetura C4, Catálogo Completo das 42 Rotas REST, Dicionário Relacional Exaustivo de 16 Tabelas, Matriz RBAC Integral de 15 Perfis e 42 Permissões, Especificação dos 18 Casos de Uso, Protocolos Criptográficos, Motor de Acessibilidade WCAG 2.1 AA e Telemetria de Estresse.
      </div>

      <div class="cover-tags">
        <span class="cover-tag">📐 C4 Model (Níveis 1 ao 4)</span>
        <span class="cover-tag">🗄️ Dicionário Exaustivo (16 Tabelas)</span>
        <span class="cover-tag">🌐 Catálogo Completo (42 Rotas REST)</span>
        <span class="cover-tag">🔒 Matriz RBAC (15 Perfis x 42 Permissões)</span>
        <span class="cover-tag">👥 18 Casos de Uso com Fluxos Alternativos</span>
        <span class="cover-tag">⚡ Edge Functions + SQLite D1 & TiDB</span>
        <span class="cover-tag">♿ A11y WCAG 2.1 AA & VLibras Nativo</span>
      </div>
    </div>

    <div class="cover-footer">
      <div class="meta-box">
        <h4>Versão do Sistema</h4>
        <p>v2.4.3 / 2026.5</p>
      </div>
      <div class="meta-box">
        <h4>Status de Homologação</h4>
        <p>Produção Ativa (100% Validada)</p>
      </div>
      <div class="meta-box">
        <h4>Ambiente</h4>
        <p>Cloudflare Pages + D1 Edge</p>
      </div>
      <div class="meta-box">
        <h4>Data de Emissão</h4>
        <p>05 de Novembro de 2026</p>
      </div>
    </div>
  </div>

  <!-- SUMÁRIO -->
  <h1><span class="chap-num">TOC</span> SUMÁRIO GERAL</h1>
  <div style="margin: 15px 0;">
    <div class="toc-item"><span class="toc-title">1. Contexto, Princípios Arquiteturais & Regras de Ouro</span><span class="toc-page">Pág. 2</span></div>
    <div class="toc-item toc-sub"><span>1.1 Propósito Estratégico & Justificativa Pública</span></div>
    <div class="toc-item toc-sub"><span>1.2 Preservação Arquitetural e Diretrizes Inegociáveis (AGENTS.md)</span></div>

    <div class="toc-item"><span class="toc-title">2. Engenharia de Requisitos Exaustiva (RF & RNF)</span><span class="toc-page">Pág. 3</span></div>
    <div class="toc-item toc-sub"><span>2.1 Especificação Detalhada dos 14 Requisitos Funcionais (RF-01 a RF-14)</span></div>
    <div class="toc-item toc-sub"><span>2.2 Requisitos Não Funcionais & Acordos de Nível de Serviço (RNF-01 a RNF-08)</span></div>

    <div class="toc-item"><span class="toc-title">3. Arquitetura de Software em Camadas (C4 Model Níveis 1 ao 4)</span><span class="toc-page">Pág. 5</span></div>
    <div class="toc-item toc-sub"><span>3.1 Nível 1: Contexto de Sistema (System Context)</span></div>
    <div class="toc-item toc-sub"><span>3.2 Nível 2: Diagrama de Contêineres (Container Diagram)</span></div>
    <div class="toc-item toc-sub"><span>3.3 Nível 3: Diagrama de Componentes (Component Diagram)</span></div>
    <div class="toc-item toc-sub"><span>3.4 Nível 4: Implantação e Topologia Híbrida (Local vs. Cloudflare Edge)</span></div>

    <div class="toc-item"><span class="toc-title">4. Catálogo dos 18 Casos de Uso do Sistema (UML)</span><span class="toc-page">Pág. 8</span></div>
    <div class="toc-item toc-sub"><span>4.1 Os 7 Atores e Mapeamento de Casos de Uso (UC-01 a UC-18)</span></div>
    <div class="toc-item toc-sub"><span>4.2 Especificação Formal dos Fluxos Principais, Alternativos e de Exceção</span></div>

    <div class="toc-item"><span class="toc-title">5. Dicionário de Dados Relacional Exaustivo (Todas as 16 Tabelas)</span><span class="toc-page">Pág. 11</span></div>
    <div class="toc-item toc-sub"><span>5.1 Especificação Campo a Campo: Tipos, Nulidades, Chaves e Índices</span></div>
    <div class="toc-item toc-sub"><span>5.2 Mecanismo de Permissões Adicionais Granulares por Usuário</span></div>
    <div class="toc-item toc-sub"><span>5.3 Estratégia de Soft Delete e Integridade Relacional</span></div>

    <div class="toc-item"><span class="toc-title">6. Catálogo Completo das 42 Rotas da API REST</span><span class="toc-page">Pág. 15</span></div>
    <div class="toc-item toc-sub"><span>6.1 Especificação de Métodos HTTP, Endpoints, Permissões e Envelopes</span></div>

    <div class="toc-item"><span class="toc-title">7. Modelagem Comportamental Dinâmica (Sequência e Máquinas de Estado)</span><span class="toc-page">Pág. 18</span></div>
    <div class="toc-item toc-sub"><span>7.1 Autenticação, Emissão JWT e Isolamento por Aba (sessionStorage)</span></div>
    <div class="toc-item toc-sub"><span>7.2 Fluxo N1/N2/N3 de Ocorrências com Restauração Automática de Bens</span></div>
    <div class="toc-item toc-sub"><span>7.3 Ciclo de Estados: Ocorrências, Compras e Contas</span></div>

    <div class="toc-item"><span class="toc-title">8. Matriz RBAC Integral dos 15 Perfis e 42 Permissões</span><span class="toc-page">Pág. 20</span></div>
    <div class="toc-item toc-sub"><span>8.1 Detalhamento dos 15 Cargos e Credenciais de Homologação</span></div>
    <div class="toc-item toc-sub"><span>8.2 Matriz Cruzada de Autorização e Regra de Ouro do OPERADOR</span></div>

    <div class="toc-item"><span class="toc-title">9. Motor de Acessibilidade Universal (WCAG 2.1 AA & VLibras)</span><span class="toc-page">Pág. 22</span></div>
    <div class="toc-item toc-sub"><span>9.1 Onboarding Cromático, Matrizes de Daltonismo e Escala Tipográfica</span></div>
    <div class="toc-item toc-sub"><span>9.2 Compressão de Mídia no Cliente via Canvas 2D</span></div>

    <div class="toc-item"><span class="toc-title">10. Telemetria de Estresse, 7 Suítes de Teste & Homologação</span><span class="toc-page">Pág. 23</span></div>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 1 -->
  <h1><span class="chap-num">01</span> CONTEXTO, PRINCÍPIOS & REGRAS DE OURO</h1>
  <h2>1.1 Propósito Estratégico e Justificativa</h2>
  <p>O <strong>HUB ES+</strong> é o principal ecossistema público voltado ao estímulo e desenvolvimento da Economia Criativa no Estado do Espírito Santo. Instituído pelo Governo do Estado por meio da <strong>Secretaria de Estado da Cultura (SECULT)</strong> em parceria operacional e técnica com o <strong>Serviço Nacional de Aprendizagem Industrial (SENAI / Sistema FINDES)</strong>, o complexo integra infraestrutura física de ponta (estúdios audiovisuais, laboratórios de fabricação digital, salas multiuso, auditório e coworking) a um modelo de governança sustentável e colaborativo.</p>
  <p>A presente plataforma de software foi concebida para atuar como a espinha dorsal de gestão deste polo, orquestrando fluxos patrimoniais, ordens de serviço de manutenção técnica, estoques de suprimentos, compras governamentais, agenda de ocupação de espaços e auditoria irrefutável de atos administrativos.</p>

  <h2>1.2 Preservação Arquitetural e Regras de Ouro (AGENTS.md)</h2>
  <div class="card alert-warning">
    <div class="card-title">🛡️ DIRETIVAS ARQUITETURAIS MANDATÓRIAS DE ENGENHARIA</div>
    <ul>
      <li><strong>Frontend em Vanilla JS Puro Modular:</strong> Não utilizar React, Vue, Angular, Svelte ou Vite. A aplicação opera exclusivamente em Vanilla JS modular sob <code>assets/js/modules/*.js</code>, garantindo portabilidade, ausência de dependências de compilação complexas e máxima performance no navegador.</li>
      <li><strong>Backend Express CommonJS & Cloudflare Functions:</strong> Não migrar para TypeScript ou NestJS. Utilizar CommonJS canônico (<code>require</code> / <code>module.exports</code>) no Node.js e ES Modules nas Edge Functions.</li>
      <li><strong>Acesso Direto ao Banco sem ORMs:</strong> Queries SQL diretas via pool <code>mysql2/promise</code> (TiDB Cloud) e D1 API nativa. Zero overhead de camadas de abstração orquestradas como Prisma ou Sequelize.</li>
      <li><strong>Política Inegociável de Soft Delete:</strong> Exclusões físicas via <code>DELETE</code> são estritamente vetadas. Todas as entidades utilizam <code>deleted_at IS NULL</code> e marcação via <code>UPDATE ... SET deleted_at = NOW()</code>.</li>
      <li><strong>Auditoria Ubíqua:</strong> Nenhuma alteração de estado no sistema pode ocorrer sem invocação obrigatória de <code>registrarAuditoria(...)</code> com IP, User-Agent, ID do usuário, entidade e carimbo de tempo.</li>
      <li><strong>Isolamento de Sessão por Aba:</strong> Armazenamento de tokens e estados priorizando <code>sessionStorage</code> com fallback para <code>localStorage</code>, permitindo abas com múltiplos logins simultâneos sem sobrescrita no F5.</li>
      <li><strong>Bloqueio Rígido do Modo Visitante:</strong> Visitantes operam 100% deslogados (<code>!estaLogado()</code>) com acesso permitido exclusivamente a <code>#comunicacao</code> e <code>#agenda</code>. É dispensado cadastro de contas com perfil VISITANTE.</li>
      <li><strong>Bloqueio Estrito de Compras para o Operador:</strong> O cargo OPERADOR não possui nenhuma permissão ou botão de compras visível ou acessível por rota.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 2 -->
  <h1><span class="chap-num">02</span> ENGENHARIA DE REQUISITOS EXAUSTIVA</h1>

  <h2>2.1 Catálogo dos 14 Requisitos Funcionais (RF)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 8%;">ID</th>
        <th style="width: 20%;">Requisito</th>
        <th style="width: 52%;">Descrição Técnica & Regras de Negócio</th>
        <th style="width: 20%;">Módulo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>RF-01</strong></td>
        <td>Autenticação JWT e Multi-Aba</td>
        <td>Login por e-mail e senha. Criptografia bcrypt (salt 10+). Emissão de JWT de 8h com dados de perfil e permissões. Isolamento em <code>sessionStorage</code> por aba de navegação.</td>
        <td><span class="badge badge-blue">Auth / Segurança</span></td>
      </tr>
      <tr>
        <td><strong>RF-02</strong></td>
        <td>Auto-Gestão de Perfil</td>
        <td>Permitir alteração de nome, e-mail e envio de foto com compressão prévia no cliente (Canvas 256x256 JPEG ~30KB). Atualização atômica sem afetar privilégios.</td>
        <td><span class="badge badge-blue">Perfil</span></td>
      </tr>
      <tr>
        <td><strong>RF-03</strong></td>
        <td>Chamados Técnicos (N1/N2/N3)</td>
        <td>Abertura de chamados com local, tipo, foto via webcam ou upload. Triagem em níveis N1 (Helpdesk), N2 (Especializado) e N3 (Infraestrutura/Servidores). Suporte a parecer técnico.</td>
        <td><span class="badge badge-amber">Ocorrências</span></td>
      </tr>
      <tr>
        <td><strong>RF-04</strong></td>
        <td>Restauração Automática de Ativos</td>
        <td>Ao concluir a ocorrência com status <code>resolvido</code>, o equipamento patrimonial vinculado é automaticamente restaurado de <code>manutencao</code> para o estado <code>bom</code>.</td>
        <td><span class="badge badge-amber">Equipamentos</span></td>
      </tr>
      <tr>
        <td><strong>RF-05</strong></td>
        <td>Gestão de Bens Patrimoniais</td>
        <td>Cadastro com tombamento patrimonial exclusivo, localização física, estado de conservação (Bom, Manutenção, Descartado) e histórico rastreável de intervenções.</td>
        <td><span class="badge badge-green">Patrimônio</span></td>
      </tr>
      <tr>
        <td><strong>RF-06</strong></td>
        <td>Almoxarifado & Insumos</td>
        <td>Estoque quantitativo com ponto de pedido (estoque mínimo). Movimentações formais de ENTRADA, SAIDA, AJUSTE e TRANSFERÊNCIA com histórico e justificativa.</td>
        <td><span class="badge badge-green">Almoxarifado</span></td>
      </tr>
      <tr>
        <td><strong>RF-07</strong></td>
        <td>Ciclo de Compras & Suprimentos</td>
        <td>Requisição de compras com produto, cotação estimada e justificativa. Aprovação gerencial exclusiva. Bloqueio completo na API e no Frontend para o perfil OPERADOR.</td>
        <td><span class="badge badge-purple">Compras</span></td>
      </tr>
      <tr>
        <td><strong>RF-08</strong></td>
        <td>Agenda Inteligente de Espaços</td>
        <td>Reserva de auditório, estúdios criativos e salas de capacitação. Verificação automática de colisão de horários. Visualização livre para o público visitante sem login.</td>
        <td><span class="badge badge-blue">Agenda</span></td>
      </tr>
      <tr>
        <td><strong>RF-09</strong></td>
        <td>Mural de Comunicação Interna</td>
        <td>Publicação de informes com classificação de prioridade (Baixa, Média, Alta, Urgente). Ocultação de banners intrusivos com centralização no sino de notificações.</td>
        <td><span class="badge badge-blue">Comunicação</span></td>
      </tr>
      <tr>
        <td><strong>RF-10</strong></td>
        <td>Acesso Visitante (Modo Livre)</td>
        <td>Acesso deslogado restrito a <code>#comunicacao</code> e <code>#agenda</code>. Dispensado cadastro de contas com perfil VISITANTE. Bloqueio e redirecionamento de outras rotas.</td>
        <td><span class="badge badge-green">Público</span></td>
      </tr>
      <tr>
        <td><strong>RF-11</strong></td>
        <td>Zeladoria & Ordem de Higienização</td>
        <td>Programação e acompanhamento de limpeza por ambiente, checklists de conformidade e confirmação de realização por colaboradores do setor.</td>
        <td><span class="badge badge-amber">Limpeza</span></td>
      </tr>
      <tr>
        <td><strong>RF-12</strong></td>
        <td>Gestão Disciplinar / Advertências</td>
        <td>Submissão de medidas disciplinares por gestores e homologação institucional obrigatória pelo Administrador Geral antes da aplicação formal ao colaborador.</td>
        <td><span class="badge badge-red">Governança RH</span></td>
      </tr>
      <tr>
        <td><strong>RF-13</strong></td>
        <td>Telemetria & Heartbeat Contínuo</td>
        <td>Pulso de heartbeat a cada 60s disparado pela SPA para monitoramento de colaboradores ativos em tempo real no módulo de governança.</td>
        <td><span class="badge badge-purple">Auditoria</span></td>
      </tr>
      <tr>
        <td><strong>RF-14</strong></td>
        <td>Acessibilidade Universal & VLibras</td>
        <td>Onboarding de acessibilidade pós-login, 3 escalas tipográficas, 4 filtros de daltonismo com amostras cromáticas visuais e tradução para LIBRAS nativa.</td>
        <td><span class="badge badge-green">A11y Universal</span></td>
      </tr>
    </tbody>
  </table>

  <h2>2.2 Requisitos Não Funcionais (RNF) & SLAs</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">ID</th>
        <th style="width: 25%;">Categoria</th>
        <th style="width: 60%;">Meta de Engenharia & Acordo de Nível de Serviço (SLA)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>RNF-01</strong></td>
        <td>Latência & Desempenho</td>
        <td>Endpoints de borda (Health Check) devem responder em $\le 50\text{ ms}$; consultas agregadas (Dashboard/Ocorrências) em $\le 500\text{ ms}$ (p95).</td>
      </tr>
      <tr>
        <td><strong>RNF-02</strong></td>
        <td>Concorrência & Carga</td>
        <td>Suportar surtos de 40+ conexões simultâneas com 0.0% de erro e vazão mínima de 20 requisições por segundo.</td>
      </tr>
      <tr>
        <td><strong>RNF-03</strong></td>
        <td>Segurança Criptográfica</td>
        <td>Cifragem de credenciais com <code>bcryptjs</code> (salt rounds $\ge 10$). Tokens JWT assinados com chave de alta entropia. HTTPS e TLS 1.3 estritos.</td>
      </tr>
      <tr>
        <td><strong>RNF-04</strong></td>
        <td>Acessibilidade (WCAG 2.1)</td>
        <td>Conformidade com o nível AA internacional: contraste de cor mínimo de 4.5:1, etiquetas descritivas e compatibilidade com leitores de tela.</td>
      </tr>
      <tr>
        <td><strong>RNF-05</strong></td>
        <td>Disponibilidade de Nuvem</td>
        <td>SLA de 99.9% de uptime garantido pela infraestrutura distribuída do Cloudflare Edge e réplicas D1.</td>
      </tr>
      <tr>
        <td><strong>RNF-06</strong></td>
        <td>Isolamento Multi-Tenant</td>
        <td>Chaves de armazenamento isoladas via <code>getUserStorageKey(prefix)</code> garantindo que estados locais de um perfil não contaminem outro usuário.</td>
      </tr>
      <tr>
        <td><strong>RNF-07</strong></td>
        <td>Resiliência do DOM</td>
        <td>Tratamento defensivo com <code>try/catch</code> e <code>Promise.allSettled</code> em todos os módulos para que falhas de sub-recursos nunca congelem a interface.</td>
      </tr>
      <tr>
        <td><strong>RNF-08</strong></td>
        <td>Compatibilidade de Browsers</td>
        <td>Paridade visual e comportamental em Google Chrome, Microsoft Edge, Mozilla Firefox e Safari.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- CAPÍTULO 3 -->
  <h1><span class="chap-num">03</span> ARQUITETURA DE SOFTWARE (C4 MODEL)</h1>

  <h2>3.1 C4 Nível 1: Diagrama de Contexto de Sistema</h2>
  <pre>
  ┌─────────────────────────────────┐        ┌──────────────────────────────────┐
  │   Comunidade & Visitantes       │        │   Colaboradores e Lideranças     │
  │   (Acesso Público Deslogado)    │        │   (15 Cargos / Perfis com JWT)   │
  └────────────────┬────────────────┘        └─────────────────┬────────────────┘
                   │ Acessa Agenda e Avisos                    │ Autenticação e Gestão
                   ▼                                           ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        PLATAFORMA INTEGRADA HUB ES+                         │
  │     SPA Vanilla Modular  •  Edge Functions REST API  •  Auditoria Ubíqua    │
  └────────────────┬──────────────────────────┬───────────────────────┬─────────┘
                   │                                          │                       │
                   ▼                                          ▼                       ▼
  ┌─────────────────────────────────┐        ┌──────────────────────┐        ┌────────────────┐
  │      Provedor Brevo API         │        │    Suite VLibras     │        │  TiDB Cloud /  │
  │  (E-mails de Ativação / Senha)  │        │ (Acessibilidade LSB) │        │  Cloudflare D1 │
  └─────────────────────────────────┘        └──────────────────────┘        └────────────────┘
  </pre>

  <h2>3.2 C4 Nível 2: Diagrama de Contêineres</h2>
  <table>
    <thead>
      <tr>
        <th>Contêiner</th>
        <th>Tecnologia</th>
        <th>Papel Primário</th>
        <th>Comunicação</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend SPA</strong></td>
        <td>Vanilla JS (ES6+), Tailwind CSS, Lucide Icons</td>
        <td>Renderização das telas, controle de rotas por Hash (#), gestão de acessibilidade e isolamento de sessão por aba.</td>
        <td>HTTPS / JSON REST via <code>window.API</code> para a Edge API.</td>
      </tr>
      <tr>
        <td><strong>API Serverless Edge</strong></td>
        <td>Cloudflare Pages Functions / Express 5.x</td>
        <td>Roteamento das rotas <code>/api/v1/*</code>, validação de tokens JWT, controle RBAC e execução de auditoria.</td>
        <td>HTTPS REST, SQL bindings nativos com Cloudflare D1 e pool TCP para TiDB.</td>
      </tr>
      <tr>
        <td><strong>Banco de Dados Distribuído</strong></td>
        <td>Cloudflare D1 (SQLite Edge) / TiDB Cloud (MySQL 8)</td>
        <td>Persistência relacional de todas as entidades, chaves estrangeiras, índices e dados transacionais.</td>
        <td>D1 Driver API serverless e driver <code>mysql2/promise</code>.</td>
      </tr>
      <tr>
        <td><strong>Almoxarifado de Mídias</strong></td>
        <td>Cloudflare CDN / Storage Local (uploads/)</td>
        <td>Armazenamento de fotos de ocorrências (comprimidas), fotos de perfil e anexos documentais.</td>
        <td>Base64 seguro (Data URL) e URLs estáticas servidas via CDN.</td>
      </tr>
    </tbody>
  </table>

  <h2>3.3 C4 Nível 3: Diagrama de Componentes do Frontend e Backend</h2>
  <pre>
  FRONTEND MODULAR (assets/js/):
  ├── config.js          -> Configurações estáticas, endpoints da API e chaves de storage
  ├── tema.js            -> Alternância e persistência de Tema Claro/Escuro (.dark)
  ├── acessibilidade.js  -> Painel A11y, filtros SVG daltonismo, tipografia e VLibras
  ├── api.js             -> Cliente HTTP nativo (ApiService) com cache em memória (TTL 15s)
  ├── auth.js            -> AuthManager, sessão isolada em sessionStorage, RBAC e Heartbeat
  ├── ui.js              -> Biblioteca de componentes: Toasts, Modais, Skeletons e Confirms
  ├── app.js             -> Roteador SPA por hash, guards de autenticação e cycle hooks
  └── modules/           -> Módulos das 11 telas operacionais (dashboard, compras, ocorrencias...)

  BACKEND SERVERLESS / EXPRESS (src/ & functions/):
  ├── catchall.js / server.js -> Roteador mestre, CORS, interceptor e despachante REST
  ├── middleware/auth.js      -> Validador do cabeçalho Authorization: Bearer JWT
  ├── middleware/permissions.js -> Validador de permissões atômicas (requirePermission)
  └── middleware/auditoria.js -> Logger síncrono/assíncrono da trilha de governança
  </pre>

  <h2>3.4 C4 Nível 4: Arquitetura de Implantação e Nuvem Híbrida</h2>
  <div class="card alert-info">
    <div class="card-title">🌐 AMBIENTE LOCAL (DEV) VS. AMBIENTE EM NUVEM (PROD)</div>
    <p><strong>Ambiente de Desenvolvimento Local:</strong> Executa sobre Node.js 20+ com servidor Express 5.x, conectando-se ao cluster gerenciado <strong>TiDB Cloud</strong> (compatível com MySQL 8.0) com driver <code>mysql2/promise</code>, pool de 40 conexões, SSL TLS 1.2 e armazenamento de arquivos em disco (<code>uploads/</code>).</p>
    <p><strong>Ambiente de Produção (Cloudflare Pages):</strong> Executa sobre a malha global de borda da <strong>Cloudflare</strong> através de Pages Functions (V8 Isolates), persistindo no banco serverless <strong>Cloudflare D1</strong> (SQLite distribuído com replicação em borda), com cache de schema em memória e entrega estática acelerada via CDN.</p>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 4 -->
  <h1><span class="chap-num">04</span> CATÁLOGO DOS 18 CASOS DE USO (UML)</h1>

  <h2>4.1 Mapeamento dos 7 Atores e Casos de Uso</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Ator</th>
        <th style="width: 25%;">Papel e Descrição</th>
        <th style="width: 60%;">Casos de Uso Associados</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Visitante</strong></td>
        <td>Público externo e produtores culturais</td>
        <td><strong>UC-01:</strong> Consultar Agenda Cultural de Espaços<br><strong>UC-02:</strong> Consultar Mural de Comunicados Públicos</td>
      </tr>
      <tr>
        <td><strong>Operador</strong></td>
        <td>Colaborador de linha de frente</td>
        <td><strong>UC-03:</strong> Autenticar no Sistema (Login JWT)<br><strong>UC-04:</strong> Gerenciar Próprio Perfil e Foto<br><strong>UC-05:</strong> Abrir Chamado Técnico com Evidência Fotográfica<br><strong>UC-06:</strong> Consultar Inventário Patrimonial de Bens</td>
      </tr>
      <tr>
        <td><strong>Técnico N1/N2/N3</strong></td>
        <td>Suporte de TI, Som e Manutenção</td>
        <td><strong>UC-07:</strong> Assumir Atendimento de Chamado Técnico<br><strong>UC-08:</strong> Escalonar Suporte Técnico entre Níveis (N1/N2/N3)<br><strong>UC-09:</strong> Emitir Parecer Técnico e Resolver Ocorrência</td>
      </tr>
      <tr>
        <td><strong>Supervisor</strong></td>
        <td>Supervisão de Zeladoria e Estoque</td>
        <td><strong>UC-10:</strong> Distribuir Ordens de Serviço de Limpeza<br><strong>UC-11:</strong> Registrar Movimentações no Almoxarifado<br><strong>UC-12:</strong> Solicitar Medida Disciplinar (Advertência)</td>
      </tr>
      <tr>
        <td><strong>Comprador</strong></td>
        <td>Suprimentos e Finanças</td>
        <td><strong>UC-13:</strong> Submeter Cotação de Compra<br><strong>UC-14:</strong> Confirmar Recebimento e Entrada de Mercadoria</td>
      </tr>
      <tr>
        <td><strong>Gestor</strong></td>
        <td>Gerência de Operações e Diretoria</td>
        <td><strong>UC-15:</strong> Aprovar / Rejeitar Solicitação de Compra<br><strong>UC-16:</strong> Reservar Salas e Espaços Culturais</td>
      </tr>
      <tr>
        <td><strong>Admin Geral</strong></td>
        <td>Coordenação Geral e TI Master</td>
        <td><strong>UC-17:</strong> Aprovar Cadastros e Homologar Acessos Pendentes<br><strong>UC-18:</strong> Homologar Decisão de Advertência Disciplinar</td>
      </tr>
    </tbody>
  </table>

  <h2>4.2 Especificação Formal dos Casos de Uso Críticos</h2>

  <div class="card">
    <div class="card-title">CASO DE USO UC-05: ABERTURA DE OCORRÊNCIA COM FOTO E RESTAURAÇÃO DE BEM</div>
    <p><strong>Atores:</strong> Operador (Abertura) e Técnico (Atendimento e Conclusão).<br>
    <strong>Pré-condição:</strong> Usuário autenticado com permissão <code>ocorrencias.criar</code>.<br>
    <strong>Fluxo Principal:</strong>
    <ol>
      <li>O operador acessa <code>#ocorrencias</code> e aciona "Abrir Ocorrência".</li>
      <li>Preenche local, tipo da ocorrência, descrição e seleciona o equipamento avariado na lista de patrimônio.</li>
      <li>O usuário opta por acionar a câmera da webcam (capturada via elemento <code>&lt;canvas&gt;</code>) ou anexar um arquivo de foto.</li>
      <li>Submete o formulário via <code>POST /api/v1/ocorrencias</code>. O backend cria a ocorrência com status <code>aberto</code> e atualiza o equipamento associado para <code>estado = 'manutencao'</code>.</li>
      <li>A ação é registrada na tabela <code>auditoria</code> com metadados do solicitante.</li>
    </ol>
    <strong>Fluxo Alternativo (Escalonamento N1 -> N2):</strong>
    <ol>
      <li>O técnico de N1 avalia a avaria e verifica necessidade de intervenção especializada em infraestrutura.</li>
      <li>Aciona "Escalonar Suporte", preenchendo o parecer preliminar e elevando para o nível N2 via <code>PATCH /api/v1/ocorrencias/:id/escalonar</code>.</li>
      <li>O chamado é reatribuído na fila de suporte de nível superior.</li>
    </ol>
    <strong>Pós-condição:</strong> Ao finalizar o reparo e marcar o status como <code>resolvido</code>, o backend restaura o equipamento patrimonial vinculado para <code>estado = 'bom'</code> de forma atômica e automática.
    </p>
  </div>

  <div class="card">
    <div class="card-title">CASO DE USO UC-18: HOMOLOGAÇÃO DE ADVERTÊNCIA DISCIPLINAR</div>
    <p><strong>Atores:</strong> Líder de Setor (Solicitante) e Administrador Geral (Homologador).<br>
    <strong>Regra de Negócio:</strong> Nenhuma penalidade disciplinar tem validade funcional ou jurídica sem a homologação prévia da Direção Geral.<br>
    <strong>Fluxo:</strong>
    <ol>
      <li>O supervisor submete a advertência com o colaborador envolvido, motivo fundamentado, gravidade (Leve, Média, Grave) e data do fato.</li>
      <li>O registro é gravado com status <code>PENDENTE</code> na tabela <code>advertencias</code>.</li>
      <li>O Administrador Geral acessa a fila de governança e analisa as circunstâncias relatadas.</li>
      <li>O Administrador decide: <strong>Homologar</strong> (passando o status para <code>APLICADA</code> com notificação oficial) ou <strong>Rejeitar</strong> (registrando parecer de arquivamento).</li>
    </ol>
    </p>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 5 -->
  <h1><span class="chap-num">05</span> DICIONÁRIO DE DADOS RELACIONAL EXAUSTIVO</h1>
  <p>Abaixo são detalhadas as <strong>16 tabelas e estruturas relacionais</strong> que compõem o banco de dados oficial do HUB ES+, com especificação campo a campo:</p>

  <h3>1. Tabela: <code>setores</code> (Áreas Administrativas e Operacionais)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador único do setor.</td></tr>
      <tr><td><code>nome</code></td><td>VARCHAR(150)</td><td>NÃO</td><td>-</td><td>Nome do setor (ex: Infraestrutura & TI, Manutenção).</td></tr>
      <tr><td><code>descricao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Atribuições e escopo do setor.</td></tr>
      <tr><td><code>deleted_at</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Data de exclusão lógica (soft delete).</td></tr>
      <tr><td><code>created_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Timestamp de criação (DEFAULT CURRENT_TIMESTAMP).</td></tr>
      <tr><td><code>updated_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Timestamp de atualização automática.</td></tr>
    </tbody>
  </table>

  <h3>2. Tabela: <code>permissoes</code> (Catálogo de Privilégios Atômicos)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador único da permissão.</td></tr>
      <tr><td><code>chave</code></td><td>VARCHAR(100)</td><td>NÃO</td><td>UK</td><td>Chave textual única (ex: <code>ocorrencias.atender</code>).</td></tr>
      <tr><td><code>nome</code></td><td>VARCHAR(150)</td><td>NÃO</td><td>-</td><td>Rótulo legível para a interface.</td></tr>
      <tr><td><code>descricao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Detalhamento do privilégio operacional.</td></tr>
      <tr><td><code>created_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Timestamp de criação.</td></tr>
    </tbody>
  </table>

  <h3>3. Tabela: <code>perfil_permissoes</code> (Vínculo Papel x Privilégio)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador único da associação.</td></tr>
      <tr><td><code>perfil</code></td><td>VARCHAR(50)</td><td>NÃO</td><td>UK_1</td><td>Nome do perfil (ex: ADMIN, GESTOR, OPERADOR).</td></tr>
      <tr><td><code>permissao_id</code></td><td>BIGINT</td><td>NÃO</td><td>FK / UK_1</td><td>Chave estrangeira referenciando <code>permissoes(id)</code>.</td></tr>
      <tr><td><code>created_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Timestamp de vinculação.</td></tr>
    </tbody>
  </table>

  <h3>4. Tabela: <code>permissoes_usuarios</code> (Privilégios Adicionais por Usuário)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do privilégio customizado.</td></tr>
      <tr><td><code>usuario_id</code></td><td>BIGINT</td><td>NÃO</td><td>FK / UK_1</td><td>Chave estrangeira referenciando <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>permissao_id</code></td><td>BIGINT</td><td>NÃO</td><td>FK / UK_1</td><td>Chave estrangeira referenciando <code>permissoes(id)</code>.</td></tr>
      <tr><td><code>created_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Timestamp de concessão da exceção.</td></tr>
    </tbody>
  </table>

  <h3>5. Tabela: <code>usuarios</code> (Colaboradores e Contas do Sistema)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador único do colaborador.</td></tr>
      <tr><td><code>nome</code></td><td>VARCHAR(200)</td><td>NÃO</td><td>-</td><td>Nome completo do usuário.</td></tr>
      <tr><td><code>email</code></td><td>VARCHAR(200)</td><td>NÃO</td><td>UK</td><td>E-mail institucional único de acesso.</td></tr>
      <tr><td><code>senha</code></td><td>VARCHAR(255)</td><td>NÃO</td><td>-</td><td>Hash criptográfico bcrypt da senha.</td></tr>
      <tr><td><code>perfil</code></td><td>VARCHAR(50)</td><td>NÃO</td><td>-</td><td>Cargo institucional (15 perfis RBAC).</td></tr>
      <tr><td><code>setor_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Setor de lotação -> <code>setores(id)</code>.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td>ATIVO, INATIVO, BLOQUEADO, PENDENTE, REJEITADO.</td></tr>
      <tr><td><code>foto_url</code></td><td>LONGTEXT</td><td>SIM</td><td>-</td><td>Foto em Data URL compactada no cliente (~30KB).</td></tr>
      <tr><td><code>ultimo_acesso</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Data/hora do último login bem-sucedido.</td></tr>
      <tr><td><code>ultimo_heartbeat</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Carimbo de telemetria ativa nos últimos 5 minutos.</td></tr>
      <tr><td><code>deleted_at</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Soft delete para histórico funcional.</td></tr>
      <tr><td><code>created_at</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Data de cadastro no sistema.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h3>6. Tabela: <code>ocorrencias</code> (Ordens de Manutenção Técnica)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Protocolo numérico do chamado técnico.</td></tr>
      <tr><td><code>usuario_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Colaborador que abriu o chamado -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>responsavel_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Técnico que assumiu o chamado -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>equipamento_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Ativo com avaria -> <code>equipamentos(id)</code>.</td></tr>
      <tr><td><code>nivel_atendimento</code></td><td>VARCHAR(10)</td><td>NÃO</td><td>-</td><td>Triagem técnica: N1, N2 ou N3 (DEFAULT 'N1').</td></tr>
      <tr><td><code>local</code></td><td>VARCHAR(255)</td><td>NÃO</td><td>-</td><td>Ambiente físico (ex: Estúdio A, Sala de Treinamento 2).</td></tr>
      <tr><td><code>descricao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Detalhamento do problema apresentado.</td></tr>
      <tr><td><code>parecer_tecnico</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Laudo técnico registrado para conclusão ou escalonamento.</td></tr>
      <tr><td><code>tipo</code></td><td>VARCHAR(100)</td><td>SIM</td><td>-</td><td>Categoria: Elétrica, Áudio, Rede, Ar-condicionado, etc.</td></tr>
      <tr><td><code>foto_url</code></td><td>LONGTEXT</td><td>SIM</td><td>-</td><td>Foto da avaria servida sob demanda em rota dedicada.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td>aberto, em_andamento, resolvido.</td></tr>
      <tr><td><code>deleted_at</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Soft delete.</td></tr>
    </tbody>
  </table>

  <h3>7. Tabela: <code>equipamentos</code> (Inventário Patrimonial de Bens)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do ativo patrimonial.</td></tr>
      <tr><td><code>nome</code></td><td>VARCHAR(300)</td><td>NÃO</td><td>-</td><td>Nome/modelo do bem (ex: Mesa de Som Digital 32Ch).</td></tr>
      <tr><td><code>patrimonio</code></td><td>VARCHAR(100)</td><td>NÃO</td><td>UK</td><td>Número de tombamento patrimonial SECULT/SENAI.</td></tr>
      <tr><td><code>responsavel_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Colaborador cautelado -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>descricao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Especificações técnicas e número de série.</td></tr>
      <tr><td><code>localizacao</code></td><td>VARCHAR(255)</td><td>SIM</td><td>-</td><td>Sala ou laboratório de alocação permanente.</td></tr>
      <tr><td><code>estado</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>bom</code>, <code>manutencao</code>, <code>descartado</code>.</td></tr>
      <tr><td><code>imagem_url</code></td><td>VARCHAR(500)</td><td>SIM</td><td>-</td><td>URL da imagem ilustrativa do equipamento.</td></tr>
      <tr><td><code>deleted_at</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Soft delete.</td></tr>
    </tbody>
  </table>

  <h3>8. Tabela: <code>compras</code> (Requisições de Suprimentos)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Número do processo de compra.</td></tr>
      <tr><td><code>solicitante_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Colaborador requisitante -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>setor_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Setor demandante -> <code>setores(id)</code>.</td></tr>
      <tr><td><code>produto</code></td><td>VARCHAR(500)</td><td>NÃO</td><td>-</td><td>Descrição sucinta do item ou serviço.</td></tr>
      <tr><td><code>quantidade</code></td><td>INT</td><td>NÃO</td><td>-</td><td>Quantidade requerida (DEFAULT 1).</td></tr>
      <tr><td><code>valor_estimado</code></td><td>DECIMAL(15,2)</td><td>SIM</td><td>-</td><td>Cotação estimada em Reais (R$).</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>pendente</code>, <code>aprovado</code>, <code>entregue</code>, <code>cancelado</code>.</td></tr>
      <tr><td><code>justificativa</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Motivação operacional da aquisição.</td></tr>
      <tr><td><code>deleted_at</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Soft delete.</td></tr>
    </tbody>
  </table>

  <h3>9. Tabela: <code>insumos</code> (Estoque de Almoxarifado)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do material de consumo.</td></tr>
      <tr><td><code>nome</code></td><td>VARCHAR(300)</td><td>NÃO</td><td>-</td><td>Nome do insumo (ex: Filamento PLA 3D, Conector XLR).</td></tr>
      <tr><td><code>quantidade</code></td><td>INT</td><td>NÃO</td><td>-</td><td>Saldo atual em estoque físico.</td></tr>
      <tr><td><code>estoque_minimo</code></td><td>INT</td><td>NÃO</td><td>-</td><td>Ponto de pedido crítico de reposição (DEFAULT 1).</td></tr>
      <tr><td><code>unidade</code></td><td>VARCHAR(30)</td><td>NÃO</td><td>-</td><td>Unidade de medida: unid, pacote, rolo, metro.</td></tr>
      <tr><td><code>setor_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Setor gestor do almoxarifado -> <code>setores(id)</code>.</td></tr>
    </tbody>
  </table>

  <h3>10. Tabela: <code>estoque_movimentacoes</code> (Kardex / Histórico de Movimentações)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do lançamento no kardex.</td></tr>
      <tr><td><code>insumo_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Material movimentado -> <code>insumos(id)</code>.</td></tr>
      <tr><td><code>usuario_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Operador que realizou o registro -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>tipo</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>ENTRADA</code>, <code>SAIDA</code>, <code>AJUSTE</code>, <code>TRANSFERENCIA</code>.</td></tr>
      <tr><td><code>quantidade</code></td><td>INT</td><td>NÃO</td><td>-</td><td>Volume quantitativo transacionado.</td></tr>
      <tr><td><code>observacao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Justificativa ou nota fiscal da movimentação.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h3>11. Tabela: <code>eventos</code> (Agenda Inteligente de Espaços)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador da reserva de espaço.</td></tr>
      <tr><td><code>titulo</code></td><td>VARCHAR(300)</td><td>SIM</td><td>-</td><td>Nome do evento, oficina ou atividade cultural.</td></tr>
      <tr><td><code>local</code></td><td>VARCHAR(255)</td><td>NÃO</td><td>-</td><td>Espaço físico (Auditório, Estúdio B, Coworking).</td></tr>
      <tr><td><code>data</code></td><td>DATETIME</td><td>NÃO</td><td>-</td><td>Data e horário de início da ocupação.</td></tr>
      <tr><td><code>data_fim</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Data e horário de término da ocupação.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>agendado</code>, <code>em_andamento</code>, <code>concluido</code>, <code>cancelado</code>.</td></tr>
      <tr><td><code>responsavel_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Colaborador responsável -> <code>usuarios(id)</code>.</td></tr>
    </tbody>
  </table>

  <h3>12. Tabela: <code>comunicados</code> (Mural Institucional de Informes)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do comunicado oficial.</td></tr>
      <tr><td><code>titulo</code></td><td>VARCHAR(500)</td><td>NÃO</td><td>-</td><td>Título do informe.</td></tr>
      <tr><td><code>mensagem</code></td><td>TEXT</td><td>NÃO</td><td>-</td><td>Corpo informativo do comunicado.</td></tr>
      <tr><td><code>autor_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Autor do comunicado -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>prioridade</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>normal</code>, <code>media</code>, <code>alta</code>, <code>urgente</code>.</td></tr>
      <tr><td><code>destinatario_perfil</code></td><td>VARCHAR(50)</td><td>NÃO</td><td>-</td><td>Público-alvo (DEFAULT 'TODOS' ou cargo específico).</td></tr>
    </tbody>
  </table>

  <h3>13. Tabela: <code>limpeza</code> (Ordens de Zeladoria e Higienização)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador da tarefa de limpeza.</td></tr>
      <tr><td><code>local</code></td><td>VARCHAR(255)</td><td>NÃO</td><td>-</td><td>Ambiente ou bloco a ser higienizado.</td></tr>
      <tr><td><code>responsavel_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Colaborador de zeladoria -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>pendente</code>, <code>em_execucao</code>, <code>concluido</code>.</td></tr>
      <tr><td><code>data_prevista</code></td><td>DATETIME</td><td>SIM</td><td>-</td><td>Prazo limite estipulado para a limpeza.</td></tr>
    </tbody>
  </table>

  <h3>14. Tabela: <code>documentos</code> (Gestão Documental Oficial)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Identificador do documento cadastrado.</td></tr>
      <tr><td><code>titulo</code></td><td>VARCHAR(500)</td><td>NÃO</td><td>-</td><td>Título descritivo do termo, ata ou regulamento.</td></tr>
      <tr><td><code>nome_original</code></td><td>VARCHAR(500)</td><td>SIM</td><td>-</td><td>Nome do arquivo enviado pelo usuário.</td></tr>
      <tr><td><code>caminho</code></td><td>VARCHAR(1000)</td><td>SIM</td><td>-</td><td>Caminho relativo de armazenamento no storage.</td></tr>
      <tr><td><code>mime_type</code></td><td>VARCHAR(100)</td><td>SIM</td><td>-</td><td>Tipo MIME do documento (PDF, DOCX, XLSX).</td></tr>
      <tr><td><code>tamanho</code></td><td>BIGINT</td><td>SIM</td><td>-</td><td>Tamanho do arquivo em bytes.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>ativo</code>, <code>arquivado</code>.</td></tr>
    </tbody>
  </table>

  <h3>15. Tabela: <code>advertencias</code> (Gestão Disciplinar Institucional)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Registro formal da medida disciplinar.</td></tr>
      <tr><td><code>colaborador_id</code></td><td>BIGINT</td><td>NÃO</td><td>FK</td><td>Colaborador notificado -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>solicitante_id</code></td><td>BIGINT</td><td>NÃO</td><td>FK</td><td>Líder que solicitou a medida -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>homologador_id</code></td><td>BIGINT</td><td>SIM</td><td>FK</td><td>Administrador Geral que homologou -> <code>usuarios(id)</code>.</td></tr>
      <tr><td><code>motivo</code></td><td>VARCHAR(255)</td><td>NÃO</td><td>-</td><td>Tipificação da infração funcional.</td></tr>
      <tr><td><code>gravidade</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>LEVE</code>, <code>MEDIA</code>, <code>GRAVE</code>.</td></tr>
      <tr><td><code>status</code></td><td>ENUM</td><td>NÃO</td><td>-</td><td><code>PENDENTE</code>, <code>APLICADA</code>, <code>REJEITADA</code>, <code>REVOGADA</code>.</td></tr>
      <tr><td><code>motivo_decisao</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Justificativa da homologação ou rejeição.</td></tr>
    </tbody>
  </table>

  <h3>16. Tabela: <code>auditoria</code> e <code>tokens_ativacao</code> (Governança e Segurança)</h3>
  <table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Descrição / Regra</th></tr></thead>
    <tbody>
      <tr><td><code>auditoria.id</code></td><td>BIGINT AUTO_INCREMENT</td><td>NÃO</td><td>PK</td><td>Trilha imutável append-only. Zero updates/deletes.</td></tr>
      <tr><td><code>auditoria.acao</code></td><td>VARCHAR(100)</td><td>NÃO</td><td>-</td><td>Operação executada (LOGIN, EDITAR_PERFIL, CRIAR_...).</td></tr>
      <tr><td><code>auditoria.ip</code></td><td>VARCHAR(45)</td><td>SIM</td><td>-</td><td>Endereço IP v4/v6 de origem do operador.</td></tr>
      <tr><td><code>auditoria.user_agent</code></td><td>TEXT</td><td>SIM</td><td>-</td><td>Navegador e sistema operacional do requisitante.</td></tr>
      <tr><td><code>tokens_ativacao.token_hash</code></td><td>VARCHAR(64)</td><td>NÃO</td><td>UK</td><td>Hash SHA-256 de links seguros de ativação com expiração de 48h.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- CAPÍTULO 6 -->
  <h1><span class="chap-num">06</span> CATÁLOGO COMPLETO DAS 42 ROTAS DA API REST</h1>
  <p>Abaixo são detalhados todos os endpoints da API REST <code>/api/v1/*</code> com métodos, controle de acesso e descrição:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Método</th>
        <th style="width: 32%;">Endpoint</th>
        <th style="width: 25%;">Permissão Exigida</th>
        <th style="width: 33%;">Descrição da Operação</th>
      </tr>
    </thead>
    <tbody>
      <!-- AUTH & PERFIL -->
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/login</code></td><td>Público</td><td>Autenticação por e-mail/senha e emissão de JWT.</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/auth/me</code></td><td>Token Válido</td><td>Dados do usuário logado e lista de permissões.</td></tr>
      <tr><td><span class="badge badge-amber">PUT</span></td><td><code>/api/v1/auth/perfil</code></td><td>Token Válido</td><td>Edição do próprio nome, e-mail e foto compactada.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/heartbeat</code></td><td>Token Válido</td><td>Atualização de telemetria de presença (último pulso).</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/logout</code></td><td>Token Válido</td><td>Encerramento formal de sessão e auditoria de saída.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/solicitar-ativacao</code></td><td>Público</td><td>Auto-cadastro de colaborador com status PENDENTE.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/ativar-conta</code></td><td>Token Único</td><td>Definição de primeira senha com token seguro de 48h.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/esqueci-senha</code></td><td>Público</td><td>Disparo de e-mail com link de redefinição via Brevo API.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auth/redefinir-senha</code></td><td>Token Único</td><td>Substituição de senha via hash criptográfico SHA-256.</td></tr>
      
      <!-- PÚBLICO -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/publico/comunicados</code></td><td>Público / Visitante</td><td>Consulta livre de avisos gerais para o público externo.</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/publico/agenda</code></td><td>Público / Visitante</td><td>Consulta livre da programação cultural e ocupação.</td></tr>

      <!-- DASHBOARD & TELEMETRIA -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/dashboard/stats</code></td><td><code>dashboard.visualizar</code></td><td>Métricas agregadas consolidadas (9 queries paralelas).</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/dashboard/indicadores</code></td><td><code>indicadores.visualizar</code></td><td>Séries temporais para renderização gráfica Chart.js.</td></tr>

      <!-- SETORES -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/setores</code></td><td>Token Válido</td><td>Listagem básica de setores para dropdowns e filtros.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/setores</code></td><td><code>setores.criar</code></td><td>Cadastro de nova área operacional do centro.</td></tr>
      <tr><td><span class="badge badge-amber">PUT</span></td><td><code>/api/v1/setores/:id</code></td><td><code>setores.editar</code></td><td>Atualização de denominação e atribuições de setor.</td></tr>
      <tr><td><span class="badge badge-red">DELETE</span></td><td><code>/api/v1/setores/:id</code></td><td><code>setores.excluir</code></td><td>Exclusão lógica de setor (soft delete).</td></tr>

      <!-- EQUIPAMENTOS -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/equipamentos</code></td><td><code>equipamentos.visualizar</code></td><td>Listagem do inventário patrimonial com filtros de busca.</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/equipamentos/:id</code></td><td><code>equipamentos.visualizar</code></td><td>Detalhes, laudo e histórico de manutenção do bem.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/equipamentos</code></td><td><code>equipamentos.criar</code></td><td>Tombamento patrimonial de novo equipamento.</td></tr>
      <tr><td><span class="badge badge-amber">PUT</span></td><td><code>/api/v1/equipamentos/:id</code></td><td><code>equipamentos.editar</code></td><td>Alteração de localização, responsável ou conservação.</td></tr>
      <tr><td><span class="badge badge-red">DELETE</span></td><td><code>/api/v1/equipamentos/:id</code></td><td><code>equipamentos.excluir</code></td><td>Baixa patrimonial do equipamento (soft delete).</td></tr>

      <!-- OCORRÊNCIAS TÉCNICAS -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/ocorrencias</code></td><td><code>ocorrencias.visualizar</code></td><td>Fila de ordens de serviço (projeção leve otimizada).</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/ocorrencias/:id</code></td><td><code>ocorrencias.visualizar</code></td><td>Visualização completa de laudo, anexo e detalhes.</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/ocorrencias/:id/foto</code></td><td><code>ocorrencias.visualizar</code></td><td>Download exclusivo da foto em alta resolução.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/ocorrencias</code></td><td><code>ocorrencias.criar</code></td><td>Abertura de chamado técnico com evidência fotográfica.</td></tr>
      <tr><td><span class="badge badge-amber">PUT</span></td><td><code>/api/v1/ocorrencias/:id</code></td><td><code>ocorrencias.editar</code></td><td>Retificação de dados da ordem de manutenção.</td></tr>
      <tr><td><span class="badge badge-purple">PATCH</span></td><td><code>/api/v1/ocorrencias/:id/assumir</code></td><td><code>ocorrencias.assumir</code></td><td>Técnico N1 assume a responsabilidade do chamado.</td></tr>
      <tr><td><span class="badge badge-purple">PATCH</span></td><td><code>/api/v1/ocorrencias/:id/escalonar</code></td><td><code>ocorrencias.escalonar</code></td><td>Elevação para N2 ou N3 com registro de parecer.</td></tr>
      <tr><td><span class="badge badge-purple">PATCH</span></td><td><code>/api/v1/ocorrencias/:id/status</code></td><td><code>ocorrencias.fechar</code></td><td>Conclusão com parecer e restauração do equipamento.</td></tr>
      <tr><td><span class="badge badge-red">DELETE</span></td><td><code>/api/v1/ocorrencias/:id</code></td><td><code>ocorrencias.excluir</code></td><td>Cancelamento ou arquivamento de ordem de serviço.</td></tr>

      <!-- COMPRAS (BLOQUEADAS PARA OPERADOR) -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/compras</code></td><td><code>compras.visualizar</code></td><td>Fila de solicitações de compra e orçamentos.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/compras</code></td><td><code>compras.criar</code></td><td>Abertura de requisição de compra com estimativa.</td></tr>
      <tr><td><span class="badge badge-purple">PATCH</span></td><td><code>/api/v1/compras/:id/status</code></td><td><code>compras.aprovar</code></td><td>Aprovação, cancelamento ou recebimento de compra.</td></tr>
      <tr><td><span class="badge badge-red">DELETE</span></td><td><code>/api/v1/compras/:id</code></td><td><code>compras.excluir</code></td><td>Cancelamento formal do processo de compra.</td></tr>

      <!-- INSUMOS & ALMOXARIFADO -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/insumos</code></td><td><code>insumos.visualizar</code></td><td>Catálogo de materiais de consumo com alerta de estoque.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/insumos</code></td><td><code>insumos.criar</code></td><td>Cadastro de novo insumo e definição de estoque mínimo.</td></tr>
      <tr><td><span class="badge badge-purple">POST</span></td><td><code>/api/v1/insumos/movimentar</code></td><td><code>insumos.movimentar</code></td><td>Lançamento formal no kardex (Entrada, Saída, Baixa).</td></tr>

      <!-- ADVERTÊNCIAS DISCIPLINARES -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/advertencias</code></td><td><code>advertencias.visualizar</code></td><td>Listagem de medidas disciplinares funcionais.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/advertencias</code></td><td><code>advertencias.solicitar</code></td><td>Submissão de processo disciplinar com justificativa.</td></tr>
      <tr><td><span class="badge badge-purple">PATCH</span></td><td><code>/api/v1/advertencias/:id/homologar</code></td><td><code>advertencias.homologar</code></td><td>Decisão executiva do Admin Geral (Aprovação oficial).</td></tr>

      <!-- GOVERNANÇA & AUDITORIA MASTER -->
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/auditoria</code></td><td><code>auditoria.visualizar</code></td><td>Trilha de logs completa com paginação e filtros.</td></tr>
      <tr><td><span class="badge badge-blue">GET</span></td><td><code>/api/v1/auditoria/usuarios-online</code></td><td><code>auditoria.visualizar</code></td><td>Painel em tempo real de colaboradores com pulso ativo.</td></tr>
      <tr><td><span class="badge badge-green">POST</span></td><td><code>/api/v1/auditoria/solicitacoes/:id/aprovar</code></td><td><code>usuarios.aprovar</code></td><td>Homologação de cadastro pendente e liberação de acesso.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- CAPÍTULO 7 -->
  <h1><span class="chap-num">07</span> MODELAGEM COMPORTAMENTAL DINÂMICA</h1>

  <h2>7.1 Sequência: Autenticação Segura & Isolamento Multi-Aba</h2>
  <pre>
  Navegador / Usuário           SPA (auth.js)               Edge API (/auth/login)         D1 Database
         │                            │                               │                         │
         │─── 1. Submete E-mail/Senha ───>                            │                         │
         │                            │─── 2. POST /auth/login ──────>│                         │
         │                            │                               │─── 3. SELECT * FROM ───>│
         │                            │                               │<─── 4. Retorna Hash ────│
         │                            │                               │                         │
         │                            │                               │── 5. bcrypt.compare() ──│
         │                            │                               │── 6. Monta Permissões ──│
         │                            │<── 7. Retorna JWT Bearer ─────│                         │
         │                            │                               │                         │
         │                            │── 8. Salva em sessionStorage ─│                         │
         │                            │   (Isolamento por Aba Ativa)  │                         │
         │<── 9. Redireciona Dashboard ─│                            │                         │
  </pre>

  <h2>7.2 Sequência: Atendimento N1/N2 e Restauração de Equipamento</h2>
  <pre>
  Operador                   Técnico N1/N2                  Edge API (Ocorrências)       D1 Database
     │                             │                                  │                        │
     │── 1. Abre Chamado com Foto ─┼─────────────────────────────────>│                        │
     │                             │                                  │── 2. Insere Chamado ──>│
     │                             │                                  │── 3. Estado: Manutenc ─>│
     │                             │<── 4. Notifica Técnico de Turno ─│                        │
     │                             │                                  │                        │
     │                             │── 5. Assumir Atendimento ───────>│                        │
     │                             │   (PATCH /ocorrencias/:id/assumir)                        │
     │                             │                                  │── 6. Status: Em_Andam ─>│
     │                             │                                  │                        │
     │                             │── 7. Conclui com Parecer Técnico>│                        │
     │                             │   (PATCH /ocorrencias/:id/status)                         │
     │                             │                                  │── 8. Status: Resolvid ─>│
     │                             │                                  │── 9. Restaura p/ BOM ──>│
     │<── 10. Chamado Resolvido ───┼──────────────────────────────────│                        │
  </pre>

  <h2>7.3 Ciclo de Estados: Ocorrências, Compras e Contas de Usuário</h2>
  <div class="card alert-success">
    <div class="card-title">MÁQUINAS DE ESTADOS FINITOS</div>
    <p><strong>Ciclo de Chamados Técnicos:</strong> <code>aberto</code> ➔ <code>em_andamento</code> ➔ [Escalonamento N1/N2/N3] ➔ <code>resolvido</code> (Restauração atômica do equipamento para <code>bom</code>) ou <code>cancelado</code>.</p>
    <p><strong>Ciclo de Compras:</strong> <code>pendente</code> (aguardando cotação) ➔ <code>aprovado</code> (homologado pela gerência) ➔ <code>entregue</code> (recebido pelo almoxarifado) ou <code>cancelado</code>.</p>
    <p><strong>Ciclo de Contas de Acesso:</strong> <code>PENDENTE</code> (novo auto-cadastro) ➔ <code>ATIVO</code> (aprovado pelo Admin) ➔ <code>BLOQUEADO</code> / <code>INATIVO</code> (suspensão funcional) ou <code>REJEITADO</code>.</p>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 8 -->
  <h1><span class="chap-num">08</span> MATRIZ RBAC INTEGRAL DOS 15 PERFIS</h1>

  <h2>8.1 Mapeamento dos 15 Cargos e Credenciais de Homologação</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Cargo Institucional</th>
        <th style="width: 25%;">E-mail de Homologação</th>
        <th style="width: 25%;">Setor de Lotação</th>
        <th style="width: 30%;">Responsabilidade Primária</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>ADMIN</strong></td><td><code>admin@secult.es.gov.br</code></td><td>Administração Geral</td><td>Direção Executiva e TI Master com privilégios universais.</td></tr>
      <tr><td><strong>ADMINISTRADOR</strong></td><td><code>administrador@secult.es.gov.br</code></td><td>Administração Geral</td><td>Governança institucional e gestão de colaboradores.</td></tr>
      <tr><td><strong>ADMINISTRACAO</strong></td><td><code>administracao@secult.es.gov.br</code></td><td>Financeiro e Compras</td><td>Gestão de compras, almoxarifado e contratos operacionais.</td></tr>
      <tr><td><strong>GESTOR</strong></td><td><code>gestor@secult.es.gov.br</code></td><td>Administração Geral</td><td>Gestão executiva, aprovação de despesas e espaços.</td></tr>
      <tr><td><strong>GESTOR_RH</strong></td><td><code>gestor.rh@secult.es.gov.br</code></td><td>Recursos Humanos (RH)</td><td>Gestão do quadro de pessoal e processos disciplinares.</td></tr>
      <tr><td><strong>ANALISTA_RH</strong></td><td><code>analista.rh@secult.es.gov.br</code></td><td>Recursos Humanos (RH)</td><td>Processamento de cadastros, termos e licenças funcionais.</td></tr>
      <tr><td><strong>RH</strong></td><td><code>rh@secult.es.gov.br</code></td><td>Recursos Humanos (RH)</td><td>Atendimento a colaboradores e triagem de solicitações.</td></tr>
      <tr><td><strong>GESTOR_INFRA</strong></td><td><code>gestor.infra@secult.es.gov.br</code></td><td>Infraestrutura & Redes (TI)</td><td>Coordenação de manutenção predial, servidores e redes.</td></tr>
      <tr><td><strong>TECNICO_N3</strong></td><td><code>tecnico.n3@secult.es.gov.br</code></td><td>Infraestrutura & Redes (TI)</td><td>Suporte avançado de servidores, link de dados e sistemas.</td></tr>
      <tr><td><strong>TECNICO_N2</strong></td><td><code>tecnico.n2@secult.es.gov.br</code></td><td>Infraestrutura & Redes (TI)</td><td>Manutenção de hardware, cabeamento estruturado e switches.</td></tr>
      <tr><td><strong>TECNICO_N1</strong></td><td><code>tecnico.n1@secult.es.gov.br</code></td><td>Infraestrutura & Redes (TI)</td><td>Helpdesk local, atendimento a estações e impressoras.</td></tr>
      <tr><td><strong>TECNICO</strong></td><td><code>tecnico@secult.es.gov.br</code></td><td>Infraestrutura & Redes (TI)</td><td>Suporte técnico genérico e atendimento audiovisual.</td></tr>
      <tr><td><strong>GESTOR_OPERADOR</strong></td><td><code>gestor.operador@secult.es.gov.br</code></td><td>Operações e Logística</td><td>Supervisão do atendimento público e rotinas de eventos.</td></tr>
      <tr><td><strong>OPERADOR</strong></td><td><code>operador@secult.es.gov.br</code></td><td>Operações e Logística</td><td>Atendimento operacional geral (estritamente sem compras).</td></tr>
      <tr><td><strong>LIMPEZA</strong></td><td><code>limpeza@secult.es.gov.br</code></td><td>Manutenção Predial</td><td>Execução de rotinas de higienização e zeladoria predial.</td></tr>
    </tbody>
  </table>

  <h2>8.2 Matriz Cruzada de Autorização</h2>
  <table>
    <thead>
      <tr>
        <th>Perfil / Cargo</th>
        <th>Dash</th>
        <th>Ocorrências</th>
        <th>Ativos</th>
        <th>Insumos</th>
        <th>Compras</th>
        <th>Agenda</th>
        <th>Limpeza</th>
        <th>Auditoria</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>ADMIN</strong></td><td>Total</td><td>Total (N1/2/3)</td><td>Total</td><td>Total</td><td>Aprovar</td><td>Total</td><td>Total</td><td>Total</td></tr>
      <tr><td><strong>ADMINISTRADOR</strong></td><td>Total</td><td>Total</td><td>Total</td><td>Total</td><td>Aprovar</td><td>Total</td><td>Total</td><td>Ver/Aprovar</td></tr>
      <tr><td><strong>ADMINISTRACAO</strong></td><td>Total</td><td>Ver</td><td>Editar</td><td>Total</td><td>Aprovar</td><td>Total</td><td>Ver</td><td>Ver</td></tr>
      <tr><td><strong>GESTOR</strong></td><td>Total</td><td>Total</td><td>Editar</td><td>Total</td><td>Aprovar</td><td>Total</td><td>Total</td><td>Relatórios</td></tr>
      <tr><td><strong>GESTOR_RH</strong></td><td>RH</td><td>Ver</td><td>Ver</td><td>Ver</td><td>Solicitar</td><td>Total</td><td>Ver</td><td>RH Total</td></tr>
      <tr><td><strong>GESTOR_INFRA</strong></td><td>Infra</td><td>Total (N1/2/3)</td><td>Total</td><td>Total</td><td>Aprovar</td><td>Total</td><td>Total</td><td>Bloqueado</td></tr>
      <tr><td><strong>TECNICO_N3</strong></td><td>TI</td><td>Atender (N3)</td><td>Total</td><td>Movimentar</td><td>Solicitar</td><td>Ver</td><td>Ver</td><td>Bloqueado</td></tr>
      <tr><td><strong>TECNICO_N2</strong></td><td>TI</td><td>Atender (N2)</td><td>Editar</td><td>Movimentar</td><td>Solicitar</td><td>Ver</td><td>Ver</td><td>Bloqueado</td></tr>
      <tr><td><strong>TECNICO_N1</strong></td><td>TI</td><td>Atender (N1)</td><td>Ver</td><td>Solicitar</td><td>Solicitar</td><td>Ver</td><td>Ver</td><td>Bloqueado</td></tr>
      <tr><td><strong>OPERADOR</strong></td><td>Básico</td><td>Criar</td><td>Ver</td><td>Solicitar</td><td><span class="badge badge-red">BLOQUEIO</span></td><td>Ver</td><td>Solicitar</td><td>Bloqueado</td></tr>
      <tr><td><strong>LIMPEZA</strong></td><td>Zeladoria</td><td>Criar</td><td>Bloqueado</td><td>Solicitar</td><td>Bloqueado</td><td>Ver</td><td>Concluir</td><td>Bloqueado</td></tr>
      <tr><td><strong>VISITANTE</strong></td><td>Nenhum</td><td>Bloqueado</td><td>Bloqueado</td><td>Bloqueado</td><td>Bloqueado</td><td><span class="badge badge-green">Público</span></td><td>Bloqueado</td><td>Bloqueado</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- CAPÍTULO 9 -->
  <h1><span class="chap-num">09</span> MOTOR DE ACESSIBILIDADE UNIVERSAL & MÍDIA</h1>

  <h2>9.1 Acessibilidade WCAG 2.1 AA & Daltonismo</h2>
  <p>A aplicação incorpora em <code>assets/js/acessibilidade.js</code> uma engine completa de inclusão assistiva:</p>
  <ul>
    <li><strong>Onboarding Progressivo Pós-Login:</strong> Apresentado ao usuário em 3 etapas com transições fluidas:
      <ol>
        <li><em>Etapa 1:</em> Escolha de Tema (Modo Claro vs. Modo Escuro);</li>
        <li><em>Etapa 2:</em> Escala Tipográfica Dinâmica (Normal 100%, Médio 115%, Grande 130%);</li>
        <li><em>Etapa 3:</em> Modos Cromáticos com amostras circulares de cores vivas (facilitando a identificação imediata para daltonismo).</li>
      </ol>
    </li>
    <li><strong>Filtros SVG de Matriz de Cores (Daltonismo):</strong>
      <pre>
  • Protanopia (Perda do Vermelho):
    [0.567, 0.433, 0, 0, 0,  0.558, 0.442, 0, 0, 0,  0, 0.242, 0.758, 0, 0,  0, 0, 0, 1, 0]
  • Deuteranopia (Perda do Verde):
    [0.625, 0.375, 0, 0, 0,  0.700, 0.300, 0, 0, 0,  0, 0.300, 0.700, 0, 0,  0, 0, 0, 1, 0]
  • Tritanopia (Perda do Azul):
    [0.950, 0.050, 0, 0, 0,  0, 0.433, 0.567, 0, 0,  0, 0.475, 0.525, 0, 0,  0, 0, 0, 1, 0]
  • Acromatopsia (Monocromático):
    [0.299, 0.587, 0.114, 0, 0,  0.299, 0.587, 0.114, 0, 0,  0.299, 0.587, 0.114, 0, 0,  0, 0, 0, 1, 0]
      </pre>
    </li>
    <li><strong>Integração com VLibras:</strong> O widget oficial do Governo Federal é acoplado na raiz do DOM e habilitado dinamicamente para tradução simultânea em Língua Brasileira de Sinais.</li>
  </ul>

  <h2>9.2 Algoritmo de Compressão de Imagens no Cliente</h2>
  <div class="card alert-info">
    <div class="card-title">📷 COMPRESSÃO CLIENT-SIDE VIA CANVAS 2D (FOTO DE PERFIL E OCORRÊNCIAS)</div>
    <p>Para evitar saturação de I/O e eliminar lentidão no transporte do SQLite D1, o frontend processa fotos antes do envio:</p>
    <pre>
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const maxSize = 256; // Quadrado proporcional para avatar
  let { width, height } = img;
  if (width > height) {
    if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
  } else {
    if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
  }
  canvas.width = width; canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); // Redução de ~5MB para ~30KB
    </pre>
  </div>

  <div class="page-break"></div>

  <!-- CAPÍTULO 10 -->
  <h1><span class="chap-num">10</span> TELEMETRIA DE ESTRESSE & HOMOLOGAÇÃO</h1>

  <h2>10.1 As 7 Suítes de Testes Automatizados</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Arquivo de Teste</th>
        <th style="width: 20%;">Disciplina</th>
        <th style="width: 40%;">Escopo & Asserções Validadas</th>
        <th style="width: 15%;">Resultado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>tests/frontend-suite.js</code></td>
        <td>UI / Funcional / E2E</td>
        <td>44 asserções em 7 disciplinas: layout, responsividade mobile/tablet/desktop, A11y, tema escuro e paridade Edge/Chrome.</td>
        <td><span class="badge badge-green">44/44 PASS (100%)</span></td>
      </tr>
      <tr>
        <td><code>tests/stress-benchmark.js</code></td>
        <td>Carga & Estresse</td>
        <td>Medição de latências p50, p90, p95, p99, max, throughput (RPS) e estabilidade com 40 requisições simultâneas.</td>
        <td><span class="badge badge-green">0.0% Erros</span></td>
      </tr>
      <tr>
        <td><code>tests/test-perfil-notificacoes.js</code></td>
        <td>Perfil & Sino</td>
        <td>11 asserções validando edição de e-mail, foto comprimida, remoção de badge no sino e isolamento por usuário.</td>
        <td><span class="badge badge-green">11/11 PASS (100%)</span></td>
      </tr>
      <tr>
        <td><code>tests/audit-typography-contrast.js</code></td>
        <td>A11y & Tipografia</td>
        <td>Inspeção de overflow horizontal, quebras de container, razão de contraste WCAG 2.1 AA e escala de fontes.</td>
        <td><span class="badge badge-green">Aprovado</span></td>
      </tr>
      <tr>
        <td><code>tests/blackbox-api.js</code></td>
        <td>Caixa-Preta (REST)</td>
        <td>Testes de contrato HTTP em todas as rotas públicas e autenticadas com validação de status code e envelopes.</td>
        <td><span class="badge badge-green">Aprovado</span></td>
      </tr>
      <tr>
        <td><code>tests/whitebox-audit.js</code></td>
        <td>Caixa-Branca (Código)</td>
        <td>Auditoria estática de AST, verificação de SQL injection, soft delete e integridade de chamadas de auditoria.</td>
        <td><span class="badge badge-green">Aprovado</span></td>
      </tr>
      <tr>
        <td><code>tests/unit-tests.js</code></td>
        <td>Unitário (Lógica)</td>
        <td>Testes isolados de funções utilitárias, cálculo de ponto de pedido, hashing SHA-256 e parsing de JWT.</td>
        <td><span class="badge badge-green">Aprovado</span></td>
      </tr>
    </tbody>
  </table>

  <h2>10.2 Resultados Oficiais do Benchmark de Produção</h2>
  <table>
    <thead>
      <tr>
        <th>Cenário / Rota de Teste</th>
        <th>Total Reqs</th>
        <th>Média (ms)</th>
        <th>p50 (ms)</th>
        <th>p95 (ms)</th>
        <th>Vazão (RPS)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Health Check (Borda Edge)</td><td>30</td><td><strong>30 ms</strong></td><td>22 ms</td><td>61 ms</td><td>212.8 req/s</td><td><span class="badge badge-green">Excelente</span></td></tr>
      <tr><td>Feed Público Comunicados</td><td>30</td><td><strong>166 ms</strong></td><td>163 ms</td><td>182 ms</td><td>57.1 req/s</td><td><span class="badge badge-green">Excelente</span></td></tr>
      <tr><td>Chamados e Ocorrências</td><td>25</td><td><strong>451 ms</strong></td><td>452 ms</td><td>479 ms</td><td>10.7 req/s</td><td><span class="badge badge-green">Otimizado</span></td></tr>
      <tr><td>Dashboard Stats (9 queries)</td><td>25</td><td><strong>497 ms</strong></td><td>492 ms</td><td>542 ms</td><td>9.8 req/s</td><td><span class="badge badge-green">Otimizado</span></td></tr>
      <tr><td>Inventário de Equipamentos</td><td>25</td><td><strong>479 ms</strong></td><td>479 ms</td><td>496 ms</td><td>10.1 req/s</td><td><span class="badge badge-green">Otimizado</span></td></tr>
      <tr><td>Estoque de Insumos</td><td>25</td><td><strong>432 ms</strong></td><td>430 ms</td><td>454 ms</td><td>11.2 req/s</td><td><span class="badge badge-green">Otimizado</span></td></tr>
      <tr><td>Surge de Concorrência (40 conexões)</td><td>40</td><td><strong>571 ms</strong></td><td>550 ms</td><td>638 ms</td><td>32.8 req/s</td><td><span class="badge badge-green">Estável</span></td></tr>
    </tbody>
  </table>

  <h2>10.3 Termo de Homologação Executiva</h2>
  <p>Certifica-se que a plataforma <strong>HUB ES+</strong> encontra-se integralmente testada, modelada, otimizada e aprovada para operação em ambiente de produção pública e governamental.</p>

  <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
    <div style="text-align: center;">
      <div style="border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto 8px auto;"></div>
      <strong style="color: #0f172a; font-size: 8.5pt;">ENG. DE SOFTWARE & ARQUITETURA</strong><br>
      <span style="color: #64748b; font-size: 7.5pt;">Equipe Técnica HUB ES+ • SENAI-ES</span>
    </div>
    <div style="text-align: center;">
      <div style="border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto 8px auto;"></div>
      <strong style="color: #0f172a; font-size: 8.5pt;">SECRETARIA DE ESTADO DA CULTURA</strong><br>
      <span style="color: #64748b; font-size: 7.5pt;">Governo do Estado do Espírito Santo (SECULT)</span>
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'documento-modelagem-sistema.html');
const pdfFilePath = path.join(__dirname, 'DOCUMENTO_MODELAGEM_SISTEMA_HUB_ES.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('✅ Arquivo HTML enciclopédico gerado em:', htmlFilePath);

const chromePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
console.log('🖨️ Compilando para PDF Definitivo através do Google Chrome Headless...');

const args = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  `--print-to-pdf=${pdfFilePath}`,
  htmlFilePath
];

const res = spawnSync(chromePath, args);

if (fs.existsSync(pdfFilePath)) {
  const stats = fs.statSync(pdfFilePath);
  console.log('🎉 SUCESSO! Documento PDF Enciclopédico gerado:');
  console.log(`   • Arquivo: ${pdfFilePath}`);
  console.log(`   • Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
} else {
  console.error('❌ Falha ao compilar PDF:', res.stderr?.toString());
}
