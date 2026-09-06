"""Geospatial metadata handling.

Responsibilities
----------------
* Detect TIFF / GeoTIFF inputs.
* Read CRS, affine transform, width/height, resolution and bounds.
* Preserve geospatial metadata where available.
* Export DSM rasters as GeoTIFF when the input was georeferenced.
* Clearly mark JPG/PNG results as NOT georeferenced.

IMPORTANT
---------
We never *invent* a CRS or geographic coordinates. If a TIFF has no geospatial
tags (or rasterio is unavailable) we report ``georeferenced=False``.
"""
from __future__ import annotations

import io
import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from .image_utils import ImageValidationError


@dataclass
class GeoInfo:
    path: Path
    format: str
    width: int
    height: int
    georeferenced: bool
    crs: str | None = None
    transform: list[float] | None = None   # affine coefficients a..f
    bounds: list[float] | None = None       # west, south, east, north
    resolution: list[float] | None = None   # [x_res, y_res]
    dtype: str | None = None
    band_count: int = 1
    notes: list[str] = field(default_factory=list)


def inspect_image(path: Path) -> GeoInfo:
    """Read basic + geospatial info for an image file."""
    fmt = path.suffix.lower().lstrip(".")
    if path.suffix.lower() in {".tif", ".tiff"}:
        return _inspect_tiff(path)
    return _inspect_plain(path, fmt)


def _inspect_plain(path: Path, fmt: str) -> GeoInfo:
    img = Image.open(path)
    img.load()
    return GeoInfo(
        path=path,
        format=img.format or fmt.upper(),
        width=img.width,
        height=img.height,
        georeferenced=False,
        notes=["Non-georeferenced image: no CRS / transform available."],
    )


def _inspect_tiff(path: Path) -> GeoInfo:
    # Try rasterio first (authoritative for geospatial tags).
    try:
        import rasterio  # type: ignore

        with rasterio.open(path) as src:
            crs = src.crs.to_string() if src.crs else None
            transform = list(src.transform) if src.transform else None
            bounds = (
                [float(v) for v in src.bounds]
                if src.bounds
                else None
            )
            resolution = [float(v) for v in src.res] if src.res else None
            return GeoInfo(
                path=path,
                format="TIFF",
                width=src.width,
                height=src.height,
                georeferenced=(crs is not None and transform is not None),
                crs=crs,
                transform=transform,
                bounds=bounds,
                resolution=resolution,
                dtype=src.dtypes[0] if src.dtypes else None,
                band_count=src.count,
                notes=(
                    []
                    if (crs is not None and transform is not None)
                    else ["TIFF without usable geospatial metadata (plain GeoTIFF tags missing)."]
                ),
            )
    except Exception as exc:  # noqa: BLE001
        geo = _inspect_plain(path, "tiff")
        geo.notes.append(f"rasterio unavailable or failed ({type(exc).__name__}); "
                         "geospatial metadata was NOT verified.")
        return geo


def read_as_rgb(path: Path, limit: int = 1536) -> tuple[np.ndarray, Image.Image]:
    """Read an image (GeoTIFF or plain) as an RGB numpy array + PIL image.

    Multi-band and single-band rasters are converted to RGB. Large images are
    resized along the long edge to ``limit``.
    """
    try:
        img_array, pil_img = _try_geotiff_as_rgb(path, limit)
        if img_array is not None and pil_img is not None:
            return img_array, pil_img
    except Exception:  # noqa: BLE001 - fall back to PIL below
        pass

    img = Image.open(path)
    img.load()
    if img.mode not in ("RGB", "RGBA", "L"):
        try:
            img = img.convert("RGB")
        except Exception:  # noqa: BLE001
            raise ImageValidationError("Cannot convert image to RGB.")
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (0, 0, 0))
        bg.paste(img, mask=img.split()[3])
        img = bg
    if img.mode == "L":
        img = img.convert("RGB")
    if max(img.size) > limit:
        ratio = limit / float(max(img.size))
        img = img.resize(
            (max(8, int(img.width * ratio)), max(8, int(img.height * ratio))),
            Image.LANCZOS,
        )
    return np.asarray(img, dtype=np.uint8), img
def _try_geotiff_as_rgb(
    path: Path, limit: int
) -> tuple[np.ndarray | None, Image.Image | None]:
    """Use rasterio when available for correct channel extraction of rasters."""
    try:
        import rasterio  # type: ignore
    except Exception:
        return None, None

    with rasterio.open(path) as src:
        if src.count >= 3:
            data = src.read([1, 2, 3], out_dtype="uint8")
            arr = np.stack([data[0], data[1], data[2]], axis=-1)
        else:
            band = src.read(1, out_dtype="float64")
            mn, mx = float(np.nanmin(band)), float(np.nanmax(band))
            band_u8 = (
                np.zeros_like(band, dtype=np.uint8)
                if mx - mn < 1e-9
                else ((band - mn) / (mx - mn) * 255).astype(np.uint8)
            )
            arr = np.stack([band_u8, band_u8, band_u8], axis=-1)

        h, w = arr.shape[:2]
        if max(h, w) > limit:
            ratio = limit / float(max(h, w))
            new_size = (max(8, int(w * ratio)), max(8, int(h * ratio)))
            from PIL import Image as _Image

            img = _Image.fromarray(arr).resize(new_size, _Image.LANCZOS)
            return np.asarray(img, dtype=np.uint8), img
        return arr, Image.fromarray(arr)


def read_reference_raster(path: Path) -> dict:
    """Load a reference DEM/DSM GeoTIFF as an elevation array + metadata.

    Used by the calibration and validation services. Requires rasterio.
    Returns ``{"elevation": np.ndarray, "transform": ..., "crs": ..., "bounds": ...}``
    or raises ``ImageValidationError`` when the file cannot be read.
    """
    try:
        import rasterio  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            "Reference DEM requires rasterio, which is not installed in this environment."
        ) from exc

    try:
        with rasterio.open(path) as src:
            elev = src.read(1, out_dtype="float64")
            elev = np.where(np.isfinite(elev), elev, np.nan)
            return {
                "elevation": elev,
                "transform": list(src.transform),
                "crs": src.crs.to_string() if src.crs else None,
                "bounds": [float(v) for v in src.bounds],
                "resolution": [float(v) for v in src.res],
                "width": src.width,
                "height": src.height,
            }
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            f"Reference DEM could not be read: {type(exc).__name__}. "
            "Please upload a valid GeoTIFF."
        ) from exc


def write_geotiff(
    out_path: Path,
    array: np.ndarray,
    transform: list[float],
    crs: str | None,
    dtype: str = "float32",
    nodata: float = -9999.0,
) -> None:
    """Write ``array`` as a GeoTIFF preserving the given transform/CRS."""
    import rasterio  # type: ignore
    from rasterio.transform import Affine

    arr = np.where(np.isfinite(array), array, nodata).astype(dtype)
    keep_crs = crs
    with rasterio.open(
        out_path,
        "w",
        driver="GTiff",
        height=arr.shape[0],
        width=arr.shape[1],
        count=1,
        dtype=dtype,
        crs=keep_crs,
        transform=Affine(*transform),
        nodata=nodata,
        compress="lzw",
    ) as dst:
        dst.write(arr, 1)


def json_safe(geo: GeoInfo) -> dict:
    return {
        "format": geo.format,
        "width": geo.width,
        "height": geo.height,
        "georeferenced": geo.georeferenced,
        "crs": geo.crs,
        "transform": geo.transform,
        "bounds": geo.bounds,
        "resolution": geo.resolution,
        "dtype": geo.dtype,
        "band_count": geo.band_count,
        "notes": geo.notes,
    }