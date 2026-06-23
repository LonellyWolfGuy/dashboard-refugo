import { useState, useEffect, useRef, useCallback } from "react";
import { listarSlides, MuralSlide } from "@/services/muralService";
import { buscarClima, DadosClima } from "@/services/weatherService";

export type TipoSlide = "dashboard" | "clima" | "imagem";

export interface TVModeState {
  isTVMode: boolean;
  tipoSlide: TipoSlide;
  slideImagem: MuralSlide | null;
  indiceImagem: number;
  totalImagens: number;
  progresso: number;
  dadosClima: DadosClima | null;
  entrar: () => Promise<void>;
  sair: () => void;
  avancar: () => void;
}

const TV_SEG_DASHBOARD_KEY = "tv_seg_dashboard";
const TV_SEG_IMAGEM_KEY    = "tv_seg_imagem";
const DEFAULT_SEG_DASHBOARD = 30;
const DEFAULT_SEG_IMAGEM    = 15;
const SEG_CLIMA = 20;

function getConfig() {
  const d = parseInt(localStorage.getItem(TV_SEG_DASHBOARD_KEY) ?? "", 10);
  const i = parseInt(localStorage.getItem(TV_SEG_IMAGEM_KEY) ?? "", 10);
  return {
    segDashboard: isNaN(d) ? DEFAULT_SEG_DASHBOARD : d,
    segImagem:    isNaN(i) ? DEFAULT_SEG_IMAGEM    : i,
  };
}

export function useTVMode(): TVModeState {
  const [isTVMode,      setIsTVMode]      = useState(false);
  const [tipoSlide,     setTipoSlide]     = useState<TipoSlide>("dashboard");
  const [indiceImagem,  setIndiceImagem]  = useState(0);
  const [progresso,     setProgresso]     = useState(0);
  const [imagens,       setImagens]       = useState<MuralSlide[]>([]);
  const [dadosClima,    setDadosClima]    = useState<DadosClima | null>(null);

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressoRef     = useRef(0);
  const tipoAtualRef     = useRef<TipoSlide>("dashboard");
  const indiceImagemRef  = useRef(0);
  const imagensRef       = useRef<MuralSlide[]>([]);

  imagensRef.current = imagens;

  const limparInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const avancarSlide = useCallback(() => {
    const imgs = imagensRef.current;

    if (tipoAtualRef.current === "dashboard") {
      tipoAtualRef.current = "clima";
      setTipoSlide("clima");
      indiceImagemRef.current = 0;
      setIndiceImagem(0);
    } else if (tipoAtualRef.current === "clima") {
      if (imgs.length > 0) {
        tipoAtualRef.current = "imagem";
        setTipoSlide("imagem");
        indiceImagemRef.current = 0;
        setIndiceImagem(0);
      } else {
        tipoAtualRef.current = "dashboard";
        setTipoSlide("dashboard");
        indiceImagemRef.current = 0;
        setIndiceImagem(0);
      }
    } else {
      const proximo = indiceImagemRef.current + 1;
      if (proximo < imgs.length) {
        indiceImagemRef.current = proximo;
        setIndiceImagem(proximo);
      } else {
        tipoAtualRef.current = "dashboard";
        indiceImagemRef.current = 0;
        setTipoSlide("dashboard");
        setIndiceImagem(0);
      }
    }

    progressoRef.current = 0;
    setProgresso(0);
  }, []);

  const iniciarCiclo = useCallback(() => {
    limparInterval();
    progressoRef.current = 0;
    setProgresso(0);

    const TICK_MS = 200;

    intervalRef.current = setInterval(() => {
      const cfg = getConfig();
      const duracao =
        tipoAtualRef.current === "dashboard" ? cfg.segDashboard * 1000 :
        tipoAtualRef.current === "clima" ? SEG_CLIMA * 1000 :
        cfg.segImagem * 1000;

      progressoRef.current += TICK_MS;
      const pct = Math.min((progressoRef.current / duracao) * 100, 100);
      setProgresso(pct);

      if (progressoRef.current >= duracao) {
        avancarSlide();
      }
    }, TICK_MS);
  }, [limparInterval, avancarSlide]);

  const entrar = useCallback(async () => {
    try {
      const slides = await listarSlides();
      setImagens(slides);
      imagensRef.current = slides;
    } catch (err) {
      console.error("[useTVMode] Erro ao carregar slides:", err);
    }

    buscarClima("Joinville")
      .then(setDadosClima)
      .catch(() => {});

    tipoAtualRef.current  = "dashboard";
    indiceImagemRef.current = 0;
    setTipoSlide("dashboard");
    setIndiceImagem(0);
    setProgresso(0);
    progressoRef.current = 0;

    setIsTVMode(true);

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  }, []);

  const sair = useCallback(() => {
    limparInterval();
    setIsTVMode(false);
    setTipoSlide("dashboard");
    setIndiceImagem(0);
    setProgresso(0);
    progressoRef.current = 0;
    tipoAtualRef.current = "dashboard";
    setDadosClima(null);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [limparInterval]);

  useEffect(() => {
    if (isTVMode) {
      iniciarCiclo();
    } else {
      limparInterval();
    }
    return limparInterval;
  }, [isTVMode, iniciarCiclo, limparInterval]);

  useEffect(() => {
    if (isTVMode) {
      iniciarCiclo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSlide]);

  useEffect(() => {
    if (!isTVMode) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") sair();
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isTVMode) sair();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [isTVMode, sair]);

  const slideImagem = tipoSlide === "imagem" && imagens.length > 0
    ? imagens[indiceImagem] ?? null
    : null;

  return {
    isTVMode,
    tipoSlide,
    slideImagem,
    indiceImagem,
    totalImagens: imagens.length,
    progresso,
    dadosClima,
    entrar,
    sair,
    avancar: avancarSlide,
  };
}
