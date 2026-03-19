-- =============================================================================
-- Script de configuração do banco — Dashboard Controle de Refugo
-- Execute no SQL Editor do Supabase (substitui qualquer versão anterior)
-- =============================================================================

-- Remove tabela antiga se existir
DROP TABLE IF EXISTS app_data CASCADE;

-- ─── Tabela de registros diários ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros (
  id          TEXT PRIMARY KEY,
  data        DATE NOT NULL,
  mes         INTEGER NOT NULL,   -- 1-12
  ano         INTEGER NOT NULL,
  producao    NUMERIC(12,3) NOT NULL DEFAULT 0,
  refugo      NUMERIC(12,3) NOT NULL DEFAULT 0,
  motivos     JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_ano_mes ON registros (ano, mes);

-- ─── Tabela de configurações ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insere config padrão se não existir
INSERT INTO config (chave, valor)
VALUES
  ('meta_refugo', '25'),
  ('motivos',     '["Defeito de fabricação","Material inadequado","Dimensões incorretas","Acabamento deficiente","Problemas de montagem","Dano no transporte","Falha de qualidade","Outros"]')
ON CONFLICT (chave) DO NOTHING;

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registros_updated ON registros;
CREATE TRIGGER trg_registros_updated
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_config_updated ON config;
CREATE TRIGGER trg_config_updated
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE config    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_registros" ON registros;
CREATE POLICY "allow_all_registros" ON registros FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_config" ON config;
CREATE POLICY "allow_all_config" ON config FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed: dados iniciais (só insere se tabela estiver vazia) ─────────────────
INSERT INTO registros (id, data, mes, ano, producao, refugo, motivos) VALUES
  ('seed_jan_01', '2026-01-07', 1, 2026, 12281.399, 3852.03, '[]'),
  ('seed_jan_02', '2026-01-28', 1, 2026, 487.08,    373.27,  '[]'),
  ('seed_jan_03', '2026-01-29', 1, 2026, 1354,      453.89,  '[]'),
  ('seed_jan_04', '2026-01-30', 1, 2026, 1130.57,   358.88,  '[]'),
  ('seed_fev_01', '2026-02-02', 2, 2026, 281.96,    210.39,  '[]'),
  ('seed_fev_02', '2026-02-03', 2, 2026, 456.55,    459.77,  '[]'),
  ('seed_fev_03', '2026-02-04', 2, 2026, 796.26,    203.27,  '[]'),
  ('seed_fev_04', '2026-02-05', 2, 2026, 379.9,     59.16,   '[]'),
  ('seed_fev_05', '2026-02-06', 2, 2026, 1089.98,   382.7,   '[]'),
  ('seed_fev_06', '2026-02-09', 2, 2026, 392.8,     303.66,  '[]'),
  ('seed_fev_07', '2026-02-10', 2, 2026, 567.15,    99.68,   '[]'),
  ('seed_fev_08', '2026-02-11', 2, 2026, 1179.73,   528.1,   '[]'),
  ('seed_fev_09', '2026-02-12', 2, 2026, 506.84,    279.35,  '[]'),
  ('seed_fev_10', '2026-02-13', 2, 2026, 569.89,    118.67,  '[]'),
  ('seed_fev_11', '2026-02-16', 2, 2026, 1378.7,    437.49,  '[]'),
  ('seed_fev_12', '2026-02-17', 2, 2026, 873.79,    366.9,   '[]'),
  ('seed_fev_13', '2026-02-18', 2, 2026, 722.26,    267.02,  '[]'),
  ('seed_fev_14', '2026-02-19', 2, 2026, 940.23,    324.33,  '[]'),
  ('seed_fev_15', '2026-02-20', 2, 2026, 571.06,    106.86,  '[]'),
  ('seed_fev_16', '2026-02-23', 2, 2026, 1253.98,   264.37,  '[]'),
  ('seed_fev_17', '2026-02-24', 2, 2026, 1068.71,   561.06,  '[]'),
  ('seed_fev_18', '2026-02-25', 2, 2026, 743.86,    156.92,  '[]'),
  ('seed_fev_19', '2026-02-26', 2, 2026, 1165.11,   90.17,   '[]'),
  ('seed_fev_20', '2026-02-27', 2, 2026, 1995.48,   321.36,  '[]'),
  ('seed_mar_01', '2026-03-02', 3, 2026, 411.77,    152.81,  '[]'),
  ('seed_mar_02', '2026-03-03', 3, 2026, 472.48,    257.88,  '[]'),
  ('seed_mar_03', '2026-03-04', 3, 2026, 1176.23,   155.81,  '[]'),
  ('seed_mar_04', '2026-03-05', 3, 2026, 1558.15,   238.43,  '[]'),
  ('seed_mar_05', '2026-03-06', 3, 2026, 362.39,    79.93,   '[]'),
  ('seed_mar_06', '2026-03-10', 3, 2026, 753.5,     146.52,  '[]')
ON CONFLICT (id) DO NOTHING;

-- ─── Verificação ──────────────────────────────────────────────────────────────
SELECT 'Banco configurado com sucesso!' AS status;
SELECT COUNT(*) AS total_registros FROM registros;
SELECT chave, valor FROM config;
