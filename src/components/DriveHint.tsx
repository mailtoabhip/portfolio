"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";

/** "W A S D" prompt shown once cruising begins; fades on first input. */
export default function DriveHint() {
  const phase = useNightRun((s) => s.phase);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (phase !== "cruising" || used) return;
    const onKey = (e: KeyboardEvent) => {
      if (["w", "a", "s", "d"].includes(e.key.toLowerCase()) || e.key.startsWith("Arrow")) {
        setUsed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, used]);

  const show = phase === "cruising" && !used;

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-1000 ${
        show ? "opacity-100" : "opacity-0"
      } pointer-events-none select-none`}
    >
      <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-neutral-400">
        <span className="text-neutral-100">W</span> drive ·{" "}
        <span className="text-neutral-100">S</span> brake ·{" "}
        <span className="text-neutral-100">A D</span> steer
      </p>
    </div>
  );
}
