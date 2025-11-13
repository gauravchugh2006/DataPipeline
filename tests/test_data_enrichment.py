from __future__ import annotations

from types import SimpleNamespace

import pandas as pd

import data_enrichment


def test_enrich_data_writes_table(monkeypatch):
    source_df = pd.DataFrame(
        {
            "category": ["Electronics"],
            "orders": [5],
            "total_revenue": [500.0],
        }
    )
    captured = {}

    monkeypatch.setattr(data_enrichment, "create_engine", lambda uri: SimpleNamespace())
    monkeypatch.setattr(data_enrichment.pd, "read_sql", lambda query, engine: source_df)

    def fake_to_sql(self, name, engine, schema=None, if_exists=None, index=None):
        captured["name"] = name
        captured["schema"] = schema
        captured["if_exists"] = if_exists
        captured["index"] = index
        captured["average_order_value"] = list(self["average_order_value"])

    monkeypatch.setattr(pd.DataFrame, "to_sql", fake_to_sql, raising=False)

    data_enrichment.enrich_data()

    assert captured == {
        "name": "category_kpis",
        "schema": "analytics",
        "if_exists": "replace",
        "index": False,
        "average_order_value": [100.0],
    }


def test_enrich_data_no_rows(monkeypatch):
    empty_df = pd.DataFrame(columns=["total_revenue", "orders"])
    monkeypatch.setattr(data_enrichment, "create_engine", lambda uri: SimpleNamespace())
    monkeypatch.setattr(data_enrichment.pd, "read_sql", lambda query, engine: empty_df)

    calls = []

    def fake_to_sql(self, *args, **kwargs):  # pragma: no cover - should not run
        calls.append(True)

    monkeypatch.setattr(pd.DataFrame, "to_sql", fake_to_sql, raising=False)

    data_enrichment.enrich_data()

    assert calls == []
