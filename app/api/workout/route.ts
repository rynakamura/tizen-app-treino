import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { INITIAL_CALIBRATED_STATE, PersistedWorkoutState } from "@/lib/workout-data";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "workout-state.json");

function getTodayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
}

function normalizeState(rawState: Partial<PersistedWorkoutState>): PersistedWorkoutState {
  const todayIso = getTodayIso();
  const merged: PersistedWorkoutState = {
    ...INITIAL_CALIBRATED_STATE,
    ...rawState,
    history: rawState.history || INITIAL_CALIBRATED_STATE.history,
    activityLog: rawState.activityLog || INITIAL_CALIBRATED_STATE.activityLog,
    metrics: {
      ...INITIAL_CALIBRATED_STATE.metrics,
      ...(rawState.metrics || {}),
    },
    today: rawState.today || {
      ...INITIAL_CALIBRATED_STATE.today,
      date: todayIso,
    },
  };

  if (merged.today.date !== todayIso) {
    merged.today = {
      date: todayIso,
      warmupDone: false,
      sets: {
        chinup: 0,
        pushup: 0,
        splitsquat: 0,
        plank: 0,
      },
      completedToday: false,
    };
  }

  return merged;
}

async function ensureState(): Promise<PersistedWorkoutState> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeState(parsed);
    await fs.writeFile(STATE_FILE, JSON.stringify(normalized, null, 2), "utf-8");
    return normalized;
  } catch {
    const initial = normalizeState(INITIAL_CALIBRATED_STATE);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

export async function GET() {
  const state = await ensureState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = await ensureState();

    if (body.action === "reset_today") {
      state.today = {
        date: getTodayIso(),
        warmupDone: false,
        sets: {
          chinup: 0,
          pushup: 0,
          splitsquat: 0,
          plank: 0,
        },
        completedToday: false,
      };
      await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
      return NextResponse.json(state);
    }

    if (body.action === "reset_calibration") {
      const calibrated = normalizeState(INITIAL_CALIBRATED_STATE);
      await fs.writeFile(STATE_FILE, JSON.stringify(calibrated, null, 2), "utf-8");
      return NextResponse.json(calibrated);
    }

    if (body.state) {
      const updated = normalizeState(body.state);
      await fs.writeFile(STATE_FILE, JSON.stringify(updated, null, 2), "utf-8");
      return NextResponse.json(updated);
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to save workout state:", error);
    return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
  }
}
