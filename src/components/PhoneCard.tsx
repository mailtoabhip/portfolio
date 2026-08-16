"use client";

import { useEffect } from "react";
import { useNightRun } from "@/lib/store";

/**
 * The phone's popped-up screen — a small contact card, independent of
 * the tablet's fullscreen OS/phase machine. Driving continues
 * underneath; this is a quick glance, not a "reading" mode.
 */
const PHONE = "8999633581";
const EMAIL = "abhijeet.designmail@gmail.com";

export default function PhoneCard() {
  const open = useNightRun((s) => s.phoneOpen);
  const close = useNightRun((s) => s.closePhoneScreen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[260px] rounded-[36px] bg-gradient-to-b from-[#243244] to-[#161f2c] p-2 shadow-[0_24px_50px_-12px_rgba(6,10,20,0.7),inset_0_2px_2px_rgba(147,168,209,0.14)]"
      >
        <div className="rounded-[28px] bg-[#0f1620] px-6 py-10 flex flex-col items-center text-center">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-[#161f2c]" />

          <span className="mt-4 w-16 h-16 rounded-full bg-[#1d2f3f] flex items-center justify-center text-2xl">
            👤
          </span>
          <p className="mt-4 font-mono text-[11px] tracking-[0.25em] uppercase text-neutral-400">
            Reach the driver
          </p>

          <a
            href={`tel:${PHONE}`}
            className="mt-6 w-full rounded-2xl bg-[#1a2735] py-3 px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] hover:bg-[#20303f] transition-colors"
          >
            <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#8fe9ff]">
              Call
            </span>
            <span className="block mt-1 text-white font-semibold tracking-wide">{PHONE}</span>
          </a>

          <a
            href={`mailto:${EMAIL}`}
            className="mt-3 w-full rounded-2xl bg-[#1a2735] py-3 px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] hover:bg-[#20303f] transition-colors"
          >
            <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#ffb65c]">
              Email
            </span>
            <span className="block mt-1 text-white font-semibold text-sm break-all">{EMAIL}</span>
          </a>

          <button
            onClick={close}
            className="mt-6 font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ✕ close
          </button>
        </div>
      </div>
    </div>
  );
}
