import * as THREE from "three";

/**
 * Shared claymorphic materials + the fresnel/rim shader trick, reused
 * across every clay object (cab interior, tablet, phone, tree canopy)
 * instead of each component defining its own — fewer shader program
 * switches per frame, one place to tune the "clay" look.
 *
 * Fresnel rim is the cheap fake-subsurface trick from the brief: a
 * view-dependent edge brightening, not real SSS. Call sites gate it by
 * quality tier (tier 2 only) — this module doesn't know about tiers.
 */

export const CLAY_BODY_COLOR = "#e3d5c0";
export const CLAY_ACCENT_CYAN = "#8fe9ff";
export const CLAY_ACCENT_AMBER = "#ffb65c";

export const clayBody = new THREE.MeshStandardMaterial({
  color: CLAY_BODY_COLOR,
  roughness: 0.55,
  metalness: 0,
});

export const clayAccentCyan = new THREE.MeshStandardMaterial({
  color: CLAY_ACCENT_CYAN,
  roughness: 0.4,
  metalness: 0.05,
  emissive: CLAY_ACCENT_CYAN,
  emissiveIntensity: 0.18,
});

export const clayAccentAmber = new THREE.MeshStandardMaterial({
  color: CLAY_ACCENT_AMBER,
  roughness: 0.4,
  metalness: 0.05,
  emissive: CLAY_ACCENT_AMBER,
  emissiveIntensity: 0.18,
});

// Fresnel rim, patched in once at module init (shared singletons —
// there's only ever one shader program to compile). Starts at zero
// intensity; whichever component owns `quality` flips it on/off, so
// the cost of the extra shader term stays gated to tier 2 without
// needing a second, un-patched material to swap to.
export const clayBodyRim = applyFresnelRim(clayBody, { color: "#93a8d1", power: 2.4, intensity: 0 });
export const clayAccentCyanRim = applyFresnelRim(clayAccentCyan, {
  color: "#c8f4ff",
  power: 2.2,
  intensity: 0,
});
export const clayAccentAmberRim = applyFresnelRim(clayAccentAmber, {
  color: "#ffe0b0",
  power: 2.2,
  intensity: 0,
});

/** Tier gate for the three shared clay materials' rim term above —
 * call once wherever `quality` is read (CabInterior owns the cab's
 * clay surfaces). */
export function setClayRimTier(quality: 0 | 1 | 2): void {
  const on = quality >= 2 ? 0.25 : 0;
  clayBodyRim.uRimIntensity.value = on;
  clayAccentCyanRim.uRimIntensity.value = on * 1.1;
  clayAccentAmberRim.uRimIntensity.value = on * 1.1;
}

/** Screens need a unique texture each, so this is a factory, not a
 * singleton — but shares the same roughness/metalness so every screen
 * reads consistently against the clay bezels around it. */
export function makeScreenMaterial(
  texture: THREE.Texture,
  glowColor: string
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: "#020507",
    emissive: glowColor,
    emissiveMap: texture,
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
}

interface FresnelOptions {
  color?: string;
  power?: number;
  intensity?: number;
}

/**
 * Patches a material's shader (via onBeforeCompile) to add a soft
 * fresnel/rim brightening term along silhouette edges — the "like a
 * balloon or a gummy" cue. Returns the uniforms object so the caller
 * can animate `uRimIntensity` per frame (e.g. fading the tree rim in
 * only at night).
 */
export function applyFresnelRim(
  material: THREE.MeshStandardMaterial,
  { color = "#93a8d1", power = 2.2, intensity = 0.35 }: FresnelOptions = {}
): { uRimColor: THREE.IUniform; uRimIntensity: THREE.IUniform } {
  const uniforms = {
    uRimColor: { value: new THREE.Color(color) },
    uRimIntensity: { value: intensity },
    uRimPower: { value: power },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uRimColor;
        uniform float uRimIntensity;
        uniform float uRimPower;`
      )
      .replace(
        "#include <dithering_fragment>",
        `float rimFresnel = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
        gl_FragColor.rgb += uRimColor * rimFresnel * uRimIntensity;
        #include <dithering_fragment>`
      );
  };
  material.needsUpdate = true;

  return uniforms;
}
