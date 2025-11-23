# Customer web client (frontend)

React + Vite SPA that delivers the cafe commerce experience. It consumes the
backend API and Gold-layer marts (trust metrics, loyalty bundles) produced by
the shared Medallion data pipeline.

## Local development

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to the reachable backend URL. Optional extras
include `VITE_GOOGLE_MAPS_API_KEY` for the embedded map.

## Build & deployment (AWS + Azure)

- **Build**: Jenkins runs `npm run build` and packages the static assets into a
  container image alongside the backend build. The same tag is pushed to ECR/ACR.
- **AWS**: Terraform deploys the image to ECS Fargate (or another container
  target) behind the Application Load Balancer route used by the backend. CloudFront
  is optional for CDN caching.
- **Azure**: With `cloud_provider="azure"`, the Azure module can wire the image to
  Azure Container Apps or App Service for Containers. Front Door or CDN endpoints
  can front the service without changing the build.
- **Data alignment**: No code changes are required when moving clouds because the
  API contract to Gold marts stays stable. Verify by loading `/admin` and
  confirming KPI tiles fed by `mart_daily_revenue` and `mart_trust_scores` render
  correctly after each deployment.

## Data pipeline alignment and migration guardrails

- **Bronze/Silver parity**: PySpark/Databricks notebooks ingest the same sample
  CSVs (`orders.csv`, `products.csv`) into S3 or ADLS and cleanse them before
  the frontend requests data. UI filtering logic assumes deduplicated `order_id`
  keys and standardised currencies coming from Silver.
- **Gold consumption**: Dashboard tiles, exports, and transparency banners read
  from `mart_daily_revenue` and `mart_trust_scores`. Schema stability lets the
  React components behave the same on AWS (Postgres/Redshift) and Azure
  (Databricks SQL/Synapse).
- **Azure specifics**: Use the shared Terraform variables and Jenkins pipeline;
  only credentials and `cloud_provider` change. After deployment, run a quick UI
  smoke test on `/admin` to validate Gold marts load via Databricks.
- **Challenges mitigated**: Schema drift in Bronze files is quarantined before
  reaching the UI; Key Vault mirrors Secrets Manager names to avoid env var
  churn; partitioning/Z-ordering keeps fetches fast enough for the SPA.
