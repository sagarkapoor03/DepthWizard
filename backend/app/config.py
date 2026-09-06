"""DEPTHWIZARD - application configuration.

Central settings for the backend. Environment variables (optional) can override
the defaults, e.g. in a root-level `.env` file:

  DW_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
  DW_MAX_UPLOAD_MB=30
  DW_FORCE_FALLBACK=true
"""
from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _cors_from_env() -> list[str]:
    raw = os.environ.get("DW_CORS_ORIGINS", "")
    if raw.strip():
        return [o.strip() for o in raw.split(",") if o.strip()]
    return list(DEFAULT_CORS_ORIGINS)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_prefix="DW_",
        extra="ignore",
    )

    app_name: str = "DEPTHWIZARD API"
    version: str = "1.0.0"

    data_dir: Path = BACKEND_DIR / "data"
    jobs_dir: Path = BACKEND_DIR / "data" / "jobs"
    results_mount: str = "/api/results"

    cors_origins: list[str] = []

    max_upload_mb: int = 30
    max_image_side: int = 1536          # long edge limit for processing
    mesh_max_cells: int = 240           # XY resolution of the 3D height grid
    slope_window: int = 3               # kernel (must be odd, >= 1)

    depth_model_name: str = "depth-anything/Depth-Anything-V2-Small-hf"
    depth_input_size: int = 518
    force_fallback: bool = False        # force DEMO (synthetic) depth mode

    demo_image_path: Path = PROJECT_ROOT / "demo" / "demo_rgb.jpg"

    @property
    def effective_cors(self) -> list[str]:
        if self.cors_origins:
            return self.cors_origins
        return _cors_from_env()


settings = Settings()