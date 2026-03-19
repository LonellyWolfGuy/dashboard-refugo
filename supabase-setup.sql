-- =============================================================================
-- Script de configuração da tabela app_data no Supabase
-- Execute no SQL Editor do painel do Supabase
-- =============================================================================

-- Cria a tabela se ainda não existir
CREATE TABLE IF NOT EXISTS app_data (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atualiza o timestamp automaticamente a cada upsert
CREATE OR REPLACE FUNCTION update_app_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_data_updated ON app_data;
CREATE TRIGGER trg_app_data_updated
  BEFORE UPDATE ON app_data
  FOR EACH ROW EXECUTE FUNCTION update_app_data_timestamp();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Habilita RLS
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- ATENÇÃO: Se você usa autenticação anônima ou a chave anon no frontend,
-- crie políticas permissivas. Ajuste conforme a sua necessidade de segurança.

-- Política: qualquer requisição autenticada (service role ou anon) pode ler e escrever
DROP POLICY IF EXISTS "allow_all_app_data" ON app_data;
CREATE POLICY "allow_all_app_data" ON app_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Verificação
-- =============================================================================
SELECT 'Tabela app_data configurada com sucesso!' AS status;
SELECT * FROM app_data;
