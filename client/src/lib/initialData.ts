// Definição de tipos e constantes básicas
// O sistema agora busca todos os dados dinamicamente do Supabase, 
// sem depender de registros hardcoded locais.

import { gerarId } from "./utils";

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

// Meta de % de refugo padrao (configurável no banco)
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

// Nota: DADOS_INICIAIS foi removido na V2 para privilegiar a integridade dos dados no Supabase.
