"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { drive } from "@/lib/driveState";
import { bendMaterial } from "@/lib/curveWorld";
import { timeOfDayState, bandT } from "@/lib/timeOfDayState";
import {
  sim,
  useGame,
  activeSite,
  VEHICLE_TYPES,
  LANES,
  ISLAND_X,
  ISLAND_W,
  ISLAND_START,
  ISLAND_END,
  BAY_W,
  BAY_L,
  BAY_X,
  LAYBY_LEFT,
  LAYBY_BEFORE,
  LAYBY_AFTER,
  type Plaza,
  type Site,
} from "@/lib/game";
import { MAIN_LEFT, MAIN_RIGHT } from "@/lib/highway";
import { createVehicleGeometry } from "@/lib/vehicleModels";

/**
 * Everything the delivery game puts on the road: traffic, toll
 * plazas and pickup/drop lay-bys. Positions come from `sim` (road
 * coordinate s → world z = -(s - dist)); this file only draws.
 *
 * Traffic uses shared solid toy-vehicle meshes with fully modeled roofs,
 * cabins, cargo bodies, windows and wheels, lit by the world lighting.
 */

const BASE = typeof window === "undefined" ? "" : window.location.pathname.replace(/\/$/, "");
const G = (n: string) => `${BASE}/game/${n}`;
const POOL = 36;

function srgb(t: THREE.Texture) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function stdMat(opts: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...opts });
  bendMaterial(m);
  return m;
}

// ---------------------------------------------------------------- traffic
function Traffic() {
  const kit = useMemo(() => {
    const geos = Object.fromEntries(VEHICLE_TYPES.map((type) => [type, createVehicleGeometry(type)]));
    const material = stdMat({ vertexColors: true, roughness: 0.72, emissive: "#ffffff", emissiveIntensity: 0.025 });
    return { geos, material };
  }, []);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => () => {
    Object.values(kit.geos).forEach((geometry) => geometry.dispose());
    kit.material.dispose();
  }, [kit]);

  useFrame(() => {
    for (let i = 0; i < POOL; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const c = sim.cars[i];
      if (!c) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.geometry = kit.geos[c.type];
      mesh.material = kit.material;
      mesh.position.set(c.x, 0.01, -(c.s - drive.dist));
      mesh.rotation.y = c.dir === 1 ? c.vx * -0.04 : Math.PI;
    }
  });

  return (
    <group>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={i}
          geometry={kit.geos.hatch}
          material={kit.material}
          dispose={null}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          visible={false}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- toll plaza
function useSignTexture(lines: [string, string], bg: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 240, 28);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "800 64px 'Arial Rounded MT Bold', Arial, sans-serif";
    ctx.fillText(lines[0], 256, 112);
    ctx.font = "700 40px Arial, sans-serif";
    ctx.fillText(lines[1], 256, 192);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [lines, bg]);
}

const TOLL_SIGN_LINES: [string, string] = ["TOLL PLAZA", "FASTag lane · slow to 30"];

function TollPlaza({ plaza, tex }: { plaza: Plaza; tex: Record<string, THREE.Texture> }) {
  const group = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const lamp = useRef<THREE.PointLight>(null);
  const signTex = useSignTexture(TOLL_SIGN_LINES, "#1f7a3c");

  const mats = useMemo(() => {
    const kerb = tex.kerb.clone();
    kerb.wrapS = THREE.RepeatWrapping;
    kerb.repeat.set(2, 1);
    const white = stdMat({ color: "#eef1f4" });
    const blue = stdMat({ color: "#2f6fd6" });
    return {
      island: [stdMat({ map: kerb }), stdMat({ map: kerb }), stdMat({ color: "#d9d4c7" }), white, stdMat({ map: kerb }), stdMat({ map: kerb })],
      booth: [stdMat({ map: tex.booth, alphaTest: 0.5 }), stdMat({ map: tex.booth, alphaTest: 0.5 }), blue, blue, stdMat({ map: tex.booth, alphaTest: 0.5 }), white],
      canopy: [white, white, blue, stdMat({ color: "#cfd6de" }), stdMat({ map: tex.canopy }), white],
      pillar: stdMat({ color: "#8d96a3" }),
      post: stdMat({ map: tex.post, alphaTest: 0.5, side: THREE.DoubleSide }),
      arm: stdMat({ map: tex.arm, alphaTest: 0.5, side: THREE.DoubleSide }),
      fast: stdMat({ map: tex.fast, alphaTest: 0.5, emissive: "#ffffff", emissiveMap: tex.fast, emissiveIntensity: 0.25 }),
      cash: stdMat({ map: tex.cash, alphaTest: 0.5, emissive: "#ffffff", emissiveMap: tex.cash, emissiveIntensity: 0.25 }),
      sign: stdMat({ map: signTex, emissive: "#ffffff", emissiveMap: signTex, emissiveIntensity: 0.2 }),
      signPost: stdMat({ color: "#6b7280" }),
      stripe: stdMat({ color: "#f3f3f3" }),
    };
  }, [tex, signTex]);

  useFrame(() => {
    if (group.current) group.current.position.z = -(plaza.s - drive.dist);
    // Canopy floodlights come on after dark.
    if (lamp.current) lamp.current.intensity = 60 * (1 - bandT(timeOfDayState.t, 0.1, 0.6));
    plaza.barriers.forEach((b, i) => {
      const a = arms.current[i];
      if (a) a.rotation.z = b.open * 1.35;
    });
  });

  const islandLen = ISLAND_START + ISLAND_END;
  const islandZ = (ISLAND_START - ISLAND_END) / 2; // local z (+ = approach side)
  const canopyW = MAIN_RIGHT - MAIN_LEFT + 0.6;
  const canopyX = (MAIN_LEFT + MAIN_RIGHT) / 2;

  return (
    <group ref={group}>
      {/* Islands with black/yellow kerbs */}
      {ISLAND_X.map((x) => (
        <mesh key={`i${x}`} position={[x, 0.17, islandZ]} material={mats.island}>
          <boxGeometry args={[ISLAND_W, 0.34, islandLen]} />
        </mesh>
      ))}
      {/* Booths on every island */}
      {ISLAND_X.map((x) => (
        <mesh key={`b${x}`} position={[x, 0.34 + 1.2, 1.8]} material={mats.booth} castShadow>
          <boxGeometry args={[ISLAND_W, 2.4, 1.7]} />
        </mesh>
      ))}
      {/* Pillars + canopy */}
      {ISLAND_X.map((x) => (
        <mesh key={`p${x}`} position={[x, 3.3, 4.5]} material={mats.pillar}>
          <cylinderGeometry args={[0.16, 0.16, 6.4, 10]} />
        </mesh>
      ))}
      <pointLight ref={lamp} position={[canopyX, 5.6, 6]} color="#fff1d0" distance={34} decay={1.6} intensity={0} />
      <mesh position={[canopyX, 6.9, 3.2]} material={mats.canopy} castShadow>
        <boxGeometry args={[canopyW, 1.3, 9]} />
      </mesh>
      {/* Lane signs under the canopy front edge */}
      {LANES.map((x, li) => (
        <mesh key={`s${li}`} position={[x, 5.5, 7.75]} material={li === plaza.fastLane ? mats.fast : mats.cash}>
          <planeGeometry args={[1.25, 1.25]} />
        </mesh>
      ))}
      {/* Barriers: post on the island left of each lane, arm across the lane */}
      {LANES.map((_, li) => {
        const px = ISLAND_X[li] + ISLAND_W / 2 + 0.05;
        return (
          <group key={`g${li}`}>
            <mesh position={[px, 0.34 + 0.55, 0.05]} material={mats.post}>
              <planeGeometry args={[0.42, 1.1]} />
            </mesh>
            <group
              position={[px + 0.12, 1.12, 0]}
              ref={(g) => {
                arms.current[li] = g;
              }}
            >
              <mesh position={[1.45, 0, 0]} material={mats.arm}>
                <planeGeometry args={[2.9, 0.26]} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* Stop line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[canopyX, 0.02, 0.6]} material={mats.stripe}>
        <planeGeometry args={[canopyW - 0.6, 0.35]} />
      </mesh>
      {/* Advance sign on the left verge */}
      <group position={[MAIN_LEFT - 2.2, 0, 170]}>
        <mesh position={[0, 3.3, 0]} rotation={[0, 0.25, 0]} material={mats.sign}>
          <planeGeometry args={[3.6, 1.8]} />
        </mesh>
        <mesh position={[0, 1.3, -0.05]} material={mats.signPost}>
          <cylinderGeometry args={[0.07, 0.07, 2.6, 8]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- lay-by sites
function laybyShape() {
  // Trapezoid in (x, z) so the tapers match GameSim's lay-by limits.
  const right = MAIN_LEFT + 0.05;
  const left = LAYBY_LEFT;
  const near = LAYBY_BEFORE; // approach side (+z local)
  const far = -LAYBY_AFTER;
  const taper = 16;
  const sh = new THREE.Shape();
  sh.moveTo(right, near);
  sh.lineTo(left, near - taper);
  sh.lineTo(left, far + taper);
  sh.lineTo(right, far);
  sh.closePath();
  const g = new THREE.ShapeGeometry(sh, 1);
  g.rotateX(Math.PI / 2); // shape (x, y) → world (x, 0, y)
  return g;
}

function SiteProps({ site, tex }: { site: Site; tex: Record<string, THREE.Texture> }) {
  const group = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const isPickup = site.kind === "pickup";
  const layby = useMemo(() => laybyShape(), []);
  const mats = useMemo(
    () => ({
      layby: stdMat({ color: "#8a8d93", roughness: 0.95, side: THREE.DoubleSide }),
      bay: stdMat({ map: tex.bay }),
      facade: stdMat({ map: isPickup ? tex.hub : tex.drop, alphaTest: 0.5, side: THREE.DoubleSide }),
      parcels: stdMat({ map: tex.parcels, alphaTest: 0.5, side: THREE.DoubleSide }),
      back: stdMat({ color: isPickup ? "#cfc8bd" : "#e7d4b0" }),
      marker: stdMat({ color: isPickup ? "#ff8a1f" : "#22c55e", emissive: isPickup ? "#ff8a1f" : "#22c55e", emissiveIntensity: 0.6 }),
      beam: (() => {
        const m = new THREE.MeshBasicMaterial({
          color: isPickup ? "#ffb15c" : "#5ee08a",
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        bendMaterial(m);
        return m;
      })(),
    }),
    [tex, isPickup]
  );
  const facadeW = isPickup ? 22 : 13;
  const facadeH = facadeW / (isPickup ? 3.165 : 1.939);
  const green = useMemo(() => new THREE.Color("#7dff9a"), []);
  const white = useMemo(() => new THREE.Color("#ffffff"), []);

  useFrame((state) => {
    if (group.current) group.current.position.z = -(site.s - drive.dist);
    const active = activeSite() === site;
    if (marker.current) {
      marker.current.visible = active;
      marker.current.position.y = 6 + Math.sin(state.clock.elapsedTime * 2.4) * 0.5;
      marker.current.rotation.y += 0.02;
    }
    mats.bay.color.copy(active && sim.inBay ? green : white);
  });

  return (
    <group ref={group}>
      <mesh geometry={layby} position={[0, 0.015, 0]} material={mats.layby} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[BAY_X, 0.03, 0]} material={mats.bay}>
        <planeGeometry args={[BAY_W, BAY_L]} />
      </mesh>
      {/* Building facade angled toward the approaching driver, with a body behind it */}
      <group position={[LAYBY_LEFT - 6.5, 0, -3]} rotation={[0, Math.PI / 2 - 0.42, 0]}>
        <mesh position={[0, facadeH / 2, 0]} material={mats.facade}>
          <planeGeometry args={[facadeW, facadeH]} />
        </mesh>
        <mesh position={[0, facadeH * 0.36, -3.2]} material={mats.back}>
          <boxGeometry args={[facadeW * 0.92, facadeH * 0.72, 6]} />
        </mesh>
      </group>
      {isPickup && (
        <mesh position={[LAYBY_LEFT + 0.8, 0.8, 4]} rotation={[0, Math.PI / 2 - 0.5, 0]} material={mats.parcels}>
          <planeGeometry args={[2.6, 1.6]} />
        </mesh>
      )}
      {/* Floating marker + light beam over the bay */}
      <group ref={marker} position={[BAY_X, 6, 0]}>
        <mesh rotation={[Math.PI, 0, 0]} material={mats.marker}>
          <coneGeometry args={[0.8, 1.6, 4]} />
        </mesh>
        <mesh position={[0, 12, 0]} material={mats.beam}>
          <cylinderGeometry args={[1.4, 1.4, 34, 16, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- root
export default function GameWorld() {
  useGame((g) => g.worldVersion); // re-render when plazas/sites change
  const [booth, post, arm, fast, cash, canopy, kerb, bay, hub, drop, parcels] = useLoader(THREE.TextureLoader, [
    G("booth.webp"),
    G("barrier_post.webp"),
    G("barrier_arm.webp"),
    G("sign_fastag.webp"),
    G("sign_cash.webp"),
    G("canopy.webp"),
    `${BASE}/textures/kerb_side.webp`,
    G("bay.webp"),
    G("hub.webp"),
    G("drop.webp"),
    G("parcels.webp"),
  ]);
  const tex = useMemo(() => {
    const t = { booth, post, arm, fast, cash, canopy, kerb, bay, hub, drop, parcels };
    Object.values(t).forEach(srgb);
    return t;
  }, [booth, post, arm, fast, cash, canopy, kerb, bay, hub, drop, parcels]);

  return (
    <group>
      <Traffic />
      {sim.plazas.map((p) => (
        <TollPlaza key={`p${p.s}`} plaza={p} tex={tex} />
      ))}
      {sim.sites.map((s) => (
        <SiteProps key={`${s.kind}${s.s}`} site={s} tex={tex} />
      ))}
    </group>
  );
}
