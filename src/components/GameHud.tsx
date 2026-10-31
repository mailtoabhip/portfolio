"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";
import { useGame, sendCommand, TIME_LIMIT } from "@/lib/game";
import { isTouchDevice, setTouchReverse } from "@/lib/controls";

/**
 * Delivery Rush HUD. Reads the throttled snapshot in `useGame`; sends
 * Start / Stop / Retry / Quit through `sendCommand` (GameSim applies
 * them on its next frame). Hidden while the tablet is open.
 */

const pill =
  "rounded-2xl bg-[rgba(10,14,20,0.62)] backdrop-blur-md text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10";

function fmtTime(t: number) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="fixed left-1/2 top-[42%] z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex flex-col items-center gap-2">
      <svg width="92" height="92" viewBox="0 0 92 92" className="drop-shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
        <circle cx="46" cy="46" r={r} fill="rgba(10,14,20,0.6)" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="#ffb21f"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value))}
          transform="rotate(-90 46 46)"
        />
        <text x="46" y="53" textAnchor="middle" fontSize="20" fill="#fff">
          📦
        </text>
      </svg>
      <span className={`${pill} px-3 py-1 text-xs font-semibold tracking-wide`}>{label}</span>
    </div>
  );
}

export default function GameHud() {
  const phase = useNightRun((s) => s.phase);
  const g = useGame();
  const [banner, setBanner] = useState(false);
  const [intro, setIntro] = useState(false);
  // Client-only: touch detection and the saved best score differ from
  // the server render, so mount after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (g.delivered === 0) return;
    // Show the success banner briefly after each on-time delivery.
    const on = window.setTimeout(() => setBanner(true), 0);
    const off = window.setTimeout(() => setBanner(false), 3200);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [g.delivered]);

  if (!mounted || phase !== "cruising") return null;

  const racing = g.job === "delivering" || g.job === "unloading";
  const toPickup = g.job === "toPickup" || g.job === "loading";
  const urgent = racing && g.timeLeft <= 10;

  return (
    <>
      {/* ---- Top: job card ---- */}
      {g.job !== "idle" && g.job !== "late" && (
        <div
          className="fixed left-1/2 top-0 z-40 -translate-x-1/2 select-none"
          style={{ top: "max(16px, calc(env(safe-area-inset-top) + 8px))" }}
        >
          <div className={`${pill} flex items-center gap-3 whitespace-nowrap px-4 py-2.5 sm:gap-4`}>
            {racing ? (
              <div className={`font-mono text-3xl font-bold tabular-nums ${urgent ? "text-[#ff5a4f] animate-pulse" : ""}`}>
                {fmtTime(g.timeLeft)}
              </div>
            ) : (
              <span className="text-2xl">📦</span>
            )}
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                {racing ? `Tolls ${g.tollsPaid}/2` : "Go to pickup"}
              </p>
              <p className="text-sm font-semibold">
                {racing ? "Drop point" : "Pickup hub"} ·{" "}
                <span className="tabular-nums">{g.distToTarget >= 0 ? fmtDist(g.distToTarget) : "—"}</span>
                <span className="hidden text-white/50 sm:inline"> on the left</span>
              </p>
            </div>
            {toPickup && (
              <button
                onClick={() => sendCommand("stop")}
                className="pointer-events-auto rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                Stop pickup
              </button>
            )}
            {g.streak > 0 && (
              <span className="rounded-full bg-[#ffb21f] px-2.5 py-1 text-xs font-bold text-black">🔥 {g.streak}</span>
            )}
          </div>
          {g.nearBay && !g.inBay && (g.job === "toPickup" || g.job === "delivering") && (
            <p className={`${pill} mx-auto mt-2 w-max px-3 py-1 text-xs font-medium`}>
              Pull into the lay-by and stop inside the yellow box
            </p>
          )}
        </div>
      )}

      {/* ---- Toasts ---- */}
      <div className="fixed left-1/2 top-[110px] z-40 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none select-none">
        {g.toasts.map((t) => (
          <span
            key={t.id}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg ${
              t.tone === "good" ? "bg-[#1f9d55] text-white" : t.tone === "warn" ? "bg-[#ffb21f] text-black" : "bg-white text-black"
            }`}
          >
            {t.text}
          </span>
        ))}
      </div>

      {/* ---- Loading / unloading ring ---- */}
      {(g.job === "loading" || g.job === "unloading") && (
        <Ring value={g.load} label={g.job === "loading" ? "Loading parcels…" : "Unloading…"} />
      )}

      {/* ---- On-time banner ---- */}
      {banner && (
        <div className="fixed left-1/2 top-[38%] z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none text-center">
          <div className={`${pill} px-6 py-4`}>
            <p className="text-2xl font-bold">Delivered on time! ✅</p>
            <p className="mt-1 text-sm text-white/80">
              {g.lastSaved.toFixed(1)}s to spare · streak {g.streak} · next pickup is up ahead
            </p>
          </div>
        </div>
      )}

      {/* ---- Idle: a small play button → short intro popup ---- */}
      {g.job === "idle" && !intro && (
        <button
          onClick={() => setIntro(true)}
          aria-label="Play the delivery game"
          title="Play the delivery game"
          className={`${pill} fixed z-40 flex h-12 w-12 items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95`}
          style={{
            right: "max(20px, calc(env(safe-area-inset-right) + 12px))",
            bottom: "max(96px, calc(env(safe-area-inset-bottom) + 88px))",
          }}
        >
          <span aria-hidden className="ml-0.5">▶</span>
        </button>
      )}
      {g.job === "idle" && intro && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
          onClick={() => setIntro(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dr-title"
            onClick={(e) => e.stopPropagation()}
            className="w-[min(92vw,400px)] rounded-3xl bg-white p-6 text-[#14181f] shadow-2xl"
          >
            <p className="text-3xl">📦</p>
            <h2 id="dr-title" className="mt-2 text-2xl font-bold">Delivery Rush</h2>
            <p className="mt-1 text-sm text-black/60">A real day on the highway, in about a minute.</p>
            <ol className="mt-4 space-y-2 text-sm">
              <li>
                <b>1. Pick up:</b>{" "} pull into the lay-by on the left and stop inside the yellow box.
              </li>
              <li>
                <b>2. Race:</b>{" "} you have {TIME_LIMIT} seconds. Weave through traffic and clear 2 tolls. Take the empty FASTag lane and slow to 30 km/h.
              </li>
              <li>
                <b>3. Deliver:</b>{" "} park in the drop point&apos;s box. Make it in time and the next pickup appears.
              </li>
            </ol>
            <p className="mt-3 rounded-xl bg-[#f3efe6] px-3 py-2 text-xs text-black/70">
              {isTouchDevice ? "Hold to drive · tilt to steer · R to reverse" : "W drive · S brake / reverse · A D steer"}
              {g.best > 0 ? ` · Best streak: ${g.best}` : ""}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setIntro(false)}
                className="flex-1 rounded-full bg-black/5 px-4 py-3 text-sm font-semibold hover:bg-black/10"
              >
                Go back
              </button>
              <button
                onClick={() => {
                  setIntro(false);
                  sendCommand("start");
                }}
                className="flex-1 rounded-full bg-[#ffb21f] px-4 py-3 text-sm font-bold hover:brightness-105"
              >
                ▶ Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Late: result card ---- */}
      {g.job === "late" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
          <div className="w-[min(92vw,380px)] rounded-3xl bg-white p-6 text-center text-[#14181f] shadow-2xl">
            <p className="text-4xl">⏰</p>
            <h2 className="mt-2 text-2xl font-bold">Too late!</h2>
            <p className="mt-1 text-sm text-black/60">
              {g.streak > 0 ? `You made ${g.streak} on-time ${g.streak === 1 ? "delivery" : "deliveries"} in a row.` : "The parcel didn't make it in time."}
              {g.best > 0 ? ` Best streak: ${g.best}.` : ""}
            </p>
            <p className="mt-3 rounded-xl bg-[#f3efe6] px-3 py-2 text-xs text-black/70">
              Fun fact: I design the FASTag and fleet apps truck drivers use every day at Delhivery.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => sendCommand("quit")}
                className="flex-1 rounded-full bg-black/5 px-4 py-3 text-sm font-semibold hover:bg-black/10"
              >
                Back to driving
              </button>
              <button
                onClick={() => sendCommand("retry")}
                className="flex-1 rounded-full bg-[#ffb21f] px-4 py-3 text-sm font-bold hover:brightness-105"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Touch: hold-to-reverse ---- */}
      {isTouchDevice && g.job !== "late" && g.job !== "idle" && (
        <button
          className="fixed z-40 h-16 w-16 rounded-full bg-[rgba(10,14,20,0.62)] text-sm font-bold text-white ring-1 ring-white/15 backdrop-blur-md active:bg-white/25"
          style={{
            left: "max(20px, calc(env(safe-area-inset-left) + 12px))",
            bottom: "max(96px, calc(env(safe-area-inset-bottom) + 88px))",
            touchAction: "none",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setTouchReverse(true);
          }}
          onPointerUp={() => setTouchReverse(false)}
          onPointerCancel={() => setTouchReverse(false)}
          onPointerLeave={() => setTouchReverse(false)}
          aria-label="Hold to reverse"
        >
          R
        </button>
      )}
    </>
  );
}
