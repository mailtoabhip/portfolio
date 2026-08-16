"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clayBody, clayAccentCyan, clayAccentAmber, setClayRimTier } from "@/lib/clayMaterials";
import ContactShadow from "@/components/three/ContactShadow";
import { useNightRun } from "@/lib/store";

/**
 * Claymorphic cab interior — dash, door-panel recesses, roof ribs,
 * center console, AC vents, gear shifter, seat edges/piping. Built as
 * per-material-group arrays of positioned geometry, each group merged
 * into a single static BufferGeometry (perf: "merge static geometry" —
 * a couple of draw calls instead of a dozen+ separate meshes, since
 * none of this moves or animates independently).
 *
 * The outer cab shell (walls/pillars/roof/floor) is left in Cab.tsx's
 * existing dark palette — only the surfaces the brief calls out by
 * name get the clay-tan treatment, so the "mood from lighting, not
 * geometry" darkness around the edges of the cab is preserved.
 */

function box(
  w: number,
  h: number,
  d: number,
  radius: number,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, 3, radius);
  const m = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(...rotation))
    .setPosition(...position);
  g.applyMatrix4(m);
  return g;
}

function ring(
  radius: number,
  tube: number,
  position: [number, number, number],
  rotation: [number, number, number],
  scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(radius, tube, 10, 20);
  const m = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(...rotation))
    .scale(new THREE.Vector3(...scale))
    .setPosition(...position);
  g.applyMatrix4(m);
  return g;
}

function ball(
  radius: number,
  position: [number, number, number]
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 14, 12);
  g.applyMatrix4(new THREE.Matrix4().setPosition(...position));
  return g;
}

export default function CabInterior() {
  const quality = useNightRun((s) => s.quality);

  // Tier gate for the shared clay materials' fresnel rim (tier 2
  // only, per the Performance Architecture section).
  useEffect(() => {
    setClayRimTier(quality);
  }, [quality]);

  const { bodyGeo, cyanGeo, amberGeo } = useMemo(() => {
    const bodyParts: THREE.BufferGeometry[] = [
      // Dashboard slab (clay tan, replaces the old flat black box)
      box(2.7, 0.34, 0.6, 0.09, [-0.5, 0.78, -1.3], [-0.18, 0, 0]),
      // Center console between the seats
      box(0.5, 0.62, 0.9, 0.08, [-0.5, 0.5, -0.55]),
      // Roof ribs overhead — three soft rounded strips
      box(0.12, 0.08, 2.3, 0.04, [-1.55, 2.36, -0.4]),
      box(0.12, 0.08, 2.3, 0.04, [-0.5, 2.36, -0.4]),
      box(0.12, 0.08, 2.3, 0.04, [0.55, 2.36, -0.4]),
      // Door panels: a base slab + a smaller inset slab pushed forward
      // reads as a soft molded recess rather than a flat plane.
      box(0.06, 0.85, 2.0, 0.05, [0.96, 0.75, -0.3]),
      box(0.04, 0.6, 1.5, 0.05, [0.99, 0.72, -0.3]),
      box(0.06, 0.85, 2.0, 0.05, [-1.96, 0.75, -0.3]),
      box(0.04, 0.6, 1.5, 0.05, [-1.99, 0.72, -0.3]),
      // Seats — headrest + shoulder bolster, driver side only (what's
      // visible in the driver's-POV frame)
      box(0.4, 0.34, 0.16, 0.09, [-0.15, 1.55, 0.55]),
      box(0.46, 0.5, 0.4, 0.1, [-0.15, 1.1, 0.65]),
    ];

    const cyanParts: THREE.BufferGeometry[] = [
      // AC vents: flattened oval louvers, not sharp slats
      ring(0.11, 0.03, [-0.15, 0.98, -1.42], [0, 0, 0], [1.5, 1, 1]),
      ring(0.11, 0.03, [-1.15, 0.98, -1.42], [0, 0, 0], [1.5, 1, 1]),
      // Gear-shifter boot piping (cyan ring at the console base)
      ring(0.07, 0.015, [-0.5, 0.82, -0.4], [Math.PI / 2, 0, 0]),
      // Seat piping along the seam
      ring(0.24, 0.012, [-0.15, 1.1, 0.86], [0, Math.PI / 2, 0], [1, 1.3, 1]),
    ];

    const amberParts: THREE.BufferGeometry[] = [
      // Gear-shifter knob: amber clay ball on its (cyan-piped) boot
      ball(0.055, [-0.5, 0.98, -0.4]),
    ];

    return {
      bodyGeo: mergeGeometries(bodyParts, false),
      cyanGeo: mergeGeometries(cyanParts, false),
      amberGeo: mergeGeometries(amberParts, false),
    };
  }, []);

  return (
    <group>
      <mesh geometry={bodyGeo} material={clayBody} receiveShadow />
      <mesh geometry={cyanGeo} material={clayAccentCyan} />
      <mesh geometry={amberGeo} material={clayAccentAmber} />
      {/* Gear-shifter stem — a thin cylinder connecting knob to boot,
          cheap enough to leave as its own tiny mesh. */}
      <mesh position={[-0.5, 0.9, -0.4]}>
        <cylinderGeometry args={[0.018, 0.022, 0.16, 8]} />
        <meshStandardMaterial color="#3a352c" roughness={0.6} />
      </mesh>
      <ContactShadow position={[-0.5, 0.83, -0.4]} radius={0.09} opacity={0.4} />
    </group>
  );
}
