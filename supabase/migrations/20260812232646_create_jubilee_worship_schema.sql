-- Jubilee Worship initial database, authorization, public DTO, and Storage setup.
-- Generated with `supabase migration new create_jubilee_worship_schema`.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp()
);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  name_ko text not null default '쥬빌리워십',
  name_en text not null default 'JUBILEE WORSHIP',
  eyebrow text not null default 'Sundoo Church Worship Ministry',
  hero_title text not null,
  hero_description text not null,
  hero_media_path text,
  hero_media_mobile_path text,
  hero_media_alt text,
  about_title text not null,
  about_body text not null,
  about_media_path text,
  about_media_alt text,
  worship_media_path text,
  worship_media_alt text,
  visit_media_path text,
  visit_media_alt text,
  og_media_path text,
  logo_primary_path text,
  logo_inverse_path text,
  instagram_url text not null,
  youtube_channel_url text not null,
  youtube_channel_id text not null
    check (youtube_channel_id = 'UCxmosyyztNo7HBUOdN_gy9w'),
  church_name text not null default '선두교회',
  church_url text not null,
  church_jubilee_url text not null,
  church_location_url text not null,
  address text not null,
  phone_display text not null,
  phone_href text not null,
  contact_email text,
  naver_map_url text not null,
  kakao_map_url text not null,
  seo_title text not null,
  seo_description text not null,
  updated_at timestamptz not null default statement_timestamp(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.events (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Asia/Seoul'
    check (timezone = 'Asia/Seoul'),
  venue_name text not null default '선두교회 본당',
  address text not null,
  description text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'postponed', 'cancelled', 'completed')),
  registration_url text,
  hero_media_path text,
  source_url text,
  featured boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint events_valid_time_range
    check (ends_at is null or ends_at > starts_at)
);

create table public.announcements (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_id bigint references public.events (id) on delete set null,
  kind text not null default 'normal'
    check (kind in ('normal', 'important', 'schedule_change', 'cancellation')),
  title text not null check (btrim(title) <> ''),
  body text not null check (btrim(body) <> ''),
  starts_at timestamptz,
  expires_at timestamptz,
  pinned boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint announcements_valid_time_range
    check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table private.youtube_channel_allowlist (
  channel_id text primary key,
  channel_url text not null,
  source_label text not null,
  is_active boolean not null default true,
  verified_at timestamptz not null
);

alter table private.youtube_channel_allowlist enable row level security;

insert into private.youtube_channel_allowlist (
  channel_id,
  channel_url,
  source_label,
  is_active,
  verified_at
)
values (
  'UCxmosyyztNo7HBUOdN_gy9w',
  'https://www.youtube.com/@JUBILEEWORSHIP-25',
  'Jubilee Worship(쥬빌리 워십)',
  true,
  '2026-08-13T00:00:00+09:00'::timestamptz
);

create table public.media_items (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  kind text not null default 'youtube_video'
    check (kind in ('youtube_video', 'youtube_playlist', 'instagram_post', 'image')),
  provider text not null
    check (provider in ('youtube', 'instagram', 'internal')),
  provider_id text,
  external_url text,
  source_label text,
  youtube_channel_id text,
  verification_status text not null default 'pending'
    check (verification_status in ('not_required', 'pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  thumbnail_path text,
  thumbnail_alt text,
  occurred_on date,
  description text,
  featured boolean not null default false,
  sort_order integer not null default 100,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint media_items_provider_data check (
    (
      provider = 'youtube'
      and kind in ('youtube_video', 'youtube_playlist')
      and provider_id is not null
      and external_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'
      and youtube_channel_id is not null
      and verification_status <> 'not_required'
      and (
        (kind = 'youtube_video' and provider_id ~ '^[A-Za-z0-9_-]{11}$')
        or
        (kind = 'youtube_playlist' and provider_id ~ '^[A-Za-z0-9_-]{10,64}$')
      )
    )
    or
    (
      provider = 'instagram'
      and kind = 'instagram_post'
      and external_url ~* '^https://(www\.)?instagram\.com/(p|reel)/'
      and youtube_channel_id is null
      and verification_status = 'not_required'
    )
    or
    (
      provider = 'internal'
      and kind = 'image'
      and thumbnail_path is not null
      and youtube_channel_id is null
      and verification_status = 'not_required'
    )
  )
);

create table public.team_members (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and name <> ''),
  role_title text not null check (role_title = btrim(role_title) and role_title <> ''),
  category text not null default 'minister'
    check (category in ('minister', 'worship_leader', 'vocal', 'session', 'staff')),
  photo_path text,
  photo_alt text,
  bio text,
  sort_order integer not null default 100,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint team_members_name_role_unique unique (name, role_title)
);

create index site_settings_updated_by_idx on public.site_settings (updated_by);

create index events_created_by_idx on public.events (created_by);
create index events_updated_by_idx on public.events (updated_by);
create index events_public_schedule_idx
  on public.events (starts_at)
  where published = true and status in ('scheduled', 'postponed');

create index announcements_event_id_idx on public.announcements (event_id);
create index announcements_created_by_idx on public.announcements (created_by);
create index announcements_updated_by_idx on public.announcements (updated_by);
create index announcements_public_order_idx
  on public.announcements (pinned desc, starts_at, expires_at, created_at desc)
  where published = true;

create index media_items_verified_by_idx on public.media_items (verified_by);
create index media_items_created_by_idx on public.media_items (created_by);
create index media_items_updated_by_idx on public.media_items (updated_by);
create index media_items_public_order_idx
  on public.media_items (featured desc, occurred_on desc, sort_order, created_at desc)
  where published = true;

create index team_members_created_by_idx on public.team_members (created_by);
create index team_members_updated_by_idx on public.team_members (updated_by);
create index team_members_public_order_idx
  on public.team_members (sort_order, name)
  where published = true;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users as au
      where au.user_id = (select auth.uid())
        and au.is_active = true
    );
$$;

revoke all on function private.is_active_admin() from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_active_admin() to authenticated, service_role;

create or replace function private.touch_site_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function private.touch_site_settings() from public, anon, authenticated;

create or replace function private.touch_content_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    new.created_by := actor;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;

  new.updated_at := statement_timestamp();
  new.updated_by := actor;

  if new.published then
    if tg_op = 'INSERT' or old.published = false then
      new.published_at := statement_timestamp();
    else
      new.published_at := old.published_at;
    end if;
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

revoke all on function private.touch_content_row() from public, anon, authenticated;

create or replace function private.enforce_media_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_is_allowed boolean := false;
begin
  if new.provider <> 'youtube' then
    new.youtube_channel_id := null;
    new.verification_status := 'not_required';
    new.verified_at := null;
    new.verified_by := null;
    return new;
  end if;

  select exists (
    select 1
    from private.youtube_channel_allowlist as allowed
    where allowed.channel_id = new.youtube_channel_id
      and allowed.is_active = true
  ) into source_is_allowed;

  if new.verification_status = 'verified' then
    if not source_is_allowed then
      raise exception using
        errcode = '23514',
        message = 'YouTube channel is not on the active allowlist';
    end if;

    if tg_op = 'INSERT'
      or old.verification_status is distinct from 'verified'
      or old.provider_id is distinct from new.provider_id
      or old.external_url is distinct from new.external_url
      or old.youtube_channel_id is distinct from new.youtube_channel_id
    then
      new.verified_at := statement_timestamp();
      new.verified_by := (select auth.uid());
    else
      new.verified_at := old.verified_at;
      new.verified_by := old.verified_by;
    end if;
  else
    new.verified_at := null;
    new.verified_by := null;
  end if;

  if new.published and new.verification_status <> 'verified' then
    raise exception using
      errcode = '23514',
      message = 'A YouTube item must be verified before publication';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_media_source() from public, anon, authenticated;

create trigger site_settings_touch
before insert or update on public.site_settings
for each row execute function private.touch_site_settings();

create trigger events_touch
before insert or update on public.events
for each row execute function private.touch_content_row();

create trigger announcements_touch
before insert or update on public.announcements
for each row execute function private.touch_content_row();

create trigger media_items_10_enforce_source
before insert or update on public.media_items
for each row execute function private.enforce_media_source();

create trigger media_items_90_touch
before insert or update on public.media_items
for each row execute function private.touch_content_row();

create trigger team_members_touch
before insert or update on public.team_members
for each row execute function private.touch_content_row();

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.media_items enable row level security;
alter table public.team_members enable row level security;

create policy admin_users_read_self
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()) and is_active = true);

create policy site_settings_public_read
on public.site_settings
for select
to anon, authenticated
using (true);

create policy site_settings_admin_update
on public.site_settings
for update
to authenticated
using ((select private.is_active_admin()))
with check (id = 1 and (select private.is_active_admin()));

create policy events_public_read
on public.events
for select
to anon
using (published = true);

create policy events_authenticated_read
on public.events
for select
to authenticated
using (published = true or (select private.is_active_admin()));

create policy events_admin_insert
on public.events
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy events_admin_update
on public.events
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy events_admin_delete
on public.events
for delete
to authenticated
using ((select private.is_active_admin()));

create policy announcements_public_read
on public.announcements
for select
to anon
using (
  published = true
  and (starts_at is null or starts_at <= statement_timestamp())
  and (expires_at is null or expires_at > statement_timestamp())
);

create policy announcements_authenticated_read
on public.announcements
for select
to authenticated
using (
  (
    published = true
    and (starts_at is null or starts_at <= statement_timestamp())
    and (expires_at is null or expires_at > statement_timestamp())
  )
  or (select private.is_active_admin())
);

create policy announcements_admin_insert
on public.announcements
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy announcements_admin_update
on public.announcements
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy announcements_admin_delete
on public.announcements
for delete
to authenticated
using ((select private.is_active_admin()));

create policy media_items_public_read
on public.media_items
for select
to anon
using (published = true);

create policy media_items_authenticated_read
on public.media_items
for select
to authenticated
using (published = true or (select private.is_active_admin()));

create policy media_items_admin_insert
on public.media_items
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy media_items_admin_update
on public.media_items
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy media_items_admin_delete
on public.media_items
for delete
to authenticated
using ((select private.is_active_admin()));

create policy team_members_public_read
on public.team_members
for select
to anon
using (published = true);

create policy team_members_authenticated_read
on public.team_members
for select
to authenticated
using (published = true or (select private.is_active_admin()));

create policy team_members_admin_insert
on public.team_members
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy team_members_admin_update
on public.team_members
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy team_members_admin_delete
on public.team_members
for delete
to authenticated
using ((select private.is_active_admin()));

-- Revoke broad Data API access before applying explicit column grants.
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.announcements from anon, authenticated;
revoke all on table public.media_items from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

grant select (user_id, role, is_active)
on public.admin_users to authenticated;

grant select (
  id, name_ko, name_en, eyebrow, hero_title, hero_description,
  hero_media_path, hero_media_mobile_path, hero_media_alt,
  about_title, about_body, about_media_path, about_media_alt,
  worship_media_path, worship_media_alt, visit_media_path, visit_media_alt,
  og_media_path, logo_primary_path, logo_inverse_path,
  instagram_url, youtube_channel_url, youtube_channel_id,
  church_name, church_url, church_jubilee_url, church_location_url,
  address, phone_display, phone_href, naver_map_url, kakao_map_url,
  seo_title, seo_description
)
on public.site_settings to anon, authenticated;

grant select (
  id, slug, title, starts_at, ends_at, timezone, venue_name, address,
  description, status, registration_url, hero_media_path, source_url,
  featured, published
)
on public.events to anon, authenticated;

grant select (
  id, slug, event_id, kind, title, body, starts_at, expires_at, pinned, published
)
on public.announcements to anon, authenticated;

grant select (
  id, slug, title, kind, provider, provider_id, external_url, source_label,
  youtube_channel_id, thumbnail_path, thumbnail_alt, occurred_on, description,
  featured, sort_order, published
)
on public.media_items to anon, authenticated;

grant select (
  id, name, role_title, category, photo_path, photo_alt, bio, sort_order, published
)
on public.team_members to anon, authenticated;

-- Admin list/detail screens need lifecycle timestamps and media verification state.
-- RLS still limits normal authenticated users to published rows; identity UUIDs remain private.
grant select (updated_at)
on public.site_settings to authenticated;

grant select (created_at, updated_at, published_at)
on public.events to authenticated;

grant select (created_at, updated_at, published_at)
on public.announcements to authenticated;

grant select (
  verification_status, verified_at, created_at, updated_at, published_at
)
on public.media_items to authenticated;

grant select (created_at, updated_at, published_at)
on public.team_members to authenticated;

grant update (
  name_ko, name_en, eyebrow, hero_title, hero_description,
  hero_media_path, hero_media_mobile_path, hero_media_alt,
  about_title, about_body, about_media_path, about_media_alt,
  worship_media_path, worship_media_alt, visit_media_path, visit_media_alt,
  og_media_path, logo_primary_path, logo_inverse_path,
  instagram_url, youtube_channel_url, youtube_channel_id,
  church_name, church_url, church_jubilee_url, church_location_url,
  address, phone_display, phone_href, contact_email,
  naver_map_url, kakao_map_url, seo_title, seo_description
)
on public.site_settings to authenticated;

grant insert (
  slug, title, starts_at, ends_at, timezone, venue_name, address, description,
  status, registration_url, hero_media_path, source_url, featured, published
), update (
  slug, title, starts_at, ends_at, timezone, venue_name, address, description,
  status, registration_url, hero_media_path, source_url, featured, published
), delete
on public.events to authenticated;

grant insert (
  slug, event_id, kind, title, body, starts_at, expires_at, pinned, published
), update (
  slug, event_id, kind, title, body, starts_at, expires_at, pinned, published
), delete
on public.announcements to authenticated;

grant insert (
  slug, title, kind, provider, provider_id, external_url, source_label,
  youtube_channel_id, verification_status, thumbnail_path, thumbnail_alt,
  occurred_on, description, featured, sort_order, published
), update (
  slug, title, kind, provider, provider_id, external_url, source_label,
  youtube_channel_id, verification_status, thumbnail_path, thumbnail_alt,
  occurred_on, description, featured, sort_order, published
), delete
on public.media_items to authenticated;

grant insert (
  name, role_title, category, photo_path, photo_alt, bio, sort_order, published
), update (
  name, role_title, category, photo_path, photo_alt, bio, sort_order, published
), delete
on public.team_members to authenticated;

grant usage, select on sequence
  public.events_id_seq,
  public.announcements_id_seq,
  public.media_items_id_seq,
  public.team_members_id_seq
to authenticated, service_role;

grant all on table
  public.admin_users,
  public.site_settings,
  public.events,
  public.announcements,
  public.media_items,
  public.team_members
to service_role;

create view public.public_site_settings
with (security_invoker = true, security_barrier = true)
as
select
  id, name_ko, name_en, eyebrow, hero_title, hero_description,
  hero_media_path, hero_media_mobile_path, hero_media_alt,
  about_title, about_body, about_media_path, about_media_alt,
  worship_media_path, worship_media_alt, visit_media_path, visit_media_alt,
  og_media_path, logo_primary_path, logo_inverse_path,
  instagram_url, youtube_channel_url, youtube_channel_id,
  church_name, church_url, church_jubilee_url, church_location_url,
  address, phone_display, phone_href, naver_map_url, kakao_map_url,
  seo_title, seo_description
from public.site_settings;

create view public.public_events
with (security_invoker = true, security_barrier = true)
as
select
  id, slug, title, starts_at, ends_at, timezone, venue_name, address,
  description, status, registration_url, hero_media_path, source_url, featured
from public.events
where published = true;

create view public.public_announcements
with (security_invoker = true, security_barrier = true)
as
select
  id, slug, event_id, kind, title, body, starts_at, expires_at, pinned
from public.announcements
where published = true
  and (starts_at is null or starts_at <= statement_timestamp())
  and (expires_at is null or expires_at > statement_timestamp());

create view public.public_media_items
with (security_invoker = true, security_barrier = true)
as
select
  id, slug, title, kind, provider, provider_id, external_url, source_label,
  youtube_channel_id, thumbnail_path, thumbnail_alt, occurred_on, description,
  featured, sort_order
from public.media_items
where published = true;

create view public.public_team_members
with (security_invoker = true, security_barrier = true)
as
select
  id, name, role_title, category, photo_path, photo_alt, bio, sort_order
from public.team_members
where published = true;

revoke all on table
  public.public_site_settings,
  public.public_events,
  public.public_announcements,
  public.public_media_items,
  public.public_team_members
from public, anon, authenticated;

grant select on table
  public.public_site_settings,
  public.public_events,
  public.public_announcements,
  public.public_media_items,
  public.public_team_members
to anon, authenticated, service_role;

-- The public bucket is readable by URL. All write/list operations require an active admin.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'public-media',
  'public-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on table storage.objects from anon, authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

create policy public_media_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
);

create policy public_media_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and (storage.foldername(name))[1] in ('brand', 'hero', 'gallery', 'team', 'og')
);

create policy public_media_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
)
with check (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and (storage.foldername(name))[1] in ('brand', 'hero', 'gallery', 'team', 'og')
);

create policy public_media_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
);

commit;
