{{ config(materialized='table') }}

with inventory as (
    select * from {{ ref('stg_stockist_inventory') }}
),
ranked as (
    select
        *,
        row_number() over (
            partition by stockist_id, sku_id
            order by inventory_date desc
        ) as recency_rank
    from inventory
)

select
    snapshot_id,
    stockist_id,
    distributor_id,
    inventory_date,
    sku_id,
    sku_name,
    on_hand_qty,
    on_order_qty,
    case when recency_rank = 1 then true else false end as is_latest_snapshot
from ranked;
