// Design: Clean Manufacturing Dashboard
// Modal de configurações: meta de % refugo e exportação de dados

import { useState, useRef, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { MESES_NOMES } from "@/lib/initialData";
import { X, Download, RotateCcw, Target, Plus, Trash2, Monitor, Upload, Image, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listarTodosSlides,
  uploadImagem,
  atualizarSlide,
  deletarSlide,
  MuralSlide,
} from "@/services/muralService";

interface ModalConfiguracoesProps {
  onClose: () => void;
}

// Ordena: alfabético, "Outros" sempre por último
function ordenarMotivos(motivos: string[]): string[] {
  const outros = motivos.filter(m => m.toLowerCase() === "outros");
  const resto  = motivos.filter(m => m.toLowerCase() !== "outros").sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...resto, ...outros];
}


export default function ModalConfiguracoes({ onClose }: ModalConfiguracoesProps) {
  const { anoAtual, metaRefugo, setMetaRefugo, getTotaisMes, meses, motivos, adicionarMotivo, removerMotivo } = useDashboard();
  const [novaMeta, setNovaMeta] = useState(metaRefugo.toString());
  const [novoMotivo, setNovoMotivo] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"meta" | "motivos" | "dados" | "modotv">("meta");

  // ── Estado Modo TV ──────────────────────────────────────────────────────────
  const [slides, setSlides] = useState<MuralSlide[]>([]);
  const [carregandoSlides, setCarregandoSlides] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaLegenda, setNovaLegenda] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TV_SEG_DASHBOARD_KEY = "tv_seg_dashboard";
  const TV_SEG_IMAGEM_KEY    = "tv_seg_imagem";
  const [segDashboard, setSegDashboard] = useState(
    () => parseInt(localStorage.getItem(TV_SEG_DASHBOARD_KEY) ?? "30", 10) || 30
  );
  const [segImagem, setSegImagem] = useState(
    () => parseInt(localStorage.getItem(TV_SEG_IMAGEM_KEY) ?? "15", 10) || 15
  );

  // Carrega slides ao entrar na aba Modo TV
  useEffect(() => {
    if (abaAtiva === "modotv") {
      carregarSlides();
    }
  }, [abaAtiva]);

  async function carregarSlides() {
    setCarregandoSlides(true);
    try {
      const data = await listarTodosSlides();
      setSlides(data);
    } catch {
      toast.error("Erro ao carregar imagens do mural.");
    } finally {
      setCarregandoSlides(false);
    }
  }

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivoSelecionado(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleUpload() {
    if (!arquivoSelecionado) { toast.error("Selecione um arquivo de imagem."); return; }
    if (!novoTitulo.trim())   { toast.error("Informe um título para a imagem."); return; }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (arquivoSelecionado.size > MAX_SIZE) {
      toast.error("O arquivo não pode ultrapassar 5 MB."); return;
    }

    setUploadando(true);
    try {
      await uploadImagem(arquivoSelecionado, novoTitulo.trim(), novaLegenda.trim() || undefined);
      toast.success("Imagem enviada com sucesso!");
      setArquivoSelecionado(null);
      setPreviewUrl(null);
      setNovoTitulo("");
      setNovaLegenda("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await carregarSlides();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploadando(false);
    }
  }

  async function handleToggleAtivo(slide: MuralSlide) {
    try {
      await atualizarSlide(slide.id, { ativo: !slide.ativo });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, ativo: !s.ativo } : s));
      toast.success(slide.ativo ? "Imagem desativada." : "Imagem ativada.");
    } catch {
      toast.error("Erro ao alterar status.");
    }
  }

  async function handleDeletar(slide: MuralSlide) {
    if (!confirm(`Excluir a imagem "${slide.titulo}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletarSlide(slide.id, slide.storage_path);
      setSlides(prev => prev.filter(s => s.id !== slide.id));
      toast.success("Imagem excluída.");
    } catch {
      toast.error("Erro ao excluir imagem.");
    }
  }

  function salvarTempos() {
    localStorage.setItem(TV_SEG_DASHBOARD_KEY, String(segDashboard));
    localStorage.setItem(TV_SEG_IMAGEM_KEY, String(segImagem));
    toast.success("Tempos do Modo TV salvos!");
  }

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
    a.download = `controle-refugo-${anoAtual}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo CSV exportado com sucesso.");
  }

  function limparDados() {
    if (!confirm("Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.")) return;
    localStorage.removeItem(`dashboard-refugo-${anoAtual}`);
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
        <div className="flex border-b border-slate-100 px-6 overflow-x-auto">
          {([
            { id: "meta",    label: "Meta"    },
            { id: "motivos", label: "Motivos" },
            { id: "dados",   label: "Dados"   },
            { id: "modotv",  label: "Modo TV" },
          ] as const).map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                abaAtiva === aba.id
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {aba.label}
            </button>
          ))}
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

          {/* Aba Modo TV */}
          {abaAtiva === "modotv" && (
            <div className="space-y-6">
              {/* Upload de nova imagem */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-indigo-700" />
                  <h3 className="text-sm font-semibold text-slate-700">Adicionar Imagem ao Mural</h3>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-slate-200" style={{ height: 120 }}>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="space-y-2">
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">
                      {arquivoSelecionado ? arquivoSelecionado.name : "Clique para selecionar JPG, PNG ou WEBP (máx 5 MB)"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleArquivoChange}
                    />
                  </div>

                  <input
                    type="text"
                    value={novoTitulo}
                    onChange={e => setNovoTitulo(e.target.value)}
                    placeholder="Título da imagem (ex: Segurança em Primeiro Lugar)*"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    value={novaLegenda}
                    onChange={e => setNovaLegenda(e.target.value)}
                    placeholder="Legenda opcional (ex: Use seus EPIs!)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    onClick={handleUpload}
                    disabled={uploadando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-700 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadando ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Enviar Imagem</>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista de imagens cadastradas */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Imagens Cadastradas</h3>
                {carregandoSlides ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                ) : slides.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-slate-100">
                    Nenhuma imagem cadastrada ainda.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {slides.map((slide) => (
                      <div
                        key={slide.id}
                        className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-100 p-2 group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-200">
                          <img
                            src={slide.url_publica}
                            alt={slide.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${slide.ativo ? "text-slate-700" : "text-slate-400 line-through"}` }>
                            {slide.titulo}
                          </p>
                          {slide.legenda && (
                            <p className="text-xs text-slate-400 truncate">{slide.legenda}</p>
                          )}
                        </div>

                        {/* Toggle ativo */}
                        <button
                          onClick={() => handleToggleAtivo(slide)}
                          title={slide.ativo ? "Desativar" : "Ativar"}
                          className="flex-shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {slide.ativo
                            ? <ToggleRight className="w-5 h-5 text-indigo-600" />
                            : <ToggleLeft  className="w-5 h-5" />}
                        </button>

                        {/* Deletar */}
                        <button
                          onClick={() => handleDeletar(slide)}
                          title="Excluir imagem"
                          className="flex-shrink-0 p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configurações de tempo */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Tempos de Exibição</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-600 w-36 flex-shrink-0">Dashboard (segundos)</label>
                    <input
                      type="number"
                      min={5} max={300}
                      value={segDashboard}
                      onChange={e => setSegDashboard(Number(e.target.value))}
                      className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">padrão: 30s</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-600 w-36 flex-shrink-0">Por imagem (segundos)</label>
                    <input
                      type="number"
                      min={5} max={120}
                      value={segImagem}
                      onChange={e => setSegImagem(Number(e.target.value))}
                      className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">padrão: 15s</span>
                  </div>
                  <button
                    onClick={salvarTempos}
                    className="w-full px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Salvar Tempos
                  </button>
                </div>
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
