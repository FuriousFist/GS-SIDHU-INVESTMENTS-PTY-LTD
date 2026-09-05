-- ============================================================
-- ADD WAITING TIME
--
-- Barro dockets print an explicit "WAITING TIME NN mins" field,
-- distinct from total_time_on_site. Holcim's docket layout has no
-- separate equivalent (its "WAITING TIME" section header actually
-- groups the Arrive Jobsite / Time Finished / Total Time on Site
-- fields, not a standalone duration) - so this stays NULL for
-- Holcim-sourced dockets.
-- ============================================================

alter table dockets add column waiting_time interval;

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
    sum(dl.quantity) filter (where dl.unit = 'kg') as total_kg,
    count(dl.id) as load_count
from dockets d
left join trucks t on t.id = d.truck_id
left join docket_loads dl on dl.docket_id = d.id
group by d.id, t.truck_number;

grant select on docket_summary to authenticated;
