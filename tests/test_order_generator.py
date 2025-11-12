from __future__ import annotations

import csv
import json

import order_generator


def _write_csv(path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def test_generate_orders_appends_batches(tmp_path, monkeypatch):
    data_dir = tmp_path / "data_source"
    orders_file = data_dir / "sample_data.csv"
    customers_file = data_dir / "customers_source.csv"

    existing_orders = [
        {
            "order_id": "1",
            "customer_id": "101",
            "order_date": "2024-01-01 00:00:00",
            "total_amount": "100.00",
            "order_level_payment_status": "Paid",
            "product_id": "201",
            "product_name": "Laptop",
            "category": "Electronics",
            "price": "100.00",
            "payment_id": "5001",
            "payment_method": "Credit Card",
            "transaction_payment_status": "Completed",
        }
    ]
    existing_customers = [
        {
            "customer_id": "101",
            "first_name": "Alex",
            "last_name": "Smith",
            "email": "alex.smith@example.com",
            "phone": "+15550000001",
            "address": "123 Main St",
            "signup_date": "2024-01-01 00:00:00",
        }
    ]

    _write_csv(orders_file, order_generator.ORDER_COLUMNS, existing_orders)
    _write_csv(customers_file, order_generator.CUSTOMER_COLUMNS, existing_customers)

    # Ensure deterministic selections during the test run.
    monkeypatch.setenv(order_generator.DATA_SOURCE_ENV, str(data_dir))
    monkeypatch.setattr(order_generator.random, "choice", lambda seq: seq[0])
    monkeypatch.setattr(order_generator.random, "randint", lambda a, b: a)

    order_generator.generate_orders()

    with orders_file.open() as handle:
        rows = list(csv.DictReader(handle))
    with customers_file.open() as handle:
        customers = list(csv.DictReader(handle))

    # Existing order + 30 generated rows (20 from the existing pool, 10 new).
    assert len(rows) == len(existing_orders) + 30

    # Two new customers should be appended in the first run.
    assert len(customers) == len(existing_customers) + 2

    state_path = data_dir / "order_generation_state.json"
    state = json.loads(state_path.read_text())
    assert state["next_customer_batch_size"] == 3
