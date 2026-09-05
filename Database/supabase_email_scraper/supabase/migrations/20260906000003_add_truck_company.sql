-- ============================================================
-- ADD COMPANY (SUPPLIER) TO TRUCKS
--
-- Which supplier (Holcim / Barro) a truck hauls for is a stable
-- attribute of the truck, not something to recompute per date
-- range. Backfilled from the supplier each truck's dockets have
-- most often come from so far.
-- ============================================================

alter table trucks add column company text;

update trucks t
set company = sub.company
from (
    select
        truck_id,
        mode() within group (order by company) as company
    from (
        select
            d.truck_id,
            case
                when d.source_email ilike '%holcim%' then 'Holcim'
                when d.source_email ilike '%barro%' then 'Barro'
                else 'Other'
            end as company
        from dockets d
        where d.truck_id is not null
    ) per_docket
    group by truck_id
) sub
where sub.truck_id = t.id;


-- ============================================================
-- SIMPLIFY get_truck_summary TO RETURN THE STORED COMPANY
-- ============================================================

drop function if exists get_truck_summary(date, date);

create function get_truck_summary(date_from date, date_to date)
returns table (
    truck_id uuid,
    truck_number text,
    company text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_kg numeric,
    last_docket_date date
)
language sql stable as $$
    select
        t.id,
        coalesce(t.truck_number, 'Unassigned'),
        t.company,
        count(distinct d.id),
        sum(dl.quantity) filter (where d.docket_type = 'concrete'),
        sum(dl.quantity) filter (where d.docket_type = 'aggregates'),
        max(d.docket_date)
    from dockets d
    left join trucks t on t.id = d.truck_id
    left join docket_loads dl on dl.docket_id = d.id
    where d.docket_date between date_from and date_to
    group by t.id, t.truck_number, t.company
    order by count(distinct d.id) desc;
$$;
