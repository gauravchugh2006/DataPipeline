with order_items as (
    select * from {{ ref('stg_order_items') }}
),
products as (
    select * from {{ ref('stg_products') }}
),
payments as (
    select * from {{ ref('stg_payments') }}
),
customers as (
    select * from {{ ref('stg_customers') }}
)

select
    oi.order_id,
    oi.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    oi.product_id,
    p.product_name,
    p.category,
    oi.total_amount,
    oi.order_status,
    pay.payment_method,
    pay.payment_status,
    oi.order_date
from order_items oi
left join products p on oi.product_id = p.product_id
left join payments pay on oi.order_id = pay.order_id
left join customers c on oi.customer_id = c.customer_id;
