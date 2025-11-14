{{ config(materialized='table') }}

select
    area_id,
    erp_quantity,
    warehouse_quantity,
    availability_rate,
    discrepancy,
    is_negative_stock,
    is_stale_snapshot,
    is_significant_mismatch,
    severity,
    alert_reason,
    last_snapshot,
    generated_at
from {{ source('analytics', 'fact_stock_alerts') }}
