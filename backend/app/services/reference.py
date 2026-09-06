"""
Synthetic demo-reference generation and reference uploads for validation.

The demo reference is generated from the job's own RGB input luminance and is
explicitly labelled SYNTHETIC. It exists so the validation UI can be exercised
end-to-end without external DEM data. Real validation is always performed
against user-provided reference GeoTIFFs.
"""
from __future__ import annotations

import uuid
from pathlib import Path

import numpy as np
from PIL import Image

from ..config import settings
from .image_utils import ImageValidationError


def make_demo_reference_tiff(job_id: str) -> Path:
    """Create a synthetic reference DEM GeoTIFF for a job (demo only).

    The reference is derived from the job's *own* estimated surface with a
    fixed seed and added synthetic noise, then labelled SYNTHETIC. It exercises
    the RMSE/MAE/correlation plumbing end-to-end. It is NOT an independent
    measurement and must never be presented as real-world accuracy.
    """
    try:
        import rasterio  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            "Demo reference requires rasterio, which is not installed."
        ) from exc

    job_dir = settings.jobs_dir / job_id

    base: np.ndarray | None = None
    dsm_path = job_dir / "dsm" / "dsm.npy"
    depth_path = job_dir / "depth" / "depth_raw.npy"
    if dsm_path.exists():
        base = np.load(str(dsm_path)).astype(np.float32)
    elif depth_path.exists():
        base = (1.0 - np.load(str(depth_path))).astype(np.float32)

    if base is None:
        # Last resort: luminance-derived smooth field (no depth was produced).
        rgb_path = job_dir / "input_rgb.png"
        if not rgb_path.exists():
            raise ImageValidationError("Job has no processed RGB preview yet.")
        arr = np.asarray(Image.open(rgb_path).convert("L"), dtype=np.float32)
        from scipy.ndimage import gaussian_filter  # type: ignore

        base = gaussian_filter(arr, sigma=3.0)

    from scipy.ndimage import gaussian_filter  # type: ignore

    lo, hi = float(np.min(base)), float(np.max(base))
    span = hi - lo
    if span <= 0:
        base = np.zeros_like(base, dtype=np.float32)
        span = 1.0
    # Keep the reference in the SAME unit system as the job's own surface
    # (relative or metric) and add seeded noise of ~4 % of the surface range
    # so the validation metrics are meaningful-looking but clearly not real.
    rng = np.random.default_rng(12345)
    noise = rng.standard_normal(base.shape).astype(np.float32)
    noise = gaussian_filter(noise, sigma=2.0)
    noise = noise / (float(np.std(noise)) + 1e-6)
    elev = base.astype(np.float32) + noise * (0.04 * span)

    h, w = elev.shape
    out = settings.jobs_dir / job_id / "reference_demo.tif"
    # Unit grid transform (no CRS) — clearly demo only.
    transform = (1.0, 0.0, 0.0, 0.0, -1.0, float(h))
    with rasterio.open(
        out,
        "w",
        driver="GTiff",
        height=h,
        width=w,
        count=1,
        dtype="float32",
        crs=None,
        transform=transform,
        nodata=-9999.0,
        compress="lzw",
    ) as dst:
        dst.write(elev.astype("float32"), 1)
    return out


def store_reference_upload(data: bytes, filename: str) -> Path:
    """Persist a user-supplied reference raster and return its server path."""
    ext = Path(filename).suffix.lower()
    if ext not in {".tif", ".tiff"}:
        raise ImageValidationError("Reference data must be a GeoTIFF (.tif/.tiff).")
    ref_dir = settings.data_dir / "reference"
    ref_dir.mkdir(parents=True, exist_ok=True)
    out = ref_dir / f"ref_{uuid.uuid4().hex}{ext}"
    out.write_bytes(data)

    # sanity check: rasterio can open it
    try:
        import rasterio  # type: ignore

        with rasterio.open(out) as src:
            band = src.read(1, out_dtype="float64")
            if band.shape[0] < 16 or band.shape[1] < 16:
                raise ImageValidationError(
                    "Reference raster is too small to be useful."
                )
    except ImageValidationError:
        out.unlink(missing_ok=True)
        raise
    except Exception as exc:  # noqa: BLE001
        out.unlink(missing_ok=True)
        raise ImageValidationError(
            f"Reference file could not be read as a GeoTIFF: {type(exc).__name__}"
        ) from exc
    return out