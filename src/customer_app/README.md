# Cafe Commerce full-stack demo

A polished ecommerce ordering experience built for modern cafe lovers. The stack pairs a Node.js middleware API, a MySQL database, and a React + Tailwind single-page application with immersive UI flourishes, lazy-loaded reviews, and Google Maps integration.

## ✨ Features

- **Express API with JWT** authentication, customer registration, admin-ready login, live order management, PDF invoice streaming, and product review endpoints.
- **MySQL schema bootstrapped** through Docker entrypoint scripts providing customer/admin accounts, catalogue, variants, orders, and review data for demos.
- **React interface powered by Vite and Tailwind CSS** with a responsive hero landing page, Amazon-style catalogue filters (category, price, colour, size), product detail pages with lazy-loaded reviews, and add-to-cart flows optimised for mobile and desktop.
- **Personalised themes** that persist per user, downloadable structured invoices (PDF), and a concierge form that emails the platform administration team via Mailhog when running locally.
- **Google Maps embed** highlighting the corporate office at _10 Rue Gaston Levy, Sevran-Livry, France 93270_ so customers can find the flagship store instantly.

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

### Backend service (Express + MySQL)

```bash
cd backend
npm install
npm run dev
```

- Expose `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` via `.env` or your shell before starting.
- On first boot the API checks for the `customers` table and, if missing, automatically executes `sql/init.sql` to create the schema and seed demo data—no manual imports required when running locally.
- The service listens on port `4000` by default; override with `PORT` in the environment.

### Frontend client (Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

- Ensure `VITE_API_BASE_URL` points to the reachable backend (e.g. `http://localhost:4000/api`).
- Additional optional variables such as `VITE_GOOGLE_MAPS_API_KEY` can be set in `frontend/.env`.

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

Authentication is handled via `Authorization: Bearer <token>` headers.

## 🖥️ Frontend highlights

- Mobile-first navigation, animated hero banner, and quick CTA buttons.
- Dynamic filtering (category, price, colour, size) with pill controls and server-backed queries.
- Product detail experiences showing average rating, variant selectors, quantity controls, add-to-cart actions, and infinite-scroll reviews.
- Customer dashboard with personalised themes, order history, invoice downloads, concierge support form, and Google Maps embed of the corporate office.
- Admin console for updating order statuses in real time.

## 🗄️ Database schema summary

- `users`: customer and admin accounts with hashed passwords and roles.
- `products` / `product_variants`: catalogue metadata and sellable variants.
- `orders` / `order_items`: transactional order data with pricing breakdowns.
- `reviews`: customer sentiment powering the product detail lazy-loading experience.

Schema is created automatically when the MySQL container starts for the first time via `sql/init.sql`.

## 🧪 Testing & linting

This starter does not ship with automated tests yet. Integrate Vitest/Jest for frontend and Jest/Supertest for backend as needed. ESLint/Prettier are also great additions for production hardening.

## 🛠️ Troubleshooting

- **Dependencies failing to install?** Check your network access or configure npm mirrors.
- **API cannot connect to MySQL?** Confirm `customer-db` is healthy (`docker compose ps`) and credentials in `backend/.env` match.
- **Frontend cannot reach API?** Update `VITE_API_BASE_URL` in `frontend/.env` to target the reachable host.
- **Docker Desktop complaining about Linux engine?** Switch Docker Desktop to *Use Linux containers* before running `docker compose up --build`.

Enjoy serving delightful cafe experiences!
