"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useNightRun } from "@/lib/store";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { sim, TIME_LIMIT, fmtMetres } from "@/lib/game";
import CabInterior, { CAB, CABIN, cabMats } from "@/components/three/CabInterior";
import { timeOfDayState } from "@/lib/timeOfDayState";
import Tablet from "@/components/three/Tablet";
import PhoneStand from "@/components/three/PhoneStand";

/**
 * Truck cab, after the reference photos: a modern dark cabin with a
 * digital instrument cluster, a passenger-side navigation screen, a
 * silver-spoked steering wheel, and a white cab exterior (hood, pillar
 * skins, mirrors on arms) seen past the glass.
 *
 * Camera sits at [0, 1.4, 0] in the driver's seat, looking down -Z.
 * Right-hand drive (Indian truck).
 */

const HEADLINER = "#8a8d92";
const PILLAR = "#5c5f65";
const FLOOR = "#25272b";
const EXTERIOR = "#f1f0ec"; // white cab, like the reference truck
const LEATHER = "#1b1d21";

// ---------------------------------------------------------------
// Steering wheel
// ---------------------------------------------------------------
function SteeringWheel() {
  const spinner = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => ({
      pad: new RoundedBoxGeometry(0.17, 0.15, 0.06, 4, 0.05),
      spoke: new RoundedBoxGeometry(0.13, 0.05, 0.03, 3, 0.014),
      pod: new RoundedBoxGeometry(0.075, 0.06, 0.02, 3, 0.012),
      leg: new RoundedBoxGeometry(0.045, 0.16, 0.03, 3, 0.012),
    }),
    []
  );
  const mats = useMemo(
    () => ({
      leather: new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.55 }),
      silver: new THREE.MeshStandardMaterial({ color: "#c9ccd0", roughness: 0.28, metalness: 0.85 }),
      pod: new THREE.MeshStandardMaterial({ color: "#121417", roughness: 0.35 }),
      button: new THREE.MeshBasicMaterial({ color: "#7d8a99", toneMapped: false }),
      column: new THREE.MeshStandardMaterial({ color: "#2b2e33", roughness: 0.8 }),
    }),
    []
  );

  useFrame((_, rawDelta) => {
    const s = spinner.current;
    if (!s) return;
    const delta = Math.min(rawDelta, 0.1);
    // Steer right (D) → wheel turns clockwise from the driver's view
    const target = -input.steer * 0.75;
    s.rotation.z += (target - s.rotation.z) * Math.min(1, delta * 6);
  });

  const R = 0.26;
  return (
    <group position={[0, 1.0, -0.7]} rotation={[-1.0, 0, 0]}>
      <group ref={spinner}>
        {/* Thick leather rim with a stitched-look inner ring */}
        <mesh material={mats.leather}>
          <torusGeometry args={[R, 0.034, 20, 64]} />
        </mesh>
        <mesh position={[0, 0, 0.012]} material={mats.pod}>
          <torusGeometry args={[R - 0.022, 0.006, 6, 64]} />
        </mesh>
        {/* Hub (airbag cover) */}
        <mesh geometry={geo.pad} position={[0, -0.01, 0.01]} material={mats.leather} />
        {/* Silver side spokes with button pods */}
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.15, 0.0, 0.0]}>
            <mesh geometry={geo.spoke} material={mats.silver} />
            <mesh geometry={geo.pod} position={[side * -0.005, 0.0, 0.022]} material={mats.pod} />
            <mesh position={[0, 0, 0.033]} material={mats.button}>
              <ringGeometry args={[0.012, 0.015, 20]} />
            </mesh>
          </group>
        ))}
        {/* Silver lower legs */}
        {[1, -1].map((side) => (
          <mesh
            key={`l${side}`}
            geometry={geo.leg}
            position={[side * 0.07, -0.15, 0]}
            rotation={[0, 0, side * 0.5]}
            material={mats.silver}
          />
        ))}
      </group>
      {/* Column + shroud (doesn't spin) */}
      <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]} material={mats.column}>
        <cylinderGeometry args={[0.07, 0.05, 0.42, 20]} />
      </mesh>
      {/* Indicator / wiper stalks */}
      {[1, -1].map((side) => (
        <mesh key={`s${side}`} position={[side * 0.11, 0.02, -0.12]} rotation={[0, 0, side * Math.PI / 2]} material={mats.column}>
          <cylinderGeometry args={[0.008, 0.01, 0.14, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------
// Digital instrument cluster (canvas, redrawn ~10×/s)
// ---------------------------------------------------------------
const CW = 1024;
const CH = 440;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ringGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, frac: number, c1: string, c2: string) {
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#16202c";
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  // ticks
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(160,190,220,0.35)";
  for (let i = 0; i <= 14; i++) {
    const a = a0 + ((a1 - a0) * i) / 14;
    const r1 = r - 22;
    const r2 = r - (i % 2 ? 28 : 34);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  if (frac > 0.002) {
    const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.lineWidth = 16;
    ctx.strokeStyle = g;
    ctx.shadowColor = c2;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * Math.min(1, frac));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawCluster(ctx: CanvasRenderingContext2D) {
  const kmh = Math.min(140, Math.abs(drive.speed) * 3.6);
  ctx.clearRect(0, 0, CW, CH);
  roundRect(ctx, 4, 4, CW - 8, CH - 8, 60);
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#0a1320");
  bg.addColorStop(1, "#04070c");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(90,140,200,0.25)";
  ctx.stroke();

  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ---- Left: speed ----
  ringGauge(ctx, 215, 235, 150, kmh / 140, "#1ad2ff", "#2f6bff");
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 112px ${font}`;
  ctx.fillText(String(Math.round(kmh)), 215, 225);
  ctx.fillStyle = "rgba(190,215,240,0.7)";
  ctx.font = `500 28px ${font}`;
  ctx.fillText("km/h", 215, 300);

  // ---- Right: what the game needs ----
  let big = "";
  let small = "";
  let frac = 0;
  let c1 = "#1ad2ff";
  let c2 = "#2f6bff";
  if (sim.job === "delivering" || sim.job === "unloading") {
    const t = Math.max(0, Math.ceil(sim.timeLeft));
    big = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    small = "TIME LEFT";
    frac = sim.timeLeft / TIME_LIMIT;
    if (sim.timeLeft <= 10) {
      c1 = "#ffb21f";
      c2 = "#ff5a4f";
    }
  } else if (sim.job === "freeRun" || sim.job === "freeOver") {
    big = fmtMetres(sim.free.score);
    small = "FREE RUN";
    frac = Math.min(1, Math.abs(drive.speed) / 37);
    c1 = "#b6ff3a";
    c2 = "#ccff00";
  } else {
    big = drive.speed < -0.2 ? "R" : Math.abs(drive.speed) < 0.2 ? "N" : "D";
    small = "GEAR";
    frac = 0.72; // fuel
    c1 = "#36e08a";
    c2 = "#19b36b";
  }
  ringGauge(ctx, 809, 235, 150, frac, c1, c2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${big.length > 4 ? 64 : 96}px ${font}`;
  ctx.fillText(big, 809, 228);
  ctx.fillStyle = "rgba(190,215,240,0.7)";
  ctx.font = `500 24px ${font}`;
  ctx.fillText(small, 809, 300);

  // ---- Centre: lane view with our truck ----
  const cx = CW / 2;
  ctx.strokeStyle = "rgba(120,170,230,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 30, 120);
  ctx.lineTo(cx - 95, 360);
  ctx.moveTo(cx + 30, 120);
  ctx.lineTo(cx + 95, 360);
  ctx.stroke();
  ctx.setLineDash([16, 18]);
  ctx.lineDashOffset = -(drive.dist * 6) % 34;
  ctx.beginPath();
  ctx.moveTo(cx, 125);
  ctx.lineTo(cx, 360);
  ctx.strokeStyle = "rgba(170,210,255,0.5)";
  ctx.stroke();
  ctx.setLineDash([]);
  // truck glyph
  const tx = cx + Math.max(-40, Math.min(40, drive.x * 9));
  roundRect(ctx, tx - 20, 270, 40, 62, 10);
  ctx.fillStyle = "#dfe8f2";
  ctx.fill();
  roundRect(ctx, tx - 14, 278, 28, 16, 5);
  ctx.fillStyle = "#4b6a8f";
  ctx.fill();

  // ---- Top strip: clock + outside temperature ----
  const now = new Date();
  ctx.fillStyle = "rgba(200,220,240,0.8)";
  ctx.font = `500 24px ${font}`;
  ctx.fillText(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`, cx, 60);
  ctx.fillStyle = "rgba(160,185,210,0.55)";
  ctx.font = `500 20px ${font}`;
  ctx.fillText("28°C  ·  ECO", cx, 92);
  // range bar
  roundRect(ctx, cx - 70, 395, 140, 8, 4);
  ctx.fillStyle = "#16202c";
  ctx.fill();
  roundRect(ctx, cx - 70, 395, 100, 8, 4);
  ctx.fillStyle = "#1ad2ff";
  ctx.fill();
}

const CLUSTER_W = 0.6;
const CLUSTER_H = (CLUSTER_W * CH) / CW;

function DigitalCluster() {
  const { tex, ctx } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CW;
    canvas.height = CH;
    const c = canvas.getContext("2d")!;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { tex: t, ctx: c };
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), [tex]);
  const bezel = useMemo(() => new RoundedBoxGeometry(CLUSTER_W + 0.06, CLUSTER_H + 0.05, 0.06, 3, 0.025), []);
  const acc = useRef(1);

  // The canvas texture is redrawn in place each tick (three.js needs the flag flipped).
  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.1) return;
    acc.current = 0;
    drawCluster(ctx);
    // eslint-disable-next-line react-hooks/immutability
    tex.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={bezel} position={[0, 0, -0.032]}>
        <meshStandardMaterial color={CAB.gloss} roughness={0.3} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[CLUSTER_W, CLUSTER_H]} />
      </mesh>
    </group>
  );
}


// ---------------------------------------------------------------
// Exterior mirror on arms (seen through the side windows)
// ---------------------------------------------------------------
const mirrorMats = {
  housing: new THREE.MeshPhysicalMaterial({ color: "#141619", roughness: 0.35, clearcoat: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: "#a9c4d8", roughness: 0.05, metalness: 0.85 }),
  arm: new THREE.MeshStandardMaterial({ color: "#1d1f23", roughness: 0.5, metalness: 0.3 }),
  amber: new THREE.MeshBasicMaterial({ color: "#ffa21a", toneMapped: false }),
};

function Mirror({ side }: { side: 1 | -1 }) {
  const geo = useMemo(
    () => ({
      main: new RoundedBoxGeometry(0.2, 0.42, 0.08, 4, 0.03),
      wide: new RoundedBoxGeometry(0.19, 0.17, 0.08, 4, 0.03),
    }),
    []
  );
  const x = side > 0 ? CABIN.right + 0.42 : CABIN.left - 0.42;
  return (
    <group position={[x, 1.78, -1.62]} rotation={[0, side * -0.45, 0]}>
      {/* Two arms back to the A-pillar */}
      {[0.22, -0.3].map((y) => (
        <mesh key={y} position={[-side * 0.2, y, 0.02]} rotation={[0, 0, side * (y > 0 ? 1.25 : 1.9)]} material={mirrorMats.arm}>
          <cylinderGeometry args={[0.016, 0.016, 0.42, 10]} />
        </mesh>
      ))}
      <mesh geometry={geo.main} position={[0, 0.06, 0]} material={mirrorMats.housing} />
      <mesh position={[0, 0.06, 0.042]} material={mirrorMats.glass}>
        <planeGeometry args={[0.17, 0.38]} />
      </mesh>
      <mesh geometry={geo.wide} position={[0, -0.27, 0]} material={mirrorMats.housing} />
      <mesh position={[0, -0.27, 0.042]} material={mirrorMats.glass}>
        <planeGeometry args={[0.16, 0.14]} />
      </mesh>
      {/* Side indicator */}
      <mesh position={[side * 0.09, -0.27, -0.035]} rotation={[0, side * Math.PI / 2, 0]} material={mirrorMats.amber}>
        <planeGeometry args={[0.05, 0.02]} />
      </mesh>
    </group>
  );
}

const glassMat = new THREE.MeshPhysicalMaterial({
  color: "#bcd6ea",
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.06,
  depthWrite: false,
});

export default function Cab() {
  const phase = useNightRun((s) => s.phase);
  const dashLit = phase !== "name";
  const fill = useRef<THREE.PointLight>(null);
  const side = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.PointLight>(null);

  // Map-light aim point: the top half of the steering wheel
  const mapLightTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 1.0, -0.72);
    return t;
  }, []);

  // Cabin fill follows day/night: bright soft daylight by day, a dim glow at night.
  useFrame(() => {
    const t = timeOfDayState.t;
    if (fill.current) fill.current.intensity = (dashLit ? 0.35 : 0.05) + t * 1.6;
    if (side.current) side.current.intensity = 0.1 + t * 1.2;
    if (glow.current) glow.current.intensity = dashLit ? 0.25 * (1 - t) : 0;
  });

  const { right: R, left: L, roof, floor, rear } = CABIN;
  const W = R - L;
  const cx = (R + L) / 2;
  const zFront = -1.5;
  const len = rear - zFront;
  const zc = (rear + zFront) / 2;
  const shell = (color: string, rough = 0.95) => <meshStandardMaterial color={color} roughness={rough} />;

  return (
    <group>
      {/* ================= DASHBOARD ================= */}
      <group position={[0, 1.13, -1.29]} rotation={[-0.22, 0, 0]}>
        <DigitalCluster />
      </group>
      <SteeringWheel />
      <CabInterior />
      <Tablet />
      <PhoneStand />
      {/* Rear-view mirror */}
      <group position={[-0.55, roof - 0.38, -1.38]} rotation={[0.1, 0.14, 0]}>
        <mesh material={mirrorMats.housing}>
          <boxGeometry args={[0.44, 0.13, 0.05]} />
        </mesh>
        <mesh position={[0, 0, 0.027]} material={mirrorMats.glass}>
          <planeGeometry args={[0.4, 0.1]} />
        </mesh>
        <mesh position={[0, 0.2, -0.05]} material={mirrorMats.arm}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        </mesh>
      </group>

      {/* ================= CABIN SHELL ================= */}
      <mesh position={[cx, roof + 0.05, zc]}>
        <boxGeometry args={[W + 0.1, 0.1, len]} />
        {shell(HEADLINER, 1)}
      </mesh>
      <mesh position={[cx, floor, zc]}>
        <boxGeometry args={[W, 0.1, len]} />
        {shell(FLOOR, 1)}
      </mesh>
      <mesh position={[cx, (roof + floor) / 2, rear]}>
        <boxGeometry args={[W, roof - floor, 0.08]} />
        {shell(PILLAR)}
      </mesh>
      {/* Windshield header */}
      <mesh position={[cx, roof - 0.09, zFront - 0.05]}>
        <boxGeometry args={[W + 0.1, 0.18, 0.12]} />
        {shell(HEADLINER)}
      </mesh>
      {/* Sun visors */}
      {[0.35, -1.45].map((x) => (
        <mesh key={x} position={[x, roof - 0.2, -1.36]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.85, 0.035, 0.24]} />
          {shell(HEADLINER, 1)}
        </mesh>
      ))}
      {[R, L].map((x) => {
        const s = x > 0 ? 1 : -1;
        return (
          <group key={x}>
            {/* A-pillar trim (interior) + white outer skin */}
            <mesh position={[x - s * 0.05, (roof + 1.0) / 2, zFront]} rotation={[-0.08, 0, s * 0.03]}>
              <boxGeometry args={[0.13, roof - 1.0, 0.13]} />
              {shell(PILLAR, 0.85)}
            </mesh>
            <mesh position={[x + s * 0.03, (roof + 1.0) / 2, zFront - 0.03]} rotation={[-0.08, 0, s * 0.03]}>
              <boxGeometry args={[0.06, roof - 1.0, 0.16]} />
              <meshStandardMaterial color={EXTERIOR} roughness={0.3} metalness={0.15} />
            </mesh>
            {/* Window frame: top rail + B-pillar block */}
            <mesh position={[x - s * 0.02, roof - 0.12, (zFront + 0.55) / 2]}>
              <boxGeometry args={[0.1, 0.16, 0.55 - zFront]} />
              {shell(PILLAR, 0.85)}
            </mesh>
            <mesh position={[x - s * 0.02, (roof + 1.15) / 2, (0.55 + rear) / 2]}>
              <boxGeometry args={[0.1, roof - 1.15, rear - 0.55]} />
              {shell(PILLAR, 0.85)}
            </mesh>
            {/* Black rubber seal around the glass */}
            <mesh position={[x + s * 0.005, 1.21, (zFront + 0.55) / 2]}>
              <boxGeometry args={[0.05, 0.025, 0.55 - zFront]} />
              <meshStandardMaterial color="#0d0e10" roughness={0.7} />
            </mesh>
            {/* White door beltline outside the glass */}
            <mesh position={[x + s * 0.06, 1.2, (zFront + 0.55) / 2]}>
              <boxGeometry args={[0.05, 0.06, 0.55 - zFront + 0.1]} />
              <meshStandardMaterial color={EXTERIOR} roughness={0.3} metalness={0.15} />
            </mesh>
            {/* Side glass */}
            <mesh position={[x + s * 0.03, (roof + 1.22) / 2, (zFront + 0.55) / 2]} rotation={[0, s * Math.PI / 2, 0]} material={glassMat}>
              <planeGeometry args={[0.55 - zFront, roof - 1.22]} />
            </mesh>
          </group>
        );
      })}
      {/* Windshield glass */}
      <mesh position={[cx, (roof + 1.0) / 2, zFront - 0.06]} rotation={[-0.08, 0, 0]} material={glassMat}>
        <planeGeometry args={[W, roof - 1.0]} />
      </mesh>

      {/* ================= EXTERIOR ================= */}
      {/* Cowl below the glass + wipers */}
      <mesh position={[cx, 1.0, zFront - 0.14]}>
        <boxGeometry args={[W + 0.1, 0.06, 0.18]} />
        <meshStandardMaterial color="#111215" roughness={0.6} />
      </mesh>
      {[0.2, -1.25].map((x) => (
        <mesh key={x} position={[x, 1.045, zFront - 0.12]} rotation={[0, 0, 0.1]} material={cabMats.charcoal}>
          <boxGeometry args={[0.95, 0.018, 0.02]} />
        </mesh>
      ))}
      {/* White roof edge seen above the glass */}
      <mesh position={[cx, roof + 0.13, zFront - 0.1]}>
        <boxGeometry args={[W + 0.2, 0.12, 0.2]} />
        <meshStandardMaterial color={EXTERIOR} roughness={0.3} metalness={0.15} />
      </mesh>
      <Mirror side={1} />
      <Mirror side={-1} />

      {/* ================= LIGHTS ================= */}
      <primitive object={mapLightTarget} />
      <spotLight
        position={[0, roof - 0.2, -0.5]}
        target={mapLightTarget}
        angle={0.36}
        penumbra={0.9}
        decay={1.8}
        distance={4}
        intensity={dashLit ? 6 : 0.5}
        color="#ffd9ad"
      />
      {/* Soft cabin fill (daylight through the glass by day) */}
      <pointLight ref={fill} position={[-0.6, roof - 0.35, -0.75]} color="#eaf1ff" distance={4.5} decay={1.6} />
      <pointLight ref={side} position={[R - 0.2, 1.9, -0.9]} color="#fff4e6" distance={2.6} decay={1.8} />
      {/* Ambient-strip glow so the dash face isn't a void at night */}
      <pointLight ref={glow} position={[-0.5, 0.95, -0.7]} color="#5b8fff" distance={1.4} decay={2} />
    </group>
  );
}
