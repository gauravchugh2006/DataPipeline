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

In containerised environments export `PORT` to change the listening
port.  Graceful shutdown is supported via SIGTERM and SIGINT to help the
service co-exist with Docker Compose.
