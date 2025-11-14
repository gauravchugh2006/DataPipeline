"""Compute stock availability anomalies and persist alerts for BI consumption."""
from __future__ import annotations

import logging
import os

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

try:  # pragma: no cover - optional dependency in test environments
    from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook
except Exception:  # pragma: no cover - Airflow provider may be unavailable when testing modules directly
    SlackWebhookHook = None  # type: ignore[assignment]

INVENTORY_SNAPSHOT_TABLE = os.getenv(
    "INVENTORY_SNAPSHOT_TABLE", "analytics.inventory_snapshot"
)
STOCK_ALERTS_TABLE = os.getenv("STOCK_ALERTS_TABLE", "analytics.fact_stock_alerts")
DISCREPANCY_THRESHOLD = int(os.getenv("STOCK_ALERT_DISCREPANCY_THRESHOLD", "10"))
STALE_THRESHOLD_MINUTES = int(os.getenv("STOCK_ALERT_STALE_THRESHOLD_MINUTES", "180"))
SLACK_CONN_ID = os.getenv("SLACK_ALERT_CONN_ID", "slack_connection")


def resolve_database_uri() -> str:
    """Resolve the SQLAlchemy connection URI from Airflow environment variables."""
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


if "." in STOCK_ALERTS_TABLE:
    STOCK_ALERTS_SCHEMA, STOCK_ALERTS_NAME = STOCK_ALERTS_TABLE.split(".", 1)
else:  # pragma: no cover - fallback for unexpected configuration
    STOCK_ALERTS_SCHEMA, STOCK_ALERTS_NAME = "public", STOCK_ALERTS_TABLE


def _availability_rate(erp_quantity: float, warehouse_quantity: float) -> float:
    if erp_quantity <= 0:
        return 0.0
    return max(warehouse_quantity, 0.0) / erp_quantity


def _compose_alert_reason(row: pd.Series) -> str:
    reasons: list[str] = []
    if row["is_negative_stock"]:
        reasons.append("negative_stock")
    if row["is_stale_snapshot"]:
        reasons.append("stale_snapshot")
    if row["is_significant_mismatch"]:
        reasons.append("erp_vs_warehouse_mismatch")
    return ", ".join(reasons)


def evaluate_stock_anomalies(
    df_inventory: pd.DataFrame,
    *,
    discrepancy_threshold: int = DISCREPANCY_THRESHOLD,
    stale_threshold_minutes: int = STALE_THRESHOLD_MINUTES,
    now: pd.Timestamp | None = None,
) -> pd.DataFrame:
    """Return area-level anomalies comparing ERP and warehouse counts."""

    if df_inventory.empty:
        return pd.DataFrame(
            columns=[
                "area_id",
                "erp_quantity",
                "warehouse_quantity",
                "availability_rate",
                "discrepancy",
                "is_negative_stock",
                "is_stale_snapshot",
                "is_significant_mismatch",
                "alert_reason",
                "severity",
                "last_snapshot",
                "generated_at",
            ]
        )

    current_time = now or pd.Timestamp.utcnow()
    if current_time.tzinfo is None:
        current_time = current_time.tz_localize("UTC")
    inventory = df_inventory.copy()

    numeric_cols = ["erp_quantity", "warehouse_quantity"]
    for column in numeric_cols:
        inventory[column] = pd.to_numeric(inventory[column], errors="coerce").fillna(0.0)

    inventory["snapshot_ts"] = pd.to_datetime(inventory["snapshot_ts"], errors="coerce", utc=True)

    grouped = (
        inventory.groupby("area_id", as_index=False)
        .agg(
            erp_quantity=("erp_quantity", "sum"),
            warehouse_quantity=("warehouse_quantity", "sum"),
            last_snapshot=("snapshot_ts", "max"),
        )
        .fillna({"last_snapshot": pd.Timestamp("1970-01-01T00:00:00Z")})
    )

    grouped["availability_rate"] = grouped.apply(
        lambda row: _availability_rate(row["erp_quantity"], row["warehouse_quantity"]), axis=1
    )
    grouped["discrepancy"] = grouped["warehouse_quantity"] - grouped["erp_quantity"]
    grouped["is_negative_stock"] = grouped["warehouse_quantity"] < 0

    stale_cutoff = current_time - pd.Timedelta(minutes=stale_threshold_minutes)
    grouped["is_stale_snapshot"] = grouped["last_snapshot"].isna() | (grouped["last_snapshot"] < stale_cutoff)
    grouped["is_significant_mismatch"] = grouped["discrepancy"].abs() >= discrepancy_threshold

    grouped["alert_reason"] = grouped.apply(_compose_alert_reason, axis=1)
    grouped = grouped[grouped["alert_reason"] != ""]
    if grouped.empty:
        return grouped

    grouped["severity"] = grouped.apply(
        lambda row: "critical"
        if row["is_negative_stock"] or row["is_stale_snapshot"]
        else "warning",
        axis=1,
    )
    grouped["generated_at"] = current_time

    return grouped[
        [
            "area_id",
            "erp_quantity",
            "warehouse_quantity",
            "availability_rate",
            "discrepancy",
            "is_negative_stock",
            "is_stale_snapshot",
            "is_significant_mismatch",
            "severity",
            "alert_reason",
            "last_snapshot",
            "generated_at",
        ]
    ]


def _format_alert_message(alerts: pd.DataFrame) -> str:
    critical_alerts = alerts[alerts["severity"] == "critical"]
    if critical_alerts.empty:
        return ""

    affected_areas = ", ".join(sorted(critical_alerts["area_id"].astype(str).unique()))
    return (
        ":rotating_light: Critical stock anomalies detected in areas "
        f"{affected_areas}. Please review the fact_stock_alerts table for details."
    )


def notify_slack(alerts: pd.DataFrame) -> None:
    """Send proactive Slack notifications for critical anomalies."""
    if SlackWebhookHook is None:
        logging.debug("SlackWebhookHook unavailable; skipping Slack alert.")
        return

    message = _format_alert_message(alerts)
    if not message:
        return

    try:
        SlackWebhookHook(http_conn_id=SLACK_CONN_ID).send(text=message)
        logging.info("Sent Slack alert for critical stock anomalies.")
    except Exception as exc:  # pragma: no cover - defensive logging only
        logging.error("Failed to send Slack notification: %s", exc)


def _ensure_alerts_schema(engine: Engine) -> None:
    """Create the destination schema if it does not already exist."""

    if not STOCK_ALERTS_SCHEMA:
        return

    try:
        with engine.begin() as connection:
            connection.execute(
                text(f'CREATE SCHEMA IF NOT EXISTS "{STOCK_ALERTS_SCHEMA}"')
            )
    except SQLAlchemyError as exc:  # pragma: no cover - connectivity issues bubble up
        logging.error("Unable to ensure stock alerts schema exists: %s", exc)
        raise


def generate_stock_alerts() -> None:
    """Compute and persist stock availability anomalies."""
    engine = create_engine(resolve_database_uri())

    logging.info("Loading inventory snapshot from %s", INVENTORY_SNAPSHOT_TABLE)
    inventory_df = pd.read_sql(f"SELECT * FROM {INVENTORY_SNAPSHOT_TABLE}", engine)

    alerts = evaluate_stock_anomalies(inventory_df)

    if alerts.empty:
        logging.info("No stock anomalies detected; skipping persistence.")
        return

    _ensure_alerts_schema(engine)

    logging.info(
        "Persisting %d stock alerts to %s.%s",
        len(alerts),
        STOCK_ALERTS_SCHEMA,
        STOCK_ALERTS_NAME,
    )
    with engine.begin() as connection:
        alerts.to_sql(
            STOCK_ALERTS_NAME,
            connection,
            schema=STOCK_ALERTS_SCHEMA,
            if_exists="replace",
            index=False,
        )
    notify_slack(alerts)


def main() -> None:  # pragma: no cover - entrypoint for CLI execution
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    generate_stock_alerts()


if __name__ == "__main__":  # pragma: no cover
    main()
