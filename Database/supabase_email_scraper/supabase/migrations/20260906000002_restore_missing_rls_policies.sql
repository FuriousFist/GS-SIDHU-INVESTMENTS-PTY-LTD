-- ============================================================
-- RESTORE MISSING RLS POLICIES
--
-- RLS was enabled on trucks/dockets/docket_loads by migration
-- 20260903000003_RLS.sql, but the CREATE POLICY statements from
-- that same migration never actually persisted (pg_policies is
-- empty for all three tables despite relrowsecurity = true).
-- With RLS enabled and no policies, every role except the table
-- owner sees zero rows - this silently broke any query running
-- as `authenticated` against these tables directly (RPC functions
-- in particular, since SECURITY INVOKER functions enforce RLS for
-- the calling role, unlike views owned by a privileged role).
--
-- This recreates exactly what that migration intended.
-- ============================================================

-- TRUCKS
create policy "Authenticated users can view trucks"
on trucks for select to authenticated using (true);

create policy "Authenticated users can create trucks"
on trucks for insert to authenticated with check (true);

create policy "Authenticated users can update trucks"
on trucks for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete trucks"
on trucks for delete to authenticated using (true);


-- DOCKETS
create policy "Authenticated users can view dockets"
on dockets for select to authenticated using (true);

create policy "Authenticated users can create dockets"
on dockets for insert to authenticated with check (true);

create policy "Authenticated users can update dockets"
on dockets for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete dockets"
on dockets for delete to authenticated using (true);


-- DOCKET LOADS
create policy "Authenticated users can view docket loads"
on docket_loads for select to authenticated using (true);

create policy "Authenticated users can create docket loads"
on docket_loads for insert to authenticated with check (true);

create policy "Authenticated users can update docket loads"
on docket_loads for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete docket loads"
on docket_loads for delete to authenticated using (true);
