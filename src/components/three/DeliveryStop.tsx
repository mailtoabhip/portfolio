"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHEETS } from "@/lib/destinations";
import { useNightRun, type Destination } from "@/lib/store";
import { drive } from "@/lib/driveState";
import { applyBoxRounding } from "@/lib/shaders/roundedCorner";
import ContactShadow from "@/components/three/ContactShadow";

/**
 * The road game: one active DROP POINT ahead on the roadside —
 * a lit signboard + package. Brake to a stop inside its zone →
 * DELIVERED → that entry opens. Drive past → it respawns further
 * ahead with the next undelivered destination.
 *
 * Labels are CanvasTextures (troika is banned in this stack).
 */

const SPAWN_MIN = 160; // metres ahead
const SPAWN_VAR = 60;
const ZONE = 14; // stop zone half-length (m)
const STOP_SPEED = 2.0; // must be slower than this to deliver

function drawSign(label: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101418";
  ctx.fillRect(0, 0, 320, 160);
  ctx.strokeStyle = "#8fe9ff";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 308, 148);
  ctx.fillStyle = "#8fe9ff";
  ctx.font = "700 16px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("◤ DROP POINT ◥", 160, 38);
  ctx.font = "700 30px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  const lines = label.split("\n");
  const y0 = lines.length > 1 ? 78 : 95;
  lines.forEach((l, i) => ctx.fillText(l, 160, y0 + i * 34));
  ctx.font = "600 14px 'Courier New', monospace";
  ctx.fillStyle = "#ffb65c";
  ctx.fillText("— STOP TO DELIVER —", 160, 142);
  return c;
}

function nextUndelivered(delivered: Destination[], after?: Destination) {
  const pending = SHEETS.filter((s) => !delivered.includes(s.slug));
  if (pending.length === 0) return null;
  if (!after) return pending[0];
  const idx = pending.findIndex((s) => s.slug === after);
  return pending[(idx + 1) % pending.length];
}

export default function DeliveryStop() {
  const group = useRef<THREE.Group>(null);
  const zRef = useRef(-(SPAWN_MIN + Math.random() * SPAWN_VAR));
  const deliver = useNightRun((s) => s.deliver);
  const delivered = useNightRun((s) => s.delivered);

  const [current, setCurrent] = useState(() => nextUndelivered([]));

  // Crate: shader-based rounding, not real bevel geometry — a
  // procedural prop, not a one-off hero object worth a RoundedBox swap.
  const crateGeo = useMemo(() => new THREE.BoxGeometry(0.6, 0.6, 0.6), []);
  const crateMat = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => {
    if (crateMat.current) applyBoxRounding(crateMat.current, crateGeo, 0.09);
  }, [crateGeo]);

  const texture = useMemo(() => {
    if (!current) return null;
    const tex = new THREE.CanvasTexture(drawSign(current.label));
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [current]);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!current || !g) {
      drive.nextStopDist = -1;
      drive.nextStopLabel = "";
      return;
    }
    const delta = Math.min(rawDelta, 0.1);
    const { phase } = useNightRun.getState();

    // Slide with the world
    zRef.current += drive.speed * delta;
    g.position.z = zRef.current;

    const dist = -zRef.current;
    drive.nextStopDist = Math.max(0, Math.round(dist));
    drive.nextStopLabel = current.label.replace("\n", " ");

    // In the zone + stopped → delivered
    if (
      phase === "cruising" &&
      dist < ZONE &&
      dist > -ZONE &&
      drive.speed < STOP_SPEED &&
      drive.speed > 0.01 // ignore pre-ignition standstill
    ) {
      const slug = current.slug;
      const next = nextUndelivered([...delivered, slug], slug);
      zRef.current = -(SPAWN_MIN + Math.random() * SPAWN_VAR);
      setCurrent(next);
      deliver(slug);
      return;
    }

    // Drove past → respawn ahead (cycle to the next pending drop)
    if (zRef.current > 22) {
      zRef.current = -(SPAWN_MIN + Math.random() * SPAWN_VAR);
      setCurrent(nextUndelivered(delivered, current.slug));
    }
  });

  if (!current || !texture) return null;

  return (
    <group ref={group} position={[4.9, 0, zRef.current]}>
      {/* Sign pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Signboard, facing oncoming traffic */}
      <mesh position={[0, 2.6, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.0, 1.0]} />
        <meshStandardMaterial
          map={texture}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* The package waiting at the roadside */}
      <mesh position={[-0.9, 0.3, 0.6]} rotation={[0, 0.4, 0]} geometry={crateGeo}>
        <meshStandardMaterial ref={crateMat} color="#8a6a3e" roughness={0.85} />
      </mesh>
      <ContactShadow position={[-0.9, 0.02, 0.6]} radius={0.42} opacity={0.5} />
      <ContactShadow position={[0, 0.02, 0]} radius={0.14} opacity={0.55} />
      {/* Warm pool of light marking the stop zone */}
      <pointLight
        position={[-0.6, 2.2, 0.4]}
        intensity={14}
        color="#ffb65c"
        distance={12}
        decay={1.8}
      />
    </group>
  );
}
