"use client";

import { useEffect, useMemo } from "react";
import { OrbitControls, Grid as DreiGrid } from "@react-three/drei";
import * as THREE from "three";
import { useExplorerStore } from "@/store/explorerStore";
import type { MeshScene } from "@/lib/types";

/** Orbit controls that reactively follow explorer store settings. */
export function OrbitRig() {
  const autoRotate = useExplorerStore((s) => s.autoRotate);
  const enabled = useExplorerStore((s) => s.cameraMode) === "orbit";
  if (!enabled) return null;
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      maxPolarAngle={Math.PI / 2 - 0.03}
      minDistance={3}
      maxDistance={400}
    />
  );
}

export type TerrainSampler = (
  x: number,
  y: number
) => { elevation: number; norm: number; slopeDeg: number };

interface TerrainMeshProps {
  scene: MeshScene;
  heights: Float32Array;
  textureUrl?: string;
  samplerRef: React.MutableRefObject<TerrainSampler | null>;
  gridVisible?: boolean;
}

const HEIGHT_SCALE = 3.2; // world units for the full elevation span at 1x exaggeration
export { HEIGHT_SCALE };
export function TerrainMesh({
  scene,
  heights,
  textureUrl,
  samplerRef,
  gridVisible = true,
}: TerrainMeshProps) {
  const exaggeration = useExplorerStore((s) => s.exaggeration);
  const wireframe = useExplorerStore((s) => s.wireframe);
  const showTexture = useExplorerStore((s) => s.texture);
  const measuring = useExplorerStore((s) => s.measuring);
  const addMeasurementPoint = useExplorerStore((s) => s.addMeasurementPoint);
  const calibrated = scene.calibrated;
  const units = scene.units;

  const cols = scene.width;
  const rows = scene.height;
  const span = scene.max_elevation - scene.min_elevation;

  // Base grid geometry + per-vertex normalized elevation (0..1).
  const base = useMemo(() => {
    const w = cols;
    const h = rows;
    const geo = new THREE.PlaneGeometry(w, h, w - 1, h - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const norm = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      const gx = k % w;
      const gy = Math.min(Math.floor(k / w), h - 1);
      // geometry row 0 sits at scene back = image top row
      const row = h - 1 - gy;
      const imageIdx = row * w + Math.min(gx, w - 1);
      norm[k] = Math.max(0, Math.min(1, heights[imageIdx] ?? 0));
    }
    geo.setAttribute("aNorm", new THREE.BufferAttribute(norm, 1));
    return { geo, norm };
  }, [cols, rows, heights]);

  // Displaced geometry rebuilt when exaggeration changes.
  const geometry = useMemo(() => {
    const pos = base.geo.attributes.position as THREE.BufferAttribute;
    const norm = base.norm;
    const displaced = base.geo.clone();
    const dpos = (displaced.attributes.position as THREE.BufferAttribute).array;
    const count = pos.count;
    for (let k = 0; k < count; k++) {
      dpos[k * 3 + 1] = norm[k] * HEIGHT_SCALE * exaggeration;
    }
    displaced.attributes.position.needsUpdate = true;
    displaced.computeVertexNormals();
    return displaced;
  }, [base, exaggeration]);

  // Load the original image as terrain texture.
  const texture = useMemo(() => {
    if (!textureUrl) return null;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    const tex = loader.load(textureUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [textureUrl]);
// Terrain sampling for measurement & flythrough.
  const sampler = useMemo<TerrainSampler>(() => {
    return (wx: number, wy: number) => {
      const u = (wx + cols / 2) / Math.max(cols, 1);
      const v = (wy + rows / 2) / Math.max(rows, 1);
      const gx = Math.max(0, Math.min(cols - 1, Math.floor(u * cols)));
      const gy = Math.max(0, Math.min(rows - 1, Math.floor(v * rows)));
      const row = rows - 1 - gy;
      const idx = row * cols + gx;
      const norm = Math.max(0, Math.min(1, heights[idx] ?? 0));
      const elevation = scene.min_elevation + norm * span;

      const step = Math.max(1, Math.floor(Math.min(cols, rows) / 24));
      const gxL = Math.max(0, gx - step);
      const gxR = Math.min(cols - 1, gx + step);
      const gyU = Math.max(0, gy - step);
      const gyD = Math.min(rows - 1, gy + step);
      const nL = heights[(rows - 1 - gy) * cols + gxL] ?? norm;
      const nR = heights[(rows - 1 - gy) * cols + gxR] ?? norm;
      const nU = heights[(rows - 1 - gyU) * cols + gx] ?? norm;
      const nD = heights[(rows - 1 - gyD) * cols + gx] ?? norm;
      const slopeDeg = (Math.atan(Math.max(Math.abs(nR - nL), Math.abs(nD - nU))) * 180) / Math.PI;

      return { elevation, norm, slopeDeg };
    };
  }, [cols, rows, heights, span, scene.min_elevation]);

  useEffect(() => {
    samplerRef.current = sampler;
    return () => {
      samplerRef.current = null;
    };
  }, [sampler, samplerRef]);

  const onPointerDown = (e: any) => {
    if (!measuring) return;
    e.stopPropagation();
    const pos = e.point as THREE.Vector3;
    const s = sampler(pos.x, pos.z);
    addMeasurementPoint({
      x: Math.floor(((pos.x + cols / 2) / Math.max(cols, 1)) * cols),
      y: Math.floor(((pos.z + rows / 2) / Math.max(rows, 1)) * rows),
      z: s.elevation,
      elevation: s.elevation,
      relativeHeight: s.norm,
      slopeDeg: s.slopeDeg,
    });
  };

  // M toggles measure mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        useExplorerStore.getState().setMeasuring(!useExplorerStore.getState().measuring);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <group>
      <mesh geometry={geometry} onPointerDown={onPointerDown}>
        {showTexture && texture ? (
          <meshStandardMaterial
            map={texture}
            roughness={0.92}
            metalness={0.0}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial
            color="#1b3b5c"
            roughness={0.9}
            wireframe={wireframe}
          />
        )}
      </mesh>
      {gridVisible && (
        <DreiGrid
          position={[0, -0.05, 0]}
          args={[200, 200]}
          cellSize={2}
          cellThickness={0.5}
          cellColor="#164e63"
          sectionSize={10}
          sectionThickness={0.8}
          sectionColor="#155e75"
          fadeDistance={160}
          fadeStrength={1.5}
        />
      )}
    </group>
  );
}