// Design: Clean Manufacturing Dashboard
// Cards de KPI com indicadores coloridos automáticos, mini-tendências, barra de meta e destaques operacionais

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle2,
  Target,
  Trophy,
  Flame,
  Activity,
  Layers,
} from "lucide-react";

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDataCurta(dataStr: string): string {
  const parts = dataStr.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dataStr;
}

interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  unidade?: string;
  cor: "azul" | "verde" | "amarelo" | "vermelho" | "cinza";
  icone: React.ReactNode;
  tendencia?: "up" | "down" | "neutral";
  tendenciaValor?: string;
  metaProgresso?: {
    atual: number;
    meta: number;
  };
}

function KpiCard({
  titulo,
  valor,
  subtitulo,
  unidade,
  cor,
  icone,
  tendencia,
  tendenciaValor,
  metaProgresso,
}: KpiCardProps) {
  const cores = {
    azul: {
      bg: "bg-blue-50/70 dark:bg-blue-950/20",
      border: "border-blue-200/80 dark:border-blue-900/40",
      iconBg: "bg-blue-600 text-white shadow-blue-500/20",
      titulo: "text-blue-700 dark:text-blue-400",
      valor: "text-blue-950 dark:text-blue-100",
    },
    verde: {
      bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
      border: "border-emerald-200/80 dark:border-emerald-900/40",
      iconBg: "bg-emerald-600 text-white shadow-emerald-500/20",
      titulo: "text-emerald-700 dark:text-emerald-400",
      valor: "text-emerald-950 dark:text-emerald-100",
    },
    amarelo: {
      bg: "bg-amber-50/70 dark:bg-amber-950/20",
      border: "border-amber-200/80 dark:border-amber-900/40",
      iconBg: "bg-amber-500 text-white shadow-amber-500/20",
      titulo: "text-amber-700 dark:text-amber-400",
      valor: "text-amber-950 dark:text-amber-100",
    },
    vermelho: {
      bg: "bg-red-50/70 dark:bg-red-950/20",
      border: "border-red-200/80 dark:border-red-900/40",
      iconBg: "bg-red-600 text-white shadow-red-500/20",
      titulo: "text-red-700 dark:text-red-400",
      valor: "text-red-950 dark:text-red-100",
    },
    cinza: {
      bg: "bg-slate-50/80 dark:bg-slate-900/50",
      border: "border-slate-200/80 dark:border-slate-800",
      iconBg: "bg-slate-600 text-white shadow-slate-500/20",
      titulo: "text-slate-600 dark:text-slate-400",
      valor: "text-slate-900 dark:text-slate-100",
    },
  };

  const c = cores[cor];

  // Cálculo da barra de meta para o card de percentual
  let pctBarra = 0;
  let statusTexto = "";
  if (metaProgresso && metaProgresso.meta > 0) {
    pctBarra = Math.min(100, Math.max(0, (metaProgresso.atual / metaProgresso.meta) * 100));
    const folga = metaProgresso.meta - metaProgresso.atual;
    if (folga >= 0) {
      statusTexto = `Folga de +${folga.toFixed(1)}%`;
    } else {
      statusTexto = `Excedido em +${Math.abs(folga).toFixed(1)}%`;
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md",
        c.bg,
        c.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm", c.iconBg)}>
          {icone}
        </div>
        {tendencia && tendenciaValor && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
              tendencia === "up"
                ? "bg-red-100/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                : tendencia === "down"
                ? "bg-emerald-100/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
            )}
            title={
              tendencia === "up"
                ? "Aumento de refugo em relação ao mês anterior"
                : "Redução de refugo em relação ao mês anterior"
            }
          >
            {tendencia === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : tendencia === "down" ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {tendenciaValor}
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className={cn("text-[11px] font-bold uppercase tracking-wider", c.titulo)}>{titulo}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <p className={cn("text-2xl lg:text-3xl font-extrabold font-mono tabular-nums tracking-tight", c.valor)}>
            {valor}
          </p>
          {unidade && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{unidade}</span>}
        </div>

        {metaProgresso ? (
          <div className="mt-2.5 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{subtitulo}</span>
              <span className={metaProgresso.atual <= metaProgresso.meta ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {statusTexto}
              </span>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  metaProgresso.atual <= metaProgresso.meta * 0.8
                    ? "bg-emerald-500"
                    : metaProgresso.atual <= metaProgresso.meta
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, pctBarra)}%` }}
              />
            </div>
          </div>
        ) : (
          subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitulo}</p>
        )}
      </div>
    </div>
  );
}

export default function KpiCards() {
  const { mesAtual, getTotaisMes, metaRefugo, meses, getMesData } = useDashboard();
  const totais = getTotaisMes(mesAtual);
  const mesData = getMesData(mesAtual);

  // Calcular tendência em relação ao mês anterior
  const mesPrevio = mesAtual > 1 ? mesAtual - 1 : null;
  const totaisPrevios = mesPrevio ? getTotaisMes(mesPrevio) : null;

  let tendenciaPercent: "up" | "down" | "neutral" = "neutral";
  let tendenciaValorStr = "";
  if (totaisPrevios && totaisPrevios.percentRefugo > 0 && totais.percentRefugo > 0) {
    const diff = totais.percentRefugo - totaisPrevios.percentRefugo;
    if (Math.abs(diff) > 0.05) {
      tendenciaPercent = diff > 0 ? "up" : "down";
      tendenciaValorStr = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
    }
  }

  // Cor do card de % refugo baseada na meta
  let corPercent: "verde" | "amarelo" | "vermelho" | "cinza" = "cinza";
  if (totais.percentRefugo > 0) {
    if (totais.percentRefugo <= metaRefugo * 0.8) corPercent = "verde";
    else if (totais.percentRefugo <= metaRefugo) corPercent = "amarelo";
    else corPercent = "vermelho";
  }

  const iconePercent =
    totais.percentRefugo === 0 ? (
      <Target className="w-4 h-4" />
    ) : totais.percentRefugo <= metaRefugo ? (
      <CheckCircle2 className="w-4 h-4" />
    ) : (
      <AlertTriangle className="w-4 h-4" />
    );

  const diasComDados = mesData.registros.filter((r) => r.producao > 0 || r.refugo > 0);
  const diasRegistrados = diasComDados.length;

  // Cálculos de Inteligência Operacional (Melhor dia, Dia crítico, Médias)
  const { melhorDia, piorDia, mediaDiariaProd, mediaDiariaRef } = useMemo(() => {
    let melhor: { data: string; pct: number } | null = null;
    let pior: { data: string; pct: number } | null = null;

    diasComDados.forEach((r) => {
      const tot = r.producao + r.refugo;
      if (tot > 0) {
        const pct = (r.refugo / tot) * 100;
        if (!melhor || pct < melhor.pct) {
          melhor = { data: r.data, pct };
        }
        if (!pior || pct > pior.pct) {
          pior = { data: r.data, pct };
        }
      }
    });

    const mProd = diasRegistrados > 0 ? totais.totalProducao / diasRegistrados : 0;
    const mRef = diasRegistrados > 0 ? totais.totalRefugo / diasRegistrados : 0;

    return {
      melhorDia: melhor,
      piorDia: pior,
      mediaDiariaProd: mProd,
      mediaDiariaRef: mRef,
    };
  }, [diasComDados, diasRegistrados, totais.totalProducao, totais.totalRefugo]);

  return (
    <div className="space-y-3">
      {/* Grid Principal dos 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          titulo="Produção Total"
          valor={formatNum(totais.totalProducao, 0)}
          unidade="Kg"
          subtitulo={`${diasRegistrados} dia${diasRegistrados !== 1 ? "s" : ""} com apontamentos`}
          cor="azul"
          icone={<Package className="w-4 h-4" />}
        />
        <KpiCard
          titulo="Total Refugo"
          valor={formatNum(totais.totalRefugo, 0)}
          unidade="Kg"
          subtitulo={totais.totalRefugo > 0 ? "Perda acumulada no mês" : "Sem perdas registradas"}
          cor={totais.totalRefugo === 0 ? "cinza" : "vermelho"}
          icone={<AlertTriangle className="w-4 h-4" />}
        />
        <KpiCard
          titulo="Total Geral"
          valor={formatNum(totais.total, 0)}
          unidade="Kg"
          subtitulo="Volume processado total"
          cor="cinza"
          icone={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          titulo="% Refugo Mensal"
          valor={totais.percentRefugo > 0 ? `${totais.percentRefugo.toFixed(2)}%` : "—"}
          subtitulo={`Meta: ≤ ${metaRefugo}%`}
          cor={corPercent}
          icone={iconePercent}
          tendencia={tendenciaPercent !== "neutral" ? tendenciaPercent : undefined}
          tendenciaValor={tendenciaValorStr || undefined}
          metaProgresso={
            totais.percentRefugo > 0
              ? {
                  atual: totais.percentRefugo,
                  meta: metaRefugo,
                }
              : undefined
          }
        />
      </div>

      {/* Faixa de Insights Operacionais (Destaques do Mês) */}
      {diasRegistrados > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Card: Melhor Dia */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs">
            <div className="p-2 rounded-md bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Melhor Dia do Mês</p>
              <p className="font-mono text-emerald-800 dark:text-emerald-300 font-bold truncate">
                {melhorDia ? `${formatDataCurta((melhorDia as { data: string; pct: number }).data)}: ${(melhorDia as { data: string; pct: number }).pct.toFixed(2)}% refugo` : "—"}
              </p>
            </div>
          </div>

          {/* Card: Dia Crítico */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-red-200/70 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/40 text-xs">
            <div className="p-2 rounded-md bg-red-600/10 text-red-700 dark:text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Dia Mais Crítico</p>
              <p className="font-mono text-red-800 dark:text-red-300 font-bold truncate">
                {piorDia ? `${formatDataCurta((piorDia as { data: string; pct: number }).data)}: ${(piorDia as { data: string; pct: number }).pct.toFixed(2)}% refugo` : "—"}
              </p>
            </div>
          </div>

          {/* Card: Médias Diárias */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-blue-200/70 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 text-xs">
            <div className="p-2 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Médias Diárias Ativas</p>
              <p className="font-mono text-slate-800 dark:text-slate-200 font-semibold truncate">
                Prod: {formatNum(mediaDiariaProd, 0)} Kg &bull; Ref: {formatNum(mediaDiariaRef, 0)} Kg
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
