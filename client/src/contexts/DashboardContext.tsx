import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DailyRecord, MonthData, DADOS_INICIAIS, META_REFUGO_PERCENT } from "@/lib/initialData";

interface DashboardContextType {
  meses: MonthData[];
  mesAtual: number;
  anoAtual: number;
  metaRefugo: number;
  motivos: string[];
  carregando: boolean;
  setMesAtual: (mes: number) => void;
  adicionarRegistro: (mes: number, registro: Omit<DailyRecord, "id">) => void;
  editarRegistro: (mes: number, id: string, dados: Omit<DailyRecord, "id">) => void;
  excluirRegistro: (mes: number, id: string) => void;
  setMetaRefugo: (meta: number) => void;
  adicionarMotivo: (motivo: string) => void;
  removerMotivo: (motivo: string) => void;
  getMesData: (mes: number) => MonthData;
  getTotaisMes: (mes: number) => { totalProducao: number; totalRefugo: number; total: number; percentRefugo: number };
  getTotaisAnuais: () => { totalProducao: number; totalRefugo: number; total: number; percentRefugo: number };
}

const DashboardContext = createContext<DashboardContextType | null>(null);

const MOTIVOS_PADRAO = [
  "Defeito de fabricação", "Material inadequado", "Dimensões incorretas",
  "Acabamento deficiente", "Problemas de montagem", "Dano no transporte",
  "Falha de qualidade", "Outros"
];

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function lerSupabase(key: string): Promise<unknown> {
  const { data, error } = await supabase.from("app_data").select("value").eq("key", key).single();
  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found (esperado na primeira execução)
    console.error(`[Supabase] Erro ao ler "${key}":`, error.message, error.code);
    throw new Error(error.message);
  }
  return data?.value ?? null;
}

async function salvarSupabase(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) {
    console.error(`[Supabase] Erro ao salvar "${key}":`, error.message, error.code);
    throw new Error(error.message);
  }
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [meses, setMeses] = useState<MonthData[]>(DADOS_INICIAIS);
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [anoAtual] = useState<number>(2026);
  const [metaRefugo, setMetaRefugoState] = useState<number>(META_REFUGO_PERCENT);
  const [motivos, setMotivosState] = useState<string[]>(MOTIVOS_PADRAO);
  const [carregando, setCarregando] = useState(true);

  // Ref que guarda se o carregamento inicial terminou E o estado foi aplicado
  const dadosCarregados = useRef(false);

  // Carrega dados do Supabase ao iniciar
  useEffect(() => {
    async function carregar() {
      try {
        const [dadosMeses, dadosConfig] = await Promise.all([
          lerSupabase("meses"),
          lerSupabase("config"),
        ]);

        if (Array.isArray(dadosMeses) && dadosMeses.length > 0) {
          setMeses(dadosMeses as MonthData[]);
        }
        if (dadosConfig && typeof dadosConfig === "object") {
          const c = dadosConfig as { metaRefugo?: number; motivos?: string[] };
          if (typeof c.metaRefugo === "number") setMetaRefugoState(c.metaRefugo);
          if (Array.isArray(c.motivos)) setMotivosState(c.motivos);
        }
      } catch (err) {
        console.warn("[DashboardContext] Carregamento do Supabase falhou, usando dados iniciais:", err);
      } finally {
        // Aguarda o próximo tick para garantir que os setStates acima foram aplicados
        // antes de habilitar os effects de persistência
        setTimeout(() => {
          dadosCarregados.current = true;
          setCarregando(false);
        }, 0);
      }
    }
    carregar();
  }, []);

  // Salva meses no Supabase sempre que mudam (após carregamento inicial)
  useEffect(() => {
    if (!dadosCarregados.current) return;
    salvarSupabase("meses", meses).catch((err) => {
      console.error("[DashboardContext] Falha ao persistir meses:", err);
    });
  }, [meses]);

  // Salva config no Supabase sempre que muda (após carregamento inicial)
  useEffect(() => {
    if (!dadosCarregados.current) return;
    salvarSupabase("config", { metaRefugo, motivos }).catch((err) => {
      console.error("[DashboardContext] Falha ao persistir config:", err);
    });
  }, [metaRefugo, motivos]);

  const setMetaRefugo = useCallback((meta: number) => setMetaRefugoState(meta), []);

  const getMesData = useCallback((mes: number): MonthData => {
    return meses.find(m => m.mes === mes && m.ano === anoAtual) || { mes, ano: anoAtual, registros: [] };
  }, [meses, anoAtual]);

  const adicionarRegistro = useCallback((mes: number, registro: Omit<DailyRecord, "id">) => {
    setMeses(prev => prev.map(m => {
      if (m.mes === mes && m.ano === anoAtual) {
        const novo: DailyRecord = { ...registro, id: gerarId() };
        const registros = [...m.registros, novo].sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
        );
        return { ...m, registros };
      }
      return m;
    }));
  }, [anoAtual]);

  const editarRegistro = useCallback((mes: number, id: string, dados: Omit<DailyRecord, "id">) => {
    setMeses(prev => prev.map(m => {
      if (m.mes === mes && m.ano === anoAtual) {
        const registros = m.registros
          .map(r => r.id === id ? { ...dados, id } : r)
          .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        return { ...m, registros };
      }
      return m;
    }));
  }, [anoAtual]);

  const excluirRegistro = useCallback((mes: number, id: string) => {
    setMeses(prev => prev.map(m => {
      if (m.mes === mes && m.ano === anoAtual) {
        return { ...m, registros: m.registros.filter(r => r.id !== id) };
      }
      return m;
    }));
  }, [anoAtual]);

  const getTotaisMes = useCallback((mes: number) => {
    const mesData = getMesData(mes);
    const totalProducao = mesData.registros.reduce((s, r) => s + r.producao, 0);
    const totalRefugo = mesData.registros.reduce((s, r) => s + r.refugo, 0);
    const total = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 };
  }, [getMesData]);

  const getTotaisAnuais = useCallback(() => {
    let totalProducao = 0, totalRefugo = 0;
    meses.forEach(m => m.registros.forEach(r => { totalProducao += r.producao; totalRefugo += r.refugo; }));
    const total = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 };
  }, [meses]);

  const adicionarMotivo = useCallback((motivo: string) => {
    if (!motivo.trim() || motivos.includes(motivo)) return;
    setMotivosState(prev => [...prev, motivo.trim()]);
  }, [motivos]);

  const removerMotivo = useCallback((motivo: string) => {
    setMotivosState(prev => prev.filter(m => m !== motivo));
  }, []);

  return (
    <DashboardContext.Provider value={{
      meses, mesAtual, anoAtual, metaRefugo, motivos, carregando,
      setMesAtual, adicionarRegistro, editarRegistro, excluirRegistro,
      setMetaRefugo, adicionarMotivo, removerMotivo,
      getMesData, getTotaisMes, getTotaisAnuais,
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
