# DEPTHWIZARD

## Single-View Height Estimation & Interactive 3D Terrain Reconstruction

> **Smart India Hackathon 2026 — Problem Statement #26175 (ISRO)**
> Theme: *Disaster Management*
> Official reference repository: <https://github.com/IMG-PROCESS-SAC/SIH2026/>

DEPTHWIZARD converts a **single optical RGB remote-sensing image** into a
navigable, textured 3D world with elevation/slope analytics and disaster
decision-support layers — in one continuous pipeline:

```
Single RGB Image  →  AI Monocular Depth  →  Relative Depth Map
       →  Scale Calibration (optional reference data)
       →  Elevation / DSM  →  3D Terrain Mesh  →  Textured 3D Environment
       →  Interactive Flythrough  →  Height & Slope Analysis
```

---

## 1. Problem Statement

Reliable elevation information (DSM/DEM) is critical for disaster management:
flood inundation screening, landslide susceptibility, emergency-route planning
and rapid situation awareness. Traditional elevation products (stereo
photogrammetry, LiDAR, InSAR) are expensive, temporally sparse, or unavailable
immediately after a disaster. A **single-view optical image**, however, is
often the *first* data available.

The challenge: derive useful height information from **one** image, honestly,
and put it in front of responders as an explorable 3D scene.

## 2. Our Solution

DEPTHWIZARD is an end-to-end web platform:

1. **Upload** any JPG/PNG/TIFF/GeoTIFF (or click **Load Demo** for a bundled
   synthetic sample).
2. The system **auto-detects georeferencing** (CRS, transform, resolution,
   bounds) using Rasterio.
3. A **pretrained Depth Anything V2** model (Hugging Face `transformers`)
   produces a dense relative depth map — no training involved.
4. An **extensible calibration layer** optionally converts relative depth into
   metric elevation using reference DEM data or GCPs. Without reference data
   the output is *clearly labelled* **RELATIVE DSM** — never passed off as
   metric height.
5. The DSM drives **slope analysis** (degrees + landslide-style class
   breakdown), **flood-screening** (low-lying areas) and an interactive
   **Three.js / React Three Fiber** terrain with flythrough, first-person and
   orbit navigation, and click-to-measure elevation/slope probes.
6. Results can be **validated** against user-supplied reference data
   (RMSE / MAE / correlation) and **exported** (GeoTIFF DSM, PNG maps,
   mesh payload).

### Scientific honesty (by design)

| Concept | Meaning in DEPTHWIZARD |
|---|---|
| **Relative Depth** | AI model output — ordering of scene depth only |
| **Relative DSM / rDSM** | `1 − normalised depth`; units are *relative*, not metres |
| **Elevation** | Calibrated surface (needs DEM/GCP reference) |
| **DEM** | Bare-earth reference raster (input, e.g. SRTM/Copernicus) |
| **DSM** | Surface model including objects/canopy (output) |

The UI never mixes the two modes: uncalibrated results display
**“Relative Height – Not Metric”**, calibrated results display
**“Estimated Elevation: XX.XX m”** with the calibration source. We make **no
survey-grade, centimetre-level or “100 % accurate” claims** — see
[`docs/limitations.md`](docs/limitations.md).

## 3. Key Features

- 🖼️ **Single-view depth estimation** with pretrained Depth Anything V2 (small)
- 🛰️ **GeoTIFF intelligence** — CRS/transform/resolution/bounds detection,
  metric DSM + GeoTIFF export when georeferenced
- ⚖️ **Three calibration modes** — relative-only, DEM-assisted, GCP-assisted
  (robust linear regression, documented assumptions)
- 🗻 **3D terrain engine** — height-map mesh, RGB texture mapping, elevation
  exaggeration, wireframe toggle, grid, lighting
- 🚁 **Flythrough + first-person + orbit** camera modes with pause/reset,
  fullscreen, zoom/pan/rotate
- 📏 **Click-to-measure** — X/Y/Z, relative height or estimated elevation,
  local slope at the probe
- 🌊 **Disaster Intelligence** — flood low-land screening, steep-slope
  landslide screening, terrain-barrier view, rapid 3D situational awareness
- ✅ **Validation page** — RMSE/MAE/correlation vs. uploaded reference DEM
  (or honest “Reference data not available”)
- 🧪 **Job architecture** — UUID jobs, background pipeline thread, per-stage
  statuses, artefacts on disk
- 🧭 **Demo mode** — synthetic sample demonstrates the entire flow with
  clearly-labelled synthetic outputs

## 4. Architecture

```
depthwizard/
├── frontend/                 Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── app/                  pages: / /upload /dashboard /explore /validate /disaster
│   ├── components/           ui/ (shadcn), three/ (R3F), home/, dashboard/…
│   ├── lib/                  api.ts (typed client), types.ts, demo.ts
│   ├── store/                zustand stores (job, explorer)
│   └── hooks/                useJobPolling (stage/status polling)
│
├── backend/                  Python 3.12 + FastAPI + Uvicorn
│   ├── app/
│   │   ├── main.py           app factory, CORS, static result mounts
│   │   ├── api/routes.py     all REST endpoints
│   │   ├── schemas/          Pydantic request/response models
│   │   ├── models/           job model (lifecycle + stage statuses)
│   │   ├── config.py         DW_* environment settings
│   │   └── services/         depth_estimation · geospatial · calibration
│   │                         dsm · slope · terrain · pipeline · job_store
│   │                         validation · reference · image_utils
│   ├── data/jobs/<uuid>/     input/ depth/ dsm/ slope/ mesh/ metadata.json
│   └── tests/                pytest suite (33 tests)
├── docs/                     architecture/pipeline/ai-model/calibration/…
├── demo/                     synthetic demo image generator + sample
├── datasets/                 where to drop public RS/DEM samples
├── models/                   local HF weight cache (optional)
├── docker-compose.yml        one-command full stack
└── README.md
```

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Three.js + React Three Fiber + drei, Zustand, Framer Motion, Recharts |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic v2, PyTest |
| AI | PyTorch, Hugging Face Transformers (**Depth Anything V2** — pretrained, never trained from scratch) |
| Geo / Science | Rasterio, NumPy, SciPy, OpenCV, Pillow, scikit-image |
| Infra | Docker + docker-compose, Uvicorn static artefact serving |

## 6. The AI Model

- Model: **`depth-anything/Depth-Anything-V2-Small-hf`** (configurable via
  `DW_DEPTH_MODEL_NAME`)
- Loaded lazily through the HF `transformers` `depth-estimation` pipeline
- Input resized to 518 px; output min-max normalised to [0, 1]
- Relative elevation for nadir imagery: `1 − depth` (closer ⇒ higher)
- **Fallback mode:** if weights/torch/network are unavailable, a *clearly
  labelled synthetic* depth map keeps the whole product demonstrable. The API
  reports `depth_mode: "fallback"` and the UI shows a “Demo/synthetic depth”
  badge. Details: [`docs/ai-model.md`](docs/ai-model.md).

## 7. GIS Processing & DSM Generation

`backend/app/services/geospatial.py` uses **Rasterio** to detect TIFF/GeoTIFF
inputs and extract CRS, affine transform, resolution, bounds and dimensions.
JPG/PNG inputs are handled as non-georeferenced (no invented coordinates).

`dsm.py` converts normalised depth into a surface
(`relative_elevation = 1 − depth`), applies Gaussian smoothing, removes
invalid values and computes min / max / mean / median / std plus a histogram.

- **Georeferenced input** → DSM exported as a **GeoTIFF** preserving CRS and
  transform (metric when calibrated with DEM/GCP reference).
- **Non-georeferenced input** → relative DSM (PNG visual + NumPy array),
  explicitly marked non-georeferenced.

Details: [`docs/gis-processing.md`](docs/gis-processing.md),
[`docs/calibration.md`](docs/calibration.md).

## 8. 3D Visualisation & Flythrough

`terrain.py` downsamples the DSM (≤ `DW_MESH_MAX_CELLS`, default 240 × 240)
and streams a JSON height-map payload to the frontend. React Three Fiber
builds a `PlaneGeometry` displaced by the height grid, textured with the
original RGB image, with OrbitControls, a smooth spline flythrough path,
WASD/pointer first-person mode, wireframe/texture toggles and an elevation
exaggeration slider. Click-to-measure reports X/Y/Z, height label
(relative vs. metric) and local slope. Details:
[`docs/3d-visualization.md`](docs/3d-visualization.md).

## 9. Disaster Management Applications

| Module | What it does | Honest framing |
|---|---|---|
| **Flood Analysis** | Percentile-based low-elevation region screening | Decision-support *screening*, not inundation prediction |
| **Landslide Analysis** | Steep-slope class highlights (>15°, >30°) | Susceptibility *screening*, not hazard zonation |
| **Emergency Route Understanding** | Terrain-barrier visualisation, elevation profiles | Planning *aid*, not navigation authority |
| **Rapid 3D Situation Awareness** | Flythrough of the reconstructed scene | Communication tool for briefings |

## 10. Datasets

Publicly available remote-sensing datasets and DEM/reference data can be used
during development, e.g. **BHUVAN (ISRO NRSC)**, **Sentinel-2**, **Landsat 8/9**,
**SRTM 30 m**, **Copernicus DEM GLO-30**. Place sample files in `datasets/`
(see [`datasets/README.md`](datasets/README.md)). Demo imagery is generated
synthetically in `demo/`.

## 11. Installation & Running

### Prerequisites
- Python 3.12 (GPU optional — CPU inference works, slower)
- Node.js 18+ (20+ recommended)
- Git

### Backend

```bash
cd depthwizard/backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate   |   Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

# optional: pre-download the model weights (happens automatically otherwise)
python -c "from transformers import pipeline; pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf')"

# run the API (http://localhost:8000  ·  Swagger at /docs)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd depthwizard/frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                       # http://localhost:3000
```

### Docker (full stack)

```bash
docker compose up --build
# frontend → http://localhost:3000 · backend → http://localhost:8000/docs
```

### Demo mode
Click **Load Demo** on the upload page, or:

```bash
python demo/generate_demo_image.py          # writes demo/demo_rgb.jpg
curl -X POST http://localhost:8000/api/demo # creates a demo job
```

## 12. Environment Variables

Create a root `.env` (backend reads `DW_*`; frontend reads `NEXT_PUBLIC_*`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend → backend base URL |
| `DW_CORS_ORIGINS` | `http://localhost:3000,…` | Comma-separated allowed origins |
| `DW_MAX_UPLOAD_MB` | `30` | Upload size limit |
| `DW_MAX_IMAGE_SIDE` | `1536` | Long-edge processing limit |
| `DW_MESH_MAX_CELLS` | `240` | 3D height-grid resolution |
| `DW_DEPTH_MODEL_NAME` | `depth-anything/Depth-Anything-V2-Small-hf` | HF model id |
| `DW_FORCE_FALLBACK` | `false` | Force labelled synthetic depth mode |

See [`.env.example`](.env.example) and
[`frontend/.env.example`](frontend/.env.example).

## 13. API Documentation

Interactive Swagger UI: **<http://localhost:8000/docs>** · ReDoc: `/redoc`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service status, depth mode (`ai`/`fallback`), device |
| POST | `/api/upload` | Upload JPG/JPEG/PNG/TIF/TIFF → job UUID + metadata |
| POST | `/api/demo` | Create a job from the bundled synthetic demo image |
| POST | `/api/analyze` | Launch the full 8-stage pipeline (background) |
| POST | `/api/depth` | Run depth estimation for a job |
| POST | `/api/calibrate` | Fit scale/offset (modes: relative, dem, gcp) |
| POST | `/api/dsm` | Build DSM + statistics |
| POST | `/api/slope` | Slope map + statistics + class breakdown |
| GET | `/api/statistics/{job_id}` | Poll job status, stages and statistics |
| GET | `/api/result/{job_id}` | File URLs (RGB, depth, DSM, slope, mesh) + stats |
| POST | `/api/reference` | Upload a reference DEM GeoTIFF |
| POST | `/api/validate` | RMSE/MAE/correlation vs. reference (or honest “not available”) |
| POST | `/api/validate-demo` | Synthetic-reference validation (clearly labelled) |

Full request/response schemas: [`docs/api.md`](docs/api.md).

## 14. Testing

```bash
# backend — 33 tests: validation, metadata, depth, DSM, slope, calibration, API
cd depthwizard/backend
pytest tests -v

# frontend — production build (type + lint checks)
cd ../frontend
npm run build
```

Covered: extension/magic-byte/corruption/size validation, GeoTIFF metadata
detection, fallback depth determinism, DSM math, slope statistics, GCP/DEM
calibration recovery, terrain mesh export, and end-to-end API flows
(upload → analyze → poll → result → validate).

## 15. Limitations (read before judging accuracy)

- A single RGB image **does not contain metric elevation**. Monocular depth is
  **relative**; metric output *requires* reference data (DEM/GCPs).
- Accuracy varies with terrain type (urban vs. forest vs. hills), sensor,
  resolution and scene content; view-occluded slopes are extrapolated.
- The prototype calibration is a **robust linear fit** — sufficient for
  demonstration, **not** survey-grade. No “100 % accurate / centimetre
  accurate” claims are made anywhere in this project.
- Fallback/demo depth is synthetic and labelled as such.
  Full list: [`docs/limitations.md`](docs/limitations.md).

## 16. Future Scope

Stereo/multi-view fusion, ISRO BHUVAN/Cartosat data integration, on-GPU
batch service with model quantisation, interferometric (InSAR) coherence
layers, automatic GCP extraction from ortho-imagery, export to CesiumJS
globe tiles, REST rate-limiting + auth for multi-tenant deployment.

## 17. Team Contributions

| Member | Role | Contribution |
|---|---|---|
| Member 1 | Team Leader / AI-ML | Depth service, calibration design, pipeline orchestration |
| Member 2 | GIS / Remote Sensing | Rasterio metadata, GeoTIFF export, DSM/slope services |
| Member 3 | Frontend Lead | Dashboard, upload UX, pipeline progress UI, Zustand state |
| Member 4 | 3D / Graphics | R3F terrain engine, flythrough/first-person, measurement tools |
| Member 5 | Backend / DevOps | FastAPI routes, job store, tests, Docker, docs |
| Member 6 | Research / QA | Datasets, validation methodology, demo scripting, docs review |

*(adjust names/roles to your final team roster)*

## 18. Acknowledgements & References

- Problem statement: **ISRO / SAC — SIH 2026 #26175**
  · Reference repo: <https://github.com/IMG-PROCESS-SAC/SIH2026/>
- Depth Anything V2 — <https://github.com/DepthAnything/Depth-Anything-V2>
- Hugging Face Transformers — <https://huggingface.co/docs/transformers>
- Rasterio — <https://rasterio.readthedocs.io/>
- React Three Fiber — <https://docs.pmnd.rs/>
- Public data: BHUVAN (NRSC/ISRO), Sentinel-2 (ESA/Copernicus), SRTM /
  Copernicus DEM (NASA/ESA).

> ⚠️ DEPTHWIZARD outputs are **decision-support products for demonstration**.
> They are not certified survey measurements and must not be used as the sole
> basis for emergency decisions.





