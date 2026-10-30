import { DailyRecord, MESES_NOMES } from "./initialData";

// ===== ZIP / OPENXML XLSX GENERATOR (ZERO DEPENDENCIES) =====

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const makeCRCTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
};

const crcTable = makeCRCTable();

function crc32(buf: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function buildZip(files: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const prepared = files.map((f) => {
    const nameBytes = encoder.encode(f.name);
    const crc = crc32(f.data);
    return { nameBytes, data: f.data, crc, size: f.data.length };
  });

  let totalSize = 22; // EOCD
  for (const p of prepared) {
    totalSize += 30 + p.nameBytes.length + p.size;
    totalSize += 46 + p.nameBytes.length;
  }

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let offset = 0;
  const offsets: number[] = [];

  // Local headers + data
  for (const p of prepared) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0, true);
    view.setUint16(offset + 8, 0, true); // method: store
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint32(offset + 14, p.crc, true);
    view.setUint32(offset + 18, p.size, true);
    view.setUint32(offset + 22, p.size, true);
    view.setUint16(offset + 26, p.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true);
    out.set(p.nameBytes, offset + 30);
    out.set(p.data, offset + 30 + p.nameBytes.length);
    offset += 30 + p.nameBytes.length + p.size;
  }

  // Central directory
  const centralDirStart = offset;
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    const off = offsets[i];
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0, true);
    view.setUint32(offset + 16, p.crc, true);
    view.setUint32(offset + 20, p.size, true);
    view.setUint32(offset + 24, p.size, true);
    view.setUint16(offset + 28, p.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, off, true);
    out.set(p.nameBytes, offset + 46);
    offset += 46 + p.nameBytes.length;
  }

  const centralDirSize = offset - centralDirStart;

  // EOCD
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, centralDirSize, true);
  view.setUint32(offset + 16, centralDirStart, true);
  view.setUint16(offset + 20, 0, true);

  return out;
}

function escapeXml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface ExportReportOptions {
  tituloPeriodo: string;
  dataInicio?: string;
  dataFim?: string;
  nomeArquivo?: string;
}

/**
 * Gera e baixa uma planilha nativa Microsoft Excel (.xlsx) com estilização profissional Implatec.
 */
export function exportReportExcel(
  registros: DailyRecord[],
  metaRefugo: number,
  options: ExportReportOptions
) {
  const encoder = new TextEncoder();
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Controle de Refugo" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.00%"/>
  </numFmts>
  <fonts count="6">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="14"/><color rgb="FF0D7A2E"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FF0D7A2E"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FFDC2626"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0D7A2E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE5E7EB"/></left>
      <right style="thin"><color rgb="FFE5E7EB"/></right>
      <top style="thin"><color rgb="FFE5E7EB"/></top>
      <bottom style="thin"><color rgb="FFE5E7EB"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF0D7A2E"/></left>
      <right style="thin"><color rgb="FF0D7A2E"/></right>
      <top style="medium"><color rgb="FF0D7A2E"/></top>
      <bottom style="double"><color rgb="FF0D7A2E"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <!-- 0: Normal -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Título 14pt Verde -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 2: Cabeçalho tabela Verde Institucional -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 3: Texto célula data -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <!-- 4: Número 2 casas decimais -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <!-- 5: Percentual -->
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <!-- 6: Status dentro meta -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <!-- 7: Status acima meta -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <!-- 8: Motivos texto normal -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>
    <!-- 9: Totais texto -->
    <xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>
    <!-- 10: Totais números -->
    <xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  </cellXfs>
</styleSheet>`;

  let rowIdx = 1;
  const rowsXml: string[] = [];

  // Título e metadados
  rowsXml.push(`    <row r="${rowIdx}">
      <c r="A${rowIdx}" t="inlineStr" s="1"><is><t>IMPLATEC PERFIS PLÁSTICOS - CONTROLE DE REFUGO INDUSTRIAL</t></is></c>
    </row>`);
  rowIdx++;

  rowsXml.push(`    <row r="${rowIdx}">
      <c r="A${rowIdx}" t="inlineStr"><is><t>Relatório de Apontamentos: ${escapeXml(options.tituloPeriodo)}</t></is></c>
    </row>`);
  rowIdx++;

  rowsXml.push(`    <row r="${rowIdx}">
      <c r="A${rowIdx}" t="inlineStr"><is><t>Meta de Refugo: &lt;= ${metaRefugo.toFixed(2).replace(".", ",")}%</t></is></c>
    </row>`);
  rowIdx++;

  rowsXml.push(`    <row r="${rowIdx}">
      <c r="A${rowIdx}" t="inlineStr"><is><t>Data de Emissão: ${escapeXml(new Date().toLocaleString("pt-BR"))}</t></is></c>
    </row>`);
  rowIdx++;

  // Linha em branco
  rowsXml.push(`    <row r="${rowIdx}"/>`);
  rowIdx++;

  // Cabeçalho da Tabela
  const headerRow = rowIdx;
  rowsXml.push(`    <row r="${headerRow}">
      <c r="A${headerRow}" t="inlineStr" s="2"><is><t>Data</t></is></c>
      <c r="B${headerRow}" t="inlineStr" s="2"><is><t>Produção (Kg)</t></is></c>
      <c r="C${headerRow}" t="inlineStr" s="2"><is><t>Refugo (Kg)</t></is></c>
      <c r="D${headerRow}" t="inlineStr" s="2"><is><t>Total Geral (Kg)</t></is></c>
      <c r="E${headerRow}" t="inlineStr" s="2"><is><t>% Refugo</t></is></c>
      <c r="F${headerRow}" t="inlineStr" s="2"><is><t>Status Meta</t></is></c>
      <c r="G${headerRow}" t="inlineStr" s="2"><is><t>Detalhamento dos Motivos de Refugo</t></is></c>
    </row>`);
  rowIdx++;

  let totalProd = 0;
  let totalRef = 0;

  ordenados.forEach((r) => {
    totalProd += r.producao;
    totalRef += r.refugo;
    const totalDia = r.producao + r.refugo;
    const pctDia = totalDia > 0 ? r.refugo / totalDia : 0;
    const pctDiaPercent = pctDia * 100;
    const dentroMeta = pctDiaPercent <= metaRefugo;

    const [a, m, d] = r.data.split("-");
    const dataFormatada = `${d}/${m}/${a}`;

    const motivosStr = (r.motivos || [])
      .map((m) => `${m.motivo}: ${m.quantidade.toFixed(2).replace(".", ",")} Kg`)
      .join(" | ");

    const rIdx = rowIdx;
    rowsXml.push(`    <row r="${rIdx}">
      <c r="A${rIdx}" t="inlineStr" s="3"><is><t>${escapeXml(dataFormatada)}</t></is></c>
      <c r="B${rIdx}" s="4"><v>${r.producao}</v></c>
      <c r="C${rIdx}" s="4"><v>${r.refugo}</v></c>
      <c r="D${rIdx}" s="4"><v>${totalDia}</v></c>
      <c r="E${rIdx}" s="5"><v>${pctDia.toFixed(6)}</v></c>
      <c r="F${rIdx}" t="inlineStr" s="${dentroMeta ? 6 : 7}"><is><t>${dentroMeta ? "DENTRO DA META" : "ACIMA DA META"}</t></is></c>
      <c r="G${rIdx}" t="inlineStr" s="8"><is><t>${escapeXml(motivosStr || "—")}</t></is></c>
    </row>`);
    rowIdx++;
  });

  // Linha de Totais
  const totalGeral = totalProd + totalRef;
  const pctGeral = totalGeral > 0 ? totalRef / totalGeral : 0;
  const pctGeralPercent = pctGeral * 100;
  const atingiuMeta = pctGeralPercent <= metaRefugo;

  const totRow = rowIdx;
  rowsXml.push(`    <row r="${totRow}">
      <c r="A${totRow}" t="inlineStr" s="9"><is><t>TOTAIS DO PERÍODO</t></is></c>
      <c r="B${totRow}" s="10"><v>${totalProd}</v></c>
      <c r="C${totRow}" s="10"><v>${totalRef}</v></c>
      <c r="D${totRow}" s="10"><v>${totalGeral}</v></c>
      <c r="E${totRow}" s="5"><v>${pctGeral.toFixed(6)}</v></c>
      <c r="F${totRow}" t="inlineStr" s="${atingiuMeta ? 6 : 7}"><is><t>${atingiuMeta ? "ATINGIU A META" : "NÃO ATINGIU A META"}</t></is></c>
      <c r="G${totRow}" t="inlineStr" s="9"><is><t>Total de dias com apontamento: ${ordenados.length}</t></is></c>
    </row>`);

  const sheet1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="6" width="22" customWidth="1"/>
    <col min="7" max="7" width="55" customWidth="1"/>
  </cols>
  <sheetData>
${rowsXml.join("\n")}
  </sheetData>
</worksheet>`;

  const zipBytes = buildZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(wbRels) },
    { name: "xl/workbook.xml", data: encoder.encode(workbook) },
    { name: "xl/styles.xml", data: encoder.encode(styles) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet1) },
  ]);

  const blob = new Blob([zipBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const nomeArquivoFinal = options.nomeArquivo ||
    `Relatorio-Refugo-${(options.dataInicio || "inicio")}_a_${(options.dataFim || "fim")}.xlsx`;

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoFinal;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Gera e baixa uma planilha formatada em CSV compatível com Excel brasileiro (; delimitador, UTF-8 BOM).
 */
export function exportReportCSV(
  registros: DailyRecord[],
  metaRefugo: number,
  options: ExportReportOptions
) {
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data));

  const linhas: string[] = [];

  // Cabeçalho institucional
  linhas.push(`IMPLATEC PERFIS PLASTICOS - CONTROLE DE REFUGO INDUSTRIAL`);
  linhas.push(`Relatório de Apontamentos: ${options.tituloPeriodo}`);
  linhas.push(`Meta de Refugo: <= ${metaRefugo.toFixed(2).replace(".", ",")}%`);
  linhas.push(`Data de Extração: ${new Date().toLocaleString("pt-BR")}`);
  linhas.push("");

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
      "TOTAIS DO PERÍODO",
      totalProd.toFixed(2).replace(".", ","),
      totalRef.toFixed(2).replace(".", ","),
      totalGeral.toFixed(2).replace(".", ","),
      pctGeral.toFixed(2).replace(".", ",") + "%",
      pctGeral <= metaRefugo ? "ATINGIU A META" : "NÃO ATINGIU A META",
      `Total de apontamentos: ${ordenados.length}`,
    ].join(";")
  );

  const conteudo = "\uFEFF" + linhas.join("\r\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const nomeArquivoFinal = options.nomeArquivo
    ? options.nomeArquivo.replace(/\.xlsx$/i, ".csv")
    : `Relatorio-Refugo-${(options.dataInicio || "inicio")}_a_${(options.dataFim || "fim")}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoFinal;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Função mantida para retrocompatibilidade
 */
export function exportMonthlyCSV(
  mes: number,
  ano: number,
  registros: DailyRecord[],
  metaRefugo: number
) {
  const nomeMes = MESES_NOMES[mes - 1];
  exportReportCSV(registros, metaRefugo, {
    tituloPeriodo: `${nomeMes} / ${ano}`,
    nomeArquivo: `Relatorio-Refugo-${ano}-${String(mes).padStart(2, "0")}-${nomeMes}.csv`,
  });
}
