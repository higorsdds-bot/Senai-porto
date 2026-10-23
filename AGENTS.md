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
- [ ] Rotas públicas abertas a visitantes ficam em `/api/v1/publico/` e o modo visitante preserva navegação em comunicados e agenda sem forçar a tela de login.
- [ ] O layout suporta tema Claro e tema Escuro (`dark:`).
