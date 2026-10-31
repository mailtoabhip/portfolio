"use client";

import { useEffect } from "react";
import { useNightRun } from "@/lib/store";

/**
 * The Tablet OS — fullscreen overlay the in-cab Tablet mesh (or the
 * Portfolio button) opens. It shows one thing: the portfolio
 * (public/portfolio/index.html) in an iframe on a tablet-shaped
 * screen, with a music toggle on the bezel. Exit returns to the road.
 */

export default function TabletOS() {
  const phase = useNightRun((s) => s.phase);
  const closeSheet = useNightRun((s) => s.closeSheet);
  const setPhase = useNightRun((s) => s.setPhase);
  const audioOn = useNightRun((s) => s.audioOn);
  const toggleAudio = useNightRun((s) => s.toggleAudio);

  // Complete the return: tablet fades/scales down (~0.6s), then cruising.
  useEffect(() => {
    if (phase !== "returning") return;
    const t = setTimeout(() => setPhase("cruising"), 600);
    return () => clearTimeout(t);
  }, [phase, setPhase]);

  // Esc closes the tablet
  useEffect(() => {
    if (phase !== "reading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, closeSheet]);

  // The portfolio lives in /public/portfolio. Resolve it against the
  // current page path so it also works under a GitHub Pages basePath.
  const portfolioSrc =
    typeof window === "undefined"
      ? "portfolio/index.html"
      : `${window.location.pathname.replace(/\/$/, "")}/portfolio/index.html`;

  const open = phase === "reading";
  if (!open && phase !== "returning") return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-500 ${
        open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div
        className="relative w-[calc(100vw-16px)] sm:w-[min(96vw,1240px)] h-[min(90vh,860px)] rounded-[34px] bg-gradient-to-b from-[#1d2126] to-[#111418] p-3 sm:p-4 pb-16 sm:pb-4 text-neutral-100 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(147,168,209,0.14),inset_0_0_0_1px_rgba(143,233,255,0.12)]"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex h-full flex-col">
            {/* Tablet status bar, drawn on the bezel */}
            <div className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400">
              <span>The Night Run · Tablet</span>
              <button
                onClick={toggleAudio}
                className="flex items-center gap-2 rounded-full px-3 py-1 text-[#8fe9ff] transition-colors hover:bg-white/5"
                aria-label={audioOn ? "Pause music" : "Play music"}
              >
                <span>{audioOn ? "❙❙" : "▶"}</span>
                <span className="hidden sm:inline">{audioOn ? "Music on" : "Music off"}</span>
              </button>
            </div>
            {/* The screen: the full portfolio, served from /public/portfolio */}
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-[#EDE9E0] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6)]">
              <iframe
                src={portfolioSrc}
                title="Abhijeet Purandare — portfolio"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
        </div>
      </div>

      {/* Exit — full-width bottom bar on phones (44px+ touch target,
          thumb-reachable), the small centered pill from `sm:` up. */}
      <button
        onClick={closeSheet}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        className="fixed inset-x-0 bottom-0 z-50 w-full min-h-[44px] rounded-none pt-4 sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:w-auto sm:-translate-x-1/2 sm:rounded-full sm:px-5 sm:py-2.5 sm:pb-2.5 font-mono text-[11px] tracking-[0.3em] uppercase border-t sm:border border-neutral-600 text-neutral-300 bg-black/80 sm:bg-black/60 hover:bg-black/90 sm:hover:bg-black/80 hover:text-white transition-colors"
      >
        ← Exit tablet / Return to the road
      </button>
    </div>
  );
}
