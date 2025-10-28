select
    cast(product_id as integer) as product_id,
    product_name,
    category,
    cast(price as numeric) as price
from {{ source('raw', 'products') }};
