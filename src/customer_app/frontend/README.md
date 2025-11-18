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
