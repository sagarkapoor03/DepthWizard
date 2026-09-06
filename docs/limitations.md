# Limitations & Honest Framing

DEPTHWIZARD is a **hackathon prototype for decision support**, not a certified
photogrammetric product. Every claim below is binding on the demo narrative.

## Fundamental

1. **A single RGB image does not contain metric elevation.** Monocular depth
   estimation produces *relative* depth. Any metric output in DEPTHWIZARD
   comes only from an explicit calibration against reference data (DEM/GCPs).
   Without it the UI says **“Relative Height – Not Metric”** — always.
2. **Scale ambiguity.** Infinitely many (scale, offset) pairs explain the
   same relative surface; calibration resolves them only as well as the
   reference data allows.
3. **Not survey-grade.** We do not claim, and must not be quoted as claiming,
   “100 % accurate”, “centimetre accurate” or “survey-grade” results.

## Model & pipeline

4. Accuracy varies across **urban areas, forests, hills, sparse regions**,
   different **image resolutions** and **sensors**; clouds/haze and shadows
   degrade depth quality further.
5. Occluded steep faces are inferred, not observed — single-view geometry
   cannot see behind ridges or buildings.
6. The prototype calibration is a **robust linear fit**; scene-dependent
   non-linearities (e.g. vegetation compression of depth) remain.
7. Reference data (SRTM/Copernicus ≈ 10–90 m) is coarser than typical
   imagery; the calibration captures the dominant trend only, and assumes
   co-registration.

## Disaster modules

8. Flood/landslide screens are **statistical screenings** of the reconstructed
   surface (low percentiles, steep classes) — **not** hydraulic or slope-
   stability models. They must not be used as the sole basis for emergency
   decisions.

## Demo mode

9. When the AI model is unavailable, a **synthetic depth map** is used so the
   product remains demonstrable. It is labelled `fallback`/synthetic in the
   API, dashboard and exports. **Never present demo results as real-world
   validated measurements.**
10. The bundled demo image and demo validation reference are generated
    programmatically (`demo/generate_demo_image.py`).

## Engineering scope

11. Extremely large rasters are downsampled (long edge 1536, mesh 240×240)
    — this is a demo performance envelope, not a production big-data
    pipeline (no tiling/Dask/COG streaming yet).
12. No authentication, rate limiting, or multi-tenancy in the prototype.
