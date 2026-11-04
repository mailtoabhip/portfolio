"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useNightRun } from "@/lib/store";
import { input } from "@/lib/controls";
import { drive } from "@/lib/driveState";
import { sim, TIME_LIMIT, fmtMetres } from "@/lib/game";
import CabInterior, { CAB } from "@/components/three/CabInterior";
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

const HEADLINER = "#5b5e64";
const PILLAR = "#45484e";
const FLOOR = "#26282c";
const EXTERIOR = "#ecebe6"; // white cab, like the reference truck
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
    <group position={[0, 0.94, -0.95]} rotation={[-1.05, 0, 0]}>
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
      <mesh position={[0, 0, -0.16]} material={mats.column}>
        <cylinderGeometry args={[0.045, 0.07, 0.24, 16]} />
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
// Navigation screen (passenger side), drawn once
// ---------------------------------------------------------------
function drawNav(): HTMLCanvasElement {
  const W = 960;
  const H = 540;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0a111c";
  x.fillRect(0, 0, W, H);
  // map area
  const mx = 110;
  x.save();
  x.beginPath();
  x.rect(mx, 0, W - mx, H - 90);
  x.clip();
  x.fillStyle = "#0f1a2a";
  x.fillRect(mx, 0, W, H);
  // parks + river
  x.fillStyle = "#16402c";
  [
    [180, 60, 200, 90],
    [620, 300, 240, 110],
    [760, 40, 160, 80],
  ].forEach(([a, b, w, h]) => {
    x.beginPath();
    x.ellipse(a + w / 2, b + h / 2, w / 2, h / 2, 0.3, 0, Math.PI * 2);
    x.fill();
  });
  x.strokeStyle = "#1c4d7a";
  x.lineWidth = 16;
  x.beginPath();
  x.moveTo(820, 0);
  x.bezierCurveTo(760, 140, 900, 260, 840, 450);
  x.stroke();
  // street grid
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  x.strokeStyle = "#24344a";
  for (let i = 0; i < 26; i++) {
    x.lineWidth = rnd() < 0.3 ? 7 : 3;
    x.beginPath();
    const y0 = rnd() * H;
    x.moveTo(mx, y0);
    x.lineTo(W, y0 + (rnd() - 0.5) * 300);
    x.stroke();
    x.beginPath();
    const x0 = mx + rnd() * (W - mx);
    x.moveTo(x0, 0);
    x.lineTo(x0 + (rnd() - 0.5) * 260, H);
    x.stroke();
  }
  // route
  x.lineCap = "round";
  x.strokeStyle = "rgba(40,140,255,0.35)";
  x.lineWidth = 26;
  const route = () => {
    x.beginPath();
    x.moveTo(470, 400);
    x.bezierCurveTo(470, 300, 560, 220, 650, 190);
    x.bezierCurveTo(730, 165, 760, 120, 770, 70);
  };
  route();
  x.stroke();
  x.strokeStyle = "#3aa0ff";
  x.lineWidth = 11;
  route();
  x.stroke();
  // destination pin
  x.fillStyle = "#3aa0ff";
  x.beginPath();
  x.arc(770, 58, 16, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#fff";
  x.beginPath();
  x.arc(770, 58, 6, 0, Math.PI * 2);
  x.fill();
  // our position
  x.fillStyle = "rgba(255,255,255,0.15)";
  x.beginPath();
  x.arc(470, 400, 42, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#fff";
  x.beginPath();
  x.moveTo(470, 372);
  x.lineTo(492, 420);
  x.lineTo(470, 408);
  x.lineTo(448, 420);
  x.closePath();
  x.fill();
  x.restore();

  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  // ETA chip
  x.fillStyle = "rgba(8,14,24,0.85)";
  roundRect(x, W - 270, 18, 250, 70, 18);
  x.fill();
  x.fillStyle = "#fff";
  x.font = `600 30px ${font}`;
  x.textBaseline = "middle";
  x.fillText("18 min", W - 250, 44);
  x.fillStyle = "rgba(190,210,235,0.75)";
  x.font = `500 20px ${font}`;
  x.fillText("12 km · Drop point", W - 250, 72);

  // side rail icons
  x.fillStyle = "#0d1522";
  x.fillRect(0, 0, mx, H);
  const icons = ["home", "nav", "music", "phone", "apps"];
  icons.forEach((k, i) => {
    const cy = 60 + i * 92;
    if (k === "nav") {
      x.fillStyle = "#2f6bff";
      roundRect(x, 22, cy - 32, 66, 64, 16);
      x.fill();
    }
    x.strokeStyle = "#dfe8f2";
    x.fillStyle = "#dfe8f2";
    x.lineWidth = 4;
    x.beginPath();
    if (k === "home") {
      x.moveTo(37, cy + 2);
      x.lineTo(55, cy - 16);
      x.lineTo(73, cy + 2);
      x.moveTo(42, cy);
      x.lineTo(42, cy + 16);
      x.lineTo(68, cy + 16);
      x.lineTo(68, cy);
      x.stroke();
    } else if (k === "nav") {
      x.moveTo(40, cy + 2);
      x.lineTo(72, cy - 14);
      x.lineTo(58, cy + 18);
      x.lineTo(54, cy + 4);
      x.closePath();
      x.fill();
    } else if (k === "music") {
      x.moveTo(48, cy + 12);
      x.lineTo(48, cy - 14);
      x.lineTo(68, cy - 18);
      x.lineTo(68, cy + 8);
      x.stroke();
      x.beginPath();
      x.arc(44, cy + 13, 6, 0, Math.PI * 2);
      x.arc(64, cy + 9, 6, 0, Math.PI * 2);
      x.fill();
    } else if (k === "phone") {
      x.arc(55, cy, 15, Math.PI * 0.6, Math.PI * 1.4);
      x.stroke();
    } else {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) x.fillRect(42 + a * 16, cy - 14 + b * 16, 11, 11);
    }
  });

  // media bar
  x.fillStyle = "#0d1522";
  x.fillRect(mx, H - 90, W - mx, 90);
  x.fillStyle = "#dfe8f2";
  const by = H - 45;
  // prev / play / next
  x.beginPath();
  x.moveTo(190, by);
  x.lineTo(210, by - 12);
  x.lineTo(210, by + 12);
  x.fill();
  x.fillRect(184, by - 12, 4, 24);
  x.beginPath();
  x.moveTo(262, by - 16);
  x.lineTo(286, by);
  x.lineTo(262, by + 16);
  x.fill();
  x.beginPath();
  x.moveTo(340, by);
  x.lineTo(320, by - 12);
  x.lineTo(320, by + 12);
  x.fill();
  x.fillRect(342, by - 12, 4, 24);
  // progress
  x.fillStyle = "#24344a";
  roundRect(x, 420, by - 4, 360, 8, 4);
  x.fill();
  x.fillStyle = "#3aa0ff";
  roundRect(x, 420, by - 4, 230, 8, 4);
  x.fill();
  x.beginPath();
  x.arc(650, by, 10, 0, Math.PI * 2);
  x.fill();
  // brightness glyph
  x.strokeStyle = "#dfe8f2";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(880, by, 9, 0, Math.PI * 2);
  x.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    x.beginPath();
    x.moveTo(880 + Math.cos(a) * 14, by + Math.sin(a) * 14);
    x.lineTo(880 + Math.cos(a) * 19, by + Math.sin(a) * 19);
    x.stroke();
  }
  return c;
}

function NavScreen() {
  const { mat, bezel } = useMemo(() => {
    const t = new THREE.CanvasTexture(drawNav());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return {
      mat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }),
      bezel: new RoundedBoxGeometry(0.5, 0.3, 0.035, 3, 0.02),
    };
  }, []);
  return (
    <group position={[-0.9, 0.99, -0.96]} rotation={[-0.32, 0.24, 0]}>
      <mesh geometry={bezel} position={[0, 0, -0.019]}>
        <meshStandardMaterial color={CAB.gloss} roughness={0.25} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[0.46, 0.2588]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------
// Exterior mirror on an arm (seen through the side windows)
// ---------------------------------------------------------------
function Mirror({ side }: { side: 1 | -1 }) {
  const x = side > 0 ? 1.4 : -2.4;
  return (
    <group position={[x, 1.62, -1.55]} rotation={[0, side * -0.5, 0]} scale={0.8}>
      {/* arm */}
      <mesh position={[-side * 0.08, 0.2, 0]} rotation={[0, 0, side * 0.9]}>
        <cylinderGeometry args={[0.014, 0.014, 0.3, 8]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.6} />
      </mesh>
      <mesh position={[-side * 0.08, -0.25, 0]} rotation={[0, 0, -side * 0.9]}>
        <cylinderGeometry args={[0.014, 0.014, 0.3, 8]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.6} />
      </mesh>
      {/* main + wide-angle heads */}
      <mesh position={[side * 0.08, 0.08, 0]}>
        <boxGeometry args={[0.14, 0.34, 0.07]} />
        <meshStandardMaterial color="#17191c" roughness={0.45} />
      </mesh>
      <mesh position={[side * 0.08, 0.08, 0.037]}>
        <planeGeometry args={[0.12, 0.31]} />
        <meshStandardMaterial color="#9cb6cc" roughness={0.1} metalness={0.7} />
      </mesh>
      <mesh position={[side * 0.08, -0.2, 0]}>
        <boxGeometry args={[0.13, 0.15, 0.07]} />
        <meshStandardMaterial color="#17191c" roughness={0.45} />
      </mesh>
      <mesh position={[side * 0.08, -0.2, 0.037]}>
        <planeGeometry args={[0.11, 0.12]} />
        <meshStandardMaterial color="#9cb6cc" roughness={0.1} metalness={0.7} />
      </mesh>
    </group>
  );
}

export default function Cab() {
  const phase = useNightRun((s) => s.phase);
  const dashLit = phase !== "name";

  // Map-light aim point: the top half of the steering wheel
  const mapLightTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 0.9, -0.98);
    return t;
  }, []);

  return (
    <group>
      {/* ================= DASHBOARD ================= */}
      <group position={[0, 1.12, -1.26]} rotation={[-0.22, 0, 0]}>
        <DigitalCluster />
      </group>
      <NavScreen />
      {/* Rear-view mirror */}
      <group position={[-0.55, 2.1, -1.3]} rotation={[0.1, 0.12, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.13, 0.05]} />
          <meshStandardMaterial color="#1c1e22" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[0.38, 0.1]} />
          <meshStandardMaterial color="#9fc3dc" roughness={0.15} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.17, -0.05]}>
          <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
          <meshStandardMaterial color="#1c1e22" />
        </mesh>
      </group>
      {/* Marigold string hanging by the left pillar */}
      <group position={[-1.75, 2.2, -1.25]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i * 0.6) * 0.01, -i * 0.075, 0]}>
            <icosahedronGeometry args={[0.035, 1]} />
            <meshStandardMaterial color={i % 2 ? "#ffb21f" : "#ff7a12"} roughness={0.9} />
          </mesh>
        ))}
      </group>
      <SteeringWheel />
      <CabInterior />
      <Tablet />
      <PhoneStand />

      {/* ================= CABIN SHELL ================= */}
      {/* Headliner + floor */}
      <mesh position={[-0.5, 2.45, -0.4]}>
        <boxGeometry args={[3.0, 0.1, 2.4]} />
        <meshStandardMaterial color={HEADLINER} roughness={1} />
      </mesh>
      <mesh position={[-0.5, 0.32, -0.4]}>
        <boxGeometry args={[3.0, 0.1, 2.4]} />
        <meshStandardMaterial color={FLOOR} roughness={1} />
      </mesh>
      {/* Rear wall */}
      <mesh position={[-0.5, 1.4, 0.85]}>
        <boxGeometry args={[3.0, 2.1, 0.08]} />
        <meshStandardMaterial color={PILLAR} roughness={1} />
      </mesh>
      {/* Pillars + windshield header */}
      <mesh position={[1.0, 1.7, -1.45]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.09, 1.6, 0.09]} />
        <meshStandardMaterial color={PILLAR} roughness={0.9} />
      </mesh>
      <mesh position={[-2.0, 1.7, -1.45]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[0.09, 1.6, 0.09]} />
        <meshStandardMaterial color={PILLAR} roughness={0.9} />
      </mesh>
      <mesh position={[1.0, 1.8, 0.75]}>
        <boxGeometry args={[0.07, 1.3, 0.07]} />
        <meshStandardMaterial color={PILLAR} roughness={1} />
      </mesh>
      <mesh position={[-2.0, 1.8, 0.75]}>
        <boxGeometry args={[0.07, 1.3, 0.07]} />
        <meshStandardMaterial color={PILLAR} roughness={1} />
      </mesh>
      <mesh position={[-0.5, 2.4, -1.45]}>
        <boxGeometry args={[3.0, 0.14, 0.1]} />
        <meshStandardMaterial color={HEADLINER} roughness={1} />
      </mesh>
      {/* Sun visors */}
      {[0.25, -1.25].map((x) => (
        <mesh key={x} position={[x, 2.3, -1.3]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.75, 0.03, 0.22]} />
          <meshStandardMaterial color={HEADLINER} roughness={1} />
        </mesh>
      ))}

      {/* ================= EXTERIOR (white cab) ================= */}
      {/* Short hood (cab-over) + black grille lip */}
      <mesh position={[-0.5, 0.62, -2.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[2.7, 0.14, 1.2]} />
        <meshStandardMaterial color={EXTERIOR} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[-0.5, 0.7, -1.55]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[2.72, 0.05, 0.12]} />
        <meshStandardMaterial color="#15171a" roughness={0.6} />
      </mesh>
      {/* Wiper arms resting at the base of the glass */}
      {[0.1, -1.1].map((x) => (
        <mesh key={x} position={[x, 0.98, -1.6]} rotation={[0, 0, x > 0 ? 0.12 : 0.1]}>
          <boxGeometry args={[0.8, 0.018, 0.02]} />
          <meshStandardMaterial color="#121315" roughness={0.6} />
        </mesh>
      ))}
      {/* White A-pillar skins outside the trim */}
      {[1.06, -2.06].map((x) => (
        <mesh key={x} position={[x, 1.7, -1.48]} rotation={[0, 0, x > 0 ? 0.06 : -0.06]}>
          <boxGeometry args={[0.04, 1.6, 0.11]} />
          <meshStandardMaterial color={EXTERIOR} roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
      <Mirror side={1} />
      <Mirror side={-1} />

      {/* ================= LIGHTS ================= */}
      {/* Small warm map light above the driver, aimed at the wheel. */}
      <primitive object={mapLightTarget} />
      <spotLight
        position={[0, 2.35, -0.55]}
        target={mapLightTarget}
        angle={0.32}
        penumbra={0.85}
        decay={1.8}
        distance={4}
        intensity={dashLit ? 7 : 0.6}
        color="#ffd7a6"
      />
      {/* Screen + ambient-strip glow so the dash face isn't a void */}
      <pointLight position={[-0.5, 1.25, -0.6]} intensity={dashLit ? 0.5 : 0} color="#cfdcff" distance={2.2} decay={2} />
    </group>
  );
}
