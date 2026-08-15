"use client";

import { useEffect } from "react";
import { useNightRun } from "@/lib/store";
import { SHEETS } from "@/lib/destinations";
import EntryView from "@/components/EntryView";

/**
 * Read mode (§17.3): the waybill, opened. Two levels:
 *   destination == null → the INDEX (clickable manifest of deliveries)
 *   destination set     → that entry's content (template in Step 11)
 * closeSheet steps back one level; from the index it returns to the road.
 */
export default function ReadOverlay() {
  const phase = useNightRun((s) => s.phase);
  const destination = useNightRun((s) => s.destination);
  const delivered = useNightRun((s) => s.delivered);
  const closeSheet = useNightRun((s) => s.closeSheet);
  const selectDestination = useNightRun((s) => s.selectDestination);
  const setPhase = useNightRun((s) => s.setPhase);

  // Complete the return: waybill "drops back" (~0.6s), then cruising.
  useEffect(() => {
    if (phase !== "returning") return;
    const t = setTimeout(() => setPhase("cruising"), 600);
    return () => clearTimeout(t);
  }, [phase, setPhase]);

  // Esc steps back one level
  useEffect(() => {
    if (phase !== "reading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, closeSheet]);

  const open = phase === "reading";
  if (!open && phase !== "returning") return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-500 ${
        open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      {/* The waybill, reading size */}
      <div className="relative w-[min(92vw,860px)] h-[min(88vh,1100px)] bg-[#efeade] text-[#1d1a15] rounded-sm shadow-2xl overflow-y-auto">
        <div className="p-8 md:p-14">
          {destination === null ? (
            <>
              {/* ============ INDEX ============ */}
              <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.3em] uppercase text-[#8a8272]">
                <span>The Night Run</span>
                <span>Waybill</span>
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
                8 deliveries aboard
              </h1>
              <p className="mt-2 font-mono text-xs text-[#8a8272]">
                Every delivery is a problem someone needed solved.
              </p>
              <hr className="my-7 border-[#d6cfbe]" />
              <ol className="divide-y divide-[#e0d9c8]">
                {SHEETS.map((s, i) => (
                  <li key={s.slug}>
                    <button
                      onClick={() => selectDestination(s.slug)}
                      className="group w-full flex items-center gap-5 py-4 text-left hover:bg-[#e6dfce] -mx-3 px-3 rounded transition-colors"
                    >
                      <span className="font-mono text-xs text-[#a89f8a] w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold tracking-tight text-lg group-hover:translate-x-0.5 transition-transform">
                          {s.locked && "🔒 "}
                          {s.label.replace("\n", " ")}
                        </span>
                        <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a8272] mt-0.5">
                          {s.sub}
                        </span>
                      </span>
                      {delivered.includes(s.slug) && (
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-1 border-2 border-[#4a7c59] text-[#4a7c59] rounded rotate-[-4deg] shrink-0">
                          ✓ Delivered
                        </span>
                      )}
                      <span className="font-mono text-[#a89f8a] group-hover:text-[#1d1a15] transition-colors">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <EntryView slug={destination} />
          )}
        </div>
      </div>

      {/* Step back */}
      <button
        onClick={closeSheet}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-mono text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 rounded-full border border-neutral-600 text-neutral-300 bg-black/60 hover:bg-black/80 hover:text-white transition-colors"
      >
        {destination ? "← Back to the waybill" : "← Return to the road"}
      </button>
    </div>
  );
}
