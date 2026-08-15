"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";
import { SHEETS } from "@/lib/destinations";
import { drive } from "@/lib/driveState";
import { timeOfDayState } from "@/lib/timeOfDayState";

/**
 * Road-game HUD: deliveries counter, next-drop distance readout,
 * and the completion banner. Polls the per-frame drive state at a
 * humane rate instead of re-rendering at 60fps.
 */
export default function GameHud() {
  const phase = useNightRun((s) => s.phase);
  const delivered = useNightRun((s) => s.delivered);
  const [dist, setDist] = useState(-1);
  const [label, setLabel] = useState("");
  const [dayT, setDayT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDist(drive.nextStopDist);
      setLabel(drive.nextStopLabel);
      setDayT(timeOfDayState.t);
    }, 150);
    return () => clearInterval(id);
  }, []);

  const show = phase === "cruising";
  const done = delivered.length >= SHEETS.length;

  // Cyan/amber text was tuned against near-black. Against the pale
  // day sky it loses contrast, so a low-opacity scrim fades in with
  // the same `t` driving the sky itself — night stays exactly as
  // clean as it already was (scrim alpha is 0 there).
  const scrimStyle = {
    background: `rgba(5,6,8,${(dayT * 0.28).toFixed(3)})`,
    backdropFilter: "blur(6px)",
    borderRadius: 8,
    padding: "6px 10px",
    margin: "-6px -10px",
  };

  return (
    <>
      {/* Deliveries counter — bottom left */}
      <div
        className={`fixed bottom-8 left-8 z-40 transition-opacity duration-700 ${
          show ? "opacity-100" : "opacity-0"
        } pointer-events-none select-none font-mono`}
        style={scrimStyle}
      >
        <p className="text-[10px] tracking-[0.35em] uppercase text-neutral-500">
          Deliveries
        </p>
        <p className="text-2xl text-neutral-200 tabular-nums mt-1">
          {delivered.length}
          <span className="text-neutral-500">/{SHEETS.length}</span>
        </p>
      </div>

      {/* Next drop — top center */}
      {show && !done && dist >= 0 && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none text-center font-mono"
          style={scrimStyle}
        >
          <p className="text-[10px] tracking-[0.35em] uppercase text-neutral-500">
            Next drop
          </p>
          <p className="text-sm tracking-[0.15em] uppercase text-neutral-200 mt-1">
            {label} <span className="text-[#ffb65c] tabular-nums">· {dist}m</span>
          </p>
          {dist < 50 && (
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#ffb65c] mt-2 animate-pulse">
              ⬇ brake to deliver
            </p>
          )}
        </div>
      )}

      {/* Completion */}
      {show && done && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none text-center font-mono"
          style={scrimStyle}
        >
          <p className="text-sm tracking-[0.35em] uppercase text-[#8fe9ff]">
            🏁 Night run complete
          </p>
          <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-500 mt-1">
            All deliveries made. The road is yours.
          </p>
        </div>
      )}
    </>
  );
}
