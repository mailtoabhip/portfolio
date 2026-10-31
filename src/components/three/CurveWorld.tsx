"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { bendScene } from "@/lib/curveWorld";

/**
 * Keeps every material in the scene patched with the curved-world
 * bend (lib/curveWorld.ts). Materials can appear late (textures
 * resolving, quality-tier swaps), so it re-walks the scene twice a
 * second; already-patched materials are skipped in O(1).
 */
export default function CurveWorld() {
  const acc = useRef(1);
  useFrame((state, delta) => {
    acc.current += delta;
    if (acc.current < 0.5) return;
    acc.current = 0;
    bendScene(state.scene);
  });
  return null;
}
