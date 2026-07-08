-- ============================================================================
-- Casus — personal logbook must show ONLY your own cases.
-- These admin-read rules were letting an admin's personal logbook pull in
-- everyone's cases. The Admin page uses a separate secure function, so these
-- aren't needed. Run once: Supabase -> SQL Editor -> paste -> Run.
-- ============================================================================
drop policy if exists "cases admin read" on public.cases;
drop policy if exists "media admin read" on public.case_media;
