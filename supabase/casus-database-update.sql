-- ============================================================================
-- Casus — ONE complete database update. Run this ONCE in the Supabase SQL
-- editor. It is safe to run even if you ran an earlier Casus SQL file; it only
-- adds what is missing and replaces the shared/admin functions with the final
-- versions. This supersedes casus-inpatient-docs.sql and assessments.sql.
--   https://supabase.com/dashboard/project/jwedpxcptrpnultybutp/sql/new
-- ============================================================================

-- 1) allow document/file uploads alongside images and videos
alter table public.case_media drop constraint if exists case_media_kind_check;
alter table public.case_media add constraint case_media_kind_check check (kind in ('image','video','file'));
alter table public.case_media add column if not exists caption      text;
alter table public.case_media add column if not exists follow_up_id uuid references public.follow_ups(id) on delete cascade;

-- 2) admission details + review reminder
alter table public.cases add column if not exists admitted       boolean not null default false;
alter table public.cases add column if not exists admission_date date;
alter table public.cases add column if not exists ward           text;
alter table public.cases add column if not exists next_review    date;
alter table public.cases add column if not exists hospital             text;
alter table public.cases add column if not exists examination_findings text;
alter table public.cases add column if not exists outcome              text;

-- 3) dated notes: 'progress' (daily, while admitted) or 'followup' (after discharge)
alter table public.follow_ups add column if not exists type text not null default 'followup';

-- 4) supervisor sign-off & workplace-based assessments (Mini-CEX, DOPS, CBD…)
create table if not exists public.assessments (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  share_token   text,
  type          text,
  rating        text,
  strengths     text,
  improve       text,
  assessor_name text,
  assessor_role text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists assess_case_idx on public.assessments(case_id);
alter table public.assessments enable row level security;
drop policy if exists "assess owner read" on public.assessments;
create policy "assess owner read" on public.assessments for select using (owner_id = auth.uid());

-- assessor submits via a valid (non-revoked) share token
create or replace function public.submit_assessment(
  p_token text, p_case_id uuid, p_type text, p_rating text,
  p_strengths text, p_improve text, p_assessor_name text, p_assessor_role text, p_verified boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.share_links where token = p_token and revoked = false;
  if v_owner is null then raise exception 'Invalid or revoked link'; end if;
  if not exists (select 1 from public.cases where id = p_case_id and owner_id = v_owner) then
    raise exception 'Case not found';
  end if;
  insert into public.assessments (case_id, owner_id, share_token, type, rating, strengths, improve, assessor_name, assessor_role, verified)
  values (p_case_id, v_owner, p_token, p_type, p_rating, p_strengths, p_improve, p_assessor_name, p_assessor_role, coalesce(p_verified, false));
end; $$;
grant execute on function public.submit_assessment(text,uuid,text,text,text,text,text,text,boolean) to anon, authenticated;

-- 5) FINAL shared (examiner) view — returns docs, admission, progress AND assessments; hides patient identity
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
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement,
           cs.supervisor, cs.supervisor_qualification, cs.admitted, cs.ward, cs.admission_date, cs.next_review, cs.hospital, cs.examination_findings, cs.outcome,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section, 'caption', m.caption, 'follow_up_id', m.follow_up_id)), '[]'::json)
              from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note, 'type', f.type) order by f.created_at), '[]'::json)
              from public.follow_ups f where f.case_id = cs.id) as followups,
           (select coalesce(json_agg(json_build_object('type', a.type, 'rating', a.rating, 'strengths', a.strengths, 'improve', a.improve, 'assessor_name', a.assessor_name, 'assessor_role', a.assessor_role, 'verified', a.verified, 'created_at', a.created_at) order by a.created_at), '[]'::json)
              from public.assessments a where a.case_id = cs.id) as assessments,
           (select row_to_json(mk) from public.marks mk where mk.case_id = cs.id and mk.share_token = p_token) as mark
    from public.cases cs where cs.owner_id = v_owner
  ) c;
  return json_build_object('owner_name', v_name, 'cases', v_cases);
end; $$;
grant execute on function public.get_shared_logbook(text) to anon, authenticated;

-- 6) FINAL admin view — same fields; hides patient identity
create or replace function public.admin_all_cases()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_is_admin boolean; v_result json;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then raise exception 'Not authorized'; end if;
  select coalesce(json_agg(r order by r.created_at desc), '[]'::json) into v_result
  from (
    select cs.id, cs.case_no, cs.date, cs.age, cs.sex, cs.tribe,
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement,
           cs.supervisor, cs.supervisor_qualification, cs.admitted, cs.ward, cs.admission_date, cs.next_review, cs.hospital, cs.examination_findings, cs.outcome,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at, cs.owner_id,
           coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.surname,'')), ''), p.full_name, 'Unknown') as owner_name,
           p.institution as owner_institution,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section, 'caption', m.caption, 'follow_up_id', m.follow_up_id)), '[]'::json) from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note, 'type', f.type) order by f.created_at), '[]'::json) from public.follow_ups f where f.case_id = cs.id) as followups,
           (select coalesce(json_agg(json_build_object('type', a.type, 'rating', a.rating, 'strengths', a.strengths, 'improve', a.improve, 'assessor_name', a.assessor_name, 'assessor_role', a.assessor_role, 'verified', a.verified, 'created_at', a.created_at) order by a.created_at), '[]'::json) from public.assessments a where a.case_id = cs.id) as assessments
    from public.cases cs join public.profiles p on p.id = cs.owner_id
  ) r;
  return v_result;
end; $$;
grant execute on function public.admin_all_cases() to authenticated;
