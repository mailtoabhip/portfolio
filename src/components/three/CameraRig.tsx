"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";
import { drive } from "@/lib/driveState";
import { sim } from "@/lib/game";
import { isTouchDevice } from "@/lib/controls";

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
const BASE_FOV = 75;
/** The in-cab tablet's outer (left) edge, relative to the seat: x, depth. */
const TABLET_EDGE_X = 0.62;
const TABLET_DEPTH = 1.15;
const EDGE_MARGIN = THREE.MathUtils.degToRad(4);

/**
 * Narrow screens (phones, portrait tablets) see a much smaller slice
 * horizontally, so the dash tablet fell off the left edge. Turn the
 * view a little toward it and widen the FOV just enough that its whole
 * screen always stays in frame.
 */
function framing(aspect: number) {
  const bias = aspect < 1 ? THREE.MathUtils.degToRad(11) : aspect < 1.45 ? THREE.MathUtils.degToRad(6) : 0;
  const needHalfH = Math.atan(TABLET_EDGE_X / TABLET_DEPTH) - bias + EDGE_MARGIN;
  const needV = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(needHalfH) / aspect));
  return { bias, fov: Math.min(96, Math.max(BASE_FOV, needV)) };
}

export default function CameraRig() {
  const rig = useRef<THREE.Group>(null);
  const cam = useRef<THREE.PerspectiveCamera>(null);

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;

    // --- framing for the screen shape (keeps the tablet in view) ---
    const { bias, fov } = framing(state.size.width / Math.max(1, state.size.height));
    const c = cam.current;
    if (c && Math.abs(c.fov - fov) > 0.05) {
      c.fov = fov;
      c.updateProjectionMatrix();
    }

    // --- parallax (damped toward pointer; off on touch, where the
    // "pointer" is just the last tap and would swing the view) ---
    const px = isTouchDevice ? 0 : state.pointer.x;
    const py = isTouchDevice ? 0 : state.pointer.y;
    const targetYaw = bias - px * MAX_YAW * (bias ? 0.5 : 1);
    const targetPitch = py * MAX_PITCH;
    const d = Math.min(1, delta * 4);
    g.rotation.y += (targetYaw - g.rotation.y) * d;
    g.rotation.x += (targetPitch - g.rotation.x) * d;

    // --- road rumble (speed-scaled, capped) ---
    const t = state.clock.elapsedTime;
    const k =
      Math.min(Math.abs(drive.speed) / 22, 1) * SHAKE_AMP +
      sim.bump * 0.09 +
      (sim.scraping ? 0.02 : 0);
    g.position.set(
      SEAT.x + (Math.sin(t * 17.3) * 0.5 + Math.sin(t * 29.7) * 0.3) * k,
      SEAT.y + (Math.sin(t * 23.1) * 0.6 + Math.sin(t * 41.3) * 0.25) * k,
      SEAT.z
    );
  });

  return (
    <group ref={rig} position={SEAT.toArray()}>
      <PerspectiveCamera ref={cam} makeDefault fov={BASE_FOV} position={[0, 0, 0]} />
    </group>
  );
}
