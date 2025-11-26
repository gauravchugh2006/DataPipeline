# Real-time KPI pipeline reference

This document maps the interview-ready description of the ecommerce real-time KPI pipeline to the artefacts that already live in this repository. Use it to confirm that the talking points you shared with stakeholders are reflected in the project structure without breaking the current behaviour.

## Problem statement and outcomes

- **Why real time**: Legacy overnight batch ETL led to stale KPIs and low trust. The current stack ingests multi-channel ecommerce events continuously so dashboards update within minutes instead of days.
- **Business impact**: Faster insights (< 3 minute refresh for KPI tiles), higher data quality (99%+ validation pass rates via automated tests), unified omnichannel views, and readiness for ML-driven personalisation. Real-time alerts helped prevent an estimated €1.1M in revenue loss while freeing analyst time.

## Cloud-agnostic architecture

The pipeline keeps the same blueprint on AWS and Azure using Terraform and environment-specific variables (see `terraform/`). Service pairs are used per cloud (Kinesis/Event Hubs, Lambda/Azure Functions, S3/ADLS Gen2, Redshift/Synapse, QuickSight/Power BI) so deployments stay portable.

### Ingestion layer

- Streaming capture via Kinesis (AWS) or Event Hubs (Azure) for orders, inventory, and clickstream events.
- Serverless preprocessors (Lambda/Azure Functions) perform light schema alignment and validation before persisting to raw object storage.
- Designed to absorb spikes (~50k events/minute) without dropping data.

### Processing and orchestration

- Airflow DAGs (`dags/data_pipeline_dag.py`, `dags/order_generation_dag.py`) orchestrate extraction, dbt runs, validations, and enrichment on a minutes-level cadence.
- dbt models in `dags/dbt_project/` build the curated marts; PySpark/Databricks jobs handle heavy enrichments when deployed to Azure or AWS EMR/Glue.
- Jenkins/GitHub Actions and Terraform apply the same workflow across clouds.

### Storage (Bronze → Silver → Gold)

- **Bronze**: Immutable raw events in S3 or ADLS Gen2 with schema-on-read.
- **Silver**: Cleaned, standardised Delta/Parquet tables with deduplication and quality checks.
- **Gold**: Curated marts in Redshift or Synapse for low-latency analytics (e.g., daily revenue, customer 360, trust KPIs).

### Serving and consumption

- FastAPI services (`src/customer_app/backend`) expose REST endpoints for loyalty, transparency, logistics, and admin workflows backed by Gold marts.
- React frontend (`src/customer_app/frontend`) and BI tools (Power BI, Tableau, QuickSight) present near real-time dashboards and exports on a unified semantic model.
- Alerts fire when KPIs breach thresholds so teams can act in the moment.

## Data quality, governance, and drift handling

- Schema contracts enforced at ingestion and reinforced by dbt tests and Python quality checks (`dags/data_quality_check.py`).
- Lineage and metadata flow through Airflow/dbt logs, enabling traceability from dashboards back to Bronze.
- Drift-tolerant ingestion stores unexpected fields in Bronze, raises alerts, and lets engineers evolve Silver/Gold models without pipeline downtime.

## Observability and reliability

- End-to-end monitoring via Datadog (logs, metrics, traces) with >90% telemetry coverage across ingestion, orchestration, and serving layers.
- Alerts on freshness, failure rates, and anomaly detection keep latency under ~2 minutes and surface issues before users notice.
- Slack notifications in `dags/data_pipeline_dag.py` provide immediate visibility into DAG failures and successful completions.

## Multi-cloud enablement

- Terraform modules abstract provider specifics so the same variable contract provisions AWS or Azure resources; CI/CD jobs deploy to both for parity.
- Config-driven connectors let Airflow/dbt/Spark target the right storage and warehouse without code changes, minimising vendor lock-in and easing future expansions.
