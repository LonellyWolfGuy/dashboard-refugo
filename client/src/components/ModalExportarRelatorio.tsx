// Modal para exportação de relatórios por período em PDF e Excel (.xlsx / .csv)
// Padrão Clean Manufacturing Dashboard - Implatec Perfis

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES, DailyRecord } from "@/lib/initialData";
import { generatePeriodReportPDF } from "@/lib/generatePDF";
import { exportReportExcel, exportReportCSV } from "@/lib/exportExcel";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface ModalExportarRelatorioProps {
  aberto: boolean;
  onClose: () => void;
  tipoPadrao?: "pdf" | "excel" | "todos";
}

type PresetPeriodo =
  | "mes_selecionado"
  | "mes_atual"
  | "mes_anterior"
  | "ano_atual"
  | "ultimos_7"
  | "ultimos_30"
  | "ultimos_90"
  | "personalizado";

function formatISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataIso: string): string {
  const partes = dataIso.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataIso;
}

export default function ModalExportarRelatorio({
  aberto,
  onClose,
  tipoPadrao = "todos",
}: ModalExportarRelatorioProps) {
  const { mesAtual, anoAtual, metaRefugo, buscarRegistrosPeriodo, getMesData } = useDashboard();

  const [preset, setPreset] = useState<PresetPeriodo>("mes_selecionado");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [registros, setRegistros] = useState<DailyRecord[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [gerandoExcel, setGerandoExcel] = useState(false);
  const [gerandoCSV, setGerandoCSV] = useState(false);
  const [gerandoAmbos, setGerandoAmbos] = useState(false);

  // Calcula datas para cada preset
  const aplicarPreset = useCallback(
    (tipo: PresetPeriodo) => {
      setPreset(tipo);
      const hoje = new Date();

      if (tipo === "mes_selecionado") {
        const uDia = new Date(anoAtual, mesAtual, 0).getDate();
        setDataInicio(`${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`);
        setDataFim(`${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`);
      } else if (tipo === "mes_atual") {
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth() + 1;
        const uDia = new Date(ano, mes, 0).getDate();
        setDataInicio(`${ano}-${String(mes).padStart(2, "0")}-01`);
        setDataFim(`${ano}-${String(mes).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`);
      } else if (tipo === "mes_anterior") {
        const prev = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const ano = prev.getFullYear();
        const mes = prev.getMonth() + 1;
        const uDia = new Date(ano, mes, 0).getDate();
        setDataInicio(`${ano}-${String(mes).padStart(2, "0")}-01`);
        setDataFim(`${ano}-${String(mes).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`);
      } else if (tipo === "ano_atual") {
        setDataInicio(`${anoAtual}-01-01`);
        setDataFim(`${anoAtual}-12-31`);
      } else if (tipo === "ultimos_7") {
        const d7 = new Date(hoje.getTime() - 6 * 24 * 60 * 60 * 1000);
        setDataInicio(formatISO(d7));
        setDataFim(formatISO(hoje));
      } else if (tipo === "ultimos_30") {
        const d30 = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);
        setDataInicio(formatISO(d30));
        setDataFim(formatISO(hoje));
      } else if (tipo === "ultimos_90") {
        const d90 = new Date(hoje.getTime() - 89 * 24 * 60 * 60 * 1000);
        setDataInicio(formatISO(d90));
        setDataFim(formatISO(hoje));
      }
    },
    [anoAtual, mesAtual]
  );

  // Inicializa datas quando o modal abre
  useEffect(() => {
    if (aberto) {
      aplicarPreset("mes_selecionado");
    }
  }, [aberto, aplicarPreset]);

  // Carrega registros sempre que dataInicio ou dataFim mudarem
  useEffect(() => {
    if (!dataInicio || !dataFim || !aberto) return;

    let ativo = true;
    setCarregandoDados(true);

    // Se for o mês selecionado da dashboard, podemos usar diretamente os dados em memória
    const uDia = new Date(anoAtual, mesAtual, 0).getDate();
    const dIniMes = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`;
    const dFimMes = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`;

    if (dataInicio === dIniMes && dataFim === dFimMes) {
      const mesData = getMesData(mesAtual);
      setRegistros(mesData.registros);
      setCarregandoDados(false);
      return;
    }

    buscarRegistrosPeriodo(dataInicio, dataFim)
      .then((regs) => {
        if (ativo) {
          setRegistros(regs);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar registros por período:", err);
        toast.error("Não foi possível carregar os registros do período.");
      })
      .finally(() => {
        if (ativo) setCarregandoDados(false);
      });

    return () => {
      ativo = false;
    };
  }, [dataInicio, dataFim, aberto, buscarRegistrosPeriodo, getMesData, anoAtual, mesAtual]);

  // Cálculos de totais e KPIs do período
  const totais = useMemo(() => {
    const totalProd = registros.reduce((s, r) => s + Number(r.producao || 0), 0);
    const totalRef = registros.reduce((s, r) => s + Number(r.refugo || 0), 0);
    const totalGeral = totalProd + totalRef;
    const percentRef = totalGeral > 0 ? (totalRef / totalGeral) * 100 : 0;
    const dentroMeta = percentRef <= metaRefugo;
    return {
      totalProd,
      totalRef,
      totalGeral,
      percentRef,
      dentroMeta,
      quantidadeDias: registros.length,
    };
  }, [registros, metaRefugo]);

  // Título legível do período para o relatório
  const tituloPeriodo = useMemo(() => {
    if (preset === "mes_selecionado") {
      return `${MESES_NOMES[mesAtual - 1]} / ${anoAtual}`;
    }
    if (preset === "ano_atual") {
      return `Ano Completo de ${anoAtual}`;
    }
    if (dataInicio && dataFim) {
      if (dataInicio === dataFim) {
        return `Dia ${formatarDataBR(dataInicio)}`;
      }
      return `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`;
    }
    return "Período Personalizado";
  }, [preset, mesAtual, anoAtual, dataInicio, dataFim]);

  // Funções de exportação
  async function handleExportarPDF() {
    if (registros.length === 0) {
      toast.warning("Nenhum registro encontrado no período selecionado.");
      return;
    }
    try {
      setGerandoPDF(true);
      await generatePeriodReportPDF({
        tituloPeriodo,
        dataInicio,
        dataFim,
        registros,
        metaRefugo,
      });
      toast.success("Relatório em PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGerandoPDF(false);
    }
  }

  function handleExportarExcel() {
    if (registros.length === 0) {
      toast.warning("Nenhum registro encontrado no período selecionado.");
      return;
    }
    try {
      setGerandoExcel(true);
      exportReportExcel(registros, metaRefugo, {
        tituloPeriodo,
        dataInicio,
        dataFim,
      });
      toast.success("Planilha Excel (.xlsx) exportada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar planilha Excel.");
    } finally {
      setGerandoExcel(false);
    }
  }

  function handleExportarCSV() {
    if (registros.length === 0) {
      toast.warning("Nenhum registro encontrado no período selecionado.");
      return;
    }
    try {
      setGerandoCSV(true);
      exportReportCSV(registros, metaRefugo, {
        tituloPeriodo,
        dataInicio,
        dataFim,
      });
      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar CSV.");
    } finally {
      setGerandoCSV(false);
    }
  }

  async function handleExportarAmbos() {
    if (registros.length === 0) {
      toast.warning("Nenhum registro encontrado no período selecionado.");
      return;
    }
    try {
      setGerandoAmbos(true);
      // Exporta Excel
      exportReportExcel(registros, metaRefugo, {
        tituloPeriodo,
        dataInicio,
        dataFim,
      });
      // Exporta PDF
      await generatePeriodReportPDF({
        tituloPeriodo,
        dataInicio,
        dataFim,
        registros,
        metaRefugo,
      });
      toast.success("Relatórios em Excel e PDF baixados com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatórios.");
    } finally {
      setGerandoAmbos(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Exportar Relatório de Refugo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione o período dos lançamentos e escolha o formato desejado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* 1. Seleção de Período (Atalhos rápidos) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              1. Selecionar Período
            </label>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => aplicarPreset("mes_selecionado")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "mes_selecionado"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Mês Selecionado ({MESES_NOMES[mesAtual - 1]})
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("mes_atual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "mes_atual"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Mês Atual
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("mes_anterior")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "mes_anterior"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Mês Anterior
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("ultimos_7")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "ultimos_7"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Últimos 7 dias
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("ultimos_30")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "ultimos_30"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Últimos 30 dias
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("ultimos_90")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "ultimos_90"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Últimos 90 dias
              </button>

              <button
                type="button"
                onClick={() => aplicarPreset("ano_atual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  preset === "ano_atual"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Ano {anoAtual} Completo
              </button>
            </div>

            {/* Inputs de Data (De / Até) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Data Inicial:
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setPreset("personalizado");
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Data Final:
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setPreset("personalizado");
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. Pré-visualização do Período Selecionado */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Resumo: {tituloPeriodo}</span>
              </div>
              <div className="flex items-center gap-2">
                {carregandoDados ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando apontamentos...
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                    {totais.quantidadeDias} {totais.quantidadeDias === 1 ? "lançamento" : "lançamentos"}
                  </span>
                )}
              </div>
            </div>

            {/* Grid com métricas resumidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">
                  Produção
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {totais.totalProd.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">
                  Refugo
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-red-600 dark:text-red-400">
                  {totais.totalRef.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">
                  Total Geral
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {totais.totalGeral.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">
                  % Refugo
                </span>
                <div className="flex items-center justify-center gap-1">
                  {totais.dentroMeta ? (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-bold font-mono ${
                      totais.dentroMeta
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {totais.percentRef.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {registros.length === 0 && !carregandoDados && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Nenhum apontamento de refugo registrado para este intervalo de datas.</span>
              </div>
            )}
          </div>

          {/* 3. Botões de Ação para Exportação */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              2. Escolha o Formato de Download
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão PDF */}
              <button
                type="button"
                onClick={handleExportarPDF}
                disabled={registros.length === 0 || gerandoPDF || carregandoDados}
                className="flex items-center justify-between p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-700 text-white shadow-xs group-hover:scale-105 transition-transform">
                    {gerandoPDF ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Exportar em PDF
                    </h3>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                      Relatório visual com logo, KPIs e motivos
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Botão Excel (.xlsx) */}
              <button
                type="button"
                onClick={handleExportarExcel}
                disabled={registros.length === 0 || gerandoExcel || carregandoDados}
                className="flex items-center justify-between p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-800 text-white shadow-xs group-hover:scale-105 transition-transform">
                    {gerandoExcel ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Exportar em Excel (.xlsx)
                    </h3>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                      Planilha formatada com cores e fórmulas
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Ações adicionais: Baixar Ambos ou CSV */}
            <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportarAmbos}
                disabled={registros.length === 0 || gerandoAmbos || carregandoDados}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                title="Baixar simultaneamente os arquivos PDF e Excel do período"
              >
                {gerandoAmbos ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span>Baixar Ambos (PDF + Excel)</span>
              </button>

              <button
                type="button"
                onClick={handleExportarCSV}
                disabled={registros.length === 0 || gerandoCSV || carregandoDados}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Exportar arquivo texto separado por ponto e vírgula (.csv)"
              >
                {gerandoCSV ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Exportar também em CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

