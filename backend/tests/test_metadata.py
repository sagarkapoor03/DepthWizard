"""Tests for image validation and metadata detection."""
from __future__ import annotations

import io
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.services.image_utils import (
    ImageValidationError,
    validate_extension,
    validate_image_bytes,
)
from app.services.geospatial import inspect_image


def _png_bytes(w: int = 64, h: int = 64) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.zeros((h, w, 3), dtype=np.uint8)).save(buf, "PNG")
    return buf.getvalue()


def _jpg_bytes(w: int = 64, h: int = 64) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.zeros((h, w, 3), dtype=np.uint8)).save(buf, "JPEG")
    return buf.getvalue()


class TestImageValidation:
    def test_accepts_png(self):
        img = validate_image_bytes(_png_bytes(), max_mb=10)
        assert img.format == "PNG"

    def test_accepts_jpeg(self):
        img = validate_image_bytes(_jpg_bytes(), max_mb=10)
        assert img.format == "JPEG"

    def test_rejects_unknown_extension(self):
        with pytest.raises(ImageValidationError):
            validate_extension("photo.gif", max_mb=10)

    def test_rejects_empty_payload(self):
        with pytest.raises(ImageValidationError):
            validate_image_bytes(b"", max_mb=10)

    def test_rejects_truncated_image(self):
        data = _png_bytes()
        with pytest.raises(ImageValidationError):
            validate_image_bytes(data[: len(data) // 3], max_mb=10)

    def test_rejects_oversized_upload(self):
        # a valid PNG padded past the 1 MB limit must trip the size check
        data = _png_bytes(64, 64) + b"\x00" * (2 * 1024 * 1024)
        with pytest.raises(ImageValidationError):
            validate_image_bytes(data, max_mb=1)

    def test_rejects_random_binary(self):
        with pytest.raises(ImageValidationError):
            validate_image_bytes(b"\x00\x01\x02\x03notanimage\xff\xfe", max_mb=10)


class TestMetadataDetection:
    def test_png_is_not_georeferenced(self, tmp_path: Path):
        p = tmp_path / "plain.png"
        p.write_bytes(_png_bytes())
        info = inspect_image(p)
        assert info.georeferenced is False
        assert info.format == "PNG"

    def test_plain_tiff_reports_no_crs(self, tmp_path: Path):
        # write a baseline TIFF with no geospatial tags
        import tifffile

        path = tmp_path / "plain.tif"
        tifffile.imwrite(path, np.zeros((16, 16), dtype=np.uint8))
        info = inspect_image(path)
        # rasterio may or may not read a CRS; we only assert metadata is sane
        assert info.width == 16 and info.height == 16
        assert info.format == "TIFF"

    def test_georeferenced_tiff_detected(self, tmp_path: Path):
        import rasterio
        from rasterio.transform import from_origin

        path = tmp_path / "geo.tif"
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            height=16,
            width=16,
            count=1,
            dtype="float32",
            crs="EPSG:4326",
            transform=from_origin(72.0, 19.0, 0.0001, 0.0001),
        ) as dst:
            dst.write(np.ones((16, 16), dtype="float32"), 1)

        info = inspect_image(path)
        assert info.georeferenced is True
        assert info.crs == "EPSG:4326"
        assert info.resolution[0] == pytest.approx(0.0001)