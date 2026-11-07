"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";
import { drive } from "@/lib/driveState";
import { sim } from "@/lib/game";
import { isTouchDevice } from "@/lib/controls";
import { useNightRun } from "@/lib/store";
import { createSeatMotion, dampFactor, roadRumble, updateSeatMotion } from "@/lib/cameraMotion";

/**
 * Driver's-seat camera rig (§9):
 * - Mouse parallax: damped yaw/pitch, capped ±~15° yaw so you can
 *   glance around the cab but never leave the seat.
 * - Road rumble: layered-sine pseudo-noise on position, amplitude
 *   scaled by actual speed (capped — motion safety, §11).
 */

const MAX_YAW = THREE.MathUtils.degToRad(15);
const MAX_PITCH = THREE.MathUtils.degToRad(8);
const SEAT = new THREE.Vector3(0, 1.68, 0); // high truck seat: eye well above the dash
const BASE_FOV = 75;
/** Look slightly down over the dash, like a truck driver does. */
const BASE_PITCH = -THREE.MathUtils.degToRad(11);
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
  const seatMotion = useRef(createSeatMotion());
  const reducedMotion = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { reducedMotion.current = preference.matches; };
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

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
    const quiet = reducedMotion.current;
    const active = useNightRun.getState().phase === "cruising";
    updateSeatMotion(seatMotion.current, drive.speed, delta, active && !quiet);
    const px = isTouchDevice || quiet ? 0 : state.pointer.x;
    const py = isTouchDevice || quiet ? 0 : state.pointer.y;
    const targetYaw = bias - px * MAX_YAW * (bias ? 0.5 : 1);
    const targetPitch = BASE_PITCH + py * MAX_PITCH + seatMotion.current.pitch;
    const d = dampFactor(4, Math.min(delta, 0.1));
    g.rotation.y += (targetYaw - g.rotation.y) * d;
    g.rotation.x += (targetPitch - g.rotation.x) * d;

    // Road vibration follows distance, so stopping does not keep shaking
    // over an imaginary road. Impact feedback remains bounded separately.
    const t = state.clock.elapsedTime;
    const movingSpeed = active && Math.abs(drive.dz) > 1e-6 ? drive.speed : 0;
    const rumble = quiet ? 0 : roadRumble(drive.dist, movingSpeed);
    const k = quiet || !active ? 0 : Math.min(0.035,
      Math.max(0, sim.bump) * 0.06 + (sim.scraping ? 0.012 : 0));
    g.position.set(
      SEAT.x + (Math.sin(t * 17.3) * 0.5 + Math.sin(t * 29.7) * 0.3) * k,
      SEAT.y + rumble + (Math.sin(t * 23.1) * 0.6 + Math.sin(t * 41.3) * 0.25) * k,
      SEAT.z
    );
  });

  return (
    <group ref={rig} position={SEAT.toArray()}>
      <PerspectiveCamera ref={cam} makeDefault fov={BASE_FOV} position={[0, 0, 0]} />
    </group>
  );
}
