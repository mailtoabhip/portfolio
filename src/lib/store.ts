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

/** Which screen the tablet is showing while `phase === "reading"`. */
export type TabletApp = "home" | "case-studies" | "resume" | "music";

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
  /** Which tablet screen is showing (only meaningful while reading). */
  tabletApp: TabletApp;
  /** Destinations delivered via the road game (stamped on the waybill). */
  delivered: Destination[];
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
  /** Tap the tablet → fullscreen, tablet OS home screen. */
  openTablet: () => void;
  /** Pick an app tile on the tablet's home screen. */
  openTabletApp: (app: TabletApp) => void;
  /** Pick an entry on the Case Studies index → show that content. */
  selectDestination: (destination: Destination) => void;
  /** Step back one level: entry -> list/home -> tablet home -> road. */
  closeSheet: () => void;
  /** Road game: stopped at a drop point → stamp it + open its entry. */
  deliver: (destination: Destination) => void;
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
  destination: null,
  tabletApp: "home",
  delivered: [],
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

  // Guards: the tablet only opens while cruising; only close while reading.
  openTablet: () => {
    if (get().phase !== "cruising") return;
    set({ phase: "reading", tabletApp: "home", destination: null });
  },
  openTabletApp: (app) => {
    if (get().phase !== "reading") return;
    // Resume is a single document, not a list — jump straight to its
    // entry content via the same `destination`/EntryView path Case
    // Studies uses, no separate rendering path needed.
    set({ tabletApp: app, destination: app === "resume" ? "manifest" : null });
  },
  selectDestination: (destination) => {
    if (get().phase !== "reading") return;
    set({ destination });
  },
  closeSheet: () => {
    const { phase, destination, tabletApp } = get();
    if (phase !== "reading") return;
    if (destination) {
      // Entry content -> whichever screen it was opened from: the
      // Case Studies list stays put, Resume has no list so it steps
      // straight back to the tablet home screen.
      set({ destination: null, tabletApp: tabletApp === "resume" ? "home" : tabletApp });
    } else if (tabletApp !== "home") {
      set({ tabletApp: "home" }); // list/music -> tablet home
    } else {
      set({ phase: "returning" }); // tablet home -> back to the road
      // The transition completes to "cruising" (TabletOS effect).
    }
  },

  deliver: (destination) => {
    if (get().phase !== "cruising") return;
    set((s) => ({
      phase: "reading",
      tabletApp: "case-studies",
      destination,
      delivered: s.delivered.includes(destination)
        ? s.delivered
        : [...s.delivered, destination],
    }));
  },

  setQuality: (quality) => set({ quality }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  openPhoneScreen: () => set({ phoneOpen: true }),
  closePhoneScreen: () => set({ phoneOpen: false }),
  setSpeed: (speed) => set({ speed }),
}));
