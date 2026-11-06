"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Flame,
  Award,
  ChevronRight,
  ChevronLeft,
  Tv,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Play,
  ExternalLink,
  Accessibility,
  HeartPulse,
  X,
  BarChart3,
  TrendingUp,
  Activity,
  Plus,
  Minus,
} from "lucide-react";
import {
  ActivityEventLog,
  ActivityEventType,
  CYCLES_DATASET,
  getCycleData,
  INITIAL_CALIBRATED_STATE,
  PersistedWorkoutState,
} from "@/lib/workout-data";
import { soundFX } from "@/lib/sound";

interface VideoModalState {
  open: boolean;
  title: string;
  subtitle: string;
  videoId: string;
  youtubeUrl: string;
}

export default function HomeHubPage() {
  const router = useRouter();
  const [state, setState] = useState<PersistedWorkoutState>(INITIAL_CALIBRATED_STATE);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  const stateRef = useRef(state);
  stateRef.current = state;

  // Refs dos botões para auto-focus do navegador Tizen Smart TV
  const card0Ref = useRef<HTMLButtonElement>(null);
  const card1Ref = useRef<HTMLButtonElement>(null);
  const card2Ref = useRef<HTMLButtonElement>(null);
  const card3Ref = useRef<HTMLButtonElement>(null);
  const card4Ref = useRef<HTMLButtonElement>(null);

  // 0: Treino Diário
  // 1: Alongamento RPG
  // 2: Alongamento 15/30 min
  // 3: Escada de Ciclos
  // 4: Métricas
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Modais
  const [showLadderModal, setShowLadderModal] = useState<boolean>(false);
  const [ladderModalFocus, setLadderModalFocus] = useState<number>(4);

  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [metricsModalFocus, setMetricsModalFocus] = useState<number>(0);

  const [showStretchPickerModal, setShowStretchPickerModal] = useState<boolean>(false);
  const [stretchPickerFocus, setStretchPickerFocus] = useState<number>(0);

  const [videoModal, setVideoModal] = useState<VideoModalState>({
    open: false,
    title: "",
    subtitle: "",
    videoId: "",
    youtubeUrl: "",
  });
  const [videoModalFocus, setVideoModalFocus] = useState<number>(0);

  // Auto-foco inicial no Card 0 ao carregar a página para capturar o controle remoto da TV
  useEffect(() => {
    const timer = setTimeout(() => {
      card0Ref.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Mantém o foco nativo do navegador sincronizado com o estado focusedIndex
  useEffect(() => {
    if (showLadderModal || showMetricsModal || showStretchPickerModal || videoModal.open) return;
    const refs = [card0Ref, card1Ref, card2Ref, card3Ref, card4Ref];
    refs[focusedIndex]?.current?.focus();
  }, [focusedIndex, showLadderModal, showMetricsModal, showStretchPickerModal, videoModal.open]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  const saveStateToServer = useCallback(async (nextState: PersistedWorkoutState) => {
    setState(nextState);
    localStorage.setItem("app-tv-workout-backup", JSON.stringify(nextState));
    try {
      await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetch("/api/workout")
      .then((r) => r.json())
      .then((data: PersistedWorkoutState) => {
        setState(data);
        localStorage.setItem("app-tv-workout-backup", JSON.stringify(data));
      })
      .catch(() => {
        const local = localStorage.getItem("app-tv-workout-backup");
        if (local) {
          try {
            setState(JSON.parse(local));
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResetToday = useCallback(async () => {
    soundFX.playTick(500);
    const res = await fetch("/api/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_today" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setState(updated);
    }
  }, []);

  const openVideoPlayerWithMetrics = useCallback(
    (
      eventType: Extract<ActivityEventType, "stretch_posture" | "stretch_15m" | "stretch_30m">,
      durationMin: number,
      title: string,
      subtitle: string,
      videoId: string,
      youtubeUrl: string
    ) => {
      soundFX.playTick(800);
      const current = stateRef.current;
      const todayIso = current.today.date;
      const nowIso = new Date().toISOString();

      const nextMetrics = {
        ...current.metrics,
        totalStretchSessions: (current.metrics.totalStretchSessions || 0) + 1,
        totalMinutesTrained: (current.metrics.totalMinutesTrained || 0) + durationMin,
        stretchPostureCount:
          eventType === "stretch_posture"
            ? (current.metrics.stretchPostureCount || 0) + 1
            : current.metrics.stretchPostureCount || 0,
        stretch15mCount:
          eventType === "stretch_15m"
            ? (current.metrics.stretch15mCount || 0) + 1
            : current.metrics.stretch15mCount || 0,
        stretch30mCount:
          eventType === "stretch_30m"
            ? (current.metrics.stretch30mCount || 0) + 1
            : current.metrics.stretch30mCount || 0,
      };

      const newLog: ActivityEventLog = {
        id: `act-str-${Date.now()}`,
        type: eventType,
        title,
        detail: `${subtitle} (${durationMin} min)`,
        date: todayIso,
        timestamp: nowIso,
        cycle: current.currentCycle,
        durationMinutes: durationMin,
      };

      saveStateToServer({
        ...current,
        metrics: nextMetrics,
        activityLog: [newLog, ...(current.activityLog || [])].slice(0, 120),
      });

      setShowStretchPickerModal(false);
      setVideoModalFocus(0);
      setVideoModal({
        open: true,
        title,
        subtitle,
        videoId,
        youtubeUrl,
      });
    },
    [saveStateToServer]
  );

  const handleManualCycleChange = useCallback(
    (delta: -1 | 1) => {
      const current = stateRef.current;
      const nextCycle = Math.max(1, current.currentCycle + delta);
      if (nextCycle === current.currentCycle) return;

      soundFX.playTick(delta > 0 ? 820 : 480, 0.1);
      const todayIso = current.today.date;
      const nowIso = new Date().toISOString();

      const newLog: ActivityEventLog = {
        id: `act-adj-${Date.now()}`,
        type: "cycle_manual_change",
        title:
          delta > 0
            ? `Avançou Manualmente para o Ciclo ${nextCycle}`
            : `Retornou Manualmente para o Ciclo ${nextCycle}`,
        detail:
          delta > 0
            ? `Ajuste manual na Escada de Ciclos (de Ciclo ${current.currentCycle} → Ciclo ${nextCycle})`
            : `Ajuste de conforto na Escada de Ciclos (de Ciclo ${current.currentCycle} → Ciclo ${nextCycle})`,
        date: todayIso,
        timestamp: nowIso,
        cycle: nextCycle,
      };

      const nextMetrics = {
        ...current.metrics,
        manualCycleAdjustments: (current.metrics.manualCycleAdjustments || 0) + 1,
        highestCycleReached: Math.max(
          current.metrics.highestCycleReached || 1,
          nextCycle
        ),
      };

      saveStateToServer({
        ...current,
        currentCycle: nextCycle,
        metrics: nextMetrics,
        activityLog: [newLog, ...(current.activityLog || [])].slice(0, 120),
      });
    },
    [saveStateToServer]
  );

  const handleManualSessionDotChange = useCallback(
    (delta: -1 | 1) => {
      const current = stateRef.current;
      const nextDots = Math.min(5, Math.max(0, current.sessionsInCycle + delta));
      if (nextDots === current.sessionsInCycle) return;

      soundFX.playTick(660, 0.08);
      saveStateToServer({
        ...current,
        sessionsInCycle: nextDots,
      });
    },
    [saveStateToServer]
  );

  const triggerCardAction = useCallback(
    (idx: number) => {
      soundFX.playTick(750);
      if (idx === 0) {
        router.push("/treino");
      } else if (idx === 1) {
        openVideoPlayerWithMetrics(
          "stretch_posture",
          15,
          "Exercícios para Corrigir Postura — RPG",
          "Dr. Rodrigo Lopes • Alinhamento de coluna e ombros",
          "vHpX3ZbK5cU",
          "https://www.youtube.com/watch?v=vHpX3ZbK5cU&list=PLr_aTBhkuy-W4YN3_h5xakpL3oGjUum9j"
        );
      } else if (idx === 2) {
        setStretchPickerFocus(0);
        setShowStretchPickerModal(true);
      } else if (idx === 3) {
        setLadderModalFocus(1);
        setShowLadderModal(true);
      } else if (idx === 4) {
        setMetricsModalFocus(0);
        setShowMetricsModal(true);
      }
    },
    [router, openVideoPlayerWithMetrics]
  );

  // Escuta os códigos nativos de teclado do Tizen Smart TV
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      const key = e.key;

      // Códigos Samsung Smart Remote D-Pad:
      // Left = 37, Up = 38, Right = 39, Down = 40, Enter = 13, Back/Return = 10009
      const isLeft = key === "ArrowLeft" || code === 37;
      const isUp = key === "ArrowUp" || code === 38;
      const isRight = key === "ArrowRight" || code === 39;
      const isDown = key === "ArrowDown" || code === 40;
      const isEnter = key === "Enter" || key === " " || code === 13;
      const isBack = key === "Escape" || key === "Backspace" || code === 10009 || code === 27;

      if (videoModal.open) {
        if (isLeft || isRight) {
          e.preventDefault();
          soundFX.playTick(520);
          setVideoModalFocus((prev) => (prev === 0 ? 1 : 0));
        } else if (isEnter) {
          e.preventDefault();
          if (videoModalFocus === 0) {
            setVideoModal((prev) => ({ ...prev, open: false }));
          } else {
            window.open(videoModal.youtubeUrl, "_blank", "noopener,noreferrer");
          }
        } else if (isBack) {
          e.preventDefault();
          soundFX.playTick(440);
          setVideoModal((prev) => ({ ...prev, open: false }));
        }
        return;
      }

      if (showStretchPickerModal) {
        if (isRight || isDown) {
          e.preventDefault();
          soundFX.playTick(520);
          setStretchPickerFocus((prev) => (prev + 1) % 3);
        } else if (isLeft || isUp) {
          e.preventDefault();
          soundFX.playTick(520);
          setStretchPickerFocus((prev) => (prev - 1 + 3) % 3);
        } else if (isEnter) {
          e.preventDefault();
          if (stretchPickerFocus === 0) {
            openVideoPlayerWithMetrics(
              "stretch_15m",
              15,
              "Alongamento Rápido — Versão 15 min (Full Body)",
              "12 MIN DAILY STRETCH — Músculos tensos, mobilidade e flexibilidade",
              "itJE4neqDJw",
              "https://www.youtube.com/watch?v=itJE4neqDJw&list=PLr_aTBhkuy-W4YN3_h5xakpL3oGjUum9j&index=3"
            );
          } else if (stretchPickerFocus === 1) {
            openVideoPlayerWithMetrics(
              "stretch_30m",
              30,
              "Alongamento Completo — Versão 30 min (Flexibilidade)",
              "BEGINNER FLEXIBILITY ROUTINE — Rotina completa de flexibilidade",
              "qULTwquOuT4",
              "https://www.youtube.com/watch?v=qULTwquOuT4&list=PLr_aTBhkuy-W4YN3_h5xakpL3oGjUum9j&index=4"
            );
          } else {
            setShowStretchPickerModal(false);
          }
        } else if (isBack) {
          e.preventDefault();
          soundFX.playTick(440);
          setShowStretchPickerModal(false);
        }
        return;
      }

      if (showLadderModal) {
        if (isRight || isDown) {
          e.preventDefault();
          soundFX.playTick(520);
          setLadderModalFocus((prev) => (prev + 1) % 5);
        } else if (isLeft || isUp) {
          e.preventDefault();
          soundFX.playTick(520);
          setLadderModalFocus((prev) => (prev - 1 + 5) % 5);
        } else if (isEnter) {
          e.preventDefault();
          if (ladderModalFocus === 0) handleManualCycleChange(-1);
          else if (ladderModalFocus === 1) handleManualCycleChange(1);
          else if (ladderModalFocus === 2) handleManualSessionDotChange(-1);
          else if (ladderModalFocus === 3) handleManualSessionDotChange(1);
          else setShowLadderModal(false);
        } else if (isBack) {
          e.preventDefault();
          soundFX.playTick(440);
          setShowLadderModal(false);
        }
        return;
      }

      if (showMetricsModal) {
        if (isLeft || isRight) {
          e.preventDefault();
          soundFX.playTick(520);
          setMetricsModalFocus((prev) => (prev === 0 ? 1 : 0));
        } else if (isEnter) {
          e.preventDefault();
          if (metricsModalFocus === 0) {
            setShowMetricsModal(false);
          } else {
            handleResetToday();
          }
        } else if (isBack) {
          e.preventDefault();
          soundFX.playTick(440);
          setShowMetricsModal(false);
        }
        return;
      }

      // Navegação 2D inteligente entre os Cards da Home
      // Layout:
      // Card 0 (Treino) ocupa toda a metade esquerda (cols 0-6)
      // Card 1 (RPG) fica no topo direito
      // Card 2 (Alongamento) fica no meio direito
      // Card 3 (Escada) e Card 4 (Métricas) ficam embaixo à direita
      if (isRight) {
        e.preventDefault();
        soundFX.playTick(520);
        if (focusedIndex === 0) setFocusedIndex(1);
        else if (focusedIndex === 3) setFocusedIndex(4);
        else setFocusedIndex(0);
      } else if (isLeft) {
        e.preventDefault();
        soundFX.playTick(520);
        if (focusedIndex === 1 || focusedIndex === 2 || focusedIndex === 3) setFocusedIndex(0);
        else if (focusedIndex === 4) setFocusedIndex(3);
        else setFocusedIndex(1);
      } else if (isDown) {
        e.preventDefault();
        soundFX.playTick(520);
        if (focusedIndex === 1) setFocusedIndex(2);
        else if (focusedIndex === 2) setFocusedIndex(3);
        else if (focusedIndex === 3 || focusedIndex === 4) setFocusedIndex(0);
        else setFocusedIndex(1);
      } else if (isUp) {
        e.preventDefault();
        soundFX.playTick(520);
        if (focusedIndex === 3 || focusedIndex === 4) setFocusedIndex(2);
        else if (focusedIndex === 2) setFocusedIndex(1);
        else if (focusedIndex === 1) setFocusedIndex(0);
        else setFocusedIndex(3);
      } else if (isEnter) {
        e.preventDefault();
        triggerCardAction(focusedIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedIndex,
    showLadderModal,
    ladderModalFocus,
    showMetricsModal,
    metricsModalFocus,
    showStretchPickerModal,
    stretchPickerFocus,
    videoModal,
    videoModalFocus,
    triggerCardAction,
    openVideoPlayerWithMetrics,
    handleManualCycleChange,
    handleManualSessionDotChange,
    handleResetToday,
  ]);

  const cycleData = getCycleData(state.currentCycle);
  const completedSetsCount =
    state.today.sets.chinup +
    state.today.sets.pushup +
    state.today.sets.splitsquat +
    state.today.sets.plank;

  const metrics = state.metrics || INITIAL_CALIBRATED_STATE.metrics;
  const activityLog = state.activityLog || INITIAL_CALIBRATED_STATE.activityLog;

  const displayedCycles = [...CYCLES_DATASET];
  if (state.currentCycle > 6) {
    for (let c = 7; c <= state.currentCycle; c++) {
      displayedCycles.push(getCycleData(c));
    }
  }

  return (
    <main className="w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-7 lg:p-10 overflow-hidden relative select-none">
      {/* HEADER */}
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Samsung Smart TV • Kiosk
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                Navegue com as setas ◀ ▶ ▲ ▼ e OK
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Hub Pessoal & Rotina Matinal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-5 py-2.5 rounded-2xl">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Streak Atual
              </div>
              <div className="text-xl font-black text-amber-300">
                {state.streakDays} {state.streakDays === 1 ? "dia" : "dias"}
              </div>
            </div>
          </div>

          <div className="text-right bg-zinc-900/90 border border-zinc-800 px-5 py-2.5 rounded-2xl min-w-[190px]">
            <div className="text-2xl font-black tracking-tight text-white tabular-nums">
              {currentTime || "07:00"}
            </div>
            <div className="text-xs text-zinc-400 capitalize font-medium truncate">
              {currentDateStr || "Sexta-feira"}
            </div>
          </div>
        </div>
      </header>

      {/* GRID CENTRAL DE CARDS DO HUB (COM TABINDEX={0} E REF PARA CAPTURA DO CONTROLE DA TV) */}
      <section className="relative z-10 flex-1 grid grid-cols-12 gap-6 my-5 items-stretch min-h-0">
        {/* CARD 0 (PRINCIPAL): TREINO DIÁRIO */}
        <button
          ref={card0Ref}
          tabIndex={0}
          type="button"
          onClick={() => triggerCardAction(0)}
          onFocus={() => setFocusedIndex(0)}
          onMouseEnter={() => setFocusedIndex(0)}
          className={`col-span-6 text-left rounded-3xl p-7 flex flex-col justify-between border-2 tv-focusable relative overflow-hidden cursor-pointer ${
            focusedIndex === 0
              ? "tv-focused bg-zinc-900 border-sky-400"
              : "bg-zinc-900/80 border-zinc-800"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500 text-zinc-950 flex items-center justify-center">
                <Dumbbell className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                  <Sparkles className="w-3 h-3" /> Piloto Automático • Seg a Sáb
                </span>
                <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mt-1.5">
                  Treino Diário
                </h2>
              </div>
            </div>

            {state.today.completedToday ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Concluído Hoje
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-sm">
                <Clock className="w-4 h-4" /> {completedSetsCount}/8 séries
              </span>
            )}
          </div>

          <div className="my-auto bg-zinc-950/85 border border-zinc-800/90 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                  Escada de 6 Sessões • Progressão Ativa
                </div>
                <div className="text-xl font-extrabold text-white mt-0.5">
                  {cycleData.label}{" "}
                  <span className="text-sky-400 font-bold text-base ml-1.5">
                    ({state.sessionsInCycle} de 6 concluídos)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((dot) => {
                  const filled = dot <= state.sessionsInCycle;
                  return (
                    <div
                      key={dot}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        filled
                          ? "bg-emerald-400 text-zinc-950 font-black"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {filled ? "●" : "○"}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-800/80">
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800/70">
                <div className="text-[11px] text-zinc-400 font-semibold">1. Barra Supinada</div>
                <div className="text-xs font-bold text-zinc-100 mt-0.5 truncate">
                  {cycleData.targets.chinup.text}
                </div>
              </div>
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800/70">
                <div className="text-[11px] text-zinc-400 font-semibold">2. Flexão no Chão</div>
                <div className="text-xs font-bold text-zinc-100 mt-0.5">
                  {cycleData.targets.pushup.text}
                </div>
              </div>
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800/70">
                <div className="text-[11px] text-zinc-400 font-semibold">3. Afundo Fixo</div>
                <div className="text-xs font-bold text-zinc-100 mt-0.5">
                  {cycleData.targets.splitsquat.text}
                </div>
              </div>
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800/70">
                <div className="text-[11px] text-zinc-400 font-semibold">4. Prancha</div>
                <div className="text-xs font-bold text-sky-300 mt-0.5">
                  {cycleData.targets.plank.text}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-zinc-300 font-medium">
              Aquecimento + 2 voltas guiadas por timer automático
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-400 text-zinc-950 font-black text-base">
              Iniciar Treino <ChevronRight className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
        </button>

        {/* COLUNA DIREITA: 4 CARDS (RPG, ALONGAMENTO, ESCADA, MÉTRICAS) */}
        <div className="col-span-6 flex flex-col gap-4 justify-between min-h-0">
          {/* CARD 1: ALONGAMENTO RPG */}
          <button
            ref={card1Ref}
            tabIndex={0}
            type="button"
            onClick={() => triggerCardAction(1)}
            onFocus={() => setFocusedIndex(1)}
            onMouseEnter={() => setFocusedIndex(1)}
            className={`flex-1 text-left rounded-3xl p-5 flex flex-col justify-between border-2 tv-focusable cursor-pointer ${
              focusedIndex === 1
                ? "tv-focused bg-zinc-900 border-sky-400"
                : "bg-zinc-900/80 border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                  <Accessibility className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                    Alongamento 1 • RPG & Coluna
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    Corrigir Postura — RPG
                  </h3>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-400 text-zinc-950 font-black text-xs shrink-0">
                <Play className="w-4 h-4 fill-current" /> Assistir na TV
              </span>
            </div>

            <p className="text-xs lg:text-sm text-zinc-300 line-clamp-2">
              Exercícios práticos de Reeducação Postural Global com <strong className="text-white">Dr. Rodrigo Lopes</strong> para alinhar ombros, cervical e coluna torácica.
            </p>
          </button>

          {/* CARD 2: ALONGAMENTO 15/30 MIN */}
          <button
            ref={card2Ref}
            tabIndex={0}
            type="button"
            onClick={() => triggerCardAction(2)}
            onFocus={() => setFocusedIndex(2)}
            onMouseEnter={() => setFocusedIndex(2)}
            className={`flex-1 text-left rounded-3xl p-5 flex flex-col justify-between border-2 tv-focusable cursor-pointer ${
              focusedIndex === 2
                ? "tv-focused bg-zinc-900 border-sky-400"
                : "bg-zinc-900/80 border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                    Alongamento 2 • Mobilidade & Flexibilidade
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    Rotina de Alongamento (15 min / 30 min)
                  </h3>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-400 text-zinc-950 font-black text-xs shrink-0">
                <Play className="w-4 h-4 fill-current" /> Escolher Duração
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-300">Opção Rápida</div>
                  <div className="text-xs font-extrabold text-white">Versão 15 min (Full Body)</div>
                </div>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-300">Opção Completa</div>
                  <div className="text-xs font-extrabold text-white">Versão 30 min (Flexibilidade)</div>
                </div>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </button>

          {/* LINHA INFERIOR DIREITA: CARD 3 (ESCADA) E CARD 4 (MÉTRICAS) */}
          <div className="grid grid-cols-2 gap-4">
            <button
              ref={card3Ref}
              tabIndex={0}
              type="button"
              onClick={() => triggerCardAction(3)}
              onFocus={() => setFocusedIndex(3)}
              onMouseEnter={() => setFocusedIndex(3)}
              className={`text-left rounded-2xl p-4 border-2 flex items-center justify-between tv-focusable cursor-pointer ${
                focusedIndex === 3
                  ? "tv-focused bg-zinc-900 border-sky-400"
                  : "bg-zinc-900/70 border-zinc-800/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    Ajustar Nível • Ciclos 1 a 6+
                  </div>
                  <div className="text-base font-extrabold text-white">
                    Escada de Ciclos
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>

            <button
              ref={card4Ref}
              tabIndex={0}
              type="button"
              onClick={() => triggerCardAction(4)}
              onFocus={() => setFocusedIndex(4)}
              onMouseEnter={() => setFocusedIndex(4)}
              className={`text-left rounded-2xl p-4 border-2 flex items-center justify-between tv-focusable cursor-pointer ${
                focusedIndex === 4
                  ? "tv-focused bg-zinc-900 border-sky-400"
                  : "bg-zinc-900/70 border-zinc-800/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    {metrics.totalWorkouts} treinos • {metrics.totalStretchSessions} along.
                  </div>
                  <div className="text-base font-extrabold text-white">
                    Métricas & Evolução
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded font-bold">◀ ▶ ▲ ▼</kbd>
            Setas do Controle Remoto
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded font-bold">
              OK / Enter
            </kbd>
            Selecionar
          </span>
        </div>
        <div>
          {loading ? "Sincronizando estado no Umbrel..." : "Hospedado localmente no Umbrel • Zero Digitação"}
        </div>
      </footer>

      {/* MODAL SELETOR DE ALONGAMENTO */}
      {showStretchPickerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setShowStretchPickerModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-zinc-900 border-2 border-indigo-400 rounded-3xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                  Alongamento & Flexibilidade
                </span>
                <h2 className="text-3xl font-black text-white mt-1">
                  Escolha a Duração do Alongamento
                </h2>
              </div>
              <button
                tabIndex={0}
                type="button"
                onClick={() => setShowStretchPickerModal(false)}
                onFocus={() => setStretchPickerFocus(2)}
                onMouseEnter={() => setStretchPickerFocus(2)}
                className={`px-4 py-2 rounded-xl font-bold text-sm border tv-focusable cursor-pointer ${
                  stretchPickerFocus === 2
                    ? "tv-focused bg-zinc-800 border-sky-400 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                Voltar (ESC)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <button
                tabIndex={0}
                type="button"
                onClick={() =>
                  openVideoPlayerWithMetrics(
                    "stretch_15m",
                    15,
                    "Alongamento Rápido — Versão 15 min (Full Body)",
                    "12 MIN DAILY STRETCH — Músculos tensos, mobilidade e flexibilidade",
                    "itJE4neqDJw",
                    "https://www.youtube.com/watch?v=itJE4neqDJw&list=PLr_aTBhkuy-W4YN3_h5xakpL3oGjUum9j&index=3"
                  )
                }
                onFocus={() => setStretchPickerFocus(0)}
                onMouseEnter={() => setStretchPickerFocus(0)}
                className={`text-left rounded-2xl p-6 border-2 flex flex-col justify-between h-60 tv-focusable cursor-pointer ${
                  stretchPickerFocus === 0
                    ? "tv-focused bg-indigo-950/50 border-sky-400"
                    : "bg-zinc-950 border-zinc-800"
                }`}
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs uppercase">
                    <Clock className="w-3.5 h-3.5" /> Versão 15 Minutos
                  </span>
                  <h3 className="text-2xl font-black text-white mt-3">
                    Daily Stretch (Full Body)
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2">
                    Ideal para destravar músculos tensos, ganhar mobilidade e flexibilidade rápida no dia a dia.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-indigo-300 font-black text-base">
                  <Play className="w-5 h-5 fill-current" /> Iniciar Vídeo de 15 min (OK)
                </div>
              </button>

              <button
                tabIndex={0}
                type="button"
                onClick={() =>
                  openVideoPlayerWithMetrics(
                    "stretch_30m",
                    30,
                    "Alongamento Completo — Versão 30 min (Flexibilidade)",
                    "BEGINNER FLEXIBILITY ROUTINE — Stretches for the Inflexible",
                    "qULTwquOuT4",
                    "https://www.youtube.com/watch?v=qULTwquOuT4&list=PLr_aTBhkuy-W4YN3_h5xakpL3oGjUum9j&index=4"
                  )
                }
                onFocus={() => setStretchPickerFocus(1)}
                onMouseEnter={() => setStretchPickerFocus(1)}
                className={`text-left rounded-2xl p-6 border-2 flex flex-col justify-between h-60 tv-focusable cursor-pointer ${
                  stretchPickerFocus === 1
                    ? "tv-focused bg-amber-950/40 border-sky-400"
                    : "bg-zinc-950 border-zinc-800"
                }`}
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs uppercase">
                    <Clock className="w-3.5 h-3.5" /> Versão 30 Minutos
                  </span>
                  <h3 className="text-2xl font-black text-white mt-3">
                    Rotina Completa de Flexibilidade
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2">
                    Sessão profunda para soltar toda a cadeia posterior, quadril e ganhar amplitude articular.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-amber-300 font-black text-base">
                  <Play className="w-5 h-5 fill-current" /> Iniciar Vídeo de 30 min (OK)
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLAYER DE VÍDEO YOUTUBE FULLSCREEN NA TV */}
      {videoModal.open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-6 lg:p-8">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-white">
                {videoModal.title}
              </h2>
              <p className="text-sm text-zinc-400">{videoModal.subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                tabIndex={0}
                type="button"
                onClick={() => setVideoModal((prev) => ({ ...prev, open: false }))}
                onFocus={() => setVideoModalFocus(0)}
                onMouseEnter={() => setVideoModalFocus(0)}
                className={`px-6 py-3 rounded-2xl font-black text-base flex items-center gap-2 border-2 tv-focusable cursor-pointer ${
                  videoModalFocus === 0
                    ? "tv-focused bg-sky-400 text-zinc-950 border-white"
                    : "bg-zinc-800 text-zinc-200 border-zinc-700"
                }`}
              >
                <X className="w-5 h-5 stroke-[2.5]" /> Fechar Vídeo e Voltar ao Hub (OK)
              </button>

              <a
                tabIndex={0}
                href={videoModal.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onFocus={() => setVideoModalFocus(1)}
                onMouseEnter={() => setVideoModalFocus(1)}
                className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 border-2 tv-focusable cursor-pointer ${
                  videoModalFocus === 1
                    ? "tv-focused bg-red-600 text-white border-white"
                    : "bg-zinc-900 text-zinc-300 border-zinc-800"
                }`}
              >
                <ExternalLink className="w-4 h-4" /> Abrir no YouTube
              </a>
            </div>
          </div>

          <div className="flex-1 w-full rounded-3xl overflow-hidden border-2 border-zinc-800 bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoModal.videoId}?autoplay=1&rel=0`}
              title={videoModal.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* MODAL DA ESCADA DE CICLOS */}
      {showLadderModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setShowLadderModal(false)}
        >
          <div
            className="w-full max-w-6xl bg-zinc-900 border-2 border-sky-400 rounded-3xl p-7 flex flex-col justify-between max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Escada de 6 Sessões + Modo Maestria Infinito (Ciclo 7+)
                </span>
                <h2 className="text-2xl lg:text-3xl font-black text-white mt-0.5">
                  Tabela de Progressão & Ajuste Manual de Conforto
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => handleManualCycleChange(-1)}
                  onFocus={() => setLadderModalFocus(0)}
                  onMouseEnter={() => setLadderModalFocus(0)}
                  disabled={state.currentCycle <= 1}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 border-2 tv-focusable cursor-pointer ${
                    ladderModalFocus === 0
                      ? "tv-focused bg-amber-400 text-zinc-950 border-white"
                      : "bg-zinc-950 text-amber-300 border-amber-500/40"
                  } ${state.currentCycle <= 1 ? "opacity-40" : ""}`}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[3]" /> Voltar Ciclo (-1)
                </button>

                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => handleManualCycleChange(1)}
                  onFocus={() => setLadderModalFocus(1)}
                  onMouseEnter={() => setLadderModalFocus(1)}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 border-2 tv-focusable cursor-pointer ${
                    ladderModalFocus === 1
                      ? "tv-focused bg-emerald-400 text-zinc-950 border-white"
                      : "bg-zinc-950 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  Avançar Ciclo (+1) <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>

                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => handleManualSessionDotChange(-1)}
                  onFocus={() => setLadderModalFocus(2)}
                  onMouseEnter={() => setLadderModalFocus(2)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 border-2 tv-focusable cursor-pointer ${
                    ladderModalFocus === 2
                      ? "tv-focused bg-zinc-200 text-zinc-950 border-white"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" /> 1 Bolinha
                </button>

                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => handleManualSessionDotChange(1)}
                  onFocus={() => setLadderModalFocus(3)}
                  onMouseEnter={() => setLadderModalFocus(3)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 border-2 tv-focusable cursor-pointer ${
                    ladderModalFocus === 3
                      ? "tv-focused bg-zinc-200 text-zinc-950 border-white"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> 1 Bolinha
                </button>

                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => setShowLadderModal(false)}
                  onFocus={() => setLadderModalFocus(4)}
                  onMouseEnter={() => setLadderModalFocus(4)}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs border-2 tv-focusable cursor-pointer ${
                    ladderModalFocus === 4
                      ? "tv-focused bg-sky-400 text-zinc-950 border-white"
                      : "bg-zinc-800 text-zinc-200 border-zinc-700"
                  }`}
                >
                  Fechar (OK)
                </button>
              </div>
            </div>

            <div className="overflow-y-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Ciclo</th>
                    <th className="py-3 px-4">1. Barra Supinada (2 Séries)</th>
                    <th className="py-3 px-4">2. Flexão no Chão (2 Séries)</th>
                    <th className="py-3 px-4">3. Afundo por Perna (2 Séries)</th>
                    <th className="py-3 px-4">4. Prancha / Core (2 Séries)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {displayedCycles.map((row) => {
                    const isCurrent = row.cycle === state.currentCycle;
                    return (
                      <tr
                        key={row.cycle}
                        className={
                          isCurrent
                            ? "bg-sky-500/20 text-white font-bold"
                            : "bg-zinc-900/60 text-zinc-300"
                        }
                      >
                        <td className="py-3 px-4 font-extrabold">
                          <span className="inline-flex items-center gap-2">
                            {row.label}
                            {isCurrent && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-400 text-zinc-950 font-black">
                                ATUAL ({state.sessionsInCycle}/6)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>{row.targets.chinup.text}</div>
                          {row.targets.chinup.detail && (
                            <div className="text-xs text-zinc-400">{row.targets.chinup.detail}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">{row.targets.pushup.text}</td>
                        <td className="py-3 px-4">{row.targets.splitsquat.text}</td>
                        <td className="py-3 px-4 text-sky-300 font-semibold">
                          {row.targets.plank.text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 flex items-center justify-between text-xs text-zinc-300">
              <div>
                <strong className="text-amber-300">O que acontece depois do Ciclo 6?</strong> Ao completar as 6 sessões do Ciclo 6, você entra no{" "}
                <strong className="text-white">Modo Maestria Calistênica (Ciclo 7, 8, 9...)</strong>, adicionando automaticamente +1 repetição nas variações avançadas a cada novo ciclo concluído.
              </div>
              <span className="text-sky-400 font-bold shrink-0 ml-4">
                Use ◀ ▶ e OK para voltar ou avançar de ciclo quando quiser
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MÉTRICAS */}
      {showMetricsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setShowMetricsModal(false)}
        >
          <div
            className="w-full max-w-6xl bg-zinc-900 border-2 border-emerald-400 rounded-3xl p-7 flex flex-col justify-between max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    Telemetria & Consistência Salvas no Umbrel
                  </span>
                  <h2 className="text-3xl font-black text-white mt-0.5">
                    Métricas Acumuladas & Linha do Tempo
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  tabIndex={0}
                  type="button"
                  onClick={handleResetToday}
                  onFocus={() => setMetricsModalFocus(1)}
                  onMouseEnter={() => setMetricsModalFocus(1)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border-2 tv-focusable cursor-pointer ${
                    metricsModalFocus === 1
                      ? "tv-focused bg-amber-400 text-zinc-950 border-white"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800"
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Zerar Séries de Hoje
                </button>

                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => setShowMetricsModal(false)}
                  onFocus={() => setMetricsModalFocus(0)}
                  onMouseEnter={() => setMetricsModalFocus(0)}
                  className={`px-6 py-2.5 rounded-xl font-black text-sm border-2 tv-focusable cursor-pointer ${
                    metricsModalFocus === 0
                      ? "tv-focused bg-emerald-400 text-zinc-950 border-white"
                      : "bg-zinc-800 text-zinc-200 border-zinc-700"
                  }`}
                >
                  Fechar (OK)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <div className="text-xs font-bold uppercase text-zinc-400">Treinos Completos</div>
                <div className="text-4xl font-black text-emerald-400 mt-1">
                  {metrics.totalWorkouts}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {metrics.totalSetsCompleted} séries executadas no total
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <div className="text-xs font-bold uppercase text-zinc-400">Sessões de Alongamento</div>
                <div className="text-4xl font-black text-indigo-400 mt-1">
                  {metrics.totalStretchSessions}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  RPG: {metrics.stretchPostureCount} • 15m: {metrics.stretch15mCount} • 30m: {metrics.stretch30mCount}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <div className="text-xs font-bold uppercase text-zinc-400">Tempo Ativo Acumulado</div>
                <div className="text-4xl font-black text-sky-400 mt-1">
                  {metrics.totalMinutesTrained} <span className="text-lg font-bold">min</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Soma de Calistenia + Mobilidade + RPG
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <div className="text-xs font-bold uppercase text-zinc-400">Recorde de Ciclo</div>
                <div className="text-4xl font-black text-amber-400 mt-1">
                  Ciclo {metrics.highestCycleReached}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Streak atual: {state.streakDays} {state.streakDays === 1 ? "dia" : "dias"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5 min-h-0 flex-1">
              <div className="col-span-5 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-sky-400 mb-4 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" /> Volume Total Acumulado no Corpo
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">1. Barras Supinadas / Negativas</span>
                        <span className="text-sky-300">{metrics.totalChinupReps} reps</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${Math.min(100, metrics.totalChinupReps * 2)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">2. Flexões no Chão</span>
                        <span className="text-emerald-300">{metrics.totalPushupReps} reps</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, metrics.totalPushupReps)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">3. Afundos (Total das 2 pernas)</span>
                        <span className="text-purple-300">{metrics.totalSplitSquatReps} reps</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${Math.min(100, metrics.totalSplitSquatReps * 0.6)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">4. Prancha Abdominal (Isometria)</span>
                        <span className="text-amber-300">{metrics.totalPlankSeconds} seg</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min(100, metrics.totalPlankSeconds * 0.3)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                  <span>Aquecimentos: <strong className="text-white">{metrics.totalWarmups}</strong></span>
                  <span>Ajustes manuais: <strong className="text-white">{metrics.manualCycleAdjustments}</strong></span>
                </div>
              </div>

              <div className="col-span-7 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Linha do Tempo de Atividades ({activityLog.length} registros)
                </h3>

                <div className="space-y-2.5 overflow-y-auto pr-2 max-h-56">
                  {activityLog.slice(0, 15).map((item) => {
                    const formattedDate = item.date.split("-").reverse().join("/");
                    const timeStr = new Date(item.timestamp).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={item.id}
                        className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-bold text-white">{item.title}</div>
                          <div className="text-xs text-zinc-400">{item.detail}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-sky-300 block">
                            {formattedDate}
                          </span>
                          <span className="text-[11px] text-zinc-500">{timeStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
