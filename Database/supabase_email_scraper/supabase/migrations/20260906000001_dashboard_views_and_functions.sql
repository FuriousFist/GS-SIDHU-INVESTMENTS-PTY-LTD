-- ============================================================
-- DOCKET SUMMARY VIEW
--
-- One row per docket with totals already computed, used by the
-- dashboard's docket-browsing table and overview page.
-- ============================================================

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
    d.pdf_path,
    t.truck_number,
    sum(dl.quantity) filter (where dl.unit = 'm3') as total_m3,
    sum(dl.quantity) filter (where dl.unit = 'kg') as total_kg,
    count(dl.id) as load_count
from dockets d
left join trucks t on t.id = d.truck_id
left join docket_loads dl on dl.docket_id = d.id
group by d.id, t.truck_number;

grant select on docket_summary to authenticated;


-- ============================================================
-- TRUCK SUMMARY (date-range aggregate)
-- ============================================================

create or replace function get_truck_summary(date_from date, date_to date)
returns table (
    truck_id uuid,
    truck_number text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_kg numeric,
    last_docket_date date
)
language sql stable as $$
    select
        t.id,
        coalesce(t.truck_number, 'Unassigned'),
        count(distinct d.id),
        sum(dl.quantity) filter (where d.docket_type = 'concrete'),
        sum(dl.quantity) filter (where d.docket_type = 'aggregates'),
        max(d.docket_date)
    from dockets d
    left join trucks t on t.id = d.truck_id
    left join docket_loads dl on dl.docket_id = d.id
    where d.docket_date between date_from and date_to
    group by t.id, t.truck_number
    order by count(distinct d.id) desc;
$$;


-- ============================================================
-- CUSTOMER SUMMARY (date-range aggregate)
-- ============================================================

create or replace function get_customer_summary(date_from date, date_to date)
returns table (
    customer_name text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_kg numeric,
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


-- ============================================================
-- PLANT SUMMARY (date-range aggregate)
-- ============================================================

create or replace function get_plant_summary(date_from date, date_to date)
returns table (
    plant_name text,
    docket_count bigint,
    total_concrete_m3 numeric,
    total_aggregates_kg numeric,
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


-- ============================================================
-- DAILY VOLUME (date-range time series, for trend charts)
-- ============================================================

create or replace function get_daily_volume(date_from date, date_to date)
returns table (
    docket_date date,
    docket_type text,
    load_count bigint,
    total_quantity numeric,
    unit text
)
language sql stable as $$
    select
        d.docket_date,
        d.docket_type,
        count(*),
        sum(dl.quantity),
        min(dl.unit)
    from dockets d
    join docket_loads dl on dl.docket_id = d.id
    where d.docket_date between date_from and date_to
    group by d.docket_date, d.docket_type
    order by d.docket_date;
$$;


-- ============================================================
-- TURNAROUND STATS (date-range aggregate)
--
-- Only counts dockets where total_time_on_site was actually
-- captured - the UI must show "N of M dockets" alongside these
-- numbers since many suppliers don't reliably provide timestamps.
-- ============================================================

create or replace function get_turnaround_stats(date_from date, date_to date)
returns table (
    docket_count bigint,
    timed_docket_count bigint,
    avg_site_minutes numeric,
    median_site_minutes numeric
)
language sql stable as $$
    select
        count(*),
        count(*) filter (where total_time_on_site is not null),
        avg(extract(epoch from total_time_on_site) / 60)
            filter (where total_time_on_site is not null),
        percentile_cont(0.5) within group (
            order by extract(epoch from total_time_on_site)
        ) filter (where total_time_on_site is not null) / 60
    from dockets
    where docket_date between date_from and date_to;
$$;


-- ============================================================
-- STORAGE: allow authenticated users to read docket PDFs
--
-- The bucket-creation migration never added an object-level
-- policy, so signed URL generation would fail without this even
-- though table RLS is otherwise fine.
-- ============================================================

create policy "Authenticated users can read docket pdfs"
on storage.objects for select
to authenticated
using (bucket_id = 'dockets');
