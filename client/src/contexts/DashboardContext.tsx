import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DailyRecord, MonthData, META_REFUGO_PERCENT } from "@/lib/initialData";
import * as refugoService from "@/services/refugoService";

interface DashboardContextType {
  meses: MonthData[];
  mesAtual: number;
  anoAtual: number;
  metaRefugo: number;
  motivos: string[];
  carregando: boolean;
  setMesAtual: (mes: number) => void;
  setAnoAtual: (ano: number) => void;
  adicionarRegistro: (mes: number, ano: number, registro: Omit<DailyRecord, "id">) => Promise<void>;
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

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const queryClient = useQueryClient();

  // Load records for the current selected year
  const { data: registros = [], isLoading: carregandoRegistros } = useQuery({
    queryKey: ["registros", anoAtual],
    queryFn: () => refugoService.lerRegistros(anoAtual)
  });

  const { data: config, isLoading: carregandoConfig } = useQuery({
    queryKey: ["config"],
    queryFn: () => refugoService.lerConfig(),
    staleTime: Infinity,
  });

  const defaultConfig = useMemo(() => ({ metaRefugo: META_REFUGO_PERCENT, motivos: [] }), []);
  const mConfig = config || defaultConfig;
  const meses = React.useMemo(() => montarMeses(registros, anoAtual), [registros, anoAtual]);
  const carregando = carregandoRegistros || carregandoConfig;

  // Mutations com Optimistic Updates
  const addMutation = useMutation({
    mutationFn: ({ mes, ano, req }: any) => refugoService.inserirRegistro(mes, ano, req),
    onMutate: async ({ mes, ano, req }: any) => {
      await queryClient.cancelQueries({ queryKey: ["registros", ano] });
      const previous = queryClient.getQueryData<DailyRecord[]>(["registros", ano]);
      if (previous) {
        const tempRecord = { ...req, id: `temp-${Date.now()}` };
        queryClient.setQueryData<DailyRecord[]>(["registros", ano], old => [...(old || []), tempRecord]);
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["registros", variables.ano], context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["registros", variables.ano] });
      if (variables.ano !== anoAtual) {
        queryClient.invalidateQueries({ queryKey: ["registros", anoAtual] });
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, req }: any) => refugoService.atualizarRegistro(id, req),
    onMutate: async ({ id, req }: any) => {
      await queryClient.cancelQueries({ queryKey: ["registros", anoAtual] });
      const previous = queryClient.getQueryData<DailyRecord[]>(["registros", anoAtual]);
      if (previous) {
        queryClient.setQueryData<DailyRecord[]>(["registros", anoAtual], old => 
          (old || []).map(r => r.id === id ? { ...r, ...req } : r)
        );
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["registros", anoAtual], context.previous);
      }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["registros", anoAtual] }) },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => refugoService.deletarRegistro(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["registros", anoAtual] });
      const previous = queryClient.getQueryData<DailyRecord[]>(["registros", anoAtual]);
      if (previous) {
        queryClient.setQueryData<DailyRecord[]>(["registros", anoAtual], old => 
          (old || []).filter(r => r.id !== id)
        );
      }
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["registros", anoAtual], context.previous);
      }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["registros", anoAtual] }) },
  });

  const configMutation = useMutation({
    mutationFn: ({ chave, valor }: any) => refugoService.salvarConfig(chave, valor),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config"] }) },
  });

  const adicionarRegistro = useCallback(async (mes: number, ano: number, registro: Omit<DailyRecord, "id">) => {
    await addMutation.mutateAsync({ mes, ano, req: registro });
  }, [addMutation]);

  const editarRegistro = useCallback(async (_mes: number, id: string, dados: Omit<DailyRecord, "id">) => {
    await editMutation.mutateAsync({ id, req: dados });
  }, [editMutation]);

  const excluirRegistro = useCallback(async (_mes: number, id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const setMetaRefugo = useCallback(async (meta: number) => {
    await configMutation.mutateAsync({ chave: "meta_refugo", valor: meta });
  }, [configMutation]);

  const adicionarMotivo = useCallback(async (motivo: string) => {
    if (!motivo.trim() || mConfig.motivos.includes(motivo.trim())) return;
    const novos = refugoService.ordenarMotivos([...mConfig.motivos, motivo.trim()]);
    await configMutation.mutateAsync({ chave: "motivos", valor: novos });
  }, [mConfig.motivos, configMutation]);

  const removerMotivo = useCallback(async (motivo: string) => {
    const novos = mConfig.motivos.filter(m => m !== motivo);
    await configMutation.mutateAsync({ chave: "motivos", valor: novos });
  }, [mConfig.motivos, configMutation]);

  const salvarTudo = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["registros", anoAtual] });
  }, [queryClient, anoAtual]);

  const getMesData = useCallback((mes: number): MonthData =>
    meses.find(m => m.mes === mes && m.ano === anoAtual) ?? { mes, ano: anoAtual, registros: [] }
  , [meses, anoAtual]);

  const totaisMensaisMemo = React.useMemo(() => {
    const mapa = new Map<number, { totalProducao: number; totalRefugo: number; total: number; percentRefugo: number }>();
    for (const m of meses) {
      const totalProducao = m.registros.reduce((s, r) => s + r.producao, 0);
      const totalRefugo   = m.registros.reduce((s, r) => s + r.refugo,   0);
      const total = totalProducao + totalRefugo;
      mapa.set(m.mes, { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 });
    }
    return mapa;
  }, [meses]);

  const getTotaisMes = useCallback((mes: number) => {
    return totaisMensaisMemo.get(mes) ?? { totalProducao: 0, totalRefugo: 0, total: 0, percentRefugo: 0 };
  }, [totaisMensaisMemo]);

  const totaisAnuaisMemo = React.useMemo(() => {
    let totalProducao = 0, totalRefugo = 0;
    meses.forEach(m => m.registros.forEach(r => { totalProducao += r.producao; totalRefugo += r.refugo; }));
    const total = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, total, percentRefugo: total > 0 ? (totalRefugo / total) * 100 : 0 };
  }, [meses]);

  const getTotaisAnuais = useCallback(() => totaisAnuaisMemo, [totaisAnuaisMemo]);

  const providerValue = useMemo(() => ({
    meses, mesAtual, anoAtual, metaRefugo: mConfig.metaRefugo, motivos: mConfig.motivos, carregando,
    setMesAtual, setAnoAtual, adicionarRegistro, editarRegistro, excluirRegistro,
    setMetaRefugo, adicionarMotivo, removerMotivo,
    getMesData, getTotaisMes, getTotaisAnuais, salvarTudo,
  }), [
    meses, mesAtual, anoAtual, mConfig.metaRefugo, mConfig.motivos, carregando,
    setMesAtual, setAnoAtual, adicionarRegistro, editarRegistro, excluirRegistro,
    setMetaRefugo, adicionarMotivo, removerMotivo,
    getMesData, getTotaisMes, getTotaisAnuais, salvarTudo,
  ]);

  return (
    <DashboardContext.Provider value={providerValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
