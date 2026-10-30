# HUB ES+ | Manual de Governança, Hierarquia Organizacional e Fluxo de Permissões

> **Documento Oficial de Engenharia e Governança Institucional**  
> **Entidades:** SECULT (Secretaria da Cultura / Governo do Estado do Espírito Santo) • SENAI Porto  
> **Unidade:** Centro de Inovação e Criatividade HUB ES+  
> **Versão do Sistema:** 2.4.0 (Homologada em Produção)  
> **Arquivo PDF Correspondente:** [`MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf`](./MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf)

---

## Sumário
1. [Visão Geral & Objetivos da Nova Arquitetura](#1-visão-geral--objetivos-da-nova-arquitetura)
2. [Árvore Hierárquica e Níveis de Autoridade](#2-árvore-hierárquica-e-níveis-de-autoridade)
3. [Matriz de Módulos e Permissões por Perfil Base](#3-matriz-de-módulos-e-permissões-por-perfil-base)
4. [Mecanismo de Permissões Granulares (Caso Prático do RH)](#4-mecanismo-de-permissões-granulares-caso-prático-do-rh)
5. [Fluxo Profissional de Suporte Técnico (N1, N2, N3)](#5-fluxo-profissional-de-suporte-técnico-n1-n2-n3)
6. [Integração de Ocorrências com Inventário de Equipamentos](#6-integração-de-ocorrências-com-inventário-de-equipamentos)
7. [Diretrizes de Segurança, Auditoria e Governança](#7-diretrizes-de-segurança-auditoria-e-governança)
8. [Scripts e Manutenção](#8-scripts-e-manutenção)
9. [Ambiente de Homologação, Contas de Teste e Login Rápido](#9-ambiente-de-homologação-contas-de-teste-e-login-rápido)

---

## 1. Visão Geral & Objetivos da Nova Arquitetura

O Sistema Integrado de Gestão do **HUB ES+** foi aprimorado para responder às necessidades de governança institucional, segurança de acessos e agilidade operacional.

Historicamente, a utilização de perfis genéricos e estáticos impunha uma limitação: para que um colaborador realizasse uma tarefa fora do seu escopo padrão (por exemplo, um integrante de **Recursos Humanos** que precisa anexar e consultar termos contratuais ou atestados no repositório de Documentos), era necessário promovê-lo a **Administrador**, o que violava as boas práticas de segurança pública (*Princípio do Menor Privilégio*).

A nova arquitetura soluciona esse desafio integrando quatro conceitos:
1. **Supervisão Piramidal Rígida:** O Super Administrador supervisiona o Administrador Institucional e todos os Gestores Setoriais.
2. **Cadeia Setorial de Comando:** Gestores dedicados para **RH**, **Infraestrutura/TI** e **Operações**.
3. **Suporte Técnico Especializado em 3 Níveis:** Helpdesk inicial (**N1**), Manutenção de bancada/redes (**N2**) e Infraestrutura crítica/servidores (**N3**).
4. **Permissões Granulares Adicionais:** Capacidade de conceder acessos específicos a páginas e rotas sem alterar o cargo do colaborador.

---

## 2. Árvore Hierárquica e Níveis de Autoridade

```
                              ┌─────────────────────────────────────────┐
                              │           SUPER ADMINISTRADOR           │
                              │                 (ADMIN)                 │
                              │    Autoridade Máxima & Auditor Geral    │
                              └────────────────────┬────────────────────┘
                                                   │
                              ┌────────────────────▼────────────────────┐
                              │       ADMINISTRADOR INSTITUCIONAL       │
                              │             (ADMINISTRADOR)             │
                              │      Gestão Executiva do HUB ES+        │
                              └────────────────────┬────────────────────┘
                                                   │
         ┌─────────────────────────┬───────────────┴───────────────┬─────────────────────────┐
         ▼                         ▼                               ▼                         ▼
┌─────────────────┐       ┌─────────────────┐             ┌─────────────────┐       ┌─────────────────┐
│    GESTOR_RH    │       │   GESTOR_INFRA  │             │ GESTOR_OPERADOR │       │      GESTOR     │
│ Gestão de RH e  │       │ Comando N1, N2, │             │ Equipe Operador │       │ Gestão Geral de │
│ Acessos RH      │       │ N3 e Patrimônio │             │ e Agenda        │       │ Compras/Aprovs. │
└────────┬────────┘       └────────┬────────┘             └────────┬────────┘       └─────────────────┘
         │                         │                               │
         │           ┌─────────────┼─────────────┐                 │
         ▼           ▼             ▼             ▼                 ▼
 ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
 │ ANALISTA_RH  ││  TECNICO_N3  ││  TECNICO_N2  ││  TECNICO_N1  ││   OPERADOR   │
 │      RH      ││  (Servidores)││  (Hardware)  ││  (Helpdesk)  ││  (Rotinas)   │
 └──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

### Detalhamento dos Cargos

| Nível | Cargo / Perfil | Descrição & Escopo de Autoridade |
|---|---|---|
| **Nível 1** | **ADMIN** (Super Admin) | Autoridade máxima do sistema. Possui bypass total, acesso irrestrito à auditoria de segurança, gerenciamento do pool e controle dos Administradores Institucionais. **Apenas ele pode criar ou editar outros administradores.** |
| **Nível 2** | **ADMINISTRADOR** | Gestão executiva das operações do HUB ES+. Supervisiona os Gestores Setoriais, operadores e técnicos. **Regra de Governança:** Não pode alterar, inativar ou rebaixar contas com perfil `ADMIN`. |
| **Nível 3** | **GESTOR_RH** | Comanda o setor de Recursos Humanos, equipe de RH e admissões, com autonomia para conceder acessos específicos aos seus colaboradores. |
| **Nível 3** | **GESTOR_INFRA** | Comanda a equipe de suporte técnico (**Técnicos N1, N2 e N3**), o parque de equipamentos patrimoniais e a esteira de chamados técnicos. |
| **Nível 3** | **GESTOR_OPERADOR** | Comanda a equipe de operadores, escalas de atendimento, murais de comunicados e reservas da Agenda Cultural. |
| **Nível 3** | **GESTOR** | Gestão operacional transversal e autorização de pedidos de compras. |
| **Nível 4** | **TECNICO_N3** | Suporte avançado: servidores, switches core, no-breaks industriais, bancos de dados e incidentes de alta complexidade. |
| **Nível 4** | **TECNICO_N2** | Suporte intermediário: montagem de hardware, redes locais, manutenção em bancada e testes de equipamentos vinculados. |
| **Nível 4** | **TECNICO_N1** | Helpdesk e triagem: primeiro ponto de contato, atendimento inicial aos operadores e dúvidas de uso de salas/sistemas. |
| **Nível 4** | **ANALISTA_RH / RH** | Rotinas internas de RH, atendimento a colaboradores e gestão de documentos setoriais. |
| **Nível 4** | **ADMINISTRACAO** | Setor administrativo com foco em pré-cadastro de colaboradores, requisição de insumos e abertura de pedidos de compras. |
| **Nível 5** | **OPERADOR** | Linha de frente do HUB ES+: atendimento, abertura de ocorrências e agenda. **Compliance:** Não tem acesso a compras nem ao Dashboard executivo. |
| **Nível 5** | **LIMPEZA** | Equipe de higienização e consumo de insumos de limpeza. |
| **Nível 5** | **VISITANTE** | Modo de acesso público anônimo (sem login) restrito aos murais de comunicados e agenda cultural. Cadastro de conta dispensado. |

---

## 3. Matriz de Módulos e Permissões por Perfil Base

| Perfil / Cargo | Dashboard | Equipamentos | Documentos | Ocorrências | Insumos | Compras | Auditoria |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | Total | Total | Total | Total | Total | Total | Total |
| **ADMINISTRADOR** | Total | Total | Total | Total | Total | Aprovar | Total |
| **GESTOR_RH** | Sim | Consulta | Setorial | Sim | Sim | Criar | Não |
| **GESTOR_INFRA** | Sim | Total | Consulta | Total (N3) | Sim | Criar | Não |
| **GESTOR_OPERADOR** | Sim | Consulta | Consulta | Sim | Sim | Criar | Não |
| **GESTOR** | Sim | Consulta | Consulta | Sim | Sim | Aprovar | Não |
| **TECNICO_N3** | Sim | Total | Consulta | Atender/N3 | Sim | Não | Não |
| **TECNICO_N2** | Sim | Manutenção | Consulta | Atender/N2 | Sim | Não | Não |
| **TECNICO_N1** | Sim | Consulta | Consulta | Atender/N1 | Sim | Não | Não |
| **ANALISTA_RH / RH** | Sim | Consulta | *Via Concessão* | Registrar | Consulta | Não | Não |
| **ADMINISTRACAO** | Sim | Consulta | Consulta | Registrar | Total | Criar | Não |
| **OPERADOR** | Sim | Consulta | Consulta | Registrar | Consulta | Não | Não |
| **LIMPEZA** | Sim | Não | Não | Registrar | Consumo | Não | Não |

---

## 4. Mecanismo de Permissões Granulares (Caso Prático do RH)

### O Desafio
> *"Cada setor já vai ter as páginas determinadas, mas e se eu desejar permitir acesso aos documentos para um colaborador de RH anexar e visualizar?"*

### A Solução Técnica
Criou-se a tabela `usuario_permissoes` no banco de dados e um middleware de resolução dinâmica que mescla:
$$\text{Permissões Efetivas} = \text{Permissões do Cargo Base} \cup \text{Permissões Individuais Concedidas}$$

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     PERFIL BASE (ex: RH)        │       │   USUARIO_PERMISSOES (Extras)   │
│  - comunicados.visualizar       │  ───► │  - documentos.visualizar        │
│  - eventos.visualizar           │       │  - documentos.enviar            │
└─────────────────────────────────┘       └─────────────────────────────────┘
                                  │
                                  ▼
                ┌─────────────────────────────────┐
                │   SESSÃO JWT & AUTORIZAÇÃO      │
                │ O usuário acessa Documentos com │
                │ permissão de upload para o RH   │
                │ sem precisar ser promovido!     │
                └─────────────────────────────────┘
```

### Como Atribuir na Prática
1. Acesse o menu **Auditoria & Governança** ou **Usuários**.
2. No cadastro ou edição de qualquer colaborador, abra a seção **"Permissões Específicas / Acessos Adicionais"**.
3. Marque as caixas de seleção desejadas:
   - `[x] Documentos: Visualizar`
   - `[x] Documentos: Anexar / Enviar`
   - `[ ] Ocorrências: Assumir Chamados`
   - `[ ] Ocorrências: Escalonar N1/N2/N3`
   - `[ ] Insumos: Visualizar Estoque`
   - `[ ] Compras: Solicitar Compras`
4. Clique em **Salvar Alterações**. O cache em memória é limpo instantaneamente (`clearUserPermCache`) e o colaborador já pode navegar na aba de Documentos e anexar arquivos imediatamente.

---

## 5. Fluxo Profissional de Suporte Técnico (N1, N2, N3)

O ciclo de vida de uma ocorrência técnica segue o fluxo:

```
[ Registro de Ocorrência ]
  ├── Localização e Categoria
  ├── Evidência Fotográfica (Câmera ao vivo / Arquivo)
  ├── Documentos / Anexos técnicos
  └── Equipamento Patrimonial Vinculado (Opcional)
         │
         ▼
[ Fila N1 • Helpdesk ] ──► Botão: "Assumir Chamado" (Status: Em Andamento)
         │
         ├── Se simples: Técnico N1 resolve e encerra.
         │
         └── Se exigir intervenção física/redes:
                ▼
      [ Botão: Escalonar Atendimento ]
         ├── Seleção: Nível N2 (Hardware) ou N3 (Servidores/Infra Crítica)
         └── Parecer Técnico Obrigatório: Registro do diagnóstico preliminar
                ▼
      [ Fila N2 ou N3 ] ──► Atendimento especializado até resolução final
```

### Níveis de Atendimento
- **N1 (Helpdesk / Atendimento Básico):** Dúvidas operacionais, triagem, falhas de software de usuário, testes rápidos de periféricos.
- **N2 (Hardware / Redes / Manutenção):** Troca de placas, cabeamento estruturado, fontes, bancada de reparos e testes de carga em equipamentos.
- **N3 (Servidores / Infraestrutura Crítica):** Quedas de link, firewalls, switches core, servidores virtualizados, no-breaks de alta potência e banco de dados.

### Ações Técnicas Disponíveis na Tela
- **Assumir Chamado:** O técnico logado com permissão `ocorrencias.atender` ou perfil técnico assume a responsabilidade direta pelo chamado com um único clique.
- **Escalonar Chamado:** O técnico com permissão `ocorrencias.escalonar` seleciona o novo nível (`N1`, `N2`, `N3`) e fornece o parecer técnico, que fica registrado permanentemente no histórico da ocorrência.

---

## 6. Integração de Ocorrências com Inventário de Equipamentos

O formulário de registro de ocorrências permite vincular diretamente o chamado a um **bem patrimonial cadastrado**:
- Os técnicos conseguem consultar no histórico do equipamento todas as avarias pregressas sofridas pelo aparelho.
- Ao registrar uma falha grave, o status do equipamento pode ser alterado para `EM_MANUTENCAO`.
- Ao concluir a ocorrência, o equipamento retorna para o status `OPERACIONAL`.

---

## 7. Diretrizes de Segurança, Auditoria e Governança

1. **Soft Delete Mandatório:** Nenhuma linha é removida fisicamente das tabelas (`DELETE FROM ...` é proibido). Utiliza-se `deleted_at = NOW()` e consultas com `WHERE deleted_at IS NULL`.
2. **Proteção de Contas Administrativas:**
   - Nenhum usuário pode inativar ou alterar o próprio perfil.
   - Administradores Institucionais (`ADMINISTRADOR`) não têm permissão para rebaixar ou inativar contas com perfil `ADMIN`.
3. **Auditoria Imutável:** Todas as operações de criação, edição, escalonamento e aprovação acionam o helper `registrarAuditoria(...)`, registrando:
   - Identificador do usuário executor
   - Ação realizada (`CRIAR_USUARIO`, `ATUALIZAR_PERMISSOES`, `ESCALONAR_OCORRENCIA`, etc.)
   - Endereço IP e User-Agent
   - Timestamp com precisão de segundos
4. **Isolamento de Sessão por Aba:** A prioridade de leitura do token em `sessionStorage` garante que múltiplas abas abertas no mesmo navegador mantenham suas contas isoladas sem que o recarregamento (F5) sobrescreva sessões de outros perfis.

---

## 8. Scripts e Manutenção

Para regenerar o arquivo PDF oficial do manual institucional a qualquer momento, execute no terminal:

```bash
npm run gerar-manual
```

O arquivo compilado será gerado em:
`MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf`
---

## 9. Ambiente de Homologação, Contas de Teste e Login Rápido

Para acelerar a homologação integrada e garantir que cada perfil hierárquico acesse estritamente os seus módulos sem falhas de permissão ou telas congeladas, o sistema disponibiliza um **Seletor de Login Rápido por Cargo** na tela inicial de login e contas de teste dedicadas para cada uma das 15 funções.

### Contas Pré-configuradas (Senha Padrão: `Teste@123`)

| Cargo / Perfil | E-mail de Teste | Papel Operacional |
|---|---|---|
| `ADMIN` | `admin.geral@hubes.gov.br` | Super Administrador Geral do HUB ES+ |
| `ADMINISTRADOR` | `admin@hubes.gov.br` | Administrador Institucional Executivo |
| `ADMINISTRACAO` | `administracao@hubes.gov.br` | Operador Administrativo e de Compras |
| `GESTOR` | `gestor@hubes.gov.br` | Gestor Geral de Operações e Aprovações |
| `GESTOR_RH` | `gestor.rh@hubes.gov.br` | Liderança de Recursos Humanos |
| `ANALISTA_RH` | `analista.rh@hubes.gov.br` | Analista Sênior de RH |
| `RH` | `rh@hubes.gov.br` | Assistente / Operador de RH |
| `GESTOR_INFRA` | `gestor.infra@hubes.gov.br` | Coordenador de Infraestrutura e TI |
| `TECNICO_N3` | `tecnico.n3@hubes.gov.br` | Suporte Especializado N3 (Sistemas/Redes) |
| `TECNICO_N2` | `tecnico.n2@hubes.gov.br` | Suporte de Bancada N2 (Hardware/Elétrica) |
| `TECNICO_N1` | `tecnico.n1@hubes.gov.br` | Suporte de Triagem e Campo N1 (Helpdesk) |
| `TECNICO` | `tecnico@hubes.gov.br` | Técnico Operacional de Campo |
| `GESTOR_OPERADOR` | `gestor.operador@hubes.gov.br` | Supervisor de Operações do Hub |
| `OPERADOR` | `operador@hubes.gov.br` | Operador de Atendimento (Sem compras) |
| `LIMPEZA` | `limpeza@hubes.gov.br` | Higienização e Check-lists |

### Mecanismos de Tolerância e Auto-Provisionamento
1. **Provisionamento Automático:** Caso a base de dados seja reiniciada ou limpa, a autenticação em `POST /api/v1/auth/login` provisiona instantaneamente a conta de teste selecionada com hash `bcryptjs`, setor padrão e permissões completas sincronizadas.
2. **Sincronização RBAC em Três Níveis:** Todas as regras e permissões estão perfeitamente espelhadas no Middleware (`permissions.js`), no Banco (`seed.js`) e no Frontend (`auth.js`).
3. **Isolamento de Sessão por Aba:** O uso de `sessionStorage` garante que o avaliador possa testar múltiplos perfis em abas distintas simultaneamente sem contaminação de sessão após recarregamentos (F5).
