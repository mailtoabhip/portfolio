"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Cab from "@/components/three/Cab";
import Headlights from "@/components/three/Headlights";
import CameraRig from "@/components/three/CameraRig";
import { drive } from "@/lib/driveState";

/**
 * The whole vehicle (cab + headlights + camera) as one group. Its
 * lateral position and yaw are simulated in GameSim (lanes, kerbs,
 * lay-bys, toll islands, collisions); this only applies them, plus a
 * slight roll away from the steer.
 */
export default function Truck() {
  const group = useRef<THREE.Group>(null);
  const lastX = useRef(0);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.max(1e-4, Math.min(rawDelta, 0.1));
    const vx = (drive.x - lastX.current) / delta;
    lastX.current = drive.x;
    g.position.x = drive.x;
    g.rotation.y = drive.yaw;
    g.rotation.z += (vx * 0.02 - g.rotation.z) * Math.min(1, delta * 4);
  });

  return (
    <group ref={group}>
      <Cab />
      <Headlights />
      <CameraRig />
    </group>
  );
}
