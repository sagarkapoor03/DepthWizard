"""Scale calibration service.

Conceptually maps:

    Relative Depth  +  Reference Elevation  ->  Metric Elevation

Supported modes
---------------
1. ``relative``  - no reference data. Output is a RELATIVE surface only.
2. ``dem``       - a reference DEM/DSM GeoTIFF on the server calibrates the
   depth map with robust linear regression.
3. ``gcp``       - a list of ground control points ``(x, y, elevation)`` in
   image pixel coordinates calibrates the depth map.

Method
------
For prototype purposes we fit ``elevation = scale * relative_elevation + offset``
with a robust two-pass regression (outliers beyond 3 sigma are removed).
This is deliberately simple, transparent and well documented. It is NOT
survey-grade; see ``docs/calibration.md`` and ``docs/limitations.md``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from .geospatial import read_reference_raster


@dataclass
class CalibrationResult:
    mode: str                      # relative | dem | gcp
    scale: float
    offset: float
    n_samples: int = 0
    r_squared: float | None = None
    calibrated: bool = False
    notes: list[str] = field(default_factory=list)


# relative_elevation = 1 - depth_normalised   (larger depth == closer == higher)
def relative_elevation(depth_normalized: np.ndarray) -> np.ndarray:
    return (1.0 - np.clip(depth_normalized, 0.0, 1.0)).astype(np.float32)


def _robust_fit(x: np.ndarray, y: np.ndarray, max_iter: int = 3) -> tuple[float, float, float, int]:
    mask = np.isfinite(x) & np.isfinite(y)
    xm, ym = x[mask], y[mask]
    if xm.size < 3:
        return 1.0, 0.0, 0.0, int(xm.size)

    for _ in range(max_iter):
        coeffs = np.polyfit(xm, ym, 1)
        pred = np.polyval(coeffs, xm)
        resid = ym - pred
        sigma = np.std(resid)
        if sigma < 1e-9 or xm.size < 6:
            break
        keep = np.abs(resid) <= 3.0 * sigma
        xm, ym = xm[keep], ym[keep]

    coeffs = np.polyfit(xm, ym, 1)
    scale, offset = float(coeffs[0]), float(coeffs[1])
    pred = np.polyval(coeffs, xm)
    ss_res = float(np.sum((ym - pred) ** 2))
    ss_tot = float(np.sum((ym - np.mean(ym)) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else None
    return scale, offset, r2, int(xm.size)


def calibrate(
    depth_normalized: np.ndarray,
    mode: str = "relative",
    reference_path: str | None = None,
    gcps: list[dict] | None = None,
) -> CalibrationResult:
    """Fit a linear depth->elevation model for the requested mode."""
    rel = relative_elevation(depth_normalized)
    h, w = rel.shape

    if mode == "dem" and reference_path:
        try:
            ref = read_reference_raster(reference_path)
            elev = ref["elevation"]
            if elev.shape != rel.shape:
                from PIL import Image

                elev_img = Image.fromarray(elev.astype(np.float32)).resize(
                    (w, h), Image.BILINEAR
                )
                elev = np.asarray(elev_img, dtype=np.float64)
            valid = np.isfinite(elev) & (elev > -9000)
            x, y = rel[valid], elev[valid]
            # subsample to keep the regression fast on big rasters
            if x.size > 50_000:
                rng = np.random.default_rng(0)
                idx = rng.choice(x.size, 50_000, replace=False)
                x, y = x[idx], y[idx]
            scale, offset, r2, n = _robust_fit(x, y)
            return CalibrationResult(
                mode="dem",
                scale=scale,
                offset=offset,
                n_samples=n,
                r_squared=r2,
                calibrated=True,
                notes=[
                    "Linear regression against reference DEM elevation samples.",
                    "Assumes reference DEM covers the input footprint.",
                ],
            )
        except Exception as exc:  # noqa: BLE001
            return CalibrationResult(
                mode="dem",
                scale=1.0,
                offset=0.0,
                calibrated=False,
                notes=[f"DEM calibration failed ({type(exc).__name__}); "
                       "using RELATIVE surface."],
            )

    if mode == "gcp" and gcps:
        def _first(*vals: Any) -> float | None:
            """Return the first value convertible to float (None-safe, zero-safe)."""
            for v in vals:
                if v is None:
                    continue
                try:
                    return float(v)
                except (TypeError, ValueError):
                    continue
            return None

        xs, ys, ze = [], [], []
        for g in gcps:
            x = _first(g.get("x"), g.get("px"), g.get("col"), g.get("u"))
            y = _first(g.get("y"), g.get("py"), g.get("row"), g.get("v"))
            z = _first(g.get("elevation"), g.get("elev"), g.get("z"))
            if x is None or y is None or z is None:
                continue
            xs.append(x)
            ys.append(y)
            ze.append(z)
        if len(xs) < 3:
            return CalibrationResult(
                mode="gcp",
                scale=1.0,
                offset=0.0,
                n_samples=len(xs),
                calibrated=False,
                notes=["Fewer than 3 valid GCPs; using RELATIVE surface."],
            )
        xi = np.clip(np.asarray(xs), 0, w - 1).astype(int)
        yi = np.clip(np.asarray(ys), 0, h - 1).astype(int)
        xv = rel[yi, xi]
        zv = np.asarray(ze, dtype=np.float64)
        scale, offset, r2, n = _robust_fit(xv, zv)
        return CalibrationResult(
            mode="gcp",
            scale=scale,
            offset=offset,
            n_samples=n,
            r_squared=r2,
            calibrated=True,
            notes=["Linear regression against user-provided GCPs."],
        )

    return CalibrationResult(
        mode="relative",
        scale=1.0,
        offset=0.0,
        calibrated=False,
        notes=[
            "No reference data: output is a RELATIVE surface, not metric elevation."
        ],
    )