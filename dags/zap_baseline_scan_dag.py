"""Airflow DAG to trigger an OWASP ZAP baseline scan via Docker Compose."""
from __future__ import annotations

import os
from datetime import datetime

from airflow import DAG
from airflow.operators.bash import BashOperator

ZAP_TARGET = os.getenv("ZAP_BASELINE_TARGET", "http://airflow:8082")
COMPOSE_FILE = os.getenv(
    "ZAP_COMPOSE_FILE", "/opt/airflow/docker/docker-compose.yml"
)
REPORTS_DIR = os.getenv("ZAP_REPORTS_DIR", "/opt/airflow/security-reports")

with DAG(
    dag_id="trigger_zap_scan",
    start_date=datetime(2025, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    tags=["security", "zap"],
) as dag:
    run_zap_baseline = BashOperator(
        task_id="zap_baseline_scan",
        bash_command=(
            "mkdir -p {reports_dir} && "
            "docker compose -f {compose_file} run --rm "
            "-e ZAP_BASELINE_TARGET={target} "
            "-e ZAP_REPORTS_DIR={reports_dir} "
            "zap-baseline"
        ).format(
            compose_file=COMPOSE_FILE,
            reports_dir=REPORTS_DIR,
            target=ZAP_TARGET,
        ),
    )