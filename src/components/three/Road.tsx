"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { timeOfDayState, bandT, ROAD_COLOR, GROUND_COLOR } from "@/lib/timeOfDayState";

/**
 * The forest road: forest-floor ground + asphalt strip.
 * Both are uniform surfaces, so they can stay static — all visible
 * motion (dashes, trees) lives in <Forest /> (Z-recycled).
 *
 * Both materials cross-fade night->day, reading their own copy of the
 * shared `t` each frame — no ref/prop plumbing from SkySystem,
 * matching the "each element reads t on its own" pattern. Both use
 * the same 0.35-0.7 window as the tree canopy swap, so ground/road/
 * trees all finish settling together.
 */

const ROAD_LENGTH = 240;
// Ground plane: sized to clear the day-mode fog far distance (220) in
// every direction the wide FOV can see, not just straight down the road.
const GROUND_WIDTH = 700;
const GROUND_DEPTH = 520;
const GROUND_Z = -(GROUND_DEPTH / 2 - 60); // extends a little behind the camera too

function makeGroundTexture(): THREE.CanvasTexture {
  // Cheap "not a flat color fill" pass: a soft radial gradient,
  // lighter near the road, darkening toward the far terrain — reads
  // as uneven ground once tinted by the night/day material color,
  // without needing per-vertex detail on a single static plane.
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 300);
  grad.addColorStop(0, "#f2f2f2");
  grad.addColorStop(1, "#a8a8a8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export default function Road() {
  const asphaltMat = useRef<THREE.MeshStandardMaterial>(null);
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const roadNight = useMemo(() => new THREE.Color(ROAD_COLOR.night), []);
  const roadDay = useMemo(() => new THREE.Color(ROAD_COLOR.day), []);
  const groundNight = useMemo(() => new THREE.Color(GROUND_COLOR.night), []);
  const groundDay = useMemo(() => new THREE.Color(GROUND_COLOR.day), []);
  const groundTexture = useMemo(() => makeGroundTexture(), []);

  useFrame(() => {
    const groundT = bandT(timeOfDayState.t, 0.35, 0.7);
    if (asphaltMat.current) asphaltMat.current.color.lerpColors(roadNight, roadDay, groundT);
    if (groundMat.current) groundMat.current.color.lerpColors(groundNight, groundDay, groundT);
  });

  return (
    <group>
      {/* Forest floor either side of the road */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.5, 0, GROUND_Z]}
        receiveShadow
      >
        <planeGeometry args={[GROUND_WIDTH, GROUND_DEPTH]} />
        <meshStandardMaterial
          ref={groundMat}
          map={groundTexture}
          color={GROUND_COLOR.night}
          roughness={1}
        />
      </mesh>

      {/* Asphalt — slightly raised to avoid z-fighting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.5, 0.02, -ROAD_LENGTH / 2]}
        receiveShadow
      >
        <planeGeometry args={[7, ROAD_LENGTH]} />
        <meshStandardMaterial ref={asphaltMat} color={ROAD_COLOR.night} roughness={0.85} />
      </mesh>
    </group>
  );
}
