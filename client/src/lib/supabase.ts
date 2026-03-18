// supabase.ts — cliente Supabase compartilhado entre todos os contextos
// As variáveis são lidas do painel do Vercel em produção
// ou do arquivo .env.local em desenvolvimento

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌  VITE_SUPABASE_URL ou VITE_SUPABASE_KEY não definidos.\n" +
    "    Crie um arquivo .env.local na raiz do projeto com essas variáveis."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
