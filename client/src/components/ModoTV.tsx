// ModoTV.tsx
// Componente de tela cheia do Modo TV.
// Alterna entre um slide de dashboard (KPIs + relógio) e slides de imagem da fábrica.
// Design: fundo escuro premium, tipografia grande, legível de longe em TVs industriais.

import { useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useTVMode } from "@/hooks/useTVMode";
import { MESES_NOMES } from "@/lib/initialData";
import {
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  Target,
  ChevronRight,
  Monitor,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// ─── Sub-componente: Relógio ──────────────────────────────────────────────────

function RelogioTV() {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-right">
      <p
        className="font-mono font-bold text-white tabular-nums"
        style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1 }}
      >
        {hora}
      </p>
      <p
        className="text-slate-400 capitalize mt-1"
        style={{ fontSize: "clamp(0.75rem, 1.2vw, 1rem)" }}
      >
        {data}
      </p>
    </div>
  );
}

// ─── Sub-componente: KPI Card TV ──────────────────────────────────────────────

interface KpiTVProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  cor: "azul" | "verde" | "amarelo" | "vermelho" | "cinza";
  icone: React.ReactNode;
}

function KpiCardTV({ titulo, valor, subtitulo, cor, icone }: KpiTVProps) {
  const mapa = {
    azul:     { borda: "#1e40af", texto: "#93c5fd", valor: "#dbeafe" },
    verde:    { borda: "#16a34a", texto: "#86efac", valor: "#dcfce7" },
    amarelo:  { borda: "#d97706", texto: "#fcd34d", valor: "#fef3c7" },
    vermelho: { borda: "#dc2626", texto: "#fca5a5", valor: "#fee2e2" },
    cinza:    { borda: "#475569", texto: "#94a3b8", valor: "#e2e8f0" },
  };
  const c = mapa[cor];

  return (
    <div
      className="rounded-2xl flex flex-col gap-3 p-6"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `2px solid ${c.borda}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-xl p-3 flex items-center justify-center"
          style={{ background: c.borda }}
        >
          <div className="text-white" style={{ width: 28, height: 28 }}>
            {icone}
          </div>
        </div>
        <p
          className="font-semibold uppercase tracking-widest"
          style={{ color: c.texto, fontSize: "clamp(0.65rem, 1vw, 0.85rem)" }}
        >
          {titulo}
        </p>
      </div>
      <p
        className="font-bold font-mono tabular-nums"
        style={{
          color: c.valor,
          fontSize: "clamp(2rem, 4.5vw, 4rem)",
          lineHeight: 1,
        }}
      >
        {valor}
      </p>
      {subtitulo && (
        <p style={{ color: c.texto, fontSize: "clamp(0.7rem, 1vw, 0.9rem)" }}>
          {subtitulo}
        </p>
      )}
    </div>
  );
}

// ─── Sub-componente: Slide de Dashboard ──────────────────────────────────────

function SlideDashboard() {
  const { mesAtual, anoAtual, getTotaisMes, metaRefugo, meses } = useDashboard();
  const totais = getTotaisMes(mesAtual);
  const diasRegistrados = meses.find((m) => m.mes === mesAtual)?.registros.length ?? 0;

  let corPercent: "verde" | "amarelo" | "vermelho" | "cinza" = "cinza";
  if (totais.percentRefugo > 0) {
    if (totais.percentRefugo <= metaRefugo * 0.8) corPercent = "verde";
    else if (totais.percentRefugo <= metaRefugo) corPercent = "amarelo";
    else corPercent = "vermelho";
  }

  const iconePercent =
    totais.percentRefugo === 0 ? (
      <Target style={{ width: 28, height: 28 }} />
    ) : totais.percentRefugo <= metaRefugo ? (
      <CheckCircle style={{ width: 28, height: 28 }} />
    ) : (
      <AlertTriangle style={{ width: 28, height: 28 }} />
    );

  return (
    <div className="flex flex-col h-full px-10 py-8 gap-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Monitor className="text-blue-400" style={{ width: 28, height: 28 }} />
            <span
              className="font-bold text-slate-400 uppercase tracking-widest"
              style={{ fontSize: "clamp(0.7rem, 1.1vw, 0.9rem)" }}
            >
              Controle de Refugo — Implatec Perfis Plásticos
            </span>
          </div>
          <h1
            className="font-bold text-white"
            style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", lineHeight: 1.1 }}
          >
            {MESES_NOMES[mesAtual - 1]}{" "}
            <span className="text-slate-500">{anoAtual}</span>
          </h1>
        </div>
        <RelogioTV />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 flex-1">
        <KpiCardTV
          titulo="Produção Total"
          valor={formatNum(totais.totalProducao)}
          subtitulo={`${diasRegistrados} dia${diasRegistrados !== 1 ? "s" : ""} registrado${diasRegistrados !== 1 ? "s" : ""}`}
          cor="azul"
          icone={<Package style={{ width: 28, height: 28 }} />}
        />
        <KpiCardTV
          titulo="Total Refugo"
          valor={formatNum(totais.totalRefugo)}
          subtitulo="unidades refugadas"
          cor={totais.totalRefugo === 0 ? "cinza" : "vermelho"}
          icone={<AlertTriangle style={{ width: 28, height: 28 }} />}
        />
        <KpiCardTV
          titulo="Total Geral"
          valor={formatNum(totais.total)}
          subtitulo="produção + refugo"
          cor="cinza"
          icone={<Package style={{ width: 28, height: 28 }} />}
        />
        <KpiCardTV
          titulo="% Refugo"
          valor={
            totais.percentRefugo > 0
              ? `${totais.percentRefugo.toFixed(2)}%`
              : "—"
          }
          subtitulo={`Meta: ≤ ${metaRefugo}%`}
          cor={corPercent}
          icone={iconePercent}
        />
      </div>

      {/* Rodapé informativo */}
      <div
        className="text-center text-slate-600 font-medium"
        style={{ fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)" }}
      >
        Implatec Perfis Plásticos ® — Sistema de Controle de Qualidade
      </div>
    </div>
  );
}

// ─── Sub-componente: Slide de Imagem ──────────────────────────────────────────

interface SlideImagemProps {
  urlPublica: string;
  titulo: string;
  legenda?: string;
}

function SlideImagem({ urlPublica, titulo, legenda }: SlideImagemProps) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Imagem de fundo */}
      <img
        src={urlPublica}
        alt={titulo}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradiente de baixo para cima para o texto */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
        }}
      />

      {/* Logo / empresa no topo */}
      <div className="absolute top-8 left-10 flex items-center gap-3">
        <Monitor className="text-white/70" style={{ width: 22, height: 22 }} />
        <span
          className="text-white/70 font-semibold tracking-widest uppercase"
          style={{ fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)" }}
        >
          Implatec Perfis Plásticos
        </span>
      </div>

      {/* Texto sobreposto na base */}
      <div className="absolute bottom-0 left-0 right-0 px-12 pb-12">
        <h2
          className="font-bold text-white"
          style={{
            fontSize: "clamp(2rem, 5vw, 4.5rem)",
            lineHeight: 1.1,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          {titulo}
        </h2>
        {legenda && (
          <p
            className="text-white/80 mt-3 font-medium"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.75rem)",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            {legenda}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal: ModoTV ─────────────────────────────────────────────

interface ModoTVProps {
  tvState: ReturnType<typeof useTVMode>;
}

export default function ModoTV({ tvState }: ModoTVProps) {
  const {
    tipoSlide,
    slideImagem,
    indiceImagem,
    totalImagens,
    progresso,
    sair,
    avancar,
  } = tvState;

  const [fadeKey, setFadeKey] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Força re-fade ao mudar de slide
  useEffect(() => {
    setFadeKey((k) => k + 1);
  }, [tipoSlide, indiceImagem]);

  // Mostra controles brevemente ao mover o mouse
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };
    document.addEventListener("mousemove", show);
    document.addEventListener("touchstart", show);
    return () => {
      document.removeEventListener("mousemove", show);
      document.removeEventListener("touchstart", show);
      clearTimeout(timer);
    };
  }, []);

  // Total de slides no ciclo: 1 dashboard + N imagens
  const totalSlides = 1 + totalImagens;
  const indiceGlobal = tipoSlide === "dashboard" ? 0 : indiceImagem + 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: "#0A0E1A" }}
    >
      {/* Conteúdo principal com fade */}
      <div
        key={fadeKey}
        className="flex-1 relative"
        style={{
          animation: "tvFadeIn 0.6s ease-in-out",
        }}
      >
        {tipoSlide === "dashboard" ? (
          <SlideDashboard />
        ) : slideImagem ? (
          <SlideImagem
            urlPublica={slideImagem.url_publica}
            titulo={slideImagem.titulo}
            legenda={slideImagem.legenda}
          />
        ) : (
          // Fallback se não houver imagens (não deveria acontecer)
          <SlideDashboard />
        )}
      </div>

      {/* Barra de progresso */}
      <div
        className="h-1 w-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${progresso}%`,
            background:
              tipoSlide === "dashboard"
                ? "linear-gradient(90deg, #1d4ed8, #60a5fa)"
                : "linear-gradient(90deg, #16a34a, #4ade80)",
            transition: "width 0.2s linear",
          }}
        />
      </div>

      {/* Rodapé com indicadores */}
      <div
        className="flex items-center justify-center gap-2 py-3"
        style={{ background: "rgba(0,0,0,0.4)" }}
      >
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === indiceGlobal ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i === indiceGlobal
                  ? "#60a5fa"
                  : "rgba(255,255,255,0.25)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Controles flutuantes (aparecem ao mover o mouse) */}
      <div
        className="absolute top-6 right-6 flex items-center gap-2 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        {/* Avançar slide */}
        <button
          onClick={avancar}
          title="Próximo slide"
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            width: 44,
            height: 44,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
          }
        >
          <ChevronRight style={{ width: 20, height: 20 }} />
        </button>

        {/* Fechar Modo TV */}
        <button
          onClick={sair}
          title="Sair do Modo TV (ESC)"
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{
            background: "rgba(220,38,38,0.3)",
            border: "1px solid rgba(220,38,38,0.5)",
            color: "white",
            width: 44,
            height: 44,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(220,38,38,0.6)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(220,38,38,0.3)")
          }
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Keyframes de fade */}
      <style>{`
        @keyframes tvFadeIn {
          from { opacity: 0; transform: scale(1.01); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  );
}
