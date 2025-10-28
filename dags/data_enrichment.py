"""Generate additional KPIs from the dbt models and persist them in Postgres."""
import logging
import os

import pandas as pd
from sqlalchemy import create_engine

DATABASE_URI = os.getenv(
    "POSTGRES_DWH_CONN",
    "postgresql+psycopg2://dwh_user:dwh_password@postgres_dw:5432/datamart",
)
SOURCE_TABLE = os.getenv("DBT_METRICS_TABLE", "analytics.order_metrics")
TARGET_TABLE = os.getenv("ENRICHED_TABLE", "analytics.category_kpis")

if "." in TARGET_TABLE:
    TARGET_SCHEMA, TARGET_NAME = TARGET_TABLE.split(".", 1)
else:  # pragma: no cover - fallback for unexpected configuration
    TARGET_SCHEMA, TARGET_NAME = "public", TARGET_TABLE

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def enrich_data() -> None:
    engine = create_engine(DATABASE_URI)

    logging.info("Loading metrics from %s", SOURCE_TABLE)
    df_metrics = pd.read_sql(f"SELECT * FROM {SOURCE_TABLE}", engine)

    if df_metrics.empty:
        logging.warning("No metrics found to enrich; exiting without writing output.")
        return

    enriched = df_metrics.assign(
        average_order_value=lambda df: df["total_revenue"] / df["orders"],
    )

    logging.info("Writing enriched KPIs to %s.%s", TARGET_SCHEMA, TARGET_NAME)
    enriched.to_sql(TARGET_NAME, engine, schema=TARGET_SCHEMA, if_exists="replace", index=False)
    logging.info("Data enrichment complete.")


if __name__ == "__main__":
    enrich_data()
