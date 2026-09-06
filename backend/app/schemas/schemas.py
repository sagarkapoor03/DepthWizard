"""Pydantic request/response schemas for the DEPTHWIZARD API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

ProcessingMode = Literal["relative", "dem", "gcp"]


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "DEPTHWIZARD API"
    version: str = "1.0.0"
    depth_mode: str = Field(..., description="'ai' when a real model is loaded, 'fallback' otherwise")
    model_name: Optional[str] = None
    device: str = Field(..., description="'cuda' or 'cpu'")
    demo_file: Optional[str] = None


# --------------------------------------------------------------------------- #
# Upload
# --------------------------------------------------------------------------- #
class UploadResponse(BaseModel):
    job_id: str
    filename: str
    size_bytes: int
    extension: str
    input_type: str                     # "georeferenced" | "image"
    georeferenced: bool
    crs: Optional[str] = None
    resolution: Optional[list[float]] = None
    bounds: Optional[list[float]] = None
    width: int
    height: int
    mode: str = Field(..., description="'ai' or 'fallback' depth mode used for this job")
    message: Optional[str] = None


# --------------------------------------------------------------------------- #
# Analysis lifecycle
# --------------------------------------------------------------------------- #
class AnalyzeRequest(BaseModel):
    job_id: str
    mode: ProcessingMode = "relative"
    reference_path: Optional[str] = None   # path on the server to a reference DEM / points file
    gcps: Optional[list[dict[str, Any]]] = None
    smooth_sigma: float = 1.5
    exaggeration: float = 1.0


class StageStatus(BaseModel):
    name: str
    status: Literal["pending", "processing", "completed", "error"] = "pending"
    detail: Optional[str] = None


class StatisticsResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "error"]
    current_stage: Optional[str] = None
    progress: float = Field(0.0, ge=0.0, le=1.0)
    stages: list[StageStatus] = []
    statistics: Optional[dict[str, Any]] = None
    messages: list[str] = []
    error: Optional[str] = None


# --------------------------------------------------------------------------- #
# Depth
# --------------------------------------------------------------------------- #
class DepthRequest(BaseModel):
    job_id: str


class DepthResponse(BaseModel):
    job_id: str
    mode: str
    model_name: Optional[str] = None
    duration_ms: float
    statistics: dict[str, Any]
    note: str


# --------------------------------------------------------------------------- #
# Calibration
# --------------------------------------------------------------------------- #
class CalibrationRequest(BaseModel):
    job_id: str
    mode: ProcessingMode = "relative"
    reference_path: Optional[str] = None
    gcps: Optional[list[dict[str, Any]]] = None


class CalibrationResponse(BaseModel):
    job_id: str
    mode: ProcessingMode
    scale: float
    offset: float
    n_samples: int = 0
    r_squared: Optional[float] = None
    notes: list[str] = []
    calibrated: bool = False


# --------------------------------------------------------------------------- #
# DSM / Slope
# --------------------------------------------------------------------------- #
class DsmRequest(BaseModel):
    job_id: str


class DsmResponse(BaseModel):
    job_id: str
    depth_mode: str
    calibrated: bool
    calibration_mode: str
    statistics: dict[str, Any]
    georeferenced: bool
    units: str = Field(..., description="'metric' or 'relative'")


class SlopeRequest(BaseModel):
    job_id: str


class SlopeResponse(BaseModel):
    job_id: str
    statistics: dict[str, Any]
    georeferenced: bool


# --------------------------------------------------------------------------- #
# Results
# --------------------------------------------------------------------------- #
class ResultFile(BaseModel):
    url: str
    mime: str
    kind: str


class JobResult(BaseModel):
    job_id: str
    status: str
    files: dict[str, ResultFile]
    statistics: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
class ValidateRequest(BaseModel):
    job_id: Optional[str] = None
    estimated: Optional[str] = None       # server-side path to estimated DSM GeoTIFF
    reference: str                        # server-side path to reference DEM GeoTIFF


class ValidationMetrics(BaseModel):
    n_samples: int
    rmse: float
    mae: float
    correlation: float
    bias: float


class ValidateResponse(BaseModel):
    job_id: Optional[str] = None
    available: bool
    metrics: Optional[ValidationMetrics] = None
    message: str