"""Pytest configuration.

Redirects the backend data dir to a throw-away directory inside tests/ so the
test run never touches backend/data/jobs.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent

os.environ.setdefault("DW_DATA_DIR", str(TEST_ROOT / ".tmp_data"))
os.environ.setdefault("DW_FORCE_FALLBACK", "true")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def clean_jobs_dir():
    jobs = Path(os.environ["DW_DATA_DIR"]) / "jobs"
    if jobs.exists():
        import shutil

        shutil.rmtree(jobs, ignore_errors=True)
    jobs.mkdir(parents=True, exist_ok=True)
    yield jobs