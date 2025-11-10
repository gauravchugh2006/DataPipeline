"""Utilities for generating synthetic ecommerce orders and customers."""
from __future__ import annotations

import csv
import json
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List

DATA_DIR = Path(__file__).resolve().parent / "data_source"
ORDERS_FILE = DATA_DIR / "sample_data.csv"
CUSTOMERS_FILE = DATA_DIR / "customers_source.csv"
STATE_FILE = DATA_DIR / "order_generation_state.json"

ORDER_COLUMNS = [
    "order_id",
    "customer_id",
    "order_date",
    "total_amount",
    "order_level_payment_status",
    "product_id",
    "product_name",
    "category",
    "price",
    "payment_id",
    "payment_method",
    "transaction_payment_status",
]

CUSTOMER_COLUMNS = [
    "customer_id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "address",
    "signup_date",
]

PRODUCT_CATALOG = [
    {
        "product_id": 201,
        "product_name": "Laptop",
        "category": "Electronics",
        "price": 1200.00,
    },
    {
        "product_id": 202,
        "product_name": "Wireless Mouse",
        "category": "Electronics",
        "price": 30.00,
    },
    {
        "product_id": 203,
        "product_name": "Casual T-Shirt",
        "category": "Apparel",
        "price": 25.00,
    },
    {
        "product_id": 204,
        "product_name": "Noise-Cancelling Headphones",
        "category": "Electronics",
        "price": 180.00,
    },
    {
        "product_id": 205,
        "product_name": "Mechanical Keyboard",
        "category": "Electronics",
        "price": 60.00,
    },
    {
        "product_id": 206,
        "product_name": "Espresso Machine",
        "category": "Home Goods",
        "price": 75.50,
    },
    {
        "product_id": 207,
        "product_name": "Sci-Fi Novel",
        "category": "Books",
        "price": 15.00,
    },
    {
        "product_id": 208,
        "product_name": "Reading Light",
        "category": "Books",
        "price": 10.00,
    },
    {
        "product_id": 209,
        "product_name": "Smartwatch",
        "category": "Electronics",
        "price": 120.00,
    },
    {
        "product_id": 210,
        "product_name": "Running Shoes",
        "category": "Apparel",
        "price": 45.00,
    },
    {
        "product_id": 211,
        "product_name": "Blender",
        "category": "Home Goods",
        "price": 80.00,
    },
    {
        "product_id": 212,
        "product_name": "Yoga Mat",
        "category": "Sports",
        "price": 25.00,
    },
    {
        "product_id": 213,
        "product_name": "Gaming Monitor",
        "category": "Electronics",
        "price": 350.00,
    },
]

PAYMENT_METHODS = ["Credit Card", "PayPal", "Bank Transfer"]
PAYMENT_STATUSES = ["Paid", "Pending", "Refunded"]

FIRST_NAMES = [
    "Alex",
    "Taylor",
    "Jordan",
    "Morgan",
    "Riley",
    "Casey",
    "Jamie",
    "Avery",
    "Drew",
    "Hayden",
]

LAST_NAMES = [
    "Campbell",
    "Henderson",
    "Parker",
    "Reed",
    "Walker",
    "Ramirez",
    "Cooper",
    "Murphy",
    "Bailey",
    "Flores",
]

ADDRESSES = [
    "123 Market St, Springfield, USA",
    "456 River Rd, Lakeside, USA",
    "789 Hillcrest Ave, Mountain View, USA",
    "321 Ocean Blvd, Seaside, USA",
    "654 Forest Ln, Woodtown, USA",
]


@dataclass
class OrderRow:
    order_id: int
    customer_id: int
    order_date: str
    total_amount: float
    order_level_payment_status: str
    product_id: int
    product_name: str
    category: str
    price: float
    payment_id: int
    payment_method: str
    transaction_payment_status: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "order_id": str(self.order_id),
            "customer_id": str(self.customer_id),
            "order_date": self.order_date,
            "total_amount": f"{self.total_amount:.2f}",
            "order_level_payment_status": self.order_level_payment_status,
            "product_id": str(self.product_id),
            "product_name": self.product_name,
            "category": self.category,
            "price": f"{self.price:.2f}",
            "payment_id": str(self.payment_id),
            "payment_method": self.payment_method,
            "transaction_payment_status": self.transaction_payment_status,
        }


def _load_state() -> Dict[str, int]:
    if not STATE_FILE.exists():
        return {"next_customer_batch_size": 2}
    try:
        return json.loads(STATE_FILE.read_text())
    except json.JSONDecodeError:
        return {"next_customer_batch_size": 2}


def _save_state(state: Dict[str, int]) -> None:
    STATE_FILE.write_text(json.dumps(state))


def _read_int_column(rows: Iterable[Dict[str, str]], column: str) -> List[int]:
    values: List[int] = []
    for row in rows:
        try:
            values.append(int(row[column]))
        except (KeyError, TypeError, ValueError):
            continue
    return values


def _random_phone() -> str:
    digits = "".join(str(random.randint(0, 9)) for _ in range(10))
    return f"+1{digits}"


def _format_timestamp(ts: datetime) -> str:
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def _derive_transaction_status(order_status: str) -> str:
    if order_status == "Paid":
        return "Completed"
    if order_status == "Pending":
        return "Pending"
    return "Refunded"


def _generate_customer(customer_id: int) -> Dict[str, str]:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    email = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@example.com"
    address = random.choice(ADDRESSES)
    signup_date = _format_timestamp(datetime.utcnow())
    return {
        "customer_id": str(customer_id),
        "first_name": first,
        "last_name": last,
        "email": email,
        "phone": _random_phone(),
        "address": address,
        "signup_date": signup_date,
    }


def _generate_order(
    order_id: int,
    customer_id: int,
    payment_id: int,
    base_timestamp: datetime,
    offset_seconds: int,
) -> OrderRow:
    product = random.choice(PRODUCT_CATALOG)
    payment_status = random.choice(PAYMENT_STATUSES)
    transaction_status = _derive_transaction_status(payment_status)
    payment_method = random.choice(PAYMENT_METHODS)
    timestamp = base_timestamp + timedelta(seconds=offset_seconds)

    return OrderRow(
        order_id=order_id,
        customer_id=customer_id,
        order_date=_format_timestamp(timestamp),
        total_amount=product["price"],
        order_level_payment_status=payment_status,
        product_id=product["product_id"],
        product_name=product["product_name"],
        category=product["category"],
        price=product["price"],
        payment_id=payment_id,
        payment_method=payment_method,
        transaction_payment_status=transaction_status,
    )


def _append_rows(file_path: Path, fieldnames: List[str], rows: Iterable[Dict[str, str]]) -> None:
    file_exists = file_path.exists()
    with file_path.open("a", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def generate_orders() -> None:
    """Create 20 orders from existing users and 10 orders from new users.

    The number of new users alternates between batches of two and three. New
    customers are appended to ``customers_source.csv`` and their orders are
    appended to ``sample_data.csv``.
    """

    if not ORDERS_FILE.exists():
        raise FileNotFoundError(f"Orders file not found: {ORDERS_FILE}")
    if not CUSTOMERS_FILE.exists():
        raise FileNotFoundError(f"Customers file not found: {CUSTOMERS_FILE}")

    with ORDERS_FILE.open("r", newline="") as csvfile:
        order_reader = csv.DictReader(csvfile)
        existing_orders = list(order_reader)

    with CUSTOMERS_FILE.open("r", newline="") as csvfile:
        customer_reader = csv.DictReader(csvfile)
        existing_customers = list(customer_reader)

    if not existing_customers:
        raise ValueError("Customer file must contain at least one row")

    max_order_id = max(_read_int_column(existing_orders, "order_id") or [0])
    max_payment_id = max(_read_int_column(existing_orders, "payment_id") or [0])
    existing_customer_ids = _read_int_column(existing_customers, "customer_id")
    original_customer_ids = list(existing_customer_ids)

    state = _load_state()
    next_batch_size = state.get("next_customer_batch_size", 2)
    next_batch_size = 2 if next_batch_size not in (2, 3) else next_batch_size
    next_state_size = 3 if next_batch_size == 2 else 2

    max_customer_id = max(existing_customer_ids or [100])
    new_customers: List[Dict[str, str]] = []
    for _ in range(next_batch_size):
        max_customer_id += 1
        customer_row = _generate_customer(max_customer_id)
        new_customers.append(customer_row)

    # Append new customers first so subsequent batches treat them as existing.
    if new_customers:
        _append_rows(CUSTOMERS_FILE, CUSTOMER_COLUMNS, new_customers)
        existing_customer_ids.extend(int(row["customer_id"]) for row in new_customers)

    base_timestamp = datetime.utcnow()
    order_rows: List[OrderRow] = []

    # 20 orders from existing customers (before adding new ones).
    existing_pool = original_customer_ids or existing_customer_ids

    for index in range(20):
        customer_id = random.choice(existing_pool)
        order_id = max_order_id + len(order_rows) + 1
        payment_id = max_payment_id + len(order_rows) + 1
        order_rows.append(
            _generate_order(
                order_id=order_id,
                customer_id=customer_id,
                payment_id=payment_id,
                base_timestamp=base_timestamp,
                offset_seconds=index,
            )
        )

    # 10 orders from newly created customers.
    new_customer_ids = [int(row["customer_id"]) for row in new_customers]
    for index in range(10):
        customer_id = random.choice(new_customer_ids or existing_customer_ids)
        order_id = max_order_id + len(order_rows) + 1
        payment_id = max_payment_id + len(order_rows) + 1
        order_rows.append(
            _generate_order(
                order_id=order_id,
                customer_id=customer_id,
                payment_id=payment_id,
                base_timestamp=base_timestamp,
                offset_seconds=20 + index,
            )
        )

    _append_rows(ORDERS_FILE, ORDER_COLUMNS, (row.to_dict() for row in order_rows))

    state["next_customer_batch_size"] = next_state_size
    _save_state(state)


if __name__ == "__main__":
    generate_orders()
