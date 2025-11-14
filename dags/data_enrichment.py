"""Generate additional KPIs from the dbt models and persist them in Postgres."""
import logging
import os

import pandas as pd
from sqlalchemy import create_engine

SOURCE_TABLE = os.getenv("DBT_METRICS_TABLE", "analytics.order_metrics")
TARGET_TABLE = os.getenv("ENRICHED_TABLE", "analytics.category_kpis")
FACT_ORDER_ITEMS_TABLE = os.getenv(
    "FACT_ORDER_ITEMS_TABLE", "analytics.fact_order_items"
)
DELIVERY_STATUS_TABLE = os.getenv(
    "DELIVERY_STATUS_TABLE", "logistics_staging.stg_delivery_status"
)
DELIVERY_METRICS_TABLE = os.getenv(
    "DELIVERY_METRICS_TABLE", "logistics.delivery_service_metrics"
)
PENALTY_PER_DAY = float(os.getenv("DELIVERY_DELAY_PENALTY_PER_DAY", "25"))


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


def _safe_read_sql(engine, query: str) -> pd.DataFrame:
    try:
        return pd.read_sql(query, engine)
    except Exception as exc:  # pragma: no cover - defensive programming
        logging.warning("Unable to read data using query '%s': %s", query, exc)
        return pd.DataFrame()


def _prepare_delivery_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    date_columns = ["sla_due_date", "actual_delivery_date"]
    for column in date_columns:
        if column in df.columns:
            df[column] = pd.to_datetime(df[column])

    df["sla_met"] = (
        df["actual_delivery_date"].notna()
        & (df["actual_delivery_date"] <= df["sla_due_date"])
    )

    df["delay_days"] = (
        (df["actual_delivery_date"] - df["sla_due_date"]).dt.days.clip(lower=0)
    )
    df.loc[df["actual_delivery_date"].isna(), "delay_days"] = 0

    df["missing_distributor_flag"] = df["distributor_id"].isna().astype(int)
    return df


def enrich_data() -> None:
    engine = create_engine(resolve_database_uri())

    logging.info("Loading metrics from %s", SOURCE_TABLE)
    df_metrics = _safe_read_sql(engine, f"SELECT * FROM {SOURCE_TABLE}")

    if df_metrics.empty:
        logging.warning("No metrics found to enrich; exiting without writing output.")
        return

    order_items = _safe_read_sql(
        engine, f"SELECT order_id, category, total_amount FROM {FACT_ORDER_ITEMS_TABLE}"
    )
    delivery_status = _safe_read_sql(
        engine,
        (
            "SELECT order_id, distributor_id, delivery_zone, sla_due_date, "
            "actual_delivery_date FROM "
            f"{DELIVERY_STATUS_TABLE}"
        ),
    )

    delivery_metrics = _safe_read_sql(
        engine,
        (
            "SELECT distributor_id, delivery_zone, delivery_day, sla_adherence_rate, "
            "total_delay_days, delay_penalty_amount, unlinked_order_pct "
            f"FROM {DELIVERY_METRICS_TABLE}"
        ),
    )

    delivery_status = _prepare_delivery_features(delivery_status)

    if order_items.empty:
        logging.warning("Order item detail is empty; metrics will only include logistic aggregates.")
        merged = pd.DataFrame()
    else:
        merged = order_items.merge(
            delivery_status,
            how="left",
            on="order_id",
            suffixes=("", "_delivery"),
        )

    if merged.empty:
        logging.info("Falling back to DBT aggregate metrics only.")
        enriched = df_metrics.assign(
            average_order_value=lambda df: df["total_revenue"] / df["orders"],
            sla_adherence_rate=None,
            avg_delay_days=None,
            total_delay_days=None,
            delay_penalty_amount=None,
            unlinked_order_pct=None,
        )
    else:
        merged["sla_met"] = merged.get("sla_met", False).fillna(False)
        merged["delay_days"] = merged.get("delay_days", 0).fillna(0)
        merged["missing_distributor_flag"] = (
            merged.get("missing_distributor_flag", 1).fillna(1)
        )

        grouped = merged.groupby("category", dropna=False).agg(
            sla_adherence_rate=("sla_met", "mean"),
            avg_delay_days=("delay_days", "mean"),
            total_delay_days=("delay_days", "sum"),
            unlinked_order_pct=("missing_distributor_flag", "mean"),
        )
        grouped = grouped.reset_index()
        grouped["delay_penalty_amount"] = grouped["total_delay_days"] * PENALTY_PER_DAY

        enriched = df_metrics.assign(
            average_order_value=lambda df: df["total_revenue"] / df["orders"],
        ).merge(
            grouped,
            on="category",
            how="left",
        )

        if not delivery_metrics.empty:
            summary = delivery_metrics.agg(
                {
                    "sla_adherence_rate": "mean",
                    "total_delay_days": "sum",
                    "delay_penalty_amount": "sum",
                    "unlinked_order_pct": "mean",
                }
            )
            enriched["network_sla_adherence"] = summary["sla_adherence_rate"]
            enriched["network_delay_days"] = summary["total_delay_days"]
            enriched["network_penalty_amount"] = summary["delay_penalty_amount"]
            enriched["network_unlinked_order_pct"] = summary["unlinked_order_pct"]

    logging.info("Writing enriched KPIs to %s.%s", TARGET_SCHEMA, TARGET_NAME)
    enriched.to_sql(
        TARGET_NAME,
        engine,
        schema=TARGET_SCHEMA,
        if_exists="replace",
        index=False,
    )
    logging.info("Data enrichment complete.")


if __name__ == "__main__":
    enrich_data()
