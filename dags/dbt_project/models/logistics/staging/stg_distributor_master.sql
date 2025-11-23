with source_data as (
    select * from {{ source('raw', 'distributor_master') }}
)

select
    distributor_id,
    distributor_name,
    nullif(parent_distributor_id, '') as parent_distributor_id,
    zone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    cast(effective_from as date) as effective_from,
    cast(effective_to as date) as effective_to,
    coalesce(cast(is_current as boolean), false) as is_current
from source_data;
