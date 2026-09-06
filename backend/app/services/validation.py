"""Estimated-vs-reference validation.

Compares the estimated DSM with a reference DEM/DSM and computes standard
accuracy descriptors:

    RMSE         root mean squared error
    MAE          mean absolute error
    Correlation  Pearson correlation
    Bias         mean(estimated - reference)

Only pixels that are valid in BOTH rasters are used. If reference data is not
provided (or is unusable), the function returns ``available=False`` and NO
metrics are fabricated.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

from .image_utils import ImageValidationError


def _load_elev(path: str) -> dict:
    try:
        import rasterio  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            "Validation requires rasterio, which is not installed in this environment."
        ) from exc
    try:
        with rasterio.open(path) as src:
            arr = src.read(1, out_dtype="float64")
            return {
                "elevation": np.where(np.isfinite(arr), arr, np.nan),
                "transform": list(src.transform),
                "crs": src.crs.to_string() if src.crs else None,
            }
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            f"Cannot read raster for validation: {type(exc).__name__}."
        ) from exc


def _align_arrays(est: np.ndarray, ref: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if est.shape == ref.shape:
        return est, ref
    img = Image.fromarray(est.astype(np.float32))
    img = img.resize((ref.shape[1], ref.shape[0]), Image.BILINEAR)
    return np.asarray(img, dtype=np.float64), ref


def validate_against_reference(
    job_id: Optional[str],
    estimated: Optional[str],
    reference: str,
) -> tuple[Optional[dict], str]:
    if not reference or not Path(reference).exists():
        return None, "Reference data not available"

    reference_data = _load_elev(reference)
    ref_el = reference_data["elevation"]
    ref_known = np.isfinite(ref_el) & (ref_el > -9000)

    message_parts: list[str] = []
    est_el: np.ndarray
    est_path = estimated
    if not est_path and job_id:
        est_path = _job_dsm_path(job_id)

    if est_path and Path(est_path).exists():
        try:
            est_data = _load_elev(est_path)
            est_el = est_data["elevation"]
            est_crs = est_data.get("crs")
            ref_crs = reference_data.get("crs")
            if est_crs and ref_crs and est_crs != ref_crs:
                message_parts.append(
                    "CRS of estimate differs from reference; using raw grid alignment "
                    "(approximate)."
                )
        except ImageValidationError:
            est_el = _job_array_fallback(job_id, ref_el.shape)
    elif job_id:
        est_el = _job_array_fallback(job_id, ref_el.shape)
    else:
        return None, "Neither an estimated DSM nor a job ID was provided."

    est_el, ref_el = _align_arrays(est_el, ref_el)
    valid = np.isfinite(est_el) & ref_known

    if int(valid.sum()) < 100:
        return None, "Reference data has too few overlapping valid pixels."

    e = est_el[valid]
    r = ref_el[valid]
    if e.size > 200_000:
        rng = np.random.default_rng(42)
        idx = rng.choice(e.size, 200_000, replace=False)
        e, r = e[idx], r[idx]

    corr = float(np.corrcoef(e, r)[0, 1]) if np.std(e) > 0 and np.std(r) > 0 else 0.0

    # Monocular depth has arbitrary scale/offset: comparing raw relative values
    # against metric reference elevations is meaningless. Following standard
    # monocular-depth evaluation practice (least-squares / median scaling, cf.
    # MiDaS protocol), the estimate is affinely aligned to the reference
    # BEFORE computing error metrics. Correlation is affine-invariant.
    scale, offset = 1.0, 0.0
    if np.std(e) > 0:
        scale, offset = np.polyfit(e, r, 1)
        e = e * scale + offset

    rmse = float(np.sqrt(np.mean((e - r) ** 2)))
    mae = float(np.mean(np.abs(e - r)))
    bias = float(np.mean(e - r))

    metrics = {
        "n_samples": int(e.size),
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "correlation": round(corr, 4),
        "bias": round(bias, 4),
    }
    if message_parts:
        message = " ".join(message_parts)
    else:
        message = (
            "Validated on overlapping pixels. Estimate affinely aligned to "
            f"reference (scale={scale:.4f}, offset={offset:.4f}) before RMSE/MAE; "
            "correlation is scale-invariant. Not survey-grade."
        )
    return metrics, message


def _job_dsm_path(job_id: str) -> str:
    from ..config import settings

    tif = settings.jobs_dir / job_id / "dsm" / "dsm.tif"
    if tif.exists():
        return str(tif)
    return str(settings.jobs_dir / job_id / "dsm" / "dsm.npy")


def _job_array_fallback(job_id: str, target_shape: tuple[int, int]) -> np.ndarray:
    from ..config import settings

    npy = settings.jobs_dir / job_id / "dsm" / "dsm.npy"
    if npy.exists():
        arr = np.load(str(npy))
        img = Image.fromarray(arr.astype(np.float32))
        img = img.resize((target_shape[1], target_shape[0]), Image.BILINEAR)
        return np.asarray(img, dtype=np.float64)
    return np.full(target_shape, np.nan, dtype=np.float64)