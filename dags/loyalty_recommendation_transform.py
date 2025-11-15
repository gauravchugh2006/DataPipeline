"""Transformations that create the mart_loyalty_recommendations table.

The scoring logic is intentionally lightweight so the unit tests and
local Airflow runs complete quickly.  In production, the scoring logic
would likely execute within a dedicated notebook or model serving
platform.
"""

from __future__ import annotations

import pandas as pd

LOYALTY_SEGMENT_DEFAULT = "generalist"


def score_recommendations(
    purchases: pd.DataFrame,
    affinity: pd.DataFrame,
    reminder_preferences: pd.DataFrame,
) -> pd.DataFrame:
    """Return a scored recommendation DataFrame."""

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

    enriched["recommendation_id"] = pd.util.hash_pandas_object(enriched[["customer_id", "product_id", "order_id"]])
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


__all__ = ["score_recommendations"]
