# Logistics Service Level Enhancements

## New Raw Feeds

The ingestion pipeline now uploads three additional CSV feeds to MinIO and persists them in the `raw` schema of the analytics warehouse:

| Object | Table | Key Columns | Notes |
| ------ | ----- | ----------- | ----- |
| `delivery_status_feed.csv` | `raw.delivery_status_feed` | `delivery_id`, `order_id`, `sla_due_date`, `actual_delivery_date` | Tracks delivery progress, SLA expectations, and completion timestamps. |
| `distributor_master.csv` | `raw.distributor_master` | `distributor_id`, `effective_from`, `effective_to` | Provides parent/child relationships, address lines, and zone assignments with history indicators. |
| `stockist_inventory_snapshot.csv` | `raw.stockist_inventory_snapshot` | `snapshot_id`, `stockist_id`, `sku_id`, `inventory_date` | Captures stockist on-hand/on-order balances for service risk analysis. |

## dbt Logistics Models

A new `logistics` model package complements the existing marts. The configuration publishes SCD and staging layers to purpose-built schemas (`logistics_staging` and `logistics`).

### Staging Models (`logistics_staging`)

- `stg_delivery_status` – cleans and types delivery feed columns, normalising SLA dates and delivery agent identifiers.
- `stg_distributor_master` – enforces nullable parent IDs, casts effective dating columns, and normalises `is_current` to a boolean.
- `stg_stockist_inventory` – casts quantitative fields to numerics and provides consistent distributor identifiers.

### Dimensional Models (`logistics`)

- `dim_distributor_history` – slowly changing dimension type 2 that tracks zone and address changes and builds a recursive hierarchy path and depth.
- `dim_stockist_inventory` – marks the most recent snapshot per stockist/SKU while retaining historical context.
- `delivery_service_metrics` – aggregates deliveries by distributor, zone, and day, computing SLA adherence, delay days, penalty exposure, and distributor linkage quality.

## Enriched KPI Outputs

`dags/data_enrichment.py` now blends order metrics with logistics signals to emit extended KPIs in `analytics.category_kpis`, including:

- SLA adherence rates by product category.
- Average and cumulative delivery delays, plus calculated penalty exposure (default rate of 25 currency units per day late).
- Category-level and network-level trust indicators (`unlinked_order_pct`) for missing distributor information.

## Sample Queries for Customer Support SLAs

The following queries help customer support teams triage delivery promises and escalations:

```sql
-- Orders at risk due to SLA breaches in the last 3 days
select
    f.order_id,
    f.category,
    d.distributor_id,
    d.delivery_zone,
    d.actual_delivery_date,
    d.sla_due_date,
    greatest(date_part('day', d.actual_delivery_date - d.sla_due_date), 0) as delay_days
from analytics.fact_order_items f
join logistics_staging.stg_delivery_status d on f.order_id = d.order_id
where d.actual_delivery_date > d.sla_due_date
  and d.actual_delivery_date >= current_date - interval '3 day'
order by delay_days desc;
```

```sql
-- SLA adherence summary by distributor hierarchy
select
    hist.root_distributor_id,
    hist.distributor_id,
    hist.hierarchy_path,
    metrics.delivery_day,
    metrics.total_deliveries,
    metrics.sla_adherence_rate,
    metrics.delay_penalty_amount
from logistics.dim_distributor_history hist
join logistics.delivery_service_metrics metrics
  on metrics.distributor_id = hist.distributor_id
where hist.current_flag = true
order by metrics.delivery_day desc, hist.hierarchy_path;
```

```sql
-- Customer care view: categories with highest trust risk (missing distributor linkage)
select
    category,
    orders,
    unlinked_order_pct,
    delay_penalty_amount
from analytics.category_kpis
order by unlinked_order_pct desc
limit 10;
```

These queries cover real-time breach identification, hierarchical accountability, and proactive risk monitoring for open tickets.
