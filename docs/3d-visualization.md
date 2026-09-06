# 3D Visualisation

Stack: **Three.js + React Three Fiber + @react-three/drei** inside the
Next.js app (`frontend/components/three/`).

## From DSM to mesh

1. Backend `terrain.py` downsamples the DSM to ≤ `DW_MESH_MAX_CELLS`
   (240×240) and emits `mesh/mesh.json`:
   `{width, height, heights[], min, max, units, calibrated, texture}`.
2. `TerrainMesh.tsx` builds a `PlaneGeometry(width, height, cols-1, rows-1)`
   and sets every vertex's **Y = elevation** (X/Z = horizontal positions),
   with elevation scaled by the user's **exaggeration slider** (1–5×).
3. The **original RGB image** is loaded as a texture and mapped over the
   terrain (toggleable). A wireframe overlay, ground grid, hemisphere +
   directional lighting complete the scene.

## Cameras

| Mode | Implementation | Controls |
|---|---|---|
| **Orbit** (default) | drei `OrbitControls` | rotate / zoom / pan |
| **Flythrough** | smooth Catmull-Rom path sampled over the terrain, camera looks ahead | Start / Pause / Reset |
| **First person** | WASD + mouse-look (pointer-locked), height follows terrain | Esc to exit |

## Measurement tool

Click-to-measure raycasts the terrain mesh; `MeasureRenderer` places a marker
and the panel reports:

- X / Y (grid coordinates)
- **Z / elevation**
- height label — **“Relative Height – Not Metric”** unless the job is
  calibrated, then **“Estimated Elevation: XX.XX m”**
- local **slope** at the probe (degrees, from the slope grid)

The two modes are never mixed in the same readout.

## Explorer controls (left panel)

Camera mode selector · Flythrough start/pause/reset · Elevation exaggeration
slider · Wireframe toggle · Texture toggle · Grid toggle · Measurement mode
toggle · Fullscreen. `explorerStore` (Zustand) holds the state; the R3F scene
subscribes to it, keeping React renders cheap.

## Performance

- Height grid capped at 240×240 (≈ 57 k vertices)
- Static geometry, no per-frame allocation in the render loop
- Texture via cached `useLoader`; artefacts fetched once from `/api/results`
