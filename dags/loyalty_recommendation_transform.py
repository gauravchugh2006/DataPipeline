"""Utility module for building loyalty recommendation scores."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable

import boto3
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

RAW_SCHEMA = os.getenv("RAW_SCHEMA", "raw")
MART_SCHEMA = os.getenv("MART_SCHEMA", "mart")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "raw-data")
LOYALTY_EXPORT_KEY = os.getenv(
    "LOYALTY_EXPORT_KEY", "loyalty/mart_loyalty_recommendations.json"
)
LOOKBACK_DAYS = int(os.getenv("LOYALTY_LOOKBACK_DAYS", "45"))
RECOMMENDATION_LIMIT = int(os.getenv("LOYALTY_RECOMMENDATION_LIMIT", "500"))

LOYALTY_SEGMENT_DEFAULT = "generalist"


def resolve_postgres_conn() -> str:
    """Return a SQLAlchemy connection string derived from env variables."""
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


def _load_dataframe(engine, table: str) -> pd.DataFrame:
    query = f"SELECT * FROM {table}"
    with engine.connect() as conn:
        try:
            df = pd.read_sql(query, conn)
        except Exception as exc:  # pragma: no cover - dependent on infra
            logger.error("Failed to load dataset %s: %s", table, exc)
            raise
    if df.empty:
        logger.warning("Dataset %s is empty", table)
    return df


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


def _calculate_segment(total_spent: float) -> str:
    if total_spent >= 500:
        return "high_value"
    if total_spent >= 200:
        return "growth"
    if total_spent >= 100:
        return "emerging"
    return "nurture"


def _calculate_discount_tier(total_spent: float, frequency: int) -> str:
    if total_spent >= 500 or frequency >= 6:
        return "tier_1"
    if total_spent >= 250 or frequency >= 4:
        return "tier_2"
    if total_spent >= 100 or frequency >= 2:
        return "tier_3"
    return "welcome"


def _format_schedule(row: pd.Series) -> str:
    window = row.get("reminder_window") or "anytime"
    frequency = row.get("frequency_per_month")
    if pd.isna(frequency):
        return f"adaptive reminders in the {window}"
    return f"{int(frequency)}x per month in the {window}"


def _serialize_add_ons(rows: Iterable[Dict[str, Any]]) -> str:
    serializable = []
    for row in rows:
        payload = {
            "product_id": row.get("product_id"),
            "add_on_name": row.get("add_on_name"),
            "affinity_score": row.get("affinity_score"),
            "primary_category": row.get("primary_category"),
        }
        serializable.append(payload)
    return json.dumps(serializable)


def run_loyalty_recommendation_transform(**_context):
    """Build the loyalty recommendation mart and publish downstream assets."""
    logger.info("Starting loyalty recommendation transformation")

    engine = create_engine(resolve_postgres_conn())
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {MART_SCHEMA};"))

    purchases = _load_dataframe(
        engine, f"{RAW_SCHEMA}.loyalty_recent_purchases"
    )
    preferences = _load_dataframe(
        engine, f"{RAW_SCHEMA}.loyalty_reminder_preferences"
    )
    affinity = _load_dataframe(
        engine, f"{RAW_SCHEMA}.loyalty_product_affinity"
    )

    if purchases.empty:
        logger.warning("No purchases available for scoring; skipping mart refresh")
        return

    purchases["purchase_date"] = pd.to_datetime(
        purchases["purchase_date"], errors="coerce"
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    purchases = purchases[purchases["purchase_date"] >= cutoff]

    if purchases.empty:
        logger.warning("No purchases within lookback window; skipping mart refresh")
        return

    purchases["purchase_amount"] = purchases["purchase_amount"].astype(float)
    summary = (
        purchases.groupby("customer_id")
        .agg(
            total_spent_30d=("purchase_amount", "sum"),
            purchase_frequency_30d=("order_id", "nunique"),
            last_purchase=("purchase_date", "max"),
            top_category=("product_category", lambda x: x.mode().iloc[0] if not x.mode().empty else None),
        )
        .reset_index()
    )

    summary["segment"] = summary["total_spent_30d"].apply(_calculate_segment)
    summary["discount_tier"] = summary.apply(
        lambda row: _calculate_discount_tier(
            row["total_spent_30d"], int(row["purchase_frequency_30d"])
        ),
        axis=1,
    )

    if not affinity.empty:
        affinity_sorted = affinity.sort_values(
            by=["customer_id", "affinity_score"], ascending=[True, False]
        )
        top_affinity = affinity_sorted.groupby("customer_id").head(3)
        serialized = top_affinity.groupby("customer_id").apply(
            lambda rows: _serialize_add_ons(rows.to_dict("records"))
        )
        affinity_summary = affinity_sorted.groupby("customer_id").first().reset_index()
        affinity_summary = affinity_summary[
            [
                "customer_id",
                "product_id",
                "add_on_name",
                "affinity_score",
                "primary_category",
            ]
        ]
        affinity_summary.rename(
            columns={
                "product_id": "primary_add_on_id",
                "add_on_name": "primary_add_on_name",
                "affinity_score": "primary_affinity_score",
                "primary_category": "affinity_category",
            },
            inplace=True,
        )
        affinity_summary["recommended_add_ons"] = affinity_summary["customer_id"].map(serialized)
    else:
        affinity_summary = pd.DataFrame(
            columns=[
                "customer_id",
                "primary_add_on_id",
                "primary_add_on_name",
                "primary_affinity_score",
                "affinity_category",
                "recommended_add_ons",
            ]
        )

    if not preferences.empty:
        preferences["reminder_schedule"] = preferences.apply(
            _format_schedule, axis=1
        )
        preferences.rename(
            columns={
                "preferred_channel": "reminder_channel",
            },
            inplace=True,
        )
    else:
        preferences = pd.DataFrame(
            columns=[
                "customer_id",
                "reminder_channel",
                "reminder_window",
                "frequency_per_month",
                "timezone",
                "reminder_schedule",
            ]
        )

    mart_df = summary.merge(
        preferences,
        on="customer_id",
        how="left",
    ).merge(
        affinity_summary,
        on="customer_id",
        how="left",
    )

    mart_df["reminder_channel"].fillna("email", inplace=True)
    mart_df["reminder_schedule"].fillna("adaptive reminders", inplace=True)

    mart_df.rename(
        columns={
            "primary_affinity_score": "affinity_score",
            "primary_add_on_id": "primary_add_on_product_id",
            "primary_add_on_name": "primary_add_on_name",
        },
        inplace=True,
    )
    mart_df["recommended_add_ons"].fillna("[]", inplace=True)
    mart_df["updated_at"] = datetime.now(timezone.utc)

    mart_df = mart_df.sort_values(
        by=["segment", "affinity_score", "total_spent_30d"],
        ascending=[True, False, False],
    ).head(RECOMMENDATION_LIMIT)

    logger.info("Publishing %s loyalty recommendation rows", len(mart_df))

    with engine.begin() as conn:
        mart_df.to_sql(
            "mart_loyalty_recommendations",
            conn,
            schema=MART_SCHEMA,
            if_exists="replace",
            index=False,
        )

    client = _prepare_minio_client()
    payload = json.dumps(mart_df.to_dict(orient="records"), default=str)
    try:
        client.put_object(
            Bucket=MINIO_BUCKET,
            Key=LOYALTY_EXPORT_KEY,
            Body=payload.encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(
            "Exported loyalty recommendations to s3://%s/%s",
            MINIO_BUCKET,
            LOYALTY_EXPORT_KEY,
        )
    except Exception as exc:  # pragma: no cover - dependent on infra
        logger.error("Failed to upload recommendations to MinIO: %s", exc)
        raise

    logger.info("Loyalty recommendation transformation completed")


def score_recommendations(
    purchases: pd.DataFrame,
    affinity: pd.DataFrame,
    reminder_preferences: pd.DataFrame,
) -> pd.DataFrame:
    """Return a scored recommendation DataFrame for lightweight workflows."""

    merged = purchases.merge(affinity, on="product_id", how="left")
    merged["segment"] = merged["segment"].fillna(LOYALTY_SEGMENT_DEFAULT)
    merged["affinity_score"] = merged["affinity_score"].fillna(0.5)

    enriched = merged.merge(
        reminder_preferences,
        on=["customer_id", "product_id"],
        how="left",
        suffixes=("", "_pref"),
    )

    enriched["recommendation_score"] = (
        enriched["affinity_score"].astype(float) * 0.7
        + enriched["quantity"].astype(float) * 0.2
        + enriched["order_date"].apply(lambda value: 1.0 if pd.notnull(value) else 0.0) * 0.1
    )

    enriched["recommendation_status"] = "pending"
    enriched.loc[enriched["recommendation_score"] > 1.5, "recommendation_status"] = "prioritised"

    enriched["reminder_frequency"] = enriched["reminder_frequency"].fillna("weekly")
    enriched["preferred_channel"] = enriched["preferred_channel"].fillna("email")
    enriched["discount_tier"] = pd.cut(
        enriched["recommendation_score"],
        bins=[0, 1, 1.5, 3],
        labels=["bronze", "silver", "gold"],
        include_lowest=True,
    )

    enriched["next_best_action"] = enriched["discount_tier"].map(
        {
            "bronze": "show_loyalty_badge",
            "silver": "send_reminder",
            "gold": "offer_discount",
        }
    )

    enriched["recommendation_id"] = pd.util.hash_pandas_object(
        enriched[["customer_id", "product_id", "order_id"]]
    )
    enriched["recommendation_created_at"] = pd.Timestamp.utcnow()

    columns = [
        "recommendation_id",
        "customer_id",
        "order_id",
        "product_id",
        "product_name",
        "segment",
        "recommendation_score",
        "recommendation_status",
        "reminder_frequency",
        "preferred_channel",
        "discount_tier",
        "next_best_action",
        "order_date",
        "recommendation_created_at",
    ]

    result = enriched[columns].rename(columns={"segment": "loyalty_segment"})
    return result


__all__ = ["run_loyalty_recommendation_transform", "score_recommendations"]
