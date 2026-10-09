// Design: Clean Manufacturing Dashboard
// Painel Top 10 Produtos & Ferramentas com Maior Rejeição (Últimos 30 Dias)
// Dados coletados diretamente do TOTVS Protheus (SBC + SC2 + SD3 + SB1)

import { memo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";
import {
  Flame,
  Wrench,
  Clock,
  Layers,
  AlertTriangle,
  Package,
  TrendingUp,
  HelpCircle,
} from "lucide-react";

export const RankingProdutosRefugo = memo(function RankingProdutosRefugo() {
  const { rankingProdutos } = useDashboard();

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
            Atualização diária: 07:00 e 18:00
          </span>
        </div>
        <div className="py-10 text-center text-slate-400 dark:text-slate-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Aguardando primeira execução do ranking no servidor
          </p>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Assim que a rotina automática das 07:00 / 18:00 for executada no Protheus, o ranking dos 10 produtos mais
            críticos com suas ferramentas aparecerá aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const produtos = rankingProdutos.produtos;
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

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-mono text-[11px]">Atualizado: {dataAtualizacao}</span>
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
                        className="font-medium text-[11px] truncate max-w-[220px]"
                        title={p.ferramentas}
                      >
                        {p.ferramentas}
                      </span>
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

      {/* Nota de Engenharia de Processos */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Fórmula: Rejeição % = (Kg Refugo / (Kg Produção + Kg Refugo)) × 100
        </span>
        <span className="font-semibold text-slate-600 dark:text-slate-400">
          TOTVS Protheus &bull; Sincronização automática às 07:00 e 18:00
        </span>
      </div>
    </div>
  );
});

export default RankingProdutosRefugo;
