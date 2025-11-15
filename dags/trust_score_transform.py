"""Compute trust transparency scores from delivery and support feeds."""

from __future__ import annotations

import pandas as pd

ROLLING_WINDOW_DAYS = 14


def build_trust_scores(
    delivery_feed: pd.DataFrame,
    support_feed: pd.DataFrame,
    csr_badges: pd.DataFrame,
) -> pd.DataFrame:
    delivery_feed = delivery_feed.copy()
    support_feed = support_feed.copy()

    delivery_feed["delivered_at"] = pd.to_datetime(delivery_feed["delivered_at"], utc=True)
    delivery_feed["expected_at"] = pd.to_datetime(delivery_feed["expected_at"], utc=True)
    delivery_feed["on_time"] = delivery_feed["delivered_at"] <= delivery_feed["expected_at"]
    delivery_feed["score_date"] = delivery_feed["delivered_at"].dt.normalize()

    support_feed["resolution_minutes"] = support_feed["resolution_minutes"].astype(float)

    delivery_daily = (
        delivery_feed.groupby(["score_date", "customer_id"])["on_time"].mean().reset_index()
    )
    delivery_daily.rename(columns={"on_time": "delivery_score"}, inplace=True)

    support_daily = (
        support_feed.groupby("customer_id")["resolution_minutes"].mean().reset_index()
    )
    max_resolution = support_daily["resolution_minutes"].max() or 1
    support_daily["support_score"] = 1 - (support_daily["resolution_minutes"] / max_resolution)

    trust = delivery_daily.merge(support_daily[["customer_id", "support_score"]], on="customer_id", how="left")
    trust["support_score"] = trust["support_score"].fillna(0.5)
    trust["delivery_score"] = trust["delivery_score"].fillna(0.5)

    trust["composite_trust_score"] = trust[["delivery_score", "support_score"]].mean(axis=1)

    csr_badges.rename(columns={"customer_id": "badge_customer_id"}, inplace=True)
    trust = trust.merge(
        csr_badges[["badge_customer_id", "badge"]],
        left_on="customer_id",
        right_on="badge_customer_id",
        how="left",
    )
    trust.rename(columns={"badge": "csr_badge"}, inplace=True)
    trust.drop(columns=["badge_customer_id"], inplace=True)

    trust["breach_flag"] = trust["composite_trust_score"] < 0.4
    trust["breach_reason"] = trust["breach_flag"].map(
        {True: "Low composite trust score", False: ""}
    )
    trust["goodwill_actions"] = trust["breach_flag"].map(
        {True: "Offer goodwill voucher", False: "Maintain standard follow-up"}
    )

    trust["score_date"] = pd.to_datetime(trust["score_date"])
    trust.sort_values(by=["customer_id", "score_date"], inplace=True)

    trust["rolling_delivery"] = (
        trust.groupby("customer_id")["delivery_score"].transform(lambda s: s.rolling(ROLLING_WINDOW_DAYS, min_periods=1).mean())
    )
    trust["rolling_support"] = (
        trust.groupby("customer_id")["support_score"].transform(lambda s: s.rolling(ROLLING_WINDOW_DAYS, min_periods=1).mean())
    )

    trust["composite_trust_score"] = trust[["rolling_delivery", "rolling_support"]].mean(axis=1)

    columns = [
        "customer_id",
        "score_date",
        "delivery_score",
        "support_score",
        "csr_badge",
        "composite_trust_score",
        "breach_flag",
        "breach_reason",
        "goodwill_actions",
    ]

    return trust[columns]


__all__ = ["build_trust_scores"]
