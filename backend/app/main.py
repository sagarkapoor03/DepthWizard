"""DEPTHWIZARD FastAPI application entry point."""
from __future__ import annotations

from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import settings

app = FastAPI(
    title="DEPTHWIZARD API",
    description=(
        "AI single-view elevation estimation and 3D terrain reconstruction.\n\n"
        "Upload a single optical RGB remote-sensing image and obtain a relative "
        "depth map, DSM, slope analysis and a 3D terrain model. "
        "Georeferenced inputs keep their spatial metadata; metric elevation "
        "requires calibration with reference data (DEM / GCP)."
        "\n\n--- Scientific note ---\n"
        "A single RGB image does not inherently contain metric elevation. "
        "Monocular depth is relative; metric calibration is explicit and "
        "documented. Results are decision-support, not survey-grade."
    ),
    version=settings.version,
)

# --------------------------------------------------------------------------- #
# CORS (configurable origin list)
# --------------------------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.effective_cors,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------- #
# Static result hosting
# --------------------------------------------------------------------------- #
app.mount(
    "/api/results",
    StaticFiles(directory=str(settings.jobs_dir)),
    name="results",
)

app.include_router(router)


# --------------------------------------------------------------------------- #
# Error handling — never leak raw Python stack traces to the UI
# --------------------------------------------------------------------------- #
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "An internal error occurred while processing your request. "
                "Please try again or contact support."
            )
        },
    )


@app.get("/")
def root() -> dict:
    return {
        "service": settings.app_name,
        "version": settings.version,
        "docs": "/docs",
        "health": "/api/health",
    }


def _jobs_init() -> None:
    settings.jobs_dir.mkdir(parents=True, exist_ok=True)
    settings.demo_image_path.parent.mkdir(parents=True, exist_ok=True)


@app.on_event("startup")
async def startup() -> None:
    # Create data dirs lazily without blocking startup on model loading.
    await run_in_threadpool(_jobs_init)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)