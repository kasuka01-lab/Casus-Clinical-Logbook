-- ============================================================================
-- Casus — clinical-notes/documents upload, admitted-patient daily progress,
-- and review reminders. Run once: Supabase -> SQL Editor -> paste -> Run.
-- ============================================================================

-- allow document/file uploads (clinical notes), not just images/videos
alter table public.case_media drop constraint if exists case_media_kind_check;
alter table public.case_media add constraint case_media_kind_check check (kind in ('image','video','file'));

-- admitted patients, daily progress, and review reminders
alter table public.cases add column if not exists admitted boolean default false;
alter table public.cases add column if not exists admission_date date;
alter table public.cases add column if not exists ward text;
alter table public.cases add column if not exists next_review date;
alter table public.follow_ups add column if not exists type text not null default 'followup';

-- shared (examiner) view: include admission + progress notes; hide patient identity
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
           cs.supervisor, cs.supervisor_qualification, cs.admitted, cs.ward,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section)), '[]'::json)
              from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note, 'type', f.type) order by f.created_at), '[]'::json)
              from public.follow_ups f where f.case_id = cs.id) as followups,
           (select row_to_json(mk) from public.marks mk where mk.case_id = cs.id and mk.share_token = p_token) as mark
    from public.cases cs where cs.owner_id = v_owner
  ) c;
  return json_build_object('owner_name', v_name, 'cases', v_cases);
end; $$;
grant execute on function public.get_shared_logbook(text) to anon, authenticated;

-- admin view: include admission + progress notes; hide patient identity
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
           cs.supervisor, cs.supervisor_qualification, cs.admitted, cs.ward, cs.next_review,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at, cs.owner_id,
           coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.surname,'')), ''), p.full_name, 'Unknown') as owner_name,
           p.institution as owner_institution,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section)), '[]'::json) from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note, 'type', f.type) order by f.created_at), '[]'::json) from public.follow_ups f where f.case_id = cs.id) as followups
    from public.cases cs join public.profiles p on p.id = cs.owner_id
  ) r;
  return v_result;
end; $$;
grant execute on function public.admin_all_cases() to authenticated;
