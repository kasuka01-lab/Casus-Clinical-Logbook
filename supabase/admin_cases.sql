-- ============================================================================
-- Casus — let the administrator view everyone's cases (read-only).
-- Returns all clinical case content + images + follow-ups + who logged each,
-- but NEVER the private patient name or contact. Only works for admins.
-- Run once: Supabase -> SQL Editor -> paste -> Run.
-- ============================================================================
create or replace function public.admin_all_cases()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_is_admin boolean; v_result json;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Not authorized';
  end if;
  select coalesce(json_agg(r order by r.created_at desc), '[]'::json) into v_result
  from (
    select cs.id, cs.case_no, cs.date, cs.age, cs.sex, cs.tribe,
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement, cs.supervisor,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at,
           cs.owner_id,
           coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.surname,'')), ''), p.full_name, 'Unknown') as owner_name,
           p.institution as owner_institution,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path, 'section', m.section)), '[]'::json)
              from public.case_media m where m.case_id = cs.id) as media,
           (select coalesce(json_agg(json_build_object('date', f.date, 'note', f.note) order by f.created_at), '[]'::json)
              from public.follow_ups f where f.case_id = cs.id) as followups
    from public.cases cs
    join public.profiles p on p.id = cs.owner_id
  ) r;
  return v_result;
end; $$;
grant execute on function public.admin_all_cases() to authenticated;
