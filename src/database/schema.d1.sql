-- ============================================================
-- HUB ES+ / SECULT - CLOUDFLARE D1 RELATIONAL SCHEMA & SEED
-- Database: secult_db (Cloudflare D1 SQLite Edge Engine)
-- ============================================================

-- 1. SETORES
CREATE TABLE IF NOT EXISTS setores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISSOES
CREATE TABLE IF NOT EXISTS permissoes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chave      TEXT NOT NULL UNIQUE,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. PERFIL_PERMISSOES
CREATE TABLE IF NOT EXISTS perfil_permissoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil       TEXT NOT NULL,
  permissao_id INTEGER NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
  UNIQUE(perfil, permissao_id)
);

-- 4. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  senha            TEXT NOT NULL,
  perfil           TEXT NOT NULL DEFAULT 'OPERADOR',
  setor_id         INTEGER,
  status           TEXT NOT NULL DEFAULT 'PENDENTE',
  ultimo_acesso    DATETIME,
  ultimo_heartbeat DATETIME,
  deleted_at       DATETIME,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
);

-- 5. USUARIO_PERMISSOES (Permissões granulares adicionais por colaborador)
CREATE TABLE IF NOT EXISTS usuario_permissoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL,
  permissao_id INTEGER NOT NULL,
  concedida    INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, permissao_id)
);

-- 6. EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS equipamentos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  patrimonio     TEXT NOT NULL UNIQUE,
  responsavel_id INTEGER,
  descricao      TEXT,
  localizacao    TEXT,
  estado         TEXT NOT NULL DEFAULT 'bom',
  imagem_url     TEXT,
  deleted_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 7. DOCUMENTOS
CREATE TABLE IF NOT EXISTS documentos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo           TEXT NOT NULL,
  setor_id         INTEGER,
  responsavel_id   INTEGER,
  descricao        TEXT,
  nome_original    TEXT,
  nome_armazenado  TEXT,
  caminho          TEXT,
  mime_type        TEXT,
  tamanho          INTEGER,
  extensao         TEXT,
  status           TEXT NOT NULL DEFAULT 'ativo',
  deleted_at       DATETIME,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 8. OCORRENCIAS (com suporte N1/N2/N3, parecer técnico e equipamento)
CREATE TABLE IF NOT EXISTS ocorrencias (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id        INTEGER,
  responsavel_id    INTEGER,
  tecnico_id        INTEGER,
  equipamento_id    INTEGER,
  nivel_atendimento TEXT NOT NULL DEFAULT 'N1',
  titulo            TEXT,
  local             TEXT NOT NULL,
  descricao         TEXT,
  parecer_tecnico   TEXT,
  tipo              TEXT,
  foto_url          TEXT,
  anexo_url         TEXT,
  anexo_nome        TEXT,
  status            TEXT NOT NULL DEFAULT 'aberto',
  deleted_at        DATETIME,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE SET NULL
);

-- 9. LIMPEZA
CREATE TABLE IF NOT EXISTS limpeza (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel_id INTEGER,
  local          TEXT NOT NULL,
  descricao      TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente',
  data_prevista  DATETIME,
  deleted_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 10. COMPRAS
CREATE TABLE IF NOT EXISTS compras (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitante_id INTEGER,
  setor_id       INTEGER,
  produto        TEXT NOT NULL,
  descricao      TEXT,
  quantidade     INTEGER NOT NULL DEFAULT 1,
  valor_estimado REAL,
  status         TEXT NOT NULL DEFAULT 'pendente',
  justificativa  TEXT,
  deleted_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
);

-- 11. EVENTOS
CREATE TABLE IF NOT EXISTS eventos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel_id INTEGER,
  titulo         TEXT,
  local          TEXT NOT NULL,
  descricao      TEXT,
  data           DATETIME NOT NULL,
  data_fim       DATETIME,
  status         TEXT NOT NULL DEFAULT 'agendado',
  deleted_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 12. INSUMOS
CREATE TABLE IF NOT EXISTS insumos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  quantidade     INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 1,
  unidade        TEXT NOT NULL DEFAULT 'unid',
  setor_id       INTEGER,
  deleted_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
);

-- 13. ESTOQUE_MOVIMENTACOES
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  insumo_id     INTEGER,
  usuario_id    INTEGER,
  tipo          TEXT NOT NULL,
  quantidade    INTEGER NOT NULL,
  local_origem  TEXT,
  local_destino TEXT,
  observacao    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 14. COMUNICADOS
CREATE TABLE IF NOT EXISTS comunicados (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo              TEXT NOT NULL,
  mensagem            TEXT NOT NULL,
  autor_id            INTEGER,
  prioridade          TEXT NOT NULL DEFAULT 'normal',
  destinatario_perfil TEXT NOT NULL DEFAULT 'TODOS',
  deleted_at          DATETIME,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 15. ADVERTENCIAS
CREATE TABLE IF NOT EXISTS advertencias (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  colaborador_id  INTEGER NOT NULL,
  solicitante_id  INTEGER NOT NULL,
  homologador_id  INTEGER,
  motivo          TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  gravidade       TEXT NOT NULL DEFAULT 'LEVE',
  status          TEXT NOT NULL DEFAULT 'PENDENTE',
  data_ocorrencia DATE NOT NULL,
  motivo_decisao  TEXT,
  data_decisao    DATETIME,
  deleted_at      DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (colaborador_id) REFERENCES usuarios(id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
  FOREIGN KEY (homologador_id) REFERENCES usuarios(id)
);

-- 16. AUDITORIA
CREATE TABLE IF NOT EXISTS auditoria (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER,
  acao        TEXT NOT NULL,
  entidade    TEXT,
  entidade_id INTEGER,
  descricao   TEXT,
  ip          TEXT,
  user_agent  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. TOKENS_ATIVACAO
CREATE TABLE IF NOT EXISTS tokens_ativacao (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER NOT NULL,
  token_hash  TEXT NOT NULL,
  expira_em   DATETIME NOT NULL,
  usado_em    DATETIME,
  ip_criacao  TEXT,
  ip_ativacao TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED INICIAL: SETORES
-- ============================================================
INSERT OR IGNORE INTO setores (id, nome, descricao) VALUES
  (1, 'Direção Geral', 'Gestão estratégica e representação institucional do HUB ES+'),
  (2, 'Recursos Humanos (RH)', 'Gestão de pessoas, quadro funcional, contratos e documentos'),
  (3, 'Infraestrutura & Redes (TI)', 'Suporte técnico aos níveis N1, N2 e N3, hardware e conectividade'),
  (4, 'Almoxarifado & Compras', 'Gestão de materiais, estoque e suprimentos'),
  (5, 'Operações & Eventos', 'Operação de salas, agendamentos e atendimento de ponta'),
  (6, 'Serviços Gerais & Higienização', 'Rotinas e checklists de limpeza e conservação');

-- ============================================================
-- SEED INICIAL: PERMISSOES
-- ============================================================
INSERT OR IGNORE INTO permissoes (chave, nome, descricao) VALUES
  ('dashboard.visualizar', 'Visualizar Dashboard', 'Acesso ao painel principal'),
  ('indicadores.visualizar', 'Visualizar Indicadores', 'Acesso aos gráficos e SLAs'),
  ('limpeza.visualizar', 'Visualizar Limpeza', 'Ver escalas de limpeza'),
  ('limpeza.criar', 'Criar Limpeza', 'Criar tarefas de limpeza'),
  ('limpeza.editar', 'Editar Limpeza', 'Editar tarefas de limpeza'),
  ('limpeza.excluir', 'Excluir Limpeza', 'Excluir tarefas de limpeza'),
  ('compras.visualizar', 'Visualizar Compras', 'Acesso ao módulo de compras'),
  ('compras.criar', 'Criar Compra', 'Solicitar nova compra'),
  ('compras.editar', 'Editar Compra', 'Editar solicitações de compra'),
  ('compras.aprovar', 'Aprovar Compra', 'Aprovar ou rejeitar compras'),
  ('compras.receber', 'Dar Entrada em Compra', 'Receber itens comprados'),
  ('compras.visualizar_pedidos', 'Visualizar Pedidos', 'Ver histórico de compras'),
  ('compras.visualizar_proprias', 'Visualizar Próprias Compras', 'Ver solicitações do usuário'),
  ('compras.excluir', 'Excluir Compra', 'Excluir registro de compra'),
  ('equipamentos.visualizar', 'Visualizar Equipamentos', 'Consultar patrimônio'),
  ('equipamentos.criar', 'Criar Equipamento', 'Cadastrar novo equipamento'),
  ('equipamentos.editar', 'Editar Equipamento', 'Editar cadastro de equipamento'),
  ('equipamentos.excluir', 'Excluir Equipamento', 'Excluir registro patrimonial'),
  ('documentos.visualizar', 'Visualizar Documentos', 'Acessar biblioteca de documentos'),
  ('documentos.enviar', 'Enviar Documento', 'Upload de novos documentos'),
  ('documentos.baixar', 'Baixar Documento', 'Download de documentos'),
  ('documentos.arquivar', 'Arquivar Documento', 'Arquivamento documental'),
  ('documentos.excluir', 'Excluir Documento', 'Excluir documentos'),
  ('ocorrencias.visualizar', 'Visualizar Ocorrências', 'Ver chamados de manutenção'),
  ('ocorrencias.criar', 'Criar Ocorrência', 'Abrir chamado com foto e equipamento'),
  ('ocorrencias.editar', 'Editar Ocorrência', 'Atualizar dados de ocorrência'),
  ('ocorrencias.assumir', 'Assumir Chamado Técnico', 'Técnico assume chamado'),
  ('ocorrencias.escalonar', 'Escalonar Nível Técnico (N1/N2/N3)', 'Escalonamento com parecer'),
  ('ocorrencias.excluir', 'Excluir Ocorrência', 'Remover ocorrência'),
  ('eventos.visualizar', 'Visualizar Eventos', 'Ver agenda do centro'),
  ('eventos.criar', 'Criar Evento', 'Reservar salas e espaços'),
  ('eventos.editar', 'Editar Evento', 'Editar reservas'),
  ('eventos.excluir', 'Excluir Evento', 'Cancelar reservas'),
  ('insumos.visualizar', 'Visualizar Insumos', 'Ver catálogo de estoque'),
  ('insumos.criar', 'Criar Insumo', 'Cadastrar novo insumo'),
  ('insumos.editar', 'Editar Insumo', 'Editar insumos'),
  ('insumos.excluir', 'Excluir Insumo', 'Excluir insumo'),
  ('insumos.movimentar', 'Movimentar Estoque', 'Dar entrada ou saída de insumos'),
  ('insumos.baixar', 'Dar Baixa em Estoque', 'Descarte ou baixa de insumo'),
  ('comunicados.visualizar', 'Visualizar Comunicados', 'Ler avisos institucionais'),
  ('comunicados.criar', 'Criar Comunicado', 'Publicar aviso no mural'),
  ('comunicados.excluir', 'Excluir Comunicado', 'Excluir comunicado'),
  ('usuarios.visualizar', 'Visualizar Usuários', 'Listar colaboradores'),
  ('usuarios.criar', 'Criar Usuário', 'Cadastrar colaborador'),
  ('usuarios.pre_cadastrar', 'Pré-cadastrar Colaborador', 'Pré-cadastro institucional'),
  ('usuarios.editar', 'Editar Usuário', 'Atualizar dados e permissões'),
  ('usuarios.bloquear', 'Bloquear Usuário', 'Bloquear/desbloquear acesso'),
  ('setores.visualizar', 'Visualizar Setores', 'Ver setores organizacionais'),
  ('setores.criar', 'Criar Setor', 'Cadastrar novo setor'),
  ('setores.editar', 'Editar Setor', 'Editar dados de setor'),
  ('setores.excluir', 'Excluir Setor', 'Remover setor'),
  ('auditoria.visualizar', 'Visualizar Auditoria', 'Ver trilha de auditoria e logs'),
  ('rh.visualizar', 'Visualizar Painel de RH', 'Rotinas e registros de RH'),
  ('rh.gerenciar', 'Gerenciar Colaboradores de RH', 'Gestão de pessoas e documentos');

-- ============================================================
-- SEED INICIAL: ADMIN MASTER
-- ============================================================
INSERT OR IGNORE INTO usuarios (id, nome, email, senha, perfil, setor_id, status) VALUES
  (1, 'Administrador do Sistema', 'admin@secult.es.gov.br', '$2b$12$6/YQYgL6eE5R06rBfK65oeq1PshjXlB9x0L17G0uN7U7E49t11vOq', 'ADMIN', 1, 'ATIVO');
