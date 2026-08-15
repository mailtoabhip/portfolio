"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNightRun } from "@/lib/store";
import { input } from "@/lib/controls";

/**
 * Placeholder low-poly truck cab — deliberately kept in DARKNESS.
 * The cab reads as: one small warm map-light pool catching the top
 * half of the steering wheel + faint screen glow. Deep shadows hide
 * the primitive geometry (§8: mood from lighting, not geometry).
 *
 * TODO(asset): swap for a free CC0 low-poly truck-interior glTF.
 * Camera sits at [0, 1.4, 0] in the driver's seat, looking down -Z.
 * Right-hand drive (Indian truck).
 */

const SHELL = "#08090c"; // near-black cab shell
const DASH = "#0e1013";
const WHEEL = "#23262c"; // dark leather-ish rim — catches the map light
const TRIM = "#15181d";

/**
 * Truck steering wheel modeled after the reference photo:
 * round rim, wide center pad, two upper spokes (~10 & 2 o'clock),
 * two lower legs (~5 & 7 o'clock). Turns with A/D input.
 */
function SteeringWheel() {
  const spinner = useRef<THREE.Group>(null);

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
        {/* Center pad — wide horn pad like the reference */}
        <mesh position={[0, -0.01, 0]}>
          <boxGeometry args={[0.24, 0.15, 0.055]} />
          <meshStandardMaterial color={WHEEL} roughness={0.6} />
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
          <meshStandardMaterial color={TRIM} roughness={0.4} metalness={0.3} />
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

export default function Cab() {
  const phase = useNightRun((s) => s.phase);
  const dashLit = phase !== "name";

  // Map-light aim point: the top half of the steering wheel
  const mapLightTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 0.9, -0.98);
    return t;
  }, []);

  return (
    <group>
      {/* ================= DASHBOARD ================= */}
      <mesh position={[-0.5, 0.78, -1.3]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[2.7, 0.34, 0.6]} />
        <meshStandardMaterial color={DASH} roughness={0.9} />
      </mesh>
      <mesh position={[-0.5, 0.95, -1.42]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[2.7, 0.06, 0.34]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      {/* Instrument cluster: a slim binnacle box ON the dash, screen
          face flush on its front (nothing floating, nothing blocking) */}
      <group position={[0, 0.96, -1.22]} rotation={[-0.18, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.52, 0.16, 0.07]} />
          <meshStandardMaterial color={DASH} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.037]}>
          <planeGeometry args={[0.44, 0.11]} />
          <meshStandardMaterial
            color="#020507"
            emissive={dashLit ? "#5da8c4" : "#000000"}
            emissiveIntensity={dashLit ? 0.35 : 0}
          />
        </mesh>
      </group>
      {/* Center infotainment: console box + flush screen (RHD: left of driver) */}
      <group position={[-0.85, 0.9, -1.24]} rotation={[-0.1, 0.3, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.2, 0.07]} />
          <meshStandardMaterial color={DASH} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.037]}>
          <planeGeometry args={[0.27, 0.15]} />
          <meshStandardMaterial
            color="#020507"
            emissive={dashLit ? "#43809c" : "#000000"}
            emissiveIntensity={dashLit ? 0.3 : 0}
          />
        </mesh>
      </group>

      <SteeringWheel />

      {/* ================= CABIN SHELL (near-black) ================= */}
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

      {/* Short hood (cab-over) */}
      <mesh position={[-0.5, 0.62, -2.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[2.7, 0.14, 1.2]} />
        <meshStandardMaterial color={SHELL} roughness={0.85} metalness={0.15} />
      </mesh>

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
