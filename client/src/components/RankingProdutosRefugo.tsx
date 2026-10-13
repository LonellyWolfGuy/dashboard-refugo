// Design: Clean Manufacturing Dashboard
// Painel Top 10 Produtos & Ferramentas com Maior Rejeição (Últimos 30 Dias)
// Dados coletados diretamente do TOTVS Protheus (SBC + SC2 + SD3 + SB1)

import { memo, useState, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateRankingProdutosPDF } from "@/lib/generatePDF";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Flame,
  Wrench,
  Clock,
  Layers,
  AlertTriangle,
  Package,
  TrendingUp,
  HelpCircle,
  Printer,
  BarChart3,
  Scale,
} from "lucide-react";

export const RankingProdutosRefugo = memo(function RankingProdutosRefugo() {
  const { rankingProdutos, metaRefugo } = useDashboard();
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [tabGrafico, setTabGrafico] = useState<"rejeicao" | "comparativo" | "motivos">("rejeicao");

  const produtos = rankingProdutos?.produtos ?? [];

  // Lista de motivos presentes no Top 10 ordenados por relevância de peso (Kg)
  const motivosTop10 = useMemo(() => {
    const mapa = new Map<string, number>();
    produtos.forEach((p) => {
      (p.motivos ?? []).forEach((m) => {
        if (m.motivo) {
          mapa.set(m.motivo, (mapa.get(m.motivo) || 0) + m.kg);
        }
      });
    });
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome]) => nome);
  }, [produtos]);

  // Dados formatados para os gráficos Recharts
  const dadosGrafico = useMemo(() => {
    return produtos.map((p, idx) => {
      const ferramentaCompleta = p.ferramentas && p.ferramentas !== "Sem ferramenta" ? p.ferramentas : p.produto;
      const item: Record<string, any> = {
        posicao: idx + 1,
        codigo: p.produto,
        rotulo: `${idx + 1}º ${ferramentaCompleta}`,
        codigoCompleto: p.produto,
        descricao: p.descricao,
        ferramentas: p.ferramentas,
        kgProducao: Number(p.kgProducao.toFixed(1)),
        kgRefugo: Number(p.kgRefugo.toFixed(1)),
        rejeicaoPct: Number(p.rejeicaoPct.toFixed(2)),
      };
      (p.motivos ?? []).forEach((m) => {
        item[m.motivo] = Number(m.kg.toFixed(1));
      });
      return item;
    });
  }, [produtos]);

  async function handleGerarPDF() {
    if (!rankingProdutos) return;
    try {
      setGerandoPDF(true);
      await generateRankingProdutosPDF(rankingProdutos, metaRefugo);
      toast.success("Relatório de produtos & motivos exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao gerar o relatório em PDF.");
    } finally {
      setGerandoPDF(false);
    }
  }

  if (!rankingProdutos || !rankingProdutos.produtos || rankingProdutos.produtos.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Top 10 Produtos com Maior Rejeição (Últimos 30 Dias)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Cruzamento analítico de OPs, Ferramentas e Apontamentos do Protheus
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
            Atualização diária: 07:30 e 18:00 (Seg a Sex)
          </span>
        </div>
        <div className="py-10 text-center text-slate-400 dark:text-slate-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Aguardando primeira execução do ranking no servidor
          </p>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Assim que a rotina automática das 07:30 / 18:00 for executada no Protheus, o ranking dos 10 produtos mais
            críticos com suas ferramentas aparecerá aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const dataAtualizacao = new Date(rankingProdutos.atualizado_em).toLocaleString("pt-BR");

  // Totais agregados do Top 10
  const totalRefugoTop10 = produtos.reduce((s, p) => s + p.kgRefugo, 0);
  const totalProdTop10 = produtos.reduce((s, p) => s + p.kgProducao, 0);
  const mediaRejeicaoTop10 =
    totalProdTop10 + totalRefugoTop10 > 0
      ? (totalRefugoTop10 / (totalProdTop10 + totalRefugoTop10)) * 100
      : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Top 10 Produtos & Ferramentas com Maior Rejeição
              </h3>
              <span className="hidden md:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                Últimos 30 Dias
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Rastreamento por Ordem de Produção (SBC + SC2) cruzado com Produção Líquida (SD3 + SB1)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-mono text-[11px]">Atualizado: {dataAtualizacao}</span>
          </div>

          <button
            onClick={handleGerarPDF}
            disabled={gerandoPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            title="Gerar e imprimir relatório completo em PDF (Padrão Implatec com produtos, moldes e motivos)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{gerandoPDF ? "Gerando..." : "Imprimir Relatório (PDF)"}</span>
          </button>
        </div>
      </div>

      {/* Resumo Rápido do Top 10 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200/80 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/40 text-xs">
          <div className="p-2 rounded-md bg-red-600/10 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Refugo Acumulado (Top 10)</p>
            <p className="font-mono text-base font-extrabold text-red-700 dark:text-red-400">
              {totalRefugoTop10.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 text-xs">
          <div className="p-2 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Produção Total (Top 10)</p>
            <p className="font-mono text-base font-extrabold text-blue-800 dark:text-blue-300">
              {totalProdTop10.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Kg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 text-xs">
          <div className="p-2 rounded-md bg-amber-600/10 text-amber-700 dark:text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Média Ponderada Rejeição</p>
            <p className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">
              {mediaRejeicaoTop10.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tabela do Ranking */}
      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold">
            <tr>
              <th className="px-3.5 py-2.5 w-12 text-center">#</th>
              <th className="px-3.5 py-2.5">Produto & Descrição</th>
              <th className="px-3.5 py-2.5">Ferramentas / Moldes</th>
              <th className="px-3.5 py-2.5">Motivos de Refugo (Kg)</th>
              <th className="px-3.5 py-2.5 text-right">Qtd Produzida</th>
              <th className="px-3.5 py-2.5 text-right">Produção (Kg)</th>
              <th className="px-3.5 py-2.5 text-right">Refugo (Kg)</th>
              <th className="px-3.5 py-2.5 text-right w-40">% Rejeição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {produtos.map((p, idx) => {
              const posicao = idx + 1;
              const isCritico = p.rejeicaoPct >= 30;
              const isAtencao = p.rejeicaoPct >= 20 && p.rejeicaoPct < 30;

              return (
                <tr
                  key={`${p.produto}-${idx}`}
                  className={cn(
                    "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors",
                    posicao <= 3 && "bg-red-50/20 dark:bg-red-950/10"
                  )}
                >
                  {/* Posição */}
                  <td className="px-3.5 py-3 text-center">
                    {posicao === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-extrabold text-xs shadow-xs">
                        1º
                      </span>
                    ) : posicao === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-xs shadow-xs">
                        2º
                      </span>
                    ) : posicao === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-extrabold text-xs shadow-xs">
                        3º
                      </span>
                    ) : (
                      <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {posicao}º
                      </span>
                    )}
                  </td>

                  {/* Produto */}
                  <td className="px-3.5 py-3">
                    <div className="min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {p.produto}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          PA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {p.descricao || "Sem descrição"}
                      </p>
                    </div>
                  </td>

                  {/* Ferramentas */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-1.5 min-w-[160px] text-slate-700 dark:text-slate-300">
                      <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span
                        className="font-medium text-[11px] whitespace-normal"
                        title={p.ferramentas}
                      >
                        {p.ferramentas}
                      </span>
                    </div>
                  </td>

                  {/* Motivos de refugo */}
                  <td className="px-3.5 py-3">
                    <div className="min-w-[200px] space-y-0.5">
                      {p.motivos && p.motivos.length > 0 ? (
                        p.motivos.map((m) => (
                          <div
                            key={m.motivo}
                            className="flex items-center justify-between gap-3 text-[11px]"
                          >
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={m.motivo}>
                              {m.motivo}
                            </span>
                            <span className="font-mono font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                              {m.kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg
                              <span className="text-slate-400 font-normal ml-1">
                                ({p.kgRefugo > 0 ? ((m.kg / p.kgRefugo) * 100).toFixed(0) : 0}%)
                              </span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Qtd Produzida */}
                  <td className="px-3.5 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.quantidadeProduzida.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                    <span className="text-[10px] text-slate-400 font-sans">{p.unidade}</span>
                  </td>

                  {/* Produção Kg */}
                  <td className="px-3.5 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.kgProducao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg
                  </td>

                  {/* Refugo Kg */}
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                    {p.kgRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg
                  </td>

                  {/* % Rejeição com mini barra */}
                  <td className="px-3.5 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "font-mono font-extrabold text-sm",
                          isCritico
                            ? "text-red-600 dark:text-red-400"
                            : isAtencao
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {p.rejeicaoPct.toFixed(2)}%
                      </span>
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            isCritico ? "bg-red-500" : isAtencao ? "bg-amber-500" : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(100, p.rejeicaoPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Gráfico Visual Integrado do Top 10 ────────────────────────────────────── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-red-500" />
              <span>Análise Gráfica dos Itens Críticos</span>
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Visualização comparativa de perdas, produção e motivos entre os 10 produtos
            </p>
          </div>

          {/* Abas de Seleção de Gráfico */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setTabGrafico("rejeicao")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer",
                tabGrafico === "rejeicao"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5 text-red-500" />
              <span>Perda (Kg) vs % Rejeição</span>
            </button>

            <button
              onClick={() => setTabGrafico("comparativo")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer",
                tabGrafico === "comparativo"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <Scale className="w-3.5 h-3.5 text-blue-500" />
              <span>Produção vs Refugo</span>
            </button>

            <button
              onClick={() => setTabGrafico("motivos")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer",
                tabGrafico === "motivos"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Detalhamento por Motivos</span>
            </button>
          </div>
        </div>

        {/* Área do Gráfico */}
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 sm:p-4">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {tabGrafico === "rejeicao" ? (
                <ComposedChart data={dadosGrafico} margin={{ top: 15, right: 15, left: -10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis
                    dataKey="rotulo"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="kg"
                    stroke="#dc2626"
                    tick={{ fontSize: 11 }}
                    unit=" Kg"
                    tickFormatter={(v) => Number(v).toLocaleString("pt-BR")}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    stroke="#f59e0b"
                    tick={{ fontSize: 11 }}
                    unit="%"
                    domain={[0, "auto"]}
                  />
                  <Tooltip content={<CustomTooltipRanking />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine
                    yAxisId="pct"
                    y={metaRefugo}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Meta: ${metaRefugo}%`,
                      fill: "#10b981",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar
                    yAxisId="kg"
                    dataKey="kgRefugo"
                    name="Refugo (Kg)"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="rejeicaoPct"
                    name="% Rejeição"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f59e0b" }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              ) : tabGrafico === "comparativo" ? (
                <BarChart data={dadosGrafico} margin={{ top: 15, right: 15, left: -10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis
                    dataKey="rotulo"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    unit=" Kg"
                    tickFormatter={(v) => Number(v).toLocaleString("pt-BR")}
                  />
                  <Tooltip content={<CustomTooltipRanking />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="kgProducao"
                    name="Produção (Kg)"
                    fill="#0284c7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="kgRefugo"
                    name="Refugo (Kg)"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart data={dadosGrafico} margin={{ top: 15, right: 15, left: -10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis
                    dataKey="rotulo"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    unit=" Kg"
                    tickFormatter={(v) => Number(v).toLocaleString("pt-BR")}
                  />
                  <Tooltip content={<CustomTooltipRanking />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  {motivosTop10.map((motivo, mIdx) => (
                    <Bar
                      key={motivo}
                      dataKey={motivo}
                      name={motivo}
                      stackId="a"
                      fill={CORES_MOTIVOS[mIdx % CORES_MOTIVOS.length]}
                      radius={mIdx === motivosTop10.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Nota de Engenharia de Processos */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Fórmula: Rejeição % = (Kg Refugo / (Kg Produção + Kg Refugo)) × 100
        </span>
        <span className="font-semibold text-slate-600 dark:text-slate-400">
          TOTVS Protheus &bull; Sincronização automática às 07:30 e 18:00 (Seg a Sex)
        </span>
      </div>
    </div>
  );
});

// Paleta industrial para os motivos empilhados
const CORES_MOTIVOS = [
  "#dc2626", // vermelho forte
  "#ea580c", // laranja
  "#f59e0b", // âmbar
  "#0284c7", // azul
  "#8b5cf6", // roxo
  "#059669", // esmeralda
  "#ec4899", // rosa
  "#06b6d4", // ciano
  "#64748b", // ardósia
  "#d97706", // ouro
];

// Tooltip rico para os gráficos do Top 10
function CustomTooltipRanking({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const motivosItems = payload.filter(
    (p: any) =>
      p.dataKey !== "kgRefugo" &&
      p.dataKey !== "kgProducao" &&
      p.dataKey !== "rejeicaoPct" &&
      Number(p.value) > 0
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-xl max-w-xs text-xs space-y-2 z-50">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
          <span className="text-red-600 dark:text-red-400 font-extrabold">{d.posicao}º</span>
          <span className="font-mono">{d.codigoCompleto || d.codigo}</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{d.descricao}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ferramenta: {d.ferramentas}</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
          <span>Produção Total:</span>
          <span className="font-mono font-semibold">
            {d.kgProducao?.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Kg
          </span>
        </div>
        <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-bold">
          <span>Refugo Total:</span>
          <span className="font-mono">
            {d.kgRefugo?.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Kg
          </span>
        </div>
        <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
          <span>% Rejeição:</span>
          <span className="font-mono">{d.rejeicaoPct?.toFixed(2)}%</span>
        </div>
      </div>

      {motivosItems.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivos no Item:</p>
          {motivosItems.map((p: any) => (
            <div key={p.dataKey} className="flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {Number(p.value).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Kg
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RankingProdutosRefugo;
