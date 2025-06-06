-- models/raw_to_normalized.sql

-- This model combines data from the staged customer, order, product, and payment tables
-- to create a comprehensive, normalized view of the e-commerce data.
-- It serves as the primary data source for analytics and reporting.

WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),

orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),

products AS (
    SELECT * FROM {{ ref('stg_products') }}
),

payments AS (
    SELECT * FROM {{ ref('stg_payments') }}
)

SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    o.status AS order_status,
    o.payment_method,
    o.shipping_address,

    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address AS customer_address,
    c.created_at AS customer_created_at,

    -- Note: This assumes a simple link between orders and products based on the combined raw data.
    -- In a more complex scenario with an 'order_items' table, you would join to that
    -- to link specific products purchased in an order. For this simplified setup,
    -- we'll just pull in product details from the 'products' dimension.
    -- If your raw_data had product_id per order_line, we'd join on that for detailed line items.
    -- Since the sample CSV provided implicitly groups products with orders by having product details
    -- on the same row as order details, we'll aim for a denormalized "order-with-product-summary"
    -- if the original raw_data supports it for this final view, or keep products separate.
    -- Given the provided schema.yml has a 'products' table, we will assume a separate dimension.
    -- For a joined view like this, we'd need to link product_id from the original raw_data.
    -- Reconsidering: The `sample_data.csv` has `product_id` on each row.
    -- Let's include `product_id` from the raw data and then join to the `products` dimension.
    srd.product_id,
    p.name AS product_name,
    p.category AS product_category,
    p.price AS product_price,

    pay.payment_id,
    pay.status AS payment_transaction_status -- Renamed to avoid conflict with order_status

FROM
    orders o
JOIN
    customers c ON o.customer_id = c.customer_id
LEFT JOIN
    {{ ref('stg_raw_data') }} srd ON o.order_id = srd.order_id -- Join back to original raw_data for product_id on order_line
LEFT JOIN
    products p ON srd.product_id = p.product_id
LEFT JOIN
    payments pay ON o.order_id = pay.order_id -- Assuming one payment per order for simplicity
