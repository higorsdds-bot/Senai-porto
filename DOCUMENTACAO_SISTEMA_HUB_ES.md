# HUB ES+ | Plataforma Administrativa Integrada
## Documento de Especificação Técnica, Arquitetura e Casos de Uso

---

**Entidades Responsáveis:**  
Secretaria da Cultura (SECULT) • Governo do Estado do Espírito Santo  
Serviço Nacional de Aprendizagem Industrial (SENAI)  
**Projeto:** Centro de Inovação e Criatividade HUB ES+  
**Versão da Documentação:** 4.0.0 (Compatível com Versão-testeV4)  
**Status do Sistema:** Operacional em Produção (Render + TiDB Cloud + Brevo API)  
**Data de Emissão:** 25 de Outubro de 2026  

---

## Sumário Executivo

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Arquitetura de Software & Tecnologias](#2-arquitetura-de-software--tecnologias)
3. [Como se Conecta: Guia de Integração e Infraestrutura](#3-como-se-conecta-guia-de-integração-e-infraestrutura)
4. [Atores do Sistema & Matriz de Perfis (RBAC)](#4-atores-do-sistema--matriz-de-perfis-rbac)
5. [Módulos Funcionais e Regras de Negócio](#5-módulos-funcionais-e-regras-de-negócio)
6. [Catálogo Formal de Casos de Uso (UML / Engenharia de Software)](#6-catálogo-formal-de-casos-de-uso)
7. [Modelo de Dados & Banco Relacional (TiDB / MySQL)](#7-modelo-de-dados--banco-relacional)
8. [Dicionário de Endpoints da API REST](#8-dicionário-de-endpoints-da-api-rest)
9. [Segurança, Auditoria e Governança](#9-segurança-auditoria-e-governança)

---

## 1. Visão Geral do Projeto

O **HUB ES+** é uma plataforma corporativa web unificada desenvolvida para informatizar, orquestrar e auditar todas as operações do centro de inovação e criatividade **HUB ES+**, situado em Vitória/ES.

O sistema integra em uma única interface responsiva a gestão operacional de 11 setores distintos, eliminando controles manuais em planilhas, reduzindo tempos de resposta a incidentes e garantindo conformidade com as exigências de transparência e auditoria do setor público.

### Objetivos Estratégicos:
- **Centralização Operacional:** Monitoramento unificado de estoque, compras, ocorrências, agendamento de espaços e equipe de higienização.
- **Governança e Transparência Pública:** Rastreabilidade estrita de cada ação realizada (quem, quando, o quê, de qual IP e em qual entidade).
- **Segurança de Acesso Zero-Trust:** Política rígida de permissões granulares (RBAC), aprovação administrativa de novos cadastros e ativação de contas com links de uso único e criptografados (sem tráfego de senhas em texto puro).

---

## 2. Arquitetura de Software & Tecnologias

A solução adota uma arquitetura híbrida de alta performance no padrão **Single Page Application (SPA)** distribuída na borda global via **Cloudflare Pages**, comunicando-se através do **Cloudflare Edge Reverse Proxy** com a **RESTful API** no backend (Node.js Express), apoiada pelo banco relacional **Cloudflare D1** e **TiDB Cloud**.

```
┌────────────────────────────────────────────────────────────────────────┐
│               DISTRIBUIÇÃO GLOBAL (Cloudflare Pages CDN)               │
│   Frontend SPA Vanilla JS Modular • Tailwind CSS • Lucide • Chart.js   │
│                 URL: https://hub-es-secult.pages.dev                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Edge Reverse Proxy (/api/* e /uploads/*)
                                    │ Regras _redirects (Status 200) • WAF • DDoS
┌───────────────────────────────────▼────────────────────────────────────┐
│                        BACKEND (Serviço Node.js)                       │
│                 Node.js 18+ LTS • Express.js 5.x REST API              │
│       Middlewares: CORS • JWT Auth • RBAC Permissions • Auditoria      │
└───┬───────────────────────────────┬────────────────────────────────┬───┘
    │ Suporte Multi-Engine          │ Chamadas REST HTTPS            │ Gravação em Disco
    │ D1 SQL / MySQL2 TLS           │ Porta 443 / JSON               │ Multipart Form
┌───▼──────────────────────┐   ┌────▼─────────────────────┐    ┌─────▼──────────────┐
│  Cloudflare D1 / TiDB    │   │     Brevo API (v3)       │    │ Diretório uploads/ │
│  Banco Relacional Edge   │   │  E-mails Transacionais   │    │ Fotos e Evidências │
│  D1 ID: 3a5a576c...      │   │   Links de Ativação      │    │  de Ocorrências    │
└──────────────────────────┘   └──────────────────────────┘    └────────────────────┘
```

### 2.1. Backend
- **Ambiente:** Node.js (CommonJS: `require` / `module.exports`).
- **Framework Web:** Express.js 5.x.
- **Camada de Dados:** `mysql2/promise` com pool de conexões escalado para alta concorrência (40 conexões, `maxIdle: 20`, keep-alive ativo) e consultas parametrizadas contra injeção SQL (`?`).
- **Autenticação:** JSON Web Token (`jsonwebtoken`) com expiração de 8 horas, renovação via heartbeat e cache em memória (TTL 30s) para validação ultra-rápida sem saturação do banco de dados.
- **Criptografia:** `bcryptjs` (custo computacional salt 12) e `crypto` (tokens de entropia alta SHA-256).
- **Tratamento de Arquivos:** `multer` com limitação de tipos MIME e tamanho máximo de 20MB a 25MB.

### 2.2. Frontend
- **Arquitetura:** Single Page Application (SPA) em **Vanilla JavaScript puro** (sem React, Vue ou Angular, garantindo máxima performance, leveza e independência de dependências externas).
- **Gerenciamento de Sessão:** Isolamento por aba com prioridade em `sessionStorage` (fallback em `localStorage`), viabilizando a operação de múltiplas contas e perfis simultaneamente no mesmo navegador sem sobrescrita de sessão ao recarregar a página com F5.
- **Resiliência a Concorrência:** Carregamento assíncrono defensivo com `Promise.allSettled` e fallbacks seguros para que a indisponibilidade de sub-recursos nunca trave os módulos principais.
- **Roteador:** Roteamento por hash (`window.location.hash`), capturando alterações via evento `hashchange` no arquivo `assets/js/app.js`.
- **Estilização:** Tailwind CSS (utilitários de design atômico) e folhas complementares (`assets/css/style.css` e `assets/css/tema-escuro.css`).
- **Tema:** Alternância em tempo real entre modo Claro e modo Escuro com persistência local em `localStorage`.
- **Renderização de Métricas:** Chart.js para dashboards gráficos interativos.
- **Ícones:** Lucide Icons com injeção automática no ciclo de vida dos módulos.

---

## 3. Como se Conecta: Guia de Integração e Infraestrutura

A aplicação foi projetada para execução em nuvem moderna (PaaS/DBaaS) com suporte a ambientes de desenvolvimento local.

### 3.1. Variáveis de Ambiente (`.env`)

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `PORT` | Porta de escuta da aplicação Express | `3000` ou fornecida pelo Render |
| `NODE_ENV` | Modo de execução do ambiente | `production` ou `development` |
| `APP_URL` | URL canônica pública do frontend | `https://senai-porto.onrender.com` |
| `DB_HOST` | Host do banco de dados TiDB Cloud | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | Porta de conexão do banco | `4000` |
| `DB_USER` | Usuário de autenticação do TiDB | `xxxxxxxx.root` |
| `DB_PASS` | Senha da instância do banco | `****************` |
| `DB_NAME` | Nome do banco de dados lógico | `hub_es_gestao` |
| `DB_SSL` | Habilitação de túnel SSL/TLS | `true` (Obrigatório no TiDB Cloud) |
| `JWT_SECRET` | Chave criptográfica para assinar tokens | `chave-secreta-de-alta-entropia-32bytes` |
| `BREVO_API_KEY` | Chave de API v3 da Brevo para HTTPS | `xkeysib-xxxxxxxxxxxxxxxxxxxx` |
| `BREVO_SENDER_EMAIL` | E-mail do remetente validado na Brevo | `higor.sdds@gmail.com` |
| `BREVO_SENDER_NAME` | Nome exibido como remetente | `HUB ES+ | SECULT` |
| `ADMIN_DEFAULT_EMAIL`| E-mail de fallback do Administrador | `higor.sdds@gmail.com` |

### 3.2. Integração com o Banco de Dados (TiDB Cloud)
- A conexão é gerenciada por um pool singleton em `src/config/database.js`.
- O TiDB Cloud exige conexão criptografada via TLS 1.2+. Por isso, o driver `mysql2` é inicializado com:
  ```javascript
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  ```
- **Dimensionamento para Alta Concorrência:**
  - `connectionLimit: 40`: Suporta até 40 conexões simultâneas para atender requisições de múltiplas contas e abas ativas.
  - `maxIdle: 20` e `idleTimeout: 60000`: Mantém conexões prontas sem sobrecarregar a infraestrutura em nuvem.
  - `enableKeepAlive: true` e `keepAliveInitialDelay: 10000`: Dispara pacotes TCP keep-alive preventivos, evitando que firewalls ou o TiDB Cloud encerrem conexões ociosas prematuramente.
- O pool mantém reconexão automática e tratamento graceful de erros transitórios.

### 3.3. Integração com o Serviço de E-mails (Brevo API via HTTPS)
- Em hospedagens gratuitas (como o Render Free Tier), **portas SMTP tradicionais (25, 465 e 587) são bloqueadas** pelo firewall da infraestrutura.
- Para contornar essa restrição com 100% de confiabilidade, o serviço `src/services/email.js` realiza chamadas diretas via **HTTPS (Porta 443)** para a API REST da Brevo:
  - **Endpoint:** `POST https://api.brevo.com/v3/smtp/email`
  - **Header:** `api-key: process.env.BREVO_API_KEY`
  - **Remetente:** Utiliza o endereço validado pelo proprietário (`BREVO_SENDER_EMAIL`).
- **Fallback de Contingência:** O sistema também gera na interface administrativa o link seguro de ativação com botão "Copiar", garantindo continuidade caso o serviço de e-mail do destinatário sofra instabilidades temporárias.

---

## 4. Atores do Sistema & Matriz de Perfis (RBAC) e Hierarquia Setorial

O sistema implementa **Controle de Acesso Baseado em Funções (Role-Based Access Control - RBAC)** com governança hierárquica por níveis de comando e concessão granular complementar:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ADMIN                                             │
│               (Super Administrador Geral • Autoridade Máxima • Bypass Total)            │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          ┌─────────────────────┐                       ┌─────────────────────┐
          │    ADMINISTRADOR    │                       │       GESTOR        │
          │(Gestão Operac. Geral)│                       │(Gestor Multissetor) │
          └──────────┬──────────┘                       └──────────┬──────────┘
                     │                                             │
      ┌──────────────┼──────────────────────────────┐              │
      ▼              ▼                              ▼              │
┌───────────┐  ┌──────────────┐              ┌──────────────┐      │
│ GESTOR_RH │  │ GESTOR_INFRA │              │GESTOR_OPERAD.│      │
└─────┬─────┘  └──────┬───────┘              └──────┬───────┘      │
      │               │                             │              │
      ▼               ├──────────────┬──────────────┤              ▼
┌───────────┐         ▼              ▼              ▼       ┌─────────────┐
│ANALISTA_RH│   ┌───────────┐  ┌───────────┐  ┌───────────┐ │ADMINISTRACAO│
│   e RH    │   │TECNICO_N3 │  │TECNICO_N2 │  │TECNICO_N1 │ └─────────────┘
└───────────┘   └───────────┘  └───────────┘  └───────────┘        │
                                                    │              ▼
                                                    ▼       ┌─────────────┐
                                              ┌───────────┐ │   LIMPEZA   │
                                              │ OPERADOR  │ └─────────────┘
                                              └───────────┘        │
                                                    │              ▼
                                                    ▼       ┌─────────────┐
                                              ┌───────────┐ │  VISITANTE  │
                                              │(Sem Login)│ │(Modo Público)│
                                              └───────────┘ └─────────────┘
```

### 4.1. Descrição dos Atores e Níveis de Autoridade
1. **ADMIN (Super Administrador Geral):** Possui autoridade máxima irrestrita. Supervisiona os Administradores e todos os setores. Visualiza e manipula auditoria em tempo real, aprova ou rejeita novos cadastros, atribui cargos, revoga acessos e define permissões adicionais. **Regra de Governança Estrita:** Apenas usuários com perfil `ADMIN` podem criar, promover ou editar outras contas de perfil `ADMIN`.
2. **ADMINISTRADOR (Administrador de Gestão Geral):** Responsável pela governança operacional dos módulos, aprovações administrativas gerais, relatórios consolidados e supervisão de rotinas cotidianas.
3. **GESTOR_RH (Gestor de Recursos Humanos):** Comanda o setor de Recursos Humanos. Supervisiona analistas de RH (`ANALISTA_RH` / `RH`), emite pareceres em advertências disciplinares, gerencia comunicados internos e relatórios de colaboradores.
4. **GESTOR_INFRA (Gestor de Infraestrutura & Redes):** Comanda o suporte técnico e a infraestrutura física/lógica do HUB ES+. Lidera os técnicos Nível 1, 2 e 3, gerencia o inventário patrimonial de equipamentos e coordena o fluxo de escalonamento técnico.
5. **GESTOR_OPERADOR (Gestor de Linha de Frente):** Comanda os operadores de atendimento e infraestrutura operacional direta, escalas de trabalho, controle de turnos e insumos operacionais.
6. **GESTOR (Gestor Operacional Multissetorial):** Atua na coordenação geral de suprimentos, compras, eventos e limpeza com ampla autonomia operacional.
7. **TECNICO_N3 (Suporte Especialista - Nível 3):** Suporte de infraestrutura crítica, segurança de redes, switches centrais, servidores e casos de alta complexidade.
8. **TECNICO_N2 (Suporte de Bancada / Laboratório - Nível 2):** Diagnóstico eletrônico de hardware, manutenção corretiva de computadores/impressoras 3D, formatação e encaminhamento de laudos.
9. **TECNICO_N1 (Suporte de Campo / Triagem - Nível 1):** Atendimento inicial rápido a chamados de usuários, testes de cabos, conectividade básica e triagem com escalonamento formal para N2/N3.
10. **ANALISTA_RH / RH (Recursos Humanos):** Analistas e assistentes de RH. Gerenciam dados funcionais, ocorrências disciplinares e, quando autorizado via permissão granular, documentos de colaboradores.
11. **OPERADOR (Operador Padrão):** Colaborador de linha de frente. Abre chamados técnicos de ocorrência com fotos, consulta insumos para trabalho diário, agenda salas/laboratórios na Agenda Inteligente e visualiza comunicados. **Restrição de Compras:** Não possui acesso ao módulo de compras (`compras.visualizar` e `compras.criar` revogadas).
12. **ADMINISTRACAO (Setor Administrativo):** Responsável direto pelo almoxarifado, entradas/baixas de insumos, recebimento de compras e pré-cadastro de colaboradores.
13. **LIMPEZA (Equipe de Higienização):** Focado exclusivamente na visualização e execução de checklists de limpeza, registro de higienização de ambientes e solicitações de materiais de limpeza.
14. **VISITANTE (Modo Público / Consulta Aberta):** Modo de acesso livre destinado à comunidade e visitantes do espaço. Consulta livremente eventos da agenda pública e comunicados institucionais sem necessidade de login. Cadastro descontinuado no banco.

### 4.2. Modelo de Permissões Granulares (`usuario_permissoes`)
O sistema combina a herança por perfis nativos (`perfil_permissoes` e `FIXED_PROFILE_PERMISSIONS`) com a concessão granular de permissões adicionais por usuário (`usuario_permissoes`):
- **Isolamento de Base:** Cada setor/perfil acessa exclusivamente suas telas de trabalho estabelecidas por padrão.
- **Concessão Flexível Sob Demanda:** O Administrador Geral pode conceder permissões avulsas de outros módulos a qualquer usuário sem trocar seu cargo.
- **Caso Prático (RH com Acesso a Documentos):** Um colaborador do perfil `GESTOR_RH` ou `RH` pode receber seletivamente as permissões `documentos.visualizar` e `documentos.enviar`. Imediatamente, o roteador SPA libera o módulo `#documentos` e o usuário pode consultar regulamentos, enviar atestados e anexar folhas contratuais sem elevar seu perfil global.
- **Sincronização em Tempo Real:** O middleware invalida o cache (`clearUserPermCache`) instantaneamente, refletindo as novas permissões tanto nas validações de API quanto nos menus e botões da interface.

---

## 5. Módulos Funcionais e Regras de Negócio

### Módulo 1: Autenticação, Cadastro e Ativação Segura
- **Auto-solicitação na Tela de Login:** Qualquer profissional pode submeter nome e e-mail corporativo. O usuário é inserido com status `PENDENTE` e **nenhuma senha é solicitada nesta etapa**.
- **Notificação ao Administrador:** O sistema dispara um e-mail para o Administrador Geral informando que há uma nova solicitação pendente.
- **Aprovação em Auditoria:** O Administrador acessa `#auditoria`, define o perfil (`OPERADOR`, `GESTOR`, etc.) e setor, e clica em "Confirmar e Liberar".
- **Token de Uso Único:** O sistema gera um token criptográfico de alta entropia (32 bytes / 256 bits), salva seu hash SHA-256 no banco com validade de 24 horas, e envia um link exclusivo para o e-mail do usuário (`#ativar-conta?token=...`).
- **Definição Pessoal da Senha:** O usuário abre o link, digita sua própria senha pessoal (mínimo de 8 caracteres) e o status é promovido para `ATIVO`. O token é invalidado imediatamente após o primeiro uso.

### Módulo 2: Dashboard & Indicadores Operacionais
- Consolida contadores dinâmicos de insumos abaixo do estoque mínimo, ocorrências pendentes, eventos agendados para hoje e status da equipe de limpeza.
- Gráficos Chart.js demonstrando consumo de materiais por setor e tempo médio de atendimento (SLA) de ocorrências.
- **Controle Visual de Acesso:** O botão "Nova Solicitação" e o card rápido de Compras são renderizados condicionalmente à permissão `compras.criar`. Para perfis não autorizados (como `OPERADOR`), o botão é removido e o card é desarmado visual e funcionalmente.

### Módulo 3: Gestão Documental & Acesso Setorial Customizado
- Repositório central de arquivos categorizados (Regulamentos, Editais, Modelos de Termos, Atas de Reunião, Documentos de RH e Contratos).
- Suporte a download direto, filtragem por categoria e upload seguro com metadados do remetente.
- **Concessão Granular Setorial:** Permite que setores como Recursos Humanos (`GESTOR_RH`, `ANALISTA_RH` ou `RH`) tenham acesso liberado ao repositório documental via permissões pontuais (`documentos.visualizar` e `documentos.enviar`) sem necessidade de promoção a Administrador Geral.

### Módulo 4: Controle de Insumos & Almoxarifado
- Cadastro de materiais com código interno, unidade de medida, quantidade atual e quantidade mínima de segurança.
- Registro transacional imutável de movimentações: **Entrada** (reposição), **Saída** (consumo setorial) e **Baixa** (descarte/avaria).
- Alertas visuais em vermelho quando o estoque atinge ou fica abaixo do limiar crítico.

### Módulo 5: Compras & Suprimentos
- Ciclo de compras em 4 fases: **Solicitado** $\rightarrow$ **Em Cotação** $\rightarrow$ **Aprovado** $\rightarrow$ **Concluído**.
- Permissões restritas aos perfis `ADMIN`, `GESTOR` e `ADMINISTRACAO` (`OPERADOR` não possui permissão de visualização ou criação de compras).
- Registro de fornecedor, valor estimado, prazo de entrega e anexos de propostas.
- Quando a compra é concluída, o almoxarifado pode integrar a entrada direta no módulo de insumos.

### Módulo 6: Agenda Inteligente & Espaços Físicos
- Gestão de reservas para salas multiuso, laboratório maker, estúdio de gravação, salas de reunião e auditório principal.
- Validação no banco de dados contra conflitos de horário (double-booking) para um mesmo espaço.
- Separação entre eventos públicos (exibidos no portal) e reuniões internas restritas.

### Módulo 7: Ocorrências Técnicas, Suporte N1/N2/N3 & Manutenção
- Abertura de chamados com título, descrição, categoria (Elétrica, Hidráulica, TI, Estrutural), localização exata e prioridade (Baixa, Média, Alta, Urgente).
- **Vínculo Patrimonial de Equipamento:** Seleção direta do equipamento cadastrado no centro (`equipamento_id`), permitindo rastrear o histórico de falhas e manutenções do patrimônio.
- **Recurso de Câmera/Webcam:** Permite ao colaborador capturar a evidência fotográfica da avaria diretamente pelo navegador no smartphone ou notebook, ou anexar foto da galeria.
- **Fluxo de Atendimento em 3 Níveis (N1/N2/N3):**
  * **N1 (Campo/Triagem):** Atendimento inicial, verificação de cabos, periféricos e diagnóstico básico.
  * **N2 (Bancada/Hardware):** Troca de componentes, conserto eletrônico, manutenção de impressoras 3D e notebooks.
  * **N3 (Infraestrutura/Redes):** Servidores, infraestrutura de fibra, balanceamento de rede, switches gerenciáveis e segurança lógica.
- **Assumir Chamado:** Técnicos autorizados assumem a responsabilidade do ticket (`tecnico_id = req.usuario.id`), alterando o status para `EM_ANDAMENTO`.
- **Escalonamento com Parecer Técnico Obrigatório:** Ao transferir o ticket para outro nível, o sistema exige um parecer técnico detalhado (`parecer_tecnico`), que fica gravado no chamado e auditado (`ESCALONAR_OCORRENCIA`).
- Fluxo de status: `ABERTO` $\rightarrow$ `EM_ANDAMENTO` $\rightarrow$ `RESOLVIDO` $\rightarrow$ `CANCELADO`.

### Módulo 8: Central de Comunicação
- Publicação de informativos, avisos de manutenção programada e comunicados urgentes da direção.
- Segmentação por setor ou publicação geral para todo o centro.

### Módulo 9: Controle de Limpeza & Higienização
- Cronograma diário/semanal de setores a serem higienizados (banheiros, salas, áreas comuns, copa).
- Checklist dinâmico com confirmação de realização, horário e operador responsável.

### Módulo 10: Controle Patrimonial de Equipamentos & Integração com Ocorrências
- Cadastro de equipamentos (computadores, projetores, impressoras 3D, câmeras, ferramentas) com número de patrimônio e status (Em Uso, Disponível, Em Manutenção, Baixado).
- **Histórico Integrado de Manutenções:** Equipamentos com ocorrências técnicas vinculadas exibem a rastreabilidade completa das falhas e manutenções realizadas pelas equipes N1, N2 e N3.

### Módulo 11: Auditoria, Monitoramento & Governança (Admin Only)
- **Heartbeat em Tempo Real:** A cada 2 minutos, o frontend envia um sinal assíncrono para o backend atualizando o timestamp de presença do usuário. O painel exibe se o operador está "Online" ou o horário do último acesso.
- **Trilha de Auditoria Geral:** Tabela que armazena todas as inserções, edições e exclusões realizadas no sistema com data/hora, ID do usuário, nome, endereço IP e navegador (User-Agent).
- **Diagnóstico de E-mail:** Interface dedicada para envio de teste em tempo real, validando o provedor e exibindo os IDs de entrega da Brevo API.

---

## 6. Catálogo Formal de Casos de Uso

### Caso de Uso UC01: Solicitação e Ativação Segura de Novo Usuário

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC01** |
| **Nome** | Solicitar Cadastro e Ativar Conta via E-mail |
| **Ator Primário** | Candidato a Colaborador / Usuário Externo |
| **Atores Secundários** | Administrador Geral, Serviço de E-mail Brevo |
| **Pré-condição** | O usuário possui um e-mail corporativo ou pessoal válido e acessa a tela inicial. |
| **Fluxo Principal** | 1. O usuário clica na aba "Solicitar Acesso" na tela de login.<br>2. O usuário informa Nome Completo e E-mail, e submete o formulário.<br>3. O sistema valida que o e-mail não existe no banco e registra o usuário com status `PENDENTE`.<br>4. O sistema gera registro de auditoria e notifica o Administrador por e-mail.<br>5. O Administrador aprova o cadastro no módulo de Auditoria e define perfil e setor.<br>6. O sistema gera um token seguro SHA-256 e envia um e-mail com link exclusivo de uso único.<br>7. O usuário clica no link, é direcionado para a tela de definição de senha e digita sua senha pessoal.<br>8. O sistema calcula o hash bcrypt (salt 12), atualiza o status para `ATIVO` e invalida o token.<br>9. O usuário é redirecionado para a tela de login com sua conta liberada. |
| **Fluxos Alternativos** | **3a. E-mail já cadastrado:** O sistema exibe mensagem de alerta informando que o e-mail já existe e impede a duplicidade.<br>**7a. Link expirado (>24h):** O sistema exibe mensagem de token vencido e orienta o usuário a contatar o administrador para reenvio. |
| **Pós-condição** | Conta criada com status `ATIVO`, senha cifrada com bcrypt e token de ativação inutilizado. |

---

### Caso de Uso UC02: Aprovação Administrativa de Acesso e Governança

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC02** |
| **Nome** | Analisar e Aprovar Solicitação de Cadastro Pendente |
| **Ator Primário** | Administrador Geral (`ADMIN`) |
| **Atores Secundários** | Serviço de E-mail Brevo, Tabela de Auditoria |
| **Pré-condição** | O Administrador está autenticado no sistema e existe pelo menos uma solicitação `PENDENTE`. |
| **Fluxo Principal** | 1. O Administrador acessa a aba "Auditoria & Governança" (`#auditoria`).<br>2. Na aba "Solicitações Pendentes", o Administrador localiza o registro do candidato.<br>3. O Administrador clica em "Analisar / Aprovar".<br>4. O Administrador seleciona o Perfil de Acesso (`OPERADOR`, `GESTOR`, etc.) e o Setor de Lotação.<br>5. O Administrador clica no botão "Confirmar e Liberar".<br>6. O sistema atualiza o usuário para `AGUARDANDO_ATIVACAO`, grava a ação na auditoria e despacha o e-mail com link de uso único via Brevo API.<br>7. O sistema exibe na tela o status do e-mail e disponibiliza o botão "Copiar Link de Ativação" para contingência.<br>8. A lista de solicitações pendentes é atualizada. |
| **Fluxo de Exceção** | **5a. Falha no envio do e-mail:** O sistema aprova o usuário no banco, exibe um aviso amarelo informando o erro do provedor de e-mail e disponibiliza o link de ativação diretamente na tela para cópia imediata. |
| **Pós-condição** | Solicitação processada, privilégios concedidos e ação registrada na auditoria. |

---

### Caso de Uso UC03: Registro de Ocorrência Técnica com Evidência Fotográfica

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC03** |
| **Nome** | Abrir Chamado Técnico de Manutenção com Foto |
| **Ator Primário** | Colaborador Autenticado (qualquer perfil exceto Visitante) |
| **Pré-condição** | Usuário logado e com permissão `ocorrencias.criar`. |
| **Fluxo Principal** | 1. O usuário clica no menu "Ocorrências" (`#ocorrencias`) e clica em "Nova Ocorrência".<br>2. O usuário preenche Título, Categoria, Localização, Prioridade e Descrição do problema.<br>3. O usuário opta por ligar a câmera do dispositivo (webcam) e clica em "Capturar Foto", ou seleciona um arquivo de imagem da galeria.<br>4. O sistema pré-visualiza a foto capturada.<br>5. O usuário clica em "Salvar Ocorrência".<br>6. O frontend envia a requisição multipart para o backend, que salva a foto no disco e registra a ocorrência no banco de dados com status `ABERTO`.<br>7. O chamado passa a ser exibido no painel de manutenções e o dashboard é incrementado. |
| **Pós-condição** | Chamado registrado com identificador numérico, foto indexada e trilha de auditoria criada. |

---

### Caso de Uso UC04: Movimentação de Estoque e Alerta de Insumo Crítico

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC04** |
| **Nome** | Registrar Saída / Baixa de Insumo no Almoxarifado |
| **Ator Primário** | Almoxarife / Colaborador Autorizado (`ADMIN`, `ADMINISTRACAO`) |
| **Pré-condição** | Item cadastrado previamente no catálogo de insumos. |
| **Fluxo Principal** | 1. O usuário acessa o módulo "Insumos" (`#insumos`).<br>2. Localiza o item desejado pelo campo de busca ou código.<br>3. Clica em "Registrar Movimentação".<br>4. Seleciona o tipo `SAIDA` ou `BAIXA`, informa a quantidade, o setor de destino e uma justificativa.<br>5. O sistema subtrai a quantidade do saldo atual em transação no banco.<br>6. Caso a quantidade resultante seja menor ou igual à quantidade mínima definida, o sistema marca o item com bandeira de atenção vermelha.<br>7. A movimentação é registrada com sucesso no histórico histórico imutável. |
| **Fluxo de Exceção** | **5a. Quantidade superior ao saldo:** O sistema impede a operação e retorna o erro "Saldo insuficiente em estoque". |
| **Pós-condição** | Estoque atualizado, histórico de movimentação persistido e alertas de reposição disparados se aplicável. |

---

### Caso de Uso UC05: Agendamento Inteligente de Espaço Físico

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC05** |
| **Nome** | Reservar Sala ou Espaço do HUB ES+ |
| **Ator Primário** | Colaborador Autenticado |
| **Pré-condição** | Espaço físico cadastrado e ativo. |
| **Fluxo Principal** | 1. O usuário acessa o módulo "Agenda" (`#agenda`).<br>2. Clica no botão "Novo Agendamento".<br>3. Seleciona o Espaço Físico (ex: Auditório Principal), Data, Horário de Início e Horário de Término.<br>4. Define o Título do Evento, Responsável, Setor e Número Estimado de Participantes.<br>5. O sistema valida se não há conflito de horário com nenhuma outra reserva para aquele mesmo espaço.<br>6. O agendamento é salvo com sucesso e inserido na visualização de calendário e na lista de compromissos do dia. |
| **Fluxo de Exceção** | **5a. Conflito de Horário:** O sistema bloqueia a reserva e exibe a mensagem: "O espaço selecionado já possui um agendamento conflitante neste intervalo de horário." |
| **Pós-condição** | Reserva consolidada e refletida na agenda geral e no dashboard de ocupação. |

---

### Caso de Uso UC06: Execução de Checklist de Limpeza Setorial

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC06** |
| **Nome** | Registrar Higienização de Ambiente |
| **Ator Primário** | Colaborador da Equipe de Limpeza (`LIMPEZA`, `ADMIN`) |
| **Pré-condição** | Setores e rotinas de limpeza previamente configurados. |
| **Fluxo Principal** | 1. O colaborador acessa o módulo "Limpeza" (`#limpeza`).<br>2. Visualiza a lista de ambientes e suas respectivas periodicidades.<br>3. Clica em "Registrar Limpeza" no ambiente correspondente.<br>4. Marca os itens do checklist atendidos (recolhimento de lixo, higienização de pisos, reposição de sabonete e papel).<br>5. Registra eventuais observações e confirma a execução.<br>6. O sistema atualiza o timestamp da última limpeza, calcula o status do ambiente para "Higienizado" e grava o histórico. |
| **Pós-condição** | Ambiente atualizado com data/hora e identificação do executor; painel operacional atualizado. |

---

### Caso de Uso UC07: Diagnóstico Operacional de Envio de E-mails

| Elemento | Descrição |
| :--- | :--- |
| **Identificador** | **UC07** |
| **Nome** | Executar Teste em Tempo Real do Serviço de E-mails |
| **Ator Primário** | Administrador Geral (`ADMIN`) |
| **Atores Secundários** | API REST Brevo |
| **Pré-condição** | Usuário logado com privilégio de administrador. |
| **Fluxo Principal** | 1. O Administrador acessa `#auditoria`.<br>2. Clica no botão superior "Testar E-mail".<br>3. O sistema abre o modal de diagnóstico pré-preenchido com o e-mail do administrador.<br>4. O Administrador clica em "Disparar E-mail de Teste".<br>5. O backend executa o disparo imediato via HTTPS na rota `/v3/smtp/email` da Brevo.<br>6. A Brevo retorna código HTTP 201 com o `messageId`.<br>7. O sistema exibe um relatório com o ID da mensagem, provedor ativo (`BREVO_API`), remetente utilizado e instruções para conferência de caixa de entrada/spam. |
| **Fluxo de Exceção** | **6a. Erro no provedor (ex: remetente não validado):** O sistema exibe a mensagem de erro detalhada retornada pela Brevo com as orientações para resolução. |
| **Pós-condição** | Registro do disparo gravado no log do servidor e no histórico da Brevo. |

---

## 7. Modelo de Dados & Banco Relacional

O banco de dados utiliza a engine relacional padrão do MySQL 8.0 / TiDB. Todas as tabelas de negócio utilizam convenção de **Soft Delete** via coluna `deleted_at TIMESTAMP NULL` para garantir conformidade legal com regras de auditoria pública.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     SETORES     │       │    USUARIOS     │       │    AUDITORIA    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──┐   │ id (PK)         │◄──┐   │ id (PK)         │
│ nome            │   └───┤ setor_id (FK)   │   └───┤ usuario_id (FK) │
│ sigla           │       │ nome            │       │ acao            │
│ created_at      │       │ email           │       │ entidade        │
│ deleted_at      │       │ senha           │       │ entidade_id     │
└─────────────────┘       │ perfil          │       │ descricao       │
                          │ status          │       │ ip              │
                          │ created_at      │       │ user_agent      │
                          │ ultimo_acesso   │       │ created_at      │
                          │ deleted_at      │       └─────────────────┘
                          └────────┬────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐       ┌──────────────────┐
│   OCORRENCIAS    │      │    INSUMOS       │       │     EVENTOS      │
├──────────────────┤      ├──────────────────┤       ├──────────────────┤
│ id (PK)          │      │ id (PK)          │       │ id (PK)          │
│ usuario_id (FK)  │      │ nome             │       │ usuario_id (FK)  │
│ equipamento_id(FK│      │ categoria        │       │ titulo           │
│ tecnico_id (FK)  │      │ quantidade_atual │       │ espaco_nome      │
│ nivel_atendiment │      │ estoque_minimo   │       │ data_inicio      │
│ titulo           │      │ unidade_medida   │       │ data_fim         │
│ descricao        │      │ deleted_at       │       │ status           │
│ parecer_tecnico  │      └────────┬─────────┘       │ deleted_at       │
│ categoria        │               │                 └──────────────────┘
│ prioridade       │               ▼
│ status           │      ┌──────────────────┐       ┌──────────────────┐
│ foto_url         │      │   MOVIMENTACOES  │       │USUARIO_PERMISSOES│
│ deleted_at       │      ├──────────────────┤       ├──────────────────┤
└──────────────────┘      │ id (PK)          │       │ usuario_id (PK)  │
                          │ insumo_id (FK)   │       │ permissao_id(PK) │
                          │ usuario_id (FK)  │       │ created_at       │
                          │ tipo (E/S/B)     │       └──────────────────┘
                          │ quantidade       │
                          │ motivo           │
                          │ created_at       │
                          └──────────────────┘
```

### 7.1. Principais Tabelas:
- **`usuarios`**: Armazena as contas, hashes bcrypt de senha, vínculos com setores, status (`PENDENTE`, `AGUARDANDO_ATIVACAO`, `ATIVO`, `INATIVO`) e timestamp do heartbeat.
- **`usuario_permissoes`**: Permissões granulares adicionais concedidas pontualmente a colaboradores específicos (ex: liberação de documentos para o RH).
- **`setores`**: Unidades organizacionais do HUB ES+ (Direção, Recursos Humanos, Infraestrutura & Redes, Almoxarifado, TI, Comunicação, Operações, etc.).
- **`tokens_ativacao`**: Armazena os hashes SHA-256 dos links de ativação, validade e flag de utilização (`usado_em`).
- **`auditoria`**: Registra permanentemente todas as operações administrativas, alterações cadastrais e acessos.
- **`ocorrencias`**: Chamados de manutenção com suporte a fotos, nível de atendimento (`N1`, `N2`, `N3`), equipamento vinculado (`equipamento_id`), técnico responsável (`tecnico_id`) e parecer técnico (`parecer_tecnico`).
- **`insumos` & `movimentacoes_insumos`**: Saldo de almoxarifado e kardex eletrônico de movimentações.
- **`compras` & `itens_compra`**: Requisições de suprimentos, cotações e status de pedidos.
- **`eventos`**: Calendário de reservas e utilização de salas e auditório.
- **`limpeza_registros`**: Logs de checklists de higienização de ambientes.
- **`equipamentos`**: Inventário patrimonial de ativos do centro com integração de histórico de ocorrências técnicas.
- **`comunicados`**: Mural eletrônico de avisos e comunicados institucionais.
- **`documentos`**: Repositório indexado de manuais, atas e resoluções.

---

## 8. Dicionário de Endpoints da API REST

Todas as rotas estão montadas sob o prefixo `/api/v1/`.

| Método | Endpoint | Proteção | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público | Autenticação via e-mail e senha. Retorna Token JWT e perfil. |
| `POST` | `/api/v1/auth/solicitar-cadastro` | Público | Auto-solicitação de acesso por novos colaboradores. |
| `GET` | `/api/v1/auth/verificar-token-ativacao` | Público | Validação prévia da legitimidade e validade de um link de ativação. |
| `POST` | `/api/v1/auth/concluir-ativacao` | Público | Definição da senha pessoal do usuário e ativação definitiva da conta. |
| `POST` | `/api/v1/auth/heartbeat` | Autenticado | Sinal de presença assíncrono para status online no monitor de auditoria. |
| `GET` | `/api/v1/dashboard/metricas` | Autenticado | Retorna totais consolidados de insumos, ocorrências, agenda e alertas. |
| `GET` | `/api/v1/usuarios` | `usuarios.visualizar` | Listagem paginada e filtrada de usuários do sistema. |
| `GET` | `/api/v1/usuarios/permissoes-disponiveis` | Autenticado | Lista o catálogo de permissões para concessão granular. |
| `POST` | `/api/v1/usuarios` | `usuarios.criar` | Cadastro direto de colaborador pelo administrador (com permissões granulares). |
| `PUT` | `/api/v1/usuarios/:id` | `usuarios.editar` | Atualização cadastral de colaborador e suas permissões adicionais. |
| `DELETE`| `/api/v1/usuarios/:id` | `usuarios.excluir` | Exclusão lógica (`soft delete`) de usuário. |
| `GET` | `/api/v1/auditoria` | `ADMIN` / `auditoria.visualizar` | Listagem geral da trilha de logs e eventos auditados. |
| `GET` | `/api/v1/auditoria/solicitacoes-pendentes` | `ADMIN` / `auditoria.visualizar` | Lista solicitações de cadastro aguardando parecer. |
| `POST` | `/api/v1/auditoria/solicitacoes/:id/aprovar`| `ADMIN` / `auditoria.aprovar` | Aprova acesso, perfil, setor e permissões adicionais, gerando token SHA-256. |
| `POST` | `/api/v1/auditoria/solicitacoes/:id/rejeitar`| `ADMIN` / `auditoria.aprovar` | Rejeita pedido com justificativa e notifica por e-mail. |
| `POST` | `/api/v1/auditoria/usuarios/:id/reenviar-ativacao`| `ADMIN` / `auditoria.aprovar` | Invalida token anterior e gera novo link de ativação. |
| `POST` | `/api/v1/auditoria/testar-email` | `ADMIN` / `auditoria.visualizar` | Dispara diagnóstico em tempo real via Brevo API HTTPS. |
| `GET` | `/api/v1/ocorrencias` | `ocorrencias.visualizar` | Listagem de ocorrências técnicas, níveis e equipamentos. |
| `POST` | `/api/v1/ocorrencias` | `ocorrencias.criar` | Abertura de ocorrência com upload/câmera, equipamento e nível inicial. |
| `PATCH`| `/api/v1/ocorrencias/:id/assumir` | `ocorrencias.atender` | Técnico assume formalmente a responsabilidade do ticket. |
| `PATCH`| `/api/v1/ocorrencias/:id/escalonar` | `ocorrencias.atender` | Escalonamento entre níveis N1/N2/N3 com parecer técnico obrigatório. |
| `PUT` | `/api/v1/ocorrencias/:id/status` | `ocorrencias.atender` | Atualização de status da ocorrência (Em andamento / Resolvido). |
| `GET` | `/api/v1/insumos` | `insumos.visualizar` | Catálogo de materiais e saldos de almoxarifado. |
| `POST` | `/api/v1/insumos/:id/movimentar` | `insumos.movimentar` | Registro de entrada, saída ou baixa de estoque. |
| `GET` | `/api/v1/agenda/eventos` | `agenda.visualizar` | Listagem de reservas e ocupação de espaços. |
| `POST` | `/api/v1/agenda/eventos` | `agenda.criar` | Nova reserva com checagem de conflitos. |
| `GET` | `/api/v1/publico/eventos` | Público | Consulta pública dos eventos e palestras abertas do HUB. |
| `GET` | `/api/v1/publico/comunicados`| Público | Consulta pública dos informes oficiais do centro. |

---

## 9. Segurança, Auditoria e Governança

1. **Princípio do Menor Privilégio (PoLP):** Cada perfil visualiza exclusivamente os módulos e recursos necessários para sua função. Menus e rotas não autorizados são bloqueados tanto no frontend quanto validados no middleware backend.
2. **Proteção de Senhas:** Nenhuma senha trafega em texto puro em e-mails. As senhas dos usuários utilizam função de dispersão criptográfica lenta **`bcryptjs` com custo de iteração 12**.
3. **Prevenção de Abusos (Rate Limiting):**
   - Rate limiting na rota de login contra ataques de força bruta.
   - Rate limiting de 30 e-mails por hora por endereço contra ataques de inundação (email-bomb).
4. **Proteção Contra SQL Injection:** 100% das consultas ao banco de dados utilizam declarações preparadas (`prepared statements`) através do driver `mysql2`.
5. **Prevenção contra XSS e CSRF:** Tokens JWT trafegam exclusivamente nos cabeçalhos `Authorization: Bearer`, neutralizando ataques comuns de CSRF baseados em cookies.
6. **Integridade de Auditoria:** Registros da tabela `auditoria` são estritamente de escrita (`INSERT-only`). Nenhuma rota da aplicação permite alteração ou exclusão de registros auditados.
7. **Isolamento de Sessão Multi-Aba (Anti-Contaminação):** Priorização de `sessionStorage` para segregação de tokens e perfis entre abas do mesmo navegador, prevenindo que recarregamentos com F5 sobrescrevam a conta ativa com outra sessão em testes simultâneos ou cenários multiusuário.
8. **Resiliência a Concorrência & Cache de Autorização:** Cache em memória de 30 segundos (`_userAuthCache`) e de permissões com TTL de 5 minutos, e dimensionamento do pool MySQL2 com 40 conexões e keep-alive preventivo, garantindo estabilidade e fluidez durante requisições simultâneas de múltiplas contas sem sobrecarga no TiDB Cloud.
9. **Governança Estrita de Contas Master:** Apenas o perfil `ADMIN` tem prerrogativa para cadastrar, editar, promover ou alterar outros usuários com o perfil `ADMIN`, impedindo que perfis intermediários (`ADMINISTRADOR`, `GESTOR`) elevem privilégios indevidamente.
10. **Concessão Granular Dinâmica e Cache Invalidation:** Concessões pontuais em `usuario_permissoes` contam com invalidação imediata de cache (`clearUserPermCache`), propagando os novos acessos setoriais (ex: RH em Documentos) instantaneamente.

---

*Documento técnico homologado para fins de documentação de software, confecção de relatórios de conformidade, diagramação UML e exportação em PDF.*
