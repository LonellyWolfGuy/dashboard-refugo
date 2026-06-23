// muralService.ts
// Operações com a tabela mural_slides e o bucket "mural" do Supabase Storage.

import { supabase } from "@/lib/supabase";

export interface MuralSlide {
  id: string;
  titulo: string;
  legenda?: string;
  storage_path: string;
  url_publica: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/** Retorna todos os slides ativos, ordenados por `ordem` crescente. */
export async function listarSlides(): Promise<MuralSlide[]> {
  const { data, error } = await supabase
    .from("mural_slides")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) throw new Error(`[Mural] listarSlides: ${error.message}`);
  return (data ?? []) as MuralSlide[];
}

/** Retorna TODOS os slides (ativos e inativos), para o painel de administração. */
export async function listarTodosSlides(): Promise<MuralSlide[]> {
  const { data, error } = await supabase
    .from("mural_slides")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) throw new Error(`[Mural] listarTodosSlides: ${error.message}`);
  return (data ?? []) as MuralSlide[];
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de um arquivo de imagem para o bucket "mural" e
 * insere o registro na tabela mural_slides.
 *
 * @param file     O arquivo de imagem selecionado pelo usuário
 * @param titulo   Título exibido sobre a imagem no Modo TV
 * @param legenda  Texto opcional exibido abaixo do título
 * @returns O slide recém-criado
 */
export async function uploadImagem(
  file: File,
  titulo: string,
  legenda?: string
): Promise<MuralSlide> {
  // Gera um nome único para evitar colisão de arquivos
  const extensao = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`;
  const storagePath = `mural/${nomeArquivo}`;

  // 1. Upload para o Storage
  const { error: uploadError } = await supabase.storage
    .from("mural")
    .upload(nomeArquivo, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`[Mural] upload: ${uploadError.message}`);

  // 2. Obter URL pública
  const { data: urlData } = supabase.storage
    .from("mural")
    .getPublicUrl(nomeArquivo);

  const urlPublica = urlData.publicUrl;

  // 3. Descobrir a próxima ordem (último + 1)
  const { data: ultimo } = await supabase
    .from("mural_slides")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .single();

  const proxOrdem = ((ultimo as any)?.ordem ?? -1) + 1;

  // 4. Inserir na tabela
  const { data: inserted, error: insertError } = await supabase
    .from("mural_slides")
    .insert({
      titulo,
      legenda: legenda ?? null,
      storage_path: storagePath,
      url_publica: urlPublica,
      ordem: proxOrdem,
      ativo: true,
    })
    .select()
    .single();

  if (insertError) {
    // Cleanup: remove o arquivo do storage se a inserção falhou
    await supabase.storage.from("mural").remove([nomeArquivo]);
    throw new Error(`[Mural] inserir registro: ${insertError.message}`);
  }

  return inserted as MuralSlide;
}

// ─── Atualização ──────────────────────────────────────────────────────────────

/** Atualiza título, legenda ou status ativo/inativo de um slide. */
export async function atualizarSlide(
  id: string,
  dados: Partial<Pick<MuralSlide, "titulo" | "legenda" | "ativo" | "ordem">>
): Promise<void> {
  const { error } = await supabase
    .from("mural_slides")
    .update(dados)
    .eq("id", id);

  if (error) throw new Error(`[Mural] atualizarSlide: ${error.message}`);
}

/** Reordena todos os slides recebendo um array de IDs na nova ordem. */
export async function reordenarSlides(ids: string[]): Promise<void> {
  const updates = ids.map((id, index) =>
    supabase.from("mural_slides").update({ ordem: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw new Error(`[Mural] reordenarSlides: ${error.message}`);
  }
}

// ─── Exclusão ─────────────────────────────────────────────────────────────────

/**
 * Remove o arquivo do Supabase Storage E a linha da tabela mural_slides.
 *
 * @param id           UUID do slide na tabela
 * @param storagePath  Caminho no bucket, ex: "mural/1234-abcd.jpg"
 */
export async function deletarSlide(id: string, storagePath: string): Promise<void> {
  // O filename dentro do bucket é a parte depois de "mural/"
  const nomeArquivo = storagePath.replace(/^mural\//, "");

  // 1. Remove do Storage
  const { error: storageError } = await supabase.storage
    .from("mural")
    .remove([nomeArquivo]);

  if (storageError) {
    throw new Error(`[Mural] deletar storage: ${storageError.message}`);
  }

  // 2. Remove da tabela
  const { error: dbError } = await supabase
    .from("mural_slides")
    .delete()
    .eq("id", id);

  if (dbError) throw new Error(`[Mural] deletar registro: ${dbError.message}`);
}
