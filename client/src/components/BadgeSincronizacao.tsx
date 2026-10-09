import { useState, memo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  Database,
  CheckCircle2,
  Clock,
  Mail,
  Server,
  Layers,
  X,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const BadgeSincronizacao = memo(function BadgeSincronizacao() {
  const { ultimaSync } = useDashboard();
  const [modalAberto, setModalAberto] = useState(false);

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

  return (
    <>
      {/* Botão Badge no Header */}
      <button
        onClick={() => setModalAberto(true)}
        className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs transition-all hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60 cursor-pointer shadow-xs active:scale-95"
        title="Clique para ver os detalhes da sincronização Protheus e E-mail"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-semibold tracking-tight">{textoDisplay}</span>
      </button>

      {/* Modal / Dialog de Central de Sincronização */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
                  <Database className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Central de Integração Protheus</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Sincronizador SQL Server &bull; Supabase &bull; E-mail</p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Geral */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      Sincronização Ativa & Operacional
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                      Última execução: {syncDate.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-[10px] uppercase">
                  Online
                </span>
              </div>

              {/* Métricas Coletadas na Última Sincronização */}
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-2">
                  Dados Coletados na Última Execução ({ultimaSync.data_referencia || "Hoje"})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Produção</p>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                      {ultimaSync.producao != null
                        ? `${ultimaSync.producao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg`
                        : "—"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Refugo</p>
                    <p className="font-mono font-bold text-red-600 dark:text-red-400 text-sm mt-0.5">
                      {ultimaSync.refugo != null
                        ? `${ultimaSync.refugo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg`
                        : "—"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">% Refugo</p>
                    <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                      {ultimaSync.pct_refugo != null ? `${ultimaSync.pct_refugo}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações da Automação */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Horários de Agendamento:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    Diariamente às 07:00 e às 18:00
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Server className="w-3.5 h-3.5 text-indigo-500" /> Servidor SQL Server:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    Protheus Produção (Porta 1433)
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-emerald-500" /> Disparo de E-mails:
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    SMTP cPanel (Automático a cada sync)
                  </span>
                </div>
              </div>

              {/* Destinatários */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Destinatários do Relatório:
                </p>
                <p className="font-mono">
                  thiago.gti@implatec.com.br, vendas@implatec.com.br, pcp@implatec.com.br
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default BadgeSincronizacao;
