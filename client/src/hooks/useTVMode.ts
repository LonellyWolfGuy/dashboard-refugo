// useTVMode.ts
// Hook que controla o estado completo do Modo TV:
// - Ciclo automático entre slide de dashboard e slides de imagem
// - Integração com a Fullscreen API do navegador
// - Barra de progresso animada
// - Saída com ESC ou chamando sair()

import { useState, useEffect, useRef, useCallback } from "react";
import { listarSlides, MuralSlide } from "@/services/muralService";

export type TipoSlide = "dashboard" | "imagem";

export interface TVModeState {
  isTVMode: boolean;
  tipoSlide: TipoSlide;
  slideImagem: MuralSlide | null;   // slide de imagem atual (null quando é dashboard)
  indiceImagem: number;              // índice dentro do array de imagens
  totalImagens: number;
  progresso: number;                 // 0-100, para a barra de progresso
  entrar: () => Promise<void>;
  sair: () => void;
  avancar: () => void;               // avança manualmente para o próximo slide
}

const TV_SEG_DASHBOARD_KEY = "tv_seg_dashboard";
const TV_SEG_IMAGEM_KEY    = "tv_seg_imagem";
const DEFAULT_SEG_DASHBOARD = 30;
const DEFAULT_SEG_IMAGEM    = 15;

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

  // Refs para controle do interval sem stale closure
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressoRef     = useRef(0);
  const tipoAtualRef     = useRef<TipoSlide>("dashboard");
  const indiceImagemRef  = useRef(0);
  const imagensRef       = useRef<MuralSlide[]>([]);

  // Sincroniza refs com state
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
      // Dashboard → primeira imagem (se houver), senão repete dashboard
      if (imgs.length > 0) {
        tipoAtualRef.current = "imagem";
        indiceImagemRef.current = 0;
        setTipoSlide("imagem");
        setIndiceImagem(0);
      }
    } else {
      // Imagem → próxima imagem ou volta para dashboard
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

    // Reinicia progresso
    progressoRef.current = 0;
    setProgresso(0);
  }, []);

  const iniciarCiclo = useCallback(() => {
    limparInterval();
    progressoRef.current = 0;
    setProgresso(0);

    const TICK_MS = 200; // atualiza a cada 200ms para suavidade

    intervalRef.current = setInterval(() => {
      const cfg = getConfig();
      const duracao = tipoAtualRef.current === "dashboard"
        ? cfg.segDashboard * 1000
        : cfg.segImagem * 1000;

      progressoRef.current += TICK_MS;
      const pct = Math.min((progressoRef.current / duracao) * 100, 100);
      setProgresso(pct);

      if (progressoRef.current >= duracao) {
        avancarSlide();
      }
    }, TICK_MS);
  }, [limparInterval, avancarSlide]);

  const entrar = useCallback(async () => {
    // Carrega imagens do Supabase
    try {
      const slides = await listarSlides();
      setImagens(slides);
      imagensRef.current = slides;
    } catch (err) {
      console.error("[useTVMode] Erro ao carregar slides:", err);
    }

    // Reseta estado
    tipoAtualRef.current  = "dashboard";
    indiceImagemRef.current = 0;
    setTipoSlide("dashboard");
    setIndiceImagem(0);
    setProgresso(0);
    progressoRef.current = 0;

    setIsTVMode(true);

    // Fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Navegador pode bloquear fullscreen — ignora e continua
    }
  }, []);

  const sair = useCallback(() => {
    limparInterval();
    setIsTVMode(false);
    setTipoSlide("dashboard");
    setIndiceImagem(0);
    setProgresso(0);
    progressoRef.current = 0;
    tipoAtualRef.current = "dashboard";

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [limparInterval]);

  // Inicia/reinicia o ciclo quando o Modo TV é ativado
  useEffect(() => {
    if (isTVMode) {
      iniciarCiclo();
    } else {
      limparInterval();
    }
    return limparInterval;
  }, [isTVMode, iniciarCiclo, limparInterval]);

  // Reinicia o ciclo quando o tipo de slide muda (para usar o tempo correto)
  useEffect(() => {
    if (isTVMode) {
      iniciarCiclo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSlide]);

  // Escuta ESC e saída de fullscreen
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
    entrar,
    sair,
    avancar: avancarSlide,
  };
}
