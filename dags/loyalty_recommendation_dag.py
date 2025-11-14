"""Airflow DAG for building loyalty recommendations for marketing."""
from __future__ import annotations

import os
from datetime import timedelta

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator

from loyalty_ingestion import ingest_dataset
from loyalty_recommendation_transform import run_loyalty_recommendation_transform


DEFAULT_CHANNEL = os.getenv("LOYALTY_SLACK_CHANNEL", "#data-team")
LOYALTY_SCHEDULE = os.getenv("LOYALTY_RECOMMENDATION_SCHEDULE", "0 6 * * *")
START_OFFSET_MINUTES = int(os.getenv("LOYALTY_START_OFFSET_MINUTES", "10"))


def slack_failure_callback(context):  # pragma: no cover - executed by Airflow runtime
    dag_id = context.get("dag_run").dag_id if context.get("dag_run") else "unknown"
    execution_date = context.get("execution_date")
    message = (
        f":red_circle: Loyalty recommendation dag `{dag_id}` failed at {execution_date}. "
        "Please investigate the Airflow logs."
    )
    SlackWebhookOperator(
        task_id="notify_loyalty_failure",
        http_conn_id="slack_connection",
        message=message,
        channel=DEFAULT_CHANNEL,
    ).execute(context=context)


def build_slack_success_operator(dag: DAG) -> SlackWebhookOperator:
    return SlackWebhookOperator(
        task_id="notify_loyalty_success",
        http_conn_id="slack_connection",
        message="Loyalty recommendation pipeline completed successfully!",
        channel=DEFAULT_CHANNEL,
        dag=dag,
    )


def create_ingest_task(dag: DAG, dataset_name: str) -> PythonOperator:
    return PythonOperator(
        task_id=f"ingest_{dataset_name}",
        python_callable=ingest_dataset,
        op_args=[dataset_name],
        dag=dag,
    )


def create_transformation_task(dag: DAG) -> PythonOperator:
    return PythonOperator(
        task_id="score_loyalty_recommendations",
        python_callable=run_loyalty_recommendation_transform,
        dag=dag,
    )


def create_dag() -> DAG:
    default_args = {
        "owner": "marketing_analytics",
        "depends_on_past": False,
        "retries": 1,
        "retry_delay": timedelta(minutes=5),
        "on_failure_callback": slack_failure_callback,
        "start_date": pendulum.now("UTC").subtract(minutes=START_OFFSET_MINUTES),
    }

    dag = DAG(
        dag_id="loyalty_recommendation_pipeline",
        default_args=default_args,
        schedule_interval=LOYALTY_SCHEDULE,
        catchup=False,
        is_paused_upon_creation=False,
        tags=["loyalty", "marketing"],
        description="Daily scoring of loyalty add-ons, discounts, and reminder cadences.",
    )

    with dag:
        ingest_recent_purchases = create_ingest_task(dag, "recent_purchases")
        ingest_reminder_preferences = create_ingest_task(dag, "reminder_preferences")
        ingest_product_affinity = create_ingest_task(dag, "product_affinity")
        score_recommendations = create_transformation_task(dag)
        notify_success = build_slack_success_operator(dag)

        (
            ingest_recent_purchases
            >> ingest_reminder_preferences
            >> ingest_product_affinity
            >> score_recommendations
            >> notify_success
        )

    return dag


globals()["loyalty_recommendation_pipeline"] = create_dag()
