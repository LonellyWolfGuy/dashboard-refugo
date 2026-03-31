// Design: Clean Manufacturing Dashboard
// Página principal: layout com sidebar + área de conteúdo principal
// Filosofia: clareza absoluta, dados em primeiro plano, feedback imediato

import { useState, useEffect } from "react";
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
import { Menu, ChevronLeft, ChevronRight, Download, Sun, Moon, Clock, LogOut } from "lucide-react";
import { generateMonthlyPDF } from "@/lib/generatePDF";
import { toast } from "sonner";

export default function Home() {
  const { mesAtual, setMesAtual, anoAtual, setAnoAtual, meses, metaRefugo, salvarTudo, getMesData } = useDashboard();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [modalConfig, setModalConfig] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
  const horaFormatada = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

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

  function irMesAnterior() {
    if (mesAtual > 1) setMesAtual(mesAtual - 1);
  }

  function irMesProximo() {
    if (mesAtual < 12) setMesAtual(mesAtual + 1);
  }

  return (
    <div className={`flex min-h-screen bg-gray-50${theme === "dark" ? " dark" : ""}`}>
      {/* Sidebar Desktop */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar onOpenSettings={() => setModalConfig(true)} />
        </div>
      </div>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar onOpenSettings={() => { setModalConfig(true); setSidebarOpen(false); }} />
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Menu mobile */}
              <button
                className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Navegação de mês */}
              <div className="flex items-center gap-2">
                <button
                  onClick={irMesAnterior}
                  disabled={mesAtual === 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center justify-center min-w-[120px] px-2">
                  <h1 className="text-lg font-bold text-gray-800 leading-none">
                    {MESES_NOMES[mesAtual - 1]}
                  </h1>
                  <select
                    value={anoAtual}
                    onChange={(e) => setAnoAtual(Number(e.target.value))}
                    className="text-gray-400 font-medium text-xs bg-transparent border-none outline-none mt-0.5 cursor-pointer hover:text-gray-600 text-center appearance-none"
                    style={{ textAlignLast: "center" }}
                  >
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={irMesProximo}
                  disabled={mesAtual === 12}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Exportar PDF */}
              <button
                onClick={handleExportPDF}
                disabled={exportandoPDF}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar relatório em PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>

              {/* Relógio */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium capitalize">{dataFormatada}</span>
                <span className="text-gray-400">|</span>
                <span className="font-mono font-semibold text-gray-700 tabular-nums">{horaFormatada}</span>
              </div>

              {/* Toggle modo claro/escuro */}
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Usuário logado + Logout */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-700 leading-none">{user?.nome}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    toast.loading("Saindo...", { id: "logout-save" });
                    await logout();
                    toast.dismiss("logout-save");
                  }}
                  title="Sair do sistema"
                  className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Logout mobile (só ícone) */}
              <button
                onClick={async () => {
                  toast.loading("Saindo...", { id: "logout-save-mobile" });
                  await logout();
                  toast.dismiss("logout-save-mobile");
                }}
                title="Sair"
                className="sm:hidden p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 p-4 lg:p-6 space-y-5">
          {/* KPIs */}
          <KpiCards />

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <GraficoMensal />
            </div>
            <div className="xl:col-span-1">
              <GraficoAnual />
            </div>
          </div>

          {/* Análise de Motivos de Refugo */}
          <AnaliseMotivoRefugo />

          {/* Tabela de Registros */}
          <TabelaRegistros />
        </div>

        {/* Rodapé */}
        <footer className="border-t border-gray-200 bg-white px-4 lg:px-6 py-3 mt-auto">
          <p className="text-center text-xs text-gray-400 font-medium tracking-wide">
            Controle de Refugos &mdash; {new Date().getFullYear()} &mdash; Implatec Perfis Plásticos ® &mdash; Todos os direitos reservados.
          </p>
        </footer>

      </main>

      {/* Modal de Configurações */}
      {modalConfig && (
        <ModalConfiguracoes onClose={() => setModalConfig(false)} />
      )}
    </div>
  );
}
