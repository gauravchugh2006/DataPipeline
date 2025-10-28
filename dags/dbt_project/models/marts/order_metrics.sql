select
    category,
    count(distinct order_id) as orders,
    sum(total_amount) as total_revenue
from {{ ref('fact_order_items') }}
group by category;
