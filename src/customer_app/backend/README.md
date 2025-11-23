# Customer API (backend)

Express + MySQL service that powers authentication, orders, invoices, loyalty
recommendations, and trust metrics for the cafe commerce experience. The API
reads Gold-layer marts produced by the data platform (dbt/PySpark in Airflow or
Databricks) so responses stay aligned with the Medallion architecture.

## Configuration

- Copy `.env.example` to `.env` and set:
  - MySQL connection vars (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
    `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
  - Postgres/DW vars for mart access (`POSTGRES_DWH_*` or
    `POSTGRES_DWH_CONN`).
  - JWT secret and SMTP/Mailhog settings for email flows.
- The API auto-runs `sql/init.sql` on first boot to seed demo data.

## Running locally
# Cafe Backend

Express-based backend for the customer application that exposes loyalty
recommendations, trust transparency reports, logistics insights, reminder
preferences, and an authenticated admin console.

## Available routes

- `GET /health` – service health check.
- `GET /api/loyalty/recommendations` – list loyalty recommendations with
  pagination and filtering by customer, segment, and status.
- `GET /api/loyalty/recommendations/:customerId/summary` – return a
  summarised view for a single customer.
- `GET /api/transparency/trust/scores` – composite trust score feed.
- `GET /api/transparency/logistics/snapshots` – logistics SLA and
  inventory snapshots.
- `GET /api/reminders/configurations` – fetch reminder preferences.
- `POST /api/reminders/configurations` – create or update reminder
  preferences (requires `x-admin-role` header with `csr`, `editor`, or
  `admin`).
- `GET /api/admin/:entity` – list admin entities (`products`,
  `customers`, `orders`) with pagination and export support. Requires an
  `x-admin-role` header set to `admin` or `editor`.
- `POST /api/admin/:entity` – create entities.
- `PUT /api/admin/:entity/:id` – update entities.
- `DELETE /api/admin/:entity/:id` – delete entities.

Set `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, and
`POSTGRES_PASSWORD` to point at the analytics warehouse. Optional pools
(`LOYALTY_DB`, `ANALYTICS_DB`) can be provided when loyalty data lives in
separate schemas.

## Development

```bash
npm install
npm run dev
```

Ensure MySQL is reachable and exposed variables are loaded. Swagger UI lives at
`/docs` once the server is up.

## Deploying via Terraform/Jenkins (AWS + Azure)

- **Images**: Jenkins builds and tags the backend image for both clouds. No
  pipeline changes are required—Terraform consumes the same outputs.
- **AWS target**: ECS Fargate task with secrets from SSM/Secrets Manager and
  ALB routing to `/api`. Airflow on ECS reads Bronze/Silver, dbt publishes Gold
  marts consumed by this API.
- **Azure target**: Set `cloud_provider="azure"` in the environment tfvars.
  The Azure Terraform module can point to Azure Container Apps or App Service
  for Containers, injecting secrets from Key Vault and wiring to ADLS Gen2/
  Databricks-hosted marts. Databricks jobs keep producing Bronze→Silver→Gold so
  API contract remains unchanged.
- **Validation**: After apply, hit `/health`, `/api/trust/metrics`, and
  `/api/loyalty/recommendations` to confirm Gold marts are reachable from the
  selected cloud.

## Medallion alignment and operational notes

- **Bronze → Silver controls**: PySpark notebooks ingest `orders.csv`/`products.csv`
  into S3 or ADLS, then deduplicate by `order_id` and enforce currency formats.
  The API reads only Silver/Gold outputs, so malformed Bronze data never reaches
  consumers.
- **Gold mart consumption**: Endpoints such as `/api/trust/metrics` and
  `/api/loyalty/recommendations` query dbt/PySpark marts (`mart_trust_scores`,
  `mart_loyalty_recommendations`). Schemas double as contracts for the React
  admin grid and CSV exports.
- **Challenges addressed**:
  - Schema drift handled via schema-on-read + `silver_rejects` quarantine so
    joins remain stable across AWS and Azure.
  - Secrets mapped consistently between AWS Secrets Manager and Azure Key Vault
    to avoid environment mismatches during CI/CD.
  - Latency controlled through Delta Z-ordering/Postgres indexing to keep KPI
    responses sub-200ms even when Databricks is the serving engine.
In containerised environments export `PORT` to change the listening
port.  Graceful shutdown is supported via SIGTERM and SIGINT to help the
service co-exist with Docker Compose.
