"use client";

import { Float } from "@react-three/drei";

/** Shown while the terrain mesh is being fetched/built. */
export function LoadingTerrain() {
  return (
    <group>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial color="#155e75" wireframe transparent opacity={0.8} />
        </mesh>
      </Float>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 6, 4]} color="#22d3ee" intensity={2} />
    </group>
  );
}