import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DailyRecord, MonthData, META_REFUGO_PERCENT } from "@/lib/initialData";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DashboardContextType {
  meses: MonthData[];
  mesAtual: number;
  anoAtual: number;
  metaRefugo: number;
  motivos: string[];
  carregando: boolean;
  setMesAtual: (mes: number) => void;
  adicionarRegistro: (mes: number, registro: Omit<DailyRecord, "id">) => Promise<void>;
  editarRegistro: (mes: number, id: string, dados: Omit<DailyRecord, "id">) => Promise<void>;
  excluirRegistro: (mes: number, id: string) => Promise<void>;
  setMetaRefugo: (meta: number) => Promise<void>;
  adicionarMotivo: (motivo: string) => Promise<void>;
  removerMotivo: (motivo: string) => Promise<void>;
  getMesData: (mes: number) => MonthData;
  getTotaisMes: (mes: number) => { totalProducao: number; totalRefugo: number; total: number; percentRefugo: number };
  getTotaisAnuais: () => { totalProducao: number; totalRefugo: number; total: number; percentRefugo: number };
  salvarTudo: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

const MOTIVOS_PADRAO = [
  "Defeito de fabricação", "Material inadequado", "Dimensões incorretas",
  "Acabamento deficiente", "Problemas de montagem", "Dano no transporte",
  "Falha de qualidade", "Outros"
];

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Ordena motivos: alfabético, "Outros" sempre por último
function ordenarMotivos(motivos: string[]): string[] {
  const outros = motivos.filter(m => m.toLowerCase() === "outros");
  const resto  = motivos.filter(m => m.toLowerCase() !== "outros").sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...resto, ...outros];
}

// ─── Helpers Supabase ─────────────────────────────────────────────────────────

// Lê todos os registros do ano do banco — cada linha é um DailyRecord independente
async function lerRegistros(ano: number): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from("registros")
    .select("id, data, producao, refugo, motivos")
    .eq("ano", ano)
    .order("data", { ascending: true });

  if (error) throw new Error(`[Supabase] lerRegistros: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    data: r.data,
    producao: Number(r.producao),
    refugo: Number(r.refugo),
    motivos: Array.isArray(r.motivos) ? r.motivos : [],
  }));
}

async function inserirRegistro(mes: number, ano: number, reg: DailyRecord): Promise<void> {
  const { error } = await supabase.from("registros").insert({
    id: reg.id,
    data: reg.data,
    mes,
    ano,
    producao: reg.producao,
    refugo: reg.refugo,
    motivos: reg.motivos ?? [],
  });
  if (error) throw new Error(`[Supabase] inserirRegistro: ${error.message}`);
}

async function atualizarRegistro(id: string, reg: Omit<DailyRecord, "id">): Promise<void> {
  const { error } = await supabase.from("registros").update({
    data: reg.data,
    producao: reg.producao,
    refugo: reg.refugo,
    motivos: reg.motivos ?? [],
  }).eq("id", id);
  if (error) throw new Error(`[Supabase] atualizarRegistro: ${error.message}`);
}

async function deletarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from("registros").delete().eq("id", id);
  if (error) throw new Error(`[Supabase] deletarRegistro: ${error.message}`);
}

async function lerConfig(): Promise<{ metaRefugo: number; motivos: string[] }> {
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

async function salvarConfig(chave: string, valor: unknown): Promise<void> {
  const { error } = await supabase
    .from("config")
    .upsert({ chave, valor }, { onConflict: "chave" });
  if (error) throw new Error(`[Supabase] salvarConfig: ${error.message}`);
}

// ─── Montagem do estado local a partir dos registros planos ──────────────────

function montarMeses(registros: DailyRecord[], ano: number): MonthData[] {
  const mapa: Record<number, DailyRecord[]> = {};
  for (let m = 1; m <= 12; m++) mapa[m] = [];
  registros.forEach(r => {
    const mes = Number(r.data.slice(5, 7));
    if (mapa[mes]) mapa[mes].push(r);
  });
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    ano,
    registros: mapa[i + 1].sort((a, b) => a.data.localeCompare(b.data)),
  }));
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const anoAtual = 2026;
  const [meses, setMeses] = useState<MonthData[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, ano: anoAtual, registros: [] }))
  );
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [metaRefugo, setMetaRefugoState] = useState<number>(META_REFUGO_PERCENT);
  const [motivos, setMotivosState] = useState<string[]>(MOTIVOS_PADRAO);
  const [carregando, setCarregando] = useState(true);

  // Ref para leitura síncrona do estado atual nos callbacks
  const motivosRef = useRef<string[]>(MOTIVOS_PADRAO);
  const metaRef = useRef<number>(META_REFUGO_PERCENT);

  // ─── Carregamento inicial ────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      try {
        const [registros, cfg] = await Promise.all([
          lerRegistros(anoAtual),
          lerConfig(),
        ]);
        setMeses(montarMeses(registros, anoAtual));
        setMetaRefugoState(cfg.metaRefugo);
        metaRef.current = cfg.metaRefugo;
        setMotivosState(cfg.motivos);
        motivosRef.current = cfg.motivos;
      } catch (err) {
        console.error("[DashboardContext] Falha no carregamento:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // ─── Ações — cada uma opera atomicamente na linha correta do banco ────────

  const adicionarRegistro = useCallback(async (mes: number, registro: Omit<DailyRecord, "id">) => {
    const novoRegistro: DailyRecord = { ...registro, id: gerarId() };
    // 1. Persiste atomicamente (uma linha, sem risco de sobrescrever outras)
    await inserirRegistro(mes, anoAtual, novoRegistro);
    // 2. Atualiza estado local
    setMeses(prev => prev.map(m => {
      if (m.mes !== mes || m.ano !== anoAtual) return m;
      const registros = [...m.registros, novoRegistro]
        .sort((a, b) => a.data.localeCompare(b.data));
      return { ...m, registros };
    }));
  }, []);

  const editarRegistro = useCallback(async (mes: number, id: string, dados: Omit<DailyRecord, "id">) => {
    await atualizarRegistro(id, dados);
    setMeses(prev => prev.map(m => {
      if (m.mes !== mes || m.ano !== anoAtual) return m;
      const registros = m.registros
        .map(r => r.id === id ? { ...dados, id } : r)
        .sort((a, b) => a.data.localeCompare(b.data));
      return { ...m, registros };
    }));
  }, []);

  const excluirRegistro = useCallback(async (mes: number, id: string) => {
    await deletarRegistro(id);
    setMeses(prev => prev.map(m => {
      if (m.mes !== mes || m.ano !== anoAtual) return m;
      return { ...m, registros: m.registros.filter(r => r.id !== id) };
    }));
  }, []);

  const setMetaRefugo = useCallback(async (meta: number) => {
    await salvarConfig("meta_refugo", meta);
    setMetaRefugoState(meta);
    metaRef.current = meta;
  }, []);

  const adicionarMotivo = useCallback(async (motivo: string) => {
    if (!motivo.trim() || motivosRef.current.includes(motivo.trim())) return;
    const novos = ordenarMotivos([...motivosRef.current, motivo.trim()]);
    await salvarConfig("motivos", novos);
    setMotivosState(novos);
    motivosRef.current = novos;
  }, []);

  const removerMotivo = useCallback(async (motivo: string) => {
    const novos = motivosRef.current.filter(m => m !== motivo);
    await salvarConfig("motivos", novos);
    setMotivosState(novos);
    motivosRef.current = novos;
  }, []);

  // salvarTudo: recarrega do banco e sincroniza o estado local
  const salvarTudo = useCallback(async () => {
    try {
      const registros = await lerRegistros(anoAtual);
      setMeses(montarMeses(registros, anoAtual));
    } catch (err) {
      console.error("[DashboardContext] salvarTudo falhou:", err);
    }
  }, []);

  // ─── Derivados ─────────────────────────────────────────────────────────────

  const getMesData = useCallback((mes: number): MonthData =>
    meses.find(m => m.mes === mes && m.ano === anoAtual) ?? { mes, ano: anoAtual, registros: [] }
  , [meses]);

  const getTotaisMes = useCallback((mes: number) => {
    const d = getMesData(mes);
    const totalProducao = d.registros.reduce((s, r) => s + r.producao, 0);
    const totalRefugo   = d.registros.reduce((s, r) => s + r.refugo,   0);
    const total = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 };
  }, [getMesData]);

  const getTotaisAnuais = useCallback(() => {
    let totalProducao = 0, totalRefugo = 0;
    meses.forEach(m => m.registros.forEach(r => { totalProducao += r.producao; totalRefugo += r.refugo; }));
    const total = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 };
  }, [meses]);

  return (
    <DashboardContext.Provider value={{
      meses, mesAtual, anoAtual, metaRefugo, motivos, carregando,
      setMesAtual, adicionarRegistro, editarRegistro, excluirRegistro,
      setMetaRefugo, adicionarMotivo, removerMotivo,
      getMesData, getTotaisMes, getTotaisAnuais, salvarTudo,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
