// Design: Clean Manufacturing Dashboard
// Sidebar estreita com navegação por mês, indicadores de status e totais anuais (suporte a dark mode)

import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";

interface SidebarProps {
  onOpenSettings: () => void;
}

function getStatusColor(percent: number, meta: number): string {
  if (percent === 0) return "bg-slate-300 dark:bg-slate-700";
  if (percent <= meta * 0.8) return "bg-emerald-500";
  if (percent <= meta) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusTextColor(percent: number, meta: number): string {
  if (percent === 0) return "text-slate-400";
  if (percent <= meta * 0.8) return "text-emerald-600 dark:text-emerald-400";
  if (percent <= meta) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const { mesAtual, setMesAtual, anoAtual, getTotaisMes, getTotaisAnuais, metaRefugo } = useDashboard();
  const totaisAnuais = getTotaisAnuais();

  return (
    <aside className="w-56 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
      {/* Logo / Header */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50/70 to-white dark:from-slate-900 dark:to-slate-900">
        <img
          src="/logo.png"
          alt="Implatec"
          className="h-11 w-auto max-w-full object-contain mb-2"
        />
        <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 leading-tight tracking-wider">
          CONTROLE DE
        </p>
        <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 leading-tight">
          REFUGO {anoAtual}
        </p>
      </div>

      {/* Totais Anuais */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-emerald-800 dark:bg-emerald-950/70 text-white">
        <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
          Acumulado Anual ({anoAtual})
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-200">Produção:</span>
            <span className="font-mono font-bold text-white">
              {totaisAnuais.totalProducao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} Kg
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-200">Refugo:</span>
            <span className="font-mono font-bold text-white">
              {totaisAnuais.totalRefugo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} Kg
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-emerald-700/80">
            <span className="text-xs font-semibold text-emerald-200">% Refugo:</span>
            <span
              className={cn(
                "text-sm font-mono font-extrabold",
                totaisAnuais.percentRefugo === 0
                  ? "text-emerald-200"
                  : totaisAnuais.percentRefugo <= metaRefugo * 0.8
                  ? "text-emerald-300"
                  : totaisAnuais.percentRefugo <= metaRefugo
                  ? "text-amber-300"
                  : "text-red-300"
              )}
            >
              {totaisAnuais.percentRefugo.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Navegação por Mês */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Meses
        </p>
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
                "w-full flex items-center justify-between px-4 py-2 text-left transition-all duration-150 text-xs",
                isAtivo
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-r-3 border-emerald-600 font-bold text-emerald-900 dark:text-emerald-200"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/60 border-r-3 border-transparent text-slate-600 dark:text-slate-400 font-medium"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    temDados ? getStatusColor(totais.percentRefugo, metaRefugo) : "bg-slate-300 dark:bg-slate-700"
                  )}
                />
                <span className={cn(isAtivo && "text-emerald-800 dark:text-emerald-300")}>{nome}</span>
              </div>
              {temDados && (
                <span className={cn("font-mono font-semibold text-[11px]", getStatusTextColor(totais.percentRefugo, metaRefugo))}>
                  {totais.percentRefugo.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>≤ {(metaRefugo * 0.8).toFixed(0)}% Ótimo</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>≤ {metaRefugo}% Meta</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span>&gt; {metaRefugo}% Crítico</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="mt-2 w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurações
        </button>
      </div>
    </aside>
  );
}
