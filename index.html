-- ============================================================================
-- Casebook — Supabase schema for a de-identified clinical logbook
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- institutions
create table if not exists public.institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------- profiles
-- One row per user. role drives access: trainee (default), assessor, admin.
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  role           text not null default 'trainee' check (role in ('trainee','assessor','admin')),
  institution_id uuid references public.institutions(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------- cases
-- De-identified by design: no patient name, no patient contact.
-- Optional initials only. case_no is generated per owner (C-0001, C-0002 ...).
create table if not exists public.cases (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  seq               int  not null,
  case_no           text not null,
  patient_initials  text,
  date              date,
  age               text,
  sex               text,
  tribe             text,
  title             text not null,
  diagnosis         text,
  specialty         text,
  category          text,
  involvement       text,
  description       text not null,
  management        text,
  challenges        text,
  discussion        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists cases_owner_idx on public.cases(owner_id);

-- per-owner sequential case number
create or replace function public.set_case_no()
returns trigger language plpgsql as $$
declare nextseq int;
begin
  select coalesce(max(seq),0)+1 into nextseq from public.cases where owner_id = new.owner_id;
  new.seq := nextseq;
  new.case_no := 'C-' || lpad(nextseq::text, 4, '0');
  return new;
end; $$;

drop trigger if exists trg_set_case_no on public.cases;
create trigger trg_set_case_no before insert on public.cases
for each row execute function public.set_case_no();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_touch_case on public.cases;
create trigger trg_touch_case before update on public.cases
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ case_media
create table if not exists public.case_media (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('image','video')),
  storage_path text not null,
  created_at   timestamptz not null default now()
);
create index if not exists media_case_idx on public.case_media(case_id);

-- ----------------------------------------------------------------- share_links
-- A revocable, unguessable token. Anyone with it can VIEW the logbook read-only.
create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(9),'hex'),
  label      text,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists share_token_idx on public.share_links(token);

-- ----------------------------------------------------------------------- marks
create table if not exists public.marks (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  share_token   text not null,
  score         text,
  comment       text,
  assessor_name text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (case_id, share_token)
);

-- ----------------------------------------------- create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY  (this is what makes each logbook genuinely private)
-- ============================================================================
alter table public.profiles     enable row level security;
alter table public.institutions enable row level security;
alter table public.cases        enable row level security;
alter table public.case_media   enable row level security;
alter table public.share_links  enable row level security;
alter table public.marks        enable row level security;

-- admin check (security definer so it bypasses RLS and can't recurse)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- institutions (everyone signed-in can read; only admin writes)
drop policy if exists "institutions read" on public.institutions;
create policy "institutions read" on public.institutions
  for select using (auth.role() = 'authenticated');
drop policy if exists "institutions admin write" on public.institutions;
create policy "institutions admin write" on public.institutions
  for all using (public.is_admin()) with check (public.is_admin());

-- cases (owner does everything to own rows; admin can read all)
drop policy if exists "cases owner all" on public.cases;
create policy "cases owner all" on public.cases
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "cases admin read" on public.cases;
create policy "cases admin read" on public.cases
  for select using (public.is_admin());

-- media
drop policy if exists "media owner all" on public.case_media;
create policy "media owner all" on public.case_media
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "media admin read" on public.case_media;
create policy "media admin read" on public.case_media
  for select using (public.is_admin());

-- share links
drop policy if exists "share owner all" on public.share_links;
create policy "share owner all" on public.share_links
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- marks (owner + admin read; writes happen via the security-definer RPC below)
drop policy if exists "marks owner read" on public.marks;
create policy "marks owner read" on public.marks
  for select using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- SHARED (link/token) ACCESS — read-only logbook + assessor marking
-- These run with definer rights and are gated entirely by a valid token.
-- ============================================================================
create or replace function public.get_shared_logbook(p_token text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_name text; v_cases json;
begin
  select owner_id into v_owner from public.share_links
    where token = p_token and revoked = false;
  if v_owner is null then return null; end if;

  select full_name into v_name from public.profiles where id = v_owner;

  select coalesce(json_agg(c order by c.created_at desc), '[]'::json) into v_cases
  from (
    select cs.id, cs.case_no, cs.patient_initials, cs.date, cs.age, cs.sex, cs.tribe,
           cs.title, cs.diagnosis, cs.specialty, cs.category, cs.involvement,
           cs.description, cs.management, cs.challenges, cs.discussion, cs.created_at,
           (select coalesce(json_agg(json_build_object('kind', m.kind, 'path', m.storage_path)), '[]'::json)
              from public.case_media m where m.case_id = cs.id) as media,
           (select row_to_json(mk) from public.marks mk
              where mk.case_id = cs.id and mk.share_token = p_token) as mark
    from public.cases cs where cs.owner_id = v_owner
  ) c;

  return json_build_object('owner_name', v_name, 'cases', v_cases);
end; $$;
grant execute on function public.get_shared_logbook(text) to anon, authenticated;

create or replace function public.submit_mark(
  p_token text, p_case_id uuid, p_score text, p_comment text, p_assessor text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.share_links
    where token = p_token and revoked = false;
  if v_owner is null then raise exception 'invalid or revoked link'; end if;
  if not exists (select 1 from public.cases where id = p_case_id and owner_id = v_owner) then
    raise exception 'case not in this logbook';
  end if;
  insert into public.marks (case_id, owner_id, share_token, score, comment, assessor_name)
  values (p_case_id, v_owner, p_token, p_score, p_comment, p_assessor)
  on conflict (case_id, share_token)
  do update set score = excluded.score, comment = excluded.comment,
                assessor_name = excluded.assessor_name, updated_at = now();
end; $$;
grant execute on function public.submit_mark(text, uuid, text, text, text) to anon, authenticated;

-- admin summary counts for the dashboard
create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return json_build_object(
    'users',        (select count(*) from public.profiles),
    'cases',        (select count(*) from public.cases),
    'institutions', (select count(*) from public.institutions),
    'share_links',  (select count(*) from public.share_links where revoked = false)
  );
end; $$;
grant execute on function public.admin_stats() to authenticated;

-- ============================================================================
-- STORAGE  (photos / short videos)
-- Bucket is public-read with unguessable UUID paths. Because every case is
-- de-identified, this is acceptable for v1. To harden later, make the bucket
-- private and serve signed URLs (see README -> "Hardening").
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('case-media', 'case-media', true)
on conflict (id) do nothing;

drop policy if exists "media upload own" on storage.objects;
create policy "media upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'case-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media modify own" on storage.objects;
create policy "media modify own" on storage.objects for update to authenticated
  using (bucket_id = 'case-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'case-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select
  using (bucket_id = 'case-media');

-- ============================================================================
-- MAKE YOURSELF THE ADMINISTRATOR
-- After you have signed up once in the app, run this with your email:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================
