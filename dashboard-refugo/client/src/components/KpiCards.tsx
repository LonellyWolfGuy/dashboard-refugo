// Design: Clean Manufacturing Dashboard
// Cards de KPI com indicadores coloridos automáticos e mini-tendências

import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Package, AlertTriangle, CheckCircle, Target } from "lucide-react";

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  cor: "azul" | "verde" | "amarelo" | "vermelho" | "cinza";
  icone: React.ReactNode;
  tendencia?: "up" | "down" | "neutral";
  tendenciaValor?: string;
}

function KpiCard({ titulo, valor, subtitulo, cor, icone, tendencia, tendenciaValor }: KpiCardProps) {
  const cores = {
    azul: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-900",
      titulo: "text-blue-700",
      valor: "text-blue-900",
    },
    verde: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-600",
      titulo: "text-emerald-700",
      valor: "text-emerald-800",
    },
    amarelo: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      titulo: "text-amber-700",
      valor: "text-amber-800",
    },
    vermelho: {
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-600",
      titulo: "text-red-700",
      valor: "text-red-800",
    },
    cinza: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      iconBg: "bg-slate-500",
      titulo: "text-slate-600",
      valor: "text-slate-700",
    },
  };

  const c = cores[cor];

  return (
    <div className={cn(
      "rounded-xl border p-4 flex flex-col gap-3",
      c.bg, c.border
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.iconBg)}>
          <div className="text-white w-4 h-4">{icone}</div>
        </div>
        {tendencia && tendenciaValor && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            tendencia === "up" ? "bg-red-100 text-red-600" :
            tendencia === "down" ? "bg-emerald-100 text-emerald-600" :
            "bg-slate-100 text-slate-500"
          )}>
            {tendencia === "up" ? <TrendingUp className="w-3 h-3" /> :
             tendencia === "down" ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {tendenciaValor}
          </div>
        )}
      </div>
      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", c.titulo)}>{titulo}</p>
        <p className={cn("text-2xl font-bold font-mono", c.valor)}>{valor}</p>
        {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  );
}

export default function KpiCards() {
  const { mesAtual, getTotaisMes, metaRefugo, meses } = useDashboard();
  const totais = getTotaisMes(mesAtual);

  // Calcular tendência em relação ao mês anterior
  const mesPrevio = mesAtual > 1 ? mesAtual - 1 : null;
  const totaisPrevios = mesPrevio ? getTotaisMes(mesPrevio) : null;

  let tendenciaPercent: "up" | "down" | "neutral" = "neutral";
  let tendenciaValorStr = "";
  if (totaisPrevios && totaisPrevios.percentRefugo > 0 && totais.percentRefugo > 0) {
    const diff = totais.percentRefugo - totaisPrevios.percentRefugo;
    if (Math.abs(diff) > 0.1) {
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

  const iconePercent = totais.percentRefugo === 0 ? <Target className="w-4 h-4" /> :
    totais.percentRefugo <= metaRefugo ? <CheckCircle className="w-4 h-4" /> :
    <AlertTriangle className="w-4 h-4" />;

  const diasRegistrados = meses.find(m => m.mes === mesAtual)?.registros.length || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        titulo="Produção Total"
        valor={formatNum(totais.totalProducao, 0)}
        subtitulo={`${diasRegistrados} dia${diasRegistrados !== 1 ? "s" : ""} registrado${diasRegistrados !== 1 ? "s" : ""}`}
        cor="azul"
        icone={<Package className="w-4 h-4" />}
      />
      <KpiCard
        titulo="Total Refugo"
        valor={formatNum(totais.totalRefugo, 0)}
        subtitulo="unidades refugadas"
        cor={totais.totalRefugo === 0 ? "cinza" : "vermelho"}
        icone={<AlertTriangle className="w-4 h-4" />}
      />
      <KpiCard
        titulo="Total Geral"
        valor={formatNum(totais.total, 0)}
        subtitulo="produção + refugo"
        cor="cinza"
        icone={<Package className="w-4 h-4" />}
      />
      <KpiCard
        titulo="% Refugo"
        valor={totais.percentRefugo > 0 ? `${totais.percentRefugo.toFixed(2)}%` : "—"}
        subtitulo={`Meta: ≤ ${metaRefugo}%`}
        cor={corPercent}
        icone={iconePercent}
        tendencia={tendenciaPercent !== "neutral" ? tendenciaPercent : undefined}
        tendenciaValor={tendenciaValorStr || undefined}
      />
    </div>
  );
}
