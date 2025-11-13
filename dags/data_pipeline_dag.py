"""Airflow DAG that orchestrates the ecommerce data pipeline."""
import os
from datetime import timedelta

import pendulum
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator

AIRFLOW_HOME = os.getenv("AIRFLOW_HOME", "/opt/airflow")
DBT_PROJECT_DIR = os.path.join(AIRFLOW_HOME, "dags", "dbt_project")
DBT_PROFILES_DIR = os.getenv("DBT_PROFILES_DIR", "/opt/airflow/.dbt")
DATA_PIPELINE_SCHEDULE = os.getenv("DATA_PIPELINE_SCHEDULE", "*/5 * * * *")
START_OFFSET_MINUTES = int(os.getenv("DATA_PIPELINE_START_OFFSET_MINUTES", "5"))


default_args = {
    "owner": "airflow",
    "start_date": pendulum.now("UTC").subtract(minutes=START_OFFSET_MINUTES),
    "retry_delay": timedelta(minutes=5),
    "retries": 3,
    "depends_on_past": False,
}

with DAG(
    dag_id="data_pipeline",
    default_args=default_args,
    schedule_interval=DATA_PIPELINE_SCHEDULE,
    catchup=False,
    is_paused_upon_creation=False,
    tags=["ecommerce", "data_pipeline"],
) as dag:
    common_env = {
        "MINIO_ENDPOINT": os.getenv("MINIO_ENDPOINT", "minio:9000"),
        "MINIO_ACCESS_KEY": os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        "MINIO_SECRET_KEY": os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        "MINIO_BUCKET": os.getenv("MINIO_BUCKET", "raw-data"),
    }

    postgres_conn = os.getenv("POSTGRES_DWH_CONN")
    if postgres_conn:
        common_env["POSTGRES_DWH_CONN"] = postgres_conn
    else:
        for var in ("POSTGRES_DWH_USER", "POSTGRES_DWH_PASSWORD", "POSTGRES_DWH_HOST", "POSTGRES_DWH_DB"):
            value = os.getenv(var)
            if value:
                common_env[var] = value

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

    zap_scan_task = TriggerDagRunOperator(
        task_id="trigger_security_scan",
        trigger_dag_id="trigger_zap_scan",
        wait_for_completion=True,
        poke_interval=int(os.getenv("ZAP_TRIGGER_POKE_INTERVAL", "60")),
        reset_dag_run=True,
        allowed_states=["success"],
        failed_states=["failed", "upstream_failed"],
    )

    notify_task = SlackWebhookOperator(
        task_id="notify_success",
        http_conn_id="slack_connection",
        message="Data pipeline run completed successfully and enriched KPIs are available!",
        channel="#data-team",
    )

    (
        extract_task
        >> load_task
        >> dbt_run_task
        >> quality_check_task
        >> enrichment_task
        >> zap_scan_task
        >> notify_task
    )
