# Ecommerce Data Pipeline

An end-to-end ecommerce analytics platform that streams synthetic orders into a
PostgreSQL data warehouse via Apache Airflow, dbt, and MinIO. The stack also
ships with SonarQube and OWASP ZAP to validate code quality and application
security before CI/CD promotion.

---

## Repository layout

```
DataPipeline/
├── dags/                      # Airflow DAGs and helper scripts
│   ├── data_pipeline_dag.py   # Main ELT + dbt orchestration (runs every 5 min)
│   ├── order_generation_dag.py# Generates demo orders every 3 minutes
│   ├── order_generator.py     # Reusable utilities for synthetic data creation
│   ├── data_enrichment.py     # Persists KPI aggregates in Postgres
│   └── data_quality_check.py  # Lightweight Pandas based validations
├── docker-compose.yml         # Airflow, Postgres, MinIO, SonarQube, ZAP
├── readme-ci-cd.md            # Extended Jenkins/SonarQube/AWS guidance
├── requirements.txt           # Local tooling + unit-test dependencies
├── sonar-project.properties   # SonarScanner configuration
├── src/customer_app/backend/   # Express API with loyalty, trust, logistics, reminders, admin routes
├── src/customer_app/frontend/  # React SPA with reminder config and admin console
└── tests/                     # Pytest coverage for key pipeline helpers
```

Additional architecture/context references:

* `docs/real_time_kpi_pipeline.md` – interview-ready summary that maps the
  real-time KPI pipeline narrative (AWS + Azure, medallion layers, Airflow/dbt,
  observability) to this repository’s components.

The generated project report now ships as LaTeX and PDF artefacts so the
contents remain text-based and easy to version control:

* `Project_Report_Datapipeline.tex` – fully editable LaTeX source.
* `Project_Report_Datapipeline.pdf` – ready-to-share formatted output.
* `scripts/create_project_report.py` – regenerates both files via
  `python scripts/create_project_report.py`.

Run the script after editing the content definitions to refresh both files.

Raw CSVs used by the generator live under `dags/data_source/`.  The generator
now honours the `DATA_PIPELINE_SOURCE_DIR` environment variable so tests and
ad-hoc demos can point to a scratch directory without touching production-like
files.

Trust and transparency KPIs, badge criteria, and export guidance are captured
in `docs/trust_metrics.md`.

---

## Prerequisites

* Docker Desktop with Compose v2 (Windows/macOS) or Docker Engine + Compose
  plugin (Linux).
* Python 3.10+ for running helper scripts and the test suite locally.
* Git + Git LFS (optional, for large artefacts).
* SonarScanner CLI (for quality gates) and the OWASP ZAP Docker image (already
  referenced in `docker-compose.yml`).
* Terraform CLI 1.5+ (for infrastructure automation) and AWS credentials with
  permissions to create VPC, IAM, ECS, S3, and EC2 resources.

If Visual Studio Code prompts for a Kubernetes configuration file, create an
empty profile once so the request stops repeating:

```powershell
mkdir -Force $env:USERPROFILE\.kube
if (!(Test-Path "$env:USERPROFILE\.kube\config")) { New-Item "$env:USERPROFILE\.kube\config" -ItemType File }
```

---

## Automated cloud deployment (Terraform + Jenkins)

The repository now ships with a cloud-agnostic Terraform project in
`terraform/`.  The configuration is parametrised so that the same module
signature can be reused when the stack needs to land on Azure by filling in the
`azure_*` variables and implementing the `modules/azure` shim.  For now, the AWS
modules provision:

* A VPC with public and private subnets sized for AWS Academy / student-tier
  accounts.
* A hardened EC2 host running Jenkins with Terraform, Docker, and the AWS CLI
  pre-installed.
* S3-based artifact storage for Airflow DAGs, dbt assets, and deployment
  packages.
* An ECS Fargate cluster exposing both the `datapipeline` API and the
  `customer_app` UI behind an Application Load Balancer.

### Preparing credentials

1. Create or reuse an AWS key pair (`ssh_key_name`) so you can reach the Jenkins
   host for troubleshooting.
2. Export AWS credentials on the machine running Terraform.  Free student
   accounts typically rely on
   [AWS Academy Learner Lab](https://aws.amazon.com/training/awsacademy/)
   profiles, so the example uses shared credentials rather than hard-coded
   secrets.
3. (Optional) Populate the Azure variables in `terraform/variables.tf` if you
   plan to scaffold the Azure module later.  The variable structure matches the
   AWS one to minimise future changes.

### Deploying the QA (branch `qa`) environment

```bash
cd terraform
terraform init
terraform workspace select qa || terraform workspace new qa
terraform apply -var-file="environments/qa/terraform.tfvars"
```

The QA environment provisions a cost-optimised footprint (single Fargate task
per service, no NAT gateway) that aligns with the `qa` Git branch.  Jenkins is
bootstrapped with Terraform and AWS CLIs so the existing `Jenkinsfile` can build
and push branch images to the generated ECR repositories before running
integration tests against the QA services.

### Deploying the production (branch `main`) environment

```bash
cd terraform
terraform init
terraform workspace select main || terraform workspace new main
terraform apply -var-file="environments/main/terraform.tfvars"
```

The production footprint enables a managed NAT gateway, scales both services to
two Fargate tasks, and installs the AWS CodeDeploy agent on the Jenkins host.
Jenkins pipelines triggered from the `main` branch should run the infrastructure
plan step in "check" mode first (e.g. `terraform plan`) and then apply the
changes once approvals are in place.  The load balancer exposes the services at
`http://<alb-dns>/datapipeline` and `http://<alb-dns>/customer_app`.

> **Tip:** If you need to experiment with Azure later, keep the same variable
> structure and implement Terraform under `terraform/modules/azure`.  All
> call-sites already accept a `cloud_provider` switch so only the module source
> needs to change.

## Domain-driven Medallion blueprint (Bronze → Silver → Gold)

The pipeline now documents a domain-driven design (DDD) walkthrough of the
Medallion layers so data engineers can extend the stack for both AWS and Azure
(Databricks + ADLS Gen2) without altering the existing architecture.  Each
layer highlights the data engineering principles applied, why they matter, and
how the ecommerce sample data flows through.

### Bronze — Raw capture on S3 or ADLS Gen2

* **Ingestion targets**: S3 buckets (AWS) or ADLS Gen2 containers (Azure) named
  per domain (`bronze/orders/`, `bronze/products/`).  Terraform variables such as
  `cloud_provider`, `azure_storage_account_name`, and `azure_container_name`
  keep the same interface as the AWS S3 module so Jenkins pipelines keep working
  across clouds.
* **Principles applied**: immutable storage, append-only writes, schema-on-read,
  and file-level ACLs.  PySpark jobs in Databricks mount ADLS paths and write
  partitioned CSV/Parquet files, preserving raw payloads for reprocessing.
* **Why it matters**: ensures reproducibility and easy rollback.  If a new
  `orders.csv` with an unexpected `discount_code` field arrives, downstream
  validation can replay historical files without loss.

### Silver — Validated, conformed data in Delta Lake

* **Transformations**: cleansing nulls, casting types, standardising timestamps,
  enforcing primary/foreign keys, and deduplicating on business keys (e.g.
  `order_id` + latest `updated_at`).  PySpark notebooks run in Databricks, using
  Delta Lake to enable ACID merges and time travel.
* **Principles applied**: data quality contracts (Great Expectations/PySpark
  asserts), slowly changing dimensions (Type 2 for customers), idempotent
  upserts, and governance via table-level ACLs.  Jobs emit expectations and row
  counts to Airflow task logs so existing observability keeps working in AWS and
  Azure.
* **Why it matters**: provides trustworthy, query-ready tables for dbt models.
  For example, cleansing `orders` ensures currency-normalised `total_amount`
  values before loyalty scoring; conformance lets the same dbt models run on
  Databricks SQL endpoints or Postgres with minimal tweaks.

### Gold — Curated marts for analytics and applications

* **Transformations**: aggregations, business metrics, and feature engineering
  powering the customer_app transparency endpoints.  Example marts include:
  `mart_daily_revenue` (roll-ups by channel/region), `mart_trust_scores`
  (sustainability metrics), and `mart_loyalty_recommendations` (bundled add-ons
  per segment).
* **Principles applied**: semantic layering with dbt, data contracts for API
  consumption (documented schemas for `/api/trust/metrics`), fine-grained access
  roles (analyst vs. app service principal), and performance patterns such as
  Z-ordering/partition pruning in Delta Lake or indexed materialized views in
  Postgres.
* **Why it matters**: unlocks low-latency reads for the frontend dashboards and
  batch exports.  The same curated tables feed Power BI/Looker as well as the
  React admin grids without duplicating business logic.

### Cross-cutting guardrails and examples

* **Observability and lineage**: Airflow task instances push row counts and
  anomaly flags to logs; Terraform can enable DataHub/OpenLineage sinks without
  altering DAG code, keeping AWS and Azure parity.
* **Security**: IAM roles with least-privilege policies on S3; equivalent Azure
  RBAC roles on storage accounts and Databricks secrets for JDBC credentials.
* **Resilience**: incremental PySpark reads using watermark columns (`updated_at`
  for orders) prevent reprocessing storms; Delta time travel enables point-in-
  time recovery after bad loads.
* **Sample flow**: a new CSV for `orders` lands in Bronze → Silver job dedupes
  and standardises currencies → Gold mart publishes `mart_daily_revenue`, which
  the `customer_app` admin dashboard surfaces as a KPI tile.

### Jenkins integration workflow

1. Update the Jenkins global credentials store with an AWS access key (or
   assume-role settings) that mirrors the Terraform user.
2. Configure two multibranch pipelines:
   * `DataPipeline-QA` tracking the `qa` branch.  Include a stage that runs
     `terraform apply -var-file=environments/qa/terraform.tfvars` after the
     application images are pushed.
   * `DataPipeline-Prod` tracking the `main` branch.  Gate the `terraform apply`
     stage behind manual approval.
3. Each pipeline can consume the outputs written to the Jenkins workspace by
   calling `terraform output -json` and parsing the ALB endpoints to run smoke
   tests.

Destroy environments with the matching `terraform destroy` command and the same
`-var-file` argument when you want to free student-account quotas.

### Azure Databricks deployment using the same Terraform/Jenkins pipeline

The Terraform inputs also support Azure so you can lift the existing pipeline
without breaking AWS delivery:

1. Populate `azure_*` variables in `terraform/environments/<env>/terraform.tfvars`
   (subscription ID, resource group, storage account, Databricks workspace, and
   container names).  Set `cloud_provider = "azure"`.
2. Implement the `terraform/modules/azure` shim using the same outputs as the
   AWS module (storage endpoints, workspace URL, service principal IDs).  Keep
   the variable contract intact so the Jenkinsfile requires no edits.
3. In Jenkins, duplicate the multibranch jobs with an Azure suffix and inject
   Azure credentials (ARM service principal and Databricks PAT) via credentials
   binding.  The pipeline reuses existing stages to run `terraform apply`, build
   Docker images, and publish PySpark wheel/artifact bundles for Databricks.
4. Point Airflow connections to the Databricks REST API (`DatabricksSubmitRun`)
   so PySpark notebooks land Bronze data in ADLS Gen2 and progress through the
   Silver/Gold layers described above.
5. Smoke-test the `customer_app` endpoints against Gold marts exposed through
   Databricks SQL or Postgres, ensuring both AWS and Azure environments stay in
   lockstep.

#### Configuration and sample data flow checkpoints

- **Bronze ingestion**: Confirm the sample `orders.csv` from `dags/data_source/`
  lands in `bronze/orders/` (S3 or ADLS). Jenkins pipelines require no code
  changes—only `cloud_provider` and Azure credentials differ.
- **Silver validation**: Databricks/Airflow tasks deduplicate by `order_id` and
  enforce currency formats before persisting Delta tables. Failures are logged
  to `silver_rejects`, keeping AWS and Azure parity.
- **Gold marts**: dbt/PySpark materialise `mart_daily_revenue` and
  `mart_trust_scores` that the `customer_app` UI uses for KPI tiles. Validate by
  calling `/api/trust/metrics` after each deploy.

#### Challenges and how they were resolved

- **Schema drift** (e.g., unexpected `discount_code` in new CSVs): mitigated via
  schema-on-read contracts and replayable Bronze storage, so Silver dedupe logic
  stays intact across clouds.
- **Secret sprawl across clouds**: resolved by mapping AWS Secrets Manager keys
  to Azure Key Vault with the same variable names, keeping the Jenkinsfile and
  app configuration untouched.
- **Performance parity** when moving to Databricks: addressed by parameterising
  storage URIs and applying Z-ordering/partition pruning so Gold marts return
  results fast enough for the React transparency panels.

---

## Quick start (local stack)

1. **Identify the repository** – handy when several terminals are open:
   ```bash
   git rev-parse --show-toplevel         # absolute path
   basename "$(git rev-parse --show-toplevel)"  # repository name only
   ```
2. **Provide secrets securely**
   ```bash
   cp .env.example .env                   # edit the placeholders with strong values
   ```
   The `.env` file is git-ignored and feeds Docker Compose, helper scripts, and
   Airflow utility code.  Alternatively, export the environment variables in your
   shell before launching the stack.
3. **Bootstrap the services**
   ```bash
   docker compose up -d --build
   docker compose run --rm airflow-init  # first run only
   ```
4. Airflow UI: http://localhost:8082 (default username `airflow`).  Use the
   password you configured in `.env` (`AIRFLOW_DB_PASSWORD`).
5. Postgres data warehouse: `localhost:5432`, database `datamart`, user
   `dwh_user` unless overridden in `.env`.
6. MinIO console: http://localhost:9001 (user `minioadmin`, password
   `minioadmin`).

Both legacy and newly added DAGs ship with `is_paused_upon_creation=False`.
Alongside the existing ELT pipeline, the repository now includes:

* `loyalty_recommendation_dag` – hydrates the loyalty mart with dataset
  ingestion, scoring, and notification hooks.
* `trust_transparency_dag` – models delivery and support trust KPIs while
  publishing logistics SLA snapshots.

The order generator appends 30 new rows (20 existing + 10 new customers) every
three minutes.  The main `data_pipeline` DAG runs every five minutes by
default.  Customise the cadence via environment variables before starting the
stack:

```bash
export DATA_PIPELINE_SCHEDULE="*/2 * * * *"           # run every two minutes
export DATA_PIPELINE_START_OFFSET_MINUTES=1           # fire immediately on boot
export DATA_PIPELINE_SOURCE_DIR=/tmp/demo_data        # optional alternate CSVs
```

---

## Customer application surfaces

The customer-facing workspace now includes an Express backend and React
frontend.  The backend (`src/customer_app/backend`) shares a Postgres pool with
the warehouse and exposes:

* `/api/loyalty/recommendations` – loyalty recommendation feed with customer
  summaries.
* `/api/transparency/trust/scores` and `/api/transparency/logistics/snapshots`
  – transparency and SLA KPIs sourced from new marts.
* `/api/reminders/configurations` – CSR-friendly reminder configuration
  endpoint backed by the `reminder_preferences` table.
* `/api/admin` – authenticated CRUD and CSV/XLSX exports for products,
  customers, and orders.  Send `x-admin-role` headers (`admin` or `editor`) to
  unlock write actions.

The React frontend (`src/customer_app/frontend`) contains:

* A reminder configuration screen with React Query powered forms, quiet hours,
  and analytics-friendly tables.
* A dedicated `/admin` route with TanStack Table grids, inline edit helpers, and
  export buttons wired to the new backend endpoints.
* Playwright smoke tests (`npm run test:ui`) that cover navigation, reminder
  screens, and admin affordances.

Refer to `src/customer_app/backend/README.md` for environment variables and
route documentation.  The frontend uses Vite and proxies API requests to the
backend defined by `CAFE_BACKEND_URL`.

### New schemas and marts

The Airflow + dbt lineage now publishes additional analytics models:

* `mart_loyalty_recommendations` – customer/product cross-sell ideas with
  discount tiers, reminder cadences, and next-best-action metadata.
* `mart_trust_scores` – composite trust KPIs derived from delivery performance
  and support responsiveness, including breach and goodwill annotations.
* `mart_logistics_sla` – logistics SLA view with distributor/stockist coverage,
  penalty calculations, and inventory recency.

Supporting tables such as `csr_metadata`, `reminder_preferences`,
`notification_outbox`, and `analytics_event_log` are seeded through the new
ingestion helpers to keep the reminder screen and admin console populated out of
the box.

---

## Running unit tests and generating coverage

1. Install the local toolchain:
   ```bash
   python -m venv .venv
   source .venv/bin/activate            # .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
2. Execute the suite and emit coverage for SonarQube:
   ```bash
   pytest --cov=dags --cov-report xml
   ```
   Coverage is written to `coverage.xml`, aligning with
   `sonar-project.properties`.

The tests exercise the CSV generator, data-quality guardrails, enrichment logic,
and MinIO hashing helper to provide fast feedback before running the heavier
Airflow jobs.

---

## SonarQube workflow

1. Start the quality stack (Postgres + SonarQube):
   ```bash
   docker compose up -d postgres_sonar sonarqube
   ```
2. Browse to http://localhost:9003, create a token, and export it before
   running the scanner:
   ```bash
   export SONAR_TOKEN=<your-token>
   sonar-scanner
   ```
   (On PowerShell use `$env:SONAR_TOKEN = '<your-token>'`.)
3. Review the issues and coverage trends in the SonarQube UI.

The bundled configuration scans `dags/` and `src/` while excluding the `tests`
folder.  Commit artefacts such as `coverage.xml` can be added to `.gitignore` if
preferred.

---

## OWASP ZAP baseline and active scans

After the Airflow webserver is healthy (`docker compose ps`), launch the
security profiles:

```bash
# Passive baseline scan (fast, non-intrusive)
docker compose --profile zap up zap-baseline

# Active scan (thorough and potentially disruptive)
docker compose --profile zap up zap-full
```

Reports land in `security-reports/` and can be archived by Jenkins or another
CI runner.

---

## Secret hygiene and validation workflow

The repository no longer ships with embedded credentials.  Use the following
checklist to configure, validate, and promote secret-aware deployments:

### Local validation

1. Create and populate `.env` (or export the equivalent environment variables)
   with strong secrets for:
   * `AIRFLOW_DB_PASSWORD`
   * `POSTGRES_DWH_PASSWORD`
   * `MYSQL_ROOT_PASSWORD`
   * `SONAR_DB_PASSWORD`
   * `SONAR_TOKEN` (runtime export only)
2. Run the helper script with your local secrets:
   ```powershell
   $env:MYSQL_ROOT_PASSWORD='...'
   $env:AIRFLOW_DB_PASSWORD='...'
   powershell -ExecutionPolicy Bypass -File build_setup_install.ps1
   ```
   or, on Bash-compatible shells:
   ```bash
   export MYSQL_ROOT_PASSWORD=...
   export AIRFLOW_DB_PASSWORD=...
   pwsh ./build_setup_install.ps1
   ```
3. Trigger the data load directly to verify the Python code reads variables from
   the environment:
   ```bash
   export POSTGRES_DWH_PASSWORD=...
   python dags/load_to_postgres.py
   ```
4. Bring up Docker Compose with the `.env` file and confirm secrets were
   injected:
   ```bash
   docker compose --env-file .env config | grep PASSWORD
   docker compose up -d
   ```
5. Run the Sonar scan locally with the exported `SONAR_TOKEN` to confirm the
   configuration works without hardcoded tokens.

### AWS EC2 deployment checks

1. Store the same secrets in AWS Secrets Manager or Systems Manager Parameter
   Store.  Grant the EC2 instance profile permission to read them.
2. During provisioning (UserData, Ansible, or your chosen orchestration), fetch
   the secrets and export them before launching services:
   ```bash
   export AIRFLOW_DB_PASSWORD=$(aws secretsmanager get-secret-value ...)
   export POSTGRES_DWH_PASSWORD=$(aws secretsmanager get-secret-value ...)
   ```
3. Ensure generated files on the instance (e.g. `/opt/data-pipeline/.env`) are
   readable only by the service account (`chmod 600`).
4. Start the Docker Compose stack and re-run the Python loader to confirm AWS
   secrets are accessible.
5. Trigger the CI/CD pipeline or execute `sonar-scanner` with the token supplied
   via your CI secret store to validate the remote quality gate.

## Troubleshooting tips

* **Missing schemas or tables** – wait for the first successful run of the
  `data_pipeline` DAG.  With the default schedule the initial run occurs within
  five minutes of the stack starting.
* **Need to reset demo data** – stop the stack, delete files in
  `dags/data_source/` (or your custom `DATA_PIPELINE_SOURCE_DIR`), and copy the
  pristine CSVs from version control.
* **SonarScanner fails to authenticate** – ensure the host/port in
  `sonar-project.properties` matches the forwarded port (`9003` by default) and
  regenerate the token after resetting SonarQube.  Double-check that
  `SONAR_TOKEN` is exported in the shell that launches the scanner.

---

## Next steps

Detailed CI/CD rollout instructions, including Jenkins multibranch pipelines and
AWS deployment guidance, live in [readme-ci-cd.md](./readme-ci-cd.md).  Once the
local quality gates pass you can follow that document to publish the stack to
cloud environments.

## 1. Run ZAP Containers Manually

To start both scans (baseline + full):
```bash
  docker compose --profile zap up zap-baseline zap-full
```


or, if you just want one scan:
```bash
  docker compose --profile zap up zap-baseline
```


If you want to run it once (not as a daemonized container):
```bash
  docker compose --profile zap run --rm zap-baseline
```