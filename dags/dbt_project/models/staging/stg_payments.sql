select
    cast(payment_id as integer) as payment_id,
    cast(order_id as integer) as order_id,
    payment_method,
    transaction_payment_status as payment_status
from {{ source('raw', 'payments') }};
