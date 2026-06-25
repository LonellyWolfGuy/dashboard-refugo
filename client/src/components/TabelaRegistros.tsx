// Design: Clean Manufacturing Dashboard
// Tabela de lançamentos com suporte a qualquer data (passado, presente ou futuro)

import { useState, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { DailyRecord, RefugoMotivo } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown, AlertCircle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import ModalMotivoRefugo from "./ModalMotivoRefugo";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
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
  const [salvando, setSalvando] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmExclusaoAberta, setConfirmExclusaoAberta] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const registros = useMemo(() => {
    return [...mesData.registros].sort((a, b) => {
      const diff = a.data.localeCompare(b.data);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [mesData.registros, sortDir]);

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
    setSalvando(true);
    try {
      await editarRegistro(mesAtual, editState.id, { data: editState.data, producao, refugo });
      setEditState(emptyEdit);
      toast.success("Registro atualizado com sucesso.");
    } catch {
      toast.error("Erro ao salvar. Verifique a conexão e tente novamente.");
    } finally {
      setSalvando(false);
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

    setSalvando(true);
    try {
      await adicionarRegistro(destino.mes, destino.ano, { data: novoData, producao, refugo });
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
    } finally {
      setSalvando(false);
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

  function solicitarExclusao(id: string) {
    setIdParaExcluir(id);
    setConfirmExclusaoAberta(true);
  }

  async function confirmarExclusao() {
    if (!idParaExcluir) return;
    const id = idParaExcluir;
    setIdParaExcluir(null);
    setConfirmExclusaoAberta(false);
    
    setIsDeletingId(id);
    try {
      await excluirRegistro(mesAtual, id);
      toast.success("Registro excluído.");
    } catch {
      toast.error("Erro ao excluir. Tente novamente.");
    } finally {
      setIsDeletingId(null);
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
  const totais = useMemo(() => {
    const totalProducao = registros.reduce((s, r) => s + r.producao, 0);
    const totalRefugo = registros.reduce((s, r) => s + r.refugo, 0);
    const totalGeral = totalProducao + totalRefugo;
    return { totalProducao, totalRefugo, totalGeral, percentTotal: totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0 };
  }, [registros]);

  // Pré-cálculo da linha de novo
  const previsaoNovo = useMemo(() => {
    const novoProd = parseFloat(novoProducao || "0");
    const novoRef = parseFloat(novoRefugo || "0");
    const novoTotal = novoProd + novoRef;
    return { novoProd, novoRef, novoTotal, novoPct: novoTotal > 0 ? (novoRef / novoTotal) * 100 : 0 };
  }, [novoProducao, novoRefugo]);

  // Pré-cálculo da linha em edição
  const previsaoEdit = useMemo(() => {
    const editProd = parseFloat(editState.producao || "0");
    const editRef = parseFloat(editState.refugo || "0");
    const editTotal = editProd + editRef;
    return { editProd, editRef, editTotal, editPct: editTotal > 0 ? (editRef / editTotal) * 100 : 0 };
  }, [editState.producao, editState.refugo]);

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
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative">
        <table className="w-full text-sm">
          <thead className="hidden md:table-header-group sticky top-0 z-10 bg-slate-50 shadow-sm">
            <tr className="border-b border-slate-100">
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
              <tr className="bg-blue-50 border-b border-blue-100 flex flex-col md:table-row py-2 md:py-0">
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Data</span>
                  <input
                    type="date"
                    value={novoData}
                    onChange={e => setNovoData(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Produção</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoProducao}
                    onChange={e => setNovoProducao(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    step="0.01" min="0"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Refugo</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoRefugo}
                    onChange={e => setNovoRefugo(e.target.value)}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    step="0.01" min="0"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 text-right text-xs text-slate-400 font-mono flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                  <span>{previsaoNovo.novoTotal > 0 ? previsaoNovo.novoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</span>
                </td>
                <td className="px-5 py-2 md:py-2.5 text-center text-xs text-slate-400 font-mono flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">% Refugo</span>
                  <span>{previsaoNovo.novoTotal > 0 ? `${previsaoNovo.novoPct.toFixed(2)}%` : "—"}</span>
                </td>
                <td className="px-5 py-3 md:py-2.5 flex justify-end items-center md:table-cell border-t md:border-0 border-blue-200 mt-2 md:mt-0">
                  <div className="flex items-center justify-center gap-1.5 w-full md:w-auto">
                    <button onClick={salvarNovo} disabled={salvando} className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-50 flex justify-center items-center" title="Salvar">
                      <Check className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                    <button onClick={cancelarNovo} className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex justify-center items-center" title="Cancelar">
                      <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
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
                  <tr key={r.id} className="bg-amber-50 border-b border-amber-100 flex flex-col md:table-row py-2 md:py-0">
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Data</span>
                      <input
                        type="date"
                        value={editState.data}
                        onChange={e => setEditState(s => ({ ...s, data: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Produção</span>
                      <input
                        type="number"
                        value={editState.producao}
                        onChange={e => setEditState(s => ({ ...s, producao: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        step="0.01" min="0"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Refugo</span>
                      <input
                        type="number"
                        value={editState.refugo}
                        onChange={e => setEditState(s => ({ ...s, refugo: e.target.value }))}
                        className="w-full border border-amber-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        step="0.01" min="0"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 text-right text-xs font-mono text-slate-600 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                      <span>{previsaoEdit.editTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-5 py-2 md:py-2.5 text-center flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500">% Refugo</span>
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", getPercentBadge(previsaoEdit.editPct, metaRefugo))}>
                        {previsaoEdit.editPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 md:py-2.5 flex justify-end items-center md:table-cell border-t md:border-0 border-amber-200 mt-2 md:mt-0">
                      <div className="flex items-center justify-center gap-1.5 w-full md:w-auto">
                        <button onClick={salvarEdicao} disabled={salvando} className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-50 flex justify-center items-center" title="Salvar">
                          <Check className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                        <button onClick={() => setEditState(emptyEdit)} className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex justify-center items-center" title="Cancelar">
                          <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
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
                    "border-b border-slate-50 hover:bg-slate-50 transition-colors group flex flex-col md:table-row py-2 md:py-0",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="px-5 py-2 md:py-3 text-xs font-medium text-slate-700 flex justify-between items-center md:table-cell">
                    <span className="md:hidden font-semibold text-slate-500">Data</span>
                    <span>{formatData(r.data)}</span>
                  </td>
                  <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-700 flex justify-between items-center md:table-cell">
                    <span className="md:hidden font-semibold text-slate-500 font-sans">Produção</span>
                    <span>{r.producao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-700 flex justify-between items-center md:table-cell">
                    <span className="md:hidden font-semibold text-slate-500 font-sans">Refugo</span>
                    <span>{r.refugo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-600 flex justify-between items-center md:table-cell">
                    <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                    <span>{total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-5 py-2 md:py-3 text-center flex justify-between items-center md:table-cell">
                    <span className="md:hidden font-semibold text-slate-500">% Refugo</span>
                    <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", getPercentBadge(pct, metaRefugo))}>
                      {pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-2 md:py-3 flex justify-between items-center md:table-cell border-t md:border-0 border-slate-100 mt-2 pt-3 md:mt-0 md:pt-3">
                    <span className="md:hidden font-semibold text-slate-500">Ações</span>
                    <div className="flex items-center justify-end md:justify-center gap-2">
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
                        onClick={() => solicitarExclusao(r.id)}
                        disabled={isDeletingId === r.id}
                        className="p-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
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
            <tfoot className="block md:table-footer-group mt-4 md:mt-0 border-t-2 border-slate-200">
              <tr className="bg-slate-100 flex flex-col md:table-row py-2 md:py-0">
                <td className="px-5 py-2 md:py-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-center md:text-left border-b md:border-0 border-slate-200">Total Mensal</td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Produção</span>
                  <span>{totais.totalProducao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Refugo</span>
                  <span>{totais.totalRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                  <span>{totais.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="px-5 py-2 md:py-3 text-center flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">% Refugo</span>
                  <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-full", getPercentBadge(totais.percentTotal, metaRefugo))}>
                    {totais.percentTotal.toFixed(2)}%
                  </span>
                </td>
                <td className="hidden md:table-cell" />
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

      {/* Confirmação de Exclusão */}
      <AlertDialog open={confirmExclusaoAberta} onOpenChange={setConfirmExclusaoAberta}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de produção e refugo deste dia será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusao}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
