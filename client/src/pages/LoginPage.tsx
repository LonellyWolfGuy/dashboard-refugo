// LoginPage.tsx
// Tela de login com logo da Implatec e fundo branco

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message ?? "Usuário ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Área da Logo */}
          <div className="bg-white px-8 pt-10 pb-6 flex flex-col items-center border-b border-gray-100">
            <img
              src="/logo.png"
              alt="Implatec Perfis Plásticos"
              className="w-56 object-contain"
              draggable={false}
            />
            <p className="mt-4 text-sm text-gray-500 font-medium tracking-wide">
              Controle de Refugos
            </p>
          </div>

          {/* Formulário */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">
              Acesso ao Sistema
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Usuário */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Usuário
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Controle de Refugos &mdash; 2026 &mdash; Implatec Perfis Plásticos ®
        </p>
      </div>
    </div>
  );
}
