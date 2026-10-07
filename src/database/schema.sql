-- ============================================================
-- HUB ES+ / SECULT DB - MIGRATION SCRIPT
-- Cria o banco se não existir e ajusta/cria todas as tabelas
-- compatível com TiDB Cloud (MySQL 8.0 compatible)
-- Execute: node src/database/migrate.js
-- ============================================================

-- Charset padrão
SET NAMES utf8mb4;

-- ============================================================
-- TABELA: setores
-- ============================================================
CREATE TABLE IF NOT EXISTS setores (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(150) NOT NULL,
  descricao  TEXT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: permissoes
-- ============================================================
CREATE TABLE IF NOT EXISTS permissoes (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  chave     VARCHAR(100) NOT NULL UNIQUE,
  nome      VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: perfil_permissoes
-- ============================================================
CREATE TABLE IF NOT EXISTS perfil_permissoes (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  perfil       VARCHAR(50) NOT NULL,
  permissao_id BIGINT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_perfil_permissao (perfil, permissao_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(200) NOT NULL,
  email            VARCHAR(200) NOT NULL UNIQUE,
  senha            VARCHAR(255) NOT NULL,
  -- Mantido VARCHAR para adicionar perfis via seed sem alterar enum em produção.
  perfil           VARCHAR(50) NOT NULL DEFAULT 'OPERADOR',
  setor_id         BIGINT NULL,
  status           ENUM('ATIVO','INATIVO','BLOQUEADO','PENDENTE') NOT NULL DEFAULT 'PENDENTE',
  ultimo_acesso    DATETIME NULL,
  ultimo_heartbeat DATETIME NULL,
  deleted_at       DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: limpeza
-- ============================================================
CREATE TABLE IF NOT EXISTS limpeza (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  responsavel_id BIGINT NULL,
  local          VARCHAR(255) NOT NULL,
  descricao      TEXT NULL,
  status         ENUM('pendente','em_execucao','concluido') NOT NULL DEFAULT 'pendente',
  data_prevista  DATETIME NULL,
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: compras
-- ============================================================
CREATE TABLE IF NOT EXISTS compras (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  solicitante_id BIGINT NULL,
  setor_id       BIGINT NULL,
  produto        VARCHAR(500) NOT NULL,
  descricao      TEXT NULL,
  quantidade     INT NOT NULL DEFAULT 1,
  valor_estimado DECIMAL(15,2) NULL,
  status         ENUM('pendente','aprovado','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  justificativa  TEXT NULL,
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: equipamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS equipamentos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(300) NOT NULL,
  patrimonio     VARCHAR(100) NOT NULL UNIQUE,
  responsavel_id BIGINT NULL,
  descricao      TEXT NULL,
  localizacao    VARCHAR(255) NULL,
  estado         ENUM('bom','manutencao','descartado') NOT NULL DEFAULT 'bom',
  imagem_url     VARCHAR(500) NULL,
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  titulo           VARCHAR(500) NOT NULL,
  setor_id         BIGINT NULL,
  responsavel_id   BIGINT NULL,
  descricao        TEXT NULL,
  nome_original    VARCHAR(500) NULL,
  nome_armazenado  VARCHAR(500) NULL,
  caminho          VARCHAR(1000) NULL,
  mime_type        VARCHAR(100) NULL,
  tamanho          BIGINT NULL,
  extensao         VARCHAR(20) NULL,
  status           ENUM('ativo','arquivado') NOT NULL DEFAULT 'ativo',
  deleted_at       DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: ocorrencias
-- ============================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     BIGINT NULL,
  responsavel_id BIGINT NULL,
  local          VARCHAR(255) NOT NULL,
  descricao      TEXT NULL,
  tipo           VARCHAR(100) NULL,
  foto_url       VARCHAR(500) NULL,
  anexo_url      VARCHAR(1000) NULL,
  anexo_nome     VARCHAR(255) NULL,
  status         ENUM('aberto','em_andamento','resolvido') NOT NULL DEFAULT 'aberto',
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  responsavel_id BIGINT NULL,
  titulo         VARCHAR(300) NULL,
  local          VARCHAR(255) NOT NULL,
  descricao      TEXT NULL,
  data           DATETIME NOT NULL,
  data_fim       DATETIME NULL,
  status         ENUM('agendado','em_andamento','concluido','cancelado') NOT NULL DEFAULT 'agendado',
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: insumos
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(300) NOT NULL,
  descricao      TEXT NULL,
  quantidade     INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 1,
  unidade        VARCHAR(30) NOT NULL DEFAULT 'unid',
  setor_id       BIGINT NULL,
  deleted_at     DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: estoque_movimentacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  insumo_id   BIGINT NULL,
  usuario_id  BIGINT NULL,
  tipo        ENUM('ENTRADA','SAIDA','AJUSTE') NOT NULL,
  quantidade  INT NOT NULL,
  observacao  TEXT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: comunicados
-- ============================================================
CREATE TABLE IF NOT EXISTS comunicados (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  titulo     VARCHAR(500) NOT NULL,
  mensagem   TEXT NOT NULL,
  autor_id   BIGINT NULL,
  prioridade ENUM('alta','media','normal') NOT NULL DEFAULT 'normal',
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: auditoria
  -- ============================================================
  CREATE TABLE IF NOT EXISTS auditoria (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  BIGINT NULL,
    acao        VARCHAR(100) NOT NULL,
    entidade    VARCHAR(100) NULL,
    entidade_id BIGINT NULL,
    descricao   TEXT NULL,
    ip          VARCHAR(45) NULL,
    user_agent  TEXT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
