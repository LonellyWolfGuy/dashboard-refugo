// AuthContext.tsx
// Autenticação via Supabase Auth — sem backend próprio necessário.
// O Supabase gerencia sessões, tokens JWT e segurança automaticamente.

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type Session = any;

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function sessionToUser(session: any): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? "",
    nome: (u.user_metadata?.nome as string) || u.email?.split("@")[0] || "Usuário",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carrega a sessão ativa assim que o app inicia
    (supabase.auth as any).getSession().then(({ data }: any) => {
      setSession(data?.session ?? null);
      setUser(sessionToUser(data?.session));
      setLoading(false);
    });

    // Escuta mudanças de login/logout em tempo real
    const { data: listener } = (supabase.auth as any).onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession);
      setUser(sessionToUser(newSession));
      setLoading(false);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("E-mail ou senha incorretos.");
      }
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Confirme seu e-mail antes de acessar.");
      }
      throw new Error(error.message);
    }
  }

  async function logout() {
    await (supabase.auth as any).signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
