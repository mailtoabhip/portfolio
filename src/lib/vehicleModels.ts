import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VEHICLES, type VehicleType } from "./game";

/** Solid, road-scale toy vehicles. Local front is -Z; tyres rest at Y=0.
 * Parts are baked into one vertex-coloured geometry per type, shared by
 * every traffic slot. No image planes, transparent faces or texture loads.
 */
export function createVehicleGeometry(type: VehicleType) {
  const { W: w, H: h, L: l } = VEHICLES[type];
  const parts: THREE.BufferGeometry[] = [];
  const paint = { hatch: "#f1b746", sedan: "#e8e5d8", suv: "#365b91", auto: "#e9b931", tempo: "#df7939", lorry: "#cf6c37" }[type];
  const cream = "#eee4cd", glass = "#324c5c", rubber = "#252a30", metal = "#929c9e";
  function add(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
    const geometry = g.index ? g.toNonIndexed() : g;
    if (geometry !== g) g.dispose();
    geometry.translate(x, y, z);
    const c = new THREE.Color(color);
    const colors = new Float32Array(geometry.getAttribute("position").count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(geometry);
  }
  function box(x: number, y: number, z: number, a: number, b: number, c: number, color: string, radius = 0.05) {
    add(new RoundedBoxGeometry(a, b, c, 1, Math.min(radius, a / 4, b / 4, c / 4)), color, x, y, z);
  }
  function wheel(x: number, z: number, r: number) {
    const tire = new THREE.CylinderGeometry(r, r, w * 0.12, 12);
    tire.rotateZ(Math.PI / 2);
    add(tire, rubber, x, r, z);
    const hub = new THREE.CylinderGeometry(r * 0.53, r * 0.53, w * 0.125, 12);
    hub.rotateZ(Math.PI / 2);
    add(hub, metal, x, r, z);
  }
  const truck = type === "lorry" || type === "tempo";
  const r = truck ? (type === "lorry" ? 0.49 : 0.34) : type === "auto" ? 0.23 : 0.3;
  const axleX = w * 0.43;
  box(0, r * 1.1, 0, w * 0.78, r * 0.48, l * 0.91, rubber);
  if (type === "auto") {
    // Three wheels and an open passenger compartment beneath a solid canopy.
    wheel(0, -l * 0.34, r);
    for (const side of [-1, 1]) wheel(side * axleX, l * 0.3, r);
    box(0, h * 0.28, 0.12, w * 0.9, h * 0.25, l * 0.78, "#368257");
    box(0, h * 0.43, -l * 0.36, w * 0.82, h * 0.34, l * 0.22, paint);
    box(0, h * 0.7, -l * 0.35, w * 0.73, h * 0.25, 0.07, glass);
    box(0, h * 0.95, 0.04, w * 0.98, h * 0.1, l * 0.88, rubber, 0.09);
    for (const side of [-1, 1]) {
      for (const z of [-l * 0.33, l * 0.39]) box(side * w * 0.42, h * 0.67, z, 0.06, h * 0.52, 0.07, rubber);
      box(side * w * 0.32, h * 0.44, l * 0.23, 0.12, h * 0.25, l * 0.18, rubber);
    }
    box(0, h * 0.38, l * 0.18, w * 0.7, 0.12, l * 0.32, rubber);
  } else if (truck) {
    const cabLength = type === "lorry" ? l * 0.24 : l * 0.35;
    const cabZ = -l / 2 + cabLength / 2 + 0.06;
    const cabH = type === "lorry" ? h * 0.77 : h * 0.8;
    box(0, r + cabH * 0.43, cabZ, w * 0.94, cabH * 0.86, cabLength, type === "lorry" ? cream : paint, 0.12);
    const front = cabZ - cabLength / 2;
    box(0, r + cabH * 0.66, front - 0.015, w * 0.78, cabH * 0.29, 0.045, glass);
    box(0, r + cabH * 0.66, front - 0.045, 0.055, cabH * 0.3, 0.035, cream);
    box(0, r + cabH * 0.25, front - 0.035, w * 0.47, cabH * 0.18, 0.06, rubber);
    for (const side of [-1, 1]) {
      box(side * w * 0.474, r + cabH * 0.66, cabZ, 0.04, cabH * 0.28, cabLength * 0.65, glass);
      box(side * w * 0.485, r + cabH * 0.5, front + 0.16, 0.06, 0.22, 0.16, rubber);
      box(side * w * 0.475, r + cabH * 0.35, cabZ + cabLength * 0.22, 0.05, 0.05, 0.18, metal);
    }
    const cargoL = l - cabLength - 0.2;
    const cargoZ = l / 2 - cargoL / 2 - 0.03;
    const floor = r * 1.8;
    box(0, floor, cargoZ, w * 0.96, 0.2, cargoL, paint);
    box(0, (h + floor) / 2, cargoZ, w * 0.9, h - floor, cargoL * 0.97, type === "lorry" ? "#3e6591" : cream, 0.1);
    // Raised cargo rails and ribs are geometry, visible from every angle.
    for (const side of [-1, 1]) {
      box(side * w * 0.46, floor + 0.3, cargoZ, 0.06, 0.45, cargoL, paint);
      for (let i = 0; i < 5; i++) box(side * w * 0.465, (h + floor) / 2, cargoZ - cargoL * 0.4 + i * cargoL * 0.2, 0.045, h - floor - 0.06, 0.06, metal);
    }
    box(0, (h + floor) / 2, l * 0.487, 0.055, h - floor - 0.08, 0.05, metal);
    for (const side of [-1, 1]) {
      wheel(side * axleX, -l * 0.33, r);
      wheel(side * axleX, l * 0.32, r);
      if (type === "lorry") wheel(side * axleX, l * 0.19, r);
    }
  } else {
    const suv = type === "suv";
    const sedan = type === "sedan";
    box(0, h * 0.38, 0, w * 0.96, h * 0.35, l * 0.96, paint, 0.12);
    const cabinL = l * (sedan ? 0.49 : 0.6);
    const cabinZ = sedan ? 0 : l * 0.06;
    box(0, h * 0.72, cabinZ, w * 0.84, h * 0.48, cabinL, paint, 0.12);
    box(0, h * 0.75, cabinZ - cabinL / 2 - 0.012, w * 0.74, h * 0.28, 0.04, glass);
    box(0, h * 0.75, cabinZ + cabinL / 2 + 0.012, w * 0.73, h * 0.27, 0.04, glass);
    for (const side of [-1, 1]) {
      // Two separate side windows keep the painted B pillar visible.
      for (const z of [-0.23, 0.23]) box(side * w * 0.424, h * 0.75, cabinZ + cabinL * z, 0.035, h * 0.27, cabinL * 0.4, glass);
      for (const z of [-0.23, 0.23]) box(side * w * 0.487, h * 0.49, cabinZ + cabinL * z, 0.035, 0.035, 0.16, metal);
      box(side * w * 0.485, h * 0.61, cabinZ - cabinL * 0.44, 0.07, 0.1, 0.18, paint);
      wheel(side * axleX, -l * 0.31, r);
      wheel(side * axleX, l * 0.31, r);
      if (suv) box(side * w * 0.32, h * 0.98, cabinZ, 0.05, 0.045, cabinL * 0.85, metal);
    }
    box(0, h * 0.36, -l * 0.49, w * 0.36, 0.15, 0.06, rubber);
  }
  // Solid bumpers and separate front/rear lamp volumes, never decals.
  for (const end of [-1, 1]) {
    box(0, r * 0.95, end * l * 0.485, w * 0.88, 0.13, 0.08, metal);
    for (const side of [-1, 1]) box(side * w * 0.32, truck ? r + 0.22 : h * 0.4, end * l * 0.491, w * 0.18, truck ? 0.18 : 0.12, 0.06, end === -1 ? "#fff3bf" : "#ed554d");
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
