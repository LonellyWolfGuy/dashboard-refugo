// Utilitário para gerar PDF do relatório mensal com logo Implatec, gráficos e tabela

import { MESES_NOMES } from "./initialData";

export async function generateMonthlyPDF(
  mesAtual: number,
  registros: any[],
  metaRefugo: number
) {
  try {
    // Importar jsPDF dinamicamente
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // ===== HEADER COM LOGO =====
    // Logo Implatec
    const logoUrl =
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663426607805/TdnUqJefUqzPEiCTQPUCvH/Logo-Implatec-Melhor-Qualidade-removebg-preview_39f348ff.png";

    try {
      const logoImg = await fetch(logoUrl).then((r) => r.blob());
      const logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(logoImg);
      });

      doc.addImage(logoDataUrl, "PNG", 15, yPosition, 40, 15);
    } catch (e) {
      console.warn("Não foi possível carregar logo, continuando sem ela");
    }

    // Título
    doc.setFontSize(16);
    doc.setTextColor(13, 122, 46); // Verde Implatec
    doc.text("CONTROLE DE REFUGO 2026", pageWidth / 2, yPosition + 8, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Relatório de ${MESES_NOMES[mesAtual - 1]} 2026`, pageWidth / 2, yPosition + 15, {
      align: "center",
    });

    yPosition += 25;

    // ===== SEÇÃO DE TOTAIS =====
    const registrosMes = registros.filter((r: any) => {
      const data = new Date(r.data);
      return data.getMonth() + 1 === mesAtual;
    });

    const totalProducao = registrosMes.reduce((sum: number, r: any) => sum + r.producao, 0);
    const totalRefugo = registrosMes.reduce((sum: number, r: any) => sum + r.refugo, 0);
    const totalGeral = totalProducao + totalRefugo;
    const percentRefugo = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DO MÊS", 15, yPosition);

    yPosition += 8;

    // Caixa de totais
    doc.setDrawColor(13, 122, 46);
    doc.setLineWidth(0.5);
    doc.rect(15, yPosition, pageWidth - 30, 25);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    const colX = [20, 65, 110, 155];
    doc.text(`Produção Total`, colX[0], yPosition + 6);
    doc.setFontSize(12);
    doc.setTextColor(13, 122, 46);
    doc.text(`${totalProducao.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`, colX[0], yPosition + 13);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Total Refugo`, colX[1], yPosition + 6);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Vermelho
    doc.text(`${totalRefugo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`, colX[1], yPosition + 13);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Total Geral`, colX[2], yPosition + 6);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${totalGeral.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`, colX[2], yPosition + 13);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`% Refugo`, colX[3], yPosition + 6);
    doc.setFontSize(12);
    const percentColor = percentRefugo <= metaRefugo ? [13, 122, 46] : [220, 38, 38];
    doc.setTextColor(percentColor[0], percentColor[1], percentColor[2]);
    doc.text(`${percentRefugo.toFixed(2)}%`, colX[3], yPosition + 13);

    yPosition += 32;

    // ===== TABELA DE REGISTROS =====
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("REGISTROS DIÁRIOS", 15, yPosition);

    yPosition += 7;

    // Headers da tabela
    const headers = ["Data", "Qtd. Produção", "Qtd. Refugo", "Total", "% Refugo", "Motivos"];
    const colWidths = [20, 30, 30, 25, 25, 45];
    let xPos = 15;

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(13, 122, 46);

    headers.forEach((header: string, i: number) => {
      doc.rect(xPos, yPosition, colWidths[i], 6, "F");
      doc.text(header, xPos + 2, yPosition + 4.5, { align: "left" });
      xPos += colWidths[i];
    });

    yPosition += 6;

    // Linhas da tabela
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);

    registrosMes.forEach((registro: any, idx: number) => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 10;
      }

      const data = new Date(registro.data).toLocaleDateString("pt-BR");
      const producao = registro.producao.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const refugo = registro.refugo.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const total = (registro.producao + registro.refugo).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const percent = ((registro.refugo / (registro.producao + registro.refugo)) * 100).toFixed(2);
      
      const motivos = registro.motivos && registro.motivos.length > 0
        ? registro.motivos.map((m: any) => `${m.motivo} (${m.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })})`).join("; ")
        : "--";

      const rowData = [data, producao, refugo, total, `${percent}%`, motivos];
      const bgColor = idx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];

      xPos = 15;
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(xPos, yPosition, pageWidth - 30, 5, "F");

      doc.setTextColor(0, 0, 0);
      rowData.forEach((value: string, i: number) => {
        const align = i === 0 ? "left" : "right";
        doc.text(value, xPos + (align === "right" ? colWidths[i] - 2 : 2), yPosition + 3.5, {
          align: align as "left" | "right",
        });
        xPos += colWidths[i];
      });

      yPosition += 5;
    });

    // ===== RODAPÉ =====
    yPosition += 5;
    if (yPosition > pageHeight - 15) {
      doc.addPage();
      yPosition = 10;
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Salvar PDF
    const fileName = `Refugo_${MESES_NOMES[mesAtual - 1]}_2026.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}
