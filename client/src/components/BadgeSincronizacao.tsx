import { memo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Database, CheckCircle2 } from "lucide-react";

export const BadgeSincronizacao = memo(function BadgeSincronizacao() {
  const { ultimaSync } = useDashboard();

  if (!ultimaSync || !ultimaSync.timestamp) {
    return null;
  }

  const syncDate = new Date(ultimaSync.timestamp);
  const hoje = new Date();
  const ehHoje =
    syncDate.getDate() === hoje.getDate() &&
    syncDate.getMonth() === hoje.getMonth() &&
    syncDate.getFullYear() === hoje.getFullYear();

  const horaFormatada = syncDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const textoDisplay = ehHoje
    ? `Protheus: Hoje às ${horaFormatada}`
    : `Protheus: ${syncDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${horaFormatada}`;

  const tooltipInfo = [
    `Última coleta Protheus: ${syncDate.toLocaleString("pt-BR")}`,
    `Status: ${ultimaSync.status === "sucesso" ? "Sucesso ✓" : ultimaSync.status}`,
    ultimaSync.producao != null ? `Produção: ${ultimaSync.producao.toLocaleString("pt-BR")} Kg` : "",
    ultimaSync.refugo != null ? `Refugo: ${ultimaSync.refugo.toLocaleString("pt-BR")} Kg (${ultimaSync.pct_refugo || 0}%)` : "",
    "Agendamento automático: 07:00 e 18:00",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 text-emerald-800 text-xs transition-all hover:bg-emerald-100/80 cursor-help"
      title={tooltipInfo}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Database className="w-3.5 h-3.5 text-emerald-600" />
      <span className="font-medium tracking-tight">{textoDisplay}</span>
    </div>
  );
});

export default BadgeSincronizacao;
