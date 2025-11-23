with shipments as (
    select * from {{ ref('stg_logistics_delivery_status') }}
),
stockist as (
    select * from {{ ref('stg_logistics_stockist_inventory') }}
),
distributor as (
    select * from {{ ref('stg_logistics_distributor_master') }}
)
select
    date_trunc('day', shipments.delivered_at) as snapshot_date,
    shipments.distributor_id,
    distributor.distributor_name,
    shipments.stockist_id,
    stockist.stockist_name,
    distributor.region,
    avg(case when shipments.status ilike '%on_time%' then 1 else 0 end)::float as on_time_percentage,
    (1 - avg(case when shipments.status ilike '%on_time%' then 1 else 0 end)) * 100 as penalty_amount,
    avg(case when shipments.status ilike '%on_time%' then 1 else 0 end) < 0.9 as sla_breach_flag,
    case when avg(case when shipments.status ilike '%on_time%' then 1 else 0 end) < 0.9
         then 'On-time delivery below SLA' else '' end as breach_reason,
    max(stockist.inventory_days_on_hand) as inventory_days_on_hand
from shipments
left join stockist using(stockist_id, distributor_id)
left join distributor using(distributor_id)
where shipments.delivered_at is not null
group by 1,2,3,4,5,6
