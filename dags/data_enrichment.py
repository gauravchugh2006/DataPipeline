"""Generate additional KPIs from the dbt models and persist them in Postgres."""
import logging
import os

import pandas as pd
from sqlalchemy import create_engine

CATEGORY_SOURCE_TABLE = os.getenv("DBT_METRICS_TABLE", "analytics.order_metrics")
CATEGORY_TARGET_TABLE = os.getenv("ENRICHED_TABLE", "analytics.category_kpis")
TRUST_SOURCE_TABLE = os.getenv("TRUST_METRICS_TABLE", "analytics.trust_signal_rollups")
TRUST_TARGET_TABLE = os.getenv("TRUST_TARGET_TABLE", "analytics.mart_trust_scores")

ON_TIME_WEIGHT = float(os.getenv("TRUST_WEIGHT_ON_TIME", "0.5"))
CSR_WEIGHT = float(os.getenv("TRUST_WEIGHT_CSR", "0.3"))
RESOLUTION_WEIGHT = float(os.getenv("TRUST_WEIGHT_RESOLUTION", "0.2"))
RESOLUTION_SLA_MINUTES = float(os.getenv("TRUST_RESOLUTION_SLA_MINUTES", "30"))


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

def _parse_table(table_identifier: str) -> tuple[str, str]:
    if "." in table_identifier:
        return tuple(table_identifier.split(".", 1))
    return "public", table_identifier


CATEGORY_SCHEMA, CATEGORY_TARGET_NAME = _parse_table(CATEGORY_TARGET_TABLE)
TRUST_SCHEMA, TRUST_TARGET_NAME = _parse_table(TRUST_TARGET_TABLE)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def _normalise_weights() -> tuple[float, float, float]:
    total = ON_TIME_WEIGHT + CSR_WEIGHT + RESOLUTION_WEIGHT
    if total <= 0:  # pragma: no cover - defensive guard for misconfiguration
        return 0.5, 0.3, 0.2
    return ON_TIME_WEIGHT / total, CSR_WEIGHT / total, RESOLUTION_WEIGHT / total


def _enrich_category_metrics(engine) -> None:
    logging.info("Loading metrics from %s", CATEGORY_SOURCE_TABLE)
    df_metrics = pd.read_sql(f"SELECT * FROM {CATEGORY_SOURCE_TABLE}", engine)

    if df_metrics.empty:
        logging.warning("No metrics found to enrich for %s; skipping write.", CATEGORY_TARGET_TABLE)
        return

    enriched = df_metrics.assign(
        average_order_value=lambda df: df["total_revenue"] / df["orders"],
    )

    logging.info("Writing enriched KPIs to %s.%s", CATEGORY_SCHEMA, CATEGORY_TARGET_NAME)
    enriched.to_sql(
        CATEGORY_TARGET_NAME,
        engine,
        schema=CATEGORY_SCHEMA,
        if_exists="replace",
        index=False,
    )


def _publish_trust_scores(engine) -> None:
    logging.info("Loading trust metrics from %s", TRUST_SOURCE_TABLE)
    df_trust = pd.read_sql(f"SELECT * FROM {TRUST_SOURCE_TABLE} ORDER BY metric_date", engine)

    if df_trust.empty:
        logging.warning("No trust metrics available; skipping %s.", TRUST_TARGET_TABLE)
        return

    df_trust["metric_date"] = pd.to_datetime(df_trust["metric_date"]).dt.date
    on_time_weight, csr_weight, resolution_weight = _normalise_weights()

    base = df_trust.assign(
        on_time_score=lambda df: df["on_time_delivery_rate"].fillna(0).clip(lower=0, upper=1),
        csr_badge_score=lambda df: df["csr_badge_coverage"].fillna(0).clip(lower=0, upper=1),
    )

    resolution_score = 1 - (base["avg_resolution_minutes"] / RESOLUTION_SLA_MINUTES)
    resolution_score = resolution_score.clip(lower=0, upper=1).fillna(1.0)

    composite = base.assign(
        resolution_score=resolution_score,
        overall_trust_score=lambda df: (
            df["on_time_score"] * on_time_weight
            + df["csr_badge_score"] * csr_weight
            + resolution_score * resolution_weight
        )
        * 100,
    )

    composite["overall_trust_score"] = composite["overall_trust_score"].round(2)
    composite["trust_score_rolling_30d"] = (
        composite["overall_trust_score"].rolling(window=30, min_periods=1).mean().round(2)
    )

    composite["breach_flag"] = (
        composite[["on_time_below_threshold", "csr_badge_below_threshold", "resolution_above_threshold"]]
        .fillna(False)
        .any(axis=1)
    )

    def _status(score: float) -> str:
        if pd.isna(score):
            return "unknown"
        if score >= 90:
            return "healthy"
        if score >= 75:
            return "monitor"
        return "critical"

    composite["trust_health_status"] = composite["overall_trust_score"].apply(_status)
    composite["last_refreshed_at"] = pd.Timestamp.utcnow()

    selected_columns = [
        "metric_date",
        "orders_count",
        "deliveries_count",
        "on_time_delivery_rate",
        "on_time_rate_rolling_7d",
        "on_time_rate_rolling_30d",
        "on_time_below_threshold",
        "csr_badge_coverage",
        "csr_badge_coverage_rolling_30d",
        "csr_badge_below_threshold",
        "avg_resolution_minutes",
        "avg_resolution_minutes_rolling_30d",
        "resolution_above_threshold",
        "resolution_success_rate",
        "resolution_success_rate_rolling_30d",
        "overall_trust_score",
        "trust_score_rolling_30d",
        "trust_health_status",
        "breach_flag",
        "delivery_data_available",
        "csr_data_available",
        "support_data_available",
        "last_refreshed_at",
    ]

    output = composite.loc[:, selected_columns]

    logging.info("Writing trust scores to %s.%s", TRUST_SCHEMA, TRUST_TARGET_NAME)
    output.to_sql(
        TRUST_TARGET_NAME,
        engine,
        schema=TRUST_SCHEMA,
        if_exists="replace",
        index=False,
    )


def enrich_data() -> None:
    engine = create_engine(resolve_database_uri())
    _enrich_category_metrics(engine)
    _publish_trust_scores(engine)
    logging.info("Data enrichment complete.")


if __name__ == "__main__":
    enrich_data()
