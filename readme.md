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