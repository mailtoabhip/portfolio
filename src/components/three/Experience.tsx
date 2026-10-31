"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import Truck from "@/components/three/Truck";
import Road from "@/components/three/Road";
import Forest from "@/components/three/Forest";
import SkySystem from "@/components/three/SkySystem";
import SkyDome from "@/components/three/SkyDome";
import CurveWorld from "@/components/three/CurveWorld";
import GameSim from "@/components/three/GameSim";
import GameWorld from "@/components/three/GameWorld";
import { useDrivingControls } from "@/lib/controls";
import { useNightRun } from "@/lib/store";

/**
 * The 3D shell: full-screen canvas, driver's-seat camera (FOV 75).
 * Night atmosphere per the reference: deep-blue sky (not pitch
 * black), starfield, faint moonlight so silhouettes read.
 */
export default function Experience() {
  useDrivingControls();
  const phase = useNightRun((s) => s.phase);
  const quality = useNightRun((s) => s.quality);
  const blurred = phase === "reading";

  return (
    <div
      className={`fixed inset-0 transition-[filter] duration-500 ${
        blurred ? "blur-md brightness-50" : ""
      }`}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]} // cap DPR per perf budget (§10)
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows={quality > 0}
      >
        {/* Initial values only — night by default. SkySystem takes
            over scene.background / scene.fog every frame once it
            mounts, including day mode. */}
        <color attach="background" args={["#14233f"]} />
        <fog attach="fog" args={["#14233f", 8, 90]} />

        {/* GameSim must stay first: it advances the truck before anything reads it */}
        <GameSim />
        <SkySystem />
        <SkyDome />
        <Truck />
        <Suspense fallback={null}>
          <Road />
        </Suspense>
        <Suspense fallback={null}>
          <GameWorld />
        </Suspense>
        <Forest />
        <CurveWorld />
      </Canvas>
    </div>
  );
}
