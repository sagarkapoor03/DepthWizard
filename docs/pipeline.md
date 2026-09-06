# Processing Pipeline

`backend/app/services/pipeline.py` orchestrates eight stages for every job.
Statuses are persisted so the frontend can render the live pipeline UI
(pending / processing / completed / error per stage).

| # | Stage | Module | What happens |
|---|-------|--------|--------------|
| 1 | **Image Upload** | `image_utils` | Extension + magic-byte validation, size limit, decode |
| 2 | **Metadata Detection** | `geospatial` | Rasterio inspection: CRS/transform/resolution/bounds or “not georeferenced” |
| 3 | **AI Depth Estimation** | `depth_estimation` | Depth Anything V2 inference (or labelled fallback); normalise to [0,1]; save `depth/depth_raw.npy` + colour PNG |
| 4 | **Scale Calibration** | `calibration` | Fit `elevation = scale · rel + offset` — mode `relative` (no-op), `dem` (reference raster) or `gcp` (point list); robust 2-pass regression |
| 5 | **DSM Generation** | `dsm` | `rel = 1 − depth`, smooth, invalid-value cleanup, statistics + histogram; GeoTIFF export when georeferenced |
| 6 | **Slope Analysis** | `slope` | Gradient → degrees; stats; flat/moderate/steep/very-steep breakdown; heatmap PNG |
| 7 | **3D Mesh Generation** | `terrain` | Downsample height grid (≤240 cells), encode JSON payload + texture reference |
| 8 | **Ready for Exploration** | — | Statistics finalised, `statistics.json` written, status `completed` |

## Data flow per job

```
data/jobs/<uuid>/
├── input/input.<ext>        original bytes
├── depth/depth_raw.npy      normalised relative depth
├── depth/depth_color.png    Turbo-style colour visual
├── dsm/dsm.npy              elevation/relative surface (float32)
├── dsm/dsm.tif               GeoTIFF (only if georeferenced)
├── dsm/dsm_color.png         colour DSM render
├── dsm/dsm_gray.png          greyscale DSM render
├── slope/slope.npy          degrees
├── slope/slope_heatmap.png  warm heatmap
├── mesh/mesh.json           {width,height,heights,units,calibrated,…}
├── metadata.json            upload + geo + model info
└── statistics.json          aggregated stats shown on the dashboard
```

## Failure handling

Any stage exception marks that stage `error` and the job `error` with a
**friendly message** (`_friendly_error` maps common exceptions: corrupt
raster, missing reference file, OOM, model load failure). Raw tracebacks are
logged server-side, never shown in the UI.

## Performance measures

- Long edge resized to `DW_MAX_IMAGE_SIDE` (default 1536) before inference
- Regression subsampled to ≤ 50 000 samples
- Mesh grid capped at 240×240 cells
- Depth pipeline loaded once per process (lazy singleton)
- Uploads capped at `DW_MAX_UPLOAD_MB` (default 30 MB)
