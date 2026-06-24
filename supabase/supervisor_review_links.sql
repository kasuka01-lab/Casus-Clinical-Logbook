-- ============================================================================
-- Casus - supervisor review links for selected cases.
--
-- Run once in the Supabase SQL Editor for the project used by the app.
--
-- Creates secure selected-case review links at:
--   https://casuslog.com/review/<token>
--
-- Public review RPCs deliberately omit structured patient identifiers:
-- patient_name, patient_contact, patient_initials, and tribe.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.review_links (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  label      text,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.review_link_cases (
  review_link_id uuid not null references public.review_links(id) on delete cascade,
  case_id        uuid not null references public.cases(id) on delete cascade,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (review_link_id, case_id)
);

create table if not exists public.supervisor_reviews (
  id              uuid primary key default gen_random_uuid(),
  review_link_id  uuid references public.review_links(id) on delete set null,
  case_id         uuid not null references public.cases(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  review_token    text not null,
  supervisor_name text,
  supervisor_role text,
  score           int not null check (score between 0 and 10),
  comments        text,
  created_at      timestamptz not null default now()
);

create index if not exists review_links_owner_idx on public.review_links(owner_id);
create index if not exists review_links_token_idx on public.review_links(token);
create index if not exists review_link_cases_case_idx on public.review_link_cases(case_id);
create index if not exists supervisor_reviews_case_idx on public.supervisor_reviews(case_id);

alter table public.review_links enable row level security;
alter table public.review_link_cases enable row level security;
alter table public.supervisor_reviews enable row level security;

drop policy if exists "review links owner read" on public.review_links;
create policy "review links owner read" on public.review_links
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "review link cases owner read" on public.review_link_cases;
create policy "review link cases owner read" on public.review_link_cases
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "supervisor reviews owner read" on public.supervisor_reviews;
create policy "supervisor reviews owner read" on public.supervisor_reviews
  for select using (owner_id = auth.uid() or public.is_admin());

create or replace function public.create_review_link(p_case_ids uuid[], p_label text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_link public.review_links%rowtype;
  v_case_count int;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if p_case_ids is null or array_length(p_case_ids, 1) is null then
    raise exception 'select at least one case';
  end if;

  select count(distinct c.id) into v_case_count
  from public.cases c
  where c.owner_id = v_owner
    and c.id = any(p_case_ids);

  if v_case_count <> array_length(p_case_ids, 1) then
    raise exception 'one or more cases are not available';
  end if;

  insert into public.review_links (owner_id, label)
  values (v_owner, nullif(trim(p_label), ''))
  returning * into v_link;

  insert into public.review_link_cases (review_link_id, case_id, owner_id)
  select v_link.id, c.id, v_owner
  from public.cases c
  where c.owner_id = v_owner
    and c.id = any(p_case_ids);

  return json_build_object(
    'id', v_link.id,
    'token', v_link.token,
    'label', v_link.label,
    'created_at', v_link.created_at
  );
end; $$;
grant execute on function public.create_review_link(uuid[], text) to authenticated;

create or replace function public.get_review_link(p_token text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_link_id uuid;
  v_owner uuid;
  v_name text;
  v_cases json;
begin
  select id, owner_id into v_link_id, v_owner
  from public.review_links
  where token = p_token and revoked = false;

  if v_link_id is null then return null; end if;

  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(surname, '')), ''), full_name)
    into v_name
  from public.profiles
  where id = v_owner;

  select coalesce(json_agg(c order by c.created_at desc), '[]'::json) into v_cases
  from (
    select cs.id, cs.case_no, cs.date, cs.age, cs.sex,
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement,
           cs.supervisor, cs.supervisor_qualification, cs.admitted, cs.ward,
           cs.admission_date, cs.next_review, cs.hospital, cs.examination_findings,
           cs.outcome, cs.description, cs.management, cs.challenges, cs.discussion,
           cs.created_at,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note, 'type', f.type) order by f.created_at), '[]'::json)
              from public.follow_ups f where f.case_id = cs.id) as followups
    from public.review_link_cases rlc
    join public.cases cs on cs.id = rlc.case_id
    where rlc.review_link_id = v_link_id
      and cs.owner_id = v_owner
  ) c;

  return json_build_object('owner_name', v_name, 'cases', v_cases);
end; $$;
grant execute on function public.get_review_link(text) to anon, authenticated;

create or replace function public.submit_supervisor_review(
  p_token text,
  p_case_id uuid,
  p_supervisor_name text,
  p_supervisor_role text,
  p_score int,
  p_comments text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_link_id uuid;
  v_owner uuid;
begin
  select id, owner_id into v_link_id, v_owner
  from public.review_links
  where token = p_token and revoked = false;

  if v_link_id is null then raise exception 'invalid or revoked review link'; end if;
  if p_score is null or p_score < 0 or p_score > 10 then raise exception 'score must be between 0 and 10'; end if;
  if not exists (
    select 1 from public.review_link_cases
    where review_link_id = v_link_id and case_id = p_case_id and owner_id = v_owner
  ) then
    raise exception 'case not in this review link';
  end if;

  insert into public.supervisor_reviews (
    review_link_id, case_id, owner_id, review_token,
    supervisor_name, supervisor_role, score, comments
  ) values (
    v_link_id, p_case_id, v_owner, p_token,
    nullif(trim(p_supervisor_name), ''),
    nullif(trim(p_supervisor_role), ''),
    p_score,
    nullif(trim(p_comments), '')
  );
end; $$;
grant execute on function public.submit_supervisor_review(text, uuid, text, text, int, text) to anon, authenticated;
