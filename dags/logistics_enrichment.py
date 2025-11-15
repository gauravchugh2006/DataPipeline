"""Build logistics SLA enrichment snapshots."""

from __future__ import annotations

import pandas as pd


def build_logistics_snapshot(
    delivery_status: pd.DataFrame,
    distributor_master: pd.DataFrame,
    stockist_inventory: pd.DataFrame,
) -> pd.DataFrame:
    delivery_status = delivery_status.copy()
    distributor_master = distributor_master.copy()
    stockist_inventory = stockist_inventory.copy()

    delivery_status["delivered_at"] = pd.to_datetime(delivery_status["delivered_at"], utc=True)
    delivery_status["snapshot_date"] = delivery_status["delivered_at"].dt.date

    delivery_status["on_time"] = delivery_status["status"].str.contains("on_time")
    delivery_summary = (
        delivery_status.groupby(["snapshot_date", "distributor_id", "stockist_id"])["on_time"].mean().reset_index()
    )
    delivery_summary.rename(columns={"on_time": "on_time_percentage"}, inplace=True)

    inventory_summary = stockist_inventory.copy()
    inventory_summary["updated_at"] = pd.to_datetime(inventory_summary["updated_at"], utc=True)
    inventory_summary["snapshot_date"] = inventory_summary["updated_at"].dt.date

    snapshot = delivery_summary.merge(
        inventory_summary,
        on=["snapshot_date", "stockist_id", "distributor_id"],
        how="left",
    )

    snapshot = snapshot.merge(distributor_master, on="distributor_id", how="left")
    snapshot["penalty_amount"] = (1 - snapshot["on_time_percentage"]) * 100
    snapshot["sla_breach_flag"] = snapshot["on_time_percentage"] < 0.9
    snapshot["breach_reason"] = snapshot["sla_breach_flag"].map(
        {True: "On-time delivery below SLA", False: ""}
    )

    columns = [
        "snapshot_date",
        "distributor_id",
        "distributor_name",
        "stockist_id",
        "stockist_name",
        "region",
        "on_time_percentage",
        "penalty_amount",
        "sla_breach_flag",
        "breach_reason",
        "inventory_days_on_hand",
    ]

    return snapshot[columns]


__all__ = ["build_logistics_snapshot"]
