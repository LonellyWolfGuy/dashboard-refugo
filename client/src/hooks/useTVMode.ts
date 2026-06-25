import { useState, useEffect, useRef, useCallback } from "react";
import { listarSlides, getUrlOtimizada, MuralSlide } from "@/services/muralService";
import { buscarClima, DadosClima } from "@/services/weatherService";
import { temAniversariantesNoMes } from "@/lib/initialData";

export type TipoSlide = "dashboard" | "clima" | "aniversariantes" | "imagem";

export interface TVModeState {
  isTVMode: boolean;
  tipoSlide: TipoSlide;
  slideImagem: MuralSlide | null;
  indiceImagem: number;
  totalImagens: number;
  progresso: number;
  dadosClima: DadosClima | null;
  temAniversariantes: boolean;
  entrar: () => Promise<void>;
  sair: () => void;
  avancar: () => void;
}

const TV_SEG_DASHBOARD_KEY = "tv_seg_dashboard";
const TV_SEG_IMAGEM_KEY    = "tv_seg_imagem";
const DEFAULT_SEG_DASHBOARD = 30;
const DEFAULT_SEG_IMAGEM    = 15;
const SEG_CLIMA = 20;
const SEG_ANIVERSARIANTES = 20;

function getConfig() {
  const d = parseInt(localStorage.getItem(TV_SEG_DASHBOARD_KEY) ?? "", 10);
  const i = parseInt(localStorage.getItem(TV_SEG_IMAGEM_KEY) ?? "", 10);
  return {
    segDashboard: isNaN(d) ? DEFAULT_SEG_DASHBOARD : d,
    segImagem:    isNaN(i) ? DEFAULT_SEG_IMAGEM    : i,
  };
}

function precarregarImagem(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function getProximoIndiceImagem(atual: number, total: number): number | null {
  if (total === 0) return null;
  const prox = atual + 1;
  return prox < total ? prox : null;
}

export function useTVMode(): TVModeState {
  const [isTVMode,      setIsTVMode]      = useState(false);
  const [tipoSlide,     setTipoSlide]     = useState<TipoSlide>("dashboard");
  const [indiceImagem,  setIndiceImagem]  = useState(0);
  const [progresso,     setProgresso]     = useState(0);
  const [imagens,       setImagens]       = useState<MuralSlide[]>([]);
  const [dadosClima,    setDadosClima]    = useState<DadosClima | null>(null);
  const [temAniversariantes, setTemAniversariantes] = useState(false);

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressoRef     = useRef(0);
  const tipoAtualRef     = useRef<TipoSlide>("dashboard");
  const indiceImagemRef  = useRef(0);
  const imagensRef       = useRef<MuralSlide[]>([]);
  const preloadedRef     = useRef<Set<string>>(new Set());
  const abortRef         = useRef<AbortController | null>(null);
  const configRef        = useRef(getConfig());

  imagensRef.current = imagens;

  const limparInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const precarregarProximaImagem = useCallback(() => {
    const imgs = imagensRef.current;
    if (imgs.length === 0) return;

    let proxIdx: number | null = null;

    if (tipoAtualRef.current === "dashboard") {
      proxIdx = 0;
    } else if (tipoAtualRef.current === "clima") {
      proxIdx = 0;
    } else if (tipoAtualRef.current === "aniversariantes") {
      proxIdx = 0;
    } else if (tipoAtualRef.current === "imagem") {
      proxIdx = getProximoIndiceImagem(indiceImagemRef.current, imgs.length);
    }

    if (proxIdx !== null && proxIdx < imgs.length) {
      const urlOtimizada = getUrlOtimizada(imgs[proxIdx].storage_path);
      if (!preloadedRef.current.has(urlOtimizada)) {
        preloadedRef.current.add(urlOtimizada);
        precarregarImagem(urlOtimizada);
      }
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
      const mes = new Date().getMonth() + 1;
      const tem = temAniversariantesNoMes(mes);
      setTemAniversariantes(tem);
      if (tem) {
        tipoAtualRef.current = "aniversariantes";
        setTipoSlide("aniversariantes");
      } else if (imgs.length > 0) {
        tipoAtualRef.current = "imagem";
        setTipoSlide("imagem");
      } else {
        tipoAtualRef.current = "dashboard";
        setTipoSlide("dashboard");
      }
      indiceImagemRef.current = 0;
      setIndiceImagem(0);
    } else if (tipoAtualRef.current === "aniversariantes") {
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
    preloadedRef.current.clear();
    precarregarProximaImagem();
  }, [precarregarProximaImagem]);

  const iniciarCiclo = useCallback(() => {
    limparInterval();
    progressoRef.current = 0;
    setProgresso(0);
    preloadedRef.current.clear();
    precarregarProximaImagem();

    configRef.current = getConfig();
    const TICK_MS = 200;

    intervalRef.current = setInterval(() => {
      const cfg = configRef.current;
      const duracao =
        tipoAtualRef.current === "dashboard" ? cfg.segDashboard * 1000 :
        tipoAtualRef.current === "clima" ? SEG_CLIMA * 1000 :
        tipoAtualRef.current === "aniversariantes" ? SEG_ANIVERSARIANTES * 1000 :
        cfg.segImagem * 1000;

      progressoRef.current += TICK_MS;
      const pct = Math.min((progressoRef.current / duracao) * 100, 100);
      setProgresso(pct);

      if (progressoRef.current >= duracao) {
        avancarSlide();
      }
    }, TICK_MS);
  }, [limparInterval, avancarSlide, precarregarProximaImagem]);

  const entrar = useCallback(async () => {
    abortRef.current = new AbortController();

    try {
      const slides = await listarSlides();
      if (!abortRef.current) return;
      setImagens(slides);
      imagensRef.current = slides;
    } catch (err) {
      console.error("[useTVMode] Erro ao carregar slides:", err);
    }

    buscarClima("Joinville")
      .then(setDadosClima)
      .catch(() => {});

    const mesAtual = new Date().getMonth() + 1;
    setTemAniversariantes(temAniversariantesNoMes(mesAtual));

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
    abortRef.current = null;
    limparInterval();
    setIsTVMode(false);
    setTipoSlide("dashboard");
    setIndiceImagem(0);
    setProgresso(0);
    progressoRef.current = 0;
    tipoAtualRef.current = "dashboard";
    setDadosClima(null);
    setImagens([]);
    imagensRef.current = [];
    preloadedRef.current.clear();

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
  }, [isTVMode, iniciarCiclo, limparInterval, tipoSlide]);

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

  const slideAtual = tipoSlide === "imagem" && imagens.length > 0 && indiceImagem < imagens.length
    ? imagens[indiceImagem]
    : null;

  const slideImagem = slideAtual
    ? { ...slideAtual, url_publica: getUrlOtimizada(slideAtual.storage_path) }
    : null;

  return {
    isTVMode,
    tipoSlide,
    slideImagem,
    indiceImagem,
    totalImagens: imagens.length,
    progresso,
    dadosClima,
    temAniversariantes,
    entrar,
    sair,
    avancar: avancarSlide,
  };
}
