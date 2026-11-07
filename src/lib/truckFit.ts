/** Match the exterior to the simulation's longitudinal footprint. Mirrors
 * remain cosmetic; the cargo body is the existing 2.2 m collision width. */
export function fitTruck(minZ: number, maxZ: number, minY: number, front: number, rear: number) {
  const span = maxZ - minZ;
  if (!Number.isFinite(span) || span <= 0) throw new Error("Invalid truck bounds");
  const scaleZ = (front + rear) / span;
  return { scaleZ, z: -front - minZ * scaleZ, y: -minY };
}
