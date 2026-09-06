"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Sky, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { api, fetchHeightMap, ApiError, API_BASE } from "@/lib/api";
import type { JobResult, MeshScene } from "@/lib/types";
import { useExplorerStore } from "@/store/explorerStore";
import { TerrainMesh, OrbitRig, type TerrainSampler } from "./TerrainMesh";
import { FirstPersonControls } from "./FirstPerson";
import { FlythroughController } from "./Flythrough";
import { SceneMarkers } from "./MeasureRenderer";
import { LoadingTerrain } from "./LoadingState";
import { ElevationLabel } from "./ElevationLabel";

/** Moves the camera back to the default overview when resetToken changes. */
function CameraResetRig() {
  const resetToken = useExplorerStore((s) => s.resetToken);
  const { camera } = useThree();
  useEffect(() => {
    if (resetToken > 0) {
      camera.position.set(0, 40, 55);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
    }
  }, [resetToken, camera]);
  return null;
}

export function TerrainViewer({ jobId }: { jobId: string }) {
  const [result, setResult] = useState<JobResult | null>(null);
  const [mesh, setMesh] = useState<{
    scene: MeshScene;
    heights: Float32Array;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const samplerRef = useRef<TerrainSampler | null>(null);

  const cameraMode = useExplorerStore((s) => s.cameraMode);
  const flythrough = useExplorerStore((s) => s.flythrough);

  const firstPerson = cameraMode === "firstperson" && flythrough === "idle";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setMesh(null);
      try {
        const res = await api.result(jobId);
        if (cancelled) return;
        setResult(res);

        const meshFile = res.files["mesh"];
        if (!meshFile) {
          setError("Terrain mesh was not generated for this job.");
          return;
        }
        // Prepend API_BASE to relative URLs
        const meshUrl = meshFile.url.startsWith("http") ? meshFile.url : `${API_BASE}${meshFile.url}`;
        const loaded = await fetchHeightMap(meshUrl);
        if (cancelled) return;
        // fetchHeightMap statically parses the payload; we need the full scene
        // object, so load it again for the numeric metadata.
        const resp = await fetch(meshUrl, { cache: "no-store" });
        const scene = (await resp.json()) as MeshScene;
        if (cancelled) return;
        setMesh({ scene, heights: loaded.heights });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "The backend may still be processing this job."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [0, 40, 55], fov: 50, near: 0.1, far: 5000 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true }}
      >
        <Sky distance={450000} sunPosition={[5, 10, -8]} turbidity={6} rayleigh={0.6} />
        <ambientLight intensity={0.5} />
        <hemisphereLight intensity={0.35} groundColor="#0b1220" />
        <directionalLight
          position={[40, 60, 25]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {mesh && result ? (
          <>
            <TerrainMesh
              scene={mesh.scene}
              heights={mesh.heights}
              textureUrl={result.files["input_rgb"]?.url ? (result.files["input_rgb"].url.startsWith("http") ? result.files["input_rgb"].url : `${API_BASE}${result.files["input_rgb"].url}`) : undefined}
              samplerRef={samplerRef}
              gridVisible
            />
            <SceneMarkers cols={mesh.scene.width} rows={mesh.scene.height} />
            <ElevationLabel />
            <FlythroughController
              samplerRef={samplerRef}
              cols={mesh.scene.width}
              rows={mesh.scene.height}
            />
            {firstPerson && <FirstPersonControls samplerRef={samplerRef} />}
          </>
        ) : (
          <LoadingTerrain />
        )}

        <CameraResetRig />
        {mesh && <OrbitRig />}
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={["#38bdf8", "#a5b4fc", "#2dd4bf"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="glass-strong rounded-xl p-6 max-w-sm text-center">
            <p className="text-amber-300 text-sm mb-3">{error}</p>
            <p className="text-muted-foreground text-xs">
              Make sure the job is finished processing and the backend is reachable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}