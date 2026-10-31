import { create } from "zustand";

/**
 * Delivery Rush — the pickup → two tolls → drop race.
 *
 * Coordinates: the truck never moves in Z (the world scrolls), so
 * everything in the game lives on a 1-D road coordinate `s` (metres
 * travelled, same unit as `drive.dist`). An object at road position
 * `s` is drawn at world z = -(s - drive.dist). X is the straight-road
 * lateral position (the curved-world bend is purely visual).
 *
 * Mutable per-frame state lives in `sim` (no React); the HUD reads a
 * small throttled snapshot from the `useGame` store.
 */

// ---------------- Tuning ----------------
export const TIME_LIMIT = 60; // seconds from loading to unloading
export const PICKUP_AHEAD = 380; // metres ahead the hub appears
export const TOLL1_AFTER_PICKUP = 230;
export const TOLL_GAP = 760; // ≈ 25–30 s of real driving with traffic and the slow-down
export const DROP_AFTER_TOLL2 = 270;
export const NEXT_PICKUP_AFTER_DROP = 380;
export const LOAD_TIME = 2.0; // seconds parked to load / unload

export const TOP_SPEED = 37; // m/s ≈ 133 km/h
export const REVERSE_TOP = 6.5; // m/s
export const FASTAG_READ_SPEED = 8.5; // m/s ≈ 30 km/h
export const FASTAG_READ_DIST = 14; // metres before the barrier

/** Truck footprint relative to the camera (straight-road space). */
export const TRUCK_HALF_W = 1.1;
export const TRUCK_FRONT = 2.7; // metres ahead of the camera
export const TRUCK_REAR = 3.8; // metres behind the camera
/** The cab is centred 0.5 m left of the camera (right-hand drive). */
export const CAB_OFFSET_X = -0.5;

// ---------------- Toll plaza layout ----------------
/** Lane centres for the cab (same as highway.ts LANE_CENTRES). */
export const LANES = [-4.0, -0.5, 3.0];
export const ISLAND_W = 0.8;
export const ISLAND_START = 11; // island begins this far before the barrier
export const ISLAND_END = 2; // and ends this far after it
/** Island centre-lines: outer edges + the two lane dividers. */
export const ISLAND_X = [-6.15, -2.25, 1.25, 4.75];
/** Free play either side of the lane centre while between islands. */
export const LANE_BAND = (3.5 - ISLAND_W) / 2 - TRUCK_HALF_W; // 0.25 m
/** How far off-centre you can enter and still be funnelled in. */
export const LANE_FUNNEL = 0.75;

// ---------------- Pickup / drop lay-by ----------------
export const BAY_W = 4.0;
export const BAY_L = 9.0;
export const BAY_X = -9.6; // cab-centre x of a perfectly parked truck
export const LAYBY_LEFT = -13.2; // left edge of the lay-by asphalt
export const LAYBY_BEFORE = 45; // lay-by opens this far before the bay centre
export const LAYBY_AFTER = 30;

export type VehicleType = "hatch" | "sedan" | "suv" | "auto" | "tempo" | "lorry";
export const VEHICLES: Record<VehicleType, { L: number; W: number; H: number; vmin: number; vmax: number }> = {
  hatch: { L: 3.7, W: 1.75, H: 1.62, vmin: 18, vmax: 24 },
  sedan: { L: 4.4, W: 1.8, H: 1.55, vmin: 20, vmax: 26 },
  suv: { L: 4.2, W: 1.9, H: 1.85, vmin: 20, vmax: 26 },
  auto: { L: 2.8, W: 1.45, H: 1.8, vmin: 11, vmax: 14 },
  tempo: { L: 4.8, W: 1.9, H: 2.55, vmin: 14, vmax: 18 },
  lorry: { L: 9.0, W: 2.5, H: 3.6, vmin: 13, vmax: 17 },
};
export const VEHICLE_TYPES = Object.keys(VEHICLES) as VehicleType[];

export interface Car {
  id: number;
  type: VehicleType;
  s: number; // centre, road coordinate
  x: number;
  laneX: number; // target lateral position
  v: number; // forward speed along its own direction
  vmax: number;
  vx: number; // lateral shove velocity after a bump
  knock: number; // seconds left of being shoved (no lane keeping)
  dir: 1 | -1; // 1 = our direction, -1 = oncoming (opposite carriageway)
  wait: number; // toll service timer
  queued: boolean;
}

export interface Barrier {
  open: number; // 0 closed … 1 fully up (animated)
  want: boolean;
  holder: "truck" | number | null; // who the barrier is serving
  closeAfterS: number; // close once the holder passes this road position
}

export interface Plaza {
  s: number; // barrier line
  fastLane: number; // index into LANES that has no queue
  barriers: Barrier[];
  paid: boolean;
  index: number; // 1 or 2
}

export interface Site {
  kind: "pickup" | "drop";
  s: number; // bay centre
}

export type JobState = "idle" | "toPickup" | "loading" | "delivering" | "unloading" | "late";

export const sim = {
  job: "idle" as JobState,
  timeLeft: TIME_LIMIT,
  load: 0, // 0..1 loading/unloading progress
  streak: 0,
  savedTotal: 0,
  cars: [] as Car[],
  plazas: [] as Plaza[],
  sites: [] as Site[],
  nextCarId: 1,
  /** Seconds of camera shake / "bump" feedback left. */
  bump: 0,
  scraping: false,
  inBay: false,
  nearBay: false,
};

export function activeSite(): Site | null {
  const want = sim.job === "toPickup" || sim.job === "loading" ? "pickup" : sim.job === "delivering" || sim.job === "unloading" ? "drop" : null;
  if (!want) return null;
  // The newest site of that kind is the live one.
  for (let i = sim.sites.length - 1; i >= 0; i--) if (sim.sites[i].kind === want) return sim.sites[i];
  return null;
}

// ---------------- HUD store ----------------
export type Toast = { id: number; text: string; tone: "good" | "warn" | "info" };

interface GameHud {
  job: JobState;
  timeLeft: number;
  distToTarget: number; // metres to the active bay, -1 none
  load: number;
  inBay: boolean;
  nearBay: boolean;
  streak: number;
  best: number;
  lastSaved: number; // seconds to spare on the last delivery
  tollsPaid: number;
  toasts: Toast[];
  delivered: number; // increments on each on-time delivery (drives the banner)
  /** Bumped whenever plazas/sites are added or removed (re-mounts props). */
  worldVersion: number;
}

let toastId = 1;

function readBest(): number {
  try {
    return Number(window.localStorage.getItem("nightrun.bestStreak") || 0) || 0;
  } catch {
    return 0;
  }
}

export const useGame = create<GameHud>(() => ({
  job: "idle",
  timeLeft: TIME_LIMIT,
  distToTarget: -1,
  load: 0,
  inBay: false,
  nearBay: false,
  streak: 0,
  best: typeof window === "undefined" ? 0 : readBest(),
  lastSaved: 0,
  tollsPaid: 0,
  toasts: [],
  delivered: 0,
  worldVersion: 0,
}));

export function bumpWorld() {
  useGame.setState((g) => ({ worldVersion: g.worldVersion + 1 }));
}

let audioCtx: AudioContext | null = null;
/** Tiny synth blip for FASTag / bumps / results — no audio files. */
export function beep(freq: number, dur = 0.1, type: OscillatorType = "sine") {
  try {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

export function toast(text: string, tone: Toast["tone"] = "info", ms = 2200) {
  const id = toastId++;
  useGame.setState((g) => ({ toasts: [...g.toasts.slice(-2), { id, text, tone }] }));
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      useGame.setState((g) => ({ toasts: g.toasts.filter((t) => t.id !== id) }));
    }, ms);
  }
}

export function saveBest(streak: number) {
  const best = Math.max(useGame.getState().best, streak);
  useGame.setState({ best });
  try {
    window.localStorage.setItem("nightrun.bestStreak", String(best));
  } catch {
    /* storage unavailable — keep it in memory */
  }
}

/** Commands from the HUD; the simulation (GameSim) reads `pending`. */
export const commands = { pending: null as null | "start" | "stop" | "retry" | "quit" };
export function sendCommand(c: "start" | "stop" | "retry" | "quit") {
  commands.pending = c;
}
