"""Input image validation and normalisation utilities.

* Validates file type, magic bytes and basic image decodability.
* Enforces a size limit (configurable, default 30 MB).
* Resizes large images so the demo can run comfortably on a typical laptop.
"""
from __future__ import annotations

import io
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
SUPPORTED_FORMATS = {"JPEG", "PNG", "TIFF"}

MAGIC = {
    b"\xff\xd8\xff": "JPEG",
    b"\x89PNG\r\n\x1a\n": "PNG",
    b"II*\x00": "TIFF",
    b"MM\x00*": "TIFF",
}


class ImageValidationError(ValueError):
    """Raised when an upload cannot be used as an input image."""


@dataclass
class ImageInfo:
    path: Path
    filename: str
    extension: str
    size_bytes: int
    format: str
    width: int
    height: int
    is_geotiff: bool
    crs: str | None = None
    transform: list[float] | None = None
    bounds: list[float] | None = None
    resolution: list[float] | None = None
    notes: list[str] | None = None


def validate_extension(filename: str, max_mb: int) -> tuple[Path, str]:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ImageValidationError(
            f"Unsupported format '{ext}'. Please upload JPG, JPEG, PNG, TIFF or GeoTIFF."
        )
    return Path(filename), ext


def validate_magic_bytes(data: bytes) -> str:
    if not data:
        raise ImageValidationError("Empty file received.")
    for magic, fmt in MAGIC.items():
        if data[: len(magic)] == magic:
            return fmt
    raise ImageValidationError(
        "File content does not look like a supported image (JPG/PNG/TIFF)."
    )


def validate_image_bytes(data: bytes, max_mb: int = 30) -> Image.Image:
    if len(data) > max_mb * 1024 * 1024:
        raise ImageValidationError(
            f"File is larger than the allowed {max_mb} MB upload limit."
        )
    fmt = validate_magic_bytes(data)
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except UnidentifiedImageError as exc:  # corrupted / truncated file
        raise ImageValidationError(
            "The image appears to be corrupted or truncated and cannot be decoded."
        ) from exc
    except OSError as exc:
        raise ImageValidationError(
            f"Unable to decode image: {exc}".strip() or "The image file is invalid."
        ) from exc
    if img.format not in SUPPORTED_FORMATS:
        raise ImageValidationError(f"Unsupported image format: {img.format or 'unknown'}.")
    if img.width < 8 or img.height < 8:
        raise ImageValidationError("Image is too small to process (min 8x8 px).")
    return img


def resize_long_edge(img: Image.Image, limit: int = 1536) -> Image.Image:
    """Resize the longest edge down to <= limit, preserving aspect ratio."""
    w, h = img.size
    longest = max(w, h)
    if longest <= limit:
        return img
    ratio = limit / float(longest)
    new_size = (max(8, int(w * ratio)), max(8, int(h * ratio)))
    return img.resize(new_size, Image.LANCZOS)


def image_to_numpy_rgb(img: Image.Image) -> np.ndarray:
    if img.mode != "RGB":
        img = img.convert("RGB")
    return np.asarray(img, dtype=np.uint8)