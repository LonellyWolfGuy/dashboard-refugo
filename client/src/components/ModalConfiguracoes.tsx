// Design: Clean Manufacturing Dashboard
// Modal de configurações: meta de % refugo e exportação de dados

import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES, DADOS_INICIAIS } from "@/lib/initialData";
import { X, Download, RotateCcw, Target, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ModalConfiguracoesProps {
  onClose: () => void;
}

export default function ModalConfiguracoes({ onClose }: ModalConfiguracoesProps) {
  const { metaRefugo, setMetaRefugo, getTotaisMes, meses, motivos, adicionarMotivo, removerMotivo } = useDashboard();
  const [novaMeta, setNovaMeta] = useState(metaRefugo.toString());
  const [novoMotivo, setNovoMotivo] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"meta" | "motivos" | "dados">("meta");

  async function salvarMeta() {
    const val = parseFloat(novaMeta.replace(",", "."));
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error("Meta deve ser um valor entre 0 e 100.");
      return;
    }
    setMetaRefugo(val);
    toast.success(`Meta atualizada para ${val}%`);
  }

  function exportarCSV() {
    const linhas: string[] = ["Mês;Data;Qtd Produção;Qtd Refugo;Total;% Refugo"];
    meses.forEach(m => {
      m.registros.forEach(r => {
        const total = r.producao + r.refugo;
        const pct = total > 0 ? (r.refugo / total) * 100 : 0;
        const data = new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR");
        linhas.push([
          MESES_NOMES[m.mes - 1],
          data,
          r.producao.toFixed(2).replace(".", ","),
          r.refugo.toFixed(2).replace(".", ","),
          total.toFixed(2).replace(".", ","),
          pct.toFixed(2).replace(".", ",") + "%"
        ].join(";"));
      });
    });
    const csv = linhas.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "controle-refugo-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo CSV exportado com sucesso.");
  }

  function limparDados() {
    if (!confirm("Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.")) return;
    localStorage.removeItem("dashboard-refugo-2026");
    window.location.reload();
  }

  async function adicionarNovoMotivo() {
    if (!novoMotivo.trim()) {
      toast.error("Digite um motivo válido.");
      return;
    }
    if (motivos.includes(novoMotivo.trim())) {
      toast.error("Este motivo já existe.");
      return;
    }
    try {
      await adicionarMotivo(novoMotivo);
      setNovoMotivo("");
      toast.success("Motivo adicionado com sucesso.");
    } catch {
      toast.error("Erro ao adicionar motivo. Tente novamente.");
    }
  }

  async function removerMotivoConfirm(motivo: string) {
    if (!confirm(`Deseja remover o motivo "${motivo}"?`)) return;
    try {
      await removerMotivo(motivo);
      toast.success("Motivo removido com sucesso.");
    } catch {
      toast.error("Erro ao remover motivo. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Configurações</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            onClick={() => setAbaAtiva("meta")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === "meta"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Meta
          </button>
          <button
            onClick={() => setAbaAtiva("motivos")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === "motivos"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Motivos
          </button>
          <button
            onClick={() => setAbaAtiva("dados")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === "dados"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Dados
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-96 overflow-y-auto">
          {/* Meta de Refugo */}
          {abaAtiva === "meta" && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-blue-900" />
                  <h3 className="text-sm font-semibold text-slate-700">Meta de % Refugo</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Define o limite máximo aceitável de refugo. Valores acima da meta são destacados em vermelho.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={novaMeta}
                      onChange={e => setNovaMeta(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                      step="0.1"
                      min="0.1"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                  </div>
                  <button
                    onClick={salvarMeta}
                    className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Ótimo: ≤ {(parseFloat(novaMeta || "0") * 0.8).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Alerta: ≤ {novaMeta}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Crítico: &gt; {novaMeta}%
                  </span>
                </div>
              </div>

              {/* Resumo Anual */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumo por Mês</h3>
                <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-3 py-2 text-slate-500 font-semibold">Mês</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-semibold">Registros</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-semibold">% Refugo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MESES_NOMES.map((nome, idx) => {
                        const mes = idx + 1;
                        const totais = getTotaisMes(mes);
                        const diasRegistrados = meses.find(m => m.mes === mes)?.registros.length || 0;
                        return (
                          <tr key={mes} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 text-slate-600">{nome}</td>
                            <td className="px-3 py-1.5 text-right text-slate-600 font-mono">{diasRegistrados}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-semibold">
                              {totais.percentRefugo > 0 ? (
                                <span className={
                                  totais.percentRefugo <= metaRefugo * 0.8 ? "text-emerald-600" :
                                  totais.percentRefugo <= metaRefugo ? "text-amber-600" : "text-red-600"
                                }>
                                  {totais.percentRefugo.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Customização de Motivos */}
          {abaAtiva === "motivos" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Categorias de Motivos</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Adicione ou remova categorias de motivos de refugo para classificação.
                </p>
              </div>

              {/* Adicionar novo motivo */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoMotivo}
                  onChange={e => setNovoMotivo(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && adicionarNovoMotivo()}
                  placeholder="Novo motivo..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={adicionarNovoMotivo}
                  className="px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              {/* Lista de motivos */}
              <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2 max-h-64 overflow-y-auto">
                {motivos.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum motivo cadastrado</p>
                ) : (
                  motivos.map(motivo => (
                    <div key={motivo} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 group">
                      <span className="text-sm text-slate-700">{motivo}</span>
                      <button
                        onClick={() => removerMotivoConfirm(motivo)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          {abaAtiva === "dados" && (
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={exportarCSV}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={limparDados}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar Dados
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
