-- Migration: Patrimonio (Aquisicao, Nota Fiscal, Movimentacoes e Baixa)
ALTER TABLE equipamentos ADD COLUMN data_aquisicao TEXT;
ALTER TABLE equipamentos ADD COLUMN numero_nf TEXT;
ALTER TABLE equipamentos ADD COLUMN nota_fiscal_url TEXT;
ALTER TABLE equipamentos ADD COLUMN nota_fiscal_nome TEXT;
ALTER TABLE equipamentos ADD COLUMN baixa_usuario_id INTEGER;
ALTER TABLE equipamentos ADD COLUMN baixa_usuario_nome TEXT;
ALTER TABLE equipamentos ADD COLUMN baixa_motivo TEXT;
ALTER TABLE equipamentos ADD COLUMN baixa_data DATETIME;
ALTER TABLE equipamentos ADD COLUMN baixa_destino TEXT;

CREATE TABLE IF NOT EXISTS equipamentos_movimentacoes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  equipamento_id            INTEGER NOT NULL,
  tipo                      TEXT NOT NULL DEFAULT 'movimentacao',
  local_origem              TEXT,
  local_destino             TEXT,
  responsavel_anterior_id   INTEGER,
  responsavel_anterior_nome TEXT,
  responsavel_novo_id       INTEGER,
  responsavel_novo_nome     TEXT,
  movimentado_por_id        INTEGER,
  movimentado_por_nome      TEXT,
  observacao                TEXT,
  data_movimentacao         DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_anterior_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_novo_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (movimentado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_equip_mov_equip_id ON equipamentos_movimentacoes(equipamento_id, data_movimentacao DESC);

