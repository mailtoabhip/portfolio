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
// Day matches the bright cartoon-highway reference; night is the
// same scene under a navy sky, lit by headlights and glowing paint.
/** Horizon colour (also the fog colour) and the zenith colour. */
export const SKY = { night: "#14233f", day: "#cfe6f4" };
export const SKY_TOP = { night: "#040814", day: "#3f93e3" };
/** Hazy horizon hills, two layers (near is greener, far is bluer). */
export const HILLS = {
  nearDay: "#7fae8c",
  farDay: "#9cc0cf",
  nearNight: "#0b1a22",
  farNight: "#0f1d33",
};
export const FOG_NEAR = { night: 8, day: 70 };
export const FOG_FAR = { night: 90, day: 320 };
export const AMBIENT = { night: 0.11, day: 0.8 };
export const AMBIENT_COLOR = { night: "#93a8d1", day: "#fff3e2" };
export const SUN_LIGHT_COLOR = "#fff1d6";
export const SUN_LIGHT_INTENSITY = 1.9;
/** Renderer exposure at full day (night is 1.0). */
export const DAY_EXPOSURE = 1.3;
/** Day-only sky/ground bounce so shaded faces (tree sides, cab
 * interior) read as lit clay instead of silhouettes. */
export const HEMI = { sky: "#eef6ff", ground: "#c9b08a", day: 0.9 };
/** Sun light comes from behind-right of the driver in daylight so
 * everything in view is front-lit; the visible disc stays ahead. */
export const SUN_LIGHT_POS_DAY: [number, number, number] = [22, 48, 30];

export const TRUNK_COLOR = { night: "#241a10", day: "#8a6a4f" };
export const BUSH_COLOR = { night: "#10261a", day: "#5f9a43" };
/** [bottom, mid, top] — darker toward the top at night (headlight-lit
 * from below-ahead), lighter toward the top in daylight (sun from
 * above). The gradient direction inverting between modes is correct,
 * not a bug — it's the same "light source implies the gradient" rule
 * in both cases. */
export const CANOPY_COLORS = [
  { night: "#14301c", day: "#4f8a45" },
  { night: "#112a18", day: "#6aa85a" },
  { night: "#0d2213", day: "#8cc678" },
];
