with source as (
    select * from {{ source('raw', 'logistics_distributor_master') }}
)
select
    cast(distributor_id as integer) as distributor_id,
    cast(distributor_name as varchar) as distributor_name,
    cast(region as varchar) as region,
    cast(onboarded_at as timestamp) as onboarded_at
from source
