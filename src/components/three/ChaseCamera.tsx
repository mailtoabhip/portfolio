"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { drive } from "@/lib/driveState";
import { CAB_OFFSET_X } from "@/lib/game";
import { timeOfDayState } from "@/lib/timeOfDayState";

/** Lives outside the truck group: body roll cannot tilt the horizon. */
export default function ChaseCamera() {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const moonFill = useRef<THREE.DirectionalLight>(null);
  const initialized = useRef(false);
  const reduced = useRef(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { reduced.current = preference.matches; };
    sync(); preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useFrame((state, rawDt) => {
    const c = camera.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.1);
    // Widen portrait framing to keep the truck in view without excessive distance.
    const fov = state.size.width < state.size.height ? 68 : 56;
    if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
    desired.set(drive.x + CAB_OFFSET_X, 5.3, 10);
    target.set(drive.x + CAB_OFFSET_X + Math.sin(drive.yaw) * 5, 1.75, -7);
    if (!initialized.current || rawDt > 0.2 || reduced.current) {
      c.position.copy(desired); initialized.current = true;
    } else {
      c.position.lerp(desired, 1 - Math.exp(-5 * dt));
    }
    c.up.set(0, 1, 0);
    c.lookAt(target);
    if (moonFill.current) moonFill.current.intensity = 0.65 * (1 - timeOfDayState.t);
  });
  return <>
    <PerspectiveCamera ref={camera} makeDefault fov={56} near={0.1} far={700} />
    <directionalLight ref={moonFill} position={[8, 14, 10]} color="#b8c9e8" intensity={0} />
  </>;
}
