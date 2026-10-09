// Design: Clean Manufacturing Dashboard
// Página principal: layout com sidebar + área de conteúdo principal com dark mode completo e micro-interações

import { useState, useEffect, memo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { MESES_NOMES } from "@/lib/initialData";
import Sidebar from "@/components/Sidebar";
import KpiCards from "@/components/KpiCards";
import GraficoMensal from "@/components/GraficoMensal";
import GraficoAnual from "@/components/GraficoAnual";
import TabelaRegistros from "@/components/TabelaRegistros";
import ModalConfiguracoes from "@/components/ModalConfiguracoes";
import AnaliseMotivoRefugo from "@/components/AnaliseMotivoRefugo";
import RankingProdutosRefugo from "@/components/RankingProdutosRefugo";
import ModoTV from "@/components/ModoTV";
import BadgeSincronizacao from "@/components/BadgeSincronizacao";
import { useTVMode } from "@/hooks/useTVMode";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Download,
  Sun,
  Moon,
  Clock,
  LogOut,
  Monitor,
  FileSpreadsheet,
} from "lucide-react";
import { generateMonthlyPDF } from "@/lib/generatePDF";
import { exportMonthlyCSV } from "@/lib/exportExcel";
import { toast } from "sonner";

const RelogioHeader = memo(function RelogioHeader() {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-medium capitalize">
        {agora.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
      </span>
      <span className="text-slate-300 dark:text-slate-700">|</span>
      <span className="font-mono font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
});

export default function Home() {
  const { mesAtual, setMesAtual, anoAtual, setAnoAtual, metaRefugo, getMesData } = useDashboard();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [modalConfig, setModalConfig] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const tvState = useTVMode();

  async function handleExportPDF() {
    try {
      setExportandoPDF(true);
      const mesData = getMesData(mesAtual);
      await generateMonthlyPDF(mesAtual, anoAtual, mesData.registros, metaRefugo);
      toast.success(`Relatório de ${MESES_NOMES[mesAtual - 1]} exportado com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExportandoPDF(false);
    }
  }

  function handleExportExcel() {
    const mesData = getMesData(mesAtual);
    exportMonthlyCSV(mesAtual, anoAtual, mesData.registros, metaRefugo);
    toast.success(`Planilha Excel de ${MESES_NOMES[mesAtual - 1]} exportada!`);
  }

  function irMesAnterior() {
    if (mesAtual > 1) setMesAtual(mesAtual - 1);
  }

  function irMesProximo() {
    if (mesAtual < 12) setMesAtual(mesAtual + 1);
  }

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors${theme === "dark" ? " dark" : ""}`}>
      {/* Sidebar Desktop */}
      <div className="hidden lg:block shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar onOpenSettings={() => setModalConfig(true)} />
        </div>
      </div>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar
              onOpenSettings={() => {
                setModalConfig(true);
                setSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3.5 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Menu mobile */}
              <button
                className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Navegação de mês */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
                <button
                  onClick={irMesAnterior}
                  disabled={mesAtual === 1}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center justify-center min-w-[120px] px-2">
                  <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {MESES_NOMES[mesAtual - 1]}
                  </h1>
                  <select
                    value={anoAtual}
                    onChange={(e) => setAnoAtual(Number(e.target.value))}
                    className="text-slate-400 dark:text-slate-500 font-semibold text-[11px] bg-transparent border-none outline-none cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 text-center appearance-none"
                    style={{ textAlignLast: "center" }}
                  >
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                      <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={irMesProximo}
                  disabled={mesAtual === 12}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Badge de Sincronização Protheus */}
              <BadgeSincronizacao />

              {/* Modo TV */}
              <button
                onClick={() => tvState.entrar()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors shadow-xs"
                title="Ativar Modo TV (Andon para tela cheia na fábrica)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo TV</span>
              </button>

              {/* Exportar Excel */}
              <button
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                title="Exportar para Excel (.csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Excel</span>
              </button>

              {/* Exportar PDF */}
              <button
                onClick={handleExportPDF}
                disabled={exportandoPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                title="Exportar relatório em PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              {/* Relógio em tempo real */}
              <RelogioHeader />

              {/* Toggle modo claro/escuro */}
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Usuário logado + Logout */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{user?.nome}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[110px]">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    toast.loading("Saindo...", { id: "logout-save" });
                    await logout();
                    toast.dismiss("logout-save");
                  }}
                  title="Sair do sistema"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Logout mobile */}
              <button
                onClick={async () => {
                  toast.loading("Saindo...", { id: "logout-save-mobile" });
                  await logout();
                  toast.dismiss("logout-save-mobile");
                }}
                title="Sair"
                className="sm:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <div className="flex-1 p-4 lg:p-6 space-y-5">
          {/* 1. KPIs Principais + Insights Operacionais */}
          <KpiCards />

          {/* 2. Gráficos Diário e Anual */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <GraficoMensal />
            </div>
            <div className="xl:col-span-1">
              <GraficoAnual />
            </div>
          </div>

          {/* 3. Análise de Motivos de Refugo (Pareto 80/20, Barras, Pizza) */}
          <AnaliseMotivoRefugo />

          {/* 4. Ranking Top 10 Produtos & Ferramentas Mais Refugados (Últimos 30 dias - Protheus) */}
          <RankingProdutosRefugo />

          {/* 5. Tabela de Registros com Filtros e Exportação Excel */}
          <TabelaRegistros />
        </div>

        {/* Rodapé */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6 py-3 mt-auto">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            Controle de Refugos &mdash; {new Date().getFullYear()} &mdash; Implatec Perfis Plásticos &reg; &mdash; Todos os direitos reservados.
          </p>
        </footer>
      </main>

      {/* Modal de Configurações */}
      {modalConfig && <ModalConfiguracoes onClose={() => setModalConfig(false)} />}

      {/* Modo TV (tela cheia) */}
      {tvState.isTVMode && <ModoTV tvState={tvState} />}
    </div>
  );
}
