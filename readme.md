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
└── tests/                     # Pytest coverage for key pipeline helpers
```

Raw CSVs used by the generator live under `dags/data_source/`.  The generator
now honours the `DATA_PIPELINE_SOURCE_DIR` environment variable so tests and
ad-hoc demos can point to a scratch directory without touching production-like
files.

---

## Prerequisites

* Docker Desktop with Compose v2 (Windows/macOS) or Docker Engine + Compose
  plugin (Linux).
* Python 3.10+ for running helper scripts and the test suite locally.
* Git + Git LFS (optional, for large artefacts).
* SonarScanner CLI (for quality gates) and the OWASP ZAP Docker image (already
  referenced in `docker-compose.yml`).

If Visual Studio Code prompts for a Kubernetes configuration file, create an
empty profile once so the request stops repeating:

```powershell
mkdir -Force $env:USERPROFILE\.kube
if (!(Test-Path "$env:USERPROFILE\.kube\config")) { New-Item "$env:USERPROFILE\.kube\config" -ItemType File }
```

---

## Quick start (local stack)

1. **Identify the repository** – handy when several terminals are open:
   ```bash
   git rev-parse --show-toplevel         # absolute path
   basename "$(git rev-parse --show-toplevel)"  # repository name only
   ```
2. **Bootstrap the services**
   ```bash
   docker compose up -d --build
   docker compose run --rm airflow-init  # first run only
   ```
3. Airflow UI: http://localhost:8082 (default credentials `airflow` / `airflow`).
4. Postgres data warehouse: `localhost:5432`, database `datamart`, user
   `dwh_user`, password `dwh_password`.
5. MinIO console: http://localhost:9001 (user `minioadmin`, password
   `minioadmin`).

Both DAGs ship with `is_paused_upon_creation=False`.  The order generator appends
30 new rows (20 existing + 10 new customers) every three minutes.  The main
`data_pipeline` DAG runs every five minutes by default.  Customise the cadence
via environment variables before starting the stack:

```bash
export DATA_PIPELINE_SCHEDULE="*/2 * * * *"           # run every two minutes
export DATA_PIPELINE_START_OFFSET_MINUTES=1           # fire immediately on boot
export DATA_PIPELINE_SOURCE_DIR=/tmp/demo_data        # optional alternate CSVs
```

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
2. Browse to http://localhost:9003, create a token, and run:
   ```bash
   sonar-scanner -Dsonar.login=<your-token>
   ```
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

## Troubleshooting tips

* **Missing schemas or tables** – wait for the first successful run of the
  `data_pipeline` DAG.  With the default schedule the initial run occurs within
  five minutes of the stack starting.
* **Need to reset demo data** – stop the stack, delete files in
  `dags/data_source/` (or your custom `DATA_PIPELINE_SOURCE_DIR`), and copy the
  pristine CSVs from version control.
* **SonarScanner fails to authenticate** – ensure the host/port in
  `sonar-project.properties` matches the forwarded port (`9003` by default) and
  regenerate the token after resetting SonarQube.

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