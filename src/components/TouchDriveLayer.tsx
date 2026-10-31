"use client";

import { useEffect, useRef, useState } from "react";
import { useNightRun } from "@/lib/store";
import { isTouchDevice, setTouchThrottle } from "@/lib/controls";

/**
 * The mobile throttle: the whole viewport is one hold-to-go zone.
 * Sits at z-30 — below every real HUD button (z-40) and *as a
 * sibling*, not an ancestor, of them. A tap that lands on the day/
 * night badge is resolved to that button by normal DOM hit-testing
 * (topmost element at the point wins) and never reaches this layer's
 * handlers at all, so icon exclusion needs no manual rect math.
 *
 * Multi-touch: any single active contact holds throttle — a counter,
 * not a boolean, so a second accidental finger never drops it early.
 */

interface Glow {
  id: number;
  x: number;
  y: number;
}

export default function TouchDriveLayer() {
  const phase = useNightRun((s) => s.phase);
  const [glows, setGlows] = useState<Glow[]>([]);
  const activeTouches = useRef(0);
  const nextGlowId = useRef(0);
  // Touch detection differs between server and client render: mount
  // after hydration to avoid a hydration mismatch on phones.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => setTouchThrottle(false);
  }, []);

  useEffect(() => {
    if (phase !== "cruising" && activeTouches.current > 0) {
      activeTouches.current = 0;
      setTouchThrottle(false);
    }
  }, [phase]);

  if (!mounted || !isTouchDevice) return null;

  const engage = (x: number, y: number) => {
    activeTouches.current += 1;
    setTouchThrottle(true);
    const id = nextGlowId.current++;
    setGlows((g) => [...g, { id, x, y }]);
    window.setTimeout(() => setGlows((g) => g.filter((it) => it.id !== id)), 400);
  };

  const disengage = () => {
    activeTouches.current = Math.max(0, activeTouches.current - 1);
    if (activeTouches.current === 0) setTouchThrottle(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "cruising") return;
    engage(e.clientX, e.clientY);
  };
  const onPointerUp = () => {
    if (phase !== "cruising") return;
    disengage();
  };

  return (
    <div
      className="fixed inset-0 z-30"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {glows.map((g) => (
        <span
          key={g.id}
          className="absolute rounded-full pointer-events-none touch-glow"
          style={{
            left: g.x - 60,
            top: g.y - 60,
            width: 120,
            height: 120,
            background: "radial-gradient(circle, rgba(255,182,92,0.15), transparent 70%)",
          }}
        />
      ))}
    </div>
  );
}
