"use client";

import { useEffect } from "react";

/**
 * WASD / arrow-key driving input. Written every keydown/keyup,
 * read per-frame by Forest (speed) and Truck (lane position).
 *   W / ↑  throttle    S / ↓  brake    A / ←  left    D / →  right
 */
export const input = {
  throttle: 0, // 0..1
  brake: 0, // 0..1
  steer: 0, // -1 (left) .. 1 (right)
};

const keys = { w: false, s: false, a: false, d: false };

function apply() {
  input.throttle = keys.w ? 1 : 0;
  input.brake = keys.s ? 1 : 0;
  input.steer = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
}

function match(e: KeyboardEvent): keyof typeof keys | null {
  switch (e.key.toLowerCase()) {
    case "w":
    case "arrowup":
      return "w";
    case "s":
    case "arrowdown":
      return "s";
    case "a":
    case "arrowleft":
      return "a";
    case "d":
    case "arrowright":
      return "d";
    default:
      return null;
  }
}

/** True once, computed at module load — no phones ever gain a keyboard
 * mid-session, so this never needs to be reactive. */
export const isTouchDevice =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/**
 * Touch throttle: a binary hold, written by TouchDriveLayer's
 * pointerdown/up. Release uses the brake curve, not the gentle coast
 * — mobile has no separate brake gesture, and the ~14m delivery zone
 * requires actually being able to stop in time. Don't "simplify" this
 * back to a coast-only release; it quietly breaks mobile deliveries.
 */
export function setTouchThrottle(active: boolean) {
  input.throttle = active ? 1 : 0;
  input.brake = active ? 0 : 1;
}

/** Mount once (in the experience shell) to activate driving keys. */
export function useDrivingControls() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = match(e);
      if (!k) return;
      // Don't hijack keys while typing in an input (password gate etc.)
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      keys[k] = true;
      apply();
    };
    const up = (e: KeyboardEvent) => {
      const k = match(e);
      if (!k) return;
      keys[k] = false;
      apply();
    };
    const blur = () => {
      keys.w = keys.s = keys.a = keys.d = false;
      apply();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}
