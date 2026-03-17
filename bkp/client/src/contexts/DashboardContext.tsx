import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DailyRecord, MonthData, DADOS_INICIAIS, META_REFUGO_PERCENT } from "@/lib/initialData";

const STORAGE_KEY = "dashboard-refugo-2026";
const META_STORAGE_KEY = "dashboard-refugo-meta";
const MOTIVOS_STORAGE_KEY = "dashboard-refugo-motivos";

interface DashboardContextType {
  meses: MonthData[];
  mesAtual: number;
  anoAtual: number;
  metaRefugo: number;
  motivos: string[];
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

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [meses, setMeses] = useState<MonthData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DADOS_INICIAIS;
  });

  const [mesAtual, setMesAtual] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });

  const [anoAtual] = useState<number>(2026);

  const [metaRefugo, setMetaRefugoState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(META_STORAGE_KEY);
      if (saved) return parseFloat(saved);
    } catch {
      // ignore
    }
    return META_REFUGO_PERCENT;
  });

  const [motivos, setMotivosState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MOTIVOS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      "Defeito de fabricação",
      "Material inadequado",
      "Dimensões incorretas",
      "Acabamento deficiente",
      "Problemas de montagem",
      "Dano no transporte",
      "Falha de qualidade",
      "Outros"
    ];
  });

  // Persistir dados no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meses));
  }, [meses]);

  useEffect(() => {
    localStorage.setItem(MOTIVOS_STORAGE_KEY, JSON.stringify(motivos));
  }, [motivos]);

  const setMetaRefugo = useCallback((meta: number) => {
    setMetaRefugoState(meta);
    localStorage.setItem(META_STORAGE_KEY, meta.toString());
  }, []);

  const getMesData = useCallback((mes: number): MonthData => {
    return meses.find(m => m.mes === mes && m.ano === anoAtual) || {
      mes,
      ano: anoAtual,
      registros: []
    };
  }, [meses, anoAtual]);

  const adicionarRegistro = useCallback((mes: number, registro: Omit<DailyRecord, "id">) => {
    setMeses(prev => prev.map(m => {
      if (m.mes === mes && m.ano === anoAtual) {
        const novoRegistro: DailyRecord = { ...registro, id: gerarId() };
        const registros = [...m.registros, novoRegistro].sort((a, b) =>
          new Date(a.data).getTime() - new Date(b.data).getTime()
        );
        return { ...m, registros };
      }
      return m;
    }));
  }, [anoAtual]);

  const editarRegistro = useCallback((mes: number, id: string, dados: Omit<DailyRecord, "id">) => {
    setMeses(prev => prev.map(m => {
      if (m.mes === mes && m.ano === anoAtual) {
        const registros = m.registros.map(r =>
          r.id === id ? { ...dados, id } : r
        ).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
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
    const totalProducao = mesData.registros.reduce((sum, r) => sum + r.producao, 0);
    const totalRefugo = mesData.registros.reduce((sum, r) => sum + r.refugo, 0);
    const total = totalProducao + totalRefugo;
    const percentRefugo = total > 0 ? (totalRefugo / total) * 100 : 0;
    return { totalProducao, totalRefugo, total, percentRefugo };
  }, [getMesData]);

  const getTotaisAnuais = useCallback(() => {
    let totalProducao = 0;
    let totalRefugo = 0;
    meses.forEach(m => {
      m.registros.forEach(r => {
        totalProducao += r.producao;
        totalRefugo += r.refugo;
      });
    });
    const total = totalProducao + totalRefugo;
    const percentRefugo = total > 0 ? (totalRefugo / total) * 100 : 0;
    return { totalProducao, totalRefugo, total, percentRefugo };
  }, [meses]);

  const adicionarMotivo = useCallback((motivo: string) => {
    if (!motivo.trim() || motivos.includes(motivo)) return;
    setMotivosState([...motivos, motivo.trim()]);
  }, [motivos]);

  const removerMotivo = useCallback((motivo: string) => {
    setMotivosState(prev => prev.filter(m => m !== motivo));
  }, []);

  return (
    <DashboardContext.Provider value={{
      meses,
      mesAtual,
      anoAtual,
      metaRefugo,
      motivos,
      setMesAtual,
      adicionarRegistro,
      editarRegistro,
      excluirRegistro,
      setMetaRefugo,
      adicionarMotivo,
      removerMotivo,
      getMesData,
      getTotaisMes,
      getTotaisAnuais,
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
