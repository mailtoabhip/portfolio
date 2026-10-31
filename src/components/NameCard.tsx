"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";
import { isTouchDevice } from "@/lib/controls";
import { startOrientationSteering } from "@/lib/orientationInput";

/**
 * Screen 0 — the cold open (§7). Pure black, the name appears,
 * then resolves into the dark cab. Doubles as the loading mask.
 *
 * Timing here is provisional; the real ignition sequence (Step 6)
 * will chain name → igniting → cruising off asset-load + GSAP.
 *
 * On touch devices the auto-timer is replaced by a tap: iOS requires
 * DeviceOrientationEvent.requestPermission() to be called from inside
 * a real user gesture, so the same tap that starts the drive is also
 * the only place that permission prompt can fire — no second, separate
 * "enable motion" tap.
 */
export default function NameCard() {
  const phase = useNightRun((s) => s.phase);
  const setPhase = useNightRun((s) => s.setPhase);
  const [visible, setVisible] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (isTouchDevice) return; // waits for the tap instead
    // Hold the name ~2.2s, fade to black, then hand off to the
    // ignition sequence (Headlights drives igniting → cruising).
    const hold = setTimeout(() => setVisible(false), 2200);
    const advance = setTimeout(() => setPhase("igniting"), 3000);
    return () => {
      clearTimeout(hold);
      clearTimeout(advance);
    };
  }, [setPhase]);

  if (phase !== "name" && !visible) return null;

  const handleTapStart = () => {
    if (!isTouchDevice || starting) return;
    setStarting(true);
    setVisible(false);
    void startOrientationSteering(); // fallback strip mounts itself if this resolves false
    setTimeout(() => setPhase("igniting"), 300);
  };

  return (
    <div
      onClick={handleTapStart}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 px-6 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center select-none">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-neutral-100 [@media(max-width:380px)]:text-3xl">
          Abhijeet Purandare
        </h1>
        <p className="font-mono text-xs tracking-[0.3em] text-neutral-500 uppercase mt-4">
          B2B Product Designer · Delhivery
        </p>
        {isTouchDevice && (
          <p className="font-mono text-[11px] tracking-[0.3em] text-[#8fe9ff] uppercase mt-8 animate-pulse">
            Tap anywhere to start
          </p>
        )}
      </div>
    </div>
  );
}
