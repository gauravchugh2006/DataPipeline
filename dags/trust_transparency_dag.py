"""Daily DAG to compute trust transparency scores and logistics snapshots."""

from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd
from airflow import DAG
from airflow.operators.python import PythonOperator

from logistics_enrichment import build_logistics_snapshot
from loyalty_ingestion import resolve_source_path
from trust_score_transform import build_trust_scores


DEFAULT_ARGS = {
    "owner": "analytics",
    "depends_on_past": False,
    "email": ["analytics-alerts@example.com"],
    "email_on_failure": True,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def _load_frame(filename: str, **context) -> pd.DataFrame:
    source_dir = context.get("dag_run").conf.get("source_dir") if context.get("dag_run") else None
    path = resolve_source_path(filename, source_dir)
    return pd.read_csv(path)


def _compute_trust_scores(**context):
    delivery = _load_frame("trust_delivery_feed.csv", **context)
    support = _load_frame("trust_support_feed.csv", **context)
    csr = _load_frame("trust_csr_badges.csv", **context)
    trust_scores = build_trust_scores(delivery, support, csr)
    context["ti"].xcom_push(key="trust_scores", value=trust_scores.to_json(date_format="iso"))


def _compute_logistics(**context):
    delivery_status = _load_frame("logistics_delivery_status.csv", **context)
    distributor_master = _load_frame("logistics_distributor_master.csv", **context)
    stockist_inventory = _load_frame("logistics_stockist_inventory.csv", **context)
    logistics = build_logistics_snapshot(delivery_status, distributor_master, stockist_inventory)
    context["ti"].xcom_push(key="logistics", value=logistics.to_json(date_format="iso"))


def _log_summary(**context):
    ti = context["ti"]
    trust = pd.read_json(ti.xcom_pull(task_ids="compute_trust_scores", key="trust_scores"))
    logistics = pd.read_json(ti.xcom_pull(task_ids="compute_logistics", key="logistics"))
    print(
        {
            "trust_records": len(trust),
            "logistics_records": len(logistics),
            "latest_trust_date": trust["score_date"].max() if not trust.empty else None,
        }
    )


with DAG(
    dag_id="trust_transparency_dag",
    default_args=DEFAULT_ARGS,
    description="Daily trust and logistics mart refresh",
    schedule_interval="0 3 * * *",
    start_date=datetime(2024, 6, 1),
    catchup=False,
    max_active_runs=1,
    tags=["trust", "logistics"],
) as dag:
    compute_trust = PythonOperator(
        task_id="compute_trust_scores",
        python_callable=_compute_trust_scores,
        provide_context=True,
    )

    compute_logistics = PythonOperator(
        task_id="compute_logistics",
        python_callable=_compute_logistics,
        provide_context=True,
    )

    log_summary = PythonOperator(
        task_id="log_summary",
        python_callable=_log_summary,
        provide_context=True,
    )

    [compute_trust, compute_logistics] >> log_summary
