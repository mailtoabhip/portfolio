"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useNightRun } from "@/lib/store";
import { useTruckView } from "@/lib/truckView";

export default function CameraSwitch() {
  const phase = useNightRun((s) => s.phase);
  const mode = useTruckView((s) => s.mode);
  const asset = useTruckView((s) => s.asset);
  const toggle = useTruckView((s) => s.toggle);
  const openTablet = useNightRun((s) => s.openTablet);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
          target?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.key.toLowerCase() === "c" && useNightRun.getState().phase === "cruising") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
  if (phase !== "cruising") return null;
  return (
    <div className="fixed left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 text-xs text-white lg:left-8 lg:top-8 lg:translate-y-0 lg:flex-row">
      <button type="button" onClick={toggle} disabled={asset !== "ready"}
        aria-label={mode === "cabin" ? "Switch to chase camera" : "Switch to cabin camera"}
        aria-pressed={mode === "chase"}
        className="min-h-11 rounded-full border border-white/20 bg-black/65 px-4 backdrop-blur disabled:opacity-60">
        {asset === "loading" ? "Loading truck…" : asset === "error" ? "Exterior unavailable" :
          mode === "cabin" ? "Chase camera · C" : "Cabin camera · C"}
      </button>
      {mode === "chase" && (
        <button type="button" onClick={openTablet}
          className="min-h-11 rounded-full border border-white/20 bg-black/65 px-4 backdrop-blur">
          Open portfolio
        </button>
      )}
      <Link href="/open-world" className="flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-black/65 px-4 backdrop-blur">
        Open world
      </Link>
    </div>
  );
}
