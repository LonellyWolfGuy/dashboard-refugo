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
  salvando: boolean;
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
  salvarTudo: () => Promise<void>;
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

// Estrutura vazia de meses — usada como estado inicial NEUTRO.
// NUNCA contém registros, para não sobrescrever dados do Supabase.
const MESES_VAZIOS: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
  mes: i + 1,
  ano: 2026,
  registros: [],
}));

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial VAZIO — os dados reais sempre vêm do Supabase.
  // DADOS_INICIAIS é mantido no initialData.ts apenas como referência/seed manual,
  // nunca é usado como estado padrão para evitar sobrescrever dados do banco.
  const [meses, setMeses] = useState<MonthData[]>(MESES_VAZIOS);
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [anoAtual] = useState<number>(2026);
  const [metaRefugo, setMetaRefugoState] = useState<number>(META_REFUGO_PERCENT);
  const [motivos, setMotivosState] = useState<string[]>(MOTIVOS_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Refs espelham o estado atual para persistência instantânea sem closures stale.
  const mesesRef = useRef<MonthData[]>(MESES_VAZIOS);
  const metaRefugoRef = useRef<number>(META_REFUGO_PERCENT);
  const motivosRef = useRef<string[]>(MOTIVOS_PADRAO);

  // CRÍTICO: só permite saves após carregamento bem-sucedido do Supabase.
  // Permanece false se o carregamento falhar — impede sobrescrever dados com estado vazio.
  const podeSalvar = useRef(false);

  // ─── Carregamento inicial ──────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      try {
        const [dadosMeses, dadosConfig] = await Promise.all([
          lerSupabase("meses"),
          lerSupabase("config"),
        ]);

        if (Array.isArray(dadosMeses) && dadosMeses.length > 0) {
          // Supabase tem dados — usa eles
          setMeses(dadosMeses as MonthData[]);
          mesesRef.current = dadosMeses as MonthData[];
        } else {
          // Primeira execução: banco vazio — salva os dados iniciais UMA VEZ
          console.info("[DashboardContext] Banco vazio. Populando com DADOS_INICIAIS.");
          setMeses(DADOS_INICIAIS);
          mesesRef.current = DADOS_INICIAIS;
          await salvarSupabase("meses", DADOS_INICIAIS);
        }

        if (dadosConfig && typeof dadosConfig === "object") {
          const c = dadosConfig as { metaRefugo?: number; motivos?: string[] };
          if (typeof c.metaRefugo === "number") {
            setMetaRefugoState(c.metaRefugo);
            metaRefugoRef.current = c.metaRefugo;
          }
          if (Array.isArray(c.motivos)) {
            setMotivosState(c.motivos);
            motivosRef.current = c.motivos;
          }
        }

        // Habilita saves SOMENTE após carregamento bem-sucedido
        podeSalvar.current = true;
      } catch (err) {
        // Supabase falhou — NÃO habilita saves para não sobrescrever dados reais
        console.error("[DashboardContext] Falha no carregamento do Supabase:", err);
        console.warn("[DashboardContext] Saves desabilitados para proteger dados do banco.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // ─── Helpers de persistência (com guard) ──────────────────────────────────
  function persistirMeses(novosMeses: MonthData[]) {
    if (!podeSalvar.current) return; // guard: não salva antes do carregamento OK
    salvarSupabase("meses", novosMeses).catch((err) =>
      console.error("[DashboardContext] Falha ao persistir meses:", err)
    );
  }

  function persistirConfig(novaMeta: number, novosMotivos: string[]) {
    if (!podeSalvar.current) return;
    salvarSupabase("config", { metaRefugo: novaMeta, motivos: novosMotivos }).catch((err) =>
      console.error("[DashboardContext] Falha ao persistir config:", err)
    );
  }

  // ─── salvarTudo: flush garantido no logout ─────────────────────────────────
  const salvarTudo = useCallback(async (): Promise<void> => {
    if (!podeSalvar.current) return;
    setSalvando(true);
    try {
      await Promise.all([
        salvarSupabase("meses", mesesRef.current),
        salvarSupabase("config", {
          metaRefugo: metaRefugoRef.current,
          motivos: motivosRef.current,
        }),
      ]);
    } finally {
      setSalvando(false);
    }
  }, []);

  // ─── Ações ─────────────────────────────────────────────────────────────────
  const setMetaRefugo = useCallback((meta: number) => {
    setMetaRefugoState(meta);
    metaRefugoRef.current = meta;
    persistirConfig(meta, motivosRef.current);
  }, []);

  const getMesData = useCallback((mes: number): MonthData => {
    return mesesRef.current.find(m => m.mes === mes && m.ano === anoAtual)
      || { mes, ano: anoAtual, registros: [] };
  }, [anoAtual]);

  const adicionarRegistro = useCallback((mes: number, registro: Omit<DailyRecord, "id">) => {
    setMeses(prev => {
      const novo: DailyRecord = { ...registro, id: gerarId() };
      const atualizado = prev.map(m => {
        if (m.mes === mes && m.ano === anoAtual) {
          const registros = [...m.registros, novo].sort(
            (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
          );
          return { ...m, registros };
        }
        return m;
      });
      mesesRef.current = atualizado;
      persistirMeses(atualizado);
      return atualizado;
    });
  }, [anoAtual]);

  const editarRegistro = useCallback((mes: number, id: string, dados: Omit<DailyRecord, "id">) => {
    setMeses(prev => {
      const atualizado = prev.map(m => {
        if (m.mes === mes && m.ano === anoAtual) {
          const registros = m.registros
            .map(r => r.id === id ? { ...dados, id } : r)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
          return { ...m, registros };
        }
        return m;
      });
      mesesRef.current = atualizado;
      persistirMeses(atualizado);
      return atualizado;
    });
  }, [anoAtual]);

  const excluirRegistro = useCallback((mes: number, id: string) => {
    setMeses(prev => {
      const atualizado = prev.map(m => {
        if (m.mes === mes && m.ano === anoAtual) {
          return { ...m, registros: m.registros.filter(r => r.id !== id) };
        }
        return m;
      });
      mesesRef.current = atualizado;
      persistirMeses(atualizado);
      return atualizado;
    });
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
    if (!motivo.trim() || motivosRef.current.includes(motivo)) return;
    const novosMotivos = [...motivosRef.current, motivo.trim()];
    setMotivosState(novosMotivos);
    motivosRef.current = novosMotivos;
    persistirConfig(metaRefugoRef.current, novosMotivos);
  }, []);

  const removerMotivo = useCallback((motivo: string) => {
    const novosMotivos = motivosRef.current.filter(m => m !== motivo);
    setMotivosState(novosMotivos);
    motivosRef.current = novosMotivos;
    persistirConfig(metaRefugoRef.current, novosMotivos);
  }, []);

  return (
    <DashboardContext.Provider value={{
      meses, mesAtual, anoAtual, metaRefugo, motivos, carregando, salvando,
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
