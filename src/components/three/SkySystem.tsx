"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useNightRun } from "@/lib/store";
import {
  timeOfDayState,
  bandT,
  ease,
  SUNRISE_DURATION,
  SUNSET_DURATION,
  REDUCED_MOTION_DURATION,
  SKY,
  FOG_NEAR,
  FOG_FAR,
  AMBIENT,
  AMBIENT_COLOR,
  SUN_LIGHT_COLOR,
  SUN_LIGHT_INTENSITY,
} from "@/lib/timeOfDayState";

/**
 * Owns "what time it is": the sole writer of `timeOfDayState.t`, and
 * everything that reads it purely as a sky/light/sun-disc concern.
 * Road, Forest and Headlights each read `t` on their own frame loop
 * to lerp their own materials — this component never touches them.
 *
 * The sun/moon disc sits at a fixed world position rather than
 * tracking the camera: the truck never actually translates along Z
 * (the world recycles under it, per Forest.tsx), so a fixed-Z point
 * ahead of the driver never needs to "follow" anything.
 */

const SUN_Z = -55;
const SUN_X = -0.5; // road centerline
const SUN_Y_NIGHT = 9; // just above the tree line — a whisper, not a centerpiece
const SUN_Y_DAY = 74; // ~52° elevation from the driver's seat at SUN_Z

function makeDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function SkySystem() {
  const { scene } = useThree();
  const quality = useNightRun((s) => s.quality);

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const discRef = useRef<THREE.Mesh>(null);
  const discMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const skyNight = useMemo(() => new THREE.Color(SKY.night), []);
  const skyDay = useMemo(() => new THREE.Color(SKY.day), []);
  const ambientColNight = useMemo(() => new THREE.Color(AMBIENT_COLOR.night), []);
  const ambientColDay = useMemo(() => new THREE.Color(AMBIENT_COLOR.day), []);
  const moonColor = useMemo(() => new THREE.Color("#8fe9ff"), []);
  const sunDiscColor = useMemo(() => new THREE.Color("#ffd9a0"), []);
  const discTexture = useMemo(() => makeDiscTexture(), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const { timeOfDay, setTimeOfDay } = useNightRun.getState();

    const sunriseDur = reducedMotion ? REDUCED_MOTION_DURATION : SUNRISE_DURATION;
    const sunsetDur = reducedMotion ? REDUCED_MOTION_DURATION : SUNSET_DURATION;

    if (timeOfDay === "sunrise") {
      timeOfDayState.active = true;
      timeOfDayState.t = Math.min(1, timeOfDayState.t + delta / sunriseDur);
      if (timeOfDayState.t >= 1) {
        timeOfDayState.active = false;
        setTimeOfDay("day");
      }
    } else if (timeOfDay === "sunset") {
      timeOfDayState.active = true;
      timeOfDayState.t = Math.max(0, timeOfDayState.t - delta / sunsetDur);
      if (timeOfDayState.t <= 0) {
        timeOfDayState.active = false;
        setTimeOfDay("night");
      }
    } else {
      timeOfDayState.active = false;
      // Pin exactly at rest — no float drift across repeated toggles.
      timeOfDayState.t = timeOfDay === "day" ? 1 : 0;
    }

    const t = timeOfDayState.t;
    const skyMix = ease(t);
    const ambientT = bandT(t, 0.05, 0.5);
    const sunLightT = bandT(t, 0.55, 1.0);
    const arcT = bandT(t, 0.08, 0.5);

    // Sky + fog — fog color always equals background so the horizon
    // blends seamlessly, in both modes.
    const bg = scene.background;
    if (bg instanceof THREE.Color) bg.lerpColors(skyNight, skyDay, skyMix);
    const fog = scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.lerpColors(skyNight, skyDay, skyMix);
      fog.near = THREE.MathUtils.lerp(FOG_NEAR.night, FOG_NEAR.day, skyMix);
      fog.far = THREE.MathUtils.lerp(FOG_FAR.night, FOG_FAR.day, skyMix);
    }

    // Ambient
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        AMBIENT.night,
        AMBIENT.day,
        ambientT
      );
      ambientRef.current.color.lerpColors(ambientColNight, ambientColDay, ambientT);
    }

    // Directional "sun" light — fades in late, casts the day's shadows.
    if (sunRef.current) {
      sunRef.current.intensity = SUN_LIGHT_INTENSITY * sunLightT;
      sunRef.current.castShadow = quality > 0 && sunLightT > 0.05;
      const shadow = sunRef.current.shadow;
      if (shadow) {
        const size = quality >= 2 ? 1024 : 512;
        if (shadow.mapSize.width !== size) shadow.mapSize.set(size, size);
        shadow.radius = quality >= 2 ? 4 : 0; // soft on tier 2, hard on tier 1
      }
      sunRef.current.position.set(SUN_X, SUN_Y_DAY, SUN_Z);
    }

    // The disc itself — climbs from the tree line to a low daytime arc.
    if (discRef.current) {
      discRef.current.position.set(
        SUN_X,
        THREE.MathUtils.lerp(SUN_Y_NIGHT, SUN_Y_DAY, arcT),
        SUN_Z
      );
    }
    if (discMatRef.current) {
      discMatRef.current.color.lerpColors(moonColor, sunDiscColor, skyMix);
      // Barely-there moon at night; a real glow once the sun's up.
      discMatRef.current.opacity = THREE.MathUtils.lerp(0.3, 0.85, skyMix);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={AMBIENT.night} />
      <directionalLight
        ref={sunRef}
        intensity={0}
        color={SUN_LIGHT_COLOR}
        position={[SUN_X, SUN_Y_NIGHT, SUN_Z]}
      />
      <mesh ref={discRef} position={[SUN_X, SUN_Y_NIGHT, SUN_Z]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial
          ref={discMatRef}
          map={discTexture}
          transparent
          depthWrite={false}
          color="#8fe9ff"
          opacity={0.3}
        />
      </mesh>
    </>
  );
}
