select
    cast(interaction_id as integer) as interaction_id,
    cast(order_id as integer) as order_id,
    cast(csr_id as integer) as csr_id,
    cast(interaction_ts as timestamp) as interaction_ts,
    channel,
    cast(resolution_minutes as integer) as resolution_minutes,
    resolution_status
from {{ source('raw', 'support_interactions') }};
