"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useExplorerStore } from "@/store/explorerStore";
import { HEIGHT_SCALE } from "./TerrainMesh";

/**
 * Renders marker spheres + labels at measured points A and B, with a connecting line.
 */
export function SceneMarkers({ cols, rows }: { cols: number; rows: number }) {
  const measurement = useExplorerStore((s) => s.measurement);
  const exaggeration = useExplorerStore((s) => s.exaggeration);

  const pointA = useMemo(() => {
    if (!measurement?.pointA) return null;
    const x = (measurement.pointA.x / Math.max(1, cols - 1) - 0.5) * cols;
    const z = (measurement.pointA.y / Math.max(1, rows - 1) - 0.5) * rows;
    const y = measurement.pointA.relativeHeight * HEIGHT_SCALE * exaggeration;
    return new THREE.Vector3(x, y, z);
  }, [measurement?.pointA, cols, rows, exaggeration]);

  const pointB = useMemo(() => {
    if (!measurement?.pointB) return null;
    const x = (measurement.pointB.x / Math.max(1, cols - 1) - 0.5) * cols;
    const z = (measurement.pointB.y / Math.max(1, rows - 1) - 0.5) * rows;
    const y = measurement.pointB.relativeHeight * HEIGHT_SCALE * exaggeration;
    return new THREE.Vector3(x, y, z);
  }, [measurement?.pointB, cols, rows, exaggeration]);

  const midpoint = useMemo(() => {
    if (!pointA || !pointB) return null;
    return new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
  }, [pointA, pointB]);

  if (!pointA && !pointB) return null;

  return (
    <group>
      {/* Point A marker */}
      {pointA && (
        <group>
          <mesh position={pointA}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
          <mesh position={pointA}>
            <ringGeometry args={[1.0, 1.35, 32]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Html position={[pointA.x, pointA.y + 1.6, pointA.z]} center distanceFactor={10}>
            <div className="pointer-events-none whitespace-nowrap rounded-md bg-black/80 border border-cyan-400/40 px-2.5 py-1 text-[10px] font-mono text-cyan-200">
              ● Point A
            </div>
          </Html>
        </group>
      )}

      {/* Point B marker */}
      {pointB && (
        <group>
          <mesh position={pointB}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <mesh position={pointB}>
            <ringGeometry args={[1.0, 1.35, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Html position={[pointB.x, pointB.y + 1.6, pointB.z]} center distanceFactor={10}>
            <div className="pointer-events-none whitespace-nowrap rounded-md bg-black/80 border border-amber-400/40 px-2.5 py-1 text-[10px] font-mono text-amber-200">
              ● Point B
            </div>
          </Html>
        </group>
      )}

      {/* Line connecting A and B */}
      {pointA && pointB && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([...pointA.toArray(), ...pointB.toArray()])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </line>
          {/* Measurement label at midpoint */}
          {midpoint && (
            <Html position={[midpoint.x, midpoint.y + 2, midpoint.z]} center distanceFactor={10}>
              <div className="pointer-events-none whitespace-nowrap rounded-md bg-black/80 border border-white/40 px-2.5 py-1 text-[10px] font-mono text-white">
                ↔ measurement
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}