-- ============================================================================
-- Kisa v2 — adds profiles detail, patient identity (owner-only), media
-- sections, follow-ups, supervisor. Safe to run once on the existing database.
-- Run in: Supabase -> SQL Editor -> new query -> paste -> Run
-- ============================================================================

-- profile details
alter table public.profiles add column if not exists first_name       text;
alter table public.profiles add column if not exists surname          text;
alter table public.profiles add column if not exists avatar_path      text;
alter table public.profiles add column if not exists reg_status       text;  -- 'student' | 'registered'
alter table public.profiles add column if not exists reg_number       text;
alter table public.profiles add column if not exists institution      text;
alter table public.profiles add column if not exists specialty        text;
alter table public.profiles add column if not exists country          text;
alter table public.profiles add column if not exists year_of_training text;
alter table public.profiles add column if not exists contact          text;

-- patient identity (only ever visible to the owning doctor) + supervisor
alter table public.cases add column if not exists patient_name    text;
alter table public.cases add column if not exists patient_contact text;
alter table public.cases add column if not exists supervisor      text;

-- media section label: photo / radiology / lab
alter table public.case_media add column if not exists section text not null default 'photo';

-- follow-ups
create table if not exists public.follow_ups (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  date       date,
  note       text not null,
  created_at timestamptz not null default now()
);
create index if not exists follow_case_idx on public.follow_ups(case_id);
alter table public.follow_ups enable row level security;
drop policy if exists "follow owner all" on public.follow_ups;
create policy "follow owner all" on public.follow_ups
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- create profile with names on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, first_name, surname)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.raw_user_meta_data->>'first_name',
          new.raw_user_meta_data->>'surname')
  on conflict (id) do nothing;
  return new;
end; $$;

-- shared logbook: include sections, follow-ups, supervisor — but NEVER the
-- patient's name or contact (those stay private to the owning doctor).
create or replace function public.get_shared_logbook(p_token text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_name text; v_cases json;
begin
  select owner_id into v_owner from public.share_links where token = p_token and revoked = false;
  if v_owner is null then return null; end if;
  select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(surname,'')), ''), full_name)
    into v_name from public.profiles where id = v_owner;
  select coalesce(json_agg(c order by c.created_at desc), '[]'::json) into v_cases
  from (
    select cs.id, cs.case_no, cs.patient_initials, cs.date, cs.age, cs.sex, cs.tribe,
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement, cs.supervisor,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section)), '[]'::json)
              from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note) order by f.created_at), '[]'::json)
              from public.follow_ups f where f.case_id = cs.id) as followups,
           (select row_to_json(mk) from public.marks mk where mk.case_id = cs.id and mk.share_token = p_token) as mark
    from public.cases cs where cs.owner_id = v_owner
  ) c;
  return json_build_object('owner_name', v_name, 'cases', v_cases);
end; $$;
grant execute on function public.get_shared_logbook(text) to anon, authenticated;
