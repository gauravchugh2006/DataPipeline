from __future__ import annotations

import pandas as pd
import pytest

import data_quality_check


def _run_quality(monkeypatch, dataframe):
    monkeypatch.setenv("POSTGRES_DWH_CONN", "postgresql://test")
    monkeypatch.setattr(data_quality_check, "create_engine", lambda uri: object())
    monkeypatch.setattr(data_quality_check.pd, "read_sql", lambda query, engine: dataframe)

    with pytest.raises(SystemExit) as excinfo:
        data_quality_check.run_data_quality_checks()
    return excinfo.value.code


def test_data_quality_success(monkeypatch):
    df = pd.DataFrame(
        {
            "order_id": [1, 2],
            "customer_id": [101, 102],
            "order_date": ["2024-01-01", "2024-01-02"],
            "total_amount": [100.0, 50.0],
            "product_id": [201, 202],
        }
    )

    exit_code = _run_quality(monkeypatch, df)
    assert exit_code == 0


def test_data_quality_failure(monkeypatch):
    df = pd.DataFrame(
        {
            "order_id": [1, 1],
            "customer_id": [101, 101],
            "order_date": ["2024-01-01", "2024-01-01"],
            "total_amount": [100.0, -10.0],
            "product_id": [201, 201],
        }
    )

    exit_code = _run_quality(monkeypatch, df)
    assert exit_code == 1
