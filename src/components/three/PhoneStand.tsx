"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useNightRun } from "@/lib/store";
import { drive } from "@/lib/driveState";
import { CLAY_ACCENT_AMBER, makeScreenMaterial } from "@/lib/clayMaterials";
import ContactShadow from "@/components/three/ContactShadow";

/**
 * The phone on its clip-stand — right of the steering wheel. Separate
 * and simpler than the Tablet: no fullscreen OS, no case-study/resume/
 * music access. Shows a glanceable readout, and tapping it pops its
 * own screen — a contact card — via `phoneOpen` (PhoneCard.tsx), a
 * store flag independent of the tablet's phase machine.
 */

function drawReadout(speedMs: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 220;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, "#1c3446");
  grad.addColorStop(1, "#0e1c28");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 160, 220);
  ctx.fillStyle = "#ffb65c";
  ctx.textAlign = "center";
  ctx.font = "600 11px 'Courier New', monospace";
  ctx.globalAlpha = 0.75;
  ctx.fillText("SPEED", 80, 70);
  ctx.font = "700 40px 'Courier New', monospace";
  ctx.globalAlpha = 1;
  ctx.fillText(`${Math.round(speedMs * 3.6)}`, 80, 118);
  ctx.font = "600 11px 'Courier New', monospace";
  ctx.globalAlpha = 0.75;
  ctx.fillText("KM/H", 80, 140);
  ctx.font = "600 10px 'Courier New', monospace";
  ctx.fillStyle = "#8fe9ff";
  ctx.globalAlpha = 0.85;
  ctx.fillText("☎ TAP TO CONNECT", 80, 205);
  return c;
}

export default function PhoneStand() {
  const quality = useNightRun((s) => s.quality);
  const openPhoneScreen = useNightRun((s) => s.openPhoneScreen);
  const [hovered, setHovered] = useState(false);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const lowTier = quality === 0;

  const bodyGeo = useMemo(
    () => new RoundedBoxGeometry(0.15, 0.3, 0.016, lowTier ? 1 : 3, lowTier ? 0.006 : 0.02),
    [lowTier]
  );

  const texture = useMemo(() => {
    if (lowTier) return null;
    const tex = new THREE.CanvasTexture(drawReadout(drive.speed));
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowTier]);

  const screenMat = useMemo(() => {
    if (lowTier || !texture) return new THREE.MeshBasicMaterial({ color: "#0e161c" });
    const mat = makeScreenMaterial(texture, "#5da8c4");
    mat.emissiveIntensity = 0.8;
    return mat;
  }, [lowTier, texture]);

  // Redraw the readout on a humane interval (not per-frame) — it's a
  // glanceable prop, not a live gauge.
  useEffect(() => {
    if (lowTier) return;
    const id = setInterval(() => {
      const tex = textureRef.current;
      if (!tex) return;
      tex.image = drawReadout(drive.speed);
      tex.needsUpdate = true;
    }, 250);
    return () => clearInterval(id);
  }, [lowTier]);

  return (
    // Right of the steering wheel (wheel sits at x=0).
    <group position={[0.62, 0.92, -1.08]} rotation={[-0.3, -0.35, 0.1]}>
      {/* Gooseneck clip-stand: a short curved arm off the dash */}
      <mesh position={[0, -0.13, -0.02]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.14, 8]} />
        <meshStandardMaterial color={CLAY_ACCENT_AMBER} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.03, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color={CLAY_ACCENT_AMBER} roughness={0.5} metalness={0.05} />
      </mesh>

      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          openPhoneScreen();
        }}
        scale={hovered ? 1.03 : 1}
      >
        <mesh geometry={bodyGeo}>
          <meshStandardMaterial
            color="#1d2126"
            roughness={0.5}
            metalness={0.05}
            emissive="#3a6a80"
            emissiveIntensity={0.22}
          />
        </mesh>
        <mesh position={[0, 0, 0.009]} material={screenMat}>
          <planeGeometry args={[0.125, 0.26]} />
        </mesh>
      </group>

      <ContactShadow position={[0, -0.17, 0.02]} radius={0.12} opacity={0.45} />
    </group>
  );
}
