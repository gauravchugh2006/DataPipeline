with source as (
    select * from {{ ref('stg_order_items') }}
),
loyalty_scores as (
    select
        order_id,
        customer_id,
        product_id,
        sum(quantity) as total_quantity,
        max(order_date) as last_purchase_at
    from source
    group by 1,2,3
)
select
    md5(concat(customer_id, '-', product_id, '-', order_id)) as recommendation_id,
    loyalty_scores.customer_id,
    loyalty_scores.order_id,
    loyalty_scores.product_id,
    loyalty_scores.total_quantity as quantity,
    loyalty_scores.last_purchase_at as recommendation_created_at,
    'generalist'::varchar as loyalty_segment,
    'pending'::varchar as recommendation_status,
    0.75::float as recommendation_score,
    'weekly'::varchar as reminder_frequency,
    'email'::varchar as preferred_channel,
    'silver'::varchar as discount_tier,
    'send_reminder'::varchar as next_best_action
from loyalty_scores
