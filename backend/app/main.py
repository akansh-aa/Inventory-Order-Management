from contextlib import asynccontextmanager
from decimal import Decimal
import os

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .config import settings
from .database import Base, engine, get_db
from .models import Customer, Order, OrderItem, Product
from .schemas import (
    CustomerCreate,
    CustomerRead,
    CustomerUpdate,
    OrderCreate,
    OrderRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        seed_demo_data()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_demo_data() -> None:
    db = next(get_db())
    try:
        if db.query(Product).first() or db.query(Customer).first():
            return
        db.add_all(
            [
                Product(
                    name="Wireless Keyboard",
                    sku="KEY-001",
                    description="Compact Bluetooth keyboard",
                    price=Decimal("49.99"),
                    stock=24,
                ),
                Product(
                    name="USB-C Hub",
                    sku="HUB-002",
                    description="7-in-1 adapter for laptops",
                    price=Decimal("39.50"),
                    stock=12,
                ),
                Customer(
                    name="Avery Stone",
                    email="avery@example.com",
                    phone="+1 555 0123",
                    address="41 Market Street",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()


def handle_integrity_error(exc: IntegrityError) -> None:
    message = str(exc.orig).lower()
    if (
        "uq_products_sku" in message
        or "products_sku" in message
        or "products.sku" in message
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product SKU must be unique.",
        ) from exc
    if (
        "uq_customers_email" in message
        or "customers_email" in message
        or "customers.email" in message
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer email must be unique.",
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Request violates a database constraint.",
    ) from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/products", response_model=list[ProductRead])
def list_products(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Product]:
    query = db.query(Product).order_by(Product.name.asc())
    if search:
        like = f"%{search}%"
        query = query.filter((Product.name.ilike(like)) | (Product.sku.ilike(like)))
    return query.all()


@app.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        handle_integrity_error(exc)
    db.refresh(product)
    return product


@app.put("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)
) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        handle_integrity_error(exc)
    db.refresh(product)
    return product


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> None:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    db.delete(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Products used by orders cannot be deleted.",
        ) from exc


@app.get("/customers", response_model=list[CustomerRead])
def list_customers(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Customer]:
    query = db.query(Customer).order_by(Customer.name.asc())
    if search:
        like = f"%{search}%"
        query = query.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))
    return query.all()


@app.post("/customers", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> Customer:
    customer = Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        handle_integrity_error(exc)
    db.refresh(customer)
    return customer


@app.put("/customers/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)
) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        handle_integrity_error(exc)
    db.refresh(customer)
    return customer


@app.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)) -> None:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    db.delete(customer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customers with orders cannot be deleted.",
        ) from exc


@app.get("/orders", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)) -> list[Order]:
    return (
        db.query(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .all()
    )


@app.get("/orders/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    order = (
        db.query(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@app.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)) -> Order:
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    requested_quantities: dict[int, int] = {}
    for item in payload.items:
        requested_quantities[item.product_id] = (
            requested_quantities.get(item.product_id, 0) + item.quantity
        )

    products = (
        db.query(Product)
        .filter(Product.id.in_(requested_quantities.keys()))
        .with_for_update()
        .all()
    )
    product_by_id = {product.id: product for product in products}
    missing_ids = sorted(set(requested_quantities) - set(product_by_id))
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Product ids not found: {', '.join(map(str, missing_ids))}.",
        )

    insufficient = [
        f"{product_by_id[product_id].sku} has {product_by_id[product_id].stock} in stock, requested {quantity}"
        for product_id, quantity in requested_quantities.items()
        if product_by_id[product_id].stock < quantity
    ]
    if insufficient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock: " + "; ".join(insufficient),
        )

    order = Order(customer_id=payload.customer_id, status="placed", total_amount=0)
    db.add(order)
    db.flush()

    total = Decimal("0.00")
    for product_id, quantity in requested_quantities.items():
        product = product_by_id[product_id]
        product.stock -= quantity
        total += product.price * quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=product.price,
            )
        )

    order.total_amount = total
    db.commit()

    created_order = (
        db.query(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .filter(Order.id == order.id)
        .first()
    )
    return created_order


# Serve static files in production if the folder exists
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
