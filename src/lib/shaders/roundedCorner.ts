import * as THREE from "three";

/**
 * Cheap real-time box-corner rounding, done live in the vertex shader
 * instead of baked into geometry — for repeated/procedural box props
 * (the crate, signposts) where adding real bevel geometry per instance
 * isn't worth the extra vertices. One implementation, reused wherever
 * a plain box needs to stop reading as a hard 90° edge.
 *
 * Same corner math RoundedBoxGeometry bakes in, done per-vertex instead:
 * pull each vertex toward `sign(p) * (half - r) + normalize(d) * r`,
 * where `d = max(abs(p) - (half - r), 0)` is how far the vertex sits
 * past the "safe" inner box. Vertices already inside that inner box
 * (d == 0) are untouched.
 */
export function applyBoxRounding(
  material: THREE.Material & { onBeforeCompile?: THREE.Material["onBeforeCompile"] },
  geometry: THREE.BufferGeometry,
  radius: number
): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const half = new THREE.Vector3().subVectors(box.max, box.min).multiplyScalar(0.5);
  const center = new THREE.Vector3().addVectors(box.max, box.min).multiplyScalar(0.5);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBoxHalf = { value: half };
    shader.uniforms.uBoxCenter = { value: center };
    shader.uniforms.uCornerRadius = { value: radius };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uBoxHalf;
        uniform vec3 uBoxCenter;
        uniform float uCornerRadius;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          vec3 p = transformed - uBoxCenter;
          vec3 inner = uBoxHalf - vec3(uCornerRadius);
          vec3 d = max(abs(p) - inner, 0.0);
          float dl = length(d);
          if (dl > 1e-5) {
            vec3 rounded = sign(p) * inner + normalize(d) * uCornerRadius;
            transformed = rounded + uBoxCenter;
          }
        }`
      );
  };
  material.needsUpdate = true;
}
