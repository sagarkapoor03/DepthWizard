"""Job abstractions for the DEPTHWIZARD processing pipeline."""
from __future__ import annotations

from pathlib import Path


class Job:
    """A single processing job, materialised on disk under data/jobs/<job_id>/."""

    def __init__(self, job_id: str, root: Path):
        self.id = job_id
        self.root = root
        self.input_dir = root / "input"
        self.depth_dir = root / "depth"
        self.dsm_dir = root / "dsm"
        self.slope_dir = root / "slope"
        self.mesh_dir = root / "mesh"

        for d in (self.input_dir, self.depth_dir, self.dsm_dir, self.slope_dir, self.mesh_dir):
            d.mkdir(parents=True, exist_ok=True)

    @property
    def metadata_path(self) -> Path:
        return self.root / "metadata.json"

    @property
    def statistics_path(self) -> Path:
        return self.root / "statistics.json"

    @property
    def status_path(self) -> Path:
        return self.root / "status.json"