-- ============================================================
-- LOCK DOWN docket_summary AND DROP DEAD DATABASE OBJECTS
-- ============================================================

-- The view ran with its owner's rights, skipping RLS on dockets, and
-- Supabase's default grants let the public anon key read it.
alter view docket_summary set (security_invoker = true);
revoke all on docket_summary from anon;


-- The original column-level UNIQUE on docket_number was never dropped,
-- so it overrode idx_dockets_unique_business_docket and rejected the
-- same number from a different plant or docket type.
alter table dockets drop constraint if exists dockets_docket_number_key;


-- No longer called: the Customers and Plants tabs were removed, and the
-- overview now computes turnaround from the rows it already loads.
drop function if exists get_customer_summary(date, date);
drop function if exists get_plant_summary(date, date);
drop function if exists get_turnaround_stats(date, date);
