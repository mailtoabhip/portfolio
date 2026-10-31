"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Cab from "@/components/three/Cab";
import Headlights from "@/components/three/Headlights";
import CameraRig from "@/components/three/CameraRig";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { useNightRun } from "@/lib/store";
import { curveUniform } from "@/lib/curveWorld";
import { TRUCK_X_MIN, TRUCK_X_MAX } from "@/lib/highway";

/**
 * The whole vehicle (cab + headlights + camera) as one group.
 * A/D slides it across the road (lane changes) with a slight
 * yaw + roll lean so it feels like steering, not strafing.
 */

const LATERAL_SPEED = 5.2; // m/s at full cruise — a lane change in well under a second
/** Bends push the truck toward the outside of the curve (scaled by
 * speed²), so the driver steers through them — gently. */
const DRIFT = 0.55;
/** How much the cab turns to look into a bend. */
const LOOK_INTO_BEND = 38;

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
    const bend = curveUniform.value;
    const drift = -bend * drive.speed * drive.speed * DRIFT;

    g.position.x = THREE.MathUtils.clamp(
      g.position.x + (vx.current + drift) * delta,
      TRUCK_X_MIN,
      TRUCK_X_MAX
    );
    // Lean: slight yaw into the steer and into the bend ahead, slight roll away
    const yaw = -vx.current * 0.05 - bend * LOOK_INTO_BEND;
    g.rotation.y += (yaw - g.rotation.y) * Math.min(1, delta * 4);
    g.rotation.z += (vx.current * 0.02 - g.rotation.z) * Math.min(1, delta * 4);
  });

  return (
    <group ref={group}>
      <Cab />
      <Headlights />
      <CameraRig />
    </group>
  );
}
