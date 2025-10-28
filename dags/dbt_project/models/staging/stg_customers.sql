select
    cast(customer_id as integer) as customer_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    cast(signup_date as timestamp) as signup_date
from {{ source('raw', 'customers_source') }};
