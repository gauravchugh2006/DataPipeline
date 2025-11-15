with source as (
    select * from {{ source('raw', 'logistics_delivery_status') }}
)
select
    cast(shipment_id as integer) as shipment_id,
    cast(order_id as integer) as order_id,
    cast(distributor_id as integer) as distributor_id,
    cast(stockist_id as integer) as stockist_id,
    cast(shipped_at as timestamp) as shipped_at,
    cast(delivered_at as timestamp) as delivered_at,
    cast(status as varchar) as status
from source
