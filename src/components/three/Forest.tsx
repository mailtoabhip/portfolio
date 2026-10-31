"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNightRun } from "@/lib/store";
import { drive } from "@/lib/driveState";
import { input } from "@/lib/controls";
import { timeOfDayState, bandT, TRUNK_COLOR, CANOPY_COLORS, BUSH_COLOR } from "@/lib/timeOfDayState";
import { applyFresnelRim } from "@/lib/clayMaterials";
import { advanceCurve } from "@/lib/curveWorld";
import { VERGE_L_LEFT, VERGE_R_RIGHT } from "@/lib/highway";

/**
 * The moving world. The truck never moves — the world slides toward
 * the camera (+Z) and recycles (§9 "highway illusion", now a forest):
 *
 * - Lane markings now live in the road textures (Road.tsx scrolls them).
 * - Verge shrubs recycle the same way as the trees.
 * - Distance travelled also drives the curved-world turns
 *   (lib/curveWorld.ts).
 * - Trees are two instanced meshes (trunks + canopies) sharing one
 *   position table; each tree that passes the camera teleports to the
 *   far end with a fresh random lateral seat.
 */

const TREE_COUNT = 160; // both sides combined
const BUSH_COUNT = 90;
const DEPTH = 260; // how far the forest extends
const CRUISE_SPEED = 21; // m/s ≈ 75 km/h cruise; flat out ≈ 130 km/h

type Tree = { x: number; z: number; s: number; rot: number };

function seatTree(z: number): Tree {
  // Either side of the highway, beyond the verges (lib/highway.ts).
  const left = Math.random() < 0.5;
  const x = left
    ? VERGE_L_LEFT - 1 - Math.random() * 30
    : VERGE_R_RIGHT + 1 + Math.random() * 30;
  return { x, z, s: 0.8 + Math.random() * 1.2, rot: Math.random() * Math.PI * 2 };
}

/** Rounded shrubs along the outer edge of each verge. */
function seatBush(z: number): Tree {
  const left = Math.random() < 0.5;
  const x = left
    ? VERGE_L_LEFT + 0.6 + Math.random() * 3.2
    : VERGE_R_RIGHT - 0.6 - Math.random() * 3.2;
  return { x, z, s: 0.4 + Math.random() * 0.55, rot: Math.random() * Math.PI * 2 };
}

/** Pine canopy tiers: [y-offset (×scale), radius, height] */
const TIERS: [number, number, number][] = [
  [2.3, 1.5, 2.6],
  [3.5, 1.1, 2.1],
  [4.55, 0.72, 1.7],
];

const _bushDummy = new THREE.Object3D();
function placeBush(mesh: THREE.InstancedMesh, i: number, b: Tree) {
  _bushDummy.position.set(b.x, b.s * 0.45, b.z);
  _bushDummy.scale.set(b.s * 1.25, b.s * 0.85, b.s * 1.15);
  _bushDummy.rotation.set(0, b.rot, 0);
  _bushDummy.updateMatrix();
  mesh.setMatrixAt(i, _bushDummy.matrix);
}

export default function Forest() {
  const quality = useNightRun((s) => s.quality);
  const bushes = useRef<THREE.InstancedMesh>(null);
  const bushMat = useRef<THREE.MeshStandardMaterial>(null);
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

  const bushNight = useMemo(() => new THREE.Color(BUSH_COLOR.night), []);
  const bushDay = useMemo(() => new THREE.Color(BUSH_COLOR.day), []);
  const bushList = useMemo<Tree[]>(
    () => Array.from({ length: BUSH_COUNT }, (_, i) => seatBush(-(i / BUSH_COUNT) * DEPTH - 4)),
    []
  );

  const trees = useMemo<Tree[]>(
    () =>
      Array.from({ length: TREE_COUNT }, (_, i) =>
        seatTree(-(i / TREE_COUNT) * DEPTH - 4)
      ),
    []
  );

  const rimUniforms = useRef<ReturnType<typeof applyFresnelRim>[]>([]);

  // Night rim/fresnel highlight on the canopy — one shared shader
  // utility (also used by clay hero objects), gated to near-zero
  // intensity outside of night/tier-2 rather than swapped materials.
  useEffect(() => {
    const mats = [tier0Mat.current, tier1Mat.current, tier2Mat.current];
    rimUniforms.current = mats.map((m) =>
      m ? applyFresnelRim(m, { color: "#93a8d1", power: 2.4, intensity: 0 }) : null
    ).filter(Boolean) as ReturnType<typeof applyFresnelRim>[];
  }, []);

  // BUG FIX 1 — trees invisible during "name"/"igniting": the frame
  // loop below early-returns on `dz === 0` (true before the truck ever
  // moves), which skipped the *initial* instance-matrix seed along
  // with the per-frame recycle update, leaving every instance at its
  // default identity matrix (all trees stacked at the origin). Seed
  // once on mount, independent of speed/phase.
  useEffect(() => {
    const tMesh = trunks.current;
    const tierMeshes = [tier0.current, tier1.current, tier2.current];
    if (!tMesh || tierMeshes.some((m) => !m)) return;
    for (let i = 0; i < TREE_COUNT; i++) {
      const tree = trees[i];
      dummy.position.set(tree.x, tree.s * 1.1, tree.z);
      dummy.scale.set(tree.s, tree.s, tree.s);
      dummy.rotation.set(0, tree.rot, 0);
      dummy.updateMatrix();
      tMesh.setMatrixAt(i, dummy.matrix);
      for (let j = 0; j < TIERS.length; j++) {
        dummy.position.set(tree.x, tree.s * TIERS[j][0], tree.z);
        dummy.updateMatrix();
        tierMeshes[j]!.setMatrixAt(i, dummy.matrix);
      }
    }
    tMesh.instanceMatrix.needsUpdate = true;
    for (const m of tierMeshes) m!.instanceMatrix.needsUpdate = true;
    if (bushes.current) {
      bushList.forEach((b, i) => placeBush(bushes.current!, i, b));
      bushes.current.instanceMatrix.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // guard against tab-switch jumps
    const { phase, speed } = useNightRun.getState();

    // The truck only moves when the driver drives (W). While a sheet
    // is open (reading/returning) it keeps a gentle ambient roll.
    const TOP = CRUISE_SPEED * 1.75 * speed; // ~37 m/s (≈130 km/h) flat out
    if (phase === "cruising") {
      if (input.brake > 0) {
        // Real brakes: linear decel — stops from top speed in ~30m
        speedRef.current = Math.max(0, speedRef.current - 14 * delta);
      } else if (input.throttle > 0) {
        speedRef.current += (TOP - speedRef.current) * Math.min(1, delta * 0.75);
      } else {
        // Coasting: gentle engine-drag decel
        speedRef.current = Math.max(0, speedRef.current - 2.5 * delta);
      }
      speedRef.current = Math.min(speedRef.current, TOP || speedRef.current);
    } else {
      const target = phase === "reading" || phase === "returning" ? 9 * speed : 0;
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
    if (bushMat.current) bushMat.current.color.lerpColors(bushNight, bushDay, groundT);

    // Rim intensity: only worth the fresnel term at night, and only
    // at tier 2 (spec: "at tier 1, drop the rim-light term").
    const nightFactor = 1 - bandT(timeOfDayState.t, 0, 0.35);
    const rimTarget = quality >= 2 ? 0.4 * nightFactor : 0;
    for (const u of rimUniforms.current) {
      if (u) u.uRimIntensity.value = rimTarget;
    }

    const dz = speedRef.current * delta;
    drive.dist += dz;
    advanceCurve(dz);
    if (dz === 0) return;

    // 1) Verge bushes: slide + recycle
    if (bushes.current) {
      for (let i = 0; i < BUSH_COUNT; i++) {
        const b = bushList[i];
        b.z += dz;
        if (b.z > 6) Object.assign(b, seatBush(b.z - DEPTH));
        placeBush(bushes.current, i, b);
      }
      bushes.current.instanceMatrix.needsUpdate = true;
    }

    // 2) Trees: slide + recycle
    const tMesh = trunks.current;
    const tierMeshes = [tier0.current, tier1.current, tier2.current];
    if (!tMesh || tierMeshes.some((m) => !m)) return;
    for (let i = 0; i < TREE_COUNT; i++) {
      const tree = trees[i];
      tree.z += dz;
      if (tree.z > 8) {
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
      {/* Verge shrubs — soft low-poly blobs */}
      <instancedMesh
        ref={bushes}
        args={[undefined, undefined, BUSH_COUNT]}
        castShadow={quality > 0}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial ref={bushMat} color={BUSH_COLOR.night} roughness={1} flatShading />
      </instancedMesh>

      {/* Trunks — frustumCulled off (BUG FIX 2): the recycling logic
          above rewrites instance matrices every frame, but Three only
          computes an InstancedMesh's culling bounds once from its
          initial layout, so a stale bound can incorrectly cull
          instances near the far draw distance. Safe to disable here
          because recycling already keeps every instance within a
          known, bounded, road-relative volume every frame. */}
      <instancedMesh
        ref={trunks}
        args={[undefined, undefined, TREE_COUNT]}
        castShadow={quality > 0}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.16, 0.26, 2.4, 8]} />
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
          frustumCulled={false}
        >
          <coneGeometry args={[TIERS[j][1], TIERS[j][2], 9]} />
          <meshStandardMaterial ref={tier.matRef} color={tier.color} roughness={1} />
        </instancedMesh>
      ))}
    </group>
  );
}
