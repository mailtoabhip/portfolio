"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { setClayRimTier } from "@/lib/clayMaterials";
import ContactShadow from "@/components/three/ContactShadow";
import { useNightRun } from "@/lib/store";

/**
 * Modern truck-cab interior, after the reference dashboards:
 * a charcoal soft-touch upper dash, a satin champagne lower band with
 * a chrome seam and a blue ambient light strip, chrome-ringed vents,
 * a centre stack with climate knobs, a console with cup holders and a
 * gear selector, and dark grey door cards.
 *
 * Everything static is merged per material (a handful of draw calls).
 * Driver sits at x = 0 (right-hand drive); the passenger side runs to
 * negative x. The dash top stays at ~1.0 m so the road view is unchanged.
 */

export const CAB = {
  charcoal: "#3a3d43",
  soft: "#4a4d54",
  satin: "#b8b1a4",
  chrome: "#d6dade",
  gloss: "#0b0d10",
  led: "#3d8bff",
};

const charcoal = new THREE.MeshStandardMaterial({ color: CAB.charcoal, roughness: 0.82, metalness: 0.02 });
const soft = new THREE.MeshStandardMaterial({ color: CAB.soft, roughness: 0.7, metalness: 0.02 });
const satin = new THREE.MeshStandardMaterial({ color: CAB.satin, roughness: 0.42, metalness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: CAB.chrome, roughness: 0.22, metalness: 0.9 });
const gloss = new THREE.MeshStandardMaterial({ color: CAB.gloss, roughness: 0.25, metalness: 0.1 });
const led = new THREE.MeshBasicMaterial({ color: CAB.led, toneMapped: false });
const red = new THREE.MeshStandardMaterial({ color: "#d42a2a", roughness: 0.4, emissive: "#a01010", emissiveIntensity: 0.4 });

type V3 = [number, number, number];

function box(w: number, h: number, d: number, r: number, p: V3, rot: V3 = [0, 0, 0]) {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p));
  return g;
}

function cyl(rt: number, rb: number, h: number, p: V3, rot: V3 = [Math.PI / 2, 0, 0], seg = 24) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p));
  return g;
}

function torus(r: number, tube: number, p: V3, rot: V3 = [0, 0, 0], seg = 32) {
  const g = new THREE.TorusGeometry(r, tube, 8, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p));
  return g;
}

/** A rectangular vent: chrome bezel ring + dark louvres. */
function vent(w: number, h: number, p: V3, rot: V3, into: Record<string, THREE.BufferGeometry[]>) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).setPosition(...p);
  const t = 0.014;
  const frame = [
    box(w, t, 0.02, 0.006, [0, h / 2, 0]),
    box(w, t, 0.02, 0.006, [0, -h / 2, 0]),
    box(t, h, 0.02, 0.006, [-w / 2, 0, 0]),
    box(t, h, 0.02, 0.006, [w / 2, 0, 0]),
  ];
  frame.forEach((g) => into.chrome.push(g.applyMatrix4(m)));
  into.gloss.push(box(w - t, h - t, 0.012, 0.004, [0, 0, -0.006]).applyMatrix4(m));
  for (let i = 1; i < 4; i++) {
    into.charcoal.push(box(w - 0.03, 0.008, 0.016, 0.003, [0, -h / 2 + (i * h) / 4, 0.002]).applyMatrix4(m));
  }
  // The little chrome adjuster tab
  into.chrome.push(box(0.03, 0.012, 0.022, 0.004, [0, 0, 0.006]).applyMatrix4(m));
}

export default function CabInterior() {
  const quality = useNightRun((s) => s.quality);
  // The tablet and phone still use the shared clay materials' rim term.
  useEffect(() => {
    setClayRimTier(quality);
  }, [quality]);

  const geos = useMemo(() => {
    const g: Record<string, THREE.BufferGeometry[]> = { charcoal: [], soft: [], satin: [], chrome: [], gloss: [], led: [], red: [] };

    // ---------- Dashboard ----------
    // Upper soft-touch slab (top surface ≈ 1.0 m)
    g.charcoal.push(box(2.9, 0.11, 0.78, 0.05, [-0.5, 0.95, -1.38], [-0.1, 0, 0]));
    // Cluster cowl: a hood wrapping the digital display
    g.charcoal.push(box(0.76, 0.05, 0.3, 0.02, [0, 1.235, -1.33], [-0.22, 0, 0]));
    g.charcoal.push(box(0.05, 0.3, 0.3, 0.02, [0.38, 1.1, -1.33], [-0.22, 0, 0]));
    g.charcoal.push(box(0.05, 0.3, 0.3, 0.02, [-0.38, 1.1, -1.33], [-0.22, 0, 0]));
    // Satin champagne band sweeping across the face of the dash
    g.satin.push(box(2.84, 0.16, 0.1, 0.05, [-0.5, 0.82, -1.0], [-0.25, 0, 0]));
    // Chrome seam on top of the band + blue ambient light strip under it
    g.chrome.push(box(2.8, 0.012, 0.02, 0.005, [-0.5, 0.9, -0.99]));
    g.led.push(box(2.66, 0.008, 0.012, 0.003, [-0.55, 0.735, -0.965]));
    // Lower knee panel
    g.soft.push(box(2.86, 0.36, 0.5, 0.08, [-0.5, 0.52, -1.18]));

    // ---------- Vents ----------
    vent(0.2, 0.12, [0.74, 0.82, -0.94], [-0.25, -0.25, 0], g); // driver outer
    vent(0.2, 0.1, [-0.84, 0.82, -0.945], [-0.25, 0.08, 0], g); // centre pair
    vent(0.2, 0.1, [-0.2, 0.82, -0.945], [-0.25, -0.05, 0], g);
    vent(0.24, 0.12, [-1.76, 0.82, -0.96], [-0.25, 0.3, 0], g); // passenger outer

    // ---------- Centre stack + climate ----------
    g.satin.push(box(0.64, 0.4, 0.2, 0.06, [-0.5, 0.52, -0.96], [-0.15, 0, 0]));
    g.gloss.push(box(0.56, 0.16, 0.02, 0.02, [-0.5, 0.6, -0.86], [-0.15, 0, 0]));
    const knobs = [-0.68, -0.5, -0.32];
    knobs.forEach((x) => {
      g.chrome.push(cyl(0.042, 0.044, 0.02, [x, 0.585, -0.835], [Math.PI / 2 - 0.15, 0, 0]));
      g.charcoal.push(cyl(0.032, 0.034, 0.03, [x, 0.585, -0.825], [Math.PI / 2 - 0.15, 0, 0]));
    });
    // Climate knob colour hints (cool / warm) and button row
    g.led.push(torus(0.034, 0.0035, [-0.68, 0.585, -0.811], [-0.15, 0, 0], 24));
    for (let i = 0; i < 5; i++) g.charcoal.push(box(0.07, 0.03, 0.015, 0.008, [-0.68 + i * 0.09, 0.665, -0.846], [-0.15, 0, 0]));
    // Hazard button
    g.gloss.push(box(0.07, 0.04, 0.02, 0.01, [-0.5, 0.72, -0.9], [-0.25, 0, 0]));
    g.red.push(box(0.022, 0.018, 0.008, 0.003, [-0.5, 0.722, -0.888], [-0.25, 0, 0]));

    // ---------- Console between the seats ----------
    g.soft.push(box(0.56, 0.46, 0.95, 0.08, [-0.5, 0.36, -0.42]));
    g.satin.push(box(0.5, 0.03, 0.85, 0.02, [-0.5, 0.6, -0.42]));
    // Cup holders
    [-0.62, -0.38].forEach((x) => {
      g.gloss.push(cyl(0.052, 0.05, 0.02, [x, 0.615, -0.7], [0, 0, 0]));
      g.chrome.push(torus(0.054, 0.005, [x, 0.626, -0.7], [Math.PI / 2, 0, 0]));
    });
    // Gear selector
    g.gloss.push(box(0.12, 0.03, 0.18, 0.02, [-0.5, 0.625, -0.36]));
    g.chrome.push(cyl(0.012, 0.014, 0.12, [-0.5, 0.68, -0.36], [0, 0, 0], 10));
    g.charcoal.push(box(0.07, 0.07, 0.09, 0.03, [-0.5, 0.76, -0.36]));
    // Wireless charging pad (blue glyph)
    g.gloss.push(box(0.16, 0.012, 0.12, 0.01, [-0.5, 0.618, -0.12]));

    // ---------- Door cards ----------
    for (const [x, s] of [
      [0.96, 1],
      [-1.96, -1],
    ] as const) {
      g.soft.push(box(0.06, 0.9, 2.1, 0.05, [x, 0.74, -0.3]));
      g.charcoal.push(box(0.05, 0.05, 1.3, 0.02, [x - s * 0.03, 0.98, -0.35])); // armrest
      g.led.push(box(0.006, 0.006, 1.1, 0.002, [x - s * 0.031, 1.012, -0.35])); // ambient line
      g.charcoal.push(box(0.09, 0.06, 0.6, 0.03, [x - s * 0.06, 0.9, -0.3])); // pull handle
      g.charcoal.push(box(0.04, 0.3, 0.5, 0.03, [x - s * 0.02, 0.5, -0.55])); // speaker grille
      g.chrome.push(torus(0.1, 0.006, [x - s * 0.045, 0.5, -0.55], [0, Math.PI / 2, 0]));
    }

    // ---------- Overhead console ----------
    g.soft.push(box(0.9, 0.08, 0.5, 0.04, [-0.5, 2.37, -1.05]));
    for (let i = 0; i < 4; i++) g.gloss.push(box(0.08, 0.012, 0.05, 0.005, [-0.8 + i * 0.2, 2.326, -1.05]));
    g.led.push(box(0.6, 0.006, 0.01, 0.002, [-0.5, 2.33, -1.29]));

    // Seat headrest / bolster (driver)
    g.soft.push(box(0.4, 0.34, 0.16, 0.09, [-0.15, 1.55, 0.55]));
    g.soft.push(box(0.46, 0.5, 0.4, 0.1, [-0.15, 1.1, 0.65]));

    const merged: Record<string, THREE.BufferGeometry> = {};
    for (const k of Object.keys(g)) if (g[k].length) merged[k] = mergeGeometries(g[k].map((x) => (x.index ? x.toNonIndexed() : x)), false);
    return merged;
  }, []);

  const mats: Record<string, THREE.Material> = { charcoal, soft, satin, chrome, gloss, led, red };

  return (
    <group>
      {Object.entries(geos).map(([k, geo]) => (
        <mesh key={k} geometry={geo} material={mats[k]} receiveShadow={k !== "led"} />
      ))}
      <ContactShadow position={[-0.5, 0.79, -0.36]} radius={0.09} opacity={0.4} />
    </group>
  );
}
