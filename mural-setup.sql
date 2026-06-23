-- =============================================================================
-- Mural de Imagens — Modo TV  (Dashboard Controle de Refugo)
-- Execute no SQL Editor do Supabase APÓS criar o bucket "mural" no Storage.
--
-- PASSO 1 (manual, painel Supabase):
--   Storage → New Bucket
--   Nome: mural
--   Public bucket: ✅ (marcar como público)
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   Max file size: 5 MB
--
-- PASSO 2: Execute este script no SQL Editor do Supabase.
-- =============================================================================

-- ─── Tabela de slides do mural ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mural_slides (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT        NOT NULL,
  legenda       TEXT,
  storage_path  TEXT        NOT NULL,  -- ex: "mural/nome-arquivo.jpg"
  url_publica   TEXT        NOT NULL,  -- URL pública gerada pelo Supabase Storage
  ordem         INTEGER     NOT NULL DEFAULT 0,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para listagem ordenada (uso mais frequente)
CREATE INDEX IF NOT EXISTS idx_mural_slides_ordem ON mural_slides (ativo, ordem);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE mural_slides ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem criar, editar e deletar slides
DROP POLICY IF EXISTS "auth_mural_slides" ON mural_slides;
CREATE POLICY "auth_mural_slides" ON mural_slides
  FOR ALL
  USING      (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Leitura pública dos slides ativos (para o Modo TV funcionar mesmo sem login)
-- Comente esta policy se quiser restringir a visualização apenas a usuários logados.
DROP POLICY IF EXISTS "public_read_mural_slides" ON mural_slides;
CREATE POLICY "public_read_mural_slides" ON mural_slides
  FOR SELECT
  USING (ativo = true);

-- ─── Storage: policies do bucket "mural" ─────────────────────────────────────
-- Execute no SQL Editor — substitui policies anteriores do bucket.

-- Qualquer pessoa pode ver as imagens públicas
INSERT INTO storage.buckets (id, name, public)
VALUES ('mural', 'mural', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Apenas autenticados fazem upload
DROP POLICY IF EXISTS "mural_upload" ON storage.objects;
CREATE POLICY "mural_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mural');

-- Apenas autenticados deletam
DROP POLICY IF EXISTS "mural_delete" ON storage.objects;
CREATE POLICY "mural_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mural');

-- Qualquer pessoa pode ler (necessário para exibir imagens no Modo TV)
DROP POLICY IF EXISTS "mural_read" ON storage.objects;
CREATE POLICY "mural_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'mural');

-- ─── Verificação ──────────────────────────────────────────────────────────────
SELECT 'Tabela mural_slides criada com sucesso!' AS status;
SELECT COUNT(*) AS total_slides FROM mural_slides;
