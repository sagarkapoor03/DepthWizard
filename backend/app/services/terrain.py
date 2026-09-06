"""Terrain mesh export for the 3D viewer.

The elevation/DSM grid is down-sampled to a compact height map and exported
as JSON for the React Three Fiber frontend. The frontend builds a Three.js
``PlaneGeometry`` with displaced vertices and uses the original RGB image as
its texture.

Coordinate convention in the 3D scene (frontend):
    X = horizontal plane (0..W)
    Y = elevation (height / meters)
    Z = horizontal plane (0..H)

For calibrated jobs the height map carries the real elevation range so the
frontend can render realistic vertical units. For relative jobs the frontend
must clearly label the scene as RELATIVE HEIGHT.
"""
from __future__ import annotations

import base64
import json
import zlib
from pathlib import Path

import numpy as np


def downsample_heightmap(dsm: np.ndarray, max_cells: int = 240) -> np.ndarray:
    h, w = dsm.shape
    target = max(16, int(max_cells))
    cell = max(1, int(np.ceil(max(h, w) / target)))
    # block mean downsample
    if cell <= 1:
        return dsm
    new_h, new_w = int(np.ceil(h / cell)), int(np.ceil(w / cell))
    padded = np.zeros((new_h * cell, new_w * cell), dtype=np.float32)
    padded[:h, :w] = dsm
    reshaped = padded.reshape(new_h, cell, new_w, cell)
    out = reshaped.mean(axis=(1, 3)).astype(np.float32)
    return out


def generate_mesh(
    dsm: np.ndarray,
    out_dir: Path,
    *,
    georeferenced: bool,
    calibrated: bool,
    units: str,
    max_cells: int = 240,
    bounds: list[float] | None = None,
    crs: str | None = None,
) -> dict:
    """Export the height map + scene info used by the 3D explorer."""
    out_dir.mkdir(parents=True, exist_ok=True)
    hm = downsample_heightmap(dsm, max_cells)

    mn = float(np.min(hm))
    mx = float(np.max(hm))
    span = max(mx - mn, 1e-9)

    # encode float32 as a compact zlib+base64 payload to keep JSON light
    raw = np.ascontiguousarray(hm, dtype=np.float32).tobytes()
    payload = base64.b64encode(zlib.compress(raw, level=6)).decode("ascii")

    scene = {
        "width": int(hm.shape[1]),
        "height": int(hm.shape[0]),
        "min_elevation": round(mn, 4),
        "max_elevation": round(mx, 4),
        "span": round(span, 4),
        "units": units,                     # metric | relative
        "calibrated": calibrated,
        "georeferenced": georeferenced,
        "crs": crs,
        "bounds": bounds,
        "encoded": payload,
        "dtype": "float32",
        "compression": "zlib",
    }
    (out_dir / "mesh.json").write_text(json.dumps(scene), encoding="utf-8")
    return scene