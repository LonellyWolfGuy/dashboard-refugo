-- Supabase Migration
-- 1. Adiciona coluna 'observacoes' para suportar justificativas mais ricas
-- 2. Adiciona coluna 'user_id' e aplica regras de Row Level Security (RLS) para múltiplos perfis no futuro.

ALTER TABLE registros ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Ativando RLS para isolar dados do usuário atual
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permite SELECT apenas nos registros do proprio usuario logado"
ON registros FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Permite INSERT apenas nos registros atrelados ao proprio ID"
ON registros FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permite UPDATE apenas nos registros do proprio usuario"
ON registros FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Permite DELETE apenas nos registros do proprio usuario"
ON registros FOR DELETE
USING (auth.uid() = user_id);
