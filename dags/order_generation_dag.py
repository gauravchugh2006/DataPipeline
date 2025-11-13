"""Airflow DAG to generate synthetic ecommerce orders every three minutes."""
from __future__ import annotations

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

from order_generator import generate_orders

with DAG(
    dag_id="generate_random_orders",
    description="Append random orders and customers to CSV sources for demos",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    schedule_interval="*/3 * * * *",
    catchup=False,
    is_paused_upon_creation=False,
    tags=["ecommerce", "orders", "demo"],
) as dag:
    generate_orders_task = PythonOperator(
        task_id="generate_orders_batch",
        python_callable=generate_orders,
    )
