"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";
import { isTouchDevice } from "@/lib/controls";

/** Thin-stroke hand icon — tap-and-hold. Matches the world's signage
 * linework rather than a stock icon-font glyph. */
function HandTapGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 12V5a1.5 1.5 0 0 1 3 0v7M14 12V6.5a1.5 1.5 0 0 1 3 0V13M17 13V9a1.5 1.5 0 0 1 3 0v6c0 3-2 6-5.5 6S8 20.5 8 18l-2.3-3.4c-.5-.7-.1-1.7.7-1.9.5-.1 1 .1 1.3.5L9 15"
        stroke="#8fe9ff"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="10.5" stroke="#8fe9ff" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

/** Thin-stroke phone glyph, rocking left-right to imply tilt-steer. */
function PhoneTiltGlyph() {
  return (
    <svg width="18" height="22" viewBox="0 0 20 26" fill="none" className="tilt-rock">
      <rect
        x="4"
        y="1.5"
        width="12"
        height="23"
        rx="2.5"
        stroke="#8fe9ff"
        strokeWidth="1.3"
      />
      <line x1="8" y1="21" x2="12" y2="21" stroke="#8fe9ff" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Drive prompt shown once cruising begins; fades on first input.
 * Desktop: "W A S D" keys. Touch: hold-anywhere + tilt-to-steer,
 * illustrated rather than described.
 */
export default function DriveHint() {
  const phase = useNightRun((s) => s.phase);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (phase !== "cruising" || used) return;
    if (isTouchDevice) {
      const onPointer = () => setUsed(true);
      window.addEventListener("pointerdown", onPointer);
      return () => window.removeEventListener("pointerdown", onPointer);
    }
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
      style={{ bottom: "max(32px, calc(env(safe-area-inset-bottom) + 16px))" }}
    >
      {isTouchDevice ? (
        <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.3em] uppercase text-neutral-400">
          <span className="flex items-center gap-2">
            <HandTapGlyph /> hold to drive
          </span>
          <span className="flex items-center gap-2">
            <PhoneTiltGlyph /> tilt to steer
          </span>
        </div>
      ) : (
        <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-neutral-400">
          <span className="text-neutral-100">W</span> drive ·{" "}
          <span className="text-neutral-100">S</span> brake ·{" "}
          <span className="text-neutral-100">A D</span> steer
        </p>
      )}
    </div>
  );
}
