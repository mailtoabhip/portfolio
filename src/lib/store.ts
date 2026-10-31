import { create } from "zustand";

/**
 * The Night Run — global state.
 *
 * Phase machine (§9 of the master plan):
 *   name       → cold-open title card ("Abhijeet Purandare"), assets loading behind it
 *   igniting   → truck auto-start: gauges power up, headlights flash on
 *   cruising   → on the road; the tablet, phone and game are interactive
 *   reading    → the tablet (portfolio) is open over the blurred cab
 *   returning  → tablet closing (~0.6s), then cruising
 */
export type Phase = "name" | "igniting" | "cruising" | "reading" | "returning";

/**
 * Day/night mode (see day-mode brief). Independent of `phase`, but
 * toggling is guarded by it. "sunrise"/"sunset" are transitional
 * states, exactly analogous to how `phase` already uses "igniting"
 * and "returning" — the continuous progress within them lives in
 * `lib/timeOfDayState.ts`, not here (that changes every frame; this
 * only changes four times per full day/night cycle).
 */
export type TimeOfDay = "night" | "sunrise" | "day" | "sunset";



interface NightRunState {
  phase: Phase;
  timeOfDay: TimeOfDay;
  /** 0–2: quality tier for instancing counts / post-fx. 0 = lowest. */
  quality: 0 | 1 | 2;
  audioOn: boolean;
  /** The phone's contact card — independent of the tablet/phase machine. */
  phoneOpen: boolean;
  /** Cruise speed multiplier (1 = normal; transitions may modulate). */
  speed: number;

  setPhase: (phase: Phase) => void;
  /**
   * Called by the visitor (click/keyboard). The only place that
   * decides whether a toggle is currently allowed — components just
   * call this and trust it to no-op silently if guards fail.
   */
  toggleTimeOfDay: () => void;
  /** Called by SkySystem's frame loop once a transition's `t` completes. */
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  /** Tap the tablet (or the Portfolio button) → the portfolio, fullscreen. */
  openTablet: () => void;
  /** Close the tablet and return to the road. */
  closeSheet: () => void;
  setQuality: (quality: 0 | 1 | 2) => void;
  toggleAudio: () => void;
  /** Tap the phone -> its contact-card screen. No phase change, no
   * link to the tablet — the world keeps driving underneath. */
  openPhoneScreen: () => void;
  closePhoneScreen: () => void;
  setSpeed: (speed: number) => void;
}

export const useNightRun = create<NightRunState>((set, get) => ({
  phase: "name",
  timeOfDay: "night",
  quality: 2,
  audioOn: false,
  phoneOpen: false,
  speed: 1,

  setPhase: (phase) => set({ phase }),

  toggleTimeOfDay: () => {
    const { phase, timeOfDay } = get();
    // Only interactive while cruising or reading; never mid-ignition,
    // mid-return, or mid-transition (no double-triggering).
    if (phase !== "cruising" && phase !== "reading") return;
    if (timeOfDay === "night") set({ timeOfDay: "sunrise" });
    else if (timeOfDay === "day") set({ timeOfDay: "sunset" });
  },
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  // Guards: the tablet only opens while cruising; only closes while reading.
  openTablet: () => {
    if (get().phase !== "cruising") return;
    set({ phase: "reading" });
  },
  closeSheet: () => {
    if (get().phase !== "reading") return;
    set({ phase: "returning" }); // TabletOS completes it to "cruising"
  },

  setQuality: (quality) => set({ quality }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  openPhoneScreen: () => set({ phoneOpen: true }),
  closePhoneScreen: () => set({ phoneOpen: false }),
  setSpeed: (speed) => set({ speed }),
}));
