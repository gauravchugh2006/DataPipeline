"""Generate additional KPIs from the dbt models and persist them in Postgres."""
import logging
import os

import pandas as pd
from sqlalchemy import create_engine

SOURCE_TABLE = os.getenv("DBT_METRICS_TABLE", "analytics.order_metrics")
TARGET_TABLE = os.getenv("ENRICHED_TABLE", "analytics.category_kpis")


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

if "." in TARGET_TABLE:
    TARGET_SCHEMA, TARGET_NAME = TARGET_TABLE.split(".", 1)
else:  # pragma: no cover - fallback for unexpected configuration
    TARGET_SCHEMA, TARGET_NAME = "public", TARGET_TABLE

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def enrich_data() -> None:
    engine = create_engine(resolve_database_uri())

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
