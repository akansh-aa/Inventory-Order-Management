# Inventory & Order Management System

A simplified inventory and order management app built with FastAPI, React, PostgreSQL, and Docker Compose.

## Features

- Product management with unique SKU validation
- Customer management with unique email validation
- Order creation with inventory validation
- Automatic stock reduction when an order is placed
- PostgreSQL-backed persistence
- Responsive React operations UI
- Dockerized frontend, backend, and database services
- Environment-variable configuration with no hardcoded production credentials

## Tech Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, Vite, lucide-react
- Database: PostgreSQL
- Containers: Docker, Docker Compose

## Run Locally

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Start the full stack:

```bash
docker compose up --build
```

3. Open the app:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

The default Compose setup seeds a few demo records. Set `SEED_DEMO_DATA=false` in `.env` for an empty database.

## Backend API

Core endpoints:

- `GET /health`
- `GET /products`
- `POST /products`
- `PUT /products/{product_id}`
- `DELETE /products/{product_id}`
- `GET /customers`
- `POST /customers`
- `PUT /customers/{customer_id}`
- `DELETE /customers/{customer_id}`
- `GET /orders`
- `GET /orders/{order_id}`
- `POST /orders`

## Business Rules

- Product SKUs are unique at the database level and handled as `409 Conflict`.
- Customer emails are unique at the database level and handled as `409 Conflict`.
- Product price and stock cannot be negative.
- Order item quantities must be positive.
- Order creation locks selected product rows, validates the combined requested quantities, creates the order, and reduces stock in a single transaction.
- Orders are rejected when any requested product has insufficient stock.

## Environment Variables

Backend:

- `APP_NAME`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `SEED_DEMO_DATA`

Frontend:

- `VITE_API_URL`

Database:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## Deployment Guide

Recommended free-hosting path, verified against provider docs in June 2026:

1. Create a free PostgreSQL database on Neon or Supabase.
2. Deploy the backend Docker image on Render as a Web Service. Render free web services can spin down when idle.
3. Deploy the frontend on Cloudflare Pages, Vercel Hobby, or Netlify Free.
4. Set frontend `VITE_API_URL` to the deployed backend URL.
5. Set backend `DATABASE_URL` to the hosted PostgreSQL connection string.
6. Set backend `CORS_ORIGINS` to the deployed frontend URL.

Provider docs:

- Render free services: https://render.com/free
- Render Docker services: https://render.com/docs/docker
- Neon pricing: https://neon.com/pricing
- Supabase pricing: https://supabase.com/pricing
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Vercel Hobby plan: https://vercel.com/docs/accounts/plans/hobby
- Netlify pricing: https://www.netlify.com/pricing/

Build and push Docker images:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/inventory-api:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/inventory-api:latest

docker build --build-arg VITE_API_URL=https://YOUR_BACKEND_URL -t YOUR_DOCKERHUB_USERNAME/inventory-web:latest ./frontend
docker push YOUR_DOCKERHUB_USERNAME/inventory-web:latest
```

## Submission Checklist

Fill these in after publishing with your own accounts:

- GitHub repository: `TODO`
- Backend Docker image: `TODO`
- Frontend Docker image: `TODO`
- Live frontend URL: `TODO`
- Live backend URL: `TODO`
