"use client";

import { useEffect, useRef } from "react";
import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExplorerStore } from "@/store/explorerStore";
import { HEIGHT_SCALE, type TerrainSampler } from "./TerrainMesh";

/** Pointer-locked WASD controller with terrain following. */
export function FirstPersonControls({
  samplerRef,
}: {
  samplerRef: React.MutableRefObject<TerrainSampler | null>;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const exaggeration = useExplorerStore.getState().exaggeration;
    const keys = keysRef.current;

    const forwardAmount =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const strafeAmount =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);

    const speed = 26;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    camera.position.addScaledVector(dir, forwardAmount * speed * dt);
    camera.position.addScaledVector(right, strafeAmount * speed * dt);
    if (keys.Space) camera.position.y += 14 * dt;

    // terrain following
    if (samplerRef.current) {
      const s = samplerRef.current(camera.position.x, camera.position.z);
      const groundY = s.norm * HEIGHT_SCALE * exaggeration + 2.0;
      camera.position.y += (groundY - camera.position.y) * Math.min(1, dt * 5);
    }
  });

  return <PointerLockControls makeDefault />;
}