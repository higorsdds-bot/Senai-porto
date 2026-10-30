-- Upsert all seed users with correct bcrypt hashes
INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Administrador do Sistema', 'admin@secult.es.gov.br', '$2b$10$1/bDONQUjZ3VHF5pmVJF5.sTpkn6sL76CGyiYXwt0NgTfEPh6TBka', 'ADMIN', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Higor Silva', 'higor@secult.es.gov.br', '$2b$10$1/bDONQUjZ3VHF5pmVJF5.sTpkn6sL76CGyiYXwt0NgTfEPh6TBka', 'ADMIN', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Andre', 'andre@secult123.com', '$2b$10$1/bDONQUjZ3VHF5pmVJF5.sTpkn6sL76CGyiYXwt0NgTfEPh6TBka', 'ADMIN', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Administrador Executivo', 'administrador@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'ADMINISTRADOR', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Operador Administrativo', 'administracao@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'ADMINISTRACAO', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Gestor Geral', 'gestor@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'GESTOR', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Gestor de RH', 'gestor.rh@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'GESTOR_RH', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Gestor de Infra & TI', 'gestor.infra@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'GESTOR_INFRA', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Gestor Operacional', 'gestor.operador@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'GESTOR_OPERADOR', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Analista de RH', 'analista.rh@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'ANALISTA_RH', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Assistente de RH', 'rh@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'RH', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Técnico Suporte N3', 'tecnico.n3@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'TECNICO_N3', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Técnico Suporte N2', 'tecnico.n2@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'TECNICO_N2', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Técnico Suporte N1', 'tecnico.n1@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'TECNICO_N1', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Técnico Operacional', 'tecnico@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'TECNICO', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Operador de Atendimento', 'operador@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'OPERADOR', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('Equipe de Limpeza', 'limpeza@secult.es.gov.br', '$2b$10$XAKTAaWtHH7yMgch2Ok5ZuKVjX/ZHtr7OaQxgVBFf8g7jn/.kzVAq', 'LIMPEZA', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;

