# HUB ES+ | Manual Operacional de Skills para IAs
## Procedimentos Padronizados de Desenvolvimento (SOPs)

Este documento contém o guia prático de todas as **skills** (habilidades técnicas e procedimentos operacionais) desenvolvidas e consolidadas no projeto HUB ES+. Qualquer IA deve seguir rigorosamente estes fluxos para manter o padrão sem regressões.

---

## Índice de Skills
1. [Skill 1: Construção e Evolução de Módulos SPA Frontend](#skill-1-construção-e-evolução-de-módulos-spa-frontend)
2. [Skill 2: Criação de Rotas RESTful no Backend Express](#skill-2-criação-de-rotas-restful-no-backend-express)
3. [Skill 3: Migrações e Alterações no Banco de Dados (TiDB Cloud / MySQL)](#skill-3-migrações-e-alterações-no-banco-de-dados-tidb-cloud--mysql)
4. [Skill 4: Fluxo de Autenticação, Usuários e Aprovação de Contas](#skill-4-fluxo-de-autenticação-usuários-e-aprovação-de-contas)
5. [Skill 5: Trilha de Auditoria e Governança Contínua](#skill-5-trilha-de-auditoria-e-governança-contínua)
6. [Skill 6: Uploads e Captura de Fotos (Webcam & Arquivos Anexos)](#skill-6-uploads-e-captura-de-fotos-webcam--arquivos-anexos)
7. [Skill 7: Design System, Modo Escuro e Componentes de UI](#skill-7-design-system-modo-escuro-e-componentes-de-ui)
8. [Skill 8: Diagnóstico, Teste e Validação da Aplicação](#skill-8-diagnóstico-teste-e-validação-da-aplicação)
9. [Skill 9: Fluxo de Advertências Disciplinares e Homologação pelo Administrador Geral](#skill-9-fluxo-de-advertências-disciplinares-e-homologação-pelo-administrador-geral)
10. [Skill 10: Gestão de Hierarquia Setorial, Permissões Granulares e Suporte N1/N2/N3](#skill-10-gestão-de-hierarquia-setorial-permissões-granulares-e-suporte-n1n2n3)
11. [Skill 11: Testes de Coesão, Fluxos entre Cargos e Login Rápido por Perfil](#skill-11-testes-de-coesão-fluxos-entre-cargos-e-login-rápido-por-perfil)

---

### Skill 1: Construção e Evolução de Módulos SPA Frontend

#### Objetivo
Criar ou modificar telas e módulos da aplicação SPA em `assets/js/modules/` respeitando o ciclo de vida e a injeção na `div#main-content`.

#### Procedimento Passo a Passo
1. **Definir o Objeto do Módulo:**
   - Crie ou edite o arquivo `assets/js/modules/<modulo>.js`.
   - Registre o módulo no escopo global: `window.<Modulo>Module = { ... }`.
2. **Implementar o Método `render(container)`:**
   ```javascript
   window.ExemploModule = {
     items: [],
     searchTerm: '',
     currentPage: 1,
     pageSize: 8,

     async render(container) {
       // 1. Exibir Skeleton Loader enquanto busca dados
       container.innerHTML = window.UI.renderTableSkeleton(5, 4);

       try {
         // 2. Buscar dados via ApiService (window.API)
         const dados = await window.API.getExemplos();
         this.items = dados;
         // 3. Renderizar visão principal
         this._renderView(container);
       } catch (err) {
         console.error('[EXEMPLO] Erro ao carregar:', err);
         container.innerHTML = window.UI.renderEmptyState({
           title: 'Erro ao carregar dados',
           description: err.message || 'Falha de comunicação com o servidor.',
           actionLabel: 'Tentar Novamente',
           onActionClick: () => this.render(container)
         });
       }
     },

     _renderView(container) {
       // Filtros locais e paginação
       const filtrados = this.items.filter(item => 
         item.nome.toLowerCase().includes(this.searchTerm.toLowerCase())
       );

       container.innerHTML = `
         <div class="space-y-6">
           <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
             <div>
               <h1 class="text-2xl font-black text-slate-900 dark:text-white">Título do Módulo</h1>
               <p class="text-xs text-slate-500">Descrição operacional do módulo</p>
             </div>
             <button id="btn-novo-item" class="btn-primary">
               <i data-lucide="plus" class="w-4 h-4"></i> Novo
             </button>
           </div>
           <!-- Tabela / Lista / Cards aqui -->
         </div>
       `;

       // 4. Inicializar os ícones Lucide
       if (window.lucide) window.lucide.createIcons({ root: container });

       // 5. Vincular listeners de eventos
       this._bindEvents(container);
     },

     _bindEvents(container) {
       container.querySelector('#btn-novo-item')?.addEventListener('click', () => {
         this._abrirModalCriacao(container);
       });
     }
   };
   ```
3. **Registrar no Roteador SPA (`assets/js/app.js`):**
   - Adicione a rota no mapeamento `this.routes` dentro do construtor de `AppRouter`:
     ```javascript
     'exemplo': {
       title: 'Exemplo do Sistema',
       module: window.ExemploModule,
       navId: 'nav-exemplo',
       moduleKey: 'exemplo',
       permissions: ['exemplo.visualizar']
     }
     ```
4. **Incluir a Tag `<script>` em `index.html`:**
   - Adicione o script na seção de módulos antes de `assets/js/app.js`.
5. **Resiliência a Concorrência com `Promise.allSettled` e Modais Defensivos:**
   - Quando carregar recursos principais e sub-recursos agregados (ex: itens + setores + usuários), use `Promise.allSettled`:
     ```javascript
     const [resPrincipal, resSetores] = await Promise.allSettled([
       window.API.getItens(),
       window.API.getSetores()
     ]);
     this.items = resPrincipal.status === 'fulfilled' ? (resPrincipal.value || []) : [];
     this.setores = resSetores.status === 'fulfilled' ? (resSetores.value || []) : [];
     ```
   - Em operações de envio de formulários e modais (ex: criação de agendamento, ajuste de estoque), envolva sempre a chamada à API em bloco `try/catch` defensivo, restaurando o estado do botão/spinner e emitindo toast de erro amigável em caso de exceção.

---

### Skill 2: Criação de Rotas RESTful no Backend Express

#### Objetivo
Criar ou expandir endpoints no Express com suporte a pool de conexões MySQL, autenticação JWT, controle de permissão e registro de auditoria.

#### Procedimento Passo a Passo
1. **Estrutura Básica do Arquivo de Rota (`src/routes/<modulo>.js`):**
   ```javascript
   const express = require('express');
   const router = express.Router();
   const { getPool } = require('../config/database');
   const { authMiddleware } = require('../middleware/auth');
   const { requirePermission } = require('../middleware/permissions');
   const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

   // Todas as rotas deste recurso exigem autenticação
   router.use(authMiddleware);

   // GET: Listagem com filtro e soft delete
   router.get('/', requirePermission('modulo.visualizar'), async (req, res) => {
     try {
       const pool = getPool();
       const [rows] = await pool.query(
         `SELECT id, nome, status, created_at 
          FROM tabela_exemplo 
          WHERE deleted_at IS NULL 
          ORDER BY created_at DESC`
       );
       return res.json({ success: true, data: rows });
     } catch (err) {
       console.error('[MODULO] GET:', err.message);
       return res.status(500).json({ success: false, message: 'Erro ao listar dados.' });
     }
   });

   // POST: Criação com validação e auditoria
   router.post('/', requirePermission('modulo.criar'), async (req, res) => {
     const { nome } = req.body;
     if (!nome) {
       return res.status(422).json({
         success: false,
         message: 'O campo nome é obrigatório.'
       });
     }

     try {
       const pool = getPool();
       const [result] = await pool.query(
         `INSERT INTO tabela_exemplo (nome, usuario_id) VALUES (?, ?)`,
         [nome.trim(), req.usuario.id]
       );

       await registrarAuditoria({
         usuario_id: req.usuario.id,
         acao: 'CRIAR_EXEMPLO',
         entidade: 'tabela_exemplo',
         entidade_id: result.insertId,
         descricao: `Criado item: ${nome}`,
         ip: getClientIp(req),
         user_agent: req.headers['user-agent'] || null
       });

       return res.status(201).json({
         success: true,
         message: 'Item criado com sucesso.',
         data: { id: result.insertId, nome }
       });
     } catch (err) {
       console.error('[MODULO] POST:', err.message);
       return res.status(500).json({ success: false, message: 'Erro ao criar item.' });
     }
   });

   // DELETE: Soft delete obrigatório
   router.delete('/:id', requirePermission('modulo.excluir'), async (req, res) => {
     try {
       const pool = getPool();
       const [result] = await pool.query(
         `UPDATE tabela_exemplo SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
         [req.params.id]
       );

       if (result.affectedRows === 0) {
         return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
       }

       await registrarAuditoria({
         usuario_id: req.usuario.id,
         acao: 'EXCLUIR_EXEMPLO',
         entidade: 'tabela_exemplo',
         entidade_id: req.params.id,
         descricao: `Exclusão do item ID ${req.params.id}`,
         ip: getClientIp(req),
         user_agent: req.headers['user-agent'] || null
       });

       return res.json({ success: true, message: 'Registro removido com sucesso.' });
     } catch (err) {
       console.error('[MODULO] DELETE:', err.message);
       return res.status(500).json({ success: false, message: 'Erro ao excluir registro.' });
     }
   });

   module.exports = router;
   ```
2. **Registrar em `server.js`:**
   ```javascript
   const exemploRouter = require('./src/routes/exemplo');
   app.use(`${BASE}/exemplo`, exemploRouter);
   ```
3. **Padrão para Rotas Públicas (Sem Autenticação):**
   - Endpoints acessíveis a visitantes anônimos residem estritamente em `src/routes/publico.js` sob o caminho `/api/v1/publico/*`.
   - Estas rotas **NÃO** usam `authMiddleware` e são exclusivamente `GET` (somente leitura de comunicados e eventos), retornando apenas dados não confidenciais.

---

### Skill 3: Migrações e Alterações no Banco de Dados (TiDB Cloud / MySQL)

#### Objetivo
Evoluir o esquema do banco de forma segura, incremental e idempotente sem quebrar a compatibilidade com o TiDB Cloud.

#### Procedimento Passo a Passo
1. **Padrão de Script Incremental:**
   - Crie `src/database/migrate-<funcionalidade>.js`.
   - Conecte usando as variáveis de ambiente com SSL habilitado se `process.env.DB_SSL === 'true'`.
   - Verifique a existência de colunas antes de executar `ALTER TABLE`:
     ```javascript
     const [cols] = await conn.query(`SHOW COLUMNS FROM tabela LIKE 'nova_coluna'`);
     if (cols.length === 0) {
       await conn.query(`ALTER TABLE tabela ADD COLUMN nova_coluna VARCHAR(255) NULL`);
     }
     ```
2. **Atualização do DDL Mestre (`src/database/schema.sql`):**
   - Atualize a definição da tabela em `schema.sql` para refletir as novas colunas e chaves estrangeiras.
3. **Novas Permissões (`src/database/seed.js`):**
   - Adicione novas chaves no array `PERMISSOES` (ex.: `{ chave: 'modulo.visualizar', nome: 'Visualizar Módulo' }`).
   - Associe a permissão aos perfis competentes no objeto `PERFIL_PERMISSOES` (`ADMIN`, `GESTOR`, etc.).
4. **Atualizar o Script de Migração do `package.json`:**
   - Adicione o novo arquivo ao script `"migrate"` para que `npm run migrate` execute todas as etapas.

---

### Skill 4: Fluxo de Autenticação, Usuários e Aprovação de Contas

#### Objetivo
Garantir o ciclo de vida completo de acesso e segurança dos usuários.

#### Procedimento Passo a Passo
1. **Solicitação de Cadastro:**
   - O usuário preenche nome, e-mail, senha e setor.
   - Endpoint: `POST /api/v1/auth/solicitar-cadastro`.
   - O usuário é criado com `perfil = 'OPERADOR'` e `status = 'PENDENTE'`.
2. **Bloqueio de Contas Não Aprovadas:**
   - Em `src/routes/auth.js` (`POST /login`), qualquer tentativa com conta `PENDENTE` recebe HTTP 403:
     `"Sua solicitação de cadastro está pendente de aprovação por um administrador."`
   - Contas `INATIVO` ou `BLOQUEADO` recebem HTTP 401.
3. **Aprovação pelo Administrador:**
   - No módulo **Auditoria & Governança** (`assets/js/modules/auditoria.js`), a aba **Solicitações de Cadastro** lista todos com status `PENDENTE`.
   - O Admin clica em **Aprovar**, escolhe o Perfil (`GESTOR`, `OPERADOR`, etc.) e o Setor.
   - Endpoint: `PATCH /api/v1/auditoria/usuarios-pendentes/:id/aprovar`.
   - O status é alterado para `ATIVO` e uma auditoria de `APROVAR_CADASTRO` é registrada.
4. **Gestão de Usuários e Troca de Cargos pelo Administrador:**
   - No módulo **Auditoria & Governança**, a aba **Todos os Usuários & Histórico** permite:
     * **Cadastro Direto:** O Admin pode cadastrar colaboradores com senha provisória e ativação imediata (`POST /api/v1/usuarios`).
     * **Editar e Trocar de Cargo:** Modal completo para alterar nome, e-mail, perfil/cargo (`ADMIN`, `GESTOR`, `OPERADOR`, `ADMINISTRACAO`, `LIMPEZA`), setor de lotação, status e redefinição opcional de senha (`PUT /api/v1/usuarios/:id`).
     * **Alternar Status (Ativo / Inativo):** Ações rápidas na tabela para pausar ou reativar o acesso de colaboradores com confirmação via `window.UI.confirmModal` (`PATCH /api/v1/usuarios/:id/status`).
     * **Excluir Usuário (Soft Delete):** Remoção lógica segura com confirmação via `window.UI.confirmModal` (`DELETE /api/v1/usuarios/:id`), preservando os registros e histórico de auditoria intactos.
     * **Proteção de Autoexclusão:** O administrador logado fica impedido de alterar seu próprio status ou excluir sua própria conta.
5. **Heartbeat em Tempo Real:**
   - O frontend dispara a cada 60s `POST /api/v1/auth/heartbeat`.
   - O banco atualiza `ultimo_heartbeat = NOW()`.
   - O Admin monitora em tempo real na aba **Usuários Online** (considerados ativos nos últimos 5 minutos).
6. **Notificações, Comunicados e Isolamento de Estado por Perfil:**
   - NUNCA utilize chaves globais estáticas no `localStorage` para leitura de notificações ou avisos (ex.: `hub_notificacoes_lidas_timestamp`).
   - Utilize sempre `window.Auth.getUserStorageKey(prefix)` para gerar chaves isoladas no padrão `${prefix}_${perfil}_${id}`.
   - Quando um perfil abre as notificações, a marcação de leitura é salva estritamente para aquele usuário/perfil. Ao alternar para outro usuário, o novo colaborador visualiza todas as notificações pendentes dele.
   - Notificações e avisos urgentes só são processados para perfis autorizados (`comunicados.visualizar` ou `isAdmin()`).
   - Múltiplos comunicados de alta prioridade são exibidos conjuntamente via `window.UI.visualizarComunicadosAlta()`, removendo o banner apenas para o perfil que interagiu.
7. **Modo Visitante Público (Acesso Livre sem Cadastro):**
   - **Identificação Unificada:** `window.Auth.isVisitante()` reconhece qualquer usuário que acesse a aplicação sem login (`!this.estaLogado()`). O cadastro de usuários com perfil `VISITANTE` foi formalmente dispensado no sistema, visto que visitantes não possuem permissões restritas e já acessam a plataforma livremente sem precisar de conta.
   - **Rotas Permitidas:** Apenas **Central de Comunicação** (`#comunicacao`) e **Agenda Inteligente** (`#agenda`).
   - **Bloqueio no Roteador:** O roteador `AppRouter` executa `this.atualizarVisibilidadeRotas()` na inicialização (`init()`) e em cada transição. No início de `handleRoute()`, qualquer tentativa de acessar outra rota dispara um aviso de acesso restrito e redireciona imediatamente para `#comunicacao`.
   - **Ocultação de Menus:** Links para os outros 9 módulos e grupos vazios da navegação recebem a classe `.hidden`.
   - **Consumo de APIs:** Visitantes consomem exclusivamente as rotas públicas (`/api/v1/publico/comunicados` e `/api/v1/publico/eventos`) sem token.
   - **Prevenção de Loop 401:** Se o visitante receber resposta HTTP 401, o `api.js` não executa `forcarLogout()`.
   - **Acesso à Autenticação:** A topbar exibe o botão **"Fazer Login"** para colaboradores que desejam se autenticar, e o modal de login conta com a opção **"Continuar como Visitante"**.
8. **Isolamento de Sessão por Aba (`sessionStorage`) e Cache de Autenticação:**
   - **Multi-Aba com F5:** O token JWT e os dados do usuário são recuperados prioritariamente de `sessionStorage` (com fallback para `localStorage`), gravados simultaneamente no login. Isso garante que testes ou operações com múltiplas abas abertas no mesmo navegador mantenham contas diferentes isoladas sem sobrescrita ao atualizar a tela com F5.
   - **Invalidação de Cache de Auth:** O middleware `auth.js` armazena o usuário autenticado em `_userAuthCache` por 30s. Ao alterar o perfil, status ou permissões de um usuário em rotas administrativas, invoque `clearUserAuthCache(userId)` para invalidar imediatamente o cache em memória.

---

### Skill 5: Trilha de Auditoria e Governança Contínua

#### Objetivo
Rastrear ações no sistema para conformidade, segurança e controle de acessos da gestão pública.

#### Procedimento Passo a Passo
1. **Chamada Padrão de Auditoria:**
   - Invoque `registrarAuditoria()` com os campos:
     * `usuario_id`: ID do usuário logado (ou `null` para tentativas anônimas).
     * `acao`: String em caixa alta (ex.: `LOGIN`, `LOGOUT`, `CRIAR_DOCUMENTO`, `ATUALIZAR_STATUS`, `APROVAR_COMPRA`).
     * `entidade`: Nome da tabela afetada (ex.: `'usuarios'`, `'ocorrencias'`, `'compras'`).
     * `entidade_id`: Chave primária do registro impactado.
     * `descricao`: Resumo compreensível do evento.
     * `ip`: Obtido com `getClientIp(req)`.
     * `user_agent`: Cabeçalho `req.headers['user-agent']`.
2. **Visualização de Auditoria:**
   - Apenas usuários com `isAdmin() === true` podem acessar a rota `/api/v1/auditoria` e o módulo correspondente.
   - Os logs suportam paginação e filtro por tipo de ação, período e usuário.

---

### Skill 6: Uploads e Captura de Fotos (Webcam & Arquivos Anexos)

#### Objetivo
Manipular envio de arquivos binários e fotos ao vivo via navegador com segurança e persistência local.

#### Procedimento Passo a Passo
1. **Configuração de Multer:**
   ```javascript
   const storage = multer.diskStorage({
     destination: (req, file, cb) => cb(null, UPLOAD_DIR),
     filename: (req, file, cb) => {
       const ext = path.extname(file.originalname).toLowerCase();
       cb(null, `${file.fieldname}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
     }
   });
   const upload = multer({
     storage,
     limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
     fileFilter: (req, file, cb) => {
       // Validar MIME types permitidos e proibir executáveis (.exe, .bat, .sh)
       cb(null, true);
     }
   });
   ```
2. **Captura via Webcam do Navegador (Base64):**
   - O frontend obtém o frame via `canvas.toDataURL('image/jpeg', 0.85)`.
   - Envia no JSON ou FormData como string base64.
   - O backend decodifica via buffer:
     ```javascript
     function salvarBase64Foto(base64String) {
       const match = base64String.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
       if (!match) return null;
       const filename = `foto_cam_${Date.now()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
       fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(match[2], 'base64'));
       return `/uploads/ocorrencias/${filename}`;
     }
     ```
3. **Consumo no Frontend:**
   - Quando usar `FormData`, passe o objeto diretamente para `window.API.request(...)`. Não defina o header `Content-Type` manualmente (o browser preenche com o boundary correto).

---

### Skill 7: Design System, Modo Escuro e Componentes de UI

#### Objetivo
Construir interfaces elegantes, coesas e consistentes com os tokens oficiais do HUB ES+.

#### Procedimento Passo a Passo
1. **Cores e Tokens Oficiais (Tailwind):**
   - Cores primárias: `bg-hub-navy`, `bg-hub-dark`, `bg-hub-blue`, `text-hub-cyan`.
   - Cores de estado: `bg-emerald-500` (sucesso), `bg-rose-500` (erro/alerta), `bg-amber-500` (pendente/atenção).
   - Sombras: `shadow-hub-sm`, `shadow-hub-md`, `shadow-hub-lg`.
2. **Suporte a Tema Escuro:**
   - Adicione sempre classes para ambos os temas em elementos chave:
     * Fundo de cards: `bg-white dark:bg-slate-800`
     * Bordas: `border-slate-200 dark:border-slate-700`
     * Texto principal: `text-slate-900 dark:text-white`
     * Texto secundário: `text-slate-500 dark:text-slate-400`
3. **Utilização da Camada de UI (`window.UI`):**
   - Notificação Toast:
     ```javascript
     window.UI.toast({
       title: 'Sucesso',
       message: 'Registro salvo com êxito.',
       type: 'success' // 'success' | 'error' | 'warning' | 'info'
     });
     ```
   - Modal de Confirmação:
     ```javascript
     window.UI.confirmModal({
       title: 'Excluir Item',
       message: 'Tem certeza que deseja remover este registro? Esta ação é irreversível.',
       confirmText: 'Sim, Excluir',
       isDanger: true,
       onConfirm: async () => {
         await window.API.excluirItem(id);
         this.render(container);
       }
     });
     ```
   - Badges com Suporte a Higiene (`window.UI.renderBadge`):
     Suporta nativamente `'limpo'` (verde esmeralda) e `'nao_limpo'` (vermelho rose), além dos status convencionais (`'pendente'`, `'em_execucao'`, `'concluido'`).
   - Modal Coletivo de Alta Prioridade:
     `window.UI.visualizarComunicadosAlta(lista)` exibe todos os comunicados urgentes ativos em cartões individuais completos, persistindo o estado de leitura isolado por usuário/perfil e fechando o banner com transição suave.

---

### Skill 8: Diagnóstico, Teste e Validação da Aplicação

#### Objetivo
Executar checagens de integridade antes e depois de alterações no código.

#### Procedimento Passo a Passo
1. **Verificação do Health Check da API:**
   - Endpoint: `GET /api/health`
   - Retorno esperado: `{ status: "ok", database: "connected", timestamp: "..." }`
2. **Tratamento de Timeout de Conexão com TiDB Cloud:**
   - Se o console emitir `[DATABASE ERROR] ETIMEDOUT`, lembre que o TiDB Cloud exige autorização do IP público na lista de acesso (Traffic Filter / IP Access List). A aplicação não deve cair em crash; ela inicia e responde degradada até o IP ser liberado.
3. **Execução Local:**
   - Inicie o servidor via terminal: `npm run dev` ou `node server.js`.
   - Teste a rota principal no navegador: `http://localhost:3001/`.

---

### Skill 9: Fluxo de Advertências Disciplinares e Homologação pelo Administrador Geral

#### Objetivo
Garantir o fluxo disciplinar institucional correto onde qualquer advertência registrada entra na fila institucional e cabe com exclusividade ao **Administrador Geral** (`ADMIN`) analisar, homologar e **aceitar** (ou rejeitar) formalmente a medida.

#### Procedimento Passo a Passo
1. **Registro / Solicitação:**
   - Administradores (`ADMINISTRADOR`) e Gestores (`GESTOR`) registram a ocorrência com colaborador, gravidade, data do fato, motivo e descrição circunstanciada dos fatos.
   - O status inicial padrão é sempre `PENDENTE`.
2. **Fila de Aceite e Homologação:**
   - O Administrador Geral (`ADMIN` / `ADMIN_GERAL`) possui visualização destacada da Fila de Aceite com banner de ação prioritária e botões diretos de **"Aceitar"** e **"Rejeitar"**.
   - No modal de detalhes, o Administrador Geral pode ler o relato completo dos fatos e registrar seu parecer formal de aceite ou rejeição.
3. **Auditoria e Efeitos:**
   - Ao aceitar, o status é atualizado para `APLICADA`, registrando `homologador_id`, `motivo_decisao` e `data_decisao`, com log de auditoria `ACEITAR_ADVERTENCIA`.
   - Apenas o Administrador Geral tem competência para revogar advertências vigentes (`REVOGAR_ADVERTENCIA`).

---

### Skill 10: Gestão de Hierarquia Setorial, Permissões Granulares e Suporte N1/N2/N3

#### Objetivo
Operar e evoluir os fluxos de governança hierárquica (`ADMIN`, `ADMINISTRADOR`, `GESTOR_RH`, `GESTOR_INFRA`, `GESTOR_OPERADOR`, `GESTOR`, `TECNICO_N3`, `TECNICO_N2`, `TECNICO_N1`, `ANALISTA_RH`, `RH`), conceder permissões avulsas por usuário (`usuario_permissoes`), gerenciar o escalonamento em 3 níveis de suporte técnico com parecer obrigatório e gerar documentação oficial em PDF.

#### Procedimento Passo a Passo
1. **Atribuição de Permissões Granulares no Cadastro e Edição:**
   - O backend expõe o catálogo de permissões ativas em `GET /api/v1/usuarios/permissoes-disponiveis`.
   - Nos formulários e modais de criação/edição (`assets/js/modules/usuarios.js` e `assets/js/modules/auditoria.js`), as permissões adicionais são enviadas no array `permissoes_adicionais: ['documentos.visualizar', 'documentos.enviar']`.
   - Ao salvar, o backend insere os registros na tabela `usuario_permissoes` e invoca `clearUserPermCache(userId)` para invalidar a memória imediatamente.
2. **Validação de Governança Estrita:**
   - Apenas usuários com `req.usuario.perfil === 'ADMIN'` podem cadastrar ou editar contas cujo perfil seja `ADMIN`.
   - Tentativas por outros perfis retornam HTTP 403 com `Apenas Administradores Gerais podem gerenciar contas do perfil ADMIN`.
3. **Fluxo de Ocorrências Técnicas e Escalonamento:**
   - **Assumir Chamado:** Técnicos autorizados executam `PATCH /api/v1/ocorrencias/:id/assumir`. O backend grava `tecnico_id = req.usuario.id`, `status = 'EM_ANDAMENTO'` e gera log de auditoria.
   - **Escalonar Chamado:** Quando um chamado requer nível superior (`N1 -> N2` ou `N2 -> N3`), executa-se `PATCH /api/v1/ocorrencias/:id/escalonar` enviando `{ nivel_atendimento: 'N2', parecer_tecnico: 'Diagnóstico...' }`. O parecer é obrigatório e fica registrado no histórico do chamado.
   - **Vínculo com Equipamento:** Toda ocorrência pode referenciar `equipamento_id`, integrando o histórico de manutenções corretivas no módulo Patrimônio.
4. **Geração do Manual Oficial em PDF:**
   - Para gerar ou atualizar o manual oficial impresso, execute no terminal:
     ```bash
     npm run gerar-manual
     ```
   - O script `scripts/gerar-pdf-manual-hierarquia.js` gera o arquivo `MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf` na raiz do projeto com layout profissional, tipografia corporativa e paleta de cores oficial do HUB ES+.
---

### Skill 11: Testes de Coesão, Fluxos entre Cargos e Login Rápido por Perfil

#### Objetivo
Padronizar a rotina de auditoria e validação de fluxos ponta a ponta (E2E) entre os 15 perfis do sistema HUB ES+, garantindo coesão entre permissões de backend, permissões de frontend, disponibilidade de endpoints auxiliares e integridade visual dos módulos para cada cargo, prevenindo regressões, erros 403 indevidos e botões inacessíveis.

#### Estrutura das Contas de Teste por Cargo
Todas as contas de teste possuem a senha padrão `Teste@123` e são auto-provisionadas dinamicamente no banco ou seed:
- `ADMIN`: `admin.geral@hubes.gov.br` (Acesso irrestrito a governança e homologações)
- `ADMINISTRADOR`: `admin@hubes.gov.br` (Gestão institucional ampla)
- `ADMINISTRACAO`: `administracao@hubes.gov.br` (Rotinas administrativas)
- `GESTOR`: `gestor@hubes.gov.br` (Supervisão operacional e aprovações)
- `GESTOR_RH`: `gestor.rh@hubes.gov.br` (Liderança de Recursos Humanos)
- `ANALISTA_RH`: `analista.rh@hubes.gov.br` (Operações avançadas de RH)
- `RH`: `rh@hubes.gov.br` (Rotinas básicas de RH)
- `GESTOR_INFRA`: `gestor.infra@hubes.gov.br` (Coordenação de infraestrutura e TI)
- `TECNICO_N3`: `tecnico.n3@hubes.gov.br` (Suporte de infraestrutura N3)
- `TECNICO_N2`: `tecnico.n2@hubes.gov.br` (Suporte de infraestrutura N2)
- `TECNICO_N1`: `tecnico.n1@hubes.gov.br` (Suporte de infraestrutura N1)
- `TECNICO`: `tecnico@hubes.gov.br` (Técnico de campo / TI)
- `GESTOR_OPERADOR`: `gestor.operador@hubes.gov.br` (Coordenação operacional)
- `OPERADOR`: `operador@hubes.gov.br` (Operador de base - sem acesso a compras)
- `LIMPEZA`: `limpeza@hubes.gov.br` (Execução de check-lists e manutenções)

#### Procedimento Passo a Passo
1. **Utilização do Seletor de Login Rápido (Interface):**
   - Na tela de login (`#login`), utilize o componente seletor no card lateral de testes.
   - Selecione o cargo desejado no dropdown e clique em **"Testar Cargo"**.
   - O sistema preenche as credenciais automaticamente e autentica o perfil com isolamento de sessão (`sessionStorage`).
2. **Auto-Provisionamento e Tolerância a Falhas:**
   - Em caso de base de dados recém-iniciada ou resets de banco, o endpoint `POST /api/v1/auth/login` e a rotina `initSchemaExtensions` em `src/config/database.js` recriam automaticamente a conta de teste requisitada caso ela ainda não exista, evitando erros de teste offline.
3. **Validação da Tríplice Camada de Permissões (RBAC):**
   - Sempre que uma nova permissão ou cargo for introduzido, valide a sincronização simultânea nos 3 pontos de controle:
     1. `src/middleware/permissions.js` (`ALL_SYSTEM_PERMISSIONS` e `FIXED_PROFILE_PERMISSIONS`)
     2. `src/database/seed.js` (`PERMISSOES` e `PERFIL_PERMISSOES`)
     3. `assets/js/auth.js` (`FALLBACK_ALL_PERMISSIONS` e `FALLBACK_PROFILE_PERMISSIONS`)
4. **Regras de Coesão de Fluxo Obrigatórias:**
   - **Endpoints Auxiliares de Consulta:** Rotas que alimentam `<select>` em formulários (ex: `GET /api/v1/usuarios` e `GET /api/v1/setores`) devem permitir leitura básica (`id, nome`) a qualquer usuário autenticado (`authMiddleware`) para que formulários operacionais não quebrem com HTTP 403.
   - **Ciclo de Vida de Equipamentos em Ocorrências:** Quando uma ocorrência técnica vinculada a um patrimônio for resolvida (`status === 'resolvido'`), o backend deve restaurar o estado operacional do equipamento para `'bom'` automaticamente.
   - **Restrição Estrita de Compras para OPERADOR:** O perfil `OPERADOR` não deve ter permissões `compras.*` concedidas em nenhuma camada e botões de requisição/cotação devem permanecer ocultos.
5. **Execução de Script de Validação Sintática e Coesão:**
   - O repositório conta com rotinas de teste sintático e validação cruzada para garantir que nenhum arquivo JavaScript possua erros de sintaxe ou chamadas de API quebradas.
