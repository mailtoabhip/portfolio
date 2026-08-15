"use client";

import { useEffect, useRef, useState } from "react";
import { useNightRun } from "@/lib/store";
import { input, isTouchDevice } from "@/lib/controls";
import { orientationInput } from "@/lib/orientationInput";

/**
 * Minimal horizontal steer strip — the fallback when tilt permission
 * is denied or the device has no orientation sensor. Only mounts
 * once `orientationInput.fallbackNeeded` is set, polled at a humane
 * rate (this is a rare, session-long state, not a 60fps value).
 */
export default function TouchSteerFallback() {
  const phase = useNightRun((s) => s.phase);
  const [show, setShow] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!isTouchDevice) return;
    const id = window.setInterval(() => setShow(orientationInput.fallbackNeeded), 300);
    return () => window.clearInterval(id);
  }, []);

  if (!isTouchDevice || !show || phase !== "cruising") return null;

  const steerFromEvent = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    input.steer = Math.max(-1, Math.min(1, (x - 0.5) * 2));
  };

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    steerFromEvent(e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragging.current) steerFromEvent(e);
  };
  const onUp = () => {
    dragging.current = false;
    input.steer = 0;
  };

  return (
    <div
      ref={trackRef}
      className="fixed left-1/2 -translate-x-1/2 z-30 w-[min(80vw,360px)] h-14 rounded-full border border-[#8fe9ff]/40 bg-black/30"
      style={{
        touchAction: "none",
        bottom: "max(28px, env(safe-area-inset-bottom))",
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-[#8fe9ff]/25" />
    </div>
  );
}
