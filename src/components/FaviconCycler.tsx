"use client";

import { useEffect } from "react";

/**
 * Animated favicon: magenta → blue → white, every 0.5 s.
 * Firefox animates /favicon.gif on its own; Chrome, Edge and Safari
 * only show a GIF's first frame, so this swaps between the three PNG
 * frames instead. Stops for people who prefer reduced motion.
 */
const FRAMES = ["/fav-0.png", "/fav-1.png", "/fav-2.png"];

export default function FaviconCycler() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (/firefox/i.test(navigator.userAgent)) return; // the GIF already animates there
    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    let link = document.querySelector<HTMLLinkElement>("link#fav-cycle");
    if (!link) {
      link = document.createElement("link");
      link.id = "fav-cycle";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    // The static GIF link can be re-inserted by the framework after
    // hydration; drop it on every tick so the cycling icon always wins.
    const dropStatic = () =>
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]:not(#fav-cycle)').forEach((l) => l.remove());
    dropStatic();
    // Frame comes from the clock, so a busy main thread (the 3D scene)
    // can delay a tick but never drift the 0.5 s rhythm.
    let shown = -1;
    const tick = () => {
      const i = Math.floor(Date.now() / 500) % FRAMES.length;
      if (i === shown) return;
      shown = i;
      dropStatic();
      link!.href = FRAMES[i];
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
