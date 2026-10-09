import { DailyRecord, MESES_NOMES } from "./initialData";

export function exportMonthlyCSV(
  mes: number,
  ano: number,
  registros: DailyRecord[],
  metaRefugo: number
) {
  const nomeMes = MESES_NOMES[mes - 1];
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data));

  const linhas: string[] = [];

  // Cabeçalho institucional
  linhas.push(`IMPLATEC PERFIS PLASTICOS - CONTROLE DE REFUGO INDUSTRIAL`);
  linhas.push(`Relatório Mensal de Apontamentos: ${nomeMes} / ${ano}`);
  linhas.push(`Meta Mensal de Refugo: <= ${metaRefugo.toFixed(2).replace(".", ",")}%`);
  linhas.push(`Data de Extração: ${new Date().toLocaleString("pt-BR")}`);
  linhas.push(""); // Linha em branco

  // Cabeçalho da tabela
  linhas.push(
    [
      "Data",
      "Produção (Kg)",
      "Refugo (Kg)",
      "Total Geral (Kg)",
      "% Refugo",
      "Status Meta",
      "Detalhamento dos Motivos de Refugo",
    ].join(";")
  );

  let totalProd = 0;
  let totalRef = 0;

  ordenados.forEach((r) => {
    totalProd += r.producao;
    totalRef += r.refugo;
    const totalDia = r.producao + r.refugo;
    const pctDia = totalDia > 0 ? (r.refugo / totalDia) * 100 : 0;
    const dentroMeta = pctDia <= metaRefugo ? "DENTRO DA META" : "ACIMA DA META";

    const [a, m, d] = r.data.split("-");
    const dataFormatada = `${d}/${m}/${a}`;

    const motivosStr = (r.motivos || [])
      .map((m) => `${m.motivo}: ${m.quantidade.toFixed(2).replace(".", ",")} Kg`)
      .join(" | ");

    linhas.push(
      [
        dataFormatada,
        r.producao.toFixed(2).replace(".", ","),
        r.refugo.toFixed(2).replace(".", ","),
        totalDia.toFixed(2).replace(".", ","),
        pctDia.toFixed(2).replace(".", ",") + "%",
        dentroMeta,
        `"${motivosStr.replace(/"/g, '""')}"`,
      ].join(";")
    );
  });

  // Linha de Totais
  linhas.push("");
  const totalGeral = totalProd + totalRef;
  const pctGeral = totalGeral > 0 ? (totalRef / totalGeral) * 100 : 0;
  linhas.push(
    [
      "TOTAIS DO MES",
      totalProd.toFixed(2).replace(".", ","),
      totalRef.toFixed(2).replace(".", ","),
      totalGeral.toFixed(2).replace(".", ","),
      pctGeral.toFixed(2).replace(".", ",") + "%",
      pctGeral <= metaRefugo ? "ATINGIU A META" : "NAO ATINGIU A META",
      "",
    ].join(";")
  );

  // Gera o arquivo com BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel do Windows
  const conteudo = "\uFEFF" + linhas.join("\r\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Relatorio-Refugo-${ano}-${String(mes).padStart(2, "0")}-${nomeMes}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
