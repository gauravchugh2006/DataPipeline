from __future__ import annotations

from types import SimpleNamespace

import pandas as pd

import data_enrichment


def test_enrich_data_writes_table(monkeypatch):
    category_df = pd.DataFrame(
        {
            "category": ["Electronics"],
            "orders": [5],
            "total_revenue": [500.0],
        }
    )
    trust_df = pd.DataFrame(
        {
            "metric_date": ["2023-01-05"],
            "orders_count": [5],
            "deliveries_count": [5],
            "on_time_delivery_rate": [0.9],
            "on_time_rate_rolling_7d": [0.88],
            "on_time_rate_rolling_30d": [0.85],
            "on_time_below_threshold": [False],
            "csr_badge_coverage": [0.8],
            "csr_badge_coverage_rolling_30d": [0.78],
            "csr_badge_below_threshold": [False],
            "avg_resolution_minutes": [15.0],
            "avg_resolution_minutes_rolling_30d": [20.0],
            "resolution_above_threshold": [False],
            "resolution_success_rate": [0.95],
            "resolution_success_rate_rolling_30d": [0.9],
            "delivery_data_available": [True],
            "csr_data_available": [True],
            "support_data_available": [True],
        }
    )
    captured = []

    monkeypatch.setenv("POSTGRES_DWH_CONN", "postgresql://test")
    monkeypatch.setattr(data_enrichment, "create_engine", lambda uri: SimpleNamespace())

    def fake_read_sql(query, engine):
        if data_enrichment.CATEGORY_SOURCE_TABLE in query:
            return category_df
        if data_enrichment.TRUST_SOURCE_TABLE in query:
            return trust_df
        raise AssertionError(f"Unexpected query: {query}")

    monkeypatch.setattr(data_enrichment.pd, "read_sql", fake_read_sql)

    def fake_to_sql(self, name, engine, schema=None, if_exists=None, index=None):
        captured.append(
            {
                "name": name,
                "schema": schema,
                "if_exists": if_exists,
                "index": index,
                "frame": self.copy(),
            }
        )

    monkeypatch.setattr(pd.DataFrame, "to_sql", fake_to_sql, raising=False)

    data_enrichment.enrich_data()

    assert len(captured) == 2

    category_call, trust_call = captured

    assert category_call["name"] == "category_kpis"
    assert category_call["schema"] == "analytics"
    assert category_call["if_exists"] == "replace"
    assert category_call["index"] is False
    assert list(category_call["frame"]["average_order_value"]) == [100.0]

    assert trust_call["name"] == "mart_trust_scores"
    assert trust_call["schema"] == "analytics"
    assert trust_call["if_exists"] == "replace"
    assert trust_call["index"] is False
    assert list(trust_call["frame"]["overall_trust_score"]) == [79.0]
    assert list(trust_call["frame"]["trust_health_status"]) == ["monitor"]


def test_enrich_data_no_rows(monkeypatch):
    empty_df = pd.DataFrame(columns=["total_revenue", "orders"])
    monkeypatch.setenv("POSTGRES_DWH_CONN", "postgresql://test")
    monkeypatch.setattr(data_enrichment, "create_engine", lambda uri: SimpleNamespace())

    def fake_read_sql(query, engine):
        if data_enrichment.CATEGORY_SOURCE_TABLE in query:
            return empty_df
        if data_enrichment.TRUST_SOURCE_TABLE in query:
            return pd.DataFrame()
        raise AssertionError("Unexpected query")

    monkeypatch.setattr(data_enrichment.pd, "read_sql", fake_read_sql)

    calls = []

    def fake_to_sql(self, *args, **kwargs):  # pragma: no cover - should not run
        calls.append(True)

    monkeypatch.setattr(pd.DataFrame, "to_sql", fake_to_sql, raising=False)

    data_enrichment.enrich_data()

    assert calls == []
