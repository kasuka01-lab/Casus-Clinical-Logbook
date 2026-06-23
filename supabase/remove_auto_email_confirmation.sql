-- ============================================================================
-- Casus - remove automatic email confirmation.
--
-- Run this once in the Supabase SQL Editor for the project used by the app.
--
-- This only removes the trigger/function that auto-confirm future signups.
-- It does not update auth.users, does not reset existing confirmed users,
-- does not delete users, and does not change profiles or logbook data.
-- ============================================================================

begin;

drop trigger if exists auto_confirm_on_signup on auth.users;
drop function if exists public.auto_confirm_user();

commit;
