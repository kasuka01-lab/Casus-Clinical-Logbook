-- ============================================================================
-- Casus - procedure logbook and competency tracking.
--
-- Run once in the Supabase SQL Editor for the project used by the app.
-- Stores trainee-owned procedure records with optional case links and
-- supervisor sign-off metadata. This migration does not alter existing cases,
-- profiles, reviews, or patient data.
-- ============================================================================

create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create table if not exists public.procedures (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  case_id            uuid references public.cases(id) on delete set null,
  procedure_name     text not null,
  specialty          text,
  procedure_date     date,
  role               text not null check (
    role in (
      'Observed',
      'Assisted',
      'Performed under supervision',
      'Performed independently'
    )
  ),
  notes              text,
  signed_off         boolean not null default false,
  signed_off_at      timestamptz,
  supervisor_name    text,
  supervisor_role    text,
  supervisor_comment text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists procedures_owner_idx on public.procedures(owner_id);
create index if not exists procedures_case_idx on public.procedures(case_id);
create index if not exists procedures_date_idx on public.procedures(procedure_date);

drop trigger if exists trg_touch_procedure on public.procedures;
create trigger trg_touch_procedure before update on public.procedures
for each row execute function public.touch_updated_at();

alter table public.procedures enable row level security;

drop policy if exists "procedures owner all" on public.procedures;
create policy "procedures owner all" on public.procedures
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "procedures admin read" on public.procedures;
create policy "procedures admin read" on public.procedures
  for select using (public.is_admin());
