with source_data as (
    select * from {{ source('raw', 'raw_data') }}
)

select
    cast(order_id as integer) as order_id,
    cast(customer_id as integer) as customer_id,
    cast(product_id as integer) as product_id,
    order_level_payment_status as order_status,
    cast(total_amount as numeric) as total_amount,
    cast(order_date as timestamp) as order_date
from source_data;
