"use client";

import { useEffect } from "react";
import { useNightRun } from "@/lib/store";
import { SHEETS } from "@/lib/destinations";
import { drive } from "@/lib/driveState";
import { TRACK_TITLE, TRACK_ARTIST } from "@/lib/audio";
import EntryView from "@/components/EntryView";

/**
 * The Tablet OS — fullscreen overlay the in-cab Tablet mesh opens.
 * Replaces the old paper-waybill ReadOverlay: same fullscreen shell/
 * cross-fade timing, new claymorphic chrome, new `tabletApp` levels:
 *
 *   "home"          → three claymorphic app tiles
 *   "case-studies"  → destination === null: the index (parchment)
 *                     destination set: that entry (parchment)
 *   "resume"        → destination is forced to "manifest" by the
 *                     store, same parchment entry template, no list
 *   "music"         → claymorphic player (OS chrome, not parchment)
 *
 * closeSheet() (in lib/store.ts) owns all the step-back logic; this
 * component only renders whatever level the store says it's on.
 */

const CLAY_PANEL =
  "rounded-[28px] bg-gradient-to-b from-[#243244] to-[#1a2230] shadow-[0_18px_40px_-12px_rgba(6,10,20,0.65),inset_0_2px_2px_rgba(147,168,209,0.14),inset_0_-8px_14px_rgba(6,10,20,0.4)]";

function CaseStudiesGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="6" y="4" width="16" height="20" rx="4" stroke="#8fe9ff" strokeWidth="1.4" />
      <rect x="9" y="9" width="10" height="1.6" rx="0.8" fill="#8fe9ff" opacity="0.7" />
      <rect x="9" y="14" width="10" height="1.6" rx="0.8" fill="#8fe9ff" opacity="0.7" />
      <rect x="9" y="19" width="6" height="1.6" rx="0.8" fill="#8fe9ff" opacity="0.7" />
    </svg>
  );
}
function ResumeGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="7" y="4" width="16" height="22" rx="5" stroke="#ffb65c" strokeWidth="1.4" />
      <circle cx="15" cy="11" r="2.6" stroke="#ffb65c" strokeWidth="1.3" />
      <path d="M10 20c0-3 2.5-4.5 5-4.5s5 1.5 5 4.5" stroke="#ffb65c" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function MusicGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="10" cy="22" r="3" stroke="#8fe9ff" strokeWidth="1.4" />
      <circle cx="21" cy="19" r="3" stroke="#8fe9ff" strokeWidth="1.4" />
      <path d="M13 22V8.5L24 6v10.5" stroke="#8fe9ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppTile({
  glyph,
  label,
  sub,
  onClick,
}: {
  glyph: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${CLAY_PANEL} group flex flex-col items-center justify-center gap-2.5 w-full aspect-square p-6 transition-transform duration-150 active:scale-[0.96] hover:-translate-y-0.5`}
    >
      <span className="w-14 h-14 rounded-2xl bg-[#0f1620]/60 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
        {glyph}
      </span>
      <span className="font-mono text-sm tracking-[0.12em] uppercase text-neutral-100">
        {label}
      </span>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-400">
        {sub}
      </span>
    </button>
  );
}

function PlayerButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${
        primary ? "w-16 h-16" : "w-11 h-11"
      } rounded-full bg-gradient-to-b from-[#2a3a4e] to-[#1a2230] shadow-[0_8px_16px_-4px_rgba(6,10,20,0.6),inset_0_2px_2px_rgba(147,168,209,0.16),inset_0_-4px_8px_rgba(6,10,20,0.4)] flex items-center justify-center text-[#8fe9ff] font-mono transition-transform active:scale-90 active:shadow-[inset_0_4px_8px_rgba(6,10,20,0.6)]`}
      aria-label={label}
    >
      {label}
    </button>
  );
}

export default function TabletOS() {
  const phase = useNightRun((s) => s.phase);
  const tabletApp = useNightRun((s) => s.tabletApp);
  const destination = useNightRun((s) => s.destination);
  const delivered = useNightRun((s) => s.delivered);
  const closeSheet = useNightRun((s) => s.closeSheet);
  const selectDestination = useNightRun((s) => s.selectDestination);
  const openTabletApp = useNightRun((s) => s.openTabletApp);
  const setPhase = useNightRun((s) => s.setPhase);
  const audioOn = useNightRun((s) => s.audioOn);
  const toggleAudio = useNightRun((s) => s.toggleAudio);

  // Complete the return: tablet fades/scales down (~0.6s), then cruising.
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

  const showParchment = tabletApp === "case-studies" || tabletApp === "resume";

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-500 ${
        open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div
        className={`relative w-[calc(100vw-32px)] sm:w-[min(92vw,860px)] h-[min(88vh,1100px)] overflow-y-auto ${
          showParchment
            ? "bg-[#efeade] text-[#1d1a15] rounded-sm shadow-2xl"
            : `${CLAY_PANEL} text-neutral-100`
        }`}
        style={{ touchAction: "pan-y" }}
      >
        {tabletApp === "home" && (
          <div className="p-8 md:p-14 pb-24 sm:pb-14">
            <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.3em] uppercase text-neutral-400">
              <span>The Night Run</span>
              <span>Tablet</span>
            </div>
            {/* Status strip — diegetic, cheap, optional polish */}
            <div className="mt-5 flex gap-6 font-mono text-[11px] tracking-[0.15em] uppercase text-neutral-400">
              <span>
                Deliveries <span className="text-[#8fe9ff]">{delivered.length}/{SHEETS.length}</span>
              </span>
              <span>
                Next drop{" "}
                <span className="text-[#ffb65c]">
                  {drive.nextStopDist >= 0 ? `${drive.nextStopDist}m` : "—"}
                </span>
              </span>
            </div>
            <h1 className="mt-5 text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Good evening, driver
            </h1>
            <p className="mt-2 font-mono text-xs text-neutral-400">
              Everything aboard, one tap away.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-xl">
              <AppTile
                glyph={<CaseStudiesGlyph />}
                label="Case Studies"
                sub={`${SHEETS.length} entries`}
                onClick={() => openTabletApp("case-studies")}
              />
              <AppTile
                glyph={<ResumeGlyph />}
                label="Resume"
                sub="the manifest"
                onClick={() => openTabletApp("resume")}
              />
              <AppTile
                glyph={<MusicGlyph />}
                label="Music"
                sub={audioOn ? "playing" : "paused"}
                onClick={() => openTabletApp("music")}
              />
            </div>
          </div>
        )}

        {tabletApp === "case-studies" && (
          <div className="p-8 md:p-14 pb-24 sm:pb-14">
            {destination === null ? (
              <>
                <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.3em] uppercase text-[#8a8272]">
                  <span>The Night Run</span>
                  <span>Case Studies</span>
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
                        className="group w-full min-h-[44px] flex items-center gap-5 py-4 text-left hover:bg-[#e6dfce] -mx-3 px-3 rounded transition-colors"
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
        )}

        {tabletApp === "resume" && destination && (
          <div className="p-8 md:p-14 pb-24 sm:pb-14">
            <EntryView slug={destination} />
          </div>
        )}

        {tabletApp === "music" && (
          <div className="p-8 md:p-14 pb-8 flex flex-col items-center">
            <div className="flex items-baseline justify-between w-full font-mono text-[11px] tracking-[0.3em] uppercase text-neutral-400">
              <span>The Night Run</span>
              <span>Music</span>
            </div>
            {/* Album-art tile */}
            <div
              className={`${CLAY_PANEL} mt-6 w-full max-w-[220px] aspect-square flex items-center justify-center`}
            >
              <MusicGlyph />
            </div>
            <p className="mt-6 text-xl font-semibold tracking-tight text-white">
              {TRACK_TITLE}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.2em] uppercase text-neutral-400">
              {TRACK_ARTIST}
            </p>
            <div className="mt-6 flex items-center gap-6">
              <PlayerButton label={audioOn ? "❙❙" : "▶"} primary onClick={toggleAudio} />
            </div>
            <p className="mt-6 mb-24 font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500">
              keeps playing after you close the tablet
            </p>
          </div>
        )}
      </div>

      {/* Step back — full-width bottom bar on phones (44px+ touch
          target, thumb-reachable), the small centered pill from
          `sm:` up. */}
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
