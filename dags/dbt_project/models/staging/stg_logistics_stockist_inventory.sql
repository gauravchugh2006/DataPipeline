with source as (
    select * from {{ source('raw', 'logistics_stockist_inventory') }}
)
select
    cast(stockist_id as integer) as stockist_id,
    cast(stockist_name as varchar) as stockist_name,
    cast(distributor_id as integer) as distributor_id,
    cast(inventory_days_on_hand as integer) as inventory_days_on_hand,
    cast(updated_at as timestamp) as updated_at
from source
