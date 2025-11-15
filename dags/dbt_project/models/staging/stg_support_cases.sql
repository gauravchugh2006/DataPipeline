with source as (
    select * from {{ source('raw', 'support_cases') }}
)
select
    cast(case_id as varchar) as case_id,
    cast(customer_id as varchar) as customer_id,
    cast(resolution_minutes as integer) as resolution_minutes,
    cast(sentiment as varchar) as sentiment,
    cast(breach_flag as boolean) as breach_flag,
    cast(resolved_at as timestamp) as resolved_at
from source
