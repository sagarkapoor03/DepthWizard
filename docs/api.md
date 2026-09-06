# API Reference

Base URL: `http://localhost:8000` · Interactive docs: **`/docs`** (Swagger UI)
and `/redoc`. All responses are JSON unless a file is being served.
CORS origins are configurable via `DW_CORS_ORIGINS`.

## System

### `GET /api/health`
```json
{ "status": "ok", "service": "DEPTHWIZARD API", "version": "1.0.0",
  "depth_mode": "ai | fallback", "model": "depth-anything/…", "device": "cpu | cuda" }
```

## Jobs

### `POST /api/upload` (multipart: `file`)
Validates extension (JPG/JPEG/PNG/TIF/TIFF), magic bytes, size ≤
`DW_MAX_UPLOAD_MB`, decodability. Returns job metadata:

```json
{ "job_id": "<uuid>", "filename": "scene.tif", "size_bytes": 1048576,
  "extension": "tif", "input_type": "georeferenced | image",
  "georeferenced": true, "crs": "EPSG:4326", "resolution": [0.0001, 0.0001],
  "bounds": [72.0, 18.9984, 72.0016, 19.0], "width": 16, "height": 16,
  "mode": "ai | fallback", "message": "GeoTIFF detected with usable geospatial metadata." }
```
Errors: `400` with a friendly message for invalid/oversized/corrupt files.

### `POST /api/demo`
Creates a job from `demo/demo_rgb.jpg` (synthetic, labelled as such).
`404` if the demo image has not been generated.

### `POST /api/analyze`
```json
{ "job_id": "<uuid>", "mode": "relative | dem | gcp",
  "reference_path": null, "gcps": null, "smooth_sigma": 1.5 }
```
Launches the 8-stage pipeline in a background thread →
`{ "job_id": "…", "status": "processing" }`.

### `GET /api/statistics/{job_id}`
Poll endpoint. Returns job status (`queued|processing|completed|error`),
the eight stage statuses, depth mode, and (when done) DSM/slope statistics.
`404` for unknown jobs.

### `GET /api/result/{job_id}`
File URLs under `/api/results/jobs/<id>/…` (rgb, depth_color, dsm,
hillshade, slope_heatmap, mesh.json) plus full statistics.

## Pipeline step endpoints (fine-grained use)

| Endpoint | Body | Notes |
|---|---|---|
| `POST /api/depth` | `{job_id}` | Runs depth; saves `.npy` + colour PNG; returns stats + mode note |
| `POST /api/calibrate` | `{job_id, mode, reference_path?, gcps?}` | Returns scale/offset/R²/notes; `409` if depth not run yet |
| `POST /api/dsm` | `{job_id}` | Builds DSM (+GeoTIFF if georeferenced); returns stats |
| `POST /api/slope` | `{job_id}` | Returns slope stats incl. class breakdown |

## Validation

| Endpoint | Body | Notes |
|---|---|---|
| `POST /api/reference` | multipart `file` | Stores a reference DEM GeoTIFF server-side |
| `POST /api/validate` | `{job_id?, estimated?, reference}` | RMSE / MAE / Pearson r; without reference → `{available:false, message:"Reference data not available"}` |
| `POST /api/validate-demo` | `{job_id}` | Validates against a *synthetic* reference — message clearly contains “SYNTHETIC” |

## Error handling

Handlers return `400/404/409/500` with short human-readable `detail`
strings. Unexpected exceptions are logged server-side; the UI only ever
shows friendly messages (never Python tracebacks).
