{{ config(materialized='table') }}

with base as (
    select
        distributor_id,
        distributor_name,
        parent_distributor_id,
        zone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        effective_from,
        effective_to,
        is_current,
        row_number() over (
            partition by distributor_id
            order by effective_from
        ) as version_number,
        lead(effective_from) over (
            partition by distributor_id
            order by effective_from
        ) as next_effective_from
    from {{ ref('stg_distributor_master') }}
),
scd2 as (
    select
        b.*, 
        coalesce(
            b.effective_to,
            b.next_effective_from - interval '1 second',
            to_timestamp('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
        ) as valid_to,
        case
            when b.effective_to is null and b.next_effective_from is null then true
            when b.is_current then true
            else false
        end as current_flag
    from base b
),
hierarchy as (
    select
        distributor_id,
        parent_distributor_id,
        distributor_name,
        distributor_id as root_distributor_id,
        distributor_name::text as hierarchy_path,
        0 as hierarchy_depth
    from scd2
    where parent_distributor_id is null

    union all

    select
        child.distributor_id,
        child.parent_distributor_id,
        child.distributor_name,
        parent.root_distributor_id,
        parent.hierarchy_path || ' > ' || child.distributor_name,
        parent.hierarchy_depth + 1
    from scd2 child
    join hierarchy parent
        on child.parent_distributor_id = parent.distributor_id
)

select
    scd2.distributor_id,
    scd2.distributor_name,
    scd2.parent_distributor_id,
    scd2.zone,
    scd2.address_line1,
    scd2.address_line2,
    scd2.city,
    scd2.state,
    scd2.postal_code,
    scd2.country,
    scd2.effective_from as valid_from,
    scd2.valid_to,
    scd2.version_number,
    scd2.current_flag,
    hierarchy.root_distributor_id,
    hierarchy.hierarchy_path,
    hierarchy.hierarchy_depth
from scd2
left join hierarchy
    on scd2.distributor_id = hierarchy.distributor_id;
