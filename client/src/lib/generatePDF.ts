// Utilitário para gerar PDF do relatório mensal com logo Implatec e tabela completa

import { MESES_NOMES } from "./initialData";

export async function generateMonthlyPDF(
  mesAtual: number,
  anoAtual: number,
  registros: any[],
  metaRefugo: number
) {
  try {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 15;
    const marginR = 15;
    const usableWidth = pageWidth - marginL - marginR;
    let y = 10;

    // ===== LOGO =====
    const logoUrl =
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663426607805/TdnUqJefUqzPEiCTQPUCvH/Logo-Implatec-Melhor-Qualidade-removebg-preview_39f348ff.png";
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, "PNG", marginL, y, 40, 15);
    } catch {
      console.warn("Logo não carregada, continuando sem ela.");
    }

    // ===== TÍTULO =====
    doc.setFontSize(16);
    doc.setTextColor(13, 122, 46);
    doc.text(`CONTROLE DE REFUGO ${anoAtual}`, pageWidth / 2, y + 8, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Relatório de ${MESES_NOMES[mesAtual - 1]} ${anoAtual}`,
      pageWidth / 2,
      y + 15,
      { align: "center" }
    );
    y += 25;

    // ===== TOTAIS — calculados a partir dos registros já filtrados =====
    const totalProducao = registros.reduce((s: number, r: any) => s + Number(r.producao), 0);
    const totalRefugo   = registros.reduce((s: number, r: any) => s + Number(r.refugo), 0);
    const totalGeral    = totalProducao + totalRefugo;
    const percentRefugo = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DO MÊS", marginL, y);
    y += 8;

    doc.setDrawColor(13, 122, 46);
    doc.setLineWidth(0.5);
    doc.rect(marginL, y, usableWidth, 25);

    const colX = [marginL + 5, marginL + 50, marginL + 95, marginL + 140];
    const labelY = y + 6;
    const valueY = y + 14;

    const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

    // Labels
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    ["Produção Total", "Total Refugo", "Total Geral", "% Refugo"].forEach((label, i) => {
      doc.text(label, colX[i], labelY);
    });

    // Valores
    doc.setFontSize(12);
    doc.setTextColor(13, 122, 46);
    doc.text(fmtNum(totalProducao), colX[0], valueY);

    doc.setTextColor(220, 38, 38);
    doc.text(fmtNum(totalRefugo), colX[1], valueY);

    doc.setTextColor(0, 0, 0);
    doc.text(fmtNum(totalGeral), colX[2], valueY);

    const pColor = percentRefugo <= metaRefugo ? [13, 122, 46] : [220, 38, 38];
    doc.setTextColor(pColor[0], pColor[1], pColor[2]);
    doc.text(`${percentRefugo.toFixed(2)}%  (meta: ${metaRefugo}%)`, colX[3], valueY);

    y += 32;

    // ===== TABELA DE REGISTROS DIÁRIOS =====
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("REGISTROS DIÁRIOS", marginL, y);
    y += 7;

    if (registros.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Nenhum registro encontrado para este mês.", marginL, y);
      y += 10;
    } else {
      // Larguras das colunas (sem coluna Motivos separada — motivos ficam em linha extra)
      const cols = {
        data:     { x: marginL,      w: 22, label: "Data",           align: "left"  as const },
        producao: { x: marginL + 22, w: 32, label: "Produção",       align: "right" as const },
        refugo:   { x: marginL + 54, w: 28, label: "Refugo",         align: "right" as const },
        total:    { x: marginL + 82, w: 28, label: "Total",          align: "right" as const },
        percent:  { x: marginL + 110,w: 22, label: "% Refugo",       align: "right" as const },
        motivos:  { x: marginL + 132,w: usableWidth - 132, label: "Motivos", align: "left" as const },
      };

      const colList = Object.values(cols);
      const rowHeight = 5.5;

      const drawHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(13, 122, 46);
        colList.forEach((c) => {
          doc.rect(c.x, y, c.w, 6, "F");
          const tx = c.align === "right" ? c.x + c.w - 2 : c.x + 2;
          doc.text(c.label, tx, y + 4.2, { align: c.align });
        });
        y += 6;
      };

      drawHeader();

      doc.setFontSize(7);

      registros.forEach((reg: any, idx: number) => {
        // Formata motivos — pode ocupar várias linhas
        const motivosStr =
          reg.motivos && reg.motivos.length > 0
            ? reg.motivos
                .map((m: any) => `${m.motivo} (${Number(m.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 1 })})`)
                .join("; ")
            : "—";

        // Quebra motivos se for longo demais para a coluna
        const motivosLines = doc.splitTextToSize(motivosStr, cols.motivos.w - 3);
        const lineCount = motivosLines.length;
        const totalRowH = Math.max(rowHeight, lineCount * 3.8 + 1.5);

        // Nova página se necessário
        if (y + totalRowH > pageHeight - 20) {
          doc.addPage();
          y = 10;
          drawHeader();
          doc.setFontSize(7);
        }

        // Fundo zebrado
        const bg = idx % 2 === 0 ? [245, 247, 245] : [255, 255, 255];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        colList.forEach((c) => doc.rect(c.x, y, c.w, totalRowH, "F"));

        // Borda inferior suave
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(marginL, y + totalRowH, marginL + usableWidth, y + totalRowH);

        doc.setTextColor(30, 30, 30);

        const producaoN = Number(reg.producao);
        const refugoN   = Number(reg.refugo);
        const totalN    = producaoN + refugoN;
        const pct       = totalN > 0 ? (refugoN / totalN) * 100 : 0;

        // Formata data sem problema de timezone: lê direto da string YYYY-MM-DD
        const [ano, mes, dia] = (reg.data as string).split("-");
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const values: Record<string, string> = {
          data:     dataFormatada,
          producao: fmtNum(producaoN),
          refugo:   fmtNum(refugoN),
          total:    fmtNum(totalN),
          percent:  `${pct.toFixed(2)}%`,
          motivos:  "", // tratado separadamente
        };

        // Colore % refugo por status
        Object.entries(cols).forEach(([key, c]) => {
          if (key === "motivos") return;
          const tx = c.align === "right" ? c.x + c.w - 2 : c.x + 2;
          if (key === "percent") {
            doc.setTextColor(pct <= metaRefugo ? 13 : 220, pct <= metaRefugo ? 122 : 38, pct <= metaRefugo ? 46 : 38);
          } else {
            doc.setTextColor(30, 30, 30);
          }
          doc.text(values[key], tx, y + rowHeight - 1.2, { align: c.align });
        });

        // Motivos (multi-linha)
        doc.setTextColor(60, 60, 60);
        doc.text(motivosLines, cols.motivos.x + 2, y + 3.8);

        y += totalRowH;
      });
    }

    // ===== RODAPÉ =====
    const now = new Date();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    const rodape = `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")} — Total de registros: ${registros.length}`;
    doc.text(rodape, pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`Refugo_${MESES_NOMES[mesAtual - 1]}_${anoAtual}.pdf`);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}
