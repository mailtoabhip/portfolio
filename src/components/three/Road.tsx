"use client";

import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { timeOfDayState, bandT } from "@/lib/timeOfDayState";
import { drive } from "@/lib/driveState";
import {
  MAIN_LEFT,
  MAIN_WIDTH,
  MEDIAN_LEFT,
  MEDIAN_WIDTH,
  MEDIAN_RIGHT,
  KERB_HEIGHT,
  OPP_LEFT,
  OPP_WIDTH,
  VERGE_L_LEFT,
  VERGE_WIDTH,
  OPP_RIGHT,
  TILE_LEN,
} from "@/lib/highway";

/**
 * The highway: a 3-lane carriageway, a raised kerbed divider, the
 * (not drivable) opposite carriageway, gravel-to-grass verges and a
 * grass ground plane. Textures were painted to scale (see
 * scripts noted in highway.ts): road strips tile every TILE_LEN
 * metres, so motion is just a texture offset — nothing moves.
 *
 * Every strip is subdivided along its length so the curved-world
 * vertex bend (lib/curveWorld.ts) can bow it into turns.
 */

const BASE = typeof window === "undefined" ? "" : window.location.pathname.replace(/\/$/, "");
const tex = (name: string) => `${BASE}/textures/${name}`;

const NEAR_Z = 12; // a little behind the camera
const FAR_Z = -330;
const LEN = NEAR_Z - FAR_Z;
const CENTRE_Z = (NEAR_Z + FAR_Z) / 2;
const LEN_SEGS = Math.ceil(LEN / 2.5);

const GROUND_TILE = 9;
const GROUND_W = 760;

/** Lane paint glows a touch at night (retro-reflective), never by day. */
const NIGHT_LINE_GLOW = 0.32;

function prep(t: THREE.Texture, repeatX: number, repeatY: number, aniso = 8) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = aniso;
}

function Strip({
  x0,
  width,
  y = 0,
  map,
  emissiveMap,
  matRef,
}: {
  x0: number;
  width: number;
  y?: number;
  map: THREE.Texture;
  emissiveMap?: THREE.Texture;
  matRef?: React.Ref<THREE.MeshStandardMaterial>;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x0 + width / 2, y, CENTRE_Z]}
      receiveShadow
    >
      <planeGeometry args={[width, LEN, 1, LEN_SEGS]} />
      <meshStandardMaterial
        ref={matRef}
        map={map}
        emissiveMap={emissiveMap}
        emissive={emissiveMap ? "#ffffff" : "#000000"}
        emissiveIntensity={0}
        roughness={0.92}
      />
    </mesh>
  );
}

export default function Road() {
  const [
    mainMap,
    mainMask,
    oppMap,
    oppMask,
    medianMap,
    kerbMap,
    vergeL,
    vergeR,
    groundMap,
  ] = useLoader(THREE.TextureLoader, [
    tex("road_main.webp"),
    tex("road_main_mask.webp"),
    tex("road_opp.webp"),
    tex("road_opp_mask.webp"),
    tex("median_top.webp"),
    tex("kerb_side.webp"),
    tex("verge_l.webp"),
    tex("verge_r.webp"),
    tex("ground.webp"),
  ]);

  // Clone the kerb texture so the two faces can scroll in opposite
  // directions (their U axes point opposite ways along the road).
  const kerbNear = kerbMap;
  const kerbFar = useMemo(() => kerbMap.clone(), [kerbMap]);

  const along = LEN / TILE_LEN;
  useMemo(() => {
    for (const t of [mainMap, mainMask, oppMap, oppMask, medianMap, vergeL, vergeR]) {
      prep(t, 1, along);
    }
    prep(kerbNear, LEN / 6, 1, 4);
    prep(kerbFar, LEN / 6, 1, 4);
    prep(groundMap, GROUND_W / GROUND_TILE, LEN / GROUND_TILE, 8);
    for (const t of [mainMask, oppMask]) t.colorSpace = THREE.NoColorSpace;
  }, [mainMap, mainMask, oppMap, oppMask, medianMap, vergeL, vergeR, kerbNear, kerbFar, groundMap, along]);

  const mainMat = useRef<THREE.MeshStandardMaterial>(null);
  const oppMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, rawDelta) => {
    const dz = drive.speed * Math.min(rawDelta, 0.1);
    if (dz) {
      const v = dz / TILE_LEN;
      for (const t of [mainMap, mainMask, oppMap, oppMask, medianMap, vergeL, vergeR]) {
        t.offset.y = (t.offset.y + v) % 1;
      }
      groundMap.offset.y = (groundMap.offset.y + dz / GROUND_TILE) % 1;
      kerbNear.offset.x = (kerbNear.offset.x - dz / 6) % 1;
      kerbFar.offset.x = (kerbFar.offset.x + dz / 6) % 1;
    }
    const night = 1 - bandT(timeOfDayState.t, 0.15, 0.6);
    if (mainMat.current) mainMat.current.emissiveIntensity = NIGHT_LINE_GLOW * night;
    if (oppMat.current) oppMat.current.emissiveIntensity = NIGHT_LINE_GLOW * 0.7 * night;
  });

  return (
    <group>
      {/* Grass ground under everything */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(VERGE_L_LEFT + OPP_RIGHT) / 2, -0.02, CENTRE_Z]}
        receiveShadow
      >
        <planeGeometry args={[GROUND_W, LEN, 12, LEN_SEGS]} />
        <meshStandardMaterial map={groundMap} roughness={1} />
      </mesh>

      <Strip x0={VERGE_L_LEFT} width={VERGE_WIDTH} y={0.005} map={vergeL} />
      <Strip x0={MAIN_LEFT} width={MAIN_WIDTH} y={0.01} map={mainMap} emissiveMap={mainMask} matRef={mainMat} />
      <Strip x0={OPP_LEFT} width={OPP_WIDTH} y={0.01} map={oppMap} emissiveMap={oppMask} matRef={oppMat} />
      <Strip x0={OPP_RIGHT} width={VERGE_WIDTH} y={0.005} map={vergeR} />

      {/* Raised divider: grassy top + black/yellow kerb faces */}
      <Strip x0={MEDIAN_LEFT} width={MEDIAN_WIDTH} y={KERB_HEIGHT} map={medianMap} />
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[MEDIAN_LEFT, KERB_HEIGHT / 2, CENTRE_Z]} receiveShadow>
        <planeGeometry args={[LEN, KERB_HEIGHT, LEN_SEGS, 1]} />
        <meshStandardMaterial map={kerbNear} roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[MEDIAN_RIGHT, KERB_HEIGHT / 2, CENTRE_Z]}>
        <planeGeometry args={[LEN, KERB_HEIGHT, LEN_SEGS, 1]} />
        <meshStandardMaterial map={kerbFar} roughness={0.85} />
      </mesh>
    </group>
  );
}
