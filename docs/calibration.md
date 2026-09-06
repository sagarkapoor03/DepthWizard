# Scale Calibration

## The core idea

```
Relative Depth (AI)  +  Reference Elevation (DEM / GCPs)  →  Metric Elevation
```

A single RGB image cannot yield metric height on its own. DEPTHWIZARD therefore
treats calibration as a first-class, explicit, *extensible* pipeline step.

## Modes

### 1. `relative` (default, always available)
No reference data. Output is a **RELATIVE DSM**: `rel = 1 − normalised_depth`,
units `relative`. UI label: **“Relative Height – Not Metric”**.
Nothing is invented — no CRS, no metres, no fake accuracy.

### 2. `dem` (reference DEM GeoTIFF)
A user-supplied reference DEM (e.g. SRTM 30 m, Copernicus GLO-30, BHUVAN
CartoDEM) is compared against the relative surface:

1. Reference raster is resampled to the image grid (bilinear) if shapes differ.
2. Valid samples (`isfinite`, not nodata ≤ −9000) are paired: `(rel, elevation)`.
3. Subsampled to ≤ 50 000 pairs for speed.
4. **Robust linear regression**: `elevation ≈ scale · rel + offset`, with a
   2-pass 3σ outlier rejection (max 3 iterations).
5. Reports `scale`, `offset`, `r²`, `n_samples` for transparency.

### 3. `gcp` (ground control points)
A list of `{x, y, elevation}` points in **image pixel coordinates** (x=col,
y=row). The relative value at each point is sampled and the same robust
linear fit is applied. Requires ≥ 3 valid points; zero-valued coordinates are
handled correctly (explicit `None` checks, no falsy-zero traps).

## Assumptions & limitations (documented, not hidden)

- **Linearity.** A single linear map is a first-order approximation of the
  true depth→height relation; scene-dependent non-linearities remain.
- **Nadir assumption.** `elevation ∝ 1 − depth` holds for near-nadir optical
  imagery; oblique scenes introduce perspective bias.
- **Registration.** DEM/GCPs are assumed co-registered with the image; a
  misaligned reference *will* degrade the fit (visible via low R²).
- **Resolution.** Reference DEMs (10–90 m) are usually coarser than the
  image; the fit captures the dominant trend, not micro-relief.
- **Not survey-grade.** We do not claim centimetre or survey accuracy. The
  Validation page exists precisely to quantify agreement (RMSE/MAE/Pearson r)
  against withheld reference data.

## How to extend

`calibrate()` is a strategy dispatcher. Add a mode by adding a branch (e.g.
piecewise-linear binning, quantile matching, or a small learned regressor)
— the dataclass `CalibrationResult` already carries everything the UI needs
(`mode`, `scale`, `offset`, `r_squared`, `n_samples`, `notes`, `calibrated`).
