"use client";

import { useEffect, useState } from "react";
import { useNightRun } from "@/lib/store";
import { useGame, sendCommand, fmtMetres, TIME_LIMIT, type FreeRun } from "@/lib/game";
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

function fmtWhen(at: number) {
  const d = new Date(at);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ScoreList({ runs, highlight }: { runs: FreeRun[]; highlight?: number }) {
  if (!runs.length) return null;
  const hi = highlight === undefined ? -1 : runs.findIndex((r) => r.score === highlight);
  return (
    <ol className="mt-3 divide-y divide-black/5 rounded-xl bg-[#f3efe6] px-3 text-sm">
      {runs.slice(0, 5).map((r, i) => {
        const me = i === hi;
        return (
          <li key={`${r.at}-${i}`} className={`flex items-center gap-3 py-1.5 ${me ? "font-bold" : ""}`}>
            <span className="w-5 font-mono text-xs text-black/40">{i + 1}</span>
            <span className="flex-1 tabular-nums">{fmtMetres(r.score)}</span>
            <span className="text-xs text-black/45">{me ? "this run" : fmtWhen(r.at)}</span>
          </li>
        );
      })}
    </ol>
  );
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
  const free = g.job === "freeRun" || g.job === "freeOver";
  const freeBest = g.freeRuns[0]?.score ?? 0;
  // Desktop: the play button sits right under the sun/moon toggle.
  const playPos = isTouchDevice
    ? {
        right: "max(20px, calc(env(safe-area-inset-right) + 12px))",
        bottom: "max(96px, calc(env(safe-area-inset-bottom) + 88px))",
      }
    : {
        right: "max(32px, calc(env(safe-area-inset-right) + 12px))",
        top: "calc(max(32px, calc(env(safe-area-inset-top) + 12px)) + 60px)",
      };
  const toPickup = g.job === "toPickup" || g.job === "loading";
  const urgent = racing && g.timeLeft <= 10;

  return (
    <>
      {/* ---- Top: job card ---- */}
      {/* ---- Free Run: live score ---- */}
      {g.job === "freeRun" && (
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 select-none pointer-events-none"
          style={{ top: "max(16px, calc(env(safe-area-inset-top) + 8px))" }}
        >
          <div className={`${pill} flex items-center gap-4 whitespace-nowrap px-5 py-2.5`}>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Distance</p>
              <p className="font-mono text-3xl font-bold tabular-nums">{fmtMetres(g.freeScore)}</p>
            </div>
            <div className="leading-tight">
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  g.freeRate >= 100 ? "text-[#CCFF00]" : g.freeRate >= 50 ? "text-white" : "text-[#ffb21f]"
                }`}
              >
                {g.freeRate} km/h
              </p>
              <p className="text-[11px] text-white/55">Best {fmtMetres(freeBest)}</p>
            </div>
          </div>
          {!g.freeArmed && (
            <p className={`${pill} mx-auto mt-2 w-max px-3 py-1 text-xs font-medium`}>
              {isTouchDevice ? "Hold to drive" : "Hold W to drive"} · go as far as you can
            </p>
          )}
        </div>
      )}

      {!free && g.job !== "idle" && g.job !== "late" && (
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
          aria-label="Play a game"
          title="Play a game"
          className={
            isTouchDevice
              ? `${pill} fixed z-40 flex h-12 w-12 items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95`
              : "fixed z-40 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 bg-black/50 text-lg text-white transition-colors hover:border-neutral-500"
          }
          style={playPos}
        >
          {/* Gamepad icon */}
          <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.9 4.6a2.6 2.6 0 0 1-4.6 2.1L15.6 15H8.4l-1.6 2.3a2.6 2.6 0 0 1-4.6-2.1l.9-4.6A4.5 4.5 0 0 1 7.5 7z" />
            <path d="M8 9.5v3M6.5 11h3" />
            <circle cx="15.5" cy="10.2" r=".9" fill="currentColor" stroke="none" />
            <circle cx="17.3" cy="12" r=".9" fill="currentColor" stroke="none" />
          </svg>
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
            className="max-h-[92dvh] w-[min(92vw,420px)] overflow-y-auto rounded-3xl bg-white p-5 text-[#14181f] shadow-2xl sm:p-6"
          >
            <h2 id="dr-title" className="text-2xl font-bold">Pick a game</h2>
            <p className="mt-1 text-sm text-black/60">
              {isTouchDevice ? "Hold to drive · tilt to steer" : "W drive · S brake / reverse · A D steer"}
            </p>

            <div className="mt-4 rounded-2xl border border-black/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏁</span>
                <div className="flex-1">
                  <h3 className="font-bold">Free Run</h3>
                  <p className="mt-0.5 text-sm text-black/65">
                    See how far you can drive. Stop, crash or hit the roadside and the run ends. Traffic gets heavier
                    the further you go.
                  </p>
                  {freeBest > 0 && <p className="mt-1 text-xs font-semibold text-black/50">Your best: {fmtMetres(freeBest)}</p>}
                </div>
              </div>
              <button
                onClick={() => {
                  setIntro(false);
                  sendCommand("free");
                }}
                className="mt-3 w-full rounded-full bg-[#2B3AFF] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                ▶ Play Free Run
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-black/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📦</span>
                <div className="flex-1">
                  <h3 className="font-bold">Delivery Rush</h3>
                  <p className="mt-0.5 text-sm text-black/65">
                    Pick up a parcel from the lay-by on the left, clear 2 FASTag tolls (slow to 30 km/h) and park at the
                    drop point within {TIME_LIMIT} seconds.
                  </p>
                  {g.best > 0 && <p className="mt-1 text-xs font-semibold text-black/50">Best streak: {g.best}</p>}
                </div>
              </div>
              <button
                onClick={() => {
                  setIntro(false);
                  sendCommand("start");
                }}
                className="mt-3 w-full rounded-full bg-[#ffb21f] px-4 py-2.5 text-sm font-bold hover:brightness-105"
              >
                ▶ Play Delivery Rush
              </button>
            </div>

            <button
              onClick={() => setIntro(false)}
              className="mt-3 w-full rounded-full bg-black/5 px-4 py-2.5 text-sm font-semibold hover:bg-black/10"
            >
              Go back
            </button>
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

      {/* ---- Free Run: game over ---- */}
      {g.job === "freeOver" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
          <div className="max-h-[92dvh] w-[min(92vw,380px)] overflow-y-auto rounded-3xl bg-white p-6 text-center text-[#14181f] shadow-2xl">
            <p className="text-4xl">{g.freeNewBest ? "🏆" : "💥"}</p>
            <p className="mt-2 text-sm text-black/60">{g.freeReason}</p>
            <p className="mt-1 font-mono text-5xl font-bold tabular-nums">{fmtMetres(g.freeScore)}</p>
            <p className="mt-1 text-sm font-semibold">
              {g.freeNewBest ? "New best distance!" : `Best: ${fmtMetres(freeBest)}`}
            </p>
            <div className="text-left">
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-black/45">Your top runs</p>
              <ScoreList runs={g.freeRuns} highlight={g.freeScore} />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => sendCommand("quit")}
                className="flex-1 rounded-full bg-black/5 px-4 py-3 text-sm font-semibold hover:bg-black/10"
              >
                Back to driving
              </button>
              <button
                onClick={() => sendCommand("retry")}
                className="flex-1 rounded-full bg-[#2B3AFF] px-4 py-3 text-sm font-bold text-white hover:brightness-110"
              >
                Run again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Touch: hold-to-reverse ---- */}
      {isTouchDevice && !free && g.job !== "late" && g.job !== "idle" && (
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
