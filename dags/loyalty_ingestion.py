"""Helpers for loading loyalty source data into the raw warehouse schema."""
from __future__ import annotations

import logging
import os
from io import BytesIO
from typing import Any, Dict

import boto3
import pandas as pd
from airflow.exceptions import AirflowSkipException
from sqlalchemy import create_engine, text


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

RAW_SCHEMA = os.getenv("RAW_SCHEMA", "raw")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "raw-data")
LOYALTY_FALLBACK_DIR = os.getenv("LOYALTY_FALLBACK_DIR")

DATASETS = {
    "recent_purchases": {
        "object_name": "loyalty_recent_purchases.csv",
        "table": "loyalty_recent_purchases",
    },
    "reminder_preferences": {
        "object_name": "loyalty_reminder_preferences.csv",
        "table": "loyalty_reminder_preferences",
    },
    "product_affinity": {
        "object_name": "loyalty_product_affinity.csv",
        "table": "loyalty_product_affinity",
    },
}


def resolve_postgres_conn() -> str:
    conn = os.getenv("POSTGRES_DWH_CONN")
    if conn:
        return conn

    password = os.getenv("POSTGRES_DWH_PASSWORD")
    if not password:
        raise ValueError(
            "POSTGRES_DWH_PASSWORD must be set when POSTGRES_DWH_CONN is not provided."
        )

    user = os.getenv("POSTGRES_DWH_USER", "dwh_user")
    host = os.getenv("POSTGRES_DWH_HOST", "postgres_dw")
    database = os.getenv("POSTGRES_DWH_DB", "datamart")
    port = os.getenv("POSTGRES_DWH_PORT", "5432")

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"


def _prepare_minio_client():
    boto_kwargs: Dict[str, Any] = {
        "endpoint_url": f"http://{MINIO_ENDPOINT}",
        "aws_access_key_id": MINIO_ACCESS_KEY,
        "aws_secret_access_key": MINIO_SECRET_KEY,
    }
    region = os.getenv("AWS_REGION")
    if region:
        boto_kwargs["region_name"] = region
    return boto3.client("s3", **boto_kwargs)


def _dataset_fallback_path(object_name: str) -> str:
    if LOYALTY_FALLBACK_DIR:
        return os.path.join(LOYALTY_FALLBACK_DIR, object_name)
    dags_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(dags_dir, "csv", object_name)


def _download_dataset(object_name: str) -> bytes:
    client = _prepare_minio_client()
    try:
        response = client.get_object(Bucket=MINIO_BUCKET, Key=object_name)
        payload = response["Body"].read()
        logger.info("Downloaded %s from MinIO bucket %s", object_name, MINIO_BUCKET)
        return payload
    except Exception as exc:  # pragma: no cover - dependent on infra
        fallback_path = _dataset_fallback_path(object_name)
        if os.path.exists(fallback_path):
            logger.warning(
                "Falling back to local loyalty sample for %s after MinIO error: %s",
                object_name,
                exc,
            )
            with open(fallback_path, "rb") as handle:
                return handle.read()
        raise


def ingest_dataset(dataset_name: str) -> None:
    dataset = DATASETS.get(dataset_name)
    if not dataset:
        raise ValueError(f"Unknown loyalty dataset: {dataset_name}")

    object_name = dataset["object_name"]
    table = dataset["table"]
    logger.info("Loading loyalty dataset %s into %s.%s", object_name, RAW_SCHEMA, table)

    try:
        payload = _download_dataset(object_name)
    except Exception as exc:  # pragma: no cover - runtime dependency
        logger.error("Unable to download %s: %s", object_name, exc)
        raise

    df = pd.read_csv(BytesIO(payload))
    if df.empty:
        raise AirflowSkipException(
            f"Dataset {object_name} is empty; skipping load for {table}"
        )

    engine = create_engine(resolve_postgres_conn())
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {RAW_SCHEMA};"))
        df.to_sql(
            table,
            conn,
            schema=RAW_SCHEMA,
            if_exists="replace",
            index=False,
        )
    logger.info("Loaded %s rows into %s.%s", len(df), RAW_SCHEMA, table)


__all__ = ["ingest_dataset"]
