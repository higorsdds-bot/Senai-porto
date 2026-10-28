# HUB ES+ | Plataforma Administrativa Integrada
## Contexto do Projeto e Guia Mestre para Agentes de IA

> **DIRETIVA CRÍTICA PARA TODAS AS IAs:**
> **O PADRÃO ARQUITETURAL E CONVENCIONAL DESTE PROJETO É RIGIDAMENTE DEFINIDO E NÃO DEVE SER ALTERADO.**
> Não migre o frontend para frameworks (React, Vue, Angular, Next, etc.).
> Não migre o backend para TypeScript, NestJS ou ORMs pesados (Prisma, TypeORM, Sequelize).
> Respeite a arquitetura Vanilla JS modular no frontend e Express CommonJS + mysql2 no backend.

---

## 1. Visão Geral do Projeto

O **HUB ES+** é a plataforma integrada de gestão administrativa desenvolvida para atender as operações do centro de inovação e criatividade **HUB ES+** (iniciativa do Governo do Estado do Espírito Santo via **SECULT - Secretaria da Cultura** em parceria técnica com o **SENAI**).

A plataforma centraliza e orquestra 11 áreas operacionais cruciais:
1. **Dashboard Executivo:** Métricas consolidadas, alertas operacionais e atalhos rápidos.
2. **Gestão Documental:** Repositório oficial de normas, termos, atas e relatórios com upload/download.
3. **Controle de Insumos:** Gestão de almoxarifado, estoque mínimo, alertas de reposição e movimentações (Entrada, Saída, Baixa).
4. **Compras & Suprimentos:** Fluxo de requisição, cotação, aprovação e recebimento de mercadorias.
5. **Agenda Inteligente:** Agendamento de salas, laboratórios, estúdios, auditório e eventos públicos.
6. **Ocorrências Técnicas:** Abertura e resolução de chamados de manutenção, com captura de foto via webcam, upload de anexos e status em tempo real.
7. **Central de Comunicação:** Avisos internos, comunicados com prioridade e painel de informes.
8. **Painel de Indicadores:** Gráficos interativos (Chart.js) de ocupação, consumo, SLAs e desempenho operacional.
9. **Controle de Limpeza:** Cronograma, checklists e acompanhamento de higienização de ambientes.
10. **Controle de Equipamentos:** Cadastro patrimonial, rastreamento de localização e manutenções.
11. **Auditoria & Governança (Admin Only):** Monitoramento de usuários online via heartbeat em tempo real, aprovação de novos cadastros (status `PENDENTE`), gestão de status e trilha completa de logs auditados.
12. **Gestão de Advertências Disciplinares:** Registro e acompanhamento formal de medidas disciplinares com trilha de auditoria, onde o **Administrador Geral** (`ADMIN`) atua como a autoridade institucional responsável por **aceitar (homologar)** ou rejeitar as advertências submetidas.

---

## 2. Stack Tecnológica

### Backend
- **Ambiente de Execução:** Node.js (CommonJS, `require` / `module.exports`).
- **Framework Web:** Express.js 5.x.
- **Banco de Dados:** TiDB Cloud (compatível com MySQL 8.0), via driver `mysql2/promise` com pool de conexões escalado para alta concorrência (40 conexões, `maxIdle: 20`, keep-alive ativo).
- **Autenticação:** JSON Web Token (`jsonwebtoken`) com Bearer Token e expiração configurável (padrão: 8h), com cache em memória (TTL 30s) para validação ultra-rápida sem sobrecarga no banco.
- **Segurança & Criptografia:** `bcryptjs` (salt 12 para hashing de senhas), CORS configurado com whitelist.
- **Uploads:** `multer` (com armazenamento em disco `diskStorage` em `uploads/` e limite de 20MB a 25MB).

### Frontend
- **Arquitetura:** Single Page Application (SPA) em **Vanilla JavaScript puro** modular.
- **Gerenciamento de Sessão:** Isolamento por aba com prioridade em `sessionStorage` (fallback em `localStorage`), permitindo testes e operação simultânea de múltiplas contas sem sobrescrita de sessão no F5.
- **Resiliência a Concorrência:** Carregamento assíncrono com `Promise.allSettled` e fallbacks defensivos para sub-recursos.
- **Roteamento:** Hash Routing (`#dashboard`, `#documentos`, `#insumos`, `#compras`, `#agenda`, `#ocorrencias`, `#comunicacao`, `#indicadores`, `#limpeza`, `#equipamentos`, `#auditoria`).
- **Estilização:** Tailwind CSS (via CDN) com paleta de tokens personalizada `hub-*` e CSS customizado para glassmorphism e animações.
- **Modo Escuro / Claro:** Alternância via classe `.dark` no elemento `<html>`, controlada pelo `assets/js/tema.js` com persistência em `localStorage`.
- **Ícones:** Lucide Icons (`data-lucide="nome"`, inicializados via `lucide.createIcons()`).
- **Visualização de Dados:** Chart.js (via CDN).

---

## 3. Estrutura de Diretórios e Arquivos

```text
Senai-porto/
├── .env                              # Variáveis de ambiente locais (credenciais TiDB, JWT, etc.)
├── .env.example                      # Exemplo de configuração das variáveis
├── .gitignore                        # Arquivos ignorados pelo Git (node_modules, .env, uploads/)
├── package.json                      # Dependências e scripts npm
├── server.js                         # Ponto de entrada do servidor Express e montagem das rotas
├── index.html                        # Estrutura base da SPA (Sidebar, Topbar, Main Content, Modais)
├── uploads/                          # Diretório de arquivos enviados (documentos, fotos de ocorrências)
│   └── ocorrencias/                  # Fotos e anexos de ocorrências
├── assets/                           # Arquivos estáticos do frontend
│   ├── css/
│   │   ├── style.css                 # Estilos customizados, glassmorphism e utilitários
│   │   └── tema-escuro.css           # Estilos e sobrescritas para o tema escuro
│   └── js/
│       ├── config.js                 # Constantes globais (CONFIG), endpoints e chaves de storage
│       ├── tema.js                   # Lógica de alternância de tema Claro/Escuro
│       ├── mock.js                   # Dados e manipuladores de mock para fallback
│       ├── api.js                    # Camada HTTP client centralizada (ApiService / window.API)
│       ├── auth.js                   # Gerenciamento de sessão, login, heartbeat e RBAC (window.Auth)
│       ├── ui.js                     # Componentes visuais utilitários: Toasts, Modais, Skeletons, Alerts
│       ├── app.js                    # Roteador SPA (AppRouter / window.Router) e ciclo de vida
│       └── modules/                  # Módulos SPA de cada funcionalidade
│           ├── dashboard.js
│           ├── documentos.js
│           ├── insumos.js
│           ├── compras.js
│           ├── agenda.js
│           ├── ocorrencias.js
│           ├── comunicacao.js
│           ├── indicadores.js
│           ├── limpeza.js
│           ├── equipamentos.js
│           └── auditoria.js
└── src/                              # Código fonte do backend Express
    ├── config/
    │   └── database.js               # Configuração do pool MySQL2 e teste de conexão TiDB Cloud
    ├── middleware/
    │   ├── auth.js                   # Middleware JWT de autenticação (authMiddleware)
    │   ├── permissions.js            # Middleware de autorização RBAC e cache de permissões
    │   └── auditoria.js              # Helper para inserção assíncrona na tabela auditoria
    ├── database/
    │   ├── schema.sql                # DDL completo das tabelas compatíveis com TiDB/MySQL
    │   ├── seed.js                   # Seed idempotente de permissões, perfis, setores e admin
    │   ├── migrate.js                # Executor da migração do schema.sql
    │   ├── migrate-foto-ocorrencias.js # Migração incremental para coluna foto_url
    │   ├── migrate-auditoria-ocorrencias.js # Migração incremental para status PENDENTE e anexos
    │   ├── migrate-remove-compras-operador.js # Migração para revogação de compras do perfil OPERADOR
    │   └── migrate-dispensar-cadastro-visitante.js # Migração para dispensar cadastro de perfil VISITANTE
    └── routes/                       # Controladores / Routers Express montados sob /api/v1/
        ├── auth.js                   # Login, logout, /me, heartbeat, solicitar-cadastro
        ├── usuarios.js               # CRUD de usuários, alteração de status e senha
        ├── setores.js                # Listagem e gestão de setores
        ├── limpeza.js                # Rotas de escala e tarefas de limpeza
        ├── compras.js                # Solicitações de compra, aprovação e recebimento
        ├── equipamentos.js           # Gestão de equipamentos e patrimônio
        ├── documentos.js             # Upload, metadados e download de documentos
        ├── ocorrencias.js            # Chamados técnicos com suporte a fotos e anexos
        ├── eventos.js                # Agenda e reserva de espaços
        ├── insumos.js                # Almoxarifado e movimentações de estoque
        ├── comunicados.js            # Mural de avisos e comunicados internos
        ├── dashboard.js              # Agrupamento de métricas e KPIs
        ├── publico.js                # Rotas públicas sem autenticação (comunicados e eventos para visitantes)
        └── auditoria.js              # Consulta de logs, usuários online e aprovação de cadastros
```

---

## 4. Padrões Inegociáveis de Código

### 4.1 Padrão Backend (Express & Banco de Dados)
1. **Módulos CommonJS:** Sempre use `require(...)` e `module.exports = ...`.
2. **Conexão com Banco:** Use sempre `const { getPool } = require('../config/database');` e execute `const pool = getPool(); const [rows] = await pool.query(sql, params);`.
3. **Soft Delete Mandatório:** NUNCA execute `DELETE FROM tabela WHERE id = ?`. Em vez disso, use:
   ```sql
   UPDATE tabela SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL
   ```
   E em todas as consultas `SELECT`, inclua obrigatoriamente a cláusula `WHERE deleted_at IS NULL`.
4. **Formato Padrão de Resposta da API:**
   - Sucesso:
     ```json
     { "success": true, "data": ... }
     ```
   - Falha / Erro:
     ```json
     { "success": false, "message": "Mensagem amigável em português." }
     ```
   - Erro de Validação:
     ```json
     { "success": false, "message": "Dados inválidos.", "errors": { "campo": "Descrição do erro" } }
     ```
5. **Autenticação e Autorização em Rotas:**
   - Todas as rotas de negócio operacionais devem usar `authMiddleware`.
   - Rotas específicas devem usar `requirePermission('modulo.acao')` ou `requireAnyPermission(...)`.
   - **Exceção de Rotas Públicas:** Endpoints abertos para consulta pública/visitantes residem exclusivamente em `/api/v1/publico/*` (`src/routes/publico.js`), sem `authMiddleware`, estritamente com método `GET` (somente leitura de comunicados e eventos), sem expor dados confidenciais.
   - O usuário autenticado fica disponível em `req.usuario` com `{ id, nome, email, perfil, setor_id, status }`.
6. **Auditoria Obrigatória em Ações de Escrita:**
   - Em operações de criação, alteração sensível, deleção, login/logout e aprovações, invoque `registrarAuditoria`:
     ```javascript
     const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');
     // ...
     await registrarAuditoria({
       usuario_id: req.usuario?.id || null,
       acao: 'CRIAR_OCORRENCIA',
       entidade: 'ocorrencias',
       entidade_id: insertId,
       descricao: `Nova ocorrência no local: ${local}`,
       ip: getClientIp(req),
       user_agent: req.headers['user-agent'] || null
     });
     ```
   - O helper `registrarAuditoria` é resiliente: se falhar, ele apenas loga no console e **não derruba** a requisição do usuário.
7. **Pool de Alta Concorrência e Keep-Alive:**
   - O pool MySQL2 (`src/config/database.js`) é dimensionado com `connectionLimit: 40`, `maxIdle: 20`, `idleTimeout: 60000`, `enableKeepAlive: true` e `keepAliveInitialDelay: 10000`. Isso previne saturação e encerramento prematuro de conexões TCP com o TiDB Cloud mesmo durante picos com múltiplas contas e abas ativas simultaneamente.
8. **Cache em Memória de Autenticação (`_userAuthCache`):**
   - No middleware de autenticação (`src/middleware/auth.js`), os dados do usuário e perfil validados via JWT são armazenados em um cache em memória com TTL de 30 segundos. Isso elimina consultas redundantes de `SELECT ... FROM usuarios` a cada micro-requisição e disparo de heartbeat, acelerando a resposta da API e protegendo o banco contra sobrecargas. A função exportada `clearUserAuthCache(userId)` invalida imediatamente o cache quando o status ou perfil do usuário é modificado.

### 4.2 Padrão Frontend (Vanilla JS SPA)
1. **Estrutura de Módulo:** Todo módulo em `assets/js/modules/` deve ser registrado no objeto global `window` com o sufixo `Module` (ex.: `window.DocumentosModule`, `window.InsumosModule`, `window.AuditoriaModule`).
2. **Contrato do Módulo:**
   - Método obrigatório: `async render(container) { ... }`
   - O container recebido é a `div#main-content`.
   - Sempre exiba um skeleton loader durante carregamento: `container.innerHTML = window.UI.renderTableSkeleton(...)`.
   - Em caso de falha na requisição, renderize um estado de erro amigável usando `window.UI.renderEmptyState(...)`.
3. **Consumo de API:**
   - NUNCA use `fetch()` diretamente dentro dos módulos.
   - Adicione o método na classe `ApiService` em `assets/js/api.js` e consuma através de `window.API.metodo()`.
   - Lembre-se: `window.API.request()` já desembrulha o envelope `{ success: true, data }` e retorna diretamente o conteúdo de `data` para os módulos.
4. **Interação com Usuário (Modais e Notificações):**
   - Não use `alert()` ou `confirm()` nativos do navegador.
   - Use `window.UI.toast({ title, message, type: 'success' | 'error' | 'warning' | 'info' })`.
   - Use `window.UI.confirmModal({ title, message, confirmText, isDanger, onConfirm })`.
   - Use `window.UI.openModal({ title, content, confirmText, onConfirm })`.
5. **Ícones Lucide:**
   - Sempre que renderizar HTML dinamicamente com `<i data-lucide="..."></i>`, invoque `if (window.lucide) window.lucide.createIcons();` após injetar o conteúdo no DOM.
6. **Isolamento de Estado no LocalStorage por Perfil:**
   - NUNCA salve status de leitura de avisos, badges ou notificações em chaves globais estáticas no `localStorage`.
   - Utilize sempre `window.Auth.getUserStorageKey(prefix)` para gerar chaves com escopo do perfil e do usuário logado: `${prefix}_${perfil}_${id}`.
   - Isso garante que a alternância entre contas e perfis diferentes em uma mesma máquina preserve o status de "não lido" e as notificações para cada perfil autorizado.
7. **Isolamento de Sessão por Aba (`sessionStorage` > `localStorage`):**
   - As camadas `assets/js/api.js` e `assets/js/auth.js` priorizam `sessionStorage` na recuperação do token e dos dados do usuário, com fallback para `localStorage`.
   - Ao fazer login, a sessão é gravada em ambos os storages.
   - Isso garante que abas distintas abertas simultaneamente no mesmo navegador possam manter sessões ativas com contas diferentes (ex: Aba 1 = `ADMIN`, Aba 2 = `GESTOR`, Aba 3 = `LIMPEZA`) sem que a última conta sobrescreva as demais ao recarregar com F5.
8. **Resiliência a Concorrência com `Promise.allSettled`:**
   - Em módulos que agregam múltiplos recursos ou sub-recursos auxiliares (ex: `assets/js/modules/agenda.js`, `assets/js/modules/insumos.js`, `assets/js/modules/auditoria.js`), utilize `Promise.allSettled` com fallbacks padrão (`[]` ou valores default). Isso assegura que a indisponibilidade ou latência de um recurso secundário não paralise a exibição da tela principal nem bloqueie modais operacionais.

---

## 5. Modelo de Perfis e Permissões (RBAC)

O sistema possui controle de acesso por perfis, armazenado nas tabelas `permissoes` e `perfil_permissoes`, com cache em memória de 5 minutos no backend (`src/middleware/permissions.js`):

| Perfil | Descrição | Comportamento de Acesso |
| :--- | :--- | :--- |
| **ADMIN / ADMINISTRADOR** | Acesso irrestrito a todas as rotas e ao módulo exclusivo de **Auditoria & Governança**. | Bypass total: tem todas as permissões. |
| **GESTOR** | Gestão operacional de compras, ocorrências, limpeza, insumos, documentos, agenda e setores. | Possui conjunto amplo de permissões operacionais e de aprovação. |
| **OPERADOR** | Visualização e movimentações rotineiras de insumos, abertura de ocorrências e agendamento de eventos na **Agenda Inteligente** (`eventos.criar`). **Restrição de Compras:** Não possui acesso ao módulo de compras (`compras.visualizar` e `compras.criar` revogadas no banco). No **Dashboard**, o botão "Nova Solicitação" e o atalho de compras permanecem estritamente ocultos e desarmados. | Acesso padrão a módulos operacionais e de eventos; compras e dashboard executivo desarmados. |
| **ADMINISTRACAO** | Setor administrativo com foco em recebimento de pedidos de compra, baixa de insumos e pré-cadastro de novos colaboradores (sem atribuição de setor/cargo). | Permissões fixas específicas em `FIXED_PROFILE_PERMISSIONS` (inclui `usuarios.pre_cadastrar`). |
| **LIMPEZA** | Equipe de serviços gerais com foco em suas solicitações e tarefas de limpeza. | Permissões focadas em suas próprias solicitações de compra e rotinas de higienização. |
| **VISITANTE (Modo Público)** | Modo de acesso público sem necessidade de cadastro ou conta no banco de dados. Qualquer pessoa acessa livremente a Agenda e os Comunicados sem login. **Cadastro Dispensado:** A opção de cadastrar usuários com o perfil `VISITANTE` foi formalmente descontinuada no sistema, já que o visitante não tem permissões restritas e a plataforma já disponibiliza as informações essenciais livremente sem cadastro. | Acesso livre exclusivamente a `#comunicacao` e `#agenda`. Não requer login nem criação de conta. |

### Regras do Modo Público / Visitante
- **Quem é considerado Visitante:** Qualquer pessoa acessando o SPA sem efetuar login (`!estaLogado()`). O cadastro de usuários com o perfil `VISITANTE` foi formalmente dispensado no sistema, eliminando a criação de contas desnecessárias no banco de dados.
- **Módulos Permitidos:** Estritamente **Central de Comunicação** (`#comunicacao`) e **Agenda Inteligente** (`#agenda`), consumindo rotas públicas em `/api/v1/publico/*`.
- **Bloqueio Rígido no Roteador:** O `handleRoute()` em `assets/js/app.js` intercepta imediatamente qualquer tentativa de navegação anônima para as outras 9 rotas (`#dashboard`, `#compras`, `#documentos`, etc.), emitindo um toast explicativo e redirecionando para `#comunicacao`.
- **Visibilidade de Menus:** A sidebar e o menu mobile ocultam automaticamente todos os links para os quais o visitante não possui permissão, exibindo apenas Comunicação e Agenda.

### Fluxo de Cadastro, E-mails e Ativação de Contas
1. **Envio da Solicitação:** Qualquer colaborador pode solicitar cadastro pela tela de login via `POST /api/v1/auth/solicitar-cadastro` OU o perfil **ADMINISTRACAO** pode pré-cadastrar colaboradores diretamente pelo módulo **Cadastrar Colaborador** (`POST /api/v1/usuarios/pre-cadastro`).
2. **Notificação ao Administrador Geral:** Imediatamente após o envio da solicitação (ou pré-cadastro), o sistema dispara um e-mail de notificação para todos os usuários com perfil `ADMIN` ativos (e para `ADMIN_DEFAULT_EMAIL`), informando nome, e-mail, horário e link direto para análise no módulo Auditoria (`#auditoria`).
3. **Bloqueio Rigoroso de Acesso:** Contas com status `PENDENTE`, `AGUARDANDO_ATIVACAO`, `REJEITADO`, `INATIVO` ou `BLOQUEADO` não conseguem fazer login (a API retorna HTTP 403 com mensagem amigável e explicativa).
4. **Aprovação e Envio de Link Seguro:** Quando o **Administrador Geral** aprova a solicitação (`POST /api/v1/auditoria/solicitacoes/:id/aprovar`), o status da conta passa para `AGUARDANDO_ATIVACAO`. O sistema gera um token de uso único (SHA-256) com validade limitada de 24 horas (`ACTIVATION_TOKEN_EXPIRES_HOURS`) e dispara um e-mail ao solicitante contendo o link exclusivo de ativação (`#ativar-conta?token=...`).
5. **Segurança de Senhas:** Nenhuma senha provisória ou definitiva é enviada por e-mail. O próprio usuário define sua senha pessoal e confidencial na tela de ativação da plataforma.
6. **Conclusão da Ativação:** Ao submeter a senha na rota `POST /api/v1/auth/ativar-conta`, o token é invalidado imediatamente (uso único), o hash bcrypt da senha é armazenado e a conta passa para `ATIVO`, liberando o login normal conforme seu perfil e permissões.
7. **Rejeição com Motivo:** Caso a solicitação seja recusada pelo Administrador (`POST /api/v1/auditoria/solicitacoes/:id/rejeitar`), a conta é marcada como `REJEITADO` (com soft delete), quaisquer tokens são invalidados e um e-mail é enviado ao solicitante contendo a justificativa/motivo informado pela administração.
8. **Proteção Anti-Abuso:** O sistema possui rate limiting em memória para requisições de cadastro, tentativas de ativação e envio de e-mails (máximo 5 e-mails/hora por destinatário).
9. **Auditoria Limpa:** Todas as etapas (`SOLICITACAO_CADASTRO`, `PRE_CADASTRO_USUARIO`, `APROVAR_CADASTRO`, `REJEITAR_CADASTRO`, `ATIVACAO_CONTA`) são gravadas na tabela `auditoria`, sem registrar senhas, tokens ou dados sensíveis.

### Regras de Edição de Solicitações e Pedidos de Compra
- **Edição pelo Solicitante:** Qualquer colaborador que enviou uma solicitação de materiais ou compra (`compras`) tem a opção de editar os dados da sua solicitação já pedida enquanto o status estiver como `pendente` (`PUT /api/v1/compras/:id`).
- **Edição Irrestrita com Digitação pelo Administrador:** O perfil Administrador tem acesso a todos os campos editáveis por digitação direta (produto, descrição, quantidade, valor estimado, setor, status e parecer/justificativa administrativa).

---

## 6. Procedimentos de Execução e Manutenção

### Comandos de Inicialização
```bash
# Instalação das dependências
npm install

# Execução das migrações e seed inicial
npm run migrate

# Inicialização em modo desenvolvimento
npm run dev

# Inicialização em modo produção
npm start
```

### Variáveis de Ambiente Cruciais (.env)
- `PORT`: Porta do servidor (padrão: 3001).
- `NODE_ENV`: `development` ou `production`.
- `DB_HOST`: Host do TiDB Cloud / MySQL.
- `DB_PORT`: Porta do banco (padrão: 4000 para TiDB Cloud ou 3306 para MySQL local).
- `DB_USERNAME`: Usuário do banco.
- `DB_PASSWORD`: Senha do banco.
- `DB_DATABASE`: Nome do banco (ex.: `secult_db`).
- `DB_SSL`: `true` para conexões seguras com TiDB Cloud.
- `JWT_SECRET`: Chave secreta de assinatura dos tokens JWT.
- `JWT_EXPIRES_IN`: Duração do token (ex.: `8h`).
- `UPLOAD_DIR`: Pasta de uploads no disco (padrão: `uploads`).

---

## 7. Regra Fundamental para o Agente de IA

Sempre que receber uma tarefa neste repositório:
1. Abra e consulte este arquivo `PROJECT_CONTEXT.md` e o `SKILLS.md`.
2. Analise os arquivos existentes no módulo que você vai alterar antes de escrever qualquer código.
3. Garanta que novas rotas possuam verificação de autenticação (`authMiddleware`), verificação de permissão (`requirePermission`), registro de auditoria (`registrarAuditoria`) e filtro de `deleted_at IS NULL`.
4. Garanta que novos métodos do frontend fiquem dentro de `assets/js/api.js` e os componentes sigam o padrão de `assets/js/modules/`.
5. Mantenha os comentários explicativos e a linguagem limpa em Português (Brasil).
6. Consulte `AUDITORIA.md` para o histórico completo da auditoria do sistema, matriz de permissões RBAC e plano de correções.
