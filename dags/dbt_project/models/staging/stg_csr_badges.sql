select
    cast(csr_id as integer) as csr_id,
    badge_type,
    cast(awarded_at as timestamp) as awarded_at,
    cast(expires_at as timestamp) as expires_at
from {{ source('raw', 'csr_badges') }};
