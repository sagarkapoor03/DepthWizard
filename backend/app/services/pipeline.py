"""Full pipeline orchestration for a DEPTHWIZARD job.

Each stage updates the on-disk status file so the frontend can render the
8-stage processing pipeline with live progress.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import numpy as np

from ..config import settings
from . import calibration as calibration_service
from . import depth_estimation as depth_service
from . import job_store
from .dsm import generate_dsm, histogram_stats
from .geospatial import inspect_image, json_safe, read_as_rgb
from .slope import generate_slope
from .terrain import generate_mesh

# stage order used by job_store.STAGE_NAMES
ST_IMAGE_UPLOAD = 0
ST_METADATA = 1
ST_DEPTH = 2
ST_CALIBRATION = 3
ST_DSM = 4
ST_SLOPE = 5
ST_MESH = 6
ST_READY = 7


def run_pipeline(
    job_id: str,
    mode: str = "relative",
    reference_path: Optional[str] = None,
    gcps: Optional[list[dict]] = None,
    smooth_sigma: float = 1.5,
    report: bool = True,
) -> dict:
    """Run the complete depth -> calibration -> DSM -> slope -> mesh chain."""
    t_start = time.perf_counter()
    job = job_store.load_job(job_id)
    job_store.init_status(job)

    def set_stage(idx: int, st: str, progress: float, msg: str | None = None):
        job_store.update_status(
            job,
            stage_index=idx,
            stage_status=st,
            progress=progress,
            message=msg,
            status="processing",
        )

    # --- 0: Image Upload (already done) ------------------------------------
    set_stage(ST_IMAGE_UPLOAD, "completed", 0.05, "Input image stored")

    # --- 1: Metadata Detection ---------------------------------------------
    set_stage(ST_METADATA, "processing", 0.1, "Inspect geospatial metadata")
    inputs = sorted(job.input_dir.iterdir())
    if not inputs:
        raise FileNotFoundError("No input file stored for this job")
    input_path = inputs[0]
    geo = inspect_image(input_path)
    meta = {"job_id": job_id, "filename": input_path.name, "geo": json_safe(geo)}

    try:
        rgb, pil_img = read_as_rgb(input_path, limit=settings.max_image_side)
    except Exception as exc:  # noqa: BLE001
        set_stage(ST_METADATA, "error", 0.1, str(exc))
        raise RuntimeError(f"Input image could not be decoded: {exc}")

    input_rgb_path = job.root / "input_rgb.png"
    pil_img.convert("RGB").save(input_rgb_path)
    meta["rgb_preview"] = "input_rgb.png"
    set_stage(ST_METADATA, "completed", 0.2, "Georeferencing detected: "
               + ("yes" if geo.georeferenced else "no"))
# --- 2: AI Depth Estimation --------------------------------------------
    set_stage(ST_DEPTH, "processing", 0.25, "Running monocular depth model")
    depth_result = depth_service.estimate_depth(rgb)
    depth_stats = depth_service.save_depth_output(
        depth_result.depth_normalized, job.depth_dir, mode=depth_result.mode
    )
    duration_s = round(time.perf_counter() - t_start, 2)
    set_stage(ST_DEPTH, "completed", 0.45,
              f"Depth mode: {depth_result.mode} ({duration_s}s)")

    # --- 3: Scale Calibration ----------------------------------------------
    set_stage(ST_CALIBRATION, "processing", 0.5, "Calibration: " + mode)
    cal = calibration_service.calibrate(
        depth_result.depth_normalized,
        mode=mode,
        reference_path=reference_path,
        gcps=gcps,
    )
    set_stage(ST_CALIBRATION, "completed", 0.6, f"Calibration: {cal.mode}")

    # --- 4: DSM Generation --------------------------------------------------
    set_stage(ST_DSM, "processing", 0.65, "Building DSM surface")
    dsm_out = generate_dsm(
        depth_result.depth_normalized,
        cal,
        job.dsm_dir,
        smooth_sigma=smooth_sigma,
        georef=meta["geo"],
    )
    dsm_hist = histogram_stats(dsm_out.array)
    set_stage(ST_DSM, "completed", 0.78, f"DSM units: {dsm_out.units}")

    # --- 5: Slope analysis ---------------------------------------------------
    set_stage(ST_SLOPE, "processing", 0.82, "Computing slope from DSM")
    res = meta["geo"].get("resolution")
    cell_scale = float(res[0]) if res and res[0] else 1.0
    slope_stats = generate_slope(dsm_out.array, job.slope_dir, cell_scale=cell_scale)
    set_stage(ST_SLOPE, "completed", 0.9, "Slope heatmap saved")
# --- 6: Mesh generation ---------------------------------------------------
    set_stage(ST_MESH, "processing", 0.93, "Exporting 3D height grid")
    mesh_scene = generate_mesh(
        dsm_out.array,
        job.mesh_dir,
        georeferenced=bool(geo.georeferenced),
        calibrated=bool(dsm_out.calibrated),
        units=dsm_out.units,
        max_cells=settings.mesh_max_cells,
        bounds=geo.bounds,
        crs=geo.crs,
    )
    set_stage(ST_MESH, "completed", 0.98, "Mesh ready")

    statistics = {
        "job_id": job_id,
        "status": "completed",
        "depth": depth_stats,
        "depth_mode": depth_result.mode,
        "model_name": depth_result.model_name,
        "calibration": {
            "mode": cal.mode,
            "scale": round(cal.scale, 6),
            "offset": round(cal.offset, 6),
            "n_samples": cal.n_samples,
            "r_squared": round(cal.r_squared, 4) if cal.r_squared is not None else None,
            "calibrated": cal.calibrated,
            "notes": cal.notes,
        },
        "dsm": {
            **dsm_out.statistics,
            "units": dsm_out.units,
            "calibrated": dsm_out.calibrated,
            "histogram": dsm_hist,
        },
        "slope": slope_stats,
        "mesh": {
            k: mesh_scene[k]
            for k in ("width", "height", "min_elevation", "max_elevation",
                      "span", "units", "calibrated", "georeferenced")
        },
        "input": {
            "filename": input_path.name,
            "width": int(pil_img.width),
            "height": int(pil_img.height),
            "georeferenced": bool(geo.georeferenced),
            "crs": geo.crs,
            "input_type": "georeferenced" if geo.georeferenced else "image",
        },
        "processing_time_s": duration_s,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    job_store.write_json(job.statistics_path, statistics)
    job_store.write_json(job.metadata_path, meta)
    set_stage(ST_READY, "completed", 1.0, "Ready for exploration")

    if report:
        job_store.update_status(job, status="completed", progress=1.0)
    return statistics