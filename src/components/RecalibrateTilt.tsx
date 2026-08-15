"use client";

import { useEffect, useRef, useState } from "react";
import { useNightRun } from "@/lib/store";
import { isTouchDevice } from "@/lib/controls";
import { orientationInput, recalibrateTilt } from "@/lib/orientationInput";

/**
 * "Straight ahead is wherever I'm holding it" can drift if a user's
 * grip shifts mid-drive. This crosshair resets the tilt baseline to
 * the phone's current angle. Same HUD icon family as the day/night
 * badge (cyan-outline, canvas-drawn), bottom-right — the one HUD
 * corner not already claimed.
 */

const SIZE = 40;
const DPR_CAP = 2;

function draw(ctx: CanvasRenderingContext2D) {
  const s = SIZE * DPR_CAP;
  ctx.clearRect(0, 0, s, s);
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.28;
  ctx.strokeStyle = "#8fe9ff";
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const tick = s * 0.14;
  [
    [cx, cy - r - tick, cx, cy - r + s * 0.02],
    [cx, cy + r - s * 0.02, cx, cy + r + tick],
    [cx - r - tick, cy, cx - r + s * 0.02, cy],
    [cx + r - s * 0.02, cy, cx + r + tick, cy],
  ].forEach(([x0, y0, x1, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  });
}

export default function RecalibrateTilt() {
  const phase = useNightRun((s) => s.phase);
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isTouchDevice) return;
    const id = window.setInterval(() => setActive(orientationInput.active), 300);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx);
  }, [active]);

  if (!isTouchDevice || !active) return null;
  const visible = phase === "cruising" || phase === "reading";

  const handleClick = () => {
    recalibrateTilt();
    const btn = btnRef.current;
    if (!btn) return;
    btn.classList.remove("cel-pulse");
    void btn.offsetWidth;
    btn.classList.add("cel-pulse");
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      aria-label="Recalibrate tilt steering"
      style={{ bottom: "max(32px, env(safe-area-inset-bottom))", right: "max(32px, env(safe-area-inset-right))" }}
      className={`fixed z-40 w-10 h-10 rounded-full border border-neutral-700 bg-black/50 flex items-center justify-center transition-opacity duration-300 cursor-pointer hover:border-neutral-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <canvas
        ref={canvasRef}
        width={SIZE * DPR_CAP}
        height={SIZE * DPR_CAP}
        style={{ width: SIZE, height: SIZE }}
      />
    </button>
  );
}
