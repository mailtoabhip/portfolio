"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { drive } from "@/lib/driveState";
import { input } from "@/lib/controls";
import { CAB_OFFSET_X, TRUCK_FRONT, TRUCK_REAR } from "@/lib/game";
import { fitTruck } from "@/lib/truckFit";
import { useTruckView } from "@/lib/truckView";

function dispose(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(mat);
  });
  materials.forEach((m) => m.dispose());
}

export default function ExteriorTruck({ visible, motion = drive }: { visible: boolean; motion?: { dz: number } }) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const wheels = useRef<THREE.Object3D[]>([]);
  const steering = useRef<THREE.Object3D[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    let loaded: THREE.Group | null = null;
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    useTruckView.getState().setAsset("loading");
    async function load() {
      try {
        const response = await fetch("/realism-assets/delivery-rigid-truck.glb", { signal: controller.signal });
        if (!response.ok) throw new Error("Truck request failed: " + response.status);
        const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "");
        loaded = gltf.scene;
        if (cancelled) { dispose(loaded); loaded = null; return; }
        const bounds = new THREE.Box3().setFromObject(loaded);
        const fit = fitTruck(bounds.min.z, bounds.max.z, bounds.min.y, TRUCK_FRONT, TRUCK_REAR);
        loaded.scale.z = fit.scaleZ;
        loaded.position.set(CAB_OFFSET_X, fit.y, fit.z);
        wheels.current = [];
        steering.current = [];
        loaded.traverse((o) => {
          if (o.name.startsWith("wheel_spin")) wheels.current.push(o);
          if (o.name.startsWith("steer_")) steering.current.push(o);
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
        });
        setModel(loaded);
        useTruckView.getState().setAsset("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Exterior truck unavailable", error);
          useTruckView.getState().setAsset("error");
        }
      } finally { window.clearTimeout(timeout); }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
      if (loaded) dispose(loaded);
      wheels.current = [];
      steering.current = [];
    };
  }, []);
  useFrame((_, dt) => {
    for (const wheel of wheels.current) wheel.rotation.set(
      (wheel.rotation.x - motion.dz / 0.48) % (Math.PI * 2), 0, 0);
    const target = -input.steer * 0.33;
    for (const axle of steering.current) axle.rotation.set(0,
      axle.rotation.y + (target - axle.rotation.y) * (1 - Math.exp(-10 * Math.min(dt, 0.1))), 0);
  });
  return model ? <primitive object={model} visible={visible} dispose={null} /> : null;
}
