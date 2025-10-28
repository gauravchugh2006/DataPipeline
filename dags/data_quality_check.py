"""Run data quality checks against the raw schema in Postgres."""
import logging
import os
import sys

import pandas as pd
from sqlalchemy import create_engine

DATABASE_URI = os.getenv(
    "POSTGRES_DWH_CONN",
    "postgresql+psycopg2://dwh_user:dwh_password@postgres_dw:5432/datamart",
)
RAW_TABLE = os.getenv("RAW_TABLE", "raw.raw_data")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def run_data_quality_checks() -> None:
    try:
        engine = create_engine(DATABASE_URI)
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
