/**
 * Per-frame mutable drive state, shared between three-components
 * without going through React/Zustand (no re-renders at 60fps).
 * GameSim is the only writer: it runs first each frame, then Truck,
 * Forest, Road and the game props read the results.
 */
export const drive = {
  /** Signed speed in m/s (negative = reversing). */
  speed: 0,
  /** Road coordinate of the camera: total metres travelled. */
  dist: 0,
  /** Metres moved this frame (signed). */
  dz: 0,
  /** Truck group's lateral position (camera x). */
  x: 0,
  /** Truck group's yaw (look into steer / bends). */
  yaw: 0,
};
