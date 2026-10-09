// Design: Clean Manufacturing Dashboard
// Tabela de lançamentos com suporte a filtros rápidos, exportação Excel/CSV, expansão inline de motivos e dark mode

import { useState, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES, DailyRecord, RefugoMotivo } from "@/lib/initialData";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CalendarDays,
  FileSpreadsheet,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import ModalMotivoRefugo from "./ModalMotivoRefugo";
import { exportMonthlyCSV } from "@/lib/exportExcel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatData(data: string): string {
  const parts = data.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : data;
}

function getPercentBadge(pct: number, meta: number): string {
  if (pct === 0) return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  if (pct <= meta * 0.8) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400";
  if (pct <= meta) return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-bold";
}

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

type FiltroMeta = "todos" | "fora" | "dentro" | "sem_motivo";

export default function TabelaRegistros() {
  const { mesAtual, anoAtual, getMesData, adicionarRegistro, editarRegistro, excluirRegistro, metaRefugo } =
    useDashboard();
  const mesData = getMesData(mesAtual);

  const [editState, setEditState] = useState<EditState>(emptyEdit);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoData, setNovoData] = useState("");
  const [novoProducao, setNovoProducao] = useState("");
  const [novoRefugo, setNovoRefugo] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroMeta>("todos");
  const [linhasExpandidas, setLinhasExpandidas] = useState<Record<string, boolean>>({});

  const [modalMotivoAberto, setModalMotivoAberto] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<DailyRecord | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmExclusaoAberta, setConfirmExclusaoAberta] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  // Toggle expansão inline
  function toggleExpandirLinha(id: string) {
    setLinhasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Estatísticas para contadores de filtros
  const contagensFiltros = useMemo(() => {
    let fora = 0;
    let dentro = 0;
    let semMotivo = 0;

    mesData.registros.forEach((r) => {
      const tot = r.producao + r.refugo;
      const pct = tot > 0 ? (r.refugo / tot) * 100 : 0;
      if (tot > 0) {
        if (pct > metaRefugo) fora++;
        else dentro++;
      }
      if (r.refugo > 0 && (!r.motivos || r.motivos.length === 0)) {
        semMotivo++;
      }
    });

    return {
      todos: mesData.registros.length,
      fora,
      dentro,
      semMotivo,
    };
  }, [mesData.registros, metaRefugo]);

  // Filtragem e ordenação dos registros
  const registros = useMemo(() => {
    let lista = [...mesData.registros];

    if (filtroAtivo === "fora") {
      lista = lista.filter((r) => {
        const tot = r.producao + r.refugo;
        const pct = tot > 0 ? (r.refugo / tot) * 100 : 0;
        return tot > 0 && pct > metaRefugo;
      });
    } else if (filtroAtivo === "dentro") {
      lista = lista.filter((r) => {
        const tot = r.producao + r.refugo;
        const pct = tot > 0 ? (r.refugo / tot) * 100 : 0;
        return tot > 0 && pct <= metaRefugo;
      });
    } else if (filtroAtivo === "sem_motivo") {
      lista = lista.filter((r) => r.refugo > 0 && (!r.motivos || r.motivos.length === 0));
    }

    return lista.sort((a, b) => {
      const diff = a.data.localeCompare(b.data);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [mesData.registros, sortDir, filtroAtivo, metaRefugo]);

  // Aviso data em outro mês
  const novoMesAno = mesAnoDeData(novoData);
  const dataEmOutroMes = novoMesAno && (novoMesAno.mes !== mesAtual || novoMesAno.ano !== anoAtual);
  const nomeMesDestino = novoMesAno ? `${MESES_NOMES[novoMesAno.mes - 1]} ${novoMesAno.ano}` : "";

  // Edição
  function iniciarEdicao(r: DailyRecord) {
    setEditState({
      id: r.id,
      data: r.data,
      producao: r.producao.toString(),
      refugo: r.refugo.toString(),
    });
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
      await editarRegistro(mesAtual, editState.id, {
        data: editState.data,
        producao,
        refugo,
      });
      setEditState(emptyEdit);
      toast.success("Registro atualizado com sucesso.");
    } catch {
      toast.error("Erro ao salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  }

  // Novo registro
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

    setSalvando(true);
    try {
      await adicionarRegistro(mesAtual, anoAtual, {
        data: novoData,
        producao,
        refugo,
        motivos: [],
      });
      setNovoAberto(false);
      setNovoData("");
      setNovoProducao("");
      setNovoRefugo("");
      if (dataEmOutroMes) {
        toast.success(`Registro adicionado em ${nomeMesDestino}.`);
      } else {
        toast.success("Registro adicionado com sucesso.");
      }
    } catch {
      toast.error("Erro ao salvar. Verifique a conexão.");
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
      toast.success("Motivos salvos com sucesso.");
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
      toast.error("Erro ao excluir.");
    } finally {
      setIsDeletingId(null);
    }
  }

  function abrirNovo() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();
    setNovoData(`${ano}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`);
    setNovoAberto(true);
  }

  // Totais da visualização filtrada
  const totais = useMemo(() => {
    const totalProducao = registros.reduce((s, r) => s + r.producao, 0);
    const totalRefugo = registros.reduce((s, r) => s + r.refugo, 0);
    const totalGeral = totalProducao + totalRefugo;
    return {
      totalProducao,
      totalRefugo,
      totalGeral,
      percentTotal: totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0,
    };
  }, [registros]);

  const previsaoNovo = useMemo(() => {
    const novoProd = parseFloat(novoProducao || "0");
    const novoRef = parseFloat(novoRefugo || "0");
    const novoTotal = novoProd + novoRef;
    return { novoProd, novoRef, novoTotal, novoPct: novoTotal > 0 ? (novoRef / novoTotal) * 100 : 0 };
  }, [novoProducao, novoRefugo]);

  const previsaoEdit = useMemo(() => {
    const editProd = parseFloat(editState.producao || "0");
    const editRef = parseFloat(editState.refugo || "0");
    const editTotal = editProd + editRef;
    return { editProd, editRef, editTotal, editPct: editTotal > 0 ? (editRef / editTotal) * 100 : 0 };
  }, [editState.producao, editState.refugo]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>Apontamentos Diários de Refugo</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
              {registros.length} de {contagensFiltros.todos}
            </span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {MESES_NOMES[mesAtual - 1]} {anoAtual} &bull; Tabela detalhada de entradas e motivos
          </p>
        </div>

        {/* Ações superiores */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Exportar Excel */}
          <button
            onClick={() => exportMonthlyCSV(mesAtual, anoAtual, mesData.registros, metaRefugo)}
            disabled={mesData.registros.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Baixar planilha formatada para Excel (.csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>

          {/* Botão Novo Lançamento */}
          <button
            onClick={abrirNovo}
            disabled={novoAberto}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Filtros Rápidos (Pills) */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3 h-3" /> Filtrar:
        </span>

        <button
          onClick={() => setFiltroAtivo("todos")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all shrink-0",
            filtroAtivo === "todos"
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          )}
        >
          Todos ({contagensFiltros.todos})
        </button>

        <button
          onClick={() => setFiltroAtivo("fora")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1",
            filtroAtivo === "fora"
              ? "bg-red-600 text-white"
              : "bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50"
          )}
        >
          <span>⚠️ Acima da Meta</span>
          <span className="opacity-80">({contagensFiltros.fora})</span>
        </button>

        <button
          onClick={() => setFiltroAtivo("dentro")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1",
            filtroAtivo === "dentro"
              ? "bg-emerald-600 text-white"
              : "bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
          )}
        >
          <span>✅ Dentro da Meta</span>
          <span className="opacity-80">({contagensFiltros.dentro})</span>
        </button>

        <button
          onClick={() => setFiltroAtivo("sem_motivo")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1",
            filtroAtivo === "sem_motivo"
              ? "bg-amber-600 text-white"
              : "bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50"
          )}
        >
          <span>📋 Sem Motivos</span>
          <span className="opacity-80">({contagensFiltros.semMotivo})</span>
        </button>
      </div>

      {/* Aviso data em outro mês */}
      {novoAberto && dataEmOutroMes && (
        <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          Esta data pertence a <strong>{nomeMesDestino}</strong>. O registro será salvo naquele mês automaticamente.
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative">
        <table className="w-full text-sm">
          <thead className="hidden md:table-header-group sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-sm">
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                <button
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  Data
                  {sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Produção (Kg)
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Refugo (Kg)
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total (Kg)
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                % Refugo
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Linha de novo lançamento */}
            {novoAberto && (
              <tr className="bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-col md:table-row py-2 md:py-0">
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Data</span>
                  <input
                    type="date"
                    value={novoData}
                    onChange={(e) => setNovoData(e.target.value)}
                    className="w-full border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Produção</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoProducao}
                    onChange={(e) => setNovoProducao(e.target.value)}
                    className="w-full border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                  <span className="md:hidden font-semibold text-slate-500 text-xs">Refugo</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={novoRefugo}
                    onChange={(e) => setNovoRefugo(e.target.value)}
                    className="w-full border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td className="px-5 py-2 md:py-2.5 text-right text-xs text-slate-400 font-mono flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                  <span>
                    {previsaoNovo.novoTotal > 0
                      ? previsaoNovo.novoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                      : "—"}
                  </span>
                </td>
                <td className="px-5 py-2 md:py-2.5 text-center text-xs text-slate-400 font-mono flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">% Refugo</span>
                  <span>{previsaoNovo.novoTotal > 0 ? `${previsaoNovo.novoPct.toFixed(2)}%` : "—"}</span>
                </td>
                <td className="px-5 py-3 md:py-2.5 flex justify-end items-center md:table-cell border-t md:border-0 border-blue-200 mt-2 md:mt-0">
                  <div className="flex items-center justify-center gap-1.5 w-full md:w-auto">
                    <button
                      onClick={salvarNovo}
                      disabled={salvando}
                      className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-50 flex justify-center items-center"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelarNovo}
                      className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex justify-center items-center"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Estado vazio */}
            {registros.length === 0 && !novoAberto && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Nenhum registro encontrado para este filtro
                    </p>
                    <p className="text-xs text-slate-400">Tente alternar o filtro acima ou adicionar um lançamento</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Registros existentes */}
            {registros.map((r, idx) => {
              const total = r.producao + r.refugo;
              const pct = total > 0 ? (r.refugo / total) * 100 : 0;
              const isEditing = editState.id === r.id;
              const estaExpandido = !!linhasExpandidas[r.id];
              const temMotivos = r.motivos && r.motivos.length > 0;

              if (isEditing) {
                return (
                  <tr
                    key={r.id}
                    className="bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 flex flex-col md:table-row py-2 md:py-0"
                  >
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Data</span>
                      <input
                        type="date"
                        value={editState.data}
                        onChange={(e) => setEditState((s) => ({ ...s, data: e.target.value }))}
                        className="w-full border border-amber-300 dark:border-amber-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Produção</span>
                      <input
                        type="number"
                        value={editState.producao}
                        onChange={(e) => setEditState((s) => ({ ...s, producao: e.target.value }))}
                        className="w-full border border-amber-300 dark:border-amber-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 flex flex-col md:table-cell gap-1">
                      <span className="md:hidden font-semibold text-slate-500 text-xs">Refugo</span>
                      <input
                        type="number"
                        value={editState.refugo}
                        onChange={(e) => setEditState((s) => ({ ...s, refugo: e.target.value }))}
                        className="w-full border border-amber-300 dark:border-amber-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-5 py-2 md:py-2.5 text-right text-xs font-mono text-slate-600 dark:text-slate-300 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                      <span>
                        {previsaoEdit.editTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-2 md:py-2.5 text-center flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500">% Refugo</span>
                      <span
                        className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded-full",
                          getPercentBadge(previsaoEdit.editPct, metaRefugo)
                        )}
                      >
                        {previsaoEdit.editPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 md:py-2.5 flex justify-end items-center md:table-cell border-t md:border-0 border-amber-200 mt-2 md:mt-0">
                      <div className="flex items-center justify-center gap-1.5 w-full md:w-auto">
                        <button
                          onClick={salvarEdicao}
                          disabled={salvando}
                          className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-50 flex justify-center items-center"
                          title="Salvar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditState(emptyEdit)}
                          className="flex-1 md:flex-none py-2 md:py-1 px-4 md:px-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex justify-center items-center"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <>
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group flex flex-col md:table-row py-2 md:py-0",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-900/40",
                      estaExpandido && "bg-blue-50/30 dark:bg-blue-950/20"
                    )}
                  >
                    <td className="px-5 py-2 md:py-3 text-xs font-medium text-slate-700 dark:text-slate-300 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500">Data</span>
                      <div className="flex items-center gap-2">
                        {temMotivos ? (
                          <button
                            onClick={() => toggleExpandirLinha(r.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded"
                            title="Expandir motivos inline"
                          >
                            <ChevronRight
                              className={cn("w-3.5 h-3.5 transition-transform", estaExpandido && "rotate-90 text-blue-600")}
                            />
                          </button>
                        ) : (
                          <span className="w-3.5 inline-block" />
                        )}
                        <span className="font-semibold">{formatData(r.data)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-700 dark:text-slate-300 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500 font-sans">Produção</span>
                      <span>
                        {r.producao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-700 dark:text-slate-300 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500 font-sans">Refugo</span>
                      <span className={r.refugo > 0 ? "text-red-600 dark:text-red-400 font-bold" : ""}>
                        {r.refugo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-2 md:py-3 text-right text-xs font-mono text-slate-600 dark:text-slate-400 flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                      <span>
                        {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-2 md:py-3 text-center flex justify-between items-center md:table-cell">
                      <span className="md:hidden font-semibold text-slate-500">% Refugo</span>
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", getPercentBadge(pct, metaRefugo))}>
                        {pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-2 md:py-3 flex justify-between items-center md:table-cell border-t md:border-0 border-slate-100 dark:border-slate-800 mt-2 pt-3 md:mt-0 md:pt-3">
                      <span className="md:hidden font-semibold text-slate-500">Ações</span>
                      <div className="flex items-center justify-end md:justify-center gap-1.5">
                        <button
                          onClick={() => abrirModalMotivos(r)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            temMotivos
                              ? "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                          )}
                          title="Gerenciar motivos de refugo"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => iniciarEdicao(r)}
                          className="p-1.5 text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 rounded-md transition-colors"
                          title="Editar lançamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => solicitarExclusao(r.id)}
                          disabled={isDeletingId === r.id}
                          className="p-1.5 text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 rounded-md transition-colors disabled:opacity-50"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Detalhes Inline de Motivos (Accordion) */}
                  {estaExpandido && temMotivos && (
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              📋 Motivos apontados em {formatData(r.data)}:
                            </span>
                            <button
                              onClick={() => abrirModalMotivos(r)}
                              className="text-blue-600 hover:underline text-[11px]"
                            >
                              Editar motivos
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {r.motivos?.map((m) => (
                              <div
                                key={m.id}
                                className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                  {m.motivo}
                                </span>
                                <span className="font-mono font-bold text-red-600 dark:text-red-400 shrink-0">
                                  {m.quantidade.toFixed(2)} Kg
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>

          {/* Totais do rodapé */}
          {registros.length > 0 && (
            <tfoot className="block md:table-footer-group mt-4 md:mt-0 border-t-2 border-slate-200 dark:border-slate-700">
              <tr className="bg-slate-100 dark:bg-slate-800 flex flex-col md:table-row py-2 md:py-0">
                <td className="px-5 py-2 md:py-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-center md:text-left border-b md:border-0 border-slate-200 dark:border-slate-700">
                  Total Filtrado
                </td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 dark:text-slate-100 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Produção</span>
                  <span>
                    {totais.totalProducao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 dark:text-slate-100 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Refugo</span>
                  <span>
                    {totais.totalRefugo.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-5 py-2 md:py-3 text-right text-xs font-mono font-bold text-slate-800 dark:text-slate-100 flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">Total</span>
                  <span>
                    {totais.totalGeral.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-5 py-2 md:py-3 text-center flex justify-between items-center md:table-cell">
                  <span className="md:hidden font-semibold text-slate-500 font-sans">% Refugo</span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold px-2 py-0.5 rounded-full",
                      getPercentBadge(totais.percentTotal, metaRefugo)
                    )}
                  >
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
        onClose={() => {
          setModalMotivoAberto(false);
          setRegistroSelecionado(null);
        }}
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
            <AlertDialogAction onClick={confirmarExclusao} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
