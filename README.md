# DEPTHWIZARD

## Single-View Height Estimation & Interactive 3D Terrain Reconstruction

> **Smart India Hackathon 2026 — Problem Statement #26175 (ISRO)**
> Theme: *Disaster Management*
> Official reference repository: <https://github.com/IMG-PROCESS-SAC/SIH2026/>

DEPTHWIZARD converts a **single optical RGB remote-sensing image** into a
navigable, textured 3D world with elevation/slope analytics and disaster
decision-support layers in one continuous pipeline.

It is an **AI-powered single-view image to 3D terrain and elevation analysis platform for disaster management**, preserving the original GitHub project intent while providing complete implementation details.

```
Single RGB Image  ?  AI Monocular Depth  ?  Relative Depth Map
       ?  Scale Calibration (optional reference data)
       ?  Elevation / DSM  ?  3D Terrain Mesh  ?  Textured 3D Environment
       ?  Interactive Flythrough  ?  Height & Slope Analysis
```

---

## Problem & Solution

Reliable elevation information (DSM/DEM) is critical for flood screening,
landslide risk assessment, emergency-route planning and rapid situational
awareness. DEPTHWIZARD addresses this by deriving useful relative/estimated
height from a single image and exposing outputs through a practical web
workflow.

Core workflow:
1. Upload JPG/PNG/TIFF/GeoTIFF (or use demo data).
2. Auto-detect georeferencing metadata.
3. Run **Depth Anything V2** for dense relative depth.
4. Optionally calibrate using DEM/GCP references.
5. Generate DSM/rDSM, slope outputs, and interactive 3D terrain.
6. Validate and export outputs.

---

## Key Features

- Depth Anything V2 based monocular depth estimation
- Image upload and preprocessing pipeline
- Relative depth to DSM/rDSM generation
- Optional calibration to estimated metric elevation
- Slope analysis and statistics
- Validation workflow against reference data
- 3D terrain viewer with flythrough
- Two-point measurement support
- Flood-stage slider and dynamic flood analysis
- Emergency route prototype layer

---

## Repository Structure

- `frontend/` — Next.js + React + R3F UI/client
- `backend/app/` — FastAPI services and pipeline
- `backend/requirements.txt` — backend dependencies
- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` — deployment
- `docs/` — architecture, API, calibration, limitations, visualization notes

---

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Production build check
```bash
cd frontend
npm run build
```

---

## API (high level)

- `POST /api/upload`
- `POST /api/analyze`
- `POST /api/calibrate`
- `POST /api/slope`
- `GET /api/statistics/{job_id}`
- `GET /api/result/{job_id}`
- `POST /api/reference`
- `POST /api/validate`

For complete schemas and payloads, see `docs/api.md`.

---

## Notes on Accuracy

- Monocular depth is inherently **relative** without reference calibration.
- Calibrated output quality depends on reference data quality and terrain context.
- Outputs are intended for **decision support / prototype demonstration**.

See `docs/limitations.md` for details.

---

## Acknowledgements

- ISRO/SAC SIH 2026 Problem Statement #26175
- Depth Anything V2
- Hugging Face Transformers
- Rasterio
- React Three Fiber
