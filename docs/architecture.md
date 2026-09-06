# System Architecture

## Big picture

DEPTHWIZARD is a two-tier web application with a strict separation between
**processing** (Python/FastAPI) and **experience** (Next.js/Three.js).

```
┌──────────────────────────────  Browser  ──────────────────────────────┐
│  Next.js 14 (App Router)                                             │
│  ├─ Pages: Home · Upload · Dashboard · 3D Explorer · Validate        │
│  │         Disaster Intelligence                                     │
│  ├─ Zustand stores (jobStore, explorerStore)                         │
│  ├─ lib/api.ts  ── typed fetch client (NEXT_PUBLIC_API_URL)          │
│  └─ React Three Fiber scene (terrain mesh, cameras, measurement)     │
└───────────────▲───────────────────────────────┬──────────────────────┘
        JSON/REST (CORS)          static artefacts (/api/results/...)
┌───────────────┴───────────────────────────────▼──────────────────────┐
│  FastAPI (backend/app/main.py · api/routes.py)                       │
│  ├─ schemas/  Pydantic request & response models                     │
│  ├─ models/   Job lifecycle + per-stage status                       │
│  └─ services/                                                    │
│      image_utils → geospatial → depth_estimation → calibration       │
│      → dsm → slope → terrain → validation  (orchestrated by          │
│        pipeline.py, run in a background thread per job)              │
│  job_store.py  — on-disk state: data/jobs/<uuid>/…                   │
└───────────────────────────────────────────────────────────────────────┘
```

## Key decisions

1. **File-based job store.** Every upload gets a UUID. All artefacts
   (`input/`, `depth/`, `dsm/`, `slope/`, `mesh/`, `metadata.json`,
   `statistics.json`) live under `backend/data/jobs/<job_id>/`. No database
   is needed for the prototype; the store is trivially replaceable.
2. **Background-thread pipeline.** `POST /api/analyze` returns immediately;
   the 8 stages run in a daemon thread and mutate per-stage statuses
   (`pending → processing → completed | error`) that the frontend polls via
   `GET /api/statistics/{job_id}`. This keeps the UI responsive and mirrors a
   production task-queue shape.
3. **Static artefact serving.** Uvicorn mounts the jobs directory at
   `/api/results` so the frontend can fetch PNGs/JSON directly by URL
   (fast, cacheable, no base64 over JSON).
4. **Graceful AI degradation.** The depth service is a lazy singleton. If the
   HF model cannot be downloaded/loaded, the API reports
   `depth_mode: "fallback"` and the pipeline continues with clearly-labelled
   synthetic depth — the product still demonstrates end-to-end.
5. **Honesty is architectural.** Calibration mode (`relative`/`dem`/`gcp`)
   flows through every layer: API responses carry `calibrated` and `units`
   flags, and the frontend renders *Relative Height – Not Metric* unless the
   backend asserts metric output.
6. **Stateless processing services.** Each service module is a pure-ish
   function of (arrays, paths, options) — easy to unit test (33 pytest tests)
   and easy to swap (e.g. a better depth model).
