/**
 * The Night Run — day/night transition state.
 *
 * Mirrors `driveState.ts` exactly: `t` changes every frame for the
 * ~4s of a sunrise/sunset, so it lives outside React/Zustand. The
 * `timeOfDay` string in the store only flips four discrete times per
 * full cycle (night -> sunrise -> day -> sunset -> night) and is fine
 * as store state; this continuous `t` is not.
 *
 * `t` is the single source of truth every visual reads from — 0 is
 * full night, 1 is full day. Sunrise/sunset just move it in different
 * directions at different speeds; every material/light lerp below is
 * a pure function of `t`, so sunset is automatically "the same beats,
 * mirrored" without needing separate logic.
 */
export const timeOfDayState = {
  t: 0,
  /** true while a sunrise/sunset is actively advancing t. */
  active: false,
};

export const SUNRISE_DURATION = 4.2; // seconds, t: 0 -> 1
export const SUNSET_DURATION = 3.6; // seconds, t: 1 -> 0 (dusk falls faster)
export const REDUCED_MOTION_DURATION = 0.4; // seconds, either direction

/** Smoothstep ease — the shared softening curve behind every beat below. */
export function ease(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** Eased 0->1 progress of `t` within [a, b] — "this happens mostly
 * between t=a and t=b," the mechanism behind the whole choreography. */
export function bandT(t: number, a: number, b: number): number {
  return ease((t - a) / (b - a));
}

// ---- Shared day/night values (single source of truth) ----
// Night values match the colors already in Road.tsx/Forest.tsx/
// Experience.tsx exactly, so day mode is additive, not a re-tune.
export const SKY = { night: "#050608", day: "#bcdcee" };
export const FOG_NEAR = { night: 8, day: 40 };
export const FOG_FAR = { night: 60, day: 220 };
export const AMBIENT = { night: 0.03, day: 0.7 };
export const AMBIENT_COLOR = { night: "#ffffff", day: "#fff3e2" };
export const SUN_LIGHT_COLOR = "#fff1d6";
export const SUN_LIGHT_INTENSITY = 1.15;

export const ROAD_COLOR = { night: "#101114", day: "#55545a" };
/** The forest-floor ground plane either side of the road (distinct
 * from the asphalt strip itself, per ROAD_COLOR above). Kept muted so
 * it stays the quietest surface in frame — road and trees should
 * still draw the eye. */
export const GROUND_COLOR = { night: "#0a0f0a", day: "#8a7256" };
export const TRUNK_COLOR = { night: "#241a10", day: "#5a4738" };
/** [bottom, mid, top] — darker toward the top at night (headlight-lit
 * from below-ahead), lighter toward the top in daylight (sun from
 * above). The gradient direction inverting between modes is correct,
 * not a bug — it's the same "light source implies the gradient" rule
 * in both cases. */
export const CANOPY_COLORS = [
  { night: "#14301c", day: "#2c4d28" },
  { night: "#112a18", day: "#436b3c" },
  { night: "#0d2213", day: "#5c8c52" },
];
