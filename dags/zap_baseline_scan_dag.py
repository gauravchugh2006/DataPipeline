"""
Airflow DAG to trigger an OWASP ZAP baseline scan via Docker Compose.
Drop this file at: c:/Project/DataPipeline/dags/zap_baseline_scan_dag.py
"""
from __future__ import annotations
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="trigger_zap_scan",
    start_date=datetime(2025, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    tags=["security", "zap"],
) as dag:

    run_zap_baseline = BashOperator(
        task_id="zap_baseline_scan",
        bash_command="docker compose run --rm zap-baseline",
    )