with source_data as (
    select * from {{ source('raw', 'delivery_status_feed') }}
)

select
    delivery_id,
    cast(order_id as integer) as order_id,
    nullif(distributor_id, '') as distributor_id,
    delivery_status,
    cast(status_timestamp as timestamp) as status_timestamp,
    delivery_agent_id,
    cast(sla_due_date as date) as sla_due_date,
    cast(estimated_delivery_date as date) as estimated_delivery_date,
    cast(actual_delivery_date as date) as actual_delivery_date,
    delivery_zone
from source_data;
