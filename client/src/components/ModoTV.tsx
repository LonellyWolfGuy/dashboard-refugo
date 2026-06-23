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
import { X, ChevronRight, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Cloud, Thermometer, Droplets } from "lucide-react";
import { buscarClima, descricaoTempo, iconeTempo } from "@/services/weatherService";

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

function SlideDashboard() {
  const { mesAtual, anoAtual, getTotaisMes, metaRefugo, meses } = useDashboard();
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

  const paleta = {
    ok:      { hero: "#22c55e", faixa: "#22c55e", label: "DENTRO DA META" },
    atencao: { hero: "#f59e0b", faixa: "#f59e0b", label: "ATENÇÃO — PRÓXIMO DA META" },
    critico: { hero: "#ef4444", faixa: "#ef4444", label: "ACIMA DA META!" },
    vazio:   { hero: "#64748b", faixa: "#475569", label: "SEM DADOS" },
  };
  const p = paleta[status];

  const pctAnimado = useCountUp(pct, 1400);
  const producaoAnimada = useCountUp(totais.totalProducao, 1200);
  const refugoAnimado = useCountUp(totais.totalRefugo, 1200);

  const StatusIcon = status === "ok" ? CheckCircle2 : AlertTriangle;

  const pctPrevio = totaisPrevios?.percentRefugo ?? 0;
  const temPrevio = totaisPrevios !== null && totaisPrevios.total > 0;
  const diff = temDados && temPrevio ? pct - pctPrevio : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0f1117" }}>

      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${p.hero}22, transparent)`,
        }} />

      <div className="relative z-10 flex items-start justify-between px-10 pt-6">
        <div>
          <p className="uppercase tracking-widest font-bold"
            style={{ color: "rgba(255,255,255,0.35)", fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)" }}>
            Implatec — Controle de Refugo
          </p>
          <h1 className="font-black text-white capitalize leading-none mt-1"
            style={{ fontSize: "clamp(1.4rem, 2.2vw, 2rem)" }}>
            {MESES_NOMES[mesAtual - 1]} <span style={{ color: "rgba(255,255,255,0.2)" }}>{anoAtual}</span>
          </h1>
        </div>
        <RelogioTV />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center gap-12 px-10 pb-4">

        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <span className="uppercase tracking-widest font-semibold"
            style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.6rem, 0.85vw, 0.75rem)" }}>
            % Refugo — {MESES_NOMES[mesAtual - 1]}
          </span>
          <span className="font-black font-mono tabular-nums leading-none"
            style={{
              color: p.hero,
              fontSize: "clamp(5rem, 12vw, 10rem)",
              textShadow: `0 0 50px ${p.hero}33`,
              lineHeight: 1,
            }}>
            {temDados ? `${pctAnimado.toFixed(1)}%` : "—"}
          </span>
          <div className="flex items-center gap-2 px-5 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${p.hero}33` }}>
            <StatusIcon style={{ width: 16, height: 16, color: p.hero }} />
            <span className="font-bold tracking-wider"
              style={{ color: p.hero, fontSize: "clamp(0.65rem, 1vw, 0.85rem)" }}>
              {p.label}
            </span>
          </div>
          <p className="font-semibold"
            style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.55rem, 0.85vw, 0.75rem)" }}>
            Meta: até {metaRefugo}% &nbsp;|&nbsp; {diasRegistrados} dia{diasRegistrados !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-4" style={{ minWidth: 280 }}>
          <div className="rounded-2xl px-8 py-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.5rem, 0.75vw, 0.65rem)" }}>
              Produção Total
            </p>
            <p className="font-black font-mono tabular-nums text-white leading-none mt-1"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}>
              {temDados ? formatNum(producaoAnimada) : "—"}
            </p>
          </div>

          <div className="rounded-2xl px-8 py-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.5rem, 0.75vw, 0.65rem)" }}>
              Total Refugo
            </p>
            <p className="font-black font-mono tabular-nums leading-none mt-1"
              style={{ color: temDados ? "#f87171" : "rgba(255,255,255,0.3)", fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}>
              {temDados ? formatNum(refugoAnimado) : "—"}
            </p>
          </div>

          {temPrevio && (
            <div className="rounded-2xl px-8 py-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="uppercase tracking-widest font-semibold"
                    style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.45rem, 0.65vw, 0.55rem)" }}>
                    {MESES_NOMES[mesPrevio! - 1]}
                  </p>
                  <p className="font-bold font-mono tabular-nums leading-none mt-1"
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}>
                    {pctPrevio.toFixed(1)}%
                  </p>
                </div>
                <div style={{ color: "rgba(255,255,255,0.15)", fontSize: "clamp(1.2rem, 2.5vw, 2rem)", padding: "0 12px" }}>
                  →
                </div>
                <div className="text-center flex-1">
                  <p className="uppercase tracking-widest font-semibold"
                    style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.45rem, 0.65vw, 0.55rem)" }}>
                    {MESES_NOMES[mesAtual - 1]}
                  </p>
                  <p className="font-bold font-mono tabular-nums leading-none mt-1"
                    style={{ color: p.hero, fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}>
                    {pct.toFixed(1)}%
                  </p>
                </div>
              </div>
              {diff !== null && (
                <div className="text-center mt-2">
                  <span className="font-semibold"
                    style={{
                      color: diff <= 0 ? "#22c55e" : "#ef4444",
                      fontSize: "clamp(0.6rem, 0.9vw, 0.75rem)",
                    }}>
                    {diff <= 0 ? "↓ Melhorou" : "↑ Piorou"} {Math.abs(diff).toFixed(1)}% em relação ao mês anterior
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${p.faixa}, ${p.faixa}88, transparent)`,
      }} />
    </div>
  );
}

// ─── Sub-componente: Slide de Clima ───────────────────────────────────────────

function SlideClima() {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof buscarClima>> | null>(null);
  const [erro, setErro] = useState(false);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    buscarClima("Joinville")
      .then(setDados)
      .catch(() => setErro(true));
    const t = setInterval(() => {
      buscarClima("Joinville")
        .then(setDados)
        .catch(() => setErro(true));
    }, 600_000);
    return () => clearInterval(t);
  }, []);

  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
  const dataObj = agora.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  function formatarDia(dataStr: string) {
    const d = new Date(dataStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
  }

  if (erro) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
        <div className="text-center">
          <Cloud style={{ width: 64, height: 64, color: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(1rem, 1.5vw, 1.3rem)" }}>Indisponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(135deg, #0c1445 0%, #1a237e 40%, #283593 100%)" }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(100,150,255,0.1), transparent)",
      }} />

      <div className="relative z-10 flex items-start justify-between px-10 pt-6">
        <div>
          <p className="uppercase tracking-widest font-bold"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.6rem, 0.85vw, 0.75rem)" }}>
            Implatec — Clima
          </p>
          <h2 className="font-black text-white capitalize leading-none mt-1"
            style={{ fontSize: "clamp(1.2rem, 2vw, 1.8rem)" }}>
            {dados?.cidade ?? "Carregando..."}
          </h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono font-black text-white tabular-nums leading-none"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
            {hora}
          </span>
          <p className="capitalize text-slate-400 font-medium"
            style={{ fontSize: "clamp(0.55rem, 0.85vw, 0.75rem)" }}>
            {data}
          </p>
        </div>
      </div>

      {dados && (
        <div className="relative z-10 flex flex-1 items-center justify-center gap-16 px-10 pb-4">

          <div className="flex flex-col items-center flex-shrink-0">
            <span style={{ fontSize: "clamp(5rem, 10vw, 8rem)", lineHeight: 1 }}>
              {iconeTempo(dados.codigo)}
            </span>
            <div className="flex items-start leading-none mt-2">
              <span className="font-black font-mono tabular-nums text-white"
                style={{ fontSize: "clamp(5rem, 11vw, 9rem)" }}>
                {dados.temperatura}
              </span>
              <span className="font-black text-white/40"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", marginTop: "0.15em" }}>
                °C
              </span>
            </div>
            <p className="font-semibold text-center mt-1"
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(1rem, 1.8vw, 1.5rem)" }}>
              {descricaoTempo(dados.codigo)}
            </p>
            <p className="font-medium"
              style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)" }}>
              Atualizado agora
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl px-6 py-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="uppercase tracking-widest font-semibold"
                style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(0.5rem, 0.7vw, 0.6rem)" }}>
                Previsão para os próximos dias
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {dados.previsao.map((dia, i) => (
                <div key={dia.data} className="rounded-2xl px-6 py-5 text-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="font-bold capitalize"
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.7rem, 1.1vw, 0.9rem)" }}>
                    {i === 0 ? "Amanhã" : new Date(dia.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </p>
                  <div style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)", margin: "8px 0" }}>
                    {iconeTempo(dia.codigo)}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-black font-mono tabular-nums text-white"
                      style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.2rem)" }}>
                      {Math.round(dia.tempMax)}°
                    </span>
                    <span className="font-semibold font-mono tabular-nums"
                      style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(1rem, 1.8vw, 1.5rem)" }}>
                      {Math.round(dia.tempMin)}°
                    </span>
                  </div>
                  <p className="font-medium mt-1"
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.55rem, 0.85vw, 0.7rem)" }}>
                    {descricaoTempo(dia.codigo)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!dados && (
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            <span className="text-white/40 font-medium" style={{ fontSize: "clamp(1rem, 1.5vw, 1.3rem)" }}>
              Carregando clima...
            </span>
          </div>
        </div>
      )}
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

  const totalSlides = 2 + totalImagens;
  const indiceGlobal = tipoSlide === "dashboard" ? 0 : tipoSlide === "clima" ? 1 : indiceImagem + 2;

  const barCor =
    tipoSlide === "dashboard" ? "linear-gradient(90deg,#1d4ed8,#60a5fa)" :
    tipoSlide === "clima" ? "linear-gradient(90deg,#7c3aed,#a78bfa)" :
    "linear-gradient(90deg,#16a34a,#4ade80)";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ background: "#080C18" }}>

      {/* Slide com fade */}
      <div key={fadeKey} className="flex-1 relative" style={{ animation: "tvFadeIn 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        {tipoSlide === "dashboard" ? (
          <SlideDashboard />
        ) : tipoSlide === "clima" ? (
          <SlideClima />
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
