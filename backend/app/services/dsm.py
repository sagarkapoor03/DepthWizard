"""DSM (Digital Surface Model) generation.

Converts the normalised depth map into an elevation-like surface:

* non-georeferenced inputs -> a clearly-labelled RELATIVE DSM (rDSM), values in
  [0, 1] arbitrary units.
* calibrated inputs         -> metric elevation (``scale * rel + offset``).

The module applies light smoothing, removes invalid values and computes
descriptive statistics. It exports GeoTIFF files when spatial metadata exists.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from .calibration import CalibrationResult, relative_elevation
from .geospatial import write_geotiff


def surface_stats(array: np.ndarray) -> dict[str, float]:
    valid = array[np.isfinite(array)]
    if valid.size == 0:
        return {"min": 0.0, "max": 0.0, "mean": 0.0, "median": 0.0, "std": 0.0}
    return {
        "min": round(float(np.min(valid)), 4),
        "max": round(float(np.max(valid)), 4),
        "mean": round(float(np.mean(valid)), 4),
        "median": round(float(np.median(valid)), 4),
        "std": round(float(np.std(valid)), 4),
    }


def histogram_stats(array: np.ndarray, bins: int = 12) -> dict:
    """Real 12-bin histogram of the DSM (used for elevation distribution)."""
    valid = array[np.isfinite(array)]
    if valid.size == 0:
        return {"edges": [0.0, 1.0], "counts": [0] * bins}
    counts, edges = np.histogram(valid, bins=bins)
    return {
        "edges": [round(float(e), 3) for e in edges],
        "counts": [int(c) for c in counts],
        "bins": bins,
    }


def build_dsm(
    depth_normalized: np.ndarray,
    calibration: CalibrationResult,
    smooth_sigma: float = 1.5,
) -> np.ndarray:
    """Return a smooth DSM array from a normalised depth map."""
    rel = relative_elevation(depth_normalized)

    if calibration.calibrated:
        dsm = calibration.scale * rel + calibration.offset
    else:
        dsm = rel.astype(np.float32)

    if smooth_sigma is not None and smooth_sigma > 0:
        try:
            from scipy.ndimage import gaussian_filter  # type: ignore

            dsm = gaussian_filter(dsm, sigma=float(smooth_sigma)).astype(np.float32)
        except Exception:  # pragma: no cover
            pass

    dsm = np.where(np.isfinite(dsm), dsm, 0.0).astype(np.float32)
    return dsm


def remove_invalid(dsm: np.ndarray, nodata: float = -9999.0) -> np.ndarray:
    return np.where(np.isfinite(dsm), dsm, nodata).astype(np.float32)


@dataclass
class DsmOutput:
    array: np.ndarray
    statistics: dict[str, float]
    calibrated: bool
    mode: str
    units: str                       # "metric" | "relative"


def generate_dsm(
    depth_normalized: np.ndarray,
    calibration: CalibrationResult,
    out_dir: Path,
    smooth_sigma: float = 1.5,
    georef: dict | None = None,
) -> DsmOutput:
    """Build, save and summarise the DSM for a job."""
    out_dir.mkdir(parents=True, exist_ok=True)
    dsm = build_dsm(depth_normalized, calibration, smooth_sigma)
    stats = surface_stats(dsm)

    # visualisation (relative colours: blue = low -> green -> orange = high)
    norm = surface_stats(dsm)
    span = max(float(norm["max"]) - float(norm["min"]), 1e-6)
    vis = ((dsm - float(norm["min"])) / span * 255).astype(np.uint8)
    Image.fromarray(vis, mode="L").save(out_dir / "dsm_gray.png")
    Image.fromarray(_terrain_colormap(vis)).save(out_dir / "dsm_color.png")

    np.save(out_dir / "dsm.npy", dsm)

    calibrated = calibration.calibrated
    units = "metric" if calibrated else "relative"

    if georef and georef.get("georeferenced"):
        transform = georef.get("transform")
        crs = georef.get("crs")
        if transform:
            try:
                write_geotiff(out_dir / "dsm.tif", dsm, transform=transform, crs=crs)
            except Exception:  # pragma: no cover - rasterio may be missing
                pass

    return DsmOutput(
        array=dsm,
        statistics=stats,
        calibrated=calibrated,
        mode=calibration.mode,
        units=units,
    )


def _terrain_colormap(gray: np.ndarray) -> np.ndarray:
    """Small terrain-style colour ramp (blue->teal->green->yellow->orange)."""
    h, w = gray.shape
    r = np.zeros_like(gray, dtype=np.uint8)
    g = np.zeros_like(gray, dtype=np.uint8)
    b = np.zeros_like(gray, dtype=np.uint8)

    x = gray.astype(np.float32) / 255.0
    r = _segment(x, 0.2, 0.5, 1.0)
    g = _segment(x, 0.0, 0.3, 0.9)
    b = _segment(x, 1.0, 0.6, 0.0)
    r = np.clip(r * 255, 0, 255).astype(np.uint8)
    g = np.clip(g * 255, 0, 255).astype(np.uint8)
    b = np.clip(b * 255, 0, 255).astype(np.uint8)
    return np.stack([r, g, b], axis=-1)


def _segment(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
    out = np.zeros_like(x, dtype=np.float32)
    out = np.where(x <= a, 0.0, out)
    ramp1 = (x - a) / (b - a + 1e-6)
    out = np.where((x > a) & (x <= b), ramp1, out)
    out = np.where((x > b) & (x <= c), 1.0 - (x - b) / (c - b + 1e-6), out)
    out = np.where(x > c, 0.0, out)
    return out