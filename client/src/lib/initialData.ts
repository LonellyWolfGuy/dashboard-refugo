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

// ─── Aniversariantes (Modo TV) ─────────────────────────────────────────────

export interface Aniversariante {
  nome: string;
  nascimento: string;
  admissao: string;
}

export const ANIVERSARIANTES: Aniversariante[] = [
  { nome: "Anderson Dias Cezar", nascimento: "01/11/1982", admissao: "04/02/2019" },
  { nome: "Anderson Pereira de Souza", nascimento: "02/12/1985", admissao: "27/09/2016" },
  { nome: "Ari de Jesus Martins Ribeiro", nascimento: "15/05/1966", admissao: "09/09/2024" },
  { nome: "Cleidivan Alves Rodrigues", nascimento: "03/12/2005", admissao: "24/07/2024" },
  { nome: "Daniel Menezes Cordeiro Junior", nascimento: "25/12/2000", admissao: "22/08/2024" },
  { nome: "Edson Rieg", nascimento: "07/02/1989", admissao: "12/06/2025" },
  { nome: "Fernanda de Oliveira Buch", nascimento: "25/08/1989", admissao: "05/01/2026" },
  { nome: "Jaziel Santana da Silva", nascimento: "20/05/1960", admissao: "—" },
  { nome: "Jean Carlos Vicente", nascimento: "28/09/1993", admissao: "22/05/2023" },
  { nome: "Jeniffer Rosangela de Souza Hug Walter", nascimento: "04/09/1986", admissao: "01/07/2005" },
  { nome: "Jesse Santana da Silva", nascimento: "20/04/1953", admissao: "01/02/2024" },
  { nome: "Jonas Ramos da Silva", nascimento: "24/09/1985", admissao: "29/05/2018" },
  { nome: "Jorge Juan Pinto Coelho", nascimento: "08/04/2005", admissao: "23/03/2026" },
  { nome: "Kayke Pablo Beil Kalfels", nascimento: "01/10/2004", admissao: "06/01/2025" },
  { nome: "Maycon Sena Bezerra", nascimento: "02/07/2006", admissao: "16/07/2024" },
  { nome: "Odenir Rassweiler", nascimento: "14/09/1967", admissao: "17/01/2022" },
  { nome: "Paulo Otavio Santos de Oliveira", nascimento: "01/12/2006", admissao: "11/05/2026" },
  { nome: "Renato Lemos Correa", nascimento: "07/12/1987", admissao: "15/07/2021" },
  { nome: "Thayna Dorneles da Silveira", nascimento: "10/06/1999", admissao: "10/03/2026" },
  { nome: "Thiago Fischer", nascimento: "28/03/1985", admissao: "03/09/2018" },
  { nome: "Veralucia da Silva Alves de Oliveira", nascimento: "14/02/1972", admissao: "01/08/1999" },
  { nome: "Victor Alves de Lima", nascimento: "26/09/1999", admissao: "19/04/2022" },
];

export function mesDoNascimento(dataStr: string): number {
  return parseInt(dataStr.split("/")[1], 10);
}

export function aniversariantesDoMes(mes: number): Aniversariante[] {
  return [...ANIVERSARIANTES]
    .filter(p => mesDoNascimento(p.nascimento) === mes)
    .sort((a, b) => parseInt(a.nascimento.split("/")[0], 10) - parseInt(b.nascimento.split("/")[0], 10));
}

// Nota: DADOS_INICIAIS foi removido na V2 para privilegiar a integridade dos dados no Supabase.
