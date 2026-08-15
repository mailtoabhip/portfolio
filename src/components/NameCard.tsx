"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";

/**
 * Screen 0 — the cold open (§7). Pure black, the name appears,
 * then resolves into the dark cab. Doubles as the loading mask.
 *
 * Timing here is provisional; the real ignition sequence (Step 6)
 * will chain name → igniting → cruising off asset-load + GSAP.
 */
export default function NameCard() {
  const phase = useNightRun((s) => s.phase);
  const setPhase = useNightRun((s) => s.setPhase);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center select-none">
        <p className="font-mono text-xs tracking-[0.4em] text-neutral-500 uppercase mb-4 animate-pulse">
          Long night ahead
        </p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-neutral-100">
          Abhijeet Purandare
        </h1>
        <p className="font-mono text-xs tracking-[0.3em] text-neutral-500 uppercase mt-4">
          B2B Product Designer · Delhivery
        </p>
      </div>
    </div>
  );
}
