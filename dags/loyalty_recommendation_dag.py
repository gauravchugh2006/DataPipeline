"""Daily DAG that orchestrates loyalty recommendation scoring."""

from __future__ import annotations

import json
from datetime import datetime, timedelta

import pandas as pd
from airflow import DAG
from airflow.operators.python import PythonOperator

from loyalty_ingestion import (
    load_product_affinity,
    load_recent_purchases,
    load_reminder_preferences,
)
from loyalty_recommendation_transform import score_recommendations


DEFAULT_ARGS = {
    "owner": "loyalty",
    "depends_on_past": False,
    "email": ["loyalty-alerts@example.com"],
    "email_on_failure": True,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def _ingest_sources(**context):
    source_dir = context["dag_run"].conf.get("source_dir") if context.get("dag_run") else None
    purchases = load_recent_purchases(source_dir)
    preferences = load_reminder_preferences(source_dir)
    affinity = load_product_affinity(source_dir)

    context["ti"].xcom_push(key="purchases", value=purchases.to_json(date_format="iso"))
    context["ti"].xcom_push(key="preferences", value=preferences.to_json())
    context["ti"].xcom_push(key="affinity", value=affinity.to_json())


def _score_recommendations(**context):
    task_instance = context["ti"]
    purchases = task_instance.xcom_pull(key="purchases", task_ids="ingest_sources")
    preferences = task_instance.xcom_pull(key="preferences", task_ids="ingest_sources")
    affinity = task_instance.xcom_pull(key="affinity", task_ids="ingest_sources")

    purchase_frame = pd.read_json(purchases) if isinstance(purchases, str) else purchases
    preference_frame = pd.read_json(preferences) if isinstance(preferences, str) else preferences
    affinity_frame = pd.read_json(affinity) if isinstance(affinity, str) else affinity

    if "order_date" in purchase_frame:
        purchase_frame["order_date"] = pd.to_datetime(purchase_frame["order_date"], utc=True)

    recommendations = score_recommendations(purchase_frame, affinity_frame, preference_frame)
    task_instance.xcom_push(key="recommendations", value=recommendations.to_json(date_format="iso"))


def _persist_results(**context):
    recommendations_json = context["ti"].xcom_pull(key="recommendations", task_ids="score_recommendations")
    recommendations = pd.read_json(recommendations_json)
    print(json.dumps({"records": len(recommendations)}, indent=2))


with DAG(
    dag_id="loyalty_recommendation_dag",
    default_args=DEFAULT_ARGS,
    description="Daily loyalty recommendation pipeline",
    schedule_interval="0 2 * * *",
    start_date=datetime(2024, 6, 1),
    catchup=False,
    max_active_runs=1,
    tags=["loyalty", "recommendations"],
) as dag:
    ingest_task = PythonOperator(task_id="ingest_sources", python_callable=_ingest_sources, provide_context=True)

    score_task = PythonOperator(
        task_id="score_recommendations",
        python_callable=_score_recommendations,
        provide_context=True,
    )

    persist_task = PythonOperator(
        task_id="persist_results",
        python_callable=_persist_results,
        provide_context=True,
    )

    ingest_task >> score_task >> persist_task
