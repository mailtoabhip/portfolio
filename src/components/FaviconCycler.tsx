"use client";

import { useEffect } from "react";

/**
 * Animated favicon: Mudra blue ↔ magenta, every 0.5 s.
 * Firefox animates /favicon.gif on its own; Chrome, Edge and Safari
 * only show a GIF's first frame, so this swaps between the three PNG
 * frames instead. Stops for people who prefer reduced motion.
 */
const FRAMES = ["/fav-0.png", "/fav-1.png"];

export default function FaviconCycler() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (/firefox/i.test(navigator.userAgent)) return; // the GIF already animates there
    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    let link = document.querySelector<HTMLLinkElement>("link#fav-cycle");
    const ownsLink = !link;
    if (!link) {
      link = document.createElement("link");
      link.id = "fav-cycle";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    // React owns the metadata icon nodes. Deleting them breaks route
    // reconciliation (removeChild on a detached node). Update their URLs
    // instead, and remove only the extra link that this effect created.
    const originals = new Map<HTMLLinkElement, { href: string | null; type: string | null }>();
    // Frame comes from the clock, so a busy main thread (the 3D scene)
    // can delay a tick but never drift the 0.5 s rhythm.
    let shown = -1;
    const tick = () => {
      const i = Math.floor(Date.now() / 500) % FRAMES.length;
      if (i === shown) return;
      shown = i;
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((icon) => {
        if (!originals.has(icon)) originals.set(icon, { href: icon.getAttribute("href"), type: icon.getAttribute("type") });
        icon.href = FRAMES[i];
        icon.type = "image/png";
      });
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(id);
      for (const [icon, original] of originals) {
        if (!icon.isConnected) continue;
        for (const [name, value] of Object.entries(original)) {
          if (value === null) icon.removeAttribute(name);
          else icon.setAttribute(name, value);
        }
      }
      if (ownsLink) link?.remove();
    };
  }, []);
  return null;
}
