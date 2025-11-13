"""Run data quality checks against the raw schema in Postgres."""
import logging
import os
import sys

import pandas as pd
from sqlalchemy import create_engine

RAW_TABLE = os.getenv("RAW_TABLE", "raw.raw_data")


def resolve_database_uri() -> str:
    conn = os.getenv("POSTGRES_DWH_CONN")
    if conn:
        return conn

    password = os.getenv("POSTGRES_DWH_PASSWORD")
    if not password:
        raise ValueError(
            "POSTGRES_DWH_PASSWORD environment variable must be set when POSTGRES_DWH_CONN is not provided."
        )

    user = os.getenv("POSTGRES_DWH_USER", "dwh_user")
    host = os.getenv("POSTGRES_DWH_HOST", "postgres_dw")
    database = os.getenv("POSTGRES_DWH_DB", "datamart")
    port = os.getenv("POSTGRES_DWH_PORT", "5432")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def run_data_quality_checks() -> None:
    try:
        engine = create_engine(resolve_database_uri())
        df = pd.read_sql(f"SELECT * FROM {RAW_TABLE}", engine)
    except Exception as exc:  # pragma: no cover - defensive logging for runtime issues
        logging.error("Failed to load raw data for quality checks: %s", exc)
        sys.exit(1)

    failures = []

    if df.empty:
        failures.append("raw_data table is empty")

    for column in ("order_id", "customer_id", "order_date", "total_amount"):
        if column not in df.columns:
            failures.append(f"Missing expected column: {column}")
        elif df[column].isna().any():
            failures.append(f"Column {column} contains null values")

    if {"order_id", "product_id"}.issubset(df.columns):
        if df.duplicated(subset=["order_id", "product_id"]).any():
            failures.append("Duplicate order_id and product_id combinations detected")

    if "total_amount" in df.columns:
        if (df["total_amount"] < 0).any():
            failures.append("Negative total_amount values found")

    if failures:
        for failure in failures:
            logging.error("Data quality check failed: %s", failure)
        sys.exit(1)

    logging.info("All data quality checks passed.")
    sys.exit(0)


if __name__ == "__main__":
    run_data_quality_checks()
