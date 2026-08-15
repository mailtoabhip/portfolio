"use client";

import { useEffect, useRef } from "react";
import { useNightRun } from "@/lib/store";
import { timeOfDayState } from "@/lib/timeOfDayState";

/**
 * The HUD's day/night badge: a hand-drawn crescent moon that morphs
 * into a sun under the visitor's cursor. Drawn at runtime via
 * Canvas 2D — same technique as the DROP POINT signage — so the
 * linework matches the rest of the world's signage instead of
 * looking like a stock UI icon.
 *
 * Redraws only on animation frames during an active transition (or
 * once when `t` has changed since the last draw); sits idle
 * otherwise, per the "no wasted redraws at rest" rule.
 */

const SIZE = 48;
const DPR_CAP = 2;
const CYAN: [number, number, number] = [143, 233, 255];
const WHITE: [number, number, number] = [255, 244, 224];
const AMBER: [number, number, number] = [255, 182, 92];

function mix(a: [number, number, number], b: [number, number, number], k: number) {
  return a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
}

function draw(ctx: CanvasRenderingContext2D, t: number) {
  const s = SIZE * DPR_CAP;
  ctx.clearRect(0, 0, s, s);
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.26;

  // Color: cyan -> warm white (t~0.5) -> amber. A straight cyan->amber
  // RGB lerp passes through a muddy grey-brown; the white midpoint
  // reads as clean "dawn light" instead.
  const rgb = t < 0.5 ? mix(CYAN, WHITE, t / 0.5) : mix(WHITE, AMBER, (t - 0.5) / 0.5);
  const color = `rgb(${rgb[0] | 0}, ${rgb[1] | 0}, ${rgb[2] | 0})`;

  // Stars — fade out t: 0 -> 0.3. The only place in the scene allowed
  // to imply stars (the sky dome deliberately has none).
  const starAlpha = Math.max(0, 1 - t / 0.3);
  if (starAlpha > 0.01) {
    ctx.fillStyle = `rgba(143,233,255,${0.5 * starAlpha})`;
    [
      [0.74, 0.26],
      [0.82, 0.42],
      [0.68, 0.16],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * s, y * s, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Disc + crescent "bite" — the bite shrinks to zero (a full disc)
  // by t~0.55.
  const biteK = Math.max(0, 1 - t / 0.55);
  ctx.lineWidth = s * 0.03;
  if (biteK <= 0.01) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, s, s);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx + r * 0.55 * biteK, cy - r * 0.32 * biteK, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Rays — fade in t: 0.5 -> 1, growing slightly as they reach full
  // opacity rather than popping in at full length.
  const rayAlpha = Math.max(0, (t - 0.5) / 0.5);
  if (rayAlpha > 0.01) {
    const rayLen = r * (0.35 + 0.25 * rayAlpha);
    ctx.strokeStyle = `rgba(${AMBER[0]}, ${AMBER[1]}, ${AMBER[2]}, ${rayAlpha})`;
    ctx.lineWidth = s * 0.025;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * (r * 1.25);
      const y0 = cy + Math.sin(a) * (r * 1.25);
      const x1 = cx + Math.cos(a) * (r * 1.25 + rayLen);
      const y1 = cy + Math.sin(a) * (r * 1.25 + rayLen);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}

export default function CelestialToggle() {
  const phase = useNightRun((s) => s.phase);
  const timeOfDay = useNightRun((s) => s.timeOfDay);
  const toggleTimeOfDay = useNightRun((s) => s.toggleTimeOfDay);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawn = useRef(-1);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const tick = () => {
      const t = timeOfDayState.t;
      if (timeOfDayState.active || lastDrawn.current !== t) {
        draw(ctx, t);
        lastDrawn.current = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard parity ("L" for lights) — routes through the same guarded
  // store action as the click handler, no duplicated guard logic.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      toggleTimeOfDay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTimeOfDay]);

  const visible = phase === "cruising" || phase === "reading";
  const midTransition = timeOfDay === "sunrise" || timeOfDay === "sunset";
  const label = timeOfDay === "night" || timeOfDay === "sunset" ? "Switch to day" : "Switch to night";

  const handleClick = () => {
    toggleTimeOfDay();
    const btn = btnRef.current;
    if (!btn) return;
    btn.classList.remove("cel-pulse");
    void btn.offsetWidth; // restart the animation
    btn.classList.add("cel-pulse");
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={midTransition}
      aria-label={label}
      style={{
        top: "max(32px, calc(env(safe-area-inset-top) + 12px))",
        right: "max(32px, calc(env(safe-area-inset-right) + 12px))",
      }}
      className={`fixed z-40 w-12 h-12 rounded-full border border-neutral-700 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${midTransition ? "opacity-60 cursor-default" : "cursor-pointer hover:border-neutral-500"}`}
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
