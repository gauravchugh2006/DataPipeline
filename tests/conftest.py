"""Test configuration for the ecommerce data pipeline project."""
from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DAGS_DIR = PROJECT_ROOT / "dags"

if str(DAGS_DIR) not in sys.path:
    sys.path.insert(0, str(DAGS_DIR))

# Provide default warehouse credentials expected by helper utilities.
os.environ.setdefault("POSTGRES_DWH_PASSWORD", "test-password")
os.environ.setdefault("POSTGRES_DWH_USER", "test-user")
os.environ.setdefault("POSTGRES_DWH_HOST", "localhost")
os.environ.setdefault("POSTGRES_DWH_DB", "analytics")
