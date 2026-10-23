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
7. **Modo Visitante e Perfil VISITANTE (Bloqueio Rígido e Acesso Público):**
   - **Identificação Unificada:** `window.Auth.isVisitante()` reconhece tanto usuários anônimos sem login (`!this.estaLogado()`) quanto colaboradores autenticados cujo perfil seja `VISITANTE`.
   - **Rotas Permitidas:** Apenas **Central de Comunicação** (`#comunicacao`) e **Agenda Inteligente** (`#agenda`).
   - **Bloqueio no Roteador:** O roteador `AppRouter` executa `this.atualizarVisibilidadeRotas()` na inicialização (`init()`) e em cada transição. No início de `handleRoute()`, qualquer tentativa de acessar outra rota dispara um aviso de acesso restrito e redireciona imediatamente para `#comunicacao`.
   - **Ocultação de Menus:** Links para os outros 9 módulos e grupos vazios da navegação recebem a classe `.hidden`.
   - **Consumo de APIs:** Visitantes consomem exclusivamente as rotas públicas (`/api/v1/publico/comunicados` e `/api/v1/publico/eventos`) sem token.
   - **Prevenção de Loop 401:** Se o visitante receber resposta HTTP 401, o `api.js` não executa `forcarLogout()`.
   - **Acesso à Autenticação:** A topbar exibe o botão **"Fazer Login"** para quem desejar se autenticar, e o modal de login conta com a opção **"Continuar como Visitante"**.

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
