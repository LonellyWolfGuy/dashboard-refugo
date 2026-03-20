// Design: Clean Manufacturing Dashboard
// Tabela de lançamentos com suporte a qualquer data (passado, presente ou futuro)

import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { DailyRecord, RefugoMotivo } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown, AlertCircle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import ModalMotivoRefugo from "./ModalMotivoRefugo";

function formatData(data: string): string {
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function getPercentBadge(pct: number, meta: number): string {
  if (pct === 0) return "bg-slate-100 text-slate-500";
  if (pct <= meta * 0.8) return "bg-emerald-100 text-emerald-700";
  if (pct <= meta) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// Extrai mês (1-12) e ano de uma string "YYYY-MM-DD"
function mesAnoDeData(data: string): { mes: number; ano: number } | null {
  const partes = data.split("-");
  if (partes.length !== 3) return null;
  const ano = parseInt(partes[0]);
  const mes = parseInt(partes[1]);
  if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) return null;
  return { mes, ano };
}

interface EditState {
  id: string | null;
  data: string;
  producao: string;
  refugo: string;
}

const emptyEdit: EditState = { id: null, data: "", producao: "", refugo: "" };

export default function TabelaRegistros() {
  const { mesAtual, anoAtual, getMesData, adicionarRegistro, editarRegistro, excluirRegistro, metaRefugo, meses } = useDashboard();
  const mesData = getMesData(mesAtual);

  const [editState, setEditState] = useState<EditState>(emptyEdit);
  const [novoAberto, setNovoAberto] = useState(false);
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

  // ── Aviso quando a data digitada pertence a outro mês ──────────────────────
  const novoMesAno = mesAnoDeData(novoData);
  const dataEmOutroMes =
    novoMesAno && (novoMesAno.mes !== mesAtual || novoMesAno.ano !== anoAtual);
  const nomeMesDestino =
    novoMesAno ? `${MESES_NOMES[novoMesAno.mes - 1]} ${novoMesAno.ano}` : "";

  // ── Edição ─────────────────────────────────────────────────────────────────
  function iniciarEdicao(r: DailyRecord) {
    setEditState({ id: r.id, data: r.data, producao: r.producao.toString(), refugo: r.refugo.toString() });
  }

  async function salvarEdicao() {
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
    try {
      await editarRegistro(mesAtual, editState.id, { data: editState.data, producao, refugo });
      setEditState(emptyEdit);
      toast.success("Registro atualizado com sucesso.");
    } catch {
      toast.error("Erro ao salvar. Verifique a conexão e tente novamente.");
    }
  }

  // ── Novo registro ──────────────────────────────────────────────────────────
  async function salvarNovo() {
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

    // Determinar o mês de destino a partir da data digitada
    const destino = mesAnoDeData(novoData);
    if (!destino) {
      toast.error("Data inválida.");
      return;
    }

    // Verificar duplicata no mês de destino
    const mesDestino = getMesData(destino.mes);
    const existe = mesDestino.registros.some(r => r.data === novoData);
    if (existe) {
      toast.error(`Já existe um registro para ${formatData(novoData)}.`);
      return;
    }

    try {
      await adicionarRegistro(destino.mes, { data: novoData, producao, refugo });
      setNovoData("");
      setNovoProducao("");
      setNovoRefugo("");
      setNovoAberto(false);
      if (dataEmOutroMes) {
        toast.success(`Registro adicionado em ${nomeMesDestino}.`);
      } else {
        toast.success("Registro adicionado com sucesso.");
      }
    } catch {
      toast.error("Erro ao salvar. Verifique a conexão e tente novamente.");
    }
  }

  function cancelarNovo() {
    setNovoData("");
    setNovoProducao("");
    setNovoRefugo("");
    setNovoAberto(false);
  }

  // ── Motivos ────────────────────────────────────────────────────────────────
  function abrirModalMotivos(registro: DailyRecord) {
    setRegistroSelecionado(registro);
    setModalMotivoAberto(true);
  }

  async function salvarMotivos(motivos: RefugoMotivo[]) {
    if (!registroSelecionado) return;
    try {
      await editarRegistro(mesAtual, registroSelecionado.id, {
        data: registroSelecionado.data,
        producao: registroSelecionado.producao,
        refugo: registroSelecionado.refugo,
        motivos,
      });
      setRegistroSelecionado(null);
    } catch {
      toast.error("Erro ao salvar motivos. Tente novamente.");
    }
  }

  async function handleExcluir(id: string) {
    try {
      await excluirRegistro(mesAtual, id);
      toast.success("Registro excluído.");
    } catch {
      toast.error("Erro ao excluir. Tente novamente.");
    }
  }

  function abrirNovo() {
    // Sugere a data de hoje como padrão, mas sem restrição
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();
    setNovoData(`${ano}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`);
    setNovoAberto(true);
  }

  // ── Totais ─────────────────────────────────────────────────────────────────
  const totalProducao = registros.reduce((s, r) => s + r.producao, 0);
  const totalRefugo = registros.reduce((s, r) => s + r.refugo, 0);
  const totalGeral = totalProducao + totalRefugo;
  const percentTotal = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;

  // Pré-cálculo da linha de novo
  const novoProd = parseFloat(novoProducao || "0");
  const novoRef = parseFloat(novoRefugo || "0");
  const novoTotal = novoProd + novoRef;
  const novoPct = novoTotal > 0 ? (novoRef / novoTotal) * 100 : 0;

  // Pré-cálculo da linha em edição
  const editProd = parseFloat(editState.producao || "0");
  const editRef = parseFloat(editState.refugo || "0");
  const editTotal = editProd + editRef;
  const editPct = editTotal > 0 ? (editRef / editTotal) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            Lançamentos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {MESES_NOMES[mesAtual - 1]} {anoAtual} — {registros.length} registro{registros.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          disabled={novoAberto}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Lançamento
        </button>
      </div>

      {/* Aviso data em outro mês */}
      {novoAberto && dataEmOutroMes && (
        <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          Esta data pertence a <strong>{nomeMesDestino}</strong>. O registro será salvo naquele mês automaticamente.
        </div>
      )}

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

            {/* ── Linha de novo lançamento ── */}
            {novoAberto && (
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
                    step="0.01" min="0"
                  />
                </td>
                <td className="px-5 py-2.5">
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoRefugo}
                    onChange={e => setNovoRefugo(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    step="0.01" min="0"
                  />
                </td>
                <td className="px-5 py-2.5 text-right text-xs text-slate-400 font-mono">
                  {novoTotal > 0 ? novoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                </td>
                <td className="px-5 py-2.5 text-center text-xs text-slate-400 font-mono">
                  {novoTotal > 0 ? `${novoPct.toFixed(2)}%` : "—"}
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

            {/* ── Estado vazio ── */}
            {registros.length === 0 && !novoAberto && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500">Nenhum lançamento para este mês</p>
                    <p className="text-xs text-slate-400">Clique em "Novo Lançamento" para começar</p>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Registros existentes ── */}
            {registros.map((r, idx) => {
              const total = r.producao + r.refugo;
              const pct = total > 0 ? (r.refugo / total) * 100 : 0;
              const isEditing = editState.id === r.id;

              if (isEditing) {
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
                        step="0.01" min="0"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        value={editState.refugo}
                        onChange={e => setEditState(s => ({ ...s, refugo: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        step="0.01" min="0"
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
                        <button onClick={() => setEditState(emptyEdit)} className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors" title="Cancelar">
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirModalMotivos(r)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          r.motivos && r.motivos.length > 0
                            ? "text-green-700 bg-green-100 hover:bg-green-200"
                            : "text-amber-600 bg-amber-100 hover:bg-amber-200"
                        )}
                        title="Motivos de refugo"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => iniciarEdicao(r)}
                        className="p-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExcluir(r.id)}
                        className="p-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
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
        onClose={() => { setModalMotivoAberto(false); setRegistroSelecionado(null); }}
        motivos={registroSelecionado?.motivos}
        totalRefugo={registroSelecionado?.refugo || 0}
        onSave={salvarMotivos}
      />
    </div>
  );
}
