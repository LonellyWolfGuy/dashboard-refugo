// Dados iniciais extraídos do arquivo CONTROLEDEREFUGO2026.xlsx
// Estrutura: { data: string (YYYY-MM-DD), producao: number, refugo: number }

export interface RefugoMotivo {
  id: string;
  motivo: string;
  quantidade: number;
}

export interface DailyRecord {
  id: string;
  data: string;
  producao: number;
  refugo: number;
  motivos?: RefugoMotivo[];
}

export interface MonthData {
  mes: number; // 1-12
  ano: number;
  registros: DailyRecord[];
}

export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

// Meta de % de refugo (pode ser configurada)
export const META_REFUGO_PERCENT = 25;

export const MOTIVOS_REFUGO_PADRAO = [
  "Defeito de fabricação",
  "Material inadequado",
  "Dimensões incorretas",
  "Acabamento deficiente",
  "Problemas de montagem",
  "Dano no transporte",
  "Falha de qualidade",
  "Outros"
];

export function getMotivosCoresMap(): Record<string, string> {
  const cores = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];
  
  const map: Record<string, string> = {};
  MOTIVOS_REFUGO_PADRAO.forEach((motivo, idx) => {
    map[motivo] = cores[idx % cores.length];
  });
  return map;
}

function gerarId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export const DADOS_INICIAIS: MonthData[] = [
  {
    mes: 1,
    ano: 2026,
    registros: [
      { id: gerarId(), data: "2026-01-07", producao: 12281.399, refugo: 3852.03 },
      { id: gerarId(), data: "2026-01-28", producao: 487.08, refugo: 373.27 },
      { id: gerarId(), data: "2026-01-29", producao: 1354, refugo: 453.89 },
      { id: gerarId(), data: "2026-01-30", producao: 1130.57, refugo: 358.88 },
    ]
  },
  {
    mes: 2,
    ano: 2026,
    registros: [
      { id: gerarId(), data: "2026-02-02", producao: 281.96, refugo: 210.39 },
      { id: gerarId(), data: "2026-02-03", producao: 456.55, refugo: 459.77 },
      { id: gerarId(), data: "2026-02-04", producao: 796.26, refugo: 203.27 },
      { id: gerarId(), data: "2026-02-05", producao: 379.9, refugo: 59.16 },
      { id: gerarId(), data: "2026-02-06", producao: 1089.98, refugo: 382.7 },
      { id: gerarId(), data: "2026-02-09", producao: 392.8, refugo: 303.66 },
      { id: gerarId(), data: "2026-02-10", producao: 567.15, refugo: 99.68 },
      { id: gerarId(), data: "2026-02-11", producao: 1179.73, refugo: 528.1 },
      { id: gerarId(), data: "2026-02-12", producao: 506.84, refugo: 279.35 },
      { id: gerarId(), data: "2026-02-13", producao: 569.89, refugo: 118.67 },
      { id: gerarId(), data: "2026-02-16", producao: 1378.7, refugo: 437.49 },
      { id: gerarId(), data: "2026-02-17", producao: 873.79, refugo: 366.9 },
      { id: gerarId(), data: "2026-02-18", producao: 722.26, refugo: 267.02 },
      { id: gerarId(), data: "2026-02-19", producao: 940.23, refugo: 324.33 },
      { id: gerarId(), data: "2026-02-20", producao: 571.06, refugo: 106.86 },
      { id: gerarId(), data: "2026-02-23", producao: 1253.98, refugo: 264.37 },
      { id: gerarId(), data: "2026-02-24", producao: 1068.71, refugo: 561.06 },
      { id: gerarId(), data: "2026-02-25", producao: 743.86, refugo: 156.92 },
      { id: gerarId(), data: "2026-02-26", producao: 1165.11, refugo: 90.17 },
      { id: gerarId(), data: "2026-02-27", producao: 1995.48, refugo: 321.36 },
    ]
  },
  {
    mes: 3,
    ano: 2026,
    registros: [
      { id: gerarId(), data: "2026-03-02", producao: 411.77, refugo: 152.81 },
      { id: gerarId(), data: "2026-03-03", producao: 472.48, refugo: 257.88 },
      { id: gerarId(), data: "2026-03-04", producao: 1176.23, refugo: 155.81 },
      { id: gerarId(), data: "2026-03-05", producao: 1558.15, refugo: 238.43 },
      { id: gerarId(), data: "2026-03-06", producao: 362.39, refugo: 79.93 },
      { id: gerarId(), data: "2026-03-10", producao: 753.5, refugo: 146.52 },
    ]
  },
  { mes: 4, ano: 2026, registros: [] },
  { mes: 5, ano: 2026, registros: [] },
  { mes: 6, ano: 2026, registros: [] },
  { mes: 7, ano: 2026, registros: [] },
  { mes: 8, ano: 2026, registros: [] },
  { mes: 9, ano: 2026, registros: [] },
  { mes: 10, ano: 2026, registros: [] },
  { mes: 11, ano: 2026, registros: [] },
  { mes: 12, ano: 2026, registros: [] },
];
