// ModoTV.tsx — V2 redesign
// Design premium para TV industrial:
// • % Refugo como HERO metric (enorme, cor dinâmica)
// • Barra de progresso circular animada vs meta
// • Fundo com glow colorido por status
// • Animação de contagem (count-up) ao entrar no slide
// • Métricas secundárias limpas e legíveis de longe
// • Relógio proeminente
// • Slide de imagem com transição cinematográfica

import { useState, useEffect, useRef } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useTVMode } from "@/hooks/useTVMode";
import { MESES_NOMES } from "@/lib/initialData";
import { X, ChevronRight, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Hook de count-up animado
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    const initial = 0;

    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(initial + (target - initial) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Arco SVG de progresso circular ──────────────────────────────────────────

interface ArcProgressProps {
  percent: number;   // valor atual (0–100)
  meta: number;      // meta (0–100)
  cor: string;       // cor do arco preenchido
  corMeta: string;   // cor da marca de meta
  size?: number;
}

function ArcProgress({ percent, meta, cor, corMeta, size = 280 }: ArcProgressProps) {
  const radius = (size - 24) / 2;
  const circum = 2 * Math.PI * radius;
  // Arco de 240° (de -210° a 30°, partindo do centro inferior)
  const arcFrac = 240 / 360;
  const arcLength = circum * arcFrac;

  const filled = Math.min(percent / 100, 1) * arcLength;
  const metaMark = (meta / 100) * arcLength;

  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -210; // graus

  // Transforma ângulo em offsets no círculo
  const rotate = `rotate(${startAngle}, ${cx}, ${cy})`;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* Trilha de fundo */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={20}
        strokeDasharray={`${arcLength} ${circum}`}
        strokeLinecap="round"
        transform={rotate}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Arco preenchido */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={cor}
        strokeWidth={20}
        strokeDasharray={`${filled} ${circum}`}
        strokeLinecap="round"
        transform={rotate}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1), stroke 0.6s ease" }}
      />
      {/* Marca de meta */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={corMeta}
        strokeWidth={4}
        strokeDasharray={`2 ${circum}`}
        strokeDashoffset={-metaMark + 1}
        transform={rotate}
        opacity={0.9}
      />
    </svg>
  );
}

// ─── Sub-componente: Relógio ──────────────────────────────────────────────────

function RelogioTV() {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const seg  = agora.toLocaleTimeString("pt-BR", { second: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-end gap-1 leading-none">
        <span className="font-mono font-black text-white tabular-nums"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
          {hora}
        </span>
        <span className="font-mono font-bold text-slate-400 tabular-nums mb-1"
          style={{ fontSize: "clamp(1.2rem, 2.5vw, 2rem)" }}>
          :{seg}
        </span>
      </div>
      <p className="capitalize text-slate-400 font-medium"
        style={{ fontSize: "clamp(0.7rem, 1.1vw, 0.9rem)" }}>
        {data}
      </p>
    </div>
  );
}

// ─── Sub-componente: Métrica Secundária ───────────────────────────────────────

interface MetricaProps {
  label: string;
  valor: string;
  cor: string;
}

function Metrica({ label, valor, cor }: MetricaProps) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="uppercase tracking-widest font-semibold"
        style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.55rem, 0.9vw, 0.75rem)" }}>
        {label}
      </span>
      <span className="font-black font-mono tabular-nums" style={{ color: cor, fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)", lineHeight: 1 }}>
        {valor}
      </span>
    </div>
  );
}

// ─── Sub-componente: Slide de Dashboard ──────────────────────────────────────

function formatNumCompacto(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function BarraMes({ pct, meta, ativo }: { pct: number; meta: number; ativo: boolean }) {
  const alturaMax = 100;
  const altura = pct > 0 ? Math.max((pct / (meta * 1.8)) * alturaMax, 3) : 3;
  const cor =
    !ativo ? "rgba(255,255,255,0.1)"
    : pct <= meta * 0.8 ? "#22c55e"
    : pct <= meta ? "#f59e0b"
    : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: 0 }}>
      <div style={{ height: alturaMax, display: "flex", alignItems: "flex-end", width: "100%" }}>
        <div style={{
          width: "100%",
          height: `${altura}%`,
          background: cor,
          borderRadius: "3px 3px 0 0",
          transition: "all 0.6s ease",
          opacity: ativo ? 1 : 0.4,
        }} />
      </div>
    </div>
  );
}

function SlideDashboard() {
  const { mesAtual, anoAtual, setMesAtual, getTotaisMes, metaRefugo, meses } = useDashboard();
  const totais = getTotaisMes(mesAtual);
  const diasRegistrados = meses.find(m => m.mes === mesAtual)?.registros.length ?? 0;

  const mesPrevio = mesAtual > 1 ? mesAtual - 1 : null;
  const totaisPrevios = mesPrevio ? getTotaisMes(mesPrevio) : null;

  const pct = totais.percentRefugo;
  const temDados = pct > 0;
  const status: "ok" | "atencao" | "critico" | "vazio" =
    !temDados ? "vazio" :
    pct <= metaRefugo * 0.8 ? "ok" :
    pct <= metaRefugo ? "atencao" : "critico";

  const palette = {
    ok:      { hero: "#22c55e", glow: "rgba(34,197,94,0.15)",  texto: "#86efac", fundo: "rgba(34,197,94,0.06)"  },
    atencao: { hero: "#f59e0b", glow: "rgba(245,158,11,0.15)", texto: "#fcd34d", fundo: "rgba(245,158,11,0.06)" },
    critico: { hero: "#ef4444", glow: "rgba(239,68,68,0.18)",  texto: "#fca5a5", fundo: "rgba(239,68,68,0.08)"  },
    vazio:   { hero: "#64748b", glow: "rgba(100,116,139,0.1)", texto: "#94a3b8", fundo: "rgba(100,116,139,0.04)" },
  };
  const p = palette[status];

  const pctAnimado = useCountUp(pct, 1400);
  const producaoAnimada = useCountUp(totais.totalProducao, 1200);
  const refugoAnimado = useCountUp(totais.totalRefugo, 1200);

  const StatusIcon = status === "ok" ? CheckCircle2 : AlertTriangle;

  let tendenciaIcon = null;
  let tendenciaLabel = "";
  let tendenciaCor = "";
  if (totaisPrevios && totaisPrevios.percentRefugo > 0 && temDados) {
    const diff = pct - totaisPrevios.percentRefugo;
    if (Math.abs(diff) < 0.5) {
      tendenciaIcon = null;
      tendenciaLabel = "Estável em relação ao mês anterior";
      tendenciaCor = "rgba(255,255,255,0.4)";
    } else if (diff < 0) {
      tendenciaIcon = <TrendingDown style={{ width: 18, height: 18 }} />;
      tendenciaLabel = `Melhor que ${MESES_NOMES[mesPrevio! - 1]}`;
      tendenciaCor = "#22c55e";
    } else {
      tendenciaIcon = <TrendingUp style={{ width: 18, height: 18 }} />;
      tendenciaLabel = `Pior que ${MESES_NOMES[mesPrevio! - 1]}`;
      tendenciaCor = "#ef4444";
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#080C18" }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 100%, ${p.glow}, transparent)`,
          transition: "background 1s ease",
        }} />

      <div className="relative z-10 flex items-center justify-between px-10 pt-8 pb-4">
        <div>
          <p className="uppercase tracking-[0.25em] font-bold"
            style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)" }}>
            Implatec Perfis Plásticos — Controle de Refugo
          </p>
          <h1 className="font-black text-white capitalize"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", lineHeight: 1.1 }}>
            {MESES_NOMES[mesAtual - 1]}{" "}
            <span style={{ color: "rgba(255,255,255,0.25)" }}>{anoAtual}</span>
          </h1>
        </div>
        <RelogioTV />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center gap-8 px-10 pb-4">

        <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ position: "relative" }}>
          <ArcProgress
            percent={pct}
            meta={metaRefugo}
            cor={p.hero}
            corMeta="rgba(255,255,255,0.5)"
            size={280}
          />
          <div className="absolute flex flex-col items-center" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <span className="font-black font-mono tabular-nums leading-none"
              style={{ color: p.hero, fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)", textShadow: `0 0 40px ${p.hero}` }}>
              {temDados ? `${pctAnimado.toFixed(1)}%` : "—"}
            </span>
            <span className="uppercase tracking-widest font-bold mt-1"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.5rem, 0.75vw, 0.65rem)" }}>
              % Refugo
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-full"
            style={{ background: p.fundo, border: `1px solid ${p.hero}40` }}>
            <StatusIcon style={{ width: 16, height: 16, color: p.hero }} />
            <span className="font-bold uppercase tracking-wider"
              style={{ color: p.texto, fontSize: "clamp(0.55rem, 0.85vw, 0.7rem)" }}>
              {status === "ok" ? "Dentro da Meta" :
               status === "atencao" ? "Atenção — Próximo da Meta" :
               status === "critico" ? "Acima da Meta!" : "Sem dados"}
            </span>
          </div>

          <p className="mt-2 font-semibold"
            style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.5rem, 0.8vw, 0.65rem)" }}>
            Meta: ≤ {metaRefugo}%  •  {diasRegistrados} dia{diasRegistrados !== 1 ? "s" : ""} registrado{diasRegistrados !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-4 flex-1" style={{ maxWidth: 480 }}>

          {temDados && (
            <div className="flex items-center gap-3 rounded-2xl px-6 py-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {tendenciaIcon && <span style={{ color: tendenciaCor }}>{tendenciaIcon}</span>}
              <span style={{ color: tendenciaCor, fontSize: "clamp(0.8rem, 1.4vw, 1.1rem)", fontWeight: 700 }}>
                {tendenciaLabel}
              </span>
              {totaisPrevios && totaisPrevios.percentRefugo > 0 && (
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.6rem, 1vw, 0.8rem)", marginLeft: "auto" }}>
                  Mês anterior: {totaisPrevios.percentRefugo.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Metrica label="Produção Total" valor={formatNumCompacto(producaoAnimada)} cor="#60a5fa" />
            <Metrica label="Total Refugo" valor={formatNumCompacto(refugoAnimado)} cor={totais.totalRefugo > 0 ? "#f87171" : "#64748b"} />
          </div>

          <div className="rounded-2xl px-6 py-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="uppercase tracking-widest font-semibold"
                style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.5rem, 0.8vw, 0.65rem)" }}>
                % Refugo por Mês
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.5rem, 0.8vw, 0.65rem)", fontWeight: 600 }}>
                Meta {metaRefugo}%
              </span>
            </div>
            <div className="flex items-end gap-1.5" style={{ height: 64 }}>
              {Array.from({ length: 12 }, (_, i) => {
                const mes = i + 1;
                const t = getTotaisMes(mes);
                return (
                  <button key={mes} onClick={() => setMesAtual(mes)} className="flex-1 flex flex-col items-center gap-0.5" style={{ cursor: "pointer" }}>
                    <BarraMes pct={t.percentRefugo} meta={metaRefugo} ativo={mes === mesAtual} />
                    <span style={{
                      fontSize: "clamp(0.4rem, 0.6vw, 0.55rem)",
                      color: mes === mesAtual ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                      fontWeight: mes === mesAtual ? 700 : 500,
                    }}>
                      {MESES_NOMES[i].slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative mt-1" style={{ height: 2 }}>
              <div style={{
                position: "absolute",
                left: `${Math.min((metaRefugo / (metaRefugo * 1.8)) * 100, 100)}%`,
                top: 0,
                width: "1px",
                height: 66,
                background: "rgba(255,255,255,0.3)",
              }} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center pb-3"
        style={{ color: "rgba(255,255,255,0.12)", fontSize: "clamp(0.55rem, 0.8vw, 0.7rem)", fontWeight: 600, letterSpacing: "0.15em" }}>
        IMPLATEC PERFIS PLÁSTICOS ® — SISTEMA DE CONTROLE DE QUALIDADE
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
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#000" }}>
      <img
        src={urlPublica}
        alt={titulo}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover", opacity: 0.88 }}
      />

      {/* Gradientes */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.35) 100%)"
      }} />

      {/* Marca no topo */}
      <div className="absolute top-8 left-10">
        <p className="uppercase font-bold tracking-[0.3em]"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)" }}>
          Implatec Perfis Plásticos
        </p>
      </div>

      {/* Texto na base */}
      <div className="absolute bottom-0 left-0 right-0 px-14 pb-14">
        {/* Linha decorativa */}
        <div className="mb-5" style={{ width: 60, height: 4, borderRadius: 2, background: "white", opacity: 0.6 }} />
        <h2 className="font-black text-white"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
            lineHeight: 1.05,
            textShadow: "0 4px 32px rgba(0,0,0,0.9)",
            letterSpacing: "-0.01em",
          }}>
          {titulo}
        </h2>
        {legenda && (
          <p className="mt-4 font-semibold text-white/70"
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.9rem)",
              textShadow: "0 2px 16px rgba(0,0,0,0.8)",
            }}>
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
  const { tipoSlide, slideImagem, indiceImagem, totalImagens, progresso, sair, avancar } = tvState;

  const [fadeKey, setFadeKey] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    setFadeKey(k => k + 1);
  }, [tipoSlide, indiceImagem]);

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

  const totalSlides = 1 + totalImagens;
  const indiceGlobal = tipoSlide === "dashboard" ? 0 : indiceImagem + 1;

  const barCor = tipoSlide === "dashboard"
    ? "linear-gradient(90deg,#1d4ed8,#60a5fa)"
    : "linear-gradient(90deg,#16a34a,#4ade80)";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ background: "#080C18" }}>

      {/* Slide com fade */}
      <div key={fadeKey} className="flex-1 relative" style={{ animation: "tvFadeIn 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        {tipoSlide === "dashboard" ? (
          <SlideDashboard />
        ) : slideImagem ? (
          <SlideImagem urlPublica={slideImagem.url_publica} titulo={slideImagem.titulo} legenda={slideImagem.legenda} />
        ) : (
          <SlideDashboard />
        )}
      </div>

      {/* Barra de progresso */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)" }}>
        <div style={{ height: "100%", width: `${progresso}%`, background: barCor, transition: "width 0.2s linear" }} />
      </div>

      {/* Rodapé com indicadores */}
      <div className="flex items-center justify-center gap-2 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div key={i} style={{
            width: i === indiceGlobal ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i === indiceGlobal ? "#60a5fa" : "rgba(255,255,255,0.2)",
            transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        ))}
      </div>

      {/* Controles flutuantes */}
      <div className="absolute top-6 right-6 flex items-center gap-2 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}>
        <button onClick={avancar} title="Próximo slide"
          className="flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: 44, height: 44, cursor: "pointer" }}>
          <ChevronRight style={{ width: 20, height: 20 }} />
        </button>
        <button onClick={sair} title="Sair do Modo TV (ESC)"
          className="flex items-center justify-center rounded-xl"
          style={{ background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.4)", color: "white", width: 44, height: 44, cursor: "pointer" }}>
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes tvFadeIn {
          from { opacity: 0; transform: scale(1.015); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
