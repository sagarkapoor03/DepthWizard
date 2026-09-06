"""Tests for depth estimation (fallback mode), DSM and slope math."""
from __future__ import annotations

import numpy as np
import pytest

from app.services import depth_estimation as de
from app.services import dsm, slope
from app.services.calibration import CalibrationResult, calibrate, relative_elevation
from app.services.terrain import downsample_heightmap, generate_mesh


def _rgb(h: int = 128, w: int = 128) -> np.ndarray:
    rng = np.random.default_rng(0)
    return rng.integers(0, 255, size=(h, w, 3), dtype=np.uint8)


class TestDepthEstimation:
    def test_fallback_depth_shape_and_range(self):
        img = _rgb(96, 120)
        res = de.estimate_depth(img)
        assert res.mode == "fallback"  # DW_FORCE_FALLBACK=true in conftest
        assert res.depth_normalized.shape == (96, 120)
        assert res.depth_normalized.dtype == np.float32
        assert res.depth_normalized.min() >= 0.0
        assert res.depth_normalized.max() <= 1.0

    def test_deterministic_for_same_input(self):
        img = _rgb()
        a = de.estimate_depth(img).depth_normalized
        b = de.estimate_depth(img).depth_normalized
        np.testing.assert_allclose(a, b, atol=1e-6)

    def test_depth_stats(self):
        stats = de.depth_stats(np.linspace(0, 1, 100).astype(np.float32))
        for key in ("min", "max", "mean", "median", "std"):
            assert key in stats


class TestDsm:
    def test_relative_dsm(self):
        depth = np.linspace(0, 1, 150 * 100).reshape(150, 100).astype(np.float32)
        cal = calibrate(depth, mode="relative")
        out = dsm.build_dsm(depth, cal, smooth_sigma=1.0)
        assert out.shape == (150, 100)
        # relative elevation = 1 - depth, so 0 depth -> 1
        np.testing.assert_allclose(out[0, 0], 1.0, atol=0.05)
        assert out.dtype == np.float32

    def test_calibrated_dsm(self):
        depth = np.full((64, 64), 0.5, dtype=np.float32)
        cal = CalibrationResult(
            mode="dem", scale=200.0, offset=100.0, calibrated=True, n_samples=100
        )
        out = dsm.build_dsm(depth, cal, smooth_sigma=None)
        np.testing.assert_allclose(out.mean(), 200.0 * 0.5 + 100.0, atol=0.1)

    def test_dsm_stats(self):
        array = np.random.default_rng(1).random((50, 50)).astype(np.float32)
        stats = dsm.surface_stats(array)
        assert stats["min"] <= stats["mean"] <= stats["max"]
        assert "median" in stats and "std" in stats

    def test_histogram(self):
        array = np.random.default_rng(2).random((100, 100)).astype(np.float32)
        h = dsm.histogram_stats(array, bins=12)
        assert len(h["counts"]) == 12
        assert sum(h["counts"]) == pytest.approx(100 * 100)


class TestSlope:
    def test_flat_surface_has_zero_slope(self):
        dsm_arr = np.ones((80, 80), dtype=np.float32) * 5.0
        s = slope.compute_slope(dsm_arr)
        assert s.max() < 1e-4
        assert s.min() >= 0

    def test_slope_stats_keys(self):
        dsm_arr = np.random.default_rng(3).random((80, 80)).astype(np.float32) * 10
        stats = slope.slope_stats(slope.compute_slope(dsm_arr))
        assert set(("min", "max", "mean", "median", "std")) <= set(stats)
        classes = slope.classify_slope(slope.compute_slope(dsm_arr))
        assert set(("flat", "moderate", "steep", "very_steep")) == set(classes)
        assert abs(sum(classes.values()) - 1.0) < 0.01


class TestCalibration:
    def test_relative_mode_not_calibrated(self):
        depth = np.full((32, 32), 0.5, dtype=np.float32)
        cal = calibrate(depth, mode="relative")
        assert cal.mode == "relative"
        assert cal.calibrated is False
        assert cal.scale == 1.0

    def test_gcp_calibration_recovers_line(self):
        # relative elevation (1-depth) follows a known linear law with elevation
        w = h = 64
        yy, xx = np.mgrid[0:h, 0:w]
        rel = (xx + 2 * yy).astype(np.float32)
        rel = (rel - rel.min()) / (rel.max() - rel.min())
        depth = 1.0 - rel
        # true elevation = 300 + 400 * rel
        idx = np.linspace(0, 63, 20).astype(int)
        gcps = [
            {"x": int(x), "y": int(y), "elevation": float(300 + 400 * rel[y, x])}
            for x in idx
            for y in idx
        ]
        cal = calibrate(depth, mode="gcp", gcps=gcps)
        assert cal.calibrated is True
        assert cal.mode == "gcp"
        assert cal.scale == pytest.approx(400.0, abs=15.0)
        assert cal.offset == pytest.approx(300.0, abs=15.0)
        assert cal.r_squared > 0.95

    def test_insufficient_gcps_not_calibrated(self):
        depth = np.full((32, 32), 0.5, dtype=np.float32)
        gcps = [{"x": 0, "y": 0, "elevation": 10.0}]
        cal = calibrate(depth, mode="gcp", gcps=gcps)
        assert cal.calibrated is False


class TestTerrain:
    def test_downsample(self):
        arr = np.random.default_rng(5).random((500, 400)).astype(np.float32)
        out = downsample_heightmap(arr, max_cells=120)
        assert out.shape[0] <= 120 and out.shape[1] <= 120

    def test_mesh_export(self, tmp_path):
        arr = np.random.default_rng(6).random((64, 64)).astype(np.float32)
        scene = generate_mesh(
            arr,
            tmp_path,
            georeferenced=True,
            calibrated=False,
            units="relative",
            max_cells=64,
        )
        assert scene["width"] == 64 and scene["height"] == 64
        assert scene["calibrated"] is False
        assert scene["units"] == "relative"
        assert scene["encoded"]  # non-empty payload
        assert (tmp_path / "mesh.json").exists()


class TestRelativeElevation:
    def test_inversion(self):
        depth = np.array([[1.0, 0.5, 0.0]], dtype=np.float32)
        rel = relative_elevation(depth)
        np.testing.assert_allclose(rel, [[0.0, 0.5, 1.0]], atol=1e-6)