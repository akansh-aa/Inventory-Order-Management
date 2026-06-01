import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

TEST_DB = BACKEND_DIR / "test_inventory.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_product(client, sku="SKU-001", stock=10, price=12.5):
    response = client.post(
        "/products",
        json={
            "name": f"Product {sku}",
            "sku": sku,
            "description": "Test product",
            "price": price,
            "stock": stock,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_customer(client, email="customer@example.com"):
    response = client.post(
        "/customers",
        json={
            "name": "Test Customer",
            "email": email,
            "phone": "+1 555 0100",
            "address": "100 Test Street",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_product_sku_must_be_unique(client):
    create_product(client, sku="UNIQUE-001")

    response = client.post(
        "/products",
        json={
            "name": "Duplicate SKU",
            "sku": "UNIQUE-001",
            "description": None,
            "price": 5,
            "stock": 3,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Product SKU must be unique."


def test_customer_email_must_be_unique(client):
    create_customer(client, email="unique@example.com")

    response = client.post(
        "/customers",
        json={
            "name": "Duplicate Email",
            "email": "unique@example.com",
            "phone": None,
            "address": None,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Customer email must be unique."


def test_order_reduces_product_stock(client):
    product = create_product(client, sku="STOCK-001", stock=7, price=20)
    customer = create_customer(client)

    response = client.post(
        "/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 3}],
        },
    )

    assert response.status_code == 201, response.text
    order = response.json()
    assert order["total_amount"] == "60.00"

    products = client.get("/products").json()
    updated_product = next(item for item in products if item["id"] == product["id"])
    assert updated_product["stock"] == 4


def test_order_is_rejected_when_stock_is_insufficient(client):
    product = create_product(client, sku="LOW-001", stock=2, price=15)
    customer = create_customer(client)

    response = client.post(
        "/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 3}],
        },
    )

    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]

    products = client.get("/products").json()
    unchanged_product = next(item for item in products if item["id"] == product["id"])
    assert unchanged_product["stock"] == 2
