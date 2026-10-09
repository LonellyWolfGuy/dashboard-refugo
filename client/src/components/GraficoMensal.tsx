// Design: Clean Manufacturing Dashboard
// Gráfico de barras empilhadas (produção + refugo) com linha de meta de % refugo e distinção de dias conformes

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CheckCircle2, AlertTriangle } from "lucide-react";

function formatData(data: string): string {
  const parts = data.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : data;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  metaRefugo: number;
}

function CustomTooltip({ active, payload, label, metaRefugo }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const producao = payload.find((p) => p.name === "Produção")?.value || 0;
  const refugo = payload.find((p) => p.name === "Refugo")?.value || 0;
  const total = producao + refugo;
  const pct = total > 0 ? (refugo / total) * 100 : 0;
  const dentroMeta = pct <= metaRefugo;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-3.5 text-xs">
      <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <p className="font-bold text-slate-800 dark:text-slate-100">{label}</p>
        <span
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            dentroMeta
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
          }`}
        >
          {dentroMeta ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {dentroMeta ? "Dentro da Meta" : "Fora da Meta"}
        </span>
      </div>
      <div className="space-y-1.5 font-mono">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-sans">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            Produção:
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {producao.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Kg
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-sans">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
            Refugo:
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {refugo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Kg
          </span>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
          <span className="text-slate-500 font-sans">% Refugo:</span>
          <span
            className={`font-bold ${
              pct <= metaRefugo * 0.8
                ? "text-emerald-600 dark:text-emerald-400"
                : pct <= metaRefugo
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {pct.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GraficoMensal() {
  const { mesAtual, anoAtual, getMesData, metaRefugo } = useDashboard();
  const mesData = getMesData(mesAtual);

  const dados = useMemo(() => {
    return mesData.registros.map((r) => {
      const total = r.producao + r.refugo;
      const pct = total > 0 ? (r.refugo / total) * 100 : 0;
      return {
        data: formatData(r.data),
        dataCompleta: r.data,
        Produção: parseFloat(r.producao.toFixed(2)),
        Refugo: parseFloat(r.refugo.toFixed(2)),
        "% Refugo": parseFloat(pct.toFixed(2)),
        dentroMeta: pct <= metaRefugo,
      };
    });
  }, [mesData.registros, metaRefugo]);

  const yDomain = useMemo(() => {
    const maxPct = Math.max(0, ...dados.map((d) => d["% Refugo"]));
    return [0, Math.max(metaRefugo * 1.5, Math.ceil(maxPct * 1.1))];
  }, [dados, metaRefugo]);

  // Contagem de dias conformes
  const totalDias = dados.length;
  const diasDentroMeta = dados.filter((d) => d.dentroMeta).length;
  const taxaConformidade = totalDias > 0 ? (diasDentroMeta / totalDias) * 100 : 0;

  if (dados.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Produção vs. Refugo — {MESES_NOMES[mesAtual - 1]}
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          <p className="text-sm">Nenhum dado registrado para este mês.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Evolução Diária de Produção e Refugo
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {MESES_NOMES[mesAtual - 1]} {anoAtual} &bull; {totalDias} dia{totalDias !== 1 ? "s" : ""} apontado{totalDias !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
              taxaConformidade >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
            }`}
          >
            <span>Conformidade: {taxaConformidade.toFixed(0)}% dos dias</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900/50 font-semibold">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
            Meta: ≤ {metaRefugo}%
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="data"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toLocaleString("pt-BR")} Kg`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={yDomain}
            />
            <Tooltip content={<CustomTooltip metaRefugo={metaRefugo} />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              formatter={(value) => (
                <span className="text-slate-600 dark:text-slate-300 font-medium">{value}</span>
              )}
            />
            <Bar yAxisId="left" dataKey="Produção" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={35} />
            <Bar yAxisId="left" dataKey="Refugo" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={35} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="% Refugo"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={({ cx, cy, payload }) => (
                <circle
                  key={`dot-${payload.dataCompleta}`}
                  cx={cx}
                  cy={cy}
                  r={payload.dentroMeta ? 3.5 : 4.5}
                  fill={payload.dentroMeta ? "#10b981" : "#ef4444"}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}
              activeDot={{ r: 6 }}
            />
            <ReferenceLine
              yAxisId="right"
              y={metaRefugo}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
