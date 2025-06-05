from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator
from airflow.utils.dates import days_ago
from datetime import timedelta

default_args = {
    'owner': 'airflow',
    'start_date': days_ago(1),
    'retry_delay': timedelta(minutes=5),
}

with DAG('data_pipeline',
         default_args=default_args,
         schedule_interval='@daily',
         catchup=False) as dag:

    extract_task = BashOperator(
        task_id='extract_data',
        bash_command='python /opt/airflow/dags/extract_to_minio.py'
    )

    load_task = BashOperator(
        task_id='load_data',
        bash_command='python /opt/airflow/dags/load_to_postgres.py'
    )

    dbt_run_task = BashOperator(
        task_id='dbt_run',
        bash_command='dbt debug && dbt run --project-dir /opt/airflow/dags/dbt_project'
    )

    quality_check_task = BashOperator(
        task_id='quality_check',
        bash_command='python /opt/airflow/dags/data_quality_check.py'
    )

    enrichment_task = BashOperator(
        task_id='enrich_data',
        bash_command='python /opt/airflow/dags/data_enrichment.py'
    )

    notify_task = SlackWebhookOperator(
        task_id='notify_success',
        http_conn_id='slack_connection',  # Configure this connection in the Airflow UI if needed
        message="Data pipeline run completed successfully and enriched KPIs are available!",
        channel="#data-team"
    )

    extract_task >> load_task >> dbt_run_task >> quality_check_task >> enrichment_task >> notify_task