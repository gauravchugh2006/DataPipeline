# Cafe Commerce full-stack demo

A polished ecommerce ordering experience built for modern cafe lovers. The stack pairs a Node.js middleware API, a MySQL database, and a React + Tailwind single-page application with immersive UI flourishes, lazy-loaded reviews, and Google Maps integration.

## ✨ Features

- **Express API with JWT** authentication, customer registration, admin-ready login, live order management, PDF invoice streaming, loyalty preferences, transparency insights, and product review endpoints.
- **MySQL schema bootstrapped** through Docker entrypoint scripts providing customer/admin accounts, catalogue, variants, orders, CSR metadata, reminder preferences, notification outbox, analytics events, and review data for demos.
- **React interface powered by Vite and Tailwind CSS** with a responsive hero landing page, Amazon-style catalogue filters (category, price, colour, size), product detail pages with lazy-loaded reviews, loyalty reminder configuration panels, and add-to-cart flows optimised for mobile and desktop.
- **Personalised themes** that persist per user, downloadable structured invoices (PDF), an analytics hook that records engagement, and a concierge form that emails the platform administration team via Mailhog when running locally.
- **Google Maps embed** highlighting the corporate office at _10 Rue Gaston Levy, Sevran-Livry, France 93270_ so customers can find the flagship store instantly.
- **Airflow + dbt data platform** that ingests logistics, loyalty, and support feeds, scores loyalty recommendations, models trust KPIs, and pushes transparency datasets into Postgres/MinIO with Slack notifications on pipeline health.

## 🧭 Repository structure

```
src/customer_app/
├── backend/              # Express API source code
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── sql/init.sql      # Bootstraps schema, demo users, and sample menu items
│   └── src/
├── frontend/             # React SPA with Tailwind styling
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── vite.config.js
│   └── src/
├── docker-compose.yml    # Orchestrates MySQL, Mailhog, API, and frontend
└── README.md             # You are here
```

## 🚀 Getting started

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 18+ and npm if you want to run services outside of Docker

### Clone & install dependencies

```bash
git clone <repo-url>
cd DataPipeline/src/customer_app
npm install --prefix backend
npm install --prefix frontend
```

### Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the files to match your secrets (JWT key, SMTP credentials, Google Maps key). The defaults work for local Docker usage with Mailhog.

The backend also connects to a Postgres analytical warehouse for loyalty and trust reporting. Populate the `POSTGRES_DWH_*` variables (or a single `POSTGRES_DWH_CONN`) plus optional `LOYALTY_RECOMMENDATION_LIMIT`, `TRUST_REPORT_LIMIT`, and `TRUST_TARGET_TABLE` settings so the new transparency endpoints can query mart tables successfully.

### Launch with Docker Compose

1. Ensure Docker Desktop/Engine is running in Linux container mode.
2. From `src/customer_app`, run:

```bash
docker compose up --build
```

- API available at [http://localhost:4000](http://localhost:4000)
- Frontend served at [http://localhost:5173](http://localhost:5173)
- MySQL exposed on `localhost:3307` (user: `ccd_user`, password: `ccd_password`)
- Mailhog UI for captured emails at [http://localhost:8025](http://localhost:8025)

### Seeded accounts

The SQL bootstrap script provisions demo identities:

- **Administrator** — email: `admin@cafecoffeeday.com`, password: `admin123`
- **Customer** — email: `customer@cafecoffeeday.com`, password: `admin123`

### Admin workspace

Authenticated administrators can visit [`/admin`](http://localhost:5173/admin) to access a responsive control centre powered by React Query and TanStack Table. The workspace includes:

- **Products grid** with inline create, update, delete flows, plus CSV/XLSX exports that honour active filters and sort order.
- **Customers grid** for editing identities, resetting passwords, and exporting role-scoped datasets.
- **Orders grid** with live status adjustments, bulk exports, and transactional history filters.

All admin API calls require a bearer token issued to a user whose `role` is `admin`.

### Backend service (Express + MySQL)

```bash
cd backend
npm install
npm run dev
```

- Expose `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` via `.env` or your shell before starting.
- On first boot the API checks for the `customers` table and, if missing, automatically executes `sql/init.sql` to create the schema and seed demo data—no manual imports required when running locally.
- The service listens on port `4000` by default; override with `PORT` in the environment.

#### API exploration with Swagger UI

- The middleware now publishes live OpenAPI docs at [http://localhost:4000/docs](http://localhost:4000/docs). Override the base path with `SWAGGER_PATH` and the advertised server URL with `SWAGGER_SERVER_URL` when deploying remotely.
- To verify endpoints from the Docker Compose stack:
  1. `cd src/customer_app && docker compose up --build` to start MySQL, Mailhog, the API, and the frontend.
  2. Run `docker compose ps` until `customer_app-backend` reports `healthy`, then open the `/docs` URL above.
  3. Call **/api/auth/login** with the seeded credentials, copy the returned token, and click **Authorize** in Swagger UI to paste it into the `bearerAuth` modal.
  4. Exercise secured operations such as **GET /api/orders** or **PUT /api/auth/profile** directly in the browser, or leave the token blank to test public endpoints like **/health** and **/api/products**.

### Frontend client (Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

- Ensure `VITE_API_BASE_URL` points to the reachable backend (e.g. `http://localhost:4000/api`).
- Additional optional variables such as `VITE_GOOGLE_MAPS_API_KEY` can be set in `frontend/.env`.

#### Theme previews & toggles

- Theme selections now rely on shared CSS variables, so switching palettes from the dashboard or the navigation toggle instantly recolours hero gradients, CTAs, cards, and inputs without a full reload.
- Selections persist per browser session via `localStorage` and sync to your profile after authentication, meaning you can refresh, sign out, or open another tab without losing your preference.
- Test the high-contrast experiences by selecting **Midnight**/**Noir** inside the dashboard profile card or tapping the sun/moon button in the global header to flip between Sunrise and Midnight on demand.

### Running without Docker

When operating both services outside of Docker, start the backend first so the database bootstrap completes. Then launch the frontend and open [http://localhost:5173](http://localhost:5173). Mailhog-dependent features (e.g. concierge emails) will require an SMTP service if Docker is not running.

## 🌐 API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new customer account |
| POST | `/api/auth/login` | Login and receive a JWT token |
| GET | `/api/products` | Browse catalogue with query filters |
| GET | `/api/products/:id` | Product detail including variants |
| GET | `/api/products/:id/reviews` | Fetch paginated reviews (10 at a time) |
| POST | `/api/products/:id/reviews` | Submit a review (authenticated customers) |
| GET | `/api/orders` | List orders (customer scoped / admin sees all) |
| POST | `/api/orders` | Create a new order for the signed-in user |
| GET | `/api/orders/:orderId` | View a single order |
| PATCH | `/api/orders/:orderId/status` | Update order status (admin only) |
| GET | `/api/orders/:orderId/invoice` | Download a structured invoice PDF |
| POST | `/api/support/contact` | Send concierge requests to the admin inbox |
| GET | `/api/loyalty/bundles` | Fetch curated add-on bundles for reminder flows (auth required) |
| GET | `/api/loyalty/preferences` | Retrieve the signed-in customer's reminder cadence |
| PUT | `/api/loyalty/preferences` | Update reminder frequency/channel/bundles and queue notifications |
| GET | `/api/loyalty/recommendations` | Surface segment-based loyalty recommendations from Postgres |
| POST | `/api/analytics/events` | Record customer analytics events and CSR awareness interactions |
| GET | `/api/trust/metrics` | Read transparency KPIs sourced from the trust mart |
| GET | `/api/trust/metrics/export` | Download the trust metrics as CSV for offline analysis |

Authentication is handled via `Authorization: Bearer <token>` headers.

## 🖥️ Frontend highlights

- Mobile-first navigation, animated hero banner, and quick CTA buttons.
- Dynamic filtering (category, price, colour, size) with pill controls and server-backed queries.
- Product detail experiences showing average rating, variant selectors, quantity controls, add-to-cart actions, and infinite-scroll reviews.
- Customer dashboard with personalised themes, order history, invoice downloads, concierge support form, loyalty reminder configuration, and CSR transparency messaging sourced from the analytics API.
- Admin console with routed grids (products, customers, orders) supporting inline CRUD, role-aware access, and CSV/XLSX exports.

## 🗄️ Database schema summary

- `customers`: customer and admin accounts with hashed passwords and roles.
- `products` / `product_variants`: catalogue metadata and sellable variants.
- `csr_metadata`: sustainability footprints, certifications, and verification cadence tied to each product.
- `orders` / `order_items` / `payments`: transactional order data with pricing breakdowns and settlement states.
- `reviews`: customer sentiment powering the product detail lazy-loading experience.
- `reminder_preferences`: loyalty reminder cadence, channel, and bundle selections per customer.
- `notification_outbox`: queued notifications for reminder updates, including status and payloads.
- `analytics_events`: structured engagement events captured from the frontend analytics hook.

Schema is created automatically when the MySQL container starts for the first time via `sql/init.sql`.

## 📈 Data platform enhancements

- **Loyalty recommendation pipeline** — Daily Airflow DAG (`dags/loyalty_recommendation_dag.py`) chains dataset ingestion helpers, a scoring transform, and Slack alerts while persisting mart outputs to Postgres and MinIO.
- **Trust score mart** — Delivery/support extracts load into dbt models that publish `mart_trust_scores`, which the `/api/trust` endpoints expose for transparency dashboards.
- **Logistics enrichment** — Additional ingestion operators and dbt layers capture distributor master data, stockist inventory freshness, and SLA adherence, enriching the analytics warehouse for support-ready queries.

## 🧪 Testing & linting

### Playwright smoke tests

End-to-end smoke coverage lives in `frontend/tests/admin.spec.js` and verifies admin CRUD flows plus CSV exports. To execute the suite locally:

```bash
# in one terminal start the stack (e.g. via docker compose or npm scripts)
export CAFE_APP_URL="http://localhost:5173"
export CAFE_ADMIN_EMAIL="admin@cafecoffeeday.com"
export CAFE_ADMIN_PASSWORD="admin123"
npm install --prefix frontend
npm run test:e2e --prefix frontend
```

The environment variables tell Playwright which base URL to drive and which credentials to use for the admin login form.

## 🛠️ Troubleshooting

- **Dependencies failing to install?** Check your network access or configure npm mirrors.
- **API cannot connect to MySQL?** Confirm `customer-db` is healthy (`docker compose ps`) and credentials in `backend/.env` match.
- **Frontend cannot reach API?** Update `VITE_API_BASE_URL` in `frontend/.env` to target the reachable host.
- **Docker Desktop complaining about Linux engine?** Switch Docker Desktop to *Use Linux containers* before running `docker compose up --build`.

Enjoy serving delightful cafe experiences!
