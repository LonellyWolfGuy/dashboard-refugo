// Design: Clean Manufacturing Dashboard
// Sidebar estreita com navegação por mês, indicadores de status e totais anuais

import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { BarChart3, Settings, TrendingDown, Factory } from "lucide-react";

interface SidebarProps {
  onOpenSettings: () => void;
}

function getStatusColor(percent: number, meta: number): string {
  if (percent === 0) return "bg-gray-200";
  if (percent <= meta * 0.8) return "bg-emerald-500";
  if (percent <= meta) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusTextColor(percent: number, meta: number): string {
  if (percent === 0) return "text-gray-400";
  if (percent <= meta * 0.8) return "text-emerald-600";
  if (percent <= meta) return "text-amber-600";
  return "text-red-600";
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const { mesAtual, setMesAtual, getTotaisMes, getTotaisAnuais, metaRefugo } = useDashboard();
  const totaisAnuais = getTotaisAnuais();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo / Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
        <img 
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663426607805/TdnUqJefUqzPEiCTQPUCvH/Logo-Implatec-Melhor-Qualidade-removebg-preview_39f348ff.png" 
          alt="Implatec" 
          className="h-12 w-auto mb-2"
        />
        <p className="text-xs font-semibold text-green-700 leading-tight">CONTROLE DE</p>
        <p className="text-xs font-bold text-green-700 leading-tight">REFUGO 2026</p>
      </div>

      {/* Totais Anuais */}
      <div className="px-4 py-4 border-b border-gray-200 bg-green-700">
        <p className="text-xs font-semibold text-green-100 uppercase tracking-wider mb-2">Acumulado Anual</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-green-100">Produção</span>
            <span className="text-xs font-mono font-semibold text-white">
              {totaisAnuais.totalProducao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-green-100">Refugo</span>
            <span className="text-xs font-mono font-semibold text-white">
              {totaisAnuais.totalRefugo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-green-600">
            <span className="text-xs font-semibold text-green-100">% Refugo</span>
            <span className={cn(
              "text-sm font-mono font-bold",
              totaisAnuais.percentRefugo === 0 ? "text-green-200" :
              totaisAnuais.percentRefugo <= metaRefugo * 0.8 ? "text-emerald-300" :
              totaisAnuais.percentRefugo <= metaRefugo ? "text-amber-300" : "text-red-300"
            )}>
              {totaisAnuais.percentRefugo.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Navegação por Mês */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Meses</p>
        {MESES_NOMES.map((nome, idx) => {
          const mes = idx + 1;
          const totais = getTotaisMes(mes);
          const temDados = totais.total > 0;
          const isAtivo = mesAtual === mes;

          return (
            <button
              key={mes}
              onClick={() => setMesAtual(mes)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-150",
                isAtivo
                  ? "bg-green-50 border-r-2 border-green-700"
                  : "hover:bg-gray-100 border-r-2 border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  temDados ? getStatusColor(totais.percentRefugo, metaRefugo) : "bg-slate-300"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  isAtivo ? "text-green-700" : "text-gray-600"
                )}>
                  {nome}
                </span>
              </div>
              {temDados && (
                <span className={cn(
                  "text-xs font-mono font-semibold",
                  getStatusTextColor(totais.percentRefugo, metaRefugo)
                )}>
                  {totais.percentRefugo.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>≤ {(metaRefugo * 0.8).toFixed(0)}% Ótimo</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>≤ {metaRefugo}% Meta</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>&gt; {metaRefugo}% Crítico</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="mt-2 w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurações
        </button>
      </div>
    </aside>
  );
}
