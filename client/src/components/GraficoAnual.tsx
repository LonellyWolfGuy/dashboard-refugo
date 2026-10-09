// Design: Clean Manufacturing Dashboard
// Gráfico de barras agrupadas mostrando % refugo por mês ao longo do ano com dark mode

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_ABREV } from "@/lib/initialData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  metaRefugo: number;
}

function CustomTooltip({ active, payload, label, metaRefugo }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
  if (val === undefined || val === 0) return null;
  const dentro = val <= metaRefugo;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p
        className={`font-mono font-bold text-sm mt-0.5 ${
          dentro ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {val.toFixed(2)}% refugo
      </p>
      <span className="text-[10px] text-slate-400">
        {dentro ? "✓ Dentro da meta" : "⚠ Acima da meta"}
      </span>
    </div>
  );
}

export default function GraficoAnual() {
  const { anoAtual, getTotaisMes, metaRefugo } = useDashboard();

  const dados = useMemo(() => {
    return MESES_ABREV.map((nome, idx) => {
      const mes = idx + 1;
      const totais = getTotaisMes(mes);
      return {
        mes: nome,
        "% Refugo": totais.percentRefugo > 0 ? parseFloat(totais.percentRefugo.toFixed(2)) : 0,
      };
    });
  }, [getTotaisMes]);

  const temDados = useMemo(() => dados.some((d) => d["% Refugo"] > 0), [dados]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Comparativo Anual
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            % de Refugo dos 12 meses de {anoAtual}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900/50 font-semibold">
          <span className="w-2.5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
          Meta: ≤ {metaRefugo}%
        </div>
      </div>

      {!temDados ? (
        <div className="h-56 flex items-center justify-center text-slate-400">
          <p className="text-sm">Sem dados anuais registrados para {anoAtual}</p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip metaRefugo={metaRefugo} />} />
              <ReferenceLine
                y={metaRefugo}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Bar dataKey="% Refugo" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {dados.map((entry, index) => {
                  const val = entry["% Refugo"];
                  let color = "#e2e8f0";
                  if (val > 0) {
                    if (val <= metaRefugo * 0.8) color = "#10b981";
                    else if (val <= metaRefugo) color = "#f59e0b";
                    else color = "#ef4444";
                  }
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
