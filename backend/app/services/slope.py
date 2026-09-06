"""Slope analysis on the DSM surface.

Slope is computed as the steepest gradient magnitude in degrees:

    gradient = sqrt(dz/dx^2 + dz/dy^2)
    slope    = atan(gradient)

The function returns summary statistics plus the slope map. A slope heatmap
is exported for visualisation. Classification thresholds are those commonly
used in landslide-screening literature (NH/ISRO style guidance):

    flat        < 5 deg
    moderate    5 - 15 deg
    steep       15 - 30 deg
    very steep  > 30 deg

These are decision-support classes, not engineering hazards maps.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def compute_slope(dsm: np.ndarray, cell_scale: float = 1.0) -> np.ndarray:
    """Slope map in degrees computed on a unit grid (or geo cell size)."""
    dy, dx = np.gradient(dsm)
    grad = np.sqrt(
        (dx / max(cell_scale, 1e-9)) ** 2 + (dy / max(cell_scale, 1e-9)) ** 2
    )
    slope = np.degrees(np.arctan(grad)).astype(np.float32)
    return np.where(np.isfinite(slope), slope, 0.0)


def classify_slope(slope: np.ndarray) -> dict[str, float]:
    flat = float(np.mean(slope < 5.0))
    moderate = float(np.mean((slope >= 5.0) & (slope < 15.0)))
    steep = float(np.mean((slope >= 15.0) & (slope < 30.0)))
    very_steep = float(np.mean(slope >= 30.0))
    return {
        "flat": round(flat, 4),
        "moderate": round(moderate, 4),
        "steep": round(steep, 4),
        "very_steep": round(very_steep, 4),
    }


def slope_stats(slope: np.ndarray) -> dict[str, float]:
    valid = slope[np.isfinite(slope)]
    if valid.size == 0:
        return {"min": 0.0, "max": 0.0, "mean": 0.0, "median": 0.0, "std": 0.0}
    return {
        "min": round(float(np.min(valid)), 4),
        "max": round(float(np.max(valid)), 4),
        "mean": round(float(np.mean(valid)), 4),
        "median": round(float(np.median(valid)), 4),
        "std": round(float(np.std(valid)), 4),
    }


def heatmap(slope: np.ndarray, out_path: Path) -> None:
    """Warm colour heatmap where dark red = steepest."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    s = np.clip(slope, 0.0, 90.0)
    v = s / 90.0
    r = (0.15 + 0.85 * v) * 255
    g = (0.35 * (1.0 - v) + 0.05 * v) * 255
    b = (0.9 * (1.0 - v)) * 255
    img = np.stack(
        [np.clip(r, 0, 255), np.clip(g, 0, 255), np.clip(b, 0, 255)], axis=-1
    ).astype(np.uint8)
    Image.fromarray(img).save(out_path)


def generate_slope(
    dsm: np.ndarray,
    out_dir: Path,
    cell_scale: float = 1.0,
) -> dict:
    """Full slope analysis: map + stats + classes, saved for a job."""
    out_dir.mkdir(parents=True, exist_ok=True)
    slope = compute_slope(dsm, cell_scale)
    np.save(out_dir / "slope.npy", slope)
    heatmap(slope, out_dir / "slope_heatmap.png")
    stats = slope_stats(slope)
    stats["classes"] = classify_slope(slope)
    return stats