"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useNightRun } from "@/lib/store";
import { timeOfDayState, bandT } from "@/lib/timeOfDayState";

const FULL_INTENSITY = 260; // candela — v1 value, tuned against the pure-black night

/**
 * The truck's two headlights + the ignition sequence.
 * On phase "igniting": a beat of dark, one weak flicker, then both
 * beams snap on and settle — then hands the store to "cruising".
 */
export default function Headlights() {
  const phase = useNightRun((s) => s.phase);
  const setPhase = useNightRun((s) => s.setPhase);

  const leftRef = useRef<THREE.SpotLight>(null);
  const rightRef = useRef<THREE.SpotLight>(null);

  // Both beams aim at a shared target far down the road.
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(-0.5, 0, -45);
    return t;
  }, []);

  useEffect(() => {
    if (phase !== "igniting") return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const lights = [left, right];
    const tl = gsap.timeline({
      onComplete: () => setPhase("cruising"),
    });

    tl.set(lights, { intensity: 0 })
      // a weak stutter — the starter turning over
      .to(lights, { intensity: FULL_INTENSITY * 0.25, duration: 0.08, delay: 0.5 })
      .to(lights, { intensity: 0, duration: 0.07 })
      .to(lights, { intensity: FULL_INTENSITY * 0.4, duration: 0.06, delay: 0.25 })
      .to(lights, { intensity: FULL_INTENSITY * 0.1, duration: 0.08 })
      // catch — snap to full and settle
      .to(lights, {
        intensity: FULL_INTENSITY,
        duration: 0.35,
        ease: "power2.out",
        delay: 0.15,
      });

    return () => {
      tl.kill();
    };
  }, [phase, setPhase]);

  // Day/night fade — owns intensity once the ignition sequence has
  // handed off. Never runs during "igniting"/"name": the GSAP timeline
  // above (and the pre-ignition dark) fully own intensity there.
  useFrame(() => {
    const { phase } = useNightRun.getState();
    if (phase !== "cruising" && phase !== "reading" && phase !== "returning") return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    // Fully off by t=0.5 sunrise; the reverse fade brings them back
    // on the way down through sunset, since both read the same t.
    const headlightFactor = 1 - bandT(timeOfDayState.t, 0, 0.5);
    const target = FULL_INTENSITY * headlightFactor;
    left.intensity = target;
    right.intensity = target;
  });

  return (
    <group>
      <primitive object={target} />
      {/* Left + right beams from the front of the hood */}
      <spotLight
        ref={leftRef}
        position={[-1.6, 0.75, -3.1]}
        target={target}
        angle={0.55}
        penumbra={0.7}
        decay={1.6}
        distance={90}
        intensity={0}
        color="#ffd9a0"
      />
      <spotLight
        ref={rightRef}
        position={[0.6, 0.75, -3.1]}
        target={target}
        angle={0.55}
        penumbra={0.7}
        decay={1.6}
        distance={90}
        intensity={0}
        color="#ffd9a0"
      />
    </group>
  );
}
