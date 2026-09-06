"""DEPTHWIZARD REST API routes."""
from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from ..config import settings
from ..schemas.schemas import (
    CalibrationRequest,
    CalibrationResponse,
    DepthRequest,
    DepthResponse,
    DsmRequest,
    DsmResponse,
    HealthResponse,
    JobResult,
    ResultFile,
    SlopeRequest,
    SlopeResponse,
    StatisticsResponse,
    UploadResponse,
    ValidateRequest,
    ValidateResponse,
    ValidationMetrics,
)
from ..services import (
    calibration as calibration_service,
    depth_estimation as depth_service,
    geospatial as geospatial_service,
    job_store,
    reference as reference_service,
    slope as slope_service,
)
from ..services import pipeline as pipeline_service
from ..services.image_utils import (
    ImageValidationError,
    validate_extension,
    validate_image_bytes,
)
from ..services.validation import validate_against_reference

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    mode, model, device, _ = depth_service.get_depth_mode()
    demo_exists = bool(settings.demo_image_path and settings.demo_image_path.exists())
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
        depth_mode=mode,
        model_name=model,
        device=device or "cpu",
        demo_file=str(settings.demo_image_path) if demo_exists else None,
    )


@router.post("/upload", response_model=UploadResponse, tags=["jobs"])
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    data = await file.read()
    original = file.filename or "upload"
    try:
        validate_extension(original, max_mb=settings.max_upload_mb)
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    try:
        img = validate_image_bytes(data, max_mb=settings.max_upload_mb)
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    img.close()
    return _register_job(data, original)


@router.post("/demo", response_model=UploadResponse, tags=["jobs"])
async def demo_job() -> UploadResponse:
    """Create a job from the bundled synthetic demo image (no upload required)."""
    demo_path = settings.demo_image_path
    if not demo_path.exists() or not demo_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Demo image not found on server. Run "
                   "`python demo/generate_demo_image.py` and restart the backend.",
        )
    data = demo_path.read_bytes()
    try:
        img = validate_image_bytes(data, max_mb=settings.max_upload_mb)
    except ImageValidationError as exc:
        raise HTTPException(status_code=500, detail=f"Demo image invalid: {exc}")
    img.close()
    return _register_job(data, demo_path.name)


def _register_job(data: bytes, original: str) -> UploadResponse:
    ext = original.lower().rsplit(".", 1)[-1] if "." in original else "img"
    job_id = str(uuid.uuid4())
    job = job_store.create_job(job_id)
    input_path = job.input_dir / f"input.{ext}"
    input_path.write_bytes(data)

    geo = geospatial_service.inspect_image(input_path)
    depth_mode = depth_service.get_depth_mode()[0]
    meta = {
        "job_id": job_id,
        "filename": original,
        "size_bytes": len(data),
        "extension": ext,
        "geo": geospatial_service.json_safe(geo),
        "depth_mode": depth_mode,
    }
    job_store.write_json(job.metadata_path, meta)

    return UploadResponse(
        job_id=job_id,
        filename=original,
        size_bytes=len(data),
        extension=ext,
        input_type="georeferenced" if geo.georeferenced else "image",
        georeferenced=bool(geo.georeferenced),
        crs=geo.crs,
        resolution=geo.resolution,
        bounds=geo.bounds,
        width=geo.width,
        height=geo.height,
        mode=depth_mode,
        message=(
            "GeoTIFF detected with usable geospatial metadata."
            if geo.georeferenced
            else "Non-georeferenced image: results will be a RELATIVE DSM."
        ),
    )
class _AnalyzeBody(BaseModel):
    job_id: str
    mode: str = "relative"
    reference_path: str | None = None
    gcps: list[dict[str, Any]] | None = None
    smooth_sigma: float = 1.5


@router.post("/analyze", tags=["jobs"])
async def analyze(body: _AnalyzeBody) -> dict:
    """Launch the full pipeline in a background thread. Poll /statistics."""
    _ensure_job(body.job_id)
    if body.reference_path and not Path(body.reference_path).exists():
        raise HTTPException(
            status_code=400,
            detail=f"Reference file not found on server: {body.reference_path}",
        )

    def _run():
        try:
            pipeline_service.run_pipeline(
                body.job_id,
                mode=body.mode,
                reference_path=body.reference_path,
                gcps=body.gcps,
                smooth_sigma=max(0.0, float(body.smooth_sigma)),
            )
        except Exception as exc:  # noqa: BLE001 - surface friendly error in status
            job = job_store.load_job(body.job_id)
            job_store.update_status(job, error=_friendly_error(exc))

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": body.job_id, "status": "processing"}


@router.post("/depth", response_model=DepthResponse, tags=["steps"])
async def depth_step(body: DepthRequest) -> DepthResponse:
    job, rgb, geo = _load_job_with_rgb(body.job_id)
    result = depth_service.estimate_depth(rgb)
    stats = depth_service.save_depth_output(
        result.depth_normalized, job.depth_dir, mode=result.mode
    )
    return DepthResponse(
        job_id=body.job_id,
        mode=result.mode,
        model_name=result.model_name,
        duration_ms=round(result.duration_ms, 2),
        statistics=stats,
        note=("Relative depth - not metric elevation." if result.mode == "ai"
              else "DEMO/synthetic depth - not a real measurement."),
    )


@router.post("/calibrate", response_model=CalibrationResponse, tags=["steps"])
async def calibrate_step(body: CalibrationRequest) -> CalibrationResponse:
    job, rgb, geo = _load_job_with_rgb(body.job_id)
    depth_path = job.depth_dir / "depth_raw.npy"
    if not depth_path.exists():
        raise HTTPException(status_code=409, detail="Run /api/depth first.")
    depth = np.load(str(depth_path))
    res = calibration_service.calibrate(
        depth, mode=body.mode, reference_path=body.reference_path, gcps=body.gcps
    )
    return CalibrationResponse(
        job_id=body.job_id,
        mode=res.mode,
        scale=round(res.scale, 6),
        offset=round(res.offset, 6),
        n_samples=res.n_samples,
        r_squared=round(res.r_squared, 4) if res.r_squared is not None else None,
        notes=res.notes,
        calibrated=res.calibrated,
    )


@router.post("/dsm", response_model=DsmResponse, tags=["steps"])
async def dsm_step(body: DsmRequest) -> DsmResponse:
    job, rgb, geo = _load_job_with_rgb(body.job_id)
    depth_path = job.depth_dir / "depth_raw.npy"
    if not depth_path.exists():
        raise HTTPException(status_code=409, detail="Run /api/depth first.")
    depth = np.load(str(depth_path))
    cal = calibration_service.calibrate(depth, mode="relative")
    out = pipeline_service.generate_dsm(
        depth, cal, job.dsm_dir, georef=geospatial_service.json_safe(geo)
    )
    return DsmResponse(
        job_id=body.job_id,
        depth_mode="ai",
        calibrated=out.calibrated,
        calibration_mode=cal.mode,
        statistics=out.statistics,
        georeferenced=bool(geo.georeferenced),
        units=out.units,
    )


@router.post("/slope", response_model=SlopeResponse, tags=["steps"])
async def slope_step(body: SlopeRequest) -> SlopeResponse:
    job = _job_only(body.job_id)
    dsm_path = job.dsm_dir / "dsm.npy"
    if not dsm_path.exists():
        raise HTTPException(status_code=409, detail="Run /api/dsm first.")
    dsm = np.load(str(dsm_path))
    stats = slope_service.generate_slope(dsm, job.slope_dir, cell_scale=1.0)
    meta = job_store.get_metadata(body.job_id)
    georef = bool((meta or {}).get("geo", {}).get("georeferenced"))
    return SlopeResponse(job_id=body.job_id, statistics=stats, georeferenced=georef)
@router.get("/statistics/{job_id}", response_model=StatisticsResponse, tags=["jobs"])
def statistics(job_id: str) -> StatisticsResponse:
    _ensure_job(job_id)
    status = job_store.read_status(job_id)
    stats_raw = job_store.get_statistics(job_id)
    return StatisticsResponse(
        job_id=job_id,
        status=status.get("status", "queued"),
        current_stage=status.get("current_stage"),
        progress=float(status.get("progress", 0.0)),
        stages=status.get("stages", []),
        statistics=stats_raw or None,
        messages=status.get("messages", []),
        error=status.get("error"),
    )


@router.get("/result/{job_id}", response_model=JobResult, tags=["jobs"])
def result(job_id: str) -> JobResult:
    _ensure_job(job_id)
    status = job_store.read_status(job_id)
    if status.get("status") not in ("completed", "error"):
        raise HTTPException(status_code=202, detail="Job still processing")
    if status.get("error"):
        raise HTTPException(status_code=500, detail=status["error"])

    files: dict[str, ResultFile] = {}
    job = job_store.load_job(job_id)
    base = settings.results_mount
    _add_result(files, "input_rgb", job.root / "input_rgb.png", base, "image/png")
    _add_result(files, "depth_color", job.depth_dir / "depth_color.png", base, "image/png")
    _add_result(files, "depth_gray", job.depth_dir / "depth_gray.png", base, "image/png")
    _add_result(files, "dsm_color", job.dsm_dir / "dsm_color.png", base, "image/png")
    _add_result(files, "dsm_gray", job.dsm_dir / "dsm_gray.png", base, "image/png")
    _add_result(files, "dsm_tiff", job.dsm_dir / "dsm.tif", base, "image/tiff")
    _add_result(files, "slope_heatmap", job.slope_dir / "slope_heatmap.png", base, "image/png")
    _add_result(files, "mesh", job.mesh_dir / "mesh.json", base, "application/json")
    _add_result(files, "dsm", job.dsm_dir / "dsm.npy", base, "application/octet-stream")

    return JobResult(
        job_id=job_id,
        status=status.get("status", "completed"),
        files=files,
        statistics=job_store.get_statistics(job_id) or None,
        metadata=job_store.get_metadata(job_id) or None,
    )


@router.post("/validate", response_model=ValidateResponse, tags=["validation"])
async def validate(body: ValidateRequest) -> ValidateResponse:
    try:
        metrics, message = await run_in_threadpool(
            validate_against_reference,
            body.job_id,
            body.estimated,
            body.reference,
        )
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if metrics is None:
        return ValidateResponse(
            job_id=body.job_id,
            available=False,
            metrics=None,
            message=message or "Reference data not available",
        )
    return ValidateResponse(
        job_id=body.job_id,
        available=True,
        metrics=ValidationMetrics(**metrics),
        message=message or "Validation completed",
    )


class _JobBody(BaseModel):
    job_id: str


@router.post("/reference", tags=["validation"])
async def upload_reference(file: UploadFile = File(...)) -> dict:
    """Store a user-supplied reference DEM GeoTIFF on the server."""
    data = await file.read()
    if len(data) > 200 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Reference file is too large (max 200 MB).")
    try:
        path = await run_in_threadpool(
            reference_service.store_reference_upload,
            data,
            file.filename or "reference.tif",
        )
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"path": str(path)}


@router.post("/validate-demo", response_model=ValidateResponse, tags=["validation"])
async def validate_demo(body: _JobBody) -> ValidateResponse:
    """Validate a job against a synthetic demo reference (clearly labelled)."""
    _ensure_job(body.job_id)
    try:
        ref_path = await run_in_threadpool(
            reference_service.make_demo_reference_tiff, body.job_id
        )
        metrics, message = await run_in_threadpool(
            validate_against_reference,
            body.job_id,
            None,
            str(ref_path),
        )
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if metrics is None:
        return ValidateResponse(
            job_id=body.job_id,
            available=False,
            metrics=None,
            message=message or "Demo reference not available",
        )
    return ValidateResponse(
        job_id=body.job_id,
        available=True,
        metrics=ValidationMetrics(**metrics),
        message=(
            "SYNTHETIC demo check - the reference is derived from this job's own "
            "estimate with seeded noise. It verifies pipeline consistency only "
            "and is NOT real-world accuracy."
        ),
    )


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _ensure_job(job_id: str) -> None:
    if not (settings.jobs_dir / job_id).exists():
        raise HTTPException(status_code=404, detail=f"Job {job_id} was not found")


def _load_job_with_rgb(job_id: str) -> tuple[Any, Any, Any]:
    job = job_store.load_job(job_id)
    rgb_path = job.root / "input_rgb.png"
    if not rgb_path.exists():
        raise HTTPException(status_code=409, detail="Run /api/analyze first.")
    from PIL import Image

    rgb = np.asarray(Image.open(rgb_path).convert("RGB"), dtype=np.uint8)
    inputs = sorted(job.input_dir.iterdir())
    geo = geospatial_service.inspect_image(inputs[0]) if inputs else {}
    return job, rgb, geo


def _job_only(job_id: str):
    return job_store.load_job(job_id)


def _add_result(
    files: dict[str, ResultFile],
    key: str,
    path: Path,
    base: str,
    mime: str,
) -> None:
    """Register a result file URL served by the /api/results static mount.

    The static mount maps to ``settings.jobs_dir``, so the URL must preserve
    the job sub-directory structure (e.g. ``<job_id>/depth/depth_color.png``).
    """
    if not path.exists():
        return
    try:
        rel = path.resolve().relative_to(settings.jobs_dir.resolve()).as_posix()
    except ValueError:
        return
    files[key] = ResultFile(url=f"{base}/{rel}", mime=mime, kind=key)


def _friendly_error(exc: Exception) -> str:
    text = str(exc).strip()
    if not text:
        return f"Processing failed ({type(exc).__name__})"
    return text[:500]