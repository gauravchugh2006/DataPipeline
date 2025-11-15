with delivery as (
    select
        customer_id,
        delivered_at,
        shipped_at,
        case when status ilike '%on_time%' then 1 else 0 end as on_time_flag
    from {{ ref('stg_logistics_delivery_status') }}
    join {{ ref('stg_order_items') }} using (order_id)
),
support as (
    select
        customer_id,
        avg(resolution_minutes) as resolution_minutes
    from {{ ref('stg_support_cases') }}
    group by 1
),
trust_base as (
    select
        customer_id,
        date_trunc('day', delivered_at) as score_date,
        avg(on_time_flag)::float as delivery_score,
        avg(extract(epoch from (delivered_at - shipped_at)) / 3600) as avg_hours_to_deliver
    from delivery
    where delivered_at is not null
    group by 1,2
)
select
    trust_base.customer_id,
    trust_base.score_date,
    trust_base.delivery_score,
    coalesce(1 - (support.resolution_minutes / nullif(max(support.resolution_minutes) over (), 0)), 0.5) as support_score,
    case when trust_base.delivery_score < 0.9 then true else false end as breach_flag,
    case when trust_base.delivery_score < 0.9 then 'Delivery SLA breached' else '' end as breach_reason,
    case when trust_base.delivery_score < 0.9 then 'Offer expedited shipping credit' else 'Maintain regular cadence' end as goodwill_actions
from trust_base
left join support using(customer_id)
