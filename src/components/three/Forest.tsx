"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNightRun } from "@/lib/store";
import { drive } from "@/lib/driveState";
import { input } from "@/lib/controls";
import { timeOfDayState, bandT, TRUNK_COLOR, CANOPY_COLORS } from "@/lib/timeOfDayState";

/**
 * The moving world. The truck never moves — the world slides toward
 * the camera (+Z) and recycles (§9 "highway illusion", now a forest):
 *
 * - Center-line dashes repeat every DASH_GAP, so the whole dash group
 *   just wraps its own Z position (no per-instance work).
 * - Trees are two instanced meshes (trunks + canopies) sharing one
 *   position table; each tree that passes the camera teleports to the
 *   far end with a fresh random lateral seat.
 */

const DASH_GAP = 8;
const DASH_COUNT = 32;
const TREE_COUNT = 140; // both sides combined
const DEPTH = 230; // how far the forest extends
const CRUISE_SPEED = 13; // m/s ≈ 47 km/h — a heavy truck at night

type Tree = { x: number; z: number; s: number; rot: number };

function seatTree(z: number): Tree {
  // Random side of the road, clear of the asphalt (road half-width ~3.5 + margin)
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = -0.5 + side * (6 + Math.random() * 26);
  return { x, z, s: 0.7 + Math.random() * 1.1, rot: Math.random() * Math.PI * 2 };
}

/** Pine canopy tiers: [y-offset (×scale), radius, height] */
const TIERS: [number, number, number][] = [
  [2.3, 1.5, 2.6],
  [3.5, 1.1, 2.1],
  [4.55, 0.72, 1.7],
];

export default function Forest() {
  const quality = useNightRun((s) => s.quality);
  const dashGroup = useRef<THREE.Group>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const tier0 = useRef<THREE.InstancedMesh>(null);
  const tier1 = useRef<THREE.InstancedMesh>(null);
  const tier2 = useRef<THREE.InstancedMesh>(null);
  const trunkMat = useRef<THREE.MeshStandardMaterial>(null);
  const tier0Mat = useRef<THREE.MeshStandardMaterial>(null);
  const tier1Mat = useRef<THREE.MeshStandardMaterial>(null);
  const tier2Mat = useRef<THREE.MeshStandardMaterial>(null);
  const speedRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const trunkNight = useMemo(() => new THREE.Color(TRUNK_COLOR.night), []);
  const trunkDay = useMemo(() => new THREE.Color(TRUNK_COLOR.day), []);
  const canopyNight = useMemo(
    () => CANOPY_COLORS.map((c) => new THREE.Color(c.night)),
    []
  );
  const canopyDay = useMemo(
    () => CANOPY_COLORS.map((c) => new THREE.Color(c.day)),
    []
  );

  const trees = useMemo<Tree[]>(
    () =>
      Array.from({ length: TREE_COUNT }, (_, i) =>
        seatTree(-(i / TREE_COUNT) * DEPTH - 4)
      ),
    []
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // guard against tab-switch jumps
    const { phase, speed } = useNightRun.getState();

    // The truck only moves when the driver drives (W). While a sheet
    // is open (reading/returning) it keeps a gentle ambient roll.
    const TOP = CRUISE_SPEED * 1.7 * speed; // ~22 m/s flat out
    if (phase === "cruising") {
      if (input.brake > 0) {
        // Real brakes: linear decel — stops from top speed in ~30m
        speedRef.current = Math.max(0, speedRef.current - 8 * delta);
      } else if (input.throttle > 0) {
        speedRef.current += (TOP - speedRef.current) * Math.min(1, delta * 0.9);
      } else {
        // Coasting: gentle engine-drag decel
        speedRef.current = Math.max(0, speedRef.current - 2.5 * delta);
      }
      speedRef.current = Math.min(speedRef.current, TOP || speedRef.current);
    } else {
      const target = phase === "reading" || phase === "returning" ? 5 * speed : 0;
      speedRef.current += (target - speedRef.current) * Math.min(1, delta * 0.9);
    }
    drive.speed = speedRef.current;

    // Day/night material cross-fade — reads the shared `t` directly,
    // independent of whether the world is currently moving.
    const groundT = bandT(timeOfDayState.t, 0.35, 0.7);
    if (trunkMat.current) trunkMat.current.color.lerpColors(trunkNight, trunkDay, groundT);
    if (tier0Mat.current) tier0Mat.current.color.lerpColors(canopyNight[0], canopyDay[0], groundT);
    if (tier1Mat.current) tier1Mat.current.color.lerpColors(canopyNight[1], canopyDay[1], groundT);
    if (tier2Mat.current) tier2Mat.current.color.lerpColors(canopyNight[2], canopyDay[2], groundT);

    const dz = speedRef.current * delta;
    if (dz === 0) return;

    // 1) Dashes: wrap the group inside one gap length
    if (dashGroup.current) {
      dashGroup.current.position.z =
        (dashGroup.current.position.z + dz) % DASH_GAP;
    }

    // 2) Trees: slide + recycle
    const tMesh = trunks.current;
    const tierMeshes = [tier0.current, tier1.current, tier2.current];
    if (!tMesh || tierMeshes.some((m) => !m)) return;
    for (let i = 0; i < TREE_COUNT; i++) {
      const tree = trees[i];
      tree.z += dz;
      if (tree.z > 4) {
        Object.assign(tree, seatTree(tree.z - DEPTH));
      }
      // trunk
      dummy.position.set(tree.x, tree.s * 1.1, tree.z);
      dummy.scale.set(tree.s, tree.s, tree.s);
      dummy.rotation.set(0, tree.rot, 0);
      dummy.updateMatrix();
      tMesh.setMatrixAt(i, dummy.matrix);
      // stacked canopy tiers
      for (let j = 0; j < TIERS.length; j++) {
        dummy.position.set(tree.x, tree.s * TIERS[j][0], tree.z);
        dummy.updateMatrix();
        tierMeshes[j]!.setMatrixAt(i, dummy.matrix);
      }
    }
    tMesh.instanceMatrix.needsUpdate = true;
    for (const m of tierMeshes) m!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Center-line dashes */}
      <group ref={dashGroup}>
        {Array.from({ length: DASH_COUNT }, (_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-0.5, 0.03, -4 - i * DASH_GAP]}
          >
            <planeGeometry args={[0.18, 3]} />
            <meshStandardMaterial color="#4a4b42" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Trunks */}
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_COUNT]} castShadow={quality > 0}>
        <cylinderGeometry args={[0.16, 0.26, 2.4, 6]} />
        <meshStandardMaterial ref={trunkMat} color={TRUNK_COLOR.night} roughness={1} />
      </instancedMesh>

      {/* Pine canopies: three stacked tiers */}
      {[
        { ref: tier0, matRef: tier0Mat, color: CANOPY_COLORS[0].night },
        { ref: tier1, matRef: tier1Mat, color: CANOPY_COLORS[1].night },
        { ref: tier2, matRef: tier2Mat, color: CANOPY_COLORS[2].night },
      ].map((tier, j) => (
        <instancedMesh
          key={j}
          ref={tier.ref}
          args={[undefined, undefined, TREE_COUNT]}
          castShadow={quality > 0}
        >
          <coneGeometry args={[TIERS[j][1], TIERS[j][2], 7]} />
          <meshStandardMaterial ref={tier.matRef} color={tier.color} roughness={1} />
        </instancedMesh>
      ))}
    </group>
  );
}
