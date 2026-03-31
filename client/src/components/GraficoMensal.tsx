// Design: Clean Manufacturing Dashboard
// Gráfico de barras empilhadas (produção + refugo) com linha de meta de % refugo

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

function formatData(data: string): string {
  const d = new Date(data + "T00:00:00");
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const producao = payload.find(p => p.name === "Produção")?.value || 0;
  const refugo = payload.find(p => p.name === "Refugo")?.value || 0;
  const total = producao + refugo;
  const pct = total > 0 ? (refugo / total) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            Produção
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {producao.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
            Refugo
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {refugo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="pt-1 border-t border-slate-100 flex justify-between gap-4">
          <span className="text-slate-500">% Refugo</span>
          <span className={`font-mono font-bold ${pct > 30 ? "text-red-600" : pct > 25 ? "text-amber-600" : "text-emerald-600"}`}>
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

  const dados = mesData.registros.map(r => {
    const total = r.producao + r.refugo;
    const pct = total > 0 ? (r.refugo / total) * 100 : 0;
    return {
      data: formatData(r.data),
      "Produção": parseFloat(r.producao.toFixed(2)),
      "Refugo": parseFloat(r.refugo.toFixed(2)),
      "% Refugo": parseFloat(pct.toFixed(2)),
    };
  });

  if (dados.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Produção vs. Refugo — {MESES_NOMES[mesAtual - 1]}</h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Nenhum dado registrado</p>
            <p className="text-xs text-slate-400 mt-1">Adicione registros diários para visualizar o gráfico</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Produção vs. Refugo</h3>
          <p className="text-xs text-slate-400">{MESES_NOMES[mesAtual - 1]} {anoAtual} — {dados.length} dia{dados.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
          <span className="w-3 h-0.5 bg-amber-500 inline-block border-t-2 border-dashed border-amber-500" />
          Meta: {metaRefugo}%
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="data"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toLocaleString("pt-BR")}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
            domain={[0, Math.max(100, ...dados.map(d => d["% Refugo"]) )]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            formatter={(value) => <span className="text-slate-600">{value}</span>}
          />
          <Bar yAxisId="left" dataKey="Produção" fill="#1e40af" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar yAxisId="left" dataKey="Refugo" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="% Refugo"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 5 }}
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
  );
}
