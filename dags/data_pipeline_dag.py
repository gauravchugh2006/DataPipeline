"""Airflow DAG that orchestrates the ecommerce data pipeline."""
import os
from datetime import timedelta

import pendulum
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator

AIRFLOW_HOME = os.getenv("AIRFLOW_HOME", "/opt/airflow")
DBT_PROJECT_DIR = os.path.join(AIRFLOW_HOME, "dags", "dbt_project")
DBT_PROFILES_DIR = os.getenv("DBT_PROFILES_DIR", "/opt/airflow/.dbt")


default_args = {
    "owner": "airflow",
    "start_date": pendulum.datetime(2024, 1, 1, tz="UTC"),
    "retry_delay": timedelta(minutes=5),
    "retries": 3,
}

with DAG(
    dag_id="data_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    catchup=False,
    is_paused_upon_creation=False,
    tags=["ecommerce", "data_pipeline"],
) as dag:
    common_env = {
        "MINIO_ENDPOINT": os.getenv("MINIO_ENDPOINT", "minio:9000"),
        "MINIO_ACCESS_KEY": os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        "MINIO_SECRET_KEY": os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        "MINIO_BUCKET": os.getenv("MINIO_BUCKET", "raw-data"),
        "POSTGRES_DWH_CONN": os.getenv(
            "POSTGRES_DWH_CONN",
            "postgresql+psycopg2://dwh_user:dwh_password@postgres_dw:5432/datamart",
        ),
    }

    extract_task = BashOperator(
        task_id="extract_data",
        bash_command=f"python {AIRFLOW_HOME}/dags/extract_to_minio.py",
        env=common_env,
    )

    load_task = BashOperator(
        task_id="load_data",
        bash_command=f"python {AIRFLOW_HOME}/dags/load_to_postgres.py",
        env=common_env,
    )

    dbt_env = {
        **common_env,
        "DBT_PROFILES_DIR": DBT_PROFILES_DIR,
    }

    dbt_run_task = BashOperator(
        task_id="dbt_run",
        bash_command=
        f"dbt deps --project-dir {DBT_PROJECT_DIR} --profiles-dir {DBT_PROFILES_DIR} && "
        f"dbt run --project-dir {DBT_PROJECT_DIR} --profiles-dir {DBT_PROFILES_DIR} && "
        f"dbt test --project-dir {DBT_PROJECT_DIR} --profiles-dir {DBT_PROFILES_DIR}",
        env=dbt_env,
    )

    quality_check_task = BashOperator(
        task_id="quality_check",
        bash_command=f"python {AIRFLOW_HOME}/dags/data_quality_check.py",
        env=common_env,
    )

    enrichment_task = BashOperator(
        task_id="enrich_data",
        bash_command=f"python {AIRFLOW_HOME}/dags/data_enrichment.py",
        env=common_env,
    )

    notify_task = SlackWebhookOperator(
        task_id="notify_success",
        http_conn_id="slack_connection",
        message="Data pipeline run completed successfully and enriched KPIs are available!",
        channel="#data-team",
    )

    extract_task >> load_task >> dbt_run_task >> quality_check_task >> enrichment_task >> notify_task
