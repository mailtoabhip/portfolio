"use client";

import { useEffect, useState } from "react";
import { isTouchDevice } from "@/lib/controls";

/**
 * Tilt-steering only makes sense held in portrait — that's the
 * "small steering wheel in front of you" grip the whole mechanic
 * assumes. Rather than fight the Screen Orientation Lock API (flaky
 * and partially unsupported in mobile Safari), just ask nicely.
 */
export default function LandscapePrompt() {
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    if (!isTouchDevice) return;
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!isTouchDevice || !landscape) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/95 px-8 text-center">
      <div>
        <p className="text-3xl mb-4">📱↻</p>
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-neutral-300">
          Rotate your phone back to drive
        </p>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mt-2">
          The Night Run is a portrait-only drive
        </p>
      </div>
    </div>
  );
}
