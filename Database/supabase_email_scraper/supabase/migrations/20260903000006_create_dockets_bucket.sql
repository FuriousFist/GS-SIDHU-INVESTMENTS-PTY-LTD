-- ============================================================
-- CREATE DOCKETS STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('dockets', 'dockets', false)
on conflict (id) do nothing;
