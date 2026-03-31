export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      registros: {
        Row: {
          id: string;
          data: string;
          mes: number;
          ano: number;
          producao: number;
          refugo: number;
          motivos: Json;
          observacoes?: string | null;
          user_id?: string;
        }
        Insert: {
          id: string;
          data: string;
          mes: number;
          ano: number;
          producao: number;
          refugo: number;
          motivos?: Json;
          observacoes?: string | null;
          user_id?: string;
        }
        Update: Partial<Database['public']['Tables']['registros']['Insert']>
      };
      config: {
        Row: {
          chave: string;
          valor: Json;
        };
        Insert: {
          chave: string;
          valor: Json;
        };
        Update: Partial<Database['public']['Tables']['config']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
