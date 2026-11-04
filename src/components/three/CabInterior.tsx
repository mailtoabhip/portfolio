"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { setClayRimTier } from "@/lib/clayMaterials";
import { useNightRun } from "@/lib/store";

/**
 * Modern heavy-truck cab interior.
 *
 * The dashboard is a sculpted side profile extruded across the cab
 * (soft-touch upper, satin champagne band, knee panel) instead of
 * stacked boxes, so it reads as one moulded piece. The gauges sit in a
 * curved cowl. Doors have full trim: sill pad, armrest with window
 * switches, pull cup, map pocket and a speaker. All static parts are
 * merged per material.
 *
 * Cab-local coordinates: driver eye at [0, 1.4, 0] looking down -Z,
 * right-hand drive (passenger side runs to negative x). Truck.tsx lifts
 * the whole cab so the eye sits at real truck height.
 */

/** Cab interior extents (shared with Cab.tsx). */
export const CABIN = {
  right: 1.15, // driver door
  left: -2.3, // passenger door
  roof: 2.75,
  floor: 0.3,
  rear: 0.95,
  glassFront: -1.56, // windshield base line
};

export const CAB = {
  charcoal: "#464a51",
  soft: "#4a4d54",
  leather: "#4d4842",
  satin: "#b9b2a6",
  chrome: "#d8dce0",
  gloss: "#0a0c0f",
  led: "#3d8bff",
};

export const cabMats = {
  charcoal: new THREE.MeshStandardMaterial({ color: CAB.charcoal, roughness: 0.88 }),
  soft: new THREE.MeshStandardMaterial({ color: CAB.soft, roughness: 0.78 }),
  leather: new THREE.MeshStandardMaterial({ color: CAB.leather, roughness: 0.62 }),
  satin: new THREE.MeshStandardMaterial({ color: CAB.satin, roughness: 0.34, metalness: 0.45 }),
  chrome: new THREE.MeshStandardMaterial({ color: CAB.chrome, roughness: 0.18, metalness: 0.95 }),
  gloss: new THREE.MeshPhysicalMaterial({ color: CAB.gloss, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }),
  led: new THREE.MeshBasicMaterial({ color: CAB.led, toneMapped: false }),
  red: new THREE.MeshStandardMaterial({ color: "#d42a2a", roughness: 0.4, emissive: "#a01010", emissiveIntensity: 0.4 }),
  light: new THREE.MeshBasicMaterial({ color: "#fff3df", toneMapped: false }),
};

type V3 = [number, number, number];
type Bucket = Record<keyof typeof cabMats, THREE.BufferGeometry[]>;

function place(g: THREE.BufferGeometry, p: V3, rot: V3 = [0, 0, 0]) {
  return g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p));
}
function box(w: number, h: number, d: number, r: number, p: V3, rot: V3 = [0, 0, 0]) {
  const rr = Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  return place(new RoundedBoxGeometry(w, h, d, 3, rr), p, rot);
}
function cyl(rt: number, rb: number, h: number, p: V3, rot: V3 = [Math.PI / 2, 0, 0], seg = 28) {
  return place(new THREE.CylinderGeometry(rt, rb, h, seg), p, rot);
}
function torus(r: number, tube: number, p: V3, rot: V3 = [0, 0, 0], seg = 40) {
  return place(new THREE.TorusGeometry(r, tube, 10, seg), p, rot);
}

/**
 * Extrude a side profile across the cab. `pts` are [depth, height]
 * with depth = -z (metres in front of the eye). Spans x0 → x1.
 */
function profile(pts: [number, number][], x0: number, x1: number, bevel = 0.025) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: x1 - x0 - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  // (u, v, w) → (x = w, y = v, z = -u): a proper rotation (det +1).
  const m = new THREE.Matrix4().set(0, 0, 1, x0 + bevel, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  return g;
}

/** Sample a smooth curve through control points (for profiles). */
function smooth(ctrl: [number, number][], n = 10): [number, number][] {
  const c = new THREE.SplineCurve(ctrl.map(([a, b]) => new THREE.Vector2(a, b)));
  return c.getPoints(ctrl.length * n).map((v) => [v.x, v.y]);
}

function vent(w: number, h: number, p: V3, rot: V3, g: Bucket) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p);
  const t = 0.016;
  [
    box(w, t, 0.024, 0.007, [0, h / 2, 0]),
    box(w, t, 0.024, 0.007, [0, -h / 2, 0]),
    box(t, h, 0.024, 0.007, [-w / 2, 0, 0]),
    box(t, h, 0.024, 0.007, [w / 2, 0, 0]),
  ].forEach((x) => g.chrome.push(x.applyMatrix4(m)));
  g.gloss.push(box(w - t, h - t, 0.014, 0.004, [0, 0, -0.008]).applyMatrix4(m));
  for (let i = 1; i < 4; i++) g.charcoal.push(box(w - 0.034, 0.007, 0.018, 0.003, [0, -h / 2 + (i * h) / 4, 0.001]).applyMatrix4(m));
  g.chrome.push(box(0.03, 0.012, 0.024, 0.004, [0, 0, 0.007]).applyMatrix4(m));
}

/** Full door trim on the inner face of a door at x (s = +1 right, -1 left). */
function door(x: number, s: 1 | -1, g: Bucket) {
  const z0 = -1.4;
  const z1 = CABIN.rear - 0.15;
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  const ix = x - s * 0.04; // inner face
  g.soft.push(box(0.08, 0.86, len, 0.05, [x, 0.75, zc])); // main card
  g.leather.push(box(0.07, 0.09, len - 0.1, 0.04, [ix, 1.16, zc])); // padded sill
  g.chrome.push(box(0.008, 0.008, len - 0.3, 0.003, [ix - s * 0.035, 1.105, zc])); // chrome line
  g.led.push(box(0.006, 0.005, len - 0.4, 0.002, [ix - s * 0.036, 1.09, zc]));
  // Armrest + window switch panel
  g.leather.push(box(0.13, 0.07, 0.7, 0.03, [ix - s * 0.06, 0.92, -0.25]));
  g.gloss.push(box(0.08, 0.012, 0.24, 0.006, [ix - s * 0.07, 0.96, -0.45]));
  for (let i = 0; i < 4; i++) g.chrome.push(box(0.03, 0.01, 0.028, 0.004, [ix - s * 0.07, 0.968, -0.54 + i * 0.06]));
  // Pull cup + handle
  g.gloss.push(box(0.06, 0.06, 0.2, 0.025, [ix - s * 0.02, 1.0, -0.85]));
  g.chrome.push(box(0.02, 0.025, 0.12, 0.008, [ix - s * 0.04, 1.0, -0.85]));
  // Map pocket
  g.charcoal.push(box(0.09, 0.18, len - 0.5, 0.04, [ix - s * 0.03, 0.48, zc + 0.1]));
  // Speaker
  g.gloss.push(cyl(0.11, 0.11, 0.02, [ix - s * 0.005, 0.66, -1.02], [0, 0, Math.PI / 2]));
  g.chrome.push(torus(0.115, 0.007, [ix - s * 0.016, 0.66, -1.02], [0, Math.PI / 2, 0]));
  // Grab handle on the A-pillar (truck essential)
  g.charcoal.push(box(0.05, 0.55, 0.05, 0.02, [x - s * 0.1, 1.75, -1.38], [0.12, 0, 0]));
}

export default function CabInterior() {
  const quality = useNightRun((s) => s.quality);
  // The tablet and phone still use the shared clay materials' rim term.
  useEffect(() => {
    setClayRimTier(quality);
  }, [quality]);

  const geos = useMemo(() => {
    const g: Bucket = { charcoal: [], soft: [], leather: [], satin: [], chrome: [], gloss: [], led: [], red: [], light: [] };
    const X0 = CABIN.left + 0.06;
    const X1 = CABIN.right - 0.06;

    // ---------- Dashboard (moulded profiles) ----------
    // Upper soft-touch: from the windshield base, over a gently domed top,
    // rolling over a rounded lip onto the face.
    g.charcoal.push(
      profile(
        [
          [1.48, 1.0],
          ...smooth(
            [
              [1.44, 1.03],
              [1.25, 1.045],
              [1.06, 1.025],
              [0.985, 0.985],
              [0.975, 0.94],
              [1.0, 0.905],
            ],
            8
          ),
          [1.48, 0.9],
        ],
        X0,
        X1
      )
    );
    // Satin sweep across the dash top (wraps the cowl like the reference)
    g.satin.push(
      profile(
        [
          [1.09, 1.058],
          [1.13, 1.074],
          [1.2, 1.078],
          [1.2, 1.064],
          [1.1, 1.052],
        ],
        X0 + 0.15,
        -0.42,
        0.006
      )
    );
    g.satin.push(profile([[1.09, 1.058], [1.13, 1.074], [1.2, 1.078], [1.2, 1.064], [1.1, 1.052]], 0.4, X1 - 0.15, 0.006));
    // Defrost grille along the windshield base
    for (let i = 0; i < 40; i++) {
      g.gloss.push(box(0.05, 0.006, 0.07, 0.002, [X0 + 0.3 + i * ((X1 - X0 - 0.6) / 39), 1.056, -1.38]));
    }
    // Tweeters in the dash corners
    for (const x of [X1 - 0.18, X0 + 0.22]) {
      g.gloss.push(cyl(0.05, 0.05, 0.01, [x, 1.068, -1.3], [0, 0, 0], 24));
      g.chrome.push(torus(0.052, 0.005, [x, 1.073, -1.3], [Math.PI / 2, 0, 0], 28));
    }
    // Satin champagne band sweeping across the face
    g.satin.push(
      profile(
        [
          [1.06, 0.9],
          ...smooth(
            [
              [0.995, 0.9],
              [0.955, 0.86],
              [0.945, 0.79],
              [0.965, 0.735],
            ],
            8
          ),
          [1.06, 0.73],
        ],
        X0 + 0.02,
        X1 - 0.02,
        0.015
      )
    );
    // Lower knee panel, curving back toward the firewall
    g.soft.push(
      profile(
        [
          [1.12, 0.735],
          ...smooth(
            [
              [0.985, 0.735],
              [1.0, 0.6],
              [1.06, 0.45],
              [1.14, 0.34],
            ],
            8
          ),
          [1.4, 0.34],
          [1.4, 0.735],
        ],
        X0,
        X1
      )
    );
    // Chrome seam + blue ambient strip under the band
    g.chrome.push(box(X1 - X0 - 0.1, 0.01, 0.016, 0.004, [(X0 + X1) / 2, 0.902, -0.99]));
    g.led.push(box(X1 - X0 - 0.2, 0.007, 0.01, 0.003, [(X0 + X1) / 2, 0.728, -0.968]));

    // Gauge cowl: a curved hood around the digital cluster
    {
      const outer = new THREE.Shape();
      const W = 0.76;
      const H = 0.34;
      const r = 0.07;
      outer.moveTo(-W / 2, 0);
      outer.lineTo(-W / 2, H - r);
      outer.quadraticCurveTo(-W / 2, H, -W / 2 + r, H);
      outer.lineTo(W / 2 - r, H);
      outer.quadraticCurveTo(W / 2, H, W / 2, H - r);
      outer.lineTo(W / 2, 0);
      outer.lineTo(W / 2 - 0.035, 0);
      outer.lineTo(W / 2 - 0.035, H - r);
      outer.quadraticCurveTo(W / 2 - 0.035, H - 0.035, W / 2 - r, H - 0.035);
      outer.lineTo(-W / 2 + r, H - 0.035);
      outer.quadraticCurveTo(-W / 2 + 0.035, H - 0.035, -W / 2 + 0.035, H - r);
      outer.lineTo(-W / 2 + 0.035, 0);
      outer.closePath();
      const cowl = new THREE.ExtrudeGeometry(outer, {
        depth: 0.26,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 3,
        curveSegments: 12,
      });
      cowl.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.22, 0, 0)).setPosition(0, 0.98, -1.44));
      g.charcoal.push(cowl);
    }

    // ---------- Vents ----------
    vent(0.2, 0.11, [0.8, 0.82, -0.955], [-0.3, -0.3, 0], g); // driver outer
    vent(0.2, 0.1, [-0.84, 0.82, -0.948], [-0.3, 0.08, 0], g); // centre pair
    vent(0.2, 0.1, [-0.2, 0.82, -0.948], [-0.3, -0.05, 0], g);
    vent(0.24, 0.11, [-1.95, 0.82, -0.96], [-0.3, 0.32, 0], g); // passenger outer

    // ---------- Centre stack + climate ----------
    g.satin.push(box(0.64, 0.4, 0.2, 0.07, [-0.52, 0.52, -0.96], [-0.15, 0, 0]));
    g.gloss.push(box(0.56, 0.16, 0.02, 0.025, [-0.52, 0.6, -0.86], [-0.15, 0, 0]));
    [-0.7, -0.52, -0.34].forEach((x) => {
      g.chrome.push(cyl(0.042, 0.044, 0.02, [x, 0.585, -0.835], [Math.PI / 2 - 0.15, 0, 0]));
      g.charcoal.push(cyl(0.032, 0.034, 0.032, [x, 0.585, -0.824], [Math.PI / 2 - 0.15, 0, 0]));
    });
    g.led.push(torus(0.034, 0.0035, [-0.7, 0.585, -0.81], [-0.15, 0, 0], 28));
    for (let i = 0; i < 5; i++) g.charcoal.push(box(0.07, 0.03, 0.015, 0.008, [-0.7 + i * 0.09, 0.665, -0.846], [-0.15, 0, 0]));
    g.gloss.push(box(0.07, 0.04, 0.02, 0.012, [-0.52, 0.72, -0.9], [-0.25, 0, 0]));
    g.red.push(box(0.022, 0.018, 0.008, 0.003, [-0.52, 0.722, -0.888], [-0.25, 0, 0]));

    // ---------- Console between the seats ----------
    g.soft.push(box(0.56, 0.42, 0.95, 0.09, [-0.52, 0.5, -0.42]));
    g.leather.push(box(0.52, 0.05, 0.6, 0.025, [-0.52, 0.73, -0.25]));
    [-0.64, -0.4].forEach((x) => {
      g.gloss.push(cyl(0.052, 0.05, 0.02, [x, 0.715, -0.72], [0, 0, 0]));
      g.chrome.push(torus(0.054, 0.005, [x, 0.726, -0.72], [Math.PI / 2, 0, 0]));
    });

    // ---------- Doors ----------
    door(CABIN.right, 1, g);
    door(CABIN.left, -1, g);

    // ---------- Headliner details ----------
    // Overhead console with storage bins and reading lights
    g.soft.push(box(1.1, 0.14, 0.62, 0.06, [-0.55, CABIN.roof - 0.12, -1.0]));
    for (let i = 0; i < 3; i++) g.charcoal.push(box(0.3, 0.1, 0.012, 0.01, [-0.92 + i * 0.37, CABIN.roof - 0.13, -0.685]));
    [-0.15, -0.95].forEach((x) => {
      g.chrome.push(torus(0.03, 0.004, [x, CABIN.roof - 0.195, -0.85], [Math.PI / 2, 0, 0], 24));
      g.light.push(cyl(0.026, 0.026, 0.004, [x, CABIN.roof - 0.196, -0.85], [0, 0, 0], 20));
    });
    g.led.push(box(0.9, 0.006, 0.01, 0.002, [-0.55, CABIN.roof - 0.195, -1.315]));
    // Roof ribs
    for (const x of [-1.7, -0.55, 0.6]) g.soft.push(box(0.1, 0.05, 2.2, 0.025, [x, CABIN.roof - 0.04, -0.3]));

    const merged: Partial<Record<keyof typeof cabMats, THREE.BufferGeometry>> = {};
    for (const k of Object.keys(g) as (keyof typeof cabMats)[]) {
      if (!g[k].length) continue;
      merged[k] = mergeGeometries(
        g[k].map((x) => {
          const n = x.index ? x.toNonIndexed() : x;
          // Extrusions carry an extra "uv2"-free group layout; keep only the shared attributes.
          for (const name of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(name)) n.deleteAttribute(name);
          n.clearGroups();
          return n;
        }),
        false
      );
    }
    return merged;
  }, []);

  return (
    <group>
      {(Object.keys(geos) as (keyof typeof cabMats)[]).map((k) => (
        <mesh key={k} geometry={geos[k]} material={cabMats[k]} receiveShadow={k !== "led" && k !== "light"} castShadow={false} />
      ))}
    </group>
  );
}
