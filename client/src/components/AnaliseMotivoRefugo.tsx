import { useState, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { ordenarMotivos } from "@/services/refugoService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { BarChart3, PieChart as PieIcon, LineChart as ParetoIcon, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

// Paleta industrial harmoniosa
const PALETA = [
  "#dc2626", // Vermelho forte
  "#ea580c", // Laranja queimado
  "#f59e0b", // Âmbar
  "#0284c7", // Azul
  "#8b5cf6", // Roxo
  "#059669", // Esmeralda
  "#ec4899", // Rosa
  "#06b6d4", // Ciano
  "#64748b", // Ardósia
  "#d97706", // Ouro
];

function getCor(index: number): string {
  return PALETA[index % PALETA.length];
}

type TabTipo = "pareto" | "barras" | "pizza";

export default function AnaliseMotivoRefugo() {
  const { mesAtual, getMesData, motivos: motivosCadastrados } = useDashboard();
  const mesData = getMesData(mesAtual);
  const [tabAtiva, setTabAtiva] = useState<TabTipo>("pareto");

  // 1. Agrega quantidades por motivo a partir dos registros do mês
  const totais: Record<string, number> = {};
  mesData.registros.forEach((registro) => {
    (registro.motivos ?? []).forEach((m) => {
      totais[m.motivo] = (totais[m.motivo] || 0) + m.quantidade;
    });
  });

  const totalGeral = useMemo(
    () => Object.values(totais).reduce((s, v) => s + v, 0),
    [totais]
  );

  // 2. Ordena por quantidade DECRESCENTE (Fundamental para o Pareto)
  const motivosOrdenados = useMemo(() => {
    return Object.keys(totais)
      .filter((m) => totais[m] > 0)
      .sort((a, b) => totais[b] - totais[a]);
  }, [totais]);

  // 3. Monta dataset completo com valores, percentual e percentual acumulado
  const dadosPareto = useMemo(() => {
    let acumulado = 0;
    return motivosOrdenados.map((motivo, idx) => {
      const quantidade = totais[motivo];
      const pct = totalGeral > 0 ? (quantidade / totalGeral) * 100 : 0;
      acumulado += pct;
      return {
        motivo: motivo.length > 20 ? motivo.substring(0, 18) + "..." : motivo,
        motivoCompleto: motivo,
        quantidade: parseFloat(quantidade.toFixed(2)),
        pct: parseFloat(pct.toFixed(2)),
        pctAcumulado: parseFloat(Math.min(100, acumulado).toFixed(2)),
        cor: getCor(idx),
        is80Percent: acumulado - pct < 80, // Faz parte dos primeiros 80%
      };
    });
  }, [motivosOrdenados, totais, totalGeral]);

  // 4. Motivos que respondem pelos primeiros 80% do refugo (Regra de Pareto)
  const motivosCriticos = useMemo(() => {
    return dadosPareto.filter((d) => d.is80Percent);
  }, [dadosPareto]);

  const pctCriticos = useMemo(() => {
    if (motivosCriticos.length === 0) return 0;
    const ultimo = motivosCriticos[motivosCriticos.length - 1];
    return ultimo ? ultimo.pctAcumulado : 0;
  }, [motivosCriticos]);

  if (dadosPareto.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Análise de Motivos de Refugo
        </h3>
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
          <Target className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhum motivo de refugo registrado neste mês.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      {/* Cabeçalho com Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Análise de Motivos de Refugo</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
              {dadosPareto.length} causa{dadosPareto.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Identifique as principais causas de desperdício para ações corretivas
          </p>
        </div>

        {/* Botões de Seleção de Visualização (Pills) */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            onClick={() => setTabAtiva("pareto")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all",
              tabAtiva === "pareto"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <ParetoIcon className="w-3.5 h-3.5 text-red-500" />
            <span>Pareto (80/20)</span>
          </button>
          <button
            onClick={() => setTabAtiva("barras")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all",
              tabAtiva === "barras"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <span>Barras</span>
          </button>
          <button
            onClick={() => setTabAtiva("pizza")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all",
              tabAtiva === "pizza"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <PieIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Distribuição</span>
          </button>
        </div>
      </div>

      {/* Diagnóstico Rápido de Pareto 80/20 */}
      {motivosCriticos.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200/80 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Princípio de Pareto (Causas Críticas): </span>
            Apenas{" "}
            <strong>
              {motivosCriticos.length} motivo{motivosCriticos.length !== 1 ? "s" : ""}
            </strong>{" "}
            (
            {motivosCriticos.map((m) => `"${m.motivoCompleto}"`).join(", ")}
            ) concentram{" "}
            <strong className="underline decoration-amber-500 underline-offset-2">
              {pctCriticos.toFixed(1)}% de todas as perdas
            </strong>{" "}
            deste mês. Atuar prioritariamente sobre essas causas trará o maior impacto na redução de custos.
          </div>
        </div>
      )}

      {/* CONTEÚDO DA VISUALIZAÇÃO SELECIONADA */}
      {tabAtiva === "pareto" && (
        <div className="space-y-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dadosPareto}
                margin={{ top: 15, right: 25, left: 0, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="motivo"
                  angle={-25}
                  textAnchor="end"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                />
                <YAxis
                  yAxisId="kg"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toLocaleString("pt-BR")} Kg`}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                          {item.motivoCompleto}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Quantidade:</span>
                            <span className="font-mono font-bold text-red-600">
                              {item.quantidade.toLocaleString("pt-BR")} Kg
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Participação:</span>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {item.pct}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 font-semibold">% Acumulado:</span>
                            <span className="font-mono font-bold text-blue-600">
                              {item.pctAcumulado}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Linha de Referência dos 80% */}
                <ReferenceLine
                  yAxisId="pct"
                  y={80}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Linha 80% (Pareto)",
                    position: "insideTopRight",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                {/* Barras de Quantidade (Kg) */}
                <Bar yAxisId="kg" dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {dadosPareto.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is80Percent ? "#dc2626" : "#94a3b8"}
                    />
                  ))}
                </Bar>
                {/* Linha Curva Acumulada */}
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="pctAcumulado"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ fill: "#2563eb", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tabAtiva === "barras" && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosPareto} margin={{ top: 15, right: 20, left: 0, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="motivo"
                angle={-25}
                textAnchor="end"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toLocaleString("pt-BR")} Kg`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-3 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {item.motivoCompleto}
                      </p>
                      <p className="font-mono text-slate-700 dark:text-slate-300">
                        {item.quantidade.toLocaleString("pt-BR")} Kg ({item.pct}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {dadosPareto.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tabAtiva === "pizza" && (
        <div className="h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dadosPareto}
                dataKey="quantidade"
                nameKey="motivoCompleto"
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={45}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name.length > 14 ? name.substring(0, 12) + "…" : name} (${((percent || 0) * 100).toFixed(1)}%)`
                }
              >
                {dadosPareto.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString("pt-BR")} Kg`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela Resumo com Destaques */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Detalhamento Quantitativo por Motivo
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
          {dadosPareto.map((m) => (
            <div
              key={m.motivoCompleto}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all",
                m.is80Percent
                  ? "bg-red-50/40 border-red-200/80 dark:bg-red-950/20 dark:border-red-900/40"
                  : "bg-slate-50/60 border-slate-200/70 dark:bg-slate-800/40 dark:border-slate-800"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: m.cor }}
                />
                <span
                  className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                  title={m.motivoCompleto}
                >
                  {m.motivoCompleto}
                </span>
                {m.is80Percent && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    80/20
                  </span>
                )}
              </div>
              <div className="text-right flex-shrink-0 font-mono">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {m.quantidade.toLocaleString("pt-BR")} Kg
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                  ({m.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
