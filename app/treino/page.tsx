"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Timer,
  SkipForward,
  Plus,
  Sparkles,
  Trophy,
  Pause,
  Play,
  Info,
  FastForward,
} from "lucide-react";
import {
  ActivityEventLog,
  EXERCISES,
  ExerciseConfig,
  getCycleData,
  INITIAL_CALIBRATED_STATE,
  PersistedWorkoutState,
  WARMUP_ITEMS,
} from "@/lib/workout-data";
import { soundFX } from "@/lib/sound";

export interface GuidedStep {
  index: number;
  kind: "warmup" | "exercise" | "rest";
  round?: 1 | 2;
  exerciseIndex?: number;
  exercise?: ExerciseConfig;
  title: string;
  subtitle: string;
  defaultSeconds: number;
  nextStepPreview: string;
}

function buildWorkoutTimeline(cycleNumber: number): GuidedStep[] {
  const cycleData = getCycleData(cycleNumber);
  const steps: GuidedStep[] = [];

  steps.push({
    index: 0,
    kind: "warmup",
    title: "Aquecimento Pré-Treino",
    subtitle: "Mobilidade articular antes de iniciar o circuito",
    defaultSeconds: 120,
    nextStepPreview: "1ª Volta • 1. Barra Supinada",
  });

  for (const round of [1, 2] as const) {
    EXERCISES.forEach((ex, exIdx) => {
      const isLastExerciseOfWorkout = round === 2 && exIdx === EXERCISES.length - 1;

      let execSeconds = 45;
      if (ex.id === "plank" && !cycleData.targets.plank.isReps) {
        execSeconds = cycleData.targets.plank.seconds || 35;
      } else if (ex.id === "splitsquat") {
        execSeconds = 50;
      }

      const nextEx =
        exIdx < EXERCISES.length - 1
          ? EXERCISES[exIdx + 1]
          : round === 1
          ? EXERCISES[0]
          : null;

      steps.push({
        index: steps.length,
        kind: "exercise",
        round,
        exerciseIndex: exIdx,
        exercise: ex,
        title: ex.name,
        subtitle: `Volta ${round} de 2 • ${ex.category}`,
        defaultSeconds: execSeconds,
        nextStepPreview: isLastExerciseOfWorkout
          ? "Conclusão do Treino!"
          : `Descanso (45s) → ${nextEx?.name}`,
      });

      if (!isLastExerciseOfWorkout) {
        const nextRound = exIdx < EXERCISES.length - 1 ? round : 2;
        steps.push({
          index: steps.length,
          kind: "rest",
          round,
          exerciseIndex: exIdx,
          exercise: ex,
          title: "Descanso & Recuperação",
          subtitle: `Respire fundo • Prepare-se para o próximo exercício`,
          defaultSeconds: 45,
          nextStepPreview: `Volta ${nextRound}/2 • ${nextEx?.name}`,
        });
      }
    });
  }

  return steps;
}

export default function GuidedWorkoutPage() {
  const router = useRouter();
  const [state, setState] = useState<PersistedWorkoutState>(INITIAL_CALIBRATED_STATE);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [totalStepSeconds, setTotalStepSeconds] = useState<number>(120);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Foco dos botões inferiores: 0 = Avançar/Concluir, 1 = +15s, 2 = Pausar, 3 = Sair Hub
  const [focusedBtn, setFocusedBtn] = useState<number>(0);

  const btn0Ref = useRef<HTMLButtonElement>(null);
  const btn1Ref = useRef<HTMLButtonElement>(null);
  const btn2Ref = useRef<HTMLButtonElement>(null);
  const btn3Ref = useRef<HTMLButtonElement>(null);
  const completionBtnRef = useRef<HTMLButtonElement>(null);

  const [completionModal, setCompletionModal] = useState<{
    open: boolean;
    leveledUp: boolean;
    newCycle: number;
    newSessionInCycle: number;
  }>({
    open: false,
    leveledUp: false,
    newCycle: 1,
    newSessionInCycle: 1,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const timeline = buildWorkoutTimeline(state.currentCycle);
  const currentStep = timeline[Math.min(stepIdx, timeline.length - 1)];

  // Auto-foco imediato no botão principal (OK) para a TV não perder o foco
  useEffect(() => {
    const timer = setTimeout(() => {
      btn0Ref.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (completionModal.open) {
      completionBtnRef.current?.focus();
      return;
    }
    const refs = [btn0Ref, btn1Ref, btn2Ref, btn3Ref];
    refs[focusedBtn]?.current?.focus();
  }, [focusedBtn, completionModal.open]);

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
      });
  }, []);

  const finishEntireWorkout = useCallback(() => {
    const current = stateRef.current;
    soundFX.playSuccess();

    const cycleData = getCycleData(current.currentCycle);
    let nextCycle = current.currentCycle;
    let nextSessionsInCycle = current.sessionsInCycle;
    let nextStreak = current.streakDays;
    let nextLastDate = current.lastWorkoutDate;
    const nextHistory = [...current.history];
    const nextActivityLog: ActivityEventLog[] = [...(current.activityLog || [])];
    const nextMetrics = { ...current.metrics };
    let leveledUp = false;

    const todayIso = current.today.date;
    const nowIso = new Date().toISOString();

    if (!current.today.completedToday) {
      const incrementedSession = current.sessionsInCycle + 1;

      if (incrementedSession >= 6) {
        leveledUp = true;
        nextCycle = current.currentCycle + 1;
        nextSessionsInCycle = 0;
        nextMetrics.highestCycleReached = Math.max(
          nextMetrics.highestCycleReached,
          nextCycle
        );

        nextActivityLog.unshift({
          id: `act-lvl-${Date.now() + 1}`,
          type: "cycle_level_up",
          title: `Level Up Automático → Ciclo ${nextCycle}!`,
          detail: `6 de 6 sessões concluídas no ${cycleData.label}. Avançou para ${getCycleData(nextCycle).label}.`,
          date: todayIso,
          timestamp: nowIso,
          cycle: nextCycle,
        });
      } else {
        nextSessionsInCycle = incrementedSession;
      }

      if (current.lastWorkoutDate !== todayIso) {
        nextStreak = current.streakDays + 1;
        nextLastDate = todayIso;
      }

      nextHistory.push({
        id: `workout-${Date.now()}`,
        date: todayIso,
        timestamp: nowIso,
        cycle: current.currentCycle,
        sessionInCycle: incrementedSession,
        leveledUp,
      });

      nextMetrics.totalWorkouts += 1;
      nextMetrics.totalMinutesTrained += 14;

      nextActivityLog.unshift({
        id: `act-wk-${Date.now()}`,
        type: "workout_completed",
        title: `Treino Diário Concluído (${cycleData.label})`,
        detail: `Sessão ${incrementedSession} de 6 • 2 voltas completas no circuito`,
        date: todayIso,
        timestamp: nowIso,
        cycle: current.currentCycle,
        durationMinutes: 14,
      });
    }

    const nextState: PersistedWorkoutState = {
      ...current,
      currentCycle: nextCycle,
      sessionsInCycle: nextSessionsInCycle,
      streakDays: nextStreak,
      lastWorkoutDate: nextLastDate,
      history: nextHistory,
      activityLog: nextActivityLog.slice(0, 120),
      metrics: nextMetrics,
      today: {
        ...current.today,
        warmupDone: true,
        sets: {
          chinup: 2,
          pushup: 2,
          splitsquat: 2,
          plank: 2,
        },
        completedToday: true,
      },
    };

    saveStateToServer(nextState);

    setCompletionModal({
      open: true,
      leveledUp,
      newCycle: nextCycle,
      newSessionInCycle: nextSessionsInCycle,
    });
  }, [saveStateToServer]);

  const advanceToNextStep = useCallback(() => {
    const current = stateRef.current;
    const activeTimeline = buildWorkoutTimeline(current.currentCycle);
    const step = activeTimeline[stepIdx];
    const cycleData = getCycleData(current.currentCycle);
    const todayIso = current.today.date;
    const nowIso = new Date().toISOString();

    if (step) {
      const nextMetrics = { ...current.metrics };
      const nextActivityLog = [...(current.activityLog || [])];

      if (step.kind === "warmup") {
        if (!current.today.warmupDone) {
          nextMetrics.totalWarmups += 1;
          nextMetrics.totalMinutesTrained += 2;
          nextActivityLog.unshift({
            id: `act-warm-${Date.now()}`,
            type: "warmup_completed",
            title: "Aquecimento Pré-Treino Concluído",
            detail: "10 Giros de Ombro • 5 Gato-Vaca • 15s Dead Hang",
            date: todayIso,
            timestamp: nowIso,
            cycle: current.currentCycle,
            durationMinutes: 2,
          });
        }
        saveStateToServer({
          ...current,
          metrics: nextMetrics,
          activityLog: nextActivityLog.slice(0, 120),
          today: {
            ...current.today,
            warmupDone: true,
          },
        });
      } else if (step.kind === "exercise" && step.exercise && step.round) {
        const exId = step.exercise.id;
        const alreadyDoneRound = current.today.sets[exId] >= step.round;
        const updatedSets = {
          ...current.today.sets,
          [exId]: Math.max(current.today.sets[exId], step.round),
        };

        if (!alreadyDoneRound) {
          nextMetrics.totalSetsCompleted += 1;
          if (exId === "chinup") {
            nextMetrics.totalChinupReps += cycleData.targets.chinup.repsCount;
          } else if (exId === "pushup") {
            nextMetrics.totalPushupReps += cycleData.targets.pushup.repsCount;
          } else if (exId === "splitsquat") {
            nextMetrics.totalSplitSquatReps += cycleData.targets.splitsquat.repsCount * 2;
          } else if (exId === "plank") {
            nextMetrics.totalPlankSeconds += cycleData.targets.plank.seconds || 45;
          }

          nextActivityLog.unshift({
            id: `act-set-${Date.now()}`,
            type: "set_completed",
            title: `${step.exercise.name} — Série ${step.round}/2`,
            detail: `Meta: ${cycleData.targets[exId].text} (${cycleData.label})`,
            date: todayIso,
            timestamp: nowIso,
            cycle: current.currentCycle,
          });
        }

        saveStateToServer({
          ...current,
          metrics: nextMetrics,
          activityLog: nextActivityLog.slice(0, 120),
          today: {
            ...current.today,
            sets: updatedSets,
          },
        });
      }
    }

    if (stepIdx + 1 >= activeTimeline.length) {
      finishEntireWorkout();
      return;
    }

    soundFX.playTimerEnd();
    const nextIdx = stepIdx + 1;
    const nextStepObj = activeTimeline[nextIdx];
    setStepIdx(nextIdx);
    setSecondsLeft(nextStepObj.defaultSeconds);
    setTotalStepSeconds(nextStepObj.defaultSeconds);
    setIsPaused(false);
    setFocusedBtn(0);
  }, [stepIdx, saveStateToServer, finishEntireWorkout]);

  useEffect(() => {
    if (completionModal.open || isPaused) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 4 && prev > 1) {
          soundFX.playTick(640, 0.05);
        }
        if (prev <= 1) {
          setTimeout(() => {
            advanceToNextStep();
          }, 40);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [completionModal.open, isPaused, advanceToNextStep]);

  const handleAdd15Seconds = useCallback(() => {
    soundFX.playTick(740);
    setSecondsLeft((prev) => prev + 15);
    setTotalStepSeconds((prev) => Math.max(prev, secondsLeft + 15));
  }, [secondsLeft]);

  const handleTogglePause = useCallback(() => {
    soundFX.playTick(520);
    setIsPaused((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      const key = e.key;

      const isLeft = key === "ArrowLeft" || code === 37;
      const isUp = key === "ArrowUp" || code === 38;
      const isRight = key === "ArrowRight" || code === 39;
      const isDown = key === "ArrowDown" || code === 40;
      const isEnter = key === "Enter" || key === " " || code === 13;
      const isBack = key === "Escape" || key === "Backspace" || code === 10009 || code === 27;

      if (completionModal.open) {
        if (isEnter || isBack) {
          e.preventDefault();
          soundFX.playTick(600);
          router.push("/");
        }
        return;
      }

      if (isRight || isDown) {
        e.preventDefault();
        soundFX.playTick(500);
        setFocusedBtn((prev) => (prev + 1) % 4);
      } else if (isLeft || isUp) {
        e.preventDefault();
        soundFX.playTick(500);
        setFocusedBtn((prev) => (prev - 1 + 4) % 4);
      } else if (isEnter) {
        e.preventDefault();
        if (focusedBtn === 0) {
          advanceToNextStep();
        } else if (focusedBtn === 1) {
          handleAdd15Seconds();
        } else if (focusedBtn === 2) {
          handleTogglePause();
        } else if (focusedBtn === 3) {
          router.push("/");
        }
      } else if (isBack) {
        e.preventDefault();
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedBtn,
    completionModal.open,
    advanceToNextStep,
    handleAdd15Seconds,
    handleTogglePause,
    router,
  ]);

  const cycleData = getCycleData(state.currentCycle);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return `${s}s`;
  };

  const progressPct = Math.max(
    0,
    Math.min(100, ((totalStepSeconds - secondsLeft) / Math.max(1, totalStepSeconds)) * 100)
  );

  const themeColors =
    currentStep.kind === "warmup"
      ? {
          border: "border-amber-400",
          badge: "bg-amber-400 text-zinc-950",
          accentText: "text-amber-300",
          bar: "bg-amber-400",
        }
      : currentStep.kind === "rest"
      ? {
          border: "border-emerald-400",
          badge: "bg-emerald-400 text-zinc-950",
          accentText: "text-emerald-300",
          bar: "bg-emerald-400",
        }
      : {
          border: "border-sky-400",
          badge: "bg-sky-400 text-zinc-950",
          accentText: "text-sky-300",
          bar: "bg-sky-400",
        };

  return (
    <main className="w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between px-8 py-6 lg:px-12 lg:py-8 overflow-hidden select-none relative">
      <header className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-3.5">
        <div className="flex items-center gap-4">
          <button
            ref={btn3Ref}
            tabIndex={0}
            type="button"
            onClick={() => router.push("/")}
            onFocus={() => setFocusedBtn(3)}
            onMouseEnter={() => setFocusedBtn(3)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm tv-focusable cursor-pointer ${
              focusedBtn === 3
                ? "tv-focused bg-zinc-800 border-sky-400 text-white"
                : "bg-zinc-950 border-zinc-800 text-zinc-300"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Sair p/ Hub
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black text-white">{cycleData.label}</span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Piloto Automático • Passo {stepIdx + 1} de {timeline.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {timeline.map((s) => {
            const isDone = s.index < stepIdx;
            const isCurrent = s.index === stepIdx;
            return (
              <div
                key={s.index}
                className={`h-3 rounded-full ${
                  isCurrent
                    ? "w-10 bg-sky-400"
                    : isDone
                    ? "w-4 bg-emerald-400"
                    : s.kind === "rest"
                    ? "w-2 bg-zinc-800"
                    : "w-4 bg-zinc-700"
                }`}
                title={s.title}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl">
            <span className="text-xs font-bold text-zinc-400 mr-1.5">Ciclo:</span>
            {[1, 2, 3, 4, 5, 6].map((dot) => {
              const filled = dot <= state.sessionsInCycle;
              return (
                <span
                  key={dot}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    filled
                      ? "bg-emerald-400 text-zinc-950"
                      : "bg-zinc-900 text-zinc-600 border border-zinc-700"
                  }`}
                >
                  {filled ? "●" : "○"}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            <span className="text-base font-black text-amber-300">
              {state.streakDays}d
            </span>
          </div>
        </div>
      </header>

      <section
        className={`flex-1 my-5 rounded-3xl border-2 ${themeColors.border} bg-zinc-900 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-widest ${themeColors.badge}`}
            >
              {currentStep.kind === "warmup"
                ? "PASSO INICIAL • AQUECIMENTO"
                : currentStep.kind === "rest"
                ? `DESCANSO AUTOMÁTICO • VOLTA ${currentStep.round}/2`
                : `VOLTA ${currentStep.round} DE 2 • EXERCÍCIO ${(currentStep.exerciseIndex ?? 0) + 1}/4`}
            </span>

            {currentStep.kind === "exercise" && (
              <span className="text-sm font-bold text-zinc-400">
                {currentStep.exercise?.subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-zinc-950/90 border border-zinc-800 px-4 py-2 rounded-xl text-xs lg:text-sm">
            <FastForward className="w-4 h-4 text-sky-400" />
            <span className="text-zinc-400">A seguir:</span>
            <strong className="text-zinc-100">{currentStep.nextStepPreview}</strong>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 items-center my-auto py-2">
          <div className="col-span-7 flex flex-col justify-center space-y-5">
            <div>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                {currentStep.title}
              </h1>
              <p className="text-lg text-zinc-300 font-medium mt-1">
                {currentStep.subtitle}
              </p>
            </div>

            {currentStep.kind === "warmup" && (
              <div className="grid grid-cols-3 gap-4 pt-2">
                {WARMUP_ITEMS.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-zinc-950/85 border border-amber-400/30 rounded-2xl p-4"
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Etapa {idx + 1}
                    </span>
                    <div className="text-xl font-black text-white mt-1">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentStep.kind === "exercise" && currentStep.exercise && (
              <div className="space-y-4">
                <div className="bg-zinc-950/90 border-2 border-sky-400/40 rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-sky-400">
                      META DE REPETIÇÕES / TEMPO ({cycleData.label})
                    </div>
                    <div className="text-4xl lg:text-5xl font-black text-sky-300 mt-1">
                      {cycleData.targets[currentStep.exercise.id].text}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3.5 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 font-bold text-sm">
                      Série {currentStep.round} de 2
                    </span>
                    {cycleData.targets[currentStep.exercise.id].detail && (
                      <div className="text-xs text-zinc-400 mt-1.5 font-semibold">
                        {cycleData.targets[currentStep.exercise.id].detail}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                      Dica Técnica de Execução
                    </div>
                    <div className="text-base lg:text-lg font-bold text-zinc-100">
                      {currentStep.exercise.tip}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep.kind === "rest" && (
              <div className="bg-zinc-950/85 border border-emerald-400/30 rounded-2xl p-6 space-y-2">
                <div className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  PREPARE-SE PARA O PRÓXIMO EXERCÍCIO
                </div>
                <div className="text-3xl font-black text-white">
                  {currentStep.nextStepPreview}
                </div>
                <p className="text-sm text-zinc-400">
                  O cronômetro avançará sozinho quando chegar a 0s. Você também pode apertar{" "}
                  <strong className="text-zinc-200">OK</strong> se já estiver pronto.
                </p>
              </div>
            )}
          </div>

          <div className="col-span-5 bg-zinc-950/90 border border-zinc-800/90 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
              <Timer className={`w-4 h-4 ${themeColors.accentText}`} />
              {isPaused ? "CRONÔMETRO PAUSADO" : "AVANÇO AUTOMÁTICO EM"}
            </div>

            <div
              className={`text-[108px] lg:text-[124px] leading-none font-black tabular-nums tracking-tighter ${
                secondsLeft <= 5 ? "text-amber-300" : "text-white"
              }`}
            >
              {formatTimer(secondsLeft)}
            </div>

            <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden my-6 border border-zinc-800">
              <div
                className={`h-full transition-all duration-1000 ${themeColors.bar}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="text-xs text-zinc-400 font-medium">
              {currentStep.kind === "exercise" && currentStep.exercise?.id !== "plank"
                ? "Terminou as repetições antes do tempo? Aperte OK para ir direto ao descanso."
                : "Relaxe os olhos na tela: o próximo passo inicia sozinho ao zerar."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 pt-2 border-t border-zinc-800/80">
          <button
            ref={btn0Ref}
            tabIndex={0}
            type="button"
            onClick={advanceToNextStep}
            onFocus={() => setFocusedBtn(0)}
            onMouseEnter={() => setFocusedBtn(0)}
            className={`col-span-7 py-4 px-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 border-2 tv-focusable cursor-pointer ${
              focusedBtn === 0
                ? "tv-focused bg-sky-400 text-zinc-950 border-white"
                : "bg-zinc-900 text-zinc-100 border-zinc-700"
            }`}
          >
            <SkipForward className="w-6 h-6 stroke-[2.5]" />
            {currentStep.kind === "warmup"
              ? "Concluir Aquecimento Agora (OK)"
              : currentStep.kind === "rest"
              ? "Pular Descanso e Ir p/ Exercício (OK)"
              : "Série Concluída • Ir p/ Descanso (OK)"}
          </button>

          <button
            ref={btn1Ref}
            tabIndex={0}
            type="button"
            onClick={handleAdd15Seconds}
            onFocus={() => setFocusedBtn(1)}
            onMouseEnter={() => setFocusedBtn(1)}
            className={`col-span-2 py-4 px-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 border-2 tv-focusable cursor-pointer ${
              focusedBtn === 1
                ? "tv-focused bg-amber-400 text-zinc-950 border-white"
                : "bg-zinc-900 text-zinc-200 border-zinc-800"
            }`}
          >
            <Plus className="w-5 h-5" />
            +15s
          </button>

          <button
            ref={btn2Ref}
            tabIndex={0}
            type="button"
            onClick={handleTogglePause}
            onFocus={() => setFocusedBtn(2)}
            onMouseEnter={() => setFocusedBtn(2)}
            className={`col-span-3 py-4 px-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 border-2 tv-focusable cursor-pointer ${
              focusedBtn === 2
                ? "tv-focused bg-zinc-200 text-zinc-950 border-white"
                : "bg-zinc-900 text-zinc-200 border-zinc-800"
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-5 h-5 fill-current" /> Retomar
              </>
            ) : (
              <>
                <Pause className="w-5 h-5" /> Pausar
              </>
            )}
          </button>
        </div>
      </section>

      <footer className="grid grid-cols-9 gap-2.5">
        <div
          className={`rounded-xl px-3 py-2 border text-center ${
            stepIdx === 0
              ? "bg-amber-400/20 border-amber-400 text-amber-200 font-black"
              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider opacity-80">Pré-Treino</div>
          <div className="text-xs truncate">Aquecimento ✓</div>
        </div>

        {[1, 2].map((roundNum) =>
          EXERCISES.map((ex, idx) => {
            const stepForThis = timeline.find(
              (s) => s.kind === "exercise" && s.round === roundNum && s.exerciseIndex === idx
            );
            const restForThis = timeline.find(
              (s) => s.kind === "rest" && s.round === roundNum && s.exerciseIndex === idx
            );

            const isCurrentEx = stepForThis?.index === stepIdx;
            const isCurrentRest = restForThis?.index === stepIdx;
            const isDone =
              stepForThis &&
              stepIdx > stepForThis.index &&
              !isCurrentRest;

            return (
              <div
                key={`${roundNum}-${ex.id}`}
                className={`rounded-xl px-3 py-2 border text-center ${
                  isCurrentEx
                    ? "bg-sky-400 text-zinc-950 border-white font-black"
                    : isCurrentRest
                    ? "bg-emerald-400 text-zinc-950 border-white font-black"
                    : isDone
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-500"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-85">
                  Volta {roundNum}/2
                </div>
                <div className="text-xs truncate">
                  {isCurrentRest ? "Descanso 45s" : ex.name}
                </div>
              </div>
            );
          })
        )}
      </footer>

      {completionModal.open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-zinc-900 border-4 border-emerald-400 rounded-3xl p-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-400 text-zinc-950 flex items-center justify-center mb-5">
              {completionModal.leveledUp ? (
                <Trophy className="w-11 h-11 stroke-[2.5]" />
              ) : (
                <Sparkles className="w-11 h-11 stroke-[2.5]" />
              )}
            </div>

            {completionModal.leveledUp ? (
              <>
                <span className="px-4 py-1 rounded-full bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-widest">
                  6/6 Sessões Completas • LEVEL UP!
                </span>
                <h2 className="text-4xl font-black text-white mt-3">
                  Você avançou para o {getCycleData(completionModal.newCycle).label}!
                </h2>
                <p className="text-base text-zinc-300 mt-3 max-w-lg">
                  Você completou as 6 sessões deste ciclo! As bolinhas foram resetadas para{" "}
                  <strong className="text-emerald-300">0/6</strong> no novo nível para o treino de amanhã.
                </p>
              </>
            ) : (
              <>
                <span className="px-4 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black text-xs uppercase tracking-widest">
                  Circuito Completo • 2 Voltas Finalizadas
                </span>
                <h2 className="text-4xl font-black text-white mt-3">
                  Sessão {completionModal.newSessionInCycle} de 6 Concluída!
                </h2>
                <p className="text-base text-zinc-300 mt-3 max-w-lg">
                  Mais uma bolinha preenchida no{" "}
                  <strong className="text-emerald-300">{getCycleData(completionModal.newCycle).label}</strong> e métricas salvas!
                </p>
              </>
            )}

            <div className="flex items-center gap-3 my-8 bg-zinc-950 px-6 py-4 rounded-2xl border border-zinc-800">
              {[1, 2, 3, 4, 5, 6].map((dot) => {
                const filled = dot <= completionModal.newSessionInCycle;
                return (
                  <div
                    key={dot}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black ${
                      filled
                        ? "bg-emerald-400 text-zinc-950 font-black"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {filled ? "●" : "○"}
                  </div>
                );
              })}
            </div>

            <button
              ref={completionBtnRef}
              tabIndex={0}
              type="button"
              onClick={() => router.push("/")}
              className="w-full py-4 rounded-2xl bg-emerald-400 text-zinc-950 font-black text-lg tv-focused cursor-pointer"
            >
              Voltar para o Hub (OK)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
