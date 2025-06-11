-- models/raw_to_normalized.sql

-- This model combines data from the staged customer, order, product, and payment tables
-- to create a comprehensive, normalized view of the e-commerce data.
-- It serves as the primary data source for analytics and reporting.
-- models/raw_to_normalized.sql

WITH orders AS (
    SELECT * FROM {{ ref('orders') }}
),
customers AS (
    SELECT * FROM {{ ref('customers') }}
),
products AS (
    SELECT * FROM {{ ref('products') }}
),
payments AS (
    SELECT * FROM {{ ref('stg_payments') }}
)
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    o.status,
    o.payment_method,
    o.shipping_address,
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address AS customer_address,
    r.product_id,
    p.product_name AS product_name,
    p.category,
    p.price
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN {{ ref('stg_raw_data') }} r ON o.order_id = r.order_id
LEFT JOIN products p ON r.product_id = p.product_id
