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

## Deployment Guide (Render Blueprint - One-Click Deployment)

This application is configured for a **Unified Single-Service Deployment** on Render. The React frontend is compiled automatically inside the backend's multi-stage Docker build and served by the FastAPI application.

### Why this is awesome:
- **Zero Configuration**: No manual backend URL environment syncing is needed.
- **Zero CORS Issues**: The frontend and backend run on the exact same port and domain.
- **Free Tier Friendly**: You only need to deploy **one** Web Service and **one** PostgreSQL Database on Render, conserving free active hours.

### Steps to Deploy:
1. Push your code to your GitHub repository: `https://github.com/akansh-aa/Inventory-Order-Management`
2. Log in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically parse the `render.yaml` file and prompt you to create:
   - **`inventory-db`**: A free PostgreSQL Database.
   - **`inventory-app`**: A free Web Service running the unified Docker build.
6. Click **Approve** or **Apply**.
7. Once the deploy succeeds, open your unified Web Service's URL. The entire React dashboard is fully functional and connected directly to the backend!

### Manual / Local Docker Build

To build and run the unified multi-stage container locally:

```bash
# Build the unified image
docker build -t inventory-unified -f Dockerfile .

# Run the unified container with a local SQLite database for quick testing
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./test.db -e SEED_DEMO_DATA=true inventory-unified
```

To build and push to DockerHub for submission:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/inventory-unified:latest -f Dockerfile .
docker push YOUR_DOCKERHUB_USERNAME/inventory-unified:latest
```

## Submission Checklist

Fill these in after publishing with your own accounts:

- GitHub repository: [akansh-aa/Inventory-Order-Management](https://github.com/akansh-aa/Inventory-Order-Management)
- Unified Docker image: `YOUR_DOCKERHUB_USERNAME/inventory-unified:latest`
- Live application URL: `https://inventory-app-xxxx.onrender.com`

