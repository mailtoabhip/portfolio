"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Cab from "@/components/three/Cab";
import PaperStack from "@/components/three/PaperStack";
import Headlights from "@/components/three/Headlights";
import CameraRig from "@/components/three/CameraRig";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { useNightRun } from "@/lib/store";

/**
 * The whole vehicle (cab + headlights + camera) as one group.
 * A/D slides it across the road (lane changes) with a slight
 * yaw + roll lean so it feels like steering, not strafing.
 */

const ROAD_HALF = 2.3; // asphalt half-width (3.5) minus truck margin
const LATERAL_SPEED = 3.2; // m/s at full cruise

export default function Truck() {
  const group = useRef<THREE.Group>(null);
  const vx = useRef(0);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.1);
    const { phase } = useNightRun.getState();
    const steerable = phase === "cruising" && drive.speed > 0.5;

    // Lateral velocity eases toward input; scales with actual speed
    const speedK = Math.min(drive.speed / 13, 1);
    const target = steerable ? input.steer * LATERAL_SPEED * speedK : 0;
    vx.current += (target - vx.current) * Math.min(1, delta * 5);

    g.position.x = THREE.MathUtils.clamp(
      g.position.x + vx.current * delta,
      -ROAD_HALF,
      ROAD_HALF
    );
    // Lean: slight yaw into the turn, slight roll away from it
    g.rotation.y += (-vx.current * 0.06 - g.rotation.y) * Math.min(1, delta * 4);
    g.rotation.z += (vx.current * 0.02 - g.rotation.z) * Math.min(1, delta * 4);
  });

  return (
    <group ref={group}>
      <Cab />
      <PaperStack />
      <Headlights />
      <CameraRig />
    </group>
  );
}
