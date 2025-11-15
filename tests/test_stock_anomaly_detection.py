from __future__ import annotations

from types import SimpleNamespace

import pandas as pd

import stock_anomaly_detection as stock_alerts


def test_evaluate_stock_anomalies_negative_stock_flagged():
    df = pd.DataFrame(
        {
            "area_id": ["north"],
            "erp_quantity": [100],
            "warehouse_quantity": [-5],
            "snapshot_ts": [pd.Timestamp("2024-01-01T00:00:00Z")],
        }
    )

    now = pd.Timestamp("2024-01-01T02:00:00Z")
    result = stock_alerts.evaluate_stock_anomalies(
        df,
        discrepancy_threshold=5,
        stale_threshold_minutes=60,
        now=now,
    )

    assert len(result) == 1
    row = result.iloc[0]
    assert bool(row["is_negative_stock"]) is True
    assert row["severity"] == "critical"
    assert "negative_stock" in row["alert_reason"]
    assert row["availability_rate"] == 0.0


def test_evaluate_stock_anomalies_stale_timestamp():
    df = pd.DataFrame(
        {
            "area_id": ["west"],
            "erp_quantity": [50],
            "warehouse_quantity": [50],
            "snapshot_ts": [pd.Timestamp("2023-12-31T00:00:00Z")],
        }
    )

    now = pd.Timestamp("2024-01-01T00:30:00Z")
    result = stock_alerts.evaluate_stock_anomalies(
        df,
        discrepancy_threshold=10,
        stale_threshold_minutes=30,
        now=now,
    )

    assert len(result) == 1
    row = result.iloc[0]
    assert bool(row["is_stale_snapshot"]) is True
    assert row["severity"] == "critical"
    assert "stale_snapshot" in row["alert_reason"]


def test_generate_stock_alerts_persists_results_and_notifies(monkeypatch):
    inventory_df = pd.DataFrame(
        {
            "area_id": ["central"],
            "erp_quantity": [80],
            "warehouse_quantity": [-1],
            "snapshot_ts": [pd.Timestamp("2024-01-01T00:00:00Z")],
        }
    )

    schema_commands: list[str] = []

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, exc_tb):
            return False

        def execute(self, statement):
            schema_commands.append(str(statement))

    class FakeEngine(SimpleNamespace):
        def begin(self):
            return FakeConnection()

    fake_engine = FakeEngine()

    monkeypatch.setattr(stock_alerts, "create_engine", lambda uri: fake_engine)
    monkeypatch.setattr(stock_alerts.pd, "read_sql", lambda query, engine: inventory_df)

    captured: dict[str, object] = {}

    def fake_to_sql(self, name, con, schema=None, if_exists=None, index=None):
        captured["name"] = name
        captured["schema"] = schema
        captured["if_exists"] = if_exists
        captured["index"] = index
        captured["rows"] = len(self)
        captured["area_ids"] = list(self["area_id"])
        captured["connection_type"] = type(con).__name__

    monkeypatch.setattr(pd.DataFrame, "to_sql", fake_to_sql, raising=False)

    notified = {}

    def fake_notify(alerts):
        notified["count"] = len(alerts)

    monkeypatch.setattr(stock_alerts, "notify_slack", fake_notify)

    stock_alerts.generate_stock_alerts()

    assert captured == {
        "name": stock_alerts.STOCK_ALERTS_NAME,
        "schema": stock_alerts.STOCK_ALERTS_SCHEMA,
        "if_exists": "replace",
        "index": False,
        "rows": 1,
        "area_ids": ["central"],
        "connection_type": "FakeConnection",
    }
    assert notified == {"count": 1}
    assert schema_commands == [
        f'CREATE SCHEMA IF NOT EXISTS "{stock_alerts.STOCK_ALERTS_SCHEMA}"'
    ]
