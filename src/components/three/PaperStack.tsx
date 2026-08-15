"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNightRun } from "@/lib/store";

/**
 * ONE stack of papers lying on the dash (replaces the 8-sheet row).
 * Click → opens the waybill index (ReadOverlay). Hover → the top
 * sheet lifts at a corner like a breeze caught it.
 *
 * Labels are CanvasTextures — drei <Text>/troika is banned in this
 * stack (silently blacks out the scene).
 */

function drawTopSheet(): HTMLCanvasElement {
  const W = 256;
  const H = 354;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#d6d0c0";
  ctx.fillRect(0, 0, W, H);
  const edge = ctx.createLinearGradient(0, 0, 0, H);
  edge.addColorStop(0, "rgba(0,0,0,0.10)");
  edge.addColorStop(0.08, "rgba(0,0,0,0)");
  edge.addColorStop(0.92, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "#8a8270";
  ctx.font = "600 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("THE NIGHT RUN", W / 2, 44);
  ctx.strokeStyle = "#a89f8a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 60);
  ctx.lineTo(W - 28, 60);
  ctx.stroke();

  // Title
  ctx.fillStyle = "#2a2721";
  ctx.font = "700 44px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText("WAYBILL", W / 2, 150);
  ctx.font = "600 16px 'Courier New', monospace";
  ctx.fillStyle = "#6b6455";
  ctx.fillText("8 DELIVERIES ABOARD", W / 2, 184);

  // Fake manifest lines (it's a document, not a button)
  ctx.strokeStyle = "#b5ac96";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(40, 226 + i * 18);
    ctx.lineTo(W - 40 - Math.random() * 50, 226 + i * 18);
    ctx.stroke();
  }

  // Call to action
  ctx.fillStyle = "#8a8270";
  ctx.font = "600 13px 'Courier New', monospace";
  ctx.fillText("— CLICK TO OPEN —", W / 2, H - 20);

  return c;
}

export default function PaperStack() {
  const top = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const openIndex = useNightRun((s) => s.openIndex);
  const phase = useNightRun((s) => s.phase);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawTopSheet());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);

  // Under-sheets: fixed messy offsets (stable across renders)
  const underSheets = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        y: -0.004 * (i + 1),
        rot: (Math.random() - 0.5) * 0.14,
        dx: (Math.random() - 0.5) * 0.012,
        dz: (Math.random() - 0.5) * 0.012,
        shade: 0.82 - i * 0.06,
      })),
    []
  );

  useFrame((_, rawDelta) => {
    const g = top.current;
    if (!g) return;
    const d = Math.min(1, Math.min(rawDelta, 0.1) * 8);
    // Hover: the top sheet lifts and tips toward the driver
    const ty = hovered ? 0.045 : 0;
    const trx = hovered ? 0.35 : 0;
    g.position.y += (ty - g.position.y) * d;
    g.rotation.x += (trx - g.rotation.x) * d;
  });

  const interactive = phase === "cruising";

  return (
    // Lying nearly flat on the dash top, left of the wheel, tipped
    // just enough toward the driver to be readable from the seat.
    <group position={[-0.52, 1.04, -1.18]} rotation={[-1.35, 0, 0.08]}>
      {/* Under-stack: slightly offset blank papers */}
      {underSheets.map((s, i) => (
        <mesh
          key={i}
          position={[s.dx, s.dz, s.y]}
          rotation={[0, 0, s.rot]}
        >
          <planeGeometry args={[0.27, 0.37]} />
          <meshStandardMaterial
            color={new THREE.Color("#d6d0c0").multiplyScalar(s.shade)}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Top sheet (interactive) */}
      <group
        ref={top}
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
            openIndex();
          }
        }}
      >
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[0.27, 0.37]} />
          <meshStandardMaterial
            map={texture}
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={hovered ? 0.5 : 0.26}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
