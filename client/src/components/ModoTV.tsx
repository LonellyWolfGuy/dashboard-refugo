// ModoTV.tsx — V3 redesign
// Design premium para TV industrial:
// • % Refugo como HERO metric (enorme, cor dinâmica)
// • Barra de progresso circular animada vs meta
// • Fundo com glow colorido por status
// • Animação de contagem (count-up) ao entrar no slide
// • Métricas secundárias limpas e legíveis de longe
// • Relógio proeminente
// • Slide de imagem com transição cinematográfica

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useTVMode } from "@/hooks/useTVMode";
import { MESES_NOMES, aniversariantesNascimentoDoMes, aniversariantesTempoCasaDoMes, anosDeCasa } from "@/lib/initialData";
import { X, ChevronRight, AlertTriangle, CheckCircle2, Cloud, Cake, Trophy, CalendarDays, Sparkles } from "lucide-react";
import { buscarClima, descricaoTempo, iconeTempo, DadosClima } from "@/services/weatherService";

// ─── Hook compartilhado de relógio ────────────────────────────────────────────

function useClock() {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const mountedRef = useRef(true);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    let start: number | null = null;

    const step = (ts: number) => {
      if (!mountedRef.current) return;
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(target * ease);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

// ─── Arco SVG de progresso circular ──────────────────────────────────────────

interface ArcProgressProps {
  percent: number;
  meta: number;
  cor: string;
  corMeta: string;
  size?: number;
}

function ArcProgress({ percent, meta, cor, corMeta, size = 280 }: ArcProgressProps) {
  const radius = (size - 24) / 2;
  const circum = 2 * Math.PI * radius;
  const arcFrac = 240 / 360;
  const arcLength = circum * arcFrac;

  const filled = Math.min(percent / 100, 1) * arcLength;
  const metaMark = (meta / 100) * arcLength;

  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -210;

  const rotate = `rotate(${startAngle}, ${cx}, ${cy})`;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
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
  const agora = useClock();

  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const seg  = agora.toLocaleTimeString("pt-BR", { second: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-end gap-1 leading-none">
        <span className="font-mono font-black text-white tabular-nums"
          style={{ fontSize: "clamp(3.5rem, 6vw, 5rem)" }}>
          {hora}
        </span>
        <span className="font-mono font-bold text-slate-400 tabular-nums mb-1"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)" }}>
          :{seg}
        </span>
      </div>
      <p className="capitalize text-slate-400 font-medium"
        style={{ fontSize: "clamp(1rem, 1.5vw, 1.3rem)" }}>
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
        style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.8rem, 1.2vw, 1rem)" }}>
        {label}
      </span>
      <span className="font-black font-mono tabular-nums" style={{ color: cor, fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", lineHeight: 1 }}>
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
    <div className="flex flex-col w-full h-full overflow-hidden relative" style={{ background: "#1a1d2e" }}>

      <div className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${p.hero}33, transparent)`,
        }} />

      <div className="relative z-10 flex items-start justify-between px-10 pt-6">
        <div>
          <p className="uppercase tracking-widest font-bold"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}>
            Implatec — Controle de Refugo
          </p>
          <h1 className="font-black text-white capitalize leading-none mt-1"
            style={{ fontSize: "clamp(2rem, 3vw, 2.8rem)" }}>
            {MESES_NOMES[mesAtual - 1]} <span style={{ color: "rgba(255,255,255,0.35)" }}>{anoAtual}</span>
          </h1>
        </div>
        <RelogioTV />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center gap-12 px-10 pb-4">

        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <span className="uppercase tracking-widest font-semibold"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.85rem, 1.2vw, 1rem)" }}>
            % Refugo — {MESES_NOMES[mesAtual - 1]}
          </span>
          <span className="font-black font-mono tabular-nums leading-none"
            style={{
              color: p.hero,
              fontSize: "clamp(6rem, 15vw, 12rem)",
              textShadow: `0 0 60px ${p.hero}55`,
              lineHeight: 1,
            }}>
            {temDados ? `${pctAnimado.toFixed(1)}%` : "—"}
          </span>
          <div className="flex items-center gap-2 px-5 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${p.hero}55` }}>
            <StatusIcon style={{ width: 16, height: 16, color: p.hero }} />
            <span className="font-bold tracking-wider"
              style={{ color: p.hero, fontSize: "clamp(0.9rem, 1.3vw, 1.1rem)" }}>
              {p.label}
            </span>
          </div>
          <p className="font-semibold"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.75rem, 1.1vw, 0.95rem)" }}>
            Meta: até {metaRefugo}% &nbsp;|&nbsp; {diasRegistrados} dia{diasRegistrados !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-4" style={{ minWidth: 280 }}>
          <div className="rounded-2xl px-8 py-5"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)" }}>
              Produção Total
            </p>
            <p className="font-black font-mono tabular-nums text-white leading-none mt-1"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)" }}>
              {temDados ? formatNum(producaoAnimada) : "—"}
            </p>
          </div>

          <div className="rounded-2xl px-8 py-5"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)" }}>
              Total Refugo
            </p>
            <p className="font-black font-mono tabular-nums leading-none mt-1"
              style={{ color: temDados ? "#f87171" : "rgba(255,255,255,0.3)", fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)" }}>
              {temDados ? formatNum(refugoAnimado) : "—"}
            </p>
          </div>

          {temPrevio && (
            <div className="rounded-2xl px-8 py-4"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="uppercase tracking-widest font-semibold"
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.6rem, 0.9vw, 0.75rem)" }}>
                    {MESES_NOMES[mesPrevio! - 1]}
                  </p>
                  <p className="font-bold font-mono tabular-nums leading-none mt-1"
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
                    {pctPrevio.toFixed(1)}%
                  </p>
                </div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(1.6rem, 3vw, 2.5rem)", padding: "0 12px" }}>
                  →
                </div>
                <div className="text-center flex-1">
                  <p className="uppercase tracking-widest font-semibold"
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.6rem, 0.9vw, 0.75rem)" }}>
                    {MESES_NOMES[mesAtual - 1]}
                  </p>
                  <p className="font-bold font-mono tabular-nums leading-none mt-1"
                    style={{ color: p.hero, fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
                    {pct.toFixed(1)}%
                  </p>
                </div>
              </div>
              {diff !== null && (
                <div className="text-center mt-2">
                  <span className="font-semibold"
                    style={{
                      color: diff <= 0 ? "#22c55e" : "#ef4444",
                      fontSize: "clamp(0.8rem, 1.2vw, 1rem)",
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
        background: `linear-gradient(90deg, ${p.faixa}, ${p.faixa}AA, transparent)`,
      }} />
    </div>
  );
}

// ─── Sub-componente: Slide de Clima ───────────────────────────────────────────

interface SlideClimaProps {
  dadosClima: DadosClima | null;
}

function SlideClima({ dadosClima }: SlideClimaProps) {
  const [dados, setDados] = useState<DadosClima | null>(dadosClima);
  const [erro, setErro] = useState(false);
  const agora = useClock();

  useEffect(() => {
    if (dadosClima) setDados(dadosClima);
  }, [dadosClima]);

  useEffect(() => {
    if (!dados) {
      buscarClima("Joinville")
        .then(setDados)
        .catch(() => setErro(true));
    }
    const t = setInterval(() => {
      buscarClima("Joinville")
        .then(setDados)
        .catch(() => setErro(true));
    }, 600_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  function formatarDia(dataStr: string) {
    const d = new Date(dataStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
  }

  if (erro) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1a4e, #283593)" }}>
        <div className="text-center">
          <Cloud style={{ width: 64, height: 64, color: "rgba(255,255,255,0.3)", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>Indisponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1a1a4e 0%, #283593 40%, #3f51b5 100%)" }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(150,200,255,0.15), transparent)",
      }} />

      <div className="relative z-10 flex items-start justify-between px-10 pt-6">
        <div>
          <p className="uppercase tracking-widest font-bold"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}>
            Implatec — Clima
          </p>
          <h2 className="font-black text-white capitalize leading-none mt-1"
            style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}>
            {dados?.cidade ?? "Carregando..."}
          </h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono font-black text-white tabular-nums leading-none"
            style={{ fontSize: "clamp(3.5rem, 6vw, 5rem)" }}>
            {hora}
          </span>
          <p className="capitalize text-slate-400 font-medium"
            style={{ fontSize: "clamp(0.8rem, 1.3vw, 1.1rem)" }}>
            {data}
          </p>
        </div>
      </div>

      {dados && (
        <div className="relative z-10 flex flex-1 items-center justify-center gap-16 px-10 pb-4">

          <div className="flex flex-col items-center flex-shrink-0">
            <span style={{ fontSize: "clamp(6rem, 12vw, 10rem)", lineHeight: 1 }}>
              {iconeTempo(dados.codigo)}
            </span>
            <div className="flex items-start leading-none mt-2">
              <span className="font-black font-mono tabular-nums text-white"
                style={{ fontSize: "clamp(6rem, 14vw, 11rem)" }}>
                {dados.temperatura}
              </span>
              <span className="font-black text-white/40"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", marginTop: "0.15em" }}>
                °C
              </span>
            </div>
            <p className="font-semibold text-center mt-1"
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(1.4rem, 2.5vw, 2rem)" }}>
              {descricaoTempo(dados.codigo)}
            </p>
            <p className="font-medium"
              style={{ color: "rgba(255,255,255,0.25)", fontSize: "clamp(0.8rem, 1.3vw, 1rem)" }}>
              Atualizado agora
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl px-6 py-4"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="uppercase tracking-widest font-semibold"
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)" }}>
                Previsão para os próximos dias
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {dados.previsao.map((dia, i) => (
                <div key={dia.data} className="rounded-2xl px-6 py-5 text-center"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <p className="font-bold capitalize"
                    style={{ color: "rgba(255,255,255,0.65)", fontSize: "clamp(1rem, 1.5vw, 1.3rem)" }}>
                    {i === 0 ? "Amanhã" : new Date(dia.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </p>
                  <div style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", margin: "8px 0" }}>
                    {iconeTempo(dia.codigo)}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-black font-mono tabular-nums text-white"
                      style={{ fontSize: "clamp(2.2rem, 3.5vw, 3rem)" }}>
                      {Math.round(dia.tempMax)}°
                    </span>
                    <span className="font-semibold font-mono tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(1.4rem, 2.5vw, 2rem)" }}>
                      {Math.round(dia.tempMin)}°
                    </span>
                  </div>
                  <p className="font-medium mt-1"
                    style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.8rem, 1.2vw, 1rem)" }}>
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
            <span className="text-white/40 font-medium" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
              Carregando clima...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Slide de Aniversariantes ──────────────────────────────────

function formatarDataBR(dataStr: string): string {
  const [dia, mes] = dataStr.split("/");
  return `${dia}/${mes}`;
}

function formatarDataCompleta(dataStr: string): string {
  const [dia, mes, ano] = dataStr.split("/");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

function iniciaisNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function proximidadeDoEvento(dataStr: string, agora: Date): string {
  const [dia, mes] = dataStr.split("/").map(Number);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const evento = new Date(agora.getFullYear(), mes - 1, dia);
  const diferenca = Math.round((evento.getTime() - hoje.getTime()) / 86_400_000);

  if (diferenca === 0) return "Hoje!";
  if (diferenca === 1) return "Amanhã";
  if (diferenca === -1) return "Ontem";
  if (diferenca > 1) return `Em ${diferenca} dias`;
  return `Há ${Math.abs(diferenca)} dias`;
}

function SlideAniversariantes() {
  const agora = useClock();

  const mesAtual = agora.getMonth() + 1;
  const nascimento = aniversariantesNascimentoDoMes(mesAtual);
  const tempoCasa = aniversariantesTempoCasaDoMes(mesAtual);

  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  const totalAmbos = nascimento.length + tempoCasa.length;
  const temDuasSecoes = nascimento.length > 0 && tempoCasa.length > 0;
  const conteudoDenso = totalAmbos > 6;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden relative" style={{ background: "linear-gradient(145deg, #130b26 0%, #24133e 42%, #321b54 72%, #15152f 100%)" }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 18% 5%, rgba(236,72,153,0.22), transparent 30%),
          radial-gradient(circle at 84% 15%, rgba(168,85,247,0.2), transparent 28%),
          radial-gradient(circle at 70% 92%, rgba(251,191,36,0.12), transparent 32%)
        `,
      }} />

      <div className="tv-celebration-orb tv-celebration-orb--one" />
      <div className="tv-celebration-orb tv-celebration-orb--two" />

      <header className="tv-celebration-header relative z-10 flex items-start justify-between px-8 pt-5 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, color: "#f9a8d4", background: "rgba(236,72,153,0.16)", border: "1px solid rgba(236,72,153,0.24)" }}>
              <Sparkles size={17} />
            </span>
            <p className="uppercase tracking-[0.2em] font-bold" style={{ color: "rgba(255,255,255,0.56)", fontSize: "clamp(0.7rem, 1vw, 0.92rem)" }}>
              Gente que faz a diferença
            </p>
          </div>
          <h2 className="font-black text-white leading-none mt-2" style={{ fontSize: "clamp(2rem, 3.6vw, 3.4rem)", letterSpacing: "-0.035em" }}>
            Celebramos <span className="tv-celebration-gradient-text">juntos</span>
          </h2>
          <p className="tv-celebration-subtitle mt-2 font-medium" style={{ color: "rgba(255,255,255,0.48)", fontSize: "clamp(0.8rem, 1.15vw, 1rem)" }}>
            {MESES_NOMES[mesAtual - 1]} · {totalAmbos} {totalAmbos === 1 ? "história" : "histórias"} para celebrar
          </p>
        </div>

        <div className="flex flex-col items-end flex-shrink-0 ml-6">
          <span className="font-mono font-black text-white tabular-nums leading-none" style={{ fontSize: "clamp(2.8rem, 5vw, 4.4rem)" }}>
            {hora}
          </span>
          <p className="capitalize font-medium mt-1" style={{ color: "rgba(255,255,255,0.4)", fontSize: "clamp(0.72rem, 1vw, 0.92rem)" }}>
            {data}
          </p>
        </div>
      </header>

      <main className={`tv-birthday-content relative z-10 flex-1 min-h-0 grid px-8 pt-4 pb-5 gap-4 ${temDuasSecoes ? "tv-birthday-content--split" : "tv-birthday-content--single"} ${conteudoDenso ? "tv-birthday-content--dense" : ""}`}>

        {nascimento.length > 0 && (
          <section className="tv-celebration-panel tv-celebration-panel--birthday flex flex-col min-h-0 rounded-3xl p-4">
            <div className="tv-panel-heading flex items-center justify-between gap-3 mb-3 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="tv-panel-icon tv-panel-icon--birthday"><Cake size={22} /></span>
                <div className="min-w-0">
                  <p className="uppercase tracking-[0.16em] font-bold" style={{ color: "#f9a8d4", fontSize: "clamp(0.62rem, 0.85vw, 0.78rem)" }}>Aniversários</p>
                  <h3 className="font-black text-white leading-tight" style={{ fontSize: "clamp(1.05rem, 1.6vw, 1.45rem)" }}>Um novo ciclo começa</h3>
                </div>
              </div>
              <span className="tv-panel-count">{nascimento.length}</span>
            </div>

            <div className={`tv-celebration-cards grid flex-1 min-h-0 gap-3 ${nascimento.length === 1 ? "tv-celebration-cards--solo" : ""}`}>
              {nascimento.map((p, index) => {
                const proximidade = proximidadeDoEvento(p.nascimento, agora);
                return (
                  <article key={`n-${p.nome}`} className="tv-person-card tv-person-card--birthday rounded-2xl min-w-0" style={{ animationDelay: `${index * 90}ms` }}>
                    <div className={`tv-event-pill ${proximidade === "Hoje!" ? "tv-event-pill--today" : ""}`}>
                      {proximidade}
                    </div>
                    <div className="tv-person-card-main">
                      <div className="tv-avatar tv-avatar--birthday">{iniciaisNome(p.nome)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="tv-person-name font-black text-white leading-tight" style={{ fontSize: "clamp(1rem, 1.55vw, 1.4rem)" }}>{p.nome}</p>
                        <p className="font-semibold mt-1" style={{ color: "#f9a8d4", fontSize: "clamp(0.68rem, 0.9vw, 0.82rem)" }}>Feliz aniversário!</p>
                      </div>
                    </div>
                    <div className="tv-card-footer">
                      <CalendarDays size={15} />
                      <span>Dia {formatarDataBR(p.nascimento)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tempoCasa.length > 0 && (
          <section className="tv-celebration-panel tv-celebration-panel--career flex flex-col min-h-0 rounded-3xl p-4">
            <div className="tv-panel-heading flex items-center justify-between gap-3 mb-3 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="tv-panel-icon tv-panel-icon--career"><Trophy size={22} /></span>
                <div className="min-w-0">
                  <p className="uppercase tracking-[0.16em] font-bold" style={{ color: "#fbbf24", fontSize: "clamp(0.62rem, 0.85vw, 0.78rem)" }}>Tempo de casa</p>
                  <h3 className="font-black text-white leading-tight" style={{ fontSize: "clamp(1.05rem, 1.6vw, 1.45rem)" }}>Uma história construída juntos</h3>
                </div>
              </div>
              <span className="tv-panel-count tv-panel-count--career">{tempoCasa.length}</span>
            </div>

            <div className={`tv-celebration-cards grid flex-1 min-h-0 gap-3 ${tempoCasa.length === 1 ? "tv-celebration-cards--solo" : ""}`}>
              {tempoCasa.map((p, index) => {
                const anos = anosDeCasa(p.admissao);
                const proximidade = proximidadeDoEvento(p.admissao, agora);
                return (
                  <article key={`t-${p.nome}`} className="tv-person-card tv-person-card--career rounded-2xl min-w-0" style={{ animationDelay: `${(nascimento.length + index) * 90}ms` }}>
                    <div className={`tv-event-pill tv-event-pill--career ${proximidade === "Hoje!" ? "tv-event-pill--today" : ""}`}>
                      {proximidade}
                    </div>
                    <div className="tv-person-card-main">
                      <div className="tv-avatar tv-avatar--career">{iniciaisNome(p.nome)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="tv-person-name font-black text-white leading-tight" style={{ fontSize: "clamp(0.95rem, 1.45vw, 1.3rem)" }}>{p.nome}</p>
                        {anos !== null && (
                          <div className="flex items-baseline gap-1 mt-1" style={{ color: "#fbbf24" }}>
                            <span className="font-black font-mono tabular-nums leading-none" style={{ fontSize: "clamp(1.6rem, 2.7vw, 2.5rem)" }}>{anos}</span>
                            <span className="font-bold" style={{ fontSize: "clamp(0.68rem, 0.9vw, 0.82rem)" }}>{anos === 1 ? "ano" : "anos"} de história</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="tv-card-footer tv-card-footer--career">
                      <CalendarDays size={15} />
                      <span>Desde {formatarDataCompleta(p.admissao)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <div className="flex-shrink-0" style={{ height: 3, background: "linear-gradient(90deg, #ec4899, #a855f7 48%, #fbbf24, transparent)" }} />
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
  const [carregada, setCarregada] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCarregada(false);
    if (imgRef.current?.complete) {
      setCarregada(true);
    }
  }, [urlPublica]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#000" }}>
      <img
        ref={imgRef}
        src={urlPublica}
        alt={titulo}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: "cover",
          opacity: carregada ? 1 : 0,
          transition: "opacity 0.4s ease",
          willChange: "opacity",
        }}
        decoding="async"
        onLoad={() => setCarregada(true)}
      />

      {!carregada && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      )}

      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)"
      }} />

      <div className="absolute top-8 left-10">
        <p className="uppercase font-bold tracking-[0.3em]"
          style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}>
          Implatec Perfis Plásticos
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-14 pb-14">
        <div className="mb-5" style={{ width: 60, height: 4, borderRadius: 2, background: "white", opacity: 0.8 }} />
        <h2 className="font-black text-white"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
            lineHeight: 1.05,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            letterSpacing: "-0.01em",
          }}>
          {titulo}
        </h2>
        {legenda && (
          <p className="mt-4 font-semibold"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "clamp(1.2rem, 2.5vw, 2.2rem)",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}>
            {legenda}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: Slide de Vídeo ────────────────────────────────────────────

interface SlideVideoProps {
  url: string;
  titulo: string;
  legenda?: string;
  onEnded?: () => void;
}

function SlideVideo({ url, titulo, legenda, onEnded }: SlideVideoProps) {
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isYouTube =
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/embed");

  useEffect(() => {
    setReady(false);
  }, [url]);

  let embedUrl = "";
  if (isYouTube) {
    if (url.includes("youtube.com/watch")) {
      const params = new URLSearchParams(new URL(url).search);
      const v = params.get("v");
      embedUrl = `https://www.youtube.com/embed/${v}?autoplay=1&mute=1&loop=1&playlist=${v}&controls=0&modestbranding=1&rel=0`;
    } else if (url.includes("youtu.be/")) {
      const id = url.split("/").pop()?.split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0`;
    } else if (url.includes("youtube.com/embed")) {
      embedUrl = url + (url.includes("?") ? "&" : "?") + "autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0";
    }
  }

  if (isYouTube) {
    return (
      <div className="relative w-full h-full overflow-hidden" style={{ background: "#000" }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          style={{ border: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          onLoad={() => setReady(true)}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)"
        }} />
        <div className="absolute top-8 left-10 z-10">
          <p className="uppercase font-bold tracking-[0.3em]"
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}>
            Implatec Perfis Plásticos
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-14 pb-14 z-10">
          <div className="mb-5" style={{ width: 60, height: 4, borderRadius: 2, background: "white", opacity: 0.8 }} />
          <h2 className="font-black text-white"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              lineHeight: 1.05,
              textShadow: "0 2px 16px rgba(0,0,0,0.5)",
              letterSpacing: "-0.01em",
            }}>
            {titulo}
          </h2>
          {legenda && (
            <p className="mt-4 font-semibold"
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "clamp(1.2rem, 2.5vw, 2.2rem)",
                textShadow: "0 1px 8px rgba(0,0,0,0.4)",
              }}>
              {legenda}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#000" }}>
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "contain" }}
        onCanPlay={() => setReady(true)}
        onEnded={onEnded}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)"
      }} />
      <div className="absolute top-8 left-10 z-10">
        <p className="uppercase font-bold tracking-[0.3em]"
          style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}>
          Implatec Perfis Plásticos
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-14 pb-14 z-10">
        <div className="mb-5" style={{ width: 60, height: 4, borderRadius: 2, background: "white", opacity: 0.8 }} />
        <h2 className="font-black text-white"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
            lineHeight: 1.05,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            letterSpacing: "-0.01em",
          }}>
          {titulo}
        </h2>
        {legenda && (
          <p className="mt-4 font-semibold"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "clamp(1.2rem, 2.5vw, 2.2rem)",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
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
  const { tipoSlide, slideImagem, indiceImagem, totalImagens, slideVideo, indiceVideo, totalVideos, progresso, dadosClima, temAniversariantes, sair, avancar } = tvState;

  const [fadeKey, setFadeKey] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    setFadeKey(k => k + 1);
  }, [tipoSlide, indiceImagem, indiceVideo]);

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

  const totalSlides = useMemo(() => (temAniversariantes ? 3 : 2) + totalImagens + totalVideos, [temAniversariantes, totalImagens, totalVideos]);
  const baseImagem = temAniversariantes ? 3 : 2;
  const baseVideo = baseImagem + totalImagens;
  const indiceGlobal =
    tipoSlide === "dashboard" ? 0 :
    tipoSlide === "clima" ? 1 :
    tipoSlide === "aniversariantes" ? 2 :
    tipoSlide === "video" ? indiceVideo + baseVideo :
    indiceImagem + baseImagem;
  const dots = useMemo(() => Array.from({ length: totalSlides }), [totalSlides]);

  const barCor =
    tipoSlide === "dashboard" ? "linear-gradient(90deg,#1d4ed8,#60a5fa)" :
    tipoSlide === "clima" ? "linear-gradient(90deg,#7c3aed,#a78bfa)" :
    tipoSlide === "aniversariantes" ? "linear-gradient(90deg,#ec4899,#a855f7)" :
    tipoSlide === "video" ? "linear-gradient(90deg,#dc2626,#f87171)" :
    "linear-gradient(90deg,#16a34a,#4ade80)";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ background: "#111827" }}>

      <div key={fadeKey} className="flex-1 min-h-0 overflow-hidden relative" style={{ animation: "tvFadeIn 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        {tipoSlide === "dashboard" ? (
          <SlideDashboard />
        ) : tipoSlide === "clima" ? (
          <SlideClima dadosClima={dadosClima} />
        ) : tipoSlide === "aniversariantes" ? (
          <SlideAniversariantes />
        ) : tipoSlide === "imagem" && slideImagem ? (
          <SlideImagem urlPublica={slideImagem.url_publica} titulo={slideImagem.titulo} legenda={slideImagem.legenda} />
        ) : tipoSlide === "video" && slideVideo ? (
          <SlideVideo url={slideVideo.url} titulo={slideVideo.titulo} legenda={slideVideo.legenda} onEnded={avancar} />
        ) : (
          <SlideDashboard />
        )}
      </div>

      <div style={{ height: 3, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ height: "100%", width: `${progresso}%`, background: barCor, transition: "width 0.2s linear" }} />
      </div>

      <div className="flex items-center justify-center gap-2 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
        {dots.map((_, i) => (
          <div key={i} style={{
            width: i === indiceGlobal ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i === indiceGlobal ? "#60a5fa" : "rgba(255,255,255,0.2)",
            transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        ))}
      </div>

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

      <style>{`
        @keyframes tvFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes celebrationCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes celebrationFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -16px, 0); }
        }
        @keyframes celebrationPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.25); }
          50% { box-shadow: 0 0 0 8px rgba(244, 114, 182, 0); }
        }
        .tv-celebration-gradient-text {
          background: linear-gradient(110deg, #f9a8d4, #d8b4fe 52%, #fde68a);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tv-celebration-orb {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(2px);
          animation: celebrationFloat 7s ease-in-out infinite;
        }
        .tv-celebration-orb--one {
          width: 140px;
          height: 140px;
          left: -55px;
          top: 32%;
          background: radial-gradient(circle, rgba(236,72,153,0.16), transparent 68%);
        }
        .tv-celebration-orb--two {
          width: 190px;
          height: 190px;
          right: -70px;
          bottom: 2%;
          background: radial-gradient(circle, rgba(251,191,36,0.11), transparent 68%);
          animation-delay: -3.5s;
        }
        .tv-birthday-content--split {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .tv-birthday-content--single {
          grid-template-columns: minmax(0, 960px);
          justify-content: center;
        }
        .tv-celebration-panel {
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, rgba(28,15,48,0.86), rgba(20,12,39,0.68));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 22px 60px rgba(7,4,20,0.28), inset 0 1px 0 rgba(255,255,255,0.04);
          backdrop-filter: blur(14px);
        }
        .tv-celebration-panel::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 2px;
          opacity: 0.9;
        }
        .tv-celebration-panel--birthday::before {
          background: linear-gradient(90deg, #ec4899, #c084fc, transparent 88%);
        }
        .tv-celebration-panel--career::before {
          background: linear-gradient(90deg, #fbbf24, #f59e0b, transparent 88%);
        }
        .tv-panel-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 13px;
        }
        .tv-panel-icon--birthday {
          color: #f9a8d4;
          background: rgba(236,72,153,0.14);
          border: 1px solid rgba(236,72,153,0.24);
        }
        .tv-panel-icon--career {
          color: #fbbf24;
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.22);
        }
        .tv-panel-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 999px;
          color: #f9a8d4;
          background: rgba(236,72,153,0.12);
          border: 1px solid rgba(236,72,153,0.2);
          font: 800 clamp(0.78rem, 1vw, 0.9rem) ui-monospace, monospace;
        }
        .tv-panel-count--career {
          color: #fde68a;
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.18);
        }
        .tv-celebration-cards {
          grid-template-columns: repeat(auto-fit, minmax(min(195px, 100%), 1fr));
          grid-auto-rows: minmax(0, 1fr);
        }
        .tv-celebration-cards--solo .tv-person-card {
          align-items: center;
          padding: clamp(1.25rem, 2.5vw, 2.25rem);
          text-align: center;
        }
        .tv-celebration-cards--solo .tv-person-card-main {
          flex-direction: column;
        }
        .tv-celebration-cards--solo .tv-avatar {
          width: clamp(70px, 7vw, 92px);
          height: clamp(70px, 7vw, 92px);
          flex-basis: clamp(70px, 7vw, 92px);
          border-radius: 24px;
          font-size: clamp(1.15rem, 1.8vw, 1.5rem);
        }
        .tv-celebration-cards--solo .tv-person-name {
          font-size: clamp(1.35rem, 2.35vw, 2rem) !important;
        }
        .tv-celebration-cards--solo .tv-card-footer {
          margin-left: auto;
          margin-right: auto;
        }        .tv-person-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 0;
          overflow: hidden;
          padding: clamp(0.75rem, 1.25vw, 1rem);
          opacity: 0;
          animation: celebrationCardIn 0.65s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .tv-person-card--birthday {
          background: linear-gradient(145deg, rgba(236,72,153,0.16), rgba(126,34,206,0.08));
          border: 1px solid rgba(244,114,182,0.25);
        }
        .tv-person-card--career {
          background: linear-gradient(145deg, rgba(251,191,36,0.14), rgba(180,83,9,0.07));
          border: 1px solid rgba(251,191,36,0.22);
        }
        .tv-person-card-main {
          display: flex;
          align-items: center;
          gap: clamp(0.65rem, 1.1vw, 0.95rem);
          min-width: 0;
          padding-right: 2px;
        }
        .tv-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: clamp(46px, 4.8vw, 62px);
          height: clamp(46px, 4.8vw, 62px);
          flex: 0 0 clamp(46px, 4.8vw, 62px);
          border-radius: 18px;
          color: white;
          font-weight: 900;
          font-size: clamp(0.9rem, 1.3vw, 1.15rem);
          letter-spacing: 0.04em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 24px rgba(0,0,0,0.18);
        }
        .tv-avatar--birthday {
          background: linear-gradient(145deg, #ec4899, #9333ea);
        }
        .tv-avatar--career {
          background: linear-gradient(145deg, #f59e0b, #b45309);
        }
        .tv-event-pill {
          position: absolute;
          top: 10px;
          right: 10px;
          max-width: 42%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 4px 8px;
          border-radius: 999px;
          color: #fbcfe8;
          background: rgba(236,72,153,0.13);
          border: 1px solid rgba(236,72,153,0.2);
          font-size: clamp(0.58rem, 0.78vw, 0.72rem);
          font-weight: 800;
        }
        .tv-event-pill--career {
          color: #fde68a;
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.18);
        }
        .tv-event-pill--today {
          color: white;
          animation: celebrationPulse 1.8s ease-in-out infinite;
        }
        .tv-card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          max-width: 100%;
          margin-top: clamp(0.45rem, 0.8vw, 0.7rem);
          padding: 5px 9px;
          border-radius: 9px;
          color: rgba(255,255,255,0.58);
          background: rgba(6,3,16,0.2);
          font-size: clamp(0.62rem, 0.82vw, 0.76rem);
          font-weight: 650;
          white-space: nowrap;
        }
        .tv-card-footer--career {
          color: rgba(254,243,199,0.65);
        }
        .tv-birthday-content--dense .tv-celebration-panel {
          padding: 0.75rem;
        }
        .tv-birthday-content--dense .tv-celebration-cards {
          gap: 0.55rem;
        }
        .tv-birthday-content--dense .tv-person-card {
          padding: 0.65rem;
        }
        .tv-birthday-content--dense .tv-avatar {
          width: 44px;
          height: 44px;
          flex-basis: 44px;
          border-radius: 14px;
        }
        @media (max-width: 900px) {
          .tv-birthday-content--split {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }
          .tv-celebration-panel {
            padding: 0.7rem;
          }
          .tv-celebration-cards {
            grid-template-columns: repeat(auto-fit, minmax(min(175px, 100%), 1fr));
          }
          .tv-panel-heading {
            margin-bottom: 0.5rem;
          }
          .tv-person-card {
            padding: 0.6rem;
          }
          .tv-avatar {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
            border-radius: 13px;
          }
          .tv-card-footer {
            margin-top: 0.35rem;
          }
        }
        @media (max-height: 650px) {
          .tv-celebration-header {
            padding-top: 0.7rem;
          }
          .tv-celebration-subtitle {
            display: none;
          }
          .tv-birthday-content {
            padding-top: 0.45rem;
            padding-bottom: 0.65rem;
          }
          .tv-panel-icon {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
            border-radius: 10px;
          }
          .tv-person-card {
            padding: 0.55rem;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tv-person-card,
          .tv-celebration-orb,
          .tv-event-pill--today {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
