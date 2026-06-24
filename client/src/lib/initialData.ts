// Definição de tipos e constantes básicas
// O sistema agora busca todos os dados dinamicamente do Supabase, 
// sem depender de registros hardcoded locais.

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

// Nota: DADOS_INICIAIS foi removido na V2 para privilegiar a integridade dos dados no Supabase.
