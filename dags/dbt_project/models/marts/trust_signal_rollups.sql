with order_base as (
    select
        order_id,
        min(order_date)::timestamp as order_date
    from {{ ref('fact_order_items') }}
    group by order_id
),

deliveries as (
    select
        d.order_id,
        d.promised_delivery_ts,
        d.actual_delivery_ts,
        d.delivery_partner,
        d.exception_flag,
        case
            when d.actual_delivery_ts <= d.promised_delivery_ts then 1
            else 0
        end as on_time_flag
    from {{ ref('stg_deliveries') }} d
),

support_events as (
    select
        s.interaction_id,
        s.order_id,
        s.csr_id,
        s.interaction_ts,
        s.channel,
        s.resolution_minutes,
        s.resolution_status,
        case when lower(s.resolution_status) = 'resolved' then 1 else 0 end as resolved_flag
    from {{ ref('stg_support_interactions') }} s
),

badge_history as (
    select
        csr_id,
        badge_type,
        awarded_at,
        coalesce(expires_at, '2999-12-31'::timestamp) as expires_at
    from {{ ref('stg_csr_badges') }}
),

support_with_badge as (
    select
        s.*,
        case
            when b.csr_id is not null then 1
            else 0
        end as badge_active_flag
    from support_events s
    left join badge_history b
        on s.csr_id = b.csr_id
        and s.interaction_ts >= b.awarded_at
        and s.interaction_ts < b.expires_at
),

order_delivery_metrics as (
    select
        coalesce(date_trunc('day', d.actual_delivery_ts), date_trunc('day', o.order_date)) as metric_date,
        o.order_id,
        d.on_time_flag
    from order_base o
    left join deliveries d on o.order_id = d.order_id
),

support_daily as (
    select
        date_trunc('day', interaction_ts) as metric_date,
        badge_active_flag,
        resolution_minutes,
        resolved_flag
    from support_with_badge
),

daily_orders as (
    select
        metric_date::date as metric_date,
        count(distinct order_id) as orders_count,
        count(on_time_flag) filter (where on_time_flag is not null) as deliveries_count,
        avg(on_time_flag::numeric) as on_time_delivery_rate
    from order_delivery_metrics
    group by metric_date
),

daily_support as (
    select
        metric_date::date as metric_date,
        avg(badge_active_flag::numeric) as csr_badge_coverage,
        avg(resolution_minutes::numeric) as avg_resolution_minutes,
        avg(resolved_flag::numeric) as resolution_success_rate
    from support_daily
    group by metric_date
),

combined as (
    select
        coalesce(o.metric_date, s.metric_date) as metric_date,
        coalesce(o.orders_count, 0) as orders_count,
        coalesce(o.deliveries_count, 0) as deliveries_count,
        o.on_time_delivery_rate,
        s.csr_badge_coverage,
        s.avg_resolution_minutes,
        s.resolution_success_rate
    from daily_orders o
    full outer join daily_support s on o.metric_date = s.metric_date
),

ordered as (
    select
        metric_date,
        orders_count,
        deliveries_count,
        on_time_delivery_rate,
        csr_badge_coverage,
        avg_resolution_minutes,
        resolution_success_rate
    from combined
)

select
    metric_date,
    orders_count,
    deliveries_count,
    coalesce(on_time_delivery_rate, 0) as on_time_delivery_rate,
    avg(coalesce(on_time_delivery_rate, 0)) over (
        order by metric_date rows between 6 preceding and current row
    ) as on_time_rate_rolling_7d,
    avg(coalesce(on_time_delivery_rate, 0)) over (
        order by metric_date rows between 29 preceding and current row
    ) as on_time_rate_rolling_30d,
    case
        when on_time_delivery_rate is null then null
        else on_time_delivery_rate < 0.95
    end as on_time_below_threshold,
    coalesce(csr_badge_coverage, 0) as csr_badge_coverage,
    avg(coalesce(csr_badge_coverage, 0)) over (
        order by metric_date rows between 29 preceding and current row
    ) as csr_badge_coverage_rolling_30d,
    case
        when csr_badge_coverage is null then null
        else csr_badge_coverage < 0.75
    end as csr_badge_below_threshold,
    coalesce(avg_resolution_minutes, 0) as avg_resolution_minutes,
    avg(coalesce(avg_resolution_minutes, 0)) over (
        order by metric_date rows between 29 preceding and current row
    ) as avg_resolution_minutes_rolling_30d,
    case
        when avg_resolution_minutes is null then null
        else avg_resolution_minutes > 30
    end as resolution_above_threshold,
    coalesce(resolution_success_rate, 0) as resolution_success_rate,
    avg(coalesce(resolution_success_rate, 0)) over (
        order by metric_date rows between 29 preceding and current row
    ) as resolution_success_rate_rolling_30d,
    on_time_delivery_rate is not null as delivery_data_available,
    csr_badge_coverage is not null as csr_data_available,
    avg_resolution_minutes is not null as support_data_available
from ordered
order by metric_date;
