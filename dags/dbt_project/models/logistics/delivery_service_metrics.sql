{{ config(materialized='table') }}

with deliveries as (
    select
        delivery_id,
        order_id,
        distributor_id,
        delivery_zone,
        sla_due_date,
        actual_delivery_date
    from {{ ref('stg_delivery_status') }}
),
metrics as (
    select
        order_id,
        distributor_id,
        delivery_zone,
        sla_due_date,
        actual_delivery_date,
        case
            when actual_delivery_date is not null
                 and actual_delivery_date <= sla_due_date then 1
            else 0
        end as sla_met_flag,
        case
            when actual_delivery_date is null then null
            when actual_delivery_date <= sla_due_date then 0
            else extract(day from actual_delivery_date - sla_due_date)
        end as delay_days,
        case when distributor_id is null then 1 else 0 end as missing_distributor_flag
    from deliveries
)

select
    coalesce(distributor_id, 'UNASSIGNED') as distributor_id,
    delivery_zone,
    date_trunc('day', coalesce(actual_delivery_date, sla_due_date))::date as delivery_day,
    count(*) as total_deliveries,
    sum(sla_met_flag) as sla_met_deliveries,
    avg(sla_met_flag::decimal) as sla_adherence_rate,
    sum(coalesce(delay_days, 0)) as total_delay_days,
    avg(coalesce(delay_days, 0)) as avg_delay_days,
    sum(missing_distributor_flag)::decimal / count(*) as unlinked_order_pct,
    sum(coalesce(delay_days, 0)) * 25 as delay_penalty_amount
from metrics
where sla_due_date is not null
group by 1, 2, 3;
