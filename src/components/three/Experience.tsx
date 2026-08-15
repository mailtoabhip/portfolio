"use client";

import { Canvas } from "@react-three/fiber";
import Truck from "@/components/three/Truck";
import Road from "@/components/three/Road";
import Forest from "@/components/three/Forest";
import DeliveryStop from "@/components/three/DeliveryStop";
import SkySystem from "@/components/three/SkySystem";
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
        <color attach="background" args={["#050608"]} />
        <fog attach="fog" args={["#050608", 8, 60]} />

        <SkySystem />
        <Truck />
        <Road />
        <Forest />
        <DeliveryStop />
      </Canvas>
    </div>
  );
}
