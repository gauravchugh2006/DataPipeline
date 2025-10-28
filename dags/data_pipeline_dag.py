# This DAG orchestrates a data pipeline that extracts data, loads it into a database,
# runs transformations with dbt, performs data quality checks, enriches the data, and sends a notification.
# dags/data_pipeline_dag.py
# This DAG orchestrates a data pipeline that extracts data, loads it into a database,
import os
from airflow import DAG
from airflow.wh.bash import BashOperator # Correct import path for BashOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator
# from airflow.utils.dates import days_ago # Deprecated in newer Airflow versions
from datetime import timedelta
import pendulum # Recommended for start_date in Airflow 2+

# Define paths within the Airflow container for robustness
AIRFLOW_HOME = os.getenv('AIRFLOW_HOME', '/opt/airflow')
# Based on your project structure, dbt_project is inside dags/
DBT_PROJECT_DIR = os.path.join(AIRFLOW_HOME, 'dags', 'dbt_project') 

default_args = {
    'owner': 'airflow',
    # 'start_date': days_ago(1), # Deprecated. Use pendulum.datetime instead.
    'start_date': pendulum.datetime(2025, 3, 1, tz="UTC"), # Set a fixed start date for consistency
    'retry_delay': timedelta(minutes=5),
    'retries': 3, # It's good practice to define retries in default_args
}

with DAG(
    dag_id='data_pipeline', # Use dag_id for clarity
    default_args=default_args,
    slack_webhook_conn_id='slack_connection', # Ensure this connection exists in Airflow
    # schedule_interval='@daily', # Valid in 2.3.4, but 'schedule' is preferred for future compatibility
    schedule='@daily', # Use 'schedule' for forward compatibility (valid in Airflow 2.3.4+)
    catchup=False, # Valid argument, ensures DAG doesn't run for past missed schedules
    tags=['ecommerce', 'data_pipeline'], # Add tags for better organization in UI
) as dag:

    extract_task = BashOperator(
        task_id='extract_data',
        bash_command=f'python {AIRFLOW_HOME}/dags/extract_to_minio.py', # Use f-string for path
    )

    load_task = BashOperator(
        task_id='load_data',
        bash_command=f'python {AIRFLOW_HOME}/dags/load_to_postgres.py', # Use f-string for path
    )

    dbt_run_task = BashOperator(
        task_id='dbt_run',
        # Added 'dbt debug' for troubleshooting and 'dbt deps' for package installation
        bash_command=f'dbt debug --project-dir {DBT_PROJECT_DIR} && dbt deps --project-dir {DBT_PROJECT_DIR} && dbt run --project-dir {DBT_PROJECT_DIR} && dbt test --project-dir {DBT_PROJECT_DIR}',
    )

    quality_check_task = BashOperator(
        task_id='quality_check',
        bash_command=f'python {AIRFLOW_HOME}/dags/data_quality_check.py', # Use f-string for path
    )

    enrichment_task = BashOperator(
        task_id='enrich_data',
        bash_command=f'python {AIRFLOW_HOME}/dags/data_enrichment.py', # Use f-string for path
    )

    notify_task = SlackWebhookOperator(
        task_id='notify_success',
        # http_conn_id='slack_connection', # Deprecated parameter for SlackWebhookOperator
        slack_webhook_conn_id='slack_connection', # Correct parameter name for SlackWebhookOperator
        message="Data pipeline run completed successfully and enriched KPIs are available!",
        channel="#data-team" # Ensure this channel exists in Slack
    )

    # Define task dependencies
    extract_task >> load_task >> dbt_run_task >> quality_check_task >> enrichment_task >> notify_task