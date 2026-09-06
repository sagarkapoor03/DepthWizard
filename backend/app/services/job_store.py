"""On-disk job store.

Layout::

    data/jobs/<job_id>/
        input/       original input files
        depth/       depth maps (png + npy)
        dsm/         DSM (png + npy + tif when georeferenced)
        slope/       slope map (npy + heatmap png)
        mesh/        mesh.json (height map for the 3D viewer)
        input_rgb.png   down-scaled RGB preview used as 3D texture
        metadata.json   input + geospatial metadata
        statistics.json processing statistics
        status.json      live pipeline status (stages / progress / error)
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from ..models.job import Job
from ..config import settings

STAGE_NAMES = [
    "Image Upload",
    "Metadata Detection",
    "AI Depth Estimation",
    "Scale Calibration",
    "DSM Generation",
    "Slope Analysis",
    "3D Mesh Generation",
    "Ready for Exploration",
]


def create_job(job_id: str) -> Job:
    return Job(job_id, settings.jobs_dir / job_id)


def clean_job(job_id: str) -> None:
    shutil.rmtree(settings.jobs_dir / job_id, ignore_errors=True)


def load_job(job_id: str) -> Job:
    path = settings.jobs_dir / job_id
    if not path.exists():
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return Job(job_id, path)


def init_status(job: Job) -> None:
    stages = [{"name": n, "status": "pending"} for n in STAGE_NAMES]
    write_json(
        job.status_path,
        {
            "job_id": job.id,
            "status": "queued",
            "current_stage": None,
            "progress": 0.0,
            "stages": stages,
            "messages": [],
            "error": None,
        },
    )


def update_status(
    job: Job,
    *,
    status: str | None = None,
    stage_index: int | None = None,
    stage_status: str | None = None,
    progress: float | None = None,
    message: str | None = None,
    error: str | None = None,
) -> dict:
    data = read_json(job.status_path) or {
        "job_id": job.id,
        "status": "queued",
        "stages": [{"name": n, "status": "pending"} for n in STAGE_NAMES],
        "messages": [],
        "error": None,
    }
    if status is not None:
        data["status"] = status
    if stage_index is not None and 0 <= stage_index < len(data["stages"]):
        data["stages"][stage_index]["status"] = stage_status or "processing"
        data["current_stage"] = data["stages"][stage_index]["name"]
    if progress is not None:
        data["progress"] = min(1.0, max(0.0, float(progress)))
    if message:
        data["messages"].append(message)
    if error is not None:
        data["error"] = error
        data["status"] = "error"
    write_json(job.status_path, data)
    return data


def read_status(job_id: str) -> dict:
    p = settings.jobs_dir / job_id / "status.json"
    return read_json(p) or {
        "job_id": job_id,
        "status": "queued",
        "stages": [],
        "messages": [],
        "error": None,
    }


def get_statistics(job_id: str) -> dict:
    return read_json(settings.jobs_dir / job_id / "statistics.json") or {}


def get_metadata(job_id: str) -> dict:
    return read_json(settings.jobs_dir / job_id / "metadata.json") or {}


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def list_input_files(job: Job) -> list[Path]:
    return sorted(job.input_dir.iterdir())