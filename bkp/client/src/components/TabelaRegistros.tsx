// Design: Clean Manufacturing Dashboard
// Tabela de registros diários com edição inline, exclusão e adição de novos registros

import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { DailyRecord, RefugoMotivo } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ModalMotivoRefugo from "./ModalMotivoRefugo";

function formatData(data: string): string {
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function getPercentColor(pct: number, meta: number): string {
  if (pct === 0) return "text-slate-400";
  if (pct <= meta * 0.8) return "text-emerald-600 font-semibold";
  if (pct <= meta) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

function getPercentBadge(pct: number, meta: number): string {
  if (pct === 0) return "bg-slate-100 text-slate-500";
  if (pct <= meta * 0.8) return "bg-emerald-100 text-emerald-700";
  if (pct <= meta) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

interface EditState {
  id: string | null;
  data: string;
  producao: string;
  refugo: string;
}

const emptyEdit: EditState = { id: null, data: "", producao: "", refugo: "" };

export default function TabelaRegistros() {
  const { mesAtual, getMesData, adicionarRegistro, editarRegistro, excluirRegistro, metaRefugo } = useDashboard();
  const mesData = getMesData(mesAtual);

  const [editState, setEditState] = useState<EditState>(emptyEdit);
  const [novoRegistro, setNovoRegistro] = useState(false);
  const [novoData, setNovoData] = useState("");
  const [novoProducao, setNovoProducao] = useState("");
  const [novoRefugo, setNovoRefugo] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalMotivoAberto, setModalMotivoAberto] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<DailyRecord | null>(null);

  const registros = [...mesData.registros].sort((a, b) => {
    const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
    return sortDir === "asc" ? diff : -diff;
  });

  function iniciarEdicao(r: DailyRecord) {
    setEditState({
      id: r.id,
      data: r.data,
      producao: r.producao.toString(),
      refugo: r.refugo.toString(),
    });
  }

  function salvarEdicao() {
    if (!editState.id) return;
    const producao = parseFloat(editState.producao.replace(",", "."));
    const refugo = parseFloat(editState.refugo.replace(",", "."));
    if (isNaN(producao) || isNaN(refugo) || !editState.data) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    if (producao < 0 || refugo < 0) {
      toast.error("Os valores não podem ser negativos.");
      return;
    }
    editarRegistro(mesAtual, editState.id, { data: editState.data, producao, refugo });
    setEditState(emptyEdit);
    toast.success("Registro atualizado com sucesso.");
  }

  function cancelarEdicao() {
    setEditState(emptyEdit);
  }

  function abrirModalMotivos(registro: DailyRecord) {
    setRegistroSelecionado(registro);
    setModalMotivoAberto(true);
  }

  function salvarMotivos(motivos: RefugoMotivo[]) {
    if (!registroSelecionado) return;
    editarRegistro(mesAtual, registroSelecionado.id, {
      data: registroSelecionado.data,
      producao: registroSelecionado.producao,
      refugo: registroSelecionado.refugo,
      motivos,
    });
    setRegistroSelecionado(null);
  }

  function handleExcluir(id: string) {
    excluirRegistro(mesAtual, id);
    toast.success("Registro excluído.");
  }

  function salvarNovo() {
    const producao = parseFloat(novoProducao.replace(",", "."));
    const refugo = parseFloat(novoRefugo.replace(",", "."));
    if (isNaN(producao) || isNaN(refugo) || !novoData) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    if (producao < 0 || refugo < 0) {
      toast.error("Os valores não podem ser negativos.");
      return;
    }
    // Verificar data duplicada
    const existe = mesData.registros.some(r => r.data === novoData);
    if (existe) {
      toast.error("Já existe um registro para esta data.");
      return;
    }
    adicionarRegistro(mesAtual, { data: novoData, producao, refugo });
    setNovoData("");
    setNovoProducao("");
    setNovoRefugo("");
    setNovoRegistro(false);
    toast.success("Registro adicionado com sucesso.");
  }

  function cancelarNovo() {
    setNovoData("");
    setNovoProducao("");
    setNovoRefugo("");
    setNovoRegistro(false);
  }

  // Calcular totais
  const totalProducao = registros.reduce((s, r) => s + r.producao, 0);
  const totalRefugo = registros.reduce((s, r) => s + r.refugo, 0);
  const totalGeral = totalProducao + totalRefugo;
  const percentTotal = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;

  // Sugerir data padrão para novo registro
  function getDataSugerida(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = mesAtual.toString().padStart(2, "0");
    const dia = hoje.getDate().toString().padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function abrirNovo() {
    setNovoData(getDataSugerida());
    setNovoRegistro(true);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Registros Diários</h3>
          <p className="text-xs text-slate-400">{MESES_NOMES[mesAtual - 1]} 2026 — {registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={abrirNovo}
          disabled={novoRegistro}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Registro
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                <button
                  className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                >
                  Data
                  {sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd. Produção</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd. Refugo</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">% Refugo</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* Linha de novo registro */}
            {novoRegistro && (
              <tr className="bg-blue-50 border-b border-blue-100">
                <td className="px-5 py-2.5">
                  <input
                    type="date"
                    value={novoData}
                    onChange={e => setNovoData(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </td>
                <td className="px-5 py-2.5">
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoProducao}
                    onChange={e => setNovoProducao(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td className="px-5 py-2.5">
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoRefugo}
                    onChange={e => setNovoRefugo(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td className="px-5 py-2.5 text-right text-xs text-slate-400 font-mono">
                  {novoProducao && novoRefugo
                    ? (parseFloat(novoProducao || "0") + parseFloat(novoRefugo || "0")).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                    : "—"}
                </td>
                <td className="px-5 py-2.5 text-center text-xs text-slate-400 font-mono">
                  {novoProducao && novoRefugo && (parseFloat(novoProducao) + parseFloat(novoRefugo)) > 0
                    ? `${((parseFloat(novoRefugo) / (parseFloat(novoProducao) + parseFloat(novoRefugo))) * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={salvarNovo} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors" title="Salvar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelarNovo} className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {registros.length === 0 && !novoRegistro && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500">Nenhum registro para este mês</p>
                    <p className="text-xs text-slate-400">Clique em "Novo Registro" para começar</p>
                  </div>
                </td>
              </tr>
            )}

            {registros.map((r, idx) => {
              const total = r.producao + r.refugo;
              const pct = total > 0 ? (r.refugo / total) * 100 : 0;
              const isEditing = editState.id === r.id;

              if (isEditing) {
                const editTotal = (parseFloat(editState.producao || "0") + parseFloat(editState.refugo || "0"));
                const editPct = editTotal > 0 ? (parseFloat(editState.refugo || "0") / editTotal) * 100 : 0;

                return (
                  <tr key={r.id} className="bg-amber-50 border-b border-amber-100">
                    <td className="px-5 py-2.5">
                      <input
                        type="date"
                        value={editState.data}
                        onChange={e => setEditState(s => ({ ...s, data: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        value={editState.producao}
                        onChange={e => setEditState(s => ({ ...s, producao: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        value={editState.refugo}
                        onChange={e => setEditState(s => ({ ...s, refugo: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs font-mono text-slate-600">
                      {editTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", getPercentBadge(editPct, metaRefugo))}>
                        {editPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={salvarEdicao} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors" title="Salvar">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelarEdicao} className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors" title="Cancelar">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-slate-50 hover:bg-slate-50 transition-colors group",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="px-5 py-3 text-xs font-medium text-slate-700">{formatData(r.data)}</td>
                  <td className="px-5 py-3 text-right text-xs font-mono text-slate-700">
                    {r.producao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-mono text-slate-700">
                    {r.refugo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-mono text-slate-600">
                    {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", getPercentBadge(pct, metaRefugo))}>
                      {pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => abrirModalMotivos(r)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          r.motivos && r.motivos.length > 0
                            ? "text-green-600 hover:bg-green-50"
                            : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        )}
                        title="Motivos de refugo"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => iniciarEdicao(r)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleExcluir(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totais */}
          {registros.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-200">
                <td className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Total</td>
                <td className="px-5 py-3 text-right text-xs font-mono font-bold text-slate-800">
                  {totalProducao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 text-right text-xs font-mono font-bold text-slate-800">
                  {totalRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 text-right text-xs font-mono font-bold text-slate-800">
                  {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-full", getPercentBadge(percentTotal, metaRefugo))}>
                    {percentTotal.toFixed(2)}%
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal de Motivos */}
      <ModalMotivoRefugo
        isOpen={modalMotivoAberto}
        onClose={() => {
          setModalMotivoAberto(false);
          setRegistroSelecionado(null);
        }}
        motivos={registroSelecionado?.motivos}
        totalRefugo={registroSelecionado?.refugo || 0}
        onSave={salvarMotivos}
      />
    </div>
  );
}
