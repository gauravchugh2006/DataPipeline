with source_data as (
    select * from {{ source('raw', 'deliveries') }}
)

select
    cast(order_id as integer) as order_id,
    cast(promised_delivery_ts as timestamp) as promised_delivery_ts,
    cast(actual_delivery_ts as timestamp) as actual_delivery_ts,
    delivery_partner,
    exception_flag
from source_data;
