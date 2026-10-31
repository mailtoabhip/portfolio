"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useNightRun } from "@/lib/store";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { sim, TIME_LIMIT } from "@/lib/game";
import { CLAY_ACCENT_CYAN, CLAY_ACCENT_AMBER } from "@/lib/clayMaterials";
import CabInterior from "@/components/three/CabInterior";
import Tablet from "@/components/three/Tablet";
import PhoneStand from "@/components/three/PhoneStand";

/**
 * Truck cab: claymorphic dash/console/vents/seats (CabInterior) inside
 * a still-dark structural shell — the outer walls/pillars/roof stay in
 * the original near-black palette (mood from lighting, not geometry),
 * while the surfaces the driver actually interacts with get real
 * color, rounding, and detail.
 *
 * TODO(asset): swap for a free CC0 low-poly truck-interior glTF.
 * Camera sits at [0, 1.4, 0] in the driver's seat, looking down -Z.
 * Right-hand drive (Indian truck).
 */

const SHELL = "#cbbd9f"; // warm beige cabin trim (roof, pillars, doors)
const EXTERIOR = "#e2742a"; // orange truck body seen past the glass
const WHEEL = "#23262c"; // dark leather-ish rim — catches the map light

/**
 * Truck steering wheel modeled after the reference photo:
 * round rim, wide center pad, two upper spokes (~10 & 2 o'clock),
 * two lower legs (~5 & 7 o'clock). Turns with A/D input.
 */
function SteeringWheel() {
  const spinner = useRef<THREE.Group>(null);
  // Refine rather than replace: same wheel, same dark leather color,
  // just the center pad picked up the baked-bevel treatment so it's
  // visually consistent with the newly decorated cab around it.
  const padGeo = useMemo(() => new RoundedBoxGeometry(0.24, 0.15, 0.055, 3, 0.035), []);

  useFrame((_, rawDelta) => {
    const s = spinner.current;
    if (!s) return;
    const delta = Math.min(rawDelta, 0.1);
    // Steer right (D) → wheel turns clockwise from the driver's view
    const target = -input.steer * 0.75; // ~43° lock, visual only
    s.rotation.z += (target - s.rotation.z) * Math.min(1, delta * 6);
  });

  const R = 0.26; // rim radius — sized up per user

  return (
    <group position={[0, 0.94, -0.95]} rotation={[-1.05, 0, 0]}>
      <group ref={spinner}>
        {/* Rim */}
        <mesh>
          <torusGeometry args={[R, 0.03, 20, 56]} />
          <meshStandardMaterial color={WHEEL} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Center pad — wide horn pad like the reference, now rounded */}
        <mesh position={[0, -0.01, 0]} geometry={padGeo}>
          <meshStandardMaterial color={WHEEL} roughness={0.5} />
        </mesh>
        {/* Upper spokes to ~10 and ~2 o'clock */}
        {[1, -1].map((side) => (
          <mesh
            key={`up${side}`}
            position={[side * 0.15, 0.05, 0]}
            rotation={[0, 0, side * -1.15]}
          >
            <boxGeometry args={[0.05, 0.22, 0.04]} />
            <meshStandardMaterial color={WHEEL} roughness={0.6} />
          </mesh>
        ))}
        {/* Lower legs to ~5 and ~7 o'clock */}
        {[1, -1].map((side) => (
          <mesh
            key={`low${side}`}
            position={[side * 0.09, -0.15, 0]}
            rotation={[0, 0, side * 0.55]}
          >
            <boxGeometry args={[0.05, 0.2, 0.04]} />
            <meshStandardMaterial color={WHEEL} roughness={0.6} />
          </mesh>
        ))}
        {/* Tiny diamond badge on the pad */}
        <mesh position={[0, 0.01, 0.029]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.035, 0.035]} />
          <meshStandardMaterial color={CLAY_ACCENT_AMBER} roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
      {/* Column behind the rim (doesn't spin) */}
      <mesh position={[0, 0, -0.16]}>
        <cylinderGeometry args={[0.04, 0.06, 0.24, 12]} />
        <meshStandardMaterial color={SHELL} roughness={0.9} />
      </mesh>
    </group>
  );
}

const BASE = typeof window === "undefined" ? "" : window.location.pathname.replace(/\/$/, "");

/**
 * Instrument cluster from the generated art, with live needles:
 * speedometer (0–140 km/h over 270°), a static fuel needle, and the
 * right dial as the delivery stopwatch (one sweep = the time limit).
 * Dial centres are measured from the cropped artwork (1238 × 699 px).
 */
const CLUSTER_W = 0.6;
const CLUSTER_H = CLUSTER_W / 1.7711;
const dialPos = (px: number, py: number): [number, number, number] => [
  (px / 1238 - 0.5) * CLUSTER_W,
  (0.5 - py / 699) * CLUSTER_H,
  0.002,
];

function Cluster() {
  const [face, needle] = useLoader(THREE.TextureLoader, [`${BASE}/game/cluster.webp`, `${BASE}/game/needle.webp`]);
  const speedNeedle = useRef<THREE.Mesh>(null);
  const timerNeedle = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => {
    face.colorSpace = needle.colorSpace = THREE.SRGBColorSpace;
    face.anisotropy = 8;
    return {
      face: new THREE.MeshBasicMaterial({ map: face, transparent: true, alphaTest: 0.3, toneMapped: false }),
      needle: new THREE.MeshBasicMaterial({ map: needle, transparent: true, alphaTest: 0.3, toneMapped: false }),
    };
  }, [face, needle]);

  useFrame((_, rawDelta) => {
    const kmh = Math.min(140, Math.abs(drive.speed) * 3.6);
    const target = -THREE.MathUtils.degToRad(-135 + (kmh / 140) * 270);
    const n = speedNeedle.current;
    if (n) n.rotation.z += (target - n.rotation.z) * Math.min(1, rawDelta * 10);
    const running = sim.job === "delivering" || sim.job === "unloading";
    const used = running ? (TIME_LIMIT - sim.timeLeft) / TIME_LIMIT : 0;
    if (timerNeedle.current) timerNeedle.current.rotation.z = -used * Math.PI * 2;
  });

  return (
    <group>
      <mesh material={mats.face}>
        <planeGeometry args={[CLUSTER_W, CLUSTER_H]} />
      </mesh>
      <mesh ref={speedNeedle} position={dialPos(619, 354)} material={mats.needle}>
        <planeGeometry args={[0.18, 0.18]} />
      </mesh>
      <mesh position={dialPos(222, 367)} rotation={[0, 0, -0.9]} material={mats.needle}>
        <planeGeometry args={[0.09, 0.09]} />
      </mesh>
      <mesh ref={timerNeedle} position={dialPos(1017, 367)} material={mats.needle}>
        <planeGeometry args={[0.096, 0.096]} />
      </mesh>
    </group>
  );
}

function DashStrip() {
  const tex = useLoader(THREE.TextureLoader, `${BASE}/game/dash_strip.webp`);
  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  }, [tex]);
  // Front face of the dash slab, left of the wheel (RHD → passenger side).
  return (
    <mesh position={[-1.02, 0.73, -1.0]} rotation={[-0.18, 0, 0]} material={mat}>
      <planeGeometry args={[1.25, 0.26]} />
    </mesh>
  );
}

export default function Cab() {
  const phase = useNightRun((s) => s.phase);
  const dashLit = phase !== "name";

  // Map-light aim point: the top half of the steering wheel
  const mapLightTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 0.9, -0.98);
    return t;
  }, []);

  const trimBezelGeo = useMemo(
    () => new RoundedBoxGeometry(0.52, 0.16, 0.07, 3, 0.03),
    []
  );
  const windshieldTrimGeo = useMemo(
    () => new RoundedBoxGeometry(2.7, 0.06, 0.34, 3, 0.025),
    []
  );

  return (
    <group>
      {/* ================= DASHBOARD ================= */}
      {/* The dash slab itself, door recesses, console, vents, gear
          shifter and seats all live in CabInterior (merged, static,
          clay-tan) — this file keeps only the things that light up or
          move: screens, bezels, the wheel. */}
      <mesh geometry={windshieldTrimGeo} position={[-0.5, 0.95, -1.42]} rotation={[-0.35, 0, 0]}>
        <meshStandardMaterial color={CLAY_ACCENT_CYAN} roughness={0.4} />
      </mesh>
      {/* Instrument cluster on a slim hood above the dash */}
      <group position={[0, 1.06, -1.22]} rotation={[-0.3, 0, 0]}>
        <mesh geometry={trimBezelGeo} position={[0, 0.02, -0.04]} scale={[1.28, 2.25, 1]}>
          <meshStandardMaterial color="#2a2d33" roughness={0.6} />
        </mesh>
        <group position={[0, 0.02, 0.0]}>
          <Suspense fallback={null}>
            <Cluster />
          </Suspense>
        </group>
      </group>
      <Suspense fallback={null}>
        <DashStrip />
      </Suspense>
      {/* Rear-view mirror */}
      <group position={[-0.55, 2.1, -1.3]} rotation={[0.1, 0.12, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.13, 0.05]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[0.38, 0.1]} />
          <meshStandardMaterial color="#9fc3dc" roughness={0.15} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.17, -0.05]}>
          <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      </group>
      {/* Marigold string hanging by the left pillar */}
      <group position={[-1.75, 2.2, -1.25]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i * 0.6) * 0.01, -i * 0.075, 0]}>
            <icosahedronGeometry args={[0.035, 1]} />
            <meshStandardMaterial color={i % 2 ? "#ffb21f" : "#ff7a12"} roughness={0.9} />
          </mesh>
        ))}
      </group>
      <SteeringWheel />
      <CabInterior />
      <Tablet />
      <PhoneStand />

      {/* ================= CABIN SHELL (beige trim) ================= */}
      <mesh position={[-0.5, 2.45, -0.4]}>
        <boxGeometry args={[3.0, 0.1, 2.4]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      <mesh position={[-0.5, 0.32, -0.4]}>
        <boxGeometry args={[3.0, 0.1, 2.4]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      {/* Doors with low sills (big windows above) */}
      <mesh position={[1.0, 0.75, -0.3]}>
        <boxGeometry args={[0.08, 0.9, 2.2]} />
        <meshStandardMaterial color={SHELL} roughness={0.95} />
      </mesh>
      <mesh position={[-2.0, 0.75, -0.3]}>
        <boxGeometry args={[0.08, 0.9, 2.2]} />
        <meshStandardMaterial color={SHELL} roughness={0.95} />
      </mesh>
      {/* Rear wall */}
      <mesh position={[-0.5, 1.4, 0.85]}>
        <boxGeometry args={[3.0, 2.1, 0.08]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      {/* Pillars + windshield header */}
      <mesh position={[1.0, 1.7, -1.45]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.07, 1.6, 0.07]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      <mesh position={[-2.0, 1.7, -1.45]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[0.07, 1.6, 0.07]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      <mesh position={[1.0, 1.8, 0.75]}>
        <boxGeometry args={[0.07, 1.3, 0.07]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      <mesh position={[-2.0, 1.8, 0.75]}>
        <boxGeometry args={[0.07, 1.3, 0.07]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>
      <mesh position={[-0.5, 2.42, -1.45]}>
        <boxGeometry args={[3.0, 0.12, 0.08]} />
        <meshStandardMaterial color={SHELL} roughness={1} />
      </mesh>

      {/* Short hood (cab-over), orange like the truck body */}
      <mesh position={[-0.5, 0.62, -2.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[2.7, 0.14, 1.2]} />
        <meshStandardMaterial color={EXTERIOR} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Orange A-pillar skins outside the beige trim */}
      {[1.04, -2.04].map((x) => (
        <mesh key={x} position={[x, 1.7, -1.47]} rotation={[0, 0, x > 0 ? 0.06 : -0.06]}>
          <boxGeometry args={[0.03, 1.6, 0.09]} />
          <meshStandardMaterial color={EXTERIOR} roughness={0.6} />
        </mesh>
      ))}

      {/* ================= THE ONE LIGHT ================= */}
      {/* Small warm map light above the driver, aimed at the wheel.
          Its pool catches the top half of the rim and a slice of dash —
          everything else stays in shadow. */}
      <primitive object={mapLightTarget} />
      <spotLight
        position={[0, 2.35, -0.55]}
        target={mapLightTarget}
        angle={0.32}
        penumbra={0.85}
        decay={1.8}
        distance={4}
        intensity={dashLit ? 9 : 0.6}
        color="#ffc482"
      />
      {/* Whisper of screen glow so the dash face isn't a void */}
      <pointLight
        position={[-0.2, 1.05, -1.0]}
        intensity={dashLit ? 0.35 : 0}
        color="#5da8c4"
        distance={1.4}
        decay={2}
      />
    </group>
  );
}
