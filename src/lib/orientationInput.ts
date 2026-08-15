import { input } from "@/lib/controls";

/**
 * Device-tilt steering. Mirrors `driveState.ts`: a plain mutable
 * module, not React state, updated inside the `deviceorientation`
 * listener. It writes the resolved value straight into `controls.ts`'s
 * shared `input.steer` — the exact same field keyboard A/D writes —
 * so Truck.tsx needs zero branching for input source. The extra
 * fields below (calibration/smoothed/steer) exist for the recalibrate
 * icon and the permission/fallback flow to read, not for physics.
 */
export const orientationInput = {
  supported: false, // a real deviceorientation event has fired
  permission: "unknown" as "unknown" | "granted" | "denied",
  calibrated: false,
  neutralGamma: 0,
  smoothedGamma: 0,
  steerValue: 0, // -1..1, deadzone + range mapped
  active: false, // tilt is currently the live steering source
  fallbackNeeded: false, // permission denied, or no sensor within ~1s
};

const DEADZONE = 3; // degrees either side of neutral, absorbs hand tremor
const RANGE = 25; // degrees from neutral to full lock
const SMOOTH = 0.15; // exponential smoothing factor per event

function mapSteer(deltaFromNeutral: number): number {
  const abs = Math.abs(deltaFromNeutral);
  if (abs <= DEADZONE) return 0;
  const past = Math.min(abs - DEADZONE, RANGE - DEADZONE);
  const t = past / (RANGE - DEADZONE);
  return Math.sign(deltaFromNeutral) * t;
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.gamma == null) return;
  orientationInput.supported = true;
  orientationInput.smoothedGamma += (e.gamma - orientationInput.smoothedGamma) * SMOOTH;

  if (!orientationInput.calibrated) {
    // Whatever angle the phone happens to be at right now is "straight
    // ahead" — nobody holds a phone perfectly flat.
    orientationInput.neutralGamma = orientationInput.smoothedGamma;
    orientationInput.calibrated = true;
    orientationInput.active = true;
    orientationInput.fallbackNeeded = false;
  }

  orientationInput.steerValue = mapSteer(
    orientationInput.smoothedGamma - orientationInput.neutralGamma
  );
  input.steer = orientationInput.steerValue;
}

/** Recenters "straight ahead" on the phone's current tilt — for when
 * a user's grip shifts mid-drive and the truck starts drifting. */
export function recalibrateTilt() {
  orientationInput.neutralGamma = orientationInput.smoothedGamma;
}

let attached = false;

/**
 * Call from within a real user-gesture handler (iOS requires it for
 * the permission prompt). Resolves true once tilt is live, false if
 * denied or unsupported — the caller should mount the touch-steer
 * fallback in the false case (also reflected in `fallbackNeeded`).
 */
export async function startOrientationSteering(): Promise<boolean> {
  if (attached) return orientationInput.active;
  attached = true;

  const DOE = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };

  if (typeof DOE?.requestPermission === "function") {
    try {
      const result = await DOE.requestPermission();
      orientationInput.permission = result === "granted" ? "granted" : "denied";
    } catch {
      orientationInput.permission = "denied";
    }
  } else {
    // No permission API (Android, desktop-with-touch) — attach directly.
    orientationInput.permission = "granted";
  }

  if (orientationInput.permission !== "granted") {
    orientationInput.fallbackNeeded = true;
    return false;
  }

  window.addEventListener("deviceorientation", onOrientation);

  // Feature-detect an actual sensor: if nothing fires within ~1s,
  // there's no usable orientation hardware — fall back.
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!orientationInput.supported) orientationInput.fallbackNeeded = true;
      resolve(orientationInput.active);
    }, 1000);
  });
}
