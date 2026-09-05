-- ============================================================
-- FIX AGGREGATES UNIT: TONNES, NOT KG
--
-- The ingestion pipeline hardcoded unit='kg' for aggregates loads,
-- but the values it captures (Gross/Tare/Net Weight on the docket)
-- are printed in tonnes (a 30-40 range matches a truck payload in
-- tonnes; it would be nonsensical as kilograms). This corrects the
-- existing rows and renames total_kg / total_aggregates_kg to
-- total_tonnes / total_aggregates_tonnes throughout so the column
-- names stop being actively wrong.
-- ============================================================

update docket_loads set unit = 'tonnes' where unit = 'kg';


-- docket_summary: total_kg -> total_tonnes, filter on 'tonnes'

drop view if exists docket_summary;

create view docket_summary as
select
    d.id,
    d.docket_number,
    d.docket_type,
    d.docket_date,
    d.customer_name,
    d.plant_name,
    d.plant_number,
    d.driver_name,
    d.total_time_on_site,
    d.waiting_time,
    d.pdf_path,
    t.truck_number,
    sum(dl.quantity) filter (where dl.unit = 'm3') as total_m3,
    sum(dl.quantity) filter (where dl.unit = 'tonnes') as total_tonnes,
    count(dl.id) as load_count
from dockets d
left join trucks t on t.id = d.truck_id
left join docket_loads dl on dl.docket_id = d.id
group by d.id, t.truck_number;

grant select on docket_summary to authenticated;


-- get_truck_summary: total_aggregates_kg -> total_aggregates_tonnes

drop function if exists get_truck_summary(date, date);

create function get_truck_summary(date_from date, date_to date)
returns table (
    truck_id uuid,
    truck_number text,
    company text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_tonnes numeric,
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


-- get_customer_summary: total_aggregates_kg -> total_aggregates_tonnes

drop function if exists get_customer_summary(date, date);

create function get_customer_summary(date_from date, date_to date)
returns table (
    customer_name text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_tonnes numeric,
    last_docket_date date
)
language sql stable as $$
    select
        coalesce(d.customer_name, 'Unknown customer'),
        count(distinct d.id),
        sum(dl.quantity) filter (where d.docket_type = 'concrete'),
        sum(dl.quantity) filter (where d.docket_type = 'aggregates'),
        max(d.docket_date)
    from dockets d
    left join docket_loads dl on dl.docket_id = d.id
    where d.docket_date between date_from and date_to
    group by d.customer_name
    order by count(distinct d.id) desc;
$$;


-- get_plant_summary: total_aggregates_kg -> total_aggregates_tonnes

drop function if exists get_plant_summary(date, date);

create function get_plant_summary(date_from date, date_to date)
returns table (
    plant_name text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_tonnes numeric,
    last_docket_date date
)
language sql stable as $$
    select
        coalesce(d.plant_name, 'Unknown plant'),
        count(distinct d.id),
        sum(dl.quantity) filter (where d.docket_type = 'concrete'),
        sum(dl.quantity) filter (where d.docket_type = 'aggregates'),
        max(d.docket_date)
    from dockets d
    left join docket_loads dl on dl.docket_id = d.id
    where d.docket_date between date_from and date_to
    group by d.plant_name
    order by count(distinct d.id) desc;
$$;
