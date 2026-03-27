import { supabase } from "@/lib/supabase";
import { DailyRecord, META_REFUGO_PERCENT } from "@/lib/initialData";

const MOTIVOS_PADRAO = [
  "Defeito de fabricação", "Material inadequado", "Dimensões incorretas",
  "Acabamento deficiente", "Problemas de montagem", "Dano no transporte",
  "Falha de qualidade", "Outros"
];

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function ordenarMotivos(motivos: string[]): string[] {
  const outros = motivos.filter(m => m.toLowerCase() === "outros");
  const resto  = motivos.filter(m => m.toLowerCase() !== "outros").sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...resto, ...outros];
}

export async function lerRegistros(ano: number, mes?: number): Promise<DailyRecord[]> {
  let query = supabase
    .from("registros")
    .select("id, data, producao, refugo, motivos")
    .eq("ano", ano)
    .order("data", { ascending: true });

  if (mes) {
    query = query.eq("mes", mes);
  }

  const { data, error } = await query;

  if (error) throw new Error(`[Supabase] lerRegistros: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    data: r.data,
    producao: Number(r.producao),
    refugo: Number(r.refugo),
    motivos: Array.isArray(r.motivos) ? r.motivos : [],
  }));
}

export async function inserirRegistro(mes: number, ano: number, reg: Omit<DailyRecord, "id">): Promise<DailyRecord> {
  const novoRegistro: DailyRecord = { ...reg, id: gerarId() };
  const { error } = await supabase.from("registros").insert({
    id: novoRegistro.id,
    data: novoRegistro.data,
    mes,
    ano,
    producao: novoRegistro.producao,
    refugo: novoRegistro.refugo,
    motivos: novoRegistro.motivos ?? [],
  });
  if (error) throw new Error(`[Supabase] inserirRegistro: ${error.message}`);
  return novoRegistro;
}

export async function atualizarRegistro(id: string, reg: Omit<DailyRecord, "id">): Promise<void> {
  const { error } = await supabase.from("registros").update({
    data: reg.data,
    producao: reg.producao,
    refugo: reg.refugo,
    motivos: reg.motivos ?? [],
  }).eq("id", id);
  if (error) throw new Error(`[Supabase] atualizarRegistro: ${error.message}`);
}

export async function deletarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from("registros").delete().eq("id", id);
  if (error) throw new Error(`[Supabase] deletarRegistro: ${error.message}`);
}

export async function lerConfig(): Promise<{ metaRefugo: number; motivos: string[] }> {
  const { data, error } = await supabase
    .from("config")
    .select("chave, valor");
  if (error) throw new Error(`[Supabase] lerConfig: ${error.message}`);

  const map: Record<string, any> = {};
  (data ?? []).forEach((r: any) => { map[r.chave] = r.valor; });

  return {
    metaRefugo: typeof map.meta_refugo === "number" ? map.meta_refugo : Number(map.meta_refugo ?? META_REFUGO_PERCENT),
    motivos: Array.isArray(map.motivos) ? ordenarMotivos(map.motivos) : ordenarMotivos(MOTIVOS_PADRAO),
  };
}

export async function salvarConfig(chave: string, valor: unknown): Promise<void> {
  const { error } = await supabase
    .from("config")
    .upsert({ chave, valor }, { onConflict: "chave" });
  if (error) throw new Error(`[Supabase] salvarConfig: ${error.message}`);
}
