with source_data as (
    select *
    from {{ source('raw', 'raw_data') }}
)
select
  column1,
  column2,
  upper(column3) as column3_upper
from source_data