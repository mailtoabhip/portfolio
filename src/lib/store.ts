import { create } from "zustand";

/**
 * The Night Run — global state.
 *
 * Phase machine (§9 of the master plan):
 *   name       → cold-open title card ("Abhijeet Purandare"), assets loading behind it
 *   igniting   → truck auto-start: gauges power up, headlights flash on
 *   cruising   → on the forest road; dashboard sheets are interactive
 *   reading    → a sheet is open; read-mode content over the blurred cab
 *   returning  → sheet dropping back onto the dash (~0.6s), then cruising
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

/** Destination slugs = the paper sheets on the dash. */
export type Destination =
  | "manifest" // resume
  | "tvs-accelerator"
  | "pennsylvania-kiosks"
  | "tvs-ux-audit"
  | "gadget-commerce"
  | "about"
  | "notes"
  | "signal"; // contact

interface NightRunState {
  phase: Phase;
  timeOfDay: TimeOfDay;
  destination: Destination | null;
  /** Destinations delivered via the road game (stamped on the waybill). */
  delivered: Destination[];
  /** 0–2: quality tier for instancing counts / post-fx. 0 = lowest. */
  quality: 0 | 1 | 2;
  audioOn: boolean;
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
  /** Click the paper stack → open the waybill index (destination null). */
  openIndex: () => void;
  /** Pick an entry on the index → show that destination's content. */
  selectDestination: (destination: Destination) => void;
  /** Step back: content → index → back to the road. */
  closeSheet: () => void;
  /** Road game: stopped at a drop point → stamp it + open its entry. */
  deliver: (destination: Destination) => void;
  setQuality: (quality: 0 | 1 | 2) => void;
  toggleAudio: () => void;
  setSpeed: (speed: number) => void;
}

export const useNightRun = create<NightRunState>((set, get) => ({
  phase: "name",
  timeOfDay: "night",
  destination: null,
  delivered: [],
  quality: 2,
  audioOn: false,
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

  // Guards: the stack only opens while cruising; only close while reading.
  openIndex: () => {
    if (get().phase !== "cruising") return;
    set({ phase: "reading", destination: null });
  },
  selectDestination: (destination) => {
    if (get().phase !== "reading") return;
    set({ destination });
  },
  closeSheet: () => {
    const { phase, destination } = get();
    if (phase !== "reading") return;
    if (destination) {
      set({ destination: null }); // content → back to the index
    } else {
      set({ phase: "returning" }); // index → back to the road
      // The transition completes to "cruising" (ReadOverlay effect).
    }
  },

  deliver: (destination) => {
    if (get().phase !== "cruising") return;
    set((s) => ({
      phase: "reading",
      destination,
      delivered: s.delivered.includes(destination)
        ? s.delivered
        : [...s.delivered, destination],
    }));
  },

  setQuality: (quality) => set({ quality }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setSpeed: (speed) => set({ speed }),
}));
