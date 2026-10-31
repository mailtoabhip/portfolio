"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useNightRun } from "@/lib/store";
import { CLAY_ACCENT_CYAN, makeScreenMaterial, applyFresnelRim } from "@/lib/clayMaterials";
import ContactShadow from "@/components/three/ContactShadow";

/**
 * The tablet — mounted center-dash on a small rounded arm, angled
 * toward the driver, clear of the road/headlight cone. This is the
 * mesh + click hotspot ONLY: tapping it triggers the fullscreen
 * Tablet OS (TabletOS.tsx) via the store; this component never
 * renders that content itself (architecture doc).
 *
 * Sole manual entry point into the reading experience now — the old
 * paper waybill prop is gone.
 */

function drawIdleScreen(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 90, 10, 128, 90, 150);
  grad.addColorStop(0, "#4fa8c9");
  grad.addColorStop(1, "#123246");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 180);
  ctx.fillStyle = "#eafcff";
  ctx.font = "600 13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("◈  TAP TO OPEN", 128, 96);
  ctx.font = "500 10px 'Courier New', monospace";
  ctx.globalAlpha = 0.8;
  ctx.fillText("portfolio · work · resume", 128, 116);
  return c;
}

export default function Tablet() {
  const quality = useNightRun((s) => s.quality);
  const phase = useNightRun((s) => s.phase);
  const openTablet = useNightRun((s) => s.openTablet);
  const [hovered, setHovered] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const lift = useRef<THREE.Group>(null);

  const interactive = phase === "cruising";
  const lowTier = quality === 0;
  const bezelMat = useRef<THREE.MeshStandardMaterial>(null);

  const bodyGeo = useMemo(
    () => new RoundedBoxGeometry(0.34, 0.22, 0.02, lowTier ? 1 : 3, lowTier ? 0.01 : 0.03),
    [lowTier]
  );
  const armGeo = useMemo(
    () => new RoundedBoxGeometry(0.045, 0.21, 0.045, 2, 0.018),
    []
  );

  // Screen shows a live-looking preview of the portfolio homepage
  // (public/portfolio/preview.jpg) with a small "tap to open" pill.
  // The old idle canvas stays as the first frame until the image loads.
  const texture = useMemo(() => {
    if (lowTier) return null;
    const tex = new THREE.CanvasTexture(drawIdleScreen());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [lowTier]);

  useEffect(() => {
    if (!texture) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 600;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // "Tap to open" pill, bottom-right
      const label = "TAP TO OPEN  \u2197";
      ctx.font = "700 22px 'Courier New', monospace";
      const w = ctx.measureText(label).width + 36;
      const x = c.width - w - 22;
      const y = c.height - 58;
      ctx.fillStyle = "#2B3AFF";
      ctx.fillRect(x, y, w, 40);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 18, y + 21);
      // New size: drop the GPU copy so three re-allocates it.
      texture.dispose();
      texture.image = c;
      texture.needsUpdate = true;
      setPreviewReady(true);
    };
    img.src = `${window.location.pathname.replace(/\/$/, "")}/portfolio/preview.jpg`;
    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [texture]);

  const screenMat = useMemo(() => {
    if (lowTier || !texture) {
      return new THREE.MeshBasicMaterial({ color: "#12222c" });
    }
    // Neutral glow once the page preview is in, so the cream/blue
    // portfolio colours read true instead of being tinted cyan.
    const mat = makeScreenMaterial(texture, previewReady ? "#ffffff" : "#5da8c4");
    mat.emissiveIntensity = previewReady ? 0.92 : 0.85;
    return mat;
  }, [lowTier, texture, previewReady]);

  useFrame((_, rawDelta) => {
    const g = lift.current;
    if (!g) return;
    const d = Math.min(1, Math.min(rawDelta, 0.1) * 8);
    const ty = hovered && interactive ? 0.012 : 0;
    g.position.z += (ty - g.position.z) * d;
  });

  // Fake-subsurface rim on the bezel — the "single most on-trend
  // object in the cab," per the brief, so it earns the tier-2 rim
  // treatment other clay objects only get on the tree canopy.
  useEffect(() => {
    if (lowTier || quality < 2 || !bezelMat.current) return;
    applyFresnelRim(bezelMat.current, { color: "#8fe9ff", power: 2.0, intensity: 0.3 });
  }, [lowTier, quality]);

  return (
    // Center dash, on a short arm standing clear of the dashboard
    // slab (which tops out at y=0.95) — between the instrument
    // cluster (x=0) and the center console (x=-0.85).
    <group position={[-0.4, 1.16, -1.15]}>
      {/* Cradle arm rising off the dash, straight up to the screen */}
      <mesh geometry={armGeo} position={[0, -0.105, 0]}>
        <meshStandardMaterial color={CLAY_ACCENT_CYAN} roughness={0.5} metalness={0.05} />
      </mesh>

      <group
        ref={lift}
        rotation={[-0.5, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) {
            document.body.style.cursor = "auto";
            setHovered(false);
            openTablet();
          }
        }}
      >
        {/* Rounded bezel body */}
        <mesh geometry={bodyGeo}>
          <meshStandardMaterial
            ref={bezelMat}
            color="#1d2126"
            roughness={0.5}
            metalness={0.05}
            emissive="#3a6a80"
            emissiveIntensity={0.25}
          />
        </mesh>
        {/* Screen, flush on the face */}
        <mesh position={[0, 0, 0.011]} material={screenMat}>
          <planeGeometry args={[0.29, 0.17]} />
        </mesh>
      </group>

      <ContactShadow position={[0, -0.2, 0.02]} radius={0.22} opacity={0.5} />
    </group>
  );
}
