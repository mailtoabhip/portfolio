"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { timeOfDayState, ease, bandT, SKY, SKY_TOP, HILLS } from "@/lib/timeOfDayState";

/**
 * Backdrop for the reference look: a gradient sky dome, soft cartoon
 * clouds by day, stars by night, and two layers of hazy low-poly
 * hills on the horizon. Everything here is far away and opted out of
 * the curved-world bend (userData.noBend), and none of it is fogged —
 * the dome's horizon colour equals the fog colour, so the ground
 * melts into it.
 */

const DOME_R = 460;
const NO_BEND = { noBend: true };

function makeCloudTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // Puffs: a row of overlapping soft circles, flatter at the base.
  const puffs = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < puffs; i++) {
    const x = 90 + (i / (puffs - 1)) * 330 + (rnd() - 0.5) * 30;
    const r = 45 + rnd() * 50 - Math.abs(i - puffs / 2) * 6;
    const y = 165 - r * 0.55;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.75, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flat soft base
  ctx.globalCompositeOperation = "destination-out";
  const base = ctx.createLinearGradient(0, 175, 0, 215);
  base.addColorStop(0, "rgba(0,0,0,0)");
  base.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 175, 512, 81);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHills(radius: number, minH: number, maxH: number, seed: number) {
  const segs = 220;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const n =
      0.5 +
      0.28 * Math.sin(a * 3 + seed) +
      0.14 * Math.sin(a * 7.3 + seed * 2.1) +
      0.08 * Math.sin(a * 17.1 + seed * 0.7);
    const h = minH + (maxH - minH) * Math.max(0, Math.min(1, n));
    const x = Math.sin(a) * radius;
    const z = -Math.cos(a) * radius;
    pos.push(x, -8, z, x, h, z);
    if (i < segs) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const CLOUDS: { x: number; y: number; z: number; w: number; seed: number }[] = [
  { x: -150, y: 95, z: -330, w: 120, seed: 3 },
  { x: -40, y: 125, z: -380, w: 90, seed: 11 },
  { x: 90, y: 88, z: -340, w: 110, seed: 23 },
  { x: 210, y: 115, z: -300, w: 95, seed: 37 },
  { x: -260, y: 120, z: -220, w: 100, seed: 41 },
  { x: 290, y: 80, z: -150, w: 85, seed: 53 },
  { x: 20, y: 160, z: -300, w: 70, seed: 67 },
];

export default function SkyDome() {
  const domeMat = useRef<THREE.ShaderMaterial>(null);
  const starMat = useRef<THREE.PointsMaterial>(null);
  const cloudMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const cloudGroup = useRef<THREE.Group>(null);
  const hillNear = useRef<THREE.MeshBasicMaterial>(null);
  const hillFar = useRef<THREE.MeshBasicMaterial>(null);

  const cols = useMemo(
    () => ({
      topN: new THREE.Color(SKY_TOP.night),
      topD: new THREE.Color(SKY_TOP.day),
      horN: new THREE.Color(SKY.night),
      horD: new THREE.Color(SKY.day),
      nearN: new THREE.Color(HILLS.nearNight),
      nearD: new THREE.Color(HILLS.nearDay),
      farN: new THREE.Color(HILLS.farNight),
      farD: new THREE.Color(HILLS.farDay),
    }),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(SKY_TOP.night) },
      uHorizon: { value: new THREE.Color(SKY.night) },
    }),
    []
  );

  const starGeo = useMemo(() => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 650;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const y = 0.08 + Math.pow(rand(), 0.8) * 0.92;
      const r = Math.sqrt(1 - y * y);
      p[i * 3] = Math.cos(a) * r * (DOME_R - 20);
      p[i * 3 + 1] = y * (DOME_R - 20);
      p[i * 3 + 2] = Math.sin(a) * r * (DOME_R - 20);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);

  const cloudTextures = useMemo(() => CLOUDS.map((c) => makeCloudTexture(c.seed)), []);
  const hillsFarGeo = useMemo(() => makeHills(400, 14, 58, 1.3), []);
  const hillsNearGeo = useMemo(() => makeHills(350, 4, 34, 4.1), []);

  useFrame((_, rawDelta) => {
    const t = timeOfDayState.t;
    const mix = ease(t);
    uniforms.uTop.value.lerpColors(cols.topN, cols.topD, mix);
    uniforms.uHorizon.value.lerpColors(cols.horN, cols.horD, mix);
    if (starMat.current) starMat.current.opacity = 1 - bandT(t, 0.05, 0.45);
    const day = bandT(t, 0.3, 0.9);
    for (const m of cloudMats.current) if (m) m.opacity = 0.95 * day;
    if (cloudGroup.current) {
      // Slow drift, wrapped so clouds never run out.
      cloudGroup.current.position.x = ((cloudGroup.current.position.x + rawDelta * 1.2 + 300) % 600) - 300;
    }
    if (hillNear.current) hillNear.current.color.lerpColors(cols.nearN, cols.nearD, mix);
    if (hillFar.current) hillFar.current.color.lerpColors(cols.farN, cols.farD, mix);
  });

  return (
    <group userData={NO_BEND}>
      <mesh userData={NO_BEND} renderOrder={-10}>
        <sphereGeometry args={[DOME_R, 32, 16]} />
        <shaderMaterial
          ref={domeMat}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={
            /* glsl */ `
            varying vec3 vDir;
            void main() {
              vDir = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`
          }
          fragmentShader={
            /* glsl */ `
            uniform vec3 uTop;
            uniform vec3 uHorizon;
            varying vec3 vDir;
            void main() {
              float h = smoothstep(0.0, 0.55, vDir.y);
              gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.8)), 1.0);
              #include <colorspace_fragment>
            }`
          }
        />
      </mesh>

      <points geometry={starGeo} userData={NO_BEND} renderOrder={-9}>
        <pointsMaterial
          ref={starMat}
          color="#dfe9ff"
          size={1.7}
          sizeAttenuation={false}
          transparent
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </points>

      <mesh geometry={hillsFarGeo} userData={NO_BEND} renderOrder={-8}>
        <meshBasicMaterial ref={hillFar} fog={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={hillsNearGeo} userData={NO_BEND} renderOrder={-7}>
        <meshBasicMaterial ref={hillNear} fog={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={cloudGroup} userData={NO_BEND}>
        {CLOUDS.map((c, i) => (
          <mesh
            key={i}
            position={[c.x, c.y, c.z]}
            userData={NO_BEND}
            renderOrder={-6}
            onUpdate={(m) => m.lookAt(0, c.y * 0.6, 0)}
          >
            <planeGeometry args={[c.w, c.w / 2]} />
            <meshBasicMaterial
              ref={(m) => {
                cloudMats.current[i] = m;
              }}
              map={cloudTextures[i]}
              transparent
              depthWrite={false}
              fog={false}
              toneMapped={false}
              opacity={0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
