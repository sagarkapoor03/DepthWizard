"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExplorerStore } from "@/store/explorerStore";
import { HEIGHT_SCALE, type TerrainSampler } from "./TerrainMesh";

interface FlythroughProps {
  samplerRef: React.MutableRefObject<TerrainSampler | null>;
  cols: number;
  rows: number;
  speed?: number;
}

/**
 * Scripted camera path over the reconstructed terrain.
 * A Catmull-Rom loop follows several "orbiting" control points whose height
 * tracks the terrain surface. Flythrough can be started, paused and resumed
 * from the control panel.
 */
export function FlythroughController({ samplerRef, cols, rows, speed = 0.06 }: FlythroughProps) {
  const state = useExplorerStore((s) => s.flythrough);
  const { camera } = useThree();
  const tRef = useRef(0);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const lookTarget = useRef(new THREE.Vector3());

  // Build the path once the sampler is available.
  useEffect(() => {
    curveRef.current = null;
    tRef.current = 0;
  }, [cols, rows]);

  const ready = useMemo(() => {
    if (!curveRef.current && samplerRef.current && cols > 2 && rows > 2) {
      const rx = cols * 0.36;
      const rz = rows * 0.34;
      const pts: THREE.Vector3[] = [];
      const N = 64;
      const exaggeration = useExplorerStore.getState().exaggeration;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const x = Math.cos(a) * rx;
        const z = Math.sin(a) * rz * 0.85;
        const s = samplerRef.current(x, z);
        const ground = s.norm * HEIGHT_SCALE * exaggeration;
        const y = ground + 8 + Math.sin(a * 3) * 5;
        pts.push(new THREE.Vector3(x, y, z));
      }
      curveRef.current = new THREE.CatmullRomCurve3(pts, true);
    }
    return curveRef.current;
  }, [cols, rows, samplerRef]);

  useFrame((_, rawDt) => {
    const curve = ready ?? curveRef.current;
    if (!curve) return;
    const dt = Math.min(rawDt, 0.05);

    if (state === "playing") {
      tRef.current = (tRef.current + speed * dt) % 1;
      const p = curve.getPointAt(tRef.current, new THREE.Vector3());
      camera.position.copy(p);

      const aheadT = (tRef.current + 0.012) % 1;
      curve.getPointAt(aheadT, lookTarget.current);
      camera.lookAt(lookTarget.current);

      // gentle roll-free up vector
      const fwd = new THREE.Vector3().subVectors(lookTarget.current, p).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      camera.up.copy(up);
    }

    if (state === "idle") {
      tRef.current = 0;
    }
  });

  return null;
}