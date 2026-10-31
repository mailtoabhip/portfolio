"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";
import { drive } from "@/lib/driveState";

/**
 * Driver's-seat camera rig (§9):
 * - Mouse parallax: damped yaw/pitch, capped ±~15° yaw so you can
 *   glance around the cab but never leave the seat.
 * - Road rumble: layered-sine pseudo-noise on position, amplitude
 *   scaled by actual speed (capped — motion safety, §11).
 */

const MAX_YAW = THREE.MathUtils.degToRad(15);
const MAX_PITCH = THREE.MathUtils.degToRad(8);
const SHAKE_AMP = 0.012; // metres at full cruise — subtle
const SEAT = new THREE.Vector3(0, 1.4, 0);

export default function CameraRig() {
  const rig = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;

    // --- parallax (damped toward pointer) ---
    const targetYaw = -state.pointer.x * MAX_YAW;
    const targetPitch = state.pointer.y * MAX_PITCH;
    const d = Math.min(1, delta * 4);
    g.rotation.y += (targetYaw - g.rotation.y) * d;
    g.rotation.x += (targetPitch - g.rotation.x) * d;

    // --- road rumble (speed-scaled, capped) ---
    const t = state.clock.elapsedTime;
    const k = Math.min(drive.speed / 22, 1) * SHAKE_AMP;
    g.position.set(
      SEAT.x + (Math.sin(t * 17.3) * 0.5 + Math.sin(t * 29.7) * 0.3) * k,
      SEAT.y + (Math.sin(t * 23.1) * 0.6 + Math.sin(t * 41.3) * 0.25) * k,
      SEAT.z
    );
  });

  return (
    <group ref={rig} position={SEAT.toArray()}>
      <PerspectiveCamera makeDefault fov={75} position={[0, 0, 0]} />
    </group>
  );
}
