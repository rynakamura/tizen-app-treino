export interface ExerciseConfig {
  id: "chinup" | "pushup" | "splitsquat" | "plank";
  category: string;
  name: string;
  subtitle: string;
  tip: string;
  isTimed: boolean;
}

export interface CycleTarget {
  cycle: number;
  label: string;
  isLevelUp?: boolean;
  isMastery?: boolean;
  targets: {
    chinup: { text: string; repsCount: number; detail?: string };
    pushup: { text: string; repsCount: number; detail?: string };
    splitsquat: { text: string; repsCount: number; detail?: string };
    plank: { text: string; seconds?: number; repsCount?: number; isReps?: boolean; detail?: string };
  };
}

export const EXERCISES: ExerciseConfig[] = [
  {
    id: "chinup",
    category: "1. Puxar",
    name: "Barra Supinada",
    subtitle: "Chin-up",
    tip: "Pegada supinada (palma p/ você). Trave 1s no topo e desça em 3s nas negativas.",
    isTimed: false,
  },
  {
    id: "pushup",
    category: "2. Empurrar",
    name: "Flexão no Chão",
    subtitle: "Push-up",
    tip: "Cotovelos em seta (45°), corpo reto, descida controlada.",
    isTimed: false,
  },
  {
    id: "splitsquat",
    category: "3. Pernas",
    name: "Afundo Fixo",
    subtitle: "Split Squat (por perna)",
    tip: "Peso no calcanhar da frente, tronco levemente inclinado, joelho alinhado com a ponta do pé.",
    isTimed: false,
  },
  {
    id: "plank",
    category: "4. Core",
    name: "Prancha Abdominal",
    subtitle: "Plank",
    tip: "Contrair abdômen e glúteo. Não deixar a lombar afundar.",
    isTimed: true,
  },
];

export const WARMUP_ITEMS = [
  { id: "shoulders", title: "10 Giros de Ombro", desc: "Mobilidade escapular suave para trás e para frente" },
  { id: "catcow", title: "5 Reps Gato-Vaca", desc: "Mobilidade de coluna torácica e lombar no chão" },
  { id: "deadhang", title: "15s Dead Hang", desc: "Pendurado passivo/ativo na barra para descomprimir ombros" },
];

export const CYCLES_DATASET: CycleTarget[] = [
  {
    cycle: 1,
    label: "Ciclo 1",
    targets: {
      chinup: { text: "1 Completa + 2 Negativas (3s)", repsCount: 3, detail: "Total: 3 reps" },
      pushup: { text: "6 reps", repsCount: 6, detail: "2 séries" },
      splitsquat: { text: "8 reps", repsCount: 8, detail: "Por perna • 2 séries" },
      plank: { text: "35 seg", seconds: 35, detail: "Isometria • 2 séries" },
    },
  },
  {
    cycle: 2,
    label: "Ciclo 2",
    targets: {
      chinup: { text: "2 Completas + 2 Negativas (3s)", repsCount: 4, detail: "Total: 4 reps" },
      pushup: { text: "7 reps", repsCount: 7, detail: "2 séries" },
      splitsquat: { text: "9 reps", repsCount: 9, detail: "Por perna • 2 séries" },
      plank: { text: "40 seg", seconds: 40, detail: "Isometria • 2 séries" },
    },
  },
  {
    cycle: 3,
    label: "Ciclo 3",
    targets: {
      chinup: { text: "3 Completas + 1 Negativa (3s)", repsCount: 4, detail: "Total: 4 reps" },
      pushup: { text: "8 reps", repsCount: 8, detail: "2 séries" },
      splitsquat: { text: "10 reps", repsCount: 10, detail: "Por perna • 2 séries" },
      plank: { text: "45 seg", seconds: 45, detail: "Isometria • 2 séries" },
    },
  },
  {
    cycle: 4,
    label: "Ciclo 4",
    targets: {
      chinup: { text: "4 Completas", repsCount: 4, detail: "Total: 4 reps" },
      pushup: { text: "9 reps", repsCount: 9, detail: "2 séries" },
      splitsquat: { text: "11 reps", repsCount: 11, detail: "Por perna • 2 séries" },
      plank: { text: "50 seg", seconds: 50, detail: "Isometria • 2 séries" },
    },
  },
  {
    cycle: 5,
    label: "Ciclo 5",
    targets: {
      chinup: { text: "5 Completas", repsCount: 5, detail: "Total: 5 reps" },
      pushup: { text: "10 reps", repsCount: 10, detail: "2 séries" },
      splitsquat: { text: "12 reps", repsCount: 12, detail: "Por perna • 2 séries" },
      plank: { text: "60 seg", seconds: 60, detail: "Isometria • 2 séries" },
    },
  },
  {
    cycle: 6,
    label: "Ciclo 6 (Level Up)",
    isLevelUp: true,
    targets: {
      chinup: { text: "6 Completas (ou Barra Pronada)", repsCount: 6, detail: "Domínio de Puxada" },
      pushup: { text: "12 reps (ou Flexão Diamante)", repsCount: 12, detail: "Domínio de Empurrar" },
      splitsquat: { text: "8 reps (Agach. Búlgaro)", repsCount: 8, detail: "Com pé de trás elevado" },
      plank: { text: "8 reps (Elev. de Joelhos)", seconds: 45, repsCount: 8, isReps: true, detail: "Elevação de Joelhos na Barra" },
    },
  },
];

// Suporte dinâmico para além do Ciclo 6 (Ciclo 7+ = Modo Maestria Calistênica com progressão contínua)
export function getCycleData(cycleNumber: number): CycleTarget {
  if (cycleNumber <= 1) return CYCLES_DATASET[0];
  if (cycleNumber <= CYCLES_DATASET.length) {
    return CYCLES_DATASET[cycleNumber - 1];
  }

  // Acima do Ciclo 6: cada novo ciclo adiciona +1 rep nas variações avançadas e +5s de controle
  const extraLevels = cycleNumber - 6;
  const chinReps = 6 + extraLevels;
  const pushReps = 12 + extraLevels * 2;
  const bulgarianReps = 8 + extraLevels;
  const kneeRaisesReps = 8 + extraLevels;

  return {
    cycle: cycleNumber,
    label: `Ciclo ${cycleNumber} (Maestria +${extraLevels})`,
    isLevelUp: true,
    isMastery: true,
    targets: {
      chinup: {
        text: `${chinReps} Barras Pronadas / Supinadas`,
        repsCount: chinReps,
        detail: `Nível Maestria +${extraLevels}`,
      },
      pushup: {
        text: `${pushReps} reps (ou ${8 + extraLevels} Diamante)`,
        repsCount: pushReps,
        detail: `Nível Maestria +${extraLevels}`,
      },
      splitsquat: {
        text: `${bulgarianReps} reps (Agach. Búlgaro)`,
        repsCount: bulgarianReps,
        detail: "Por perna • Pé elevado",
      },
      plank: {
        text: `${kneeRaisesReps} reps (Elev. Joelhos) ou ${60 + extraLevels * 10}s`,
        seconds: 60 + extraLevels * 10,
        repsCount: kneeRaisesReps,
        isReps: true,
        detail: "Core Avançado na Barra",
      },
    },
  };
}

export type ActivityEventType =
  | "workout_completed"
  | "set_completed"
  | "warmup_completed"
  | "stretch_posture"
  | "stretch_15m"
  | "stretch_30m"
  | "cycle_manual_change"
  | "cycle_level_up";

export interface ActivityEventLog {
  id: string;
  type: ActivityEventType;
  title: string;
  detail: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  cycle: number;
  durationMinutes?: number;
}

export interface LifetimeMetrics {
  totalWorkouts: number;
  totalSetsCompleted: number;
  totalWarmups: number;
  totalStretchSessions: number;
  stretchPostureCount: number;
  stretch15mCount: number;
  stretch30mCount: number;
  totalMinutesTrained: number;
  totalChinupReps: number;
  totalPushupReps: number;
  totalSplitSquatReps: number;
  totalPlankSeconds: number;
  manualCycleAdjustments: number;
  highestCycleReached: number;
}

export interface WorkoutSessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  cycle: number;
  sessionInCycle: number; // 1 to 6
  leveledUp?: boolean;
}

export interface TodaySetsState {
  date: string; // YYYY-MM-DD
  warmupDone: boolean;
  sets: {
    chinup: number; // 0, 1, 2
    pushup: number;
    splitsquat: number;
    plank: number;
  };
  completedToday: boolean;
}

export interface PersistedWorkoutState {
  currentCycle: number; // starts at 1
  sessionsInCycle: number; // starts at 1 (1 of 6 completed on 06/11/2026)
  streakDays: number; // starts at 1
  lastWorkoutDate: string; // "2026-11-06"
  history: WorkoutSessionLog[];
  activityLog: ActivityEventLog[];
  metrics: LifetimeMetrics;
  today: TodaySetsState;
}

export const INITIAL_CALIBRATED_STATE: PersistedWorkoutState = {
  currentCycle: 1,
  sessionsInCycle: 1,
  streakDays: 1,
  lastWorkoutDate: "2026-11-06",
  history: [
    {
      id: "calib-2026-11-06",
      date: "2026-11-06",
      timestamp: "2026-11-06T08:00:00.000Z",
      cycle: 1,
      sessionInCycle: 1,
    },
  ],
  activityLog: [
    {
      id: "act-calib-2026-11-06",
      type: "workout_completed",
      title: "1º Treino Concluído (Calibração)",
      detail: "Ciclo 1 • Sessão 1 de 6 concluída (Barra, Flexão, Afundo e Prancha)",
      date: "2026-11-06",
      timestamp: "2026-11-06T08:00:00.000Z",
      cycle: 1,
      durationMinutes: 15,
    },
  ],
  metrics: {
    totalWorkouts: 1,
    totalSetsCompleted: 8,
    totalWarmups: 1,
    totalStretchSessions: 0,
    stretchPostureCount: 0,
    stretch15mCount: 0,
    stretch30mCount: 0,
    totalMinutesTrained: 15,
    totalChinupReps: 6, // 2 séries de 3
    totalPushupReps: 12, // 2 séries de 6
    totalSplitSquatReps: 32, // 2 séries de 8 por perna
    totalPlankSeconds: 70, // 2 séries de 35s
    manualCycleAdjustments: 0,
    highestCycleReached: 1,
  },
  today: {
    date: "2026-11-06",
    warmupDone: false,
    sets: {
      chinup: 0,
      pushup: 0,
      splitsquat: 0,
      plank: 0,
    },
    completedToday: false,
  },
};
