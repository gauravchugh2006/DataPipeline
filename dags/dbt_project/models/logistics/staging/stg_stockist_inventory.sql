with source_data as (
    select * from {{ source('raw', 'stockist_inventory_snapshot') }}
)

select
    snapshot_id,
    stockist_id,
    nullif(distributor_id, '') as distributor_id,
    cast(inventory_date as date) as inventory_date,
    sku_id,
    sku_name,
    cast(on_hand_qty as numeric) as on_hand_qty,
    cast(on_order_qty as numeric) as on_order_qty
from source_data;
