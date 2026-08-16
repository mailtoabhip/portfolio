"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Cheap "lifted off the surface" contact shadow — a soft radial-
 * gradient decal on a thin plane, not a real shadow map. One shared
 * texture reused by every caller (tablet, phone, gear shifter, crate,
 * signposts) since it's the same gradient every time, just scaled.
 */
let sharedTexture: THREE.CanvasTexture | null = null;
function getTexture(): THREE.CanvasTexture {
  if (sharedTexture) return sharedTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0, "rgba(0,0,0,0.45)");
  grad.addColorStop(0.7, "rgba(0,0,0,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedTexture = new THREE.CanvasTexture(c);
  return sharedTexture;
}

export default function ContactShadow({
  position,
  radius = 0.25,
  opacity = 0.8,
}: {
  position: [number, number, number];
  radius?: number;
  opacity?: number;
}) {
  const texture = useMemo(() => getTexture(), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={opacity}
      />
    </mesh>
  );
}
