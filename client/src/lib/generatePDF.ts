// Utilitário para gerar PDF de relatório de refugo por período com logo Implatec e tabela completa

import { MESES_NOMES } from "./initialData";

export interface PeriodPDFOptions {
  tituloPeriodo: string;
  subtitulo?: string;
  dataInicio?: string;
  dataFim?: string;
  registros: any[];
  metaRefugo: number;
  nomeArquivo?: string;
}

export async function generatePeriodReportPDF(options: PeriodPDFOptions) {
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
    const logoUrl = "/logo.png";
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
    doc.setFontSize(15);
    doc.setTextColor(13, 122, 46);
    doc.text("IMPLATEC PERFIS PLÁSTICOS", pageWidth / 2, y + 6, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text("CONTROLE DE REFUGO INDUSTRIAL", pageWidth / 2, y + 12, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      options.subtitulo || `Relatório de Apontamentos: ${options.tituloPeriodo}`,
      pageWidth / 2,
      y + 17,
      { align: "center" }
    );
    y += 24;

    const ordenados = [...options.registros].sort((a, b) =>
      String(a.data).localeCompare(String(b.data))
    );

    // ===== TOTAIS — calculados a partir dos registros do período =====
    const totalProducao = ordenados.reduce((s: number, r: any) => s + Number(r.producao || 0), 0);
    const totalRefugo   = ordenados.reduce((s: number, r: any) => s + Number(r.refugo || 0), 0);
    const totalGeral    = totalProducao + totalRefugo;
    const percentRefugo = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;
    const metaRefugo    = options.metaRefugo;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DO PERÍODO", marginL, y);
    y += 5;

    doc.setDrawColor(13, 122, 46);
    doc.setLineWidth(0.4);
    doc.setFillColor(248, 250, 248);
    doc.rect(marginL, y, usableWidth, 22, "FD");

    const colX = [marginL + 4, marginL + 42, marginL + 80, marginL + 118, marginL + 154];
    const labelY = y + 6;
    const valueY = y + 14;

    const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

    // Labels
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    ["Produção Total", "Total Refugo", "Total Geral", "% Refugo", "Lançamentos"].forEach((label, i) => {
      doc.text(label, colX[i], labelY);
    });

    // Valores
    doc.setFontSize(10.5);
    doc.setTextColor(13, 122, 46);
    doc.text(`${fmtNum(totalProducao)} Kg`, colX[0], valueY);

    doc.setTextColor(220, 38, 38);
    doc.text(`${fmtNum(totalRefugo)} Kg`, colX[1], valueY);

    doc.setTextColor(0, 0, 0);
    doc.text(`${fmtNum(totalGeral)} Kg`, colX[2], valueY);

    const pColor = percentRefugo <= metaRefugo ? [13, 122, 46] : [220, 38, 38];
    doc.setTextColor(pColor[0], pColor[1], pColor[2]);
    doc.text(`${percentRefugo.toFixed(2)}% (meta: ${metaRefugo.toFixed(2)}%)`, colX[3], valueY);

    doc.setTextColor(40, 40, 40);
    doc.text(`${ordenados.length} dias`, colX[4], valueY);

    y += 28;

    // ===== RESUMO DE MOTIVOS DE REFUGO (se houver) =====
    const motivosTotais: Record<string, number> = {};
    ordenados.forEach((r: any) => {
      (r.motivos || []).forEach((m: any) => {
        const k = m.motivo || "Outros";
        motivosTotais[k] = (motivosTotais[k] || 0) + Number(m.quantidade || 0);
      });
    });

    const listaMotivos = Object.entries(motivosTotais)
      .map(([motivo, kg]) => ({ motivo, kg }))
      .sort((a, b) => b.kg - a.kg);

    if (listaMotivos.length > 0 && totalRefugo > 0) {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("PRINCIPAIS MOTIVOS DE REFUGO NO PERÍODO", marginL, y);
      y += 4;

      doc.setFontSize(7.5);
      const topMotivos = listaMotivos.slice(0, 4);
      const motivosStr = topMotivos
        .map(
          (m) =>
            `${m.motivo}: ${fmtNum(m.kg)} Kg (${((m.kg / totalRefugo) * 100).toFixed(1)}%)`
        )
        .join("   •   ");

      doc.setTextColor(60, 60, 60);
      doc.text(motivosStr, marginL, y);
      y += 7;
    }

    // ===== TABELA DE REGISTROS DIÁRIOS =====
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("REGISTROS DIÁRIOS", marginL, y);
    y += 5;

    if (ordenados.length === 0) {
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Nenhum registro encontrado para o período selecionado.", marginL, y);
      y += 10;
    } else {
      const cols = {
        data:     { x: marginL,       w: 22, label: "Data",           align: "left"  as const },
        producao: { x: marginL + 22,  w: 30, label: "Produção (Kg)",  align: "right" as const },
        refugo:   { x: marginL + 52,  w: 26, label: "Refugo (Kg)",    align: "right" as const },
        total:    { x: marginL + 78,  w: 26, label: "Total (Kg)",     align: "right" as const },
        percent:  { x: marginL + 104, w: 22, label: "% Refugo",       align: "right" as const },
        motivos:  { x: marginL + 126, w: usableWidth - 126, label: "Motivos de Refugo", align: "left" as const },
      };

      const colList = Object.values(cols);
      const rowHeight = 5.2;

      const drawHeader = () => {
        doc.setFontSize(7.5);
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

      ordenados.forEach((reg: any, idx: number) => {
        const motivosStr =
          reg.motivos && reg.motivos.length > 0
            ? reg.motivos
                .map((m: any) => `${m.motivo} (${Number(m.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 1 })})`)
                .join("; ")
            : "—";

        const motivosLines = doc.splitTextToSize(motivosStr, cols.motivos.w - 3);
        const lineCount = motivosLines.length;
        const totalRowH = Math.max(rowHeight, lineCount * 3.6 + 1.6);

        // Nova página se ultrapassar o limite inferior
        if (y + totalRowH > pageHeight - 16) {
          doc.addPage();
          y = 12;
          drawHeader();
          doc.setFontSize(7);
        }

        // Fundo zebrado
        const bg = idx % 2 === 0 ? [248, 250, 248] : [255, 255, 255];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        colList.forEach((c) => doc.rect(c.x, y, c.w, totalRowH, "F"));

        // Linha divisória suave
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(marginL, y + totalRowH, marginL + usableWidth, y + totalRowH);

        const producaoN = Number(reg.producao || 0);
        const refugoN   = Number(reg.refugo || 0);
        const totalN    = producaoN + refugoN;
        const pct       = totalN > 0 ? (refugoN / totalN) * 100 : 0;

        const [ano, mes, dia] = String(reg.data).split("-");
        const dataFormatada = dia && mes && ano ? `${dia}/${mes}/${ano}` : String(reg.data);

        const values: Record<string, string> = {
          data:     dataFormatada,
          producao: fmtNum(producaoN),
          refugo:   fmtNum(refugoN),
          total:    fmtNum(totalN),
          percent:  `${pct.toFixed(2)}%`,
          motivos:  "",
        };

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

        // Motivos
        doc.setTextColor(60, 60, 60);
        doc.text(motivosLines, cols.motivos.x + 2, y + 3.6);

        y += totalRowH;
      });
    }

    // ===== RODAPÉ COM PAGINAÇÃO EM TODAS AS PÁGINAS =====
    const totalPages = doc.getNumberOfPages();
    const now = new Date();
    const dataHoraStr = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`;

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      const rodape = `Implatec Perfis Plásticos • Controle de Refugo Industrial • Período: ${options.tituloPeriodo} • Gerado em ${dataHoraStr} • Página ${p} de ${totalPages}`;
      doc.text(rodape, pageWidth / 2, pageHeight - 6, { align: "center" });
    }

    const nomeArquivoFinal = options.nomeArquivo ||
      `Refugo_Relatorio_${(options.dataInicio || "inicio")}_a_${(options.dataFim || "fim")}.pdf`;

    doc.save(nomeArquivoFinal);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}

/**
 * Função mantida para retrocompatibilidade
 */
export async function generateMonthlyPDF(
  mesAtual: number,
  anoAtual: number,
  registros: any[],
  metaRefugo: number
) {
  const nomeMes = MESES_NOMES[mesAtual - 1];
  return generatePeriodReportPDF({
    tituloPeriodo: `${nomeMes} / ${anoAtual}`,
    subtitulo: `Relatório de ${nomeMes} ${anoAtual}`,
    registros,
    metaRefugo,
    nomeArquivo: `Refugo_${nomeMes}_${anoAtual}.pdf`,
  });
}

// ===== RELATÓRIO DE PRODUTOS & MOTIVOS DE REFUGO (PADRÃO IMPLATEC) =====
export async function generateRankingProdutosPDF(
  rankingInfo: {
    atualizado_em: string;
    dias_janela: number;
    produtos: Array<{
      produto: string;
      descricao: string;
      ferramentas: string;
      quantidadeProduzida: number;
      unidade: string;
      kgProducao: number;
      kgRefugo: number;
      rejeicaoPct: number;
      motivos?: Array<{ motivo: string; kg: number }>;
    }>;
  },
  metaRefugo: number = 2.0
) {
  try {
    const { jsPDF } = await import("jspdf");

    // Formato Paisagem (Landscape A4: 297mm x 210mm) para visualização industrial detalhada
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 14;
    const marginR = 14;
    const usableWidth = pageWidth - marginL - marginR; // 269mm
    let y = 10;

    // Carregar Logo Implatec
    const logoUrl = "/logo.png";
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, "PNG", marginL, y, 42, 14);
    } catch {
      console.warn("Logo não carregada, continuando sem ela.");
    }

    // Cabeçalho Institucional
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 122, 46); // Verde Implatec
    doc.text("IMPLATEC INDÚSTRIA E COMÉRCIO", pageWidth / 2, y + 5, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("RELATÓRIO DE REFUGO POR PRODUTO, FERRAMENTA & MOTIVO", pageWidth / 2, y + 11, {
      align: "center",
    });

    const dataSinc = rankingInfo.atualizado_em
      ? new Date(rankingInfo.atualizado_em).toLocaleString("pt-BR")
      : "Não informada";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Período Analisado: Últimos ${rankingInfo.dias_janela || 30} dias • Atualizado via TOTVS Protheus em: ${dataSinc}`,
      pageWidth / 2,
      y + 16,
      { align: "center" }
    );

    y += 22;

    const produtos = rankingInfo.produtos || [];
    const totalRefugo = produtos.reduce((s, p) => s + (p.kgRefugo || 0), 0);
    const totalProd = produtos.reduce((s, p) => s + (p.kgProducao || 0), 0);
    const totalGeral = totalProd + totalRefugo;
    const mediaPonderada = totalGeral > 0 ? (totalRefugo / totalGeral) * 100 : 0;

    // Caixa de Resumo Executivo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(13, 122, 46);
    doc.text("RESUMO EXECUTIVO DO RANKING", marginL, y);
    y += 4;

    doc.setDrawColor(13, 122, 46);
    doc.setLineWidth(0.4);
    doc.setFillColor(248, 250, 252);
    doc.rect(marginL, y, usableWidth, 18, "FD");

    const cards = [
      {
        label: "Refugo Acumulado (Top 10)",
        valor: `${totalRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`,
        color: [220, 38, 38], // Vermelho
      },
      {
        label: "Produção Total (Top 10)",
        valor: `${totalProd.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`,
        color: [30, 41, 59], // Slate escuro
      },
      {
        label: "Rejeição Média Ponderada",
        valor: `${mediaPonderada.toFixed(2)}%`,
        color: mediaPonderada <= metaRefugo ? [13, 122, 46] : [220, 38, 38],
      },
      {
        label: "Meta Corporativa de Refugo",
        valor: `${metaRefugo.toFixed(2)}%`,
        color: [13, 122, 46],
      },
      {
        label: "Itens Auditados",
        valor: `${produtos.length} produtos críticos`,
        color: [71, 85, 105],
      },
    ];

    const colW = usableWidth / cards.length;
    cards.forEach((c, idx) => {
      const cx = marginL + idx * colW + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, cx, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
      doc.text(c.valor, cx, y + 13);
    });

    y += 24;

    // Colunas da Tabela
    const cols = {
      pos:       { x: marginL,       w: 9,  label: "#",                          align: "center" as const },
      cod:       { x: marginL + 9,   w: 25, label: "Produto",                    align: "left"   as const },
      desc:      { x: marginL + 34,  w: 52, label: "Descrição do Produto",      align: "left"   as const },
      ferrame:   { x: marginL + 86,  w: 36, label: "Ferramentas / Moldes",       align: "left"   as const },
      qtd:       { x: marginL + 122, w: 22, label: "Qtd Prod.",                  align: "right"  as const },
      kgProd:    { x: marginL + 144, w: 23, label: "Produção (Kg)",              align: "right"  as const },
      kgRef:     { x: marginL + 167, w: 23, label: "Refugo (Kg)",                align: "right"  as const },
      pct:       { x: marginL + 190, w: 20, label: "% Rejeição",                 align: "right"  as const },
      motivos:   { x: marginL + 210, w: usableWidth - 210, label: "Motivos de Refugo (Kg / %)", align: "left" as const },
    };

    const colList = Object.values(cols);

    const drawTableHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(13, 122, 46);
      colList.forEach((c) => {
        doc.rect(c.x, y, c.w, 6.5, "F");
        const tx =
          c.align === "right"
            ? c.x + c.w - 2
            : c.align === "center"
            ? c.x + c.w / 2
            : c.x + 2;
        doc.text(c.label, tx, y + 4.5, { align: c.align });
      });
      y += 6.5;
    };

    drawTableHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    produtos.forEach((p, idx) => {
      const posicao = idx + 1;

      // Descrição quebra em até 2 linhas se necessário
      const descLines = doc.splitTextToSize(p.descricao || "Sem descrição", cols.desc.w - 3);

      // Ferramentas quebra em linhas se necessário
      const ferrameLines = doc.splitTextToSize(p.ferramentas || "Sem ferramenta", cols.ferrame.w - 3);

      // Formatação dos Motivos com Kg e %
      const motivosTextoList: string[] = [];
      if (p.motivos && p.motivos.length > 0) {
        p.motivos.forEach((m) => {
          const pctMotivo = p.kgRefugo > 0 ? ((m.kg / p.kgRefugo) * 100).toFixed(0) : "0";
          motivosTextoList.push(
            `• ${m.motivo}: ${m.kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg (${pctMotivo}%)`
          );
        });
      } else {
        motivosTextoList.push("—");
      }

      // Concatena motivos e calcula quebras de linha para a coluna de motivos
      const motivosLines = doc.splitTextToSize(motivosTextoList.join("\n"), cols.motivos.w - 3);

      // Altura da linha baseada no maior número de linhas
      const maxLines = Math.max(descLines.length, ferrameLines.length, motivosLines.length, 1);
      const rowHeight = Math.max(7, maxLines * 3.8 + 2);

      // Nova página se ultrapassar o limite inferior
      if (y + rowHeight > pageHeight - 16) {
        doc.addPage();
        y = 12;
        drawTableHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
      }

      // Fundo zebrado
      const bg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      colList.forEach((c) => doc.rect(c.x, y, c.w, rowHeight, "F"));

      // Borda inferior
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginL, y + rowHeight, marginL + usableWidth, y + rowHeight);

      // Conteúdo: #
      doc.setFont("helvetica", "bold");
      doc.setTextColor(posicao <= 3 ? 220 : 71, posicao <= 3 ? 38 : 85, posicao <= 3 ? 38 : 105);
      doc.text(`${posicao}º`, cols.pos.x + cols.pos.w / 2, y + 4.5, { align: "center" });

      // Código Produto
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(p.produto, cols.cod.x + 2, y + 4.5);

      // Descrição
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(descLines, cols.desc.x + 2, y + 4.5);

      // Ferramentas
      doc.setTextColor(71, 85, 105);
      doc.text(ferrameLines, cols.ferrame.x + 2, y + 4.5);

      // Quantidade Produzida
      doc.text(
        `${p.quantidadeProduzida.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${p.unidade || ""}`,
        cols.qtd.x + cols.qtd.w - 2,
        y + 4.5,
        { align: "right" }
      );

      // Produção Kg
      doc.text(
        p.kgProducao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        cols.kgProd.x + cols.kgProd.w - 2,
        y + 4.5,
        { align: "right" }
      );

      // Refugo Kg (em vermelho e negrito)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(
        p.kgRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        cols.kgRef.x + cols.kgRef.w - 2,
        y + 4.5,
        { align: "right" }
      );

      // % Rejeição
      const isCritico = p.rejeicaoPct >= 30;
      doc.setTextColor(isCritico ? 220 : 30, isCritico ? 38 : 41, isCritico ? 38 : 59);
      doc.text(`${p.rejeicaoPct.toFixed(2)}%`, cols.pct.x + cols.pct.w - 2, y + 4.5, { align: "right" });

      // Motivos de Refugo (lista detalhada)
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(motivosLines, cols.motivos.x + 2, y + 4.5);

      y += rowHeight;
    });

    // Rodapé em todas as páginas
    const totalPages = doc.getNumberOfPages();
    const now = new Date();
    const dataHoraEmissao = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Linha separadora do rodapé
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginL, pageHeight - 10, marginL + usableWidth, pageHeight - 10);

      doc.text(
        "IMPLATEC INDÚSTRIA E COMÉRCIO • Sistema de Gestão e Monitoramento de Refugo • Documento Interno de Qualidade",
        marginL,
        pageHeight - 6
      );

      doc.text(
        `Emitido em ${dataHoraEmissao} — Página ${i} de ${totalPages}`,
        pageWidth - marginR,
        pageHeight - 6,
        { align: "right" }
      );
    }

    const dataNome = new Date().toISOString().slice(0, 10);
    doc.save(`Implatec_Relatorio_Refugo_Produtos_${dataNome}.pdf`);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF do ranking de produtos:", error);
    throw error;
  }
}

