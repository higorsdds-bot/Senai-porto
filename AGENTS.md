# Instruções Mandatórias para Agentes de IA (AGENTS.md)

> **ATENÇÃO:** Qualquer IA ou Agente autônomo que iniciar uma sessão neste repositório **DEVE LER ESTE ARQUIVO E OS DOCUMENTOS REFERENCIADOS ANTES DE QUALQUER AÇÃO OU ESCRITA DE CÓDIGO.**

---

## 1. Documentos Obrigatórios de Contexto

Antes de planejar ou executar qualquer tarefa, consulte os dois arquivos centrais do projeto:

1. **[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md):** Contém a visão geral do projeto HUB ES+ / SECULT, arquitetura da aplicação, convenções de backend (Node/Express/CommonJS/MySQL2/TiDB Cloud), convenções de frontend (Vanilla JS SPA modular/Tailwind/Lucide), modelo RBAC de permissões e padrão de rotas.
2. **[`SKILLS.md`](./SKILLS.md):** Contém os Procedimentos Operacionais Padronizados (SOPs) para tudo que já foi construído (criação de módulos SPA, rotas Express com auditoria e permissões, migrações incrementais no TiDB, uploads de arquivos e fotos de webcam, toasts e modais).

---

## 2. A Regra de Ouro: O Padrão NÃO Deve Mudar

O usuário e a equipe definiram regras inegociáveis de preservação arquitetural:

- ❌ **NÃO adicione frameworks no frontend** (React, Vue, Svelte, Angular, Next.js, Vite). O frontend é Vanilla JavaScript modular puro em `assets/js/modules/*.js`.
- ❌ **NÃO migre o backend para TypeScript ou NestJS**. Mantenha Express com CommonJS (`require` / `module.exports`).
- ❌ **NÃO instale ORMs pesados** (Prisma, TypeORM, Sequelize). As queries são executadas diretamente via pool do `mysql2/promise` compatível com TiDB Cloud (MySQL 8.0).
- ❌ **NÃO execute `DELETE` físico no banco**. Todas as tabelas operam com soft delete (`deleted_at IS NULL` e `UPDATE tabela SET deleted_at = NOW()`).
- ❌ **NÃO deixe ações de escrita sem auditoria**. Sempre invoque `registrarAuditoria(...)` em operações de criação, edição, deleção e autenticação.
- ❌ **NÃO use `fetch()` solto nos módulos do frontend**. Toda requisição deve ser intermediada por `window.API` em `assets/js/api.js`.
- ❌ **NÃO use `alert()` ou `confirm()` nativos**. Utilize a camada de interface `window.UI.toast(...)` e `window.UI.confirmModal(...)`.
- ❌ **NÃO use chaves globais cegas no `localStorage` para leitura/notificações**. Utilize sempre `window.Auth.getUserStorageKey(prefix)` para que estados de leitura e avisos sejam estritamente isolados por usuário e perfil (`${prefix}_${perfil}_${id}`).
- ❌ **NÃO permita acesso de visitantes a módulos restritos nem cadastre contas como visitante**. Visitantes acessam livremente apenas `#comunicacao` e `#agenda` em modo público sem login (`!estaLogado()`). O cadastro de usuários com o perfil `VISITANTE` foi formalmente dispensado. O roteador SPA em `handleRoute()` deve aplicar bloqueio rígido e redirecionamento, e todos os demais links de navegação devem permanecer ocultos.
- ❌ **NÃO dependa exclusivamente de `localStorage` para tokens e sessões**. Utilize `sessionStorage` com fallback para `localStorage` para garantir que abas simultâneas mantenham suas contas isoladas sem que um F5 sobrescreva a sessão ativa com outro login.
- ❌ **NÃO deixe ações em modais ou formulários sem `try/catch` defensivo**. Falhas secundárias ou lentidão de rede nunca devem travar a interface, congelar spinners ou deixar botões desabilitados indefinidamente.

---

## 3. Checklist Rápido de Pré-Execução

Sempre que implementar uma nova funcionalidade ou corrigir um bug, certifique-se de que:
- [ ] O módulo frontend segue a estrutura `window.<Nome>Module = { async render(container) { ... } }`.
- [ ] O roteador em `assets/js/app.js` e o `index.html` estão devidamente atualizados.
- [ ] A rota no backend possui `authMiddleware` e `requirePermission(...)`.
- [ ] As respostas da API seguem o envelope `{ success: true, data }` ou `{ success: false, message }`.
- [ ] As novas colunas ou tabelas foram criadas com script incremental em `src/database/` e documentadas em `src/database/schema.sql`.
- [ ] Novas permissões foram adicionadas no `src/database/seed.js` e vinculadas aos perfis correspondentes.
- [ ] As notificações e avisos verificam as permissões do perfil ativo e mantêm isolamento de leitura por perfil.
- [ ] O modo visitante opera sem cadastro de contas (`!estaLogado()`), com acesso estritamente restrito a comunicados e agenda, com bloqueio rígido no roteador e ocultação na sidebar.
- [ ] Rotas públicas abertas a visitantes ficam em `/api/v1/publico/` e o modo visitante preserva navegação em comunicados e agenda sem forçar a tela de login.
- [ ] Módulos com múltiplos recursos utilizam `Promise.allSettled` com fallbacks defensivos para evitar bloqueio de tela por sub-recursos.
- [ ] O isolamento de sessão por aba (`sessionStorage` > `localStorage`) é respeitado para garantir a integridade de testes simultâneos multi-conta no F5.
- [ ] Ações que alterem o status, perfil ou permissões de usuários invocam `clearUserAuthCache(userId)` para atualizar imediatamente as permissões em memória.
- [ ] O perfil OPERADOR não possui permissões nem botões de compras expostos no Dashboard ou módulos operacionais.
- [ ] Os 15 cargos possuem paridade exata de permissões entre `FIXED_PROFILE_PERMISSIONS` (backend), `PERFIL_PERMISSOES` (seed) e `FALLBACK_PROFILE_PERMISSIONS` (frontend).
- [ ] As contas de teste dos 15 cargos (`USUARIOS_TESTE_POR_CARGO`) e o seletor de "Login Rápido por Cargo" em `assets/js/auth.js` estão funcionais e sincronizados.
- [ ] Listagens auxiliares básicas (`GET /api/v1/usuarios` e `GET /api/v1/setores`) permanecem acessíveis a qualquer usuário logado para popular dropdowns sem erro 403.
- [ ] A resolução de ocorrência (`status = 'resolvido'`) restaura automaticamente o equipamento vinculado para `estado = 'bom'`.
- [ ] O layout suporta tema Claro e tema Escuro (`dark:`).
