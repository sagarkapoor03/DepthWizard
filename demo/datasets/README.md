# datasets/ — sample imagery & reference DEMs

Publicly available remote-sensing data and DEM/reference rasters can be used
during development and calibration. Drop sample files here (they are
git-ignored by default).

## Suggested sources

| Source | Type | Access |
|---|---|---|
| **BHUVAN — NRSC/ISRO** (CartoDEM, Land Use, ortho imagery) | DEM / optical | https://bhuvan.nrsc.gov.in |
| **Sentinel-2** (ESA Copernicus) | 10 m optical L1C/L2A | Copernicus Data Space |
| **Landsat 8/9** (USGS/NASA) | 30 m optical | EarthExplorer / Planetary Computer |
| **SRTM** 30 m | DEM | https://dwtkns.com/srtm30m / USGS EarthData |
| **Copernicus DEM GLO-30** | DEM | OpenTopography / Copernicus |

## Tips for the demo

- Prefer **small, georeferenced GeoTIFF tiles** (≤ 2000 px) so processing is
  instant on a laptop.
- For DEM-assisted calibration, keep the DEM **co-registered** with the image
  (same CRS/extent) — see `docs/calibration.md`.
- Keep water/cloud-heavy scenes out of the hackathon demo set.

Example filenames the team can standardise on:

```
datasets/
  hyderabad_urban_sentinel2.tif      # optical, georeferenced
  chennai_coast_srtm30.tif           # reference DEM
  uttarakhand_hill_landsat8.jpg      # non-georeferenced demo input
```
