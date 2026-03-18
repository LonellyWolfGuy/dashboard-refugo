// Design: Clean Manufacturing Dashboard
// Gráfico de barras agrupadas mostrando % refugo por mês ao longo do ano

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
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
  if (val === undefined || val === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="font-mono font-bold text-slate-800 mt-1">{val.toFixed(2)}%</p>
    </div>
  );
}

export default function GraficoAnual() {
  const { getTotaisMes, metaRefugo } = useDashboard();

  const dados = MESES_ABREV.map((nome, idx) => {
    const mes = idx + 1;
    const totais = getTotaisMes(mes);
    return {
      mes: nome,
      "% Refugo": totais.percentRefugo > 0 ? parseFloat(totais.percentRefugo.toFixed(2)) : 0,
    };
  });

  const temDados = dados.some(d => d["% Refugo"] > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Evolução Anual — % Refugo</h3>
          <p className="text-xs text-slate-400">Comparativo mensal 2026</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
          Meta: {metaRefugo}%
        </div>
      </div>
      {!temDados ? (
        <div className="h-48 flex items-center justify-center text-slate-400">
          <p className="text-sm">Sem dados anuais disponíveis</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={metaRefugo}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Bar dataKey="% Refugo" radius={[4, 4, 0, 0]} maxBarSize={36}>
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
      )}
    </div>
  );
}
