/** Visual seat response only; never writes to the driving simulation. */
export type SeatMotion = {
  speed: number;
  pitch: number;
  initialized: boolean;
};

export function createSeatMotion(): SeatMotion {
  return { speed: 0, pitch: 0, initialized: false };
}

/** Exact exponential damping: the response rate does not depend on FPS. */
export function dampFactor(rate: number, dt: number) {
  return 1 - Math.exp(-rate * Math.max(0, dt));
}

export function updateSeatMotion(
  seat: SeatMotion,
  speed: number,
  dt: number,
  enabled: boolean,
) {
  // Tab resumes, mode changes and first mount must not look like impacts.
  if (!enabled || !seat.initialized || dt <= 0 || dt > 0.1) {
    seat.speed = speed;
    seat.pitch = 0;
    seat.initialized = enabled;
    return;
  }
  const acceleration = Math.max(-8, Math.min(8, (speed - seat.speed) / dt));
  seat.speed = speed;
  // Acceleration raises the gaze; braking dips it. Limit to one degree.
  const target = acceleration / 8 * (Math.PI / 180);
  seat.pitch += (target - seat.pitch) * dampFactor(5, dt);
}

/** Spatial vibration: the same patch of road is felt at any frame rate. */
export function roadRumble(distance: number, movingSpeed: number) {
  const amplitude = Math.min(Math.abs(movingSpeed) / 22, 1) * 0.006;
  return (Math.sin(distance * 2.3) * 0.65 + Math.sin(distance * 5.7) * 0.35) * amplitude;
}
