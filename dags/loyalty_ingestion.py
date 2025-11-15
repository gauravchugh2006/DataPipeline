"""Helper utilities for ingesting loyalty related source feeds.

The module loads sample CSV extracts into pandas DataFrames so the
loyalty recommendation DAG can hydrate staging tables in Postgres or
MinIO.  Each loader accepts a base path, defaulting to the repository
`dags/data_source` directory so Airflow and tests can share fixtures.
"""

from __future__ import annotations

import pathlib
from typing import Dict, Iterable

import pandas as pd

DEFAULT_SOURCE_DIR = pathlib.Path(__file__).resolve().parent / "data_source"


def resolve_source_path(filename: str, source_dir: pathlib.Path | None = None) -> pathlib.Path:
    base = pathlib.Path(source_dir) if source_dir else DEFAULT_SOURCE_DIR
    path = base / filename
    if not path.exists():
        raise FileNotFoundError(f"Source file not found: {path}")
    return path


def load_recent_purchases(source_dir: pathlib.Path | None = None) -> pd.DataFrame:
    """Return the recent loyalty purchases extract as a DataFrame."""

    path = resolve_source_path("loyalty_recent_purchases.csv", source_dir)
    frame = pd.read_csv(path, parse_dates=["order_date"])
    frame["order_date"] = frame["order_date"].dt.tz_localize("UTC")
    return frame


def load_reminder_preferences(source_dir: pathlib.Path | None = None) -> pd.DataFrame:
    """Return reminder preference metadata for CSR tooling."""

    path = resolve_source_path("loyalty_reminder_preferences.csv", source_dir)
    frame = pd.read_csv(path)
    return frame


def load_product_affinity(source_dir: pathlib.Path | None = None) -> pd.DataFrame:
    """Return per-segment product affinity scores."""

    path = resolve_source_path("loyalty_product_affinity.csv", source_dir)
    frame = pd.read_csv(path)
    return frame


def to_minio_payload(frame: pd.DataFrame, bucket: str, prefix: str) -> Dict[str, Iterable[bytes]]:
    """Convert a DataFrame into a payload suitable for MinIO uploads.

    The helper returns a dictionary keyed by the object path so the DAG can
    iterate and push each artefact individually.
    """

    payload: Dict[str, Iterable[bytes]] = {}
    for chunk_index, chunk in enumerate(frame.to_csv(index=False).encode().splitlines(keepends=True)):
        key = f"{prefix}/part-{chunk_index:05d}.csv"
        payload.setdefault(key, []).append(chunk)
    return payload


__all__ = [
    "load_recent_purchases",
    "load_reminder_preferences",
    "load_product_affinity",
    "to_minio_payload",
    "resolve_source_path",
]
