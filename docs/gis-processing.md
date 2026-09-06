# GIS Processing

Module: `backend/app/services/geospatial.py` (built on **Rasterio**)

## Input detection

| Input | Behaviour |
|---|---|
| `.tif` / `.tiff` | Opened with Rasterio (GTiff driver). CRS, affine transform, width/height, resolution (transform.a/e) and bounds are read. A CRS **and** a non-identity transform ⇒ **georeferenced**. |
| Plain TIFF (no tags) | Reports `georeferenced: false` — Rasterio's identity-matrix fallback is *not* treated as georeferencing. |
| `.jpg` / `.jpeg` / `.png` | Rasterio fallback + PIL; always `georeferenced: false`. |
| Corrupted TIFF | Friendly error surfaced by the pipeline (never a stack trace in the UI). |

`inspect_image(path)` returns a dataclass with
`width, height, format, georeferenced, crs, transform, resolution, bounds,
notes` — serialised into `metadata.json` and the upload response.

## Preserving geospatial metadata

When the input is a GeoTIFF, the DSM export (`dsm/dsm.tif`) re-uses the
**input CRS and transform** with `rasterio.open(..., driver="GTiff")`, so the
product can be dropped straight into QGIS/ArcGIS next to the source scene.
When the job is calibrated (DEM/GCP), the DSM values are metric; otherwise
the GeoTIFF stores the relative surface and the response still reports
`units: "relative"`.

## What we never do

- **Invent a CRS** or geographic coordinates for JPG/PNG inputs.
- Reproject on the fly (out of prototype scope; the reference DEM is assumed
  co-registered — documented in `calibration.md`).
- Treat Rasterio's identity-matrix fallback as real georeferencing.

## Slope on a georeferenced grid

`slope.compute_slope(dsm, cell_scale)` divides gradients by the cell size
(derived from the GeoTIFF resolution when available) so degrees are computed
against real ground distances; unit-grid inputs use `cell_scale=1`.
