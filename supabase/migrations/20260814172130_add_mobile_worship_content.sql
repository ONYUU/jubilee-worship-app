-- Versioned sermon and setlist approval, mobile gallery/guide content, and DTOs.
-- Generated with `supabase migration new add_mobile_worship_content`.

begin;

create table public.event_sermon_revisions (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events (id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  sermon_topic text
    check (
      sermon_topic is null
      or (
        sermon_topic = btrim(sermon_topic)
        and sermon_topic <> ''
        and char_length(sermon_topic) <= 200
      )
    ),
  scripture_reference text
    check (
      scripture_reference is null
      or (
        scripture_reference = btrim(scripture_reference)
        and scripture_reference <> ''
        and char_length(scripture_reference) <= 300
      )
    ),
  status text not null default 'draft'
    check (status in ('draft', 'review_requested', 'published', 'withdrawn')),
  review_requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  withdrawn_at timestamptz,
  withdrawn_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint event_sermon_revisions_event_revision_unique
    unique (event_id, revision_no),
  constraint event_sermon_revisions_state_valid check (
    (
      status = 'draft'
      and review_requested_at is null
      and reviewed_at is null and reviewed_by is null
      and published_at is null and published_by is null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'review_requested'
      and sermon_topic is not null
      and scripture_reference is not null
      and review_requested_at is not null
      and reviewed_at is null and reviewed_by is null
      and published_at is null and published_by is null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'published'
      and sermon_topic is not null
      and scripture_reference is not null
      and review_requested_at is not null
      and reviewed_at is not null and reviewed_by is not null
      and published_at is not null and published_by is not null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'withdrawn'
      and sermon_topic is not null
      and scripture_reference is not null
      and reviewed_at is not null and reviewed_by is not null
      and published_at is not null and published_by is not null
      and withdrawn_at is not null and withdrawn_by is not null
    )
  )
);

create unique index event_sermon_revisions_one_published_idx
  on public.event_sermon_revisions (event_id)
  where status = 'published';

create index event_sermon_revisions_created_by_idx
  on public.event_sermon_revisions (created_by);
create index event_sermon_revisions_updated_by_idx
  on public.event_sermon_revisions (updated_by);
create index event_sermon_revisions_reviewed_by_idx
  on public.event_sermon_revisions (reviewed_by);
create index event_sermon_revisions_published_by_idx
  on public.event_sermon_revisions (published_by);
create index event_sermon_revisions_withdrawn_by_idx
  on public.event_sermon_revisions (withdrawn_by);

create table public.event_setlists (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events (id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  playlist_url text,
  status text not null default 'draft'
    check (status in ('draft', 'review_requested', 'published', 'withdrawn')),
  review_requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  withdrawn_at timestamptz,
  withdrawn_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint event_setlists_event_revision_unique unique (event_id, revision_no),
  constraint event_setlists_playlist_url_valid check (
    playlist_url is null
    or (
      playlist_url = btrim(playlist_url)
      and char_length(playlist_url) <= 1000
      and playlist_url ~* '^https://((www\.)?youtu\.be/|(www\.|m\.|music\.)?youtube\.com/(watch\?|playlist\?|shorts/|live/))[^[:space:]]+$'
    )
  ),
  constraint event_setlists_state_valid check (
    (
      status = 'draft'
      and review_requested_at is null
      and reviewed_at is null and reviewed_by is null
      and published_at is null and published_by is null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'review_requested'
      and review_requested_at is not null
      and reviewed_at is null and reviewed_by is null
      and published_at is null and published_by is null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'published'
      and review_requested_at is not null
      and reviewed_at is not null and reviewed_by is not null
      and published_at is not null and published_by is not null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'withdrawn'
      and reviewed_at is not null and reviewed_by is not null
      and published_at is not null and published_by is not null
      and withdrawn_at is not null and withdrawn_by is not null
    )
  )
);

create unique index event_setlists_one_published_idx
  on public.event_setlists (event_id)
  where status = 'published';

create index event_setlists_created_by_idx on public.event_setlists (created_by);
create index event_setlists_updated_by_idx on public.event_setlists (updated_by);
create index event_setlists_reviewed_by_idx on public.event_setlists (reviewed_by);
create index event_setlists_published_by_idx on public.event_setlists (published_by);
create index event_setlists_withdrawn_by_idx on public.event_setlists (withdrawn_by);

create table public.setlist_items (
  id bigint generated always as identity primary key,
  setlist_id bigint not null references public.event_setlists (id) on delete cascade,
  position integer not null check (position between 1 and 100),
  title text not null
    check (title = btrim(title) and title <> '' and char_length(title) <= 200),
  artist text
    check (
      artist is null
      or (artist = btrim(artist) and artist <> '' and char_length(artist) <= 200)
    ),
  musical_key text
    check (
      musical_key is null
      or (
        musical_key = btrim(musical_key)
        and musical_key <> ''
        and char_length(musical_key) <= 20
      )
    ),
  youtube_url text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint setlist_items_position_unique unique (setlist_id, position),
  constraint setlist_items_youtube_url_valid check (
    youtube_url is null
    or (
      youtube_url = btrim(youtube_url)
      and char_length(youtube_url) <= 1000
      and youtube_url ~* '^https://((www\.)?youtu\.be/|(www\.|m\.|music\.)?youtube\.com/(watch\?|playlist\?|shorts/|live/))[^[:space:]]+$'
    )
  )
);

create index setlist_items_created_by_idx on public.setlist_items (created_by);
create index setlist_items_updated_by_idx on public.setlist_items (updated_by);

create table public.gallery_items (
  id bigint generated always as identity primary key,
  media_path text not null
    check (
      media_path = btrim(media_path)
      and media_path <> ''
      and char_length(media_path) <= 1000
    ),
  thumbnail_path text
    check (
      thumbnail_path is null
      or (
        thumbnail_path = btrim(thumbnail_path)
        and thumbnail_path <> ''
        and char_length(thumbnail_path) <= 1000
      )
    ),
  alt text not null
    check (alt = btrim(alt) and alt <> '' and char_length(alt) <= 300),
  caption text
    check (
      caption is null
      or (caption = btrim(caption) and caption <> '' and char_length(caption) <= 2000)
    ),
  occurred_on date,
  sort_order integer not null default 100
    check (sort_order between 0 and 100000),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index gallery_items_created_by_idx on public.gallery_items (created_by);
create index gallery_items_updated_by_idx on public.gallery_items (updated_by);
create index gallery_items_public_order_idx
  on public.gallery_items (sort_order, occurred_on desc, id)
  where published = true;

create table public.guide_sections (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null
    check (title = btrim(title) and title <> '' and char_length(title) <= 200),
  body text not null
    check (body = btrim(body) and body <> '' and char_length(body) <= 20000),
  kind text not null
    check (kind in ('first_visit', 'parking', 'transit')),
  sort_order integer not null default 100
    check (sort_order between 0 and 100000),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index guide_sections_created_by_idx on public.guide_sections (created_by);
create index guide_sections_updated_by_idx on public.guide_sections (updated_by);
create index guide_sections_public_order_idx
  on public.guide_sections (sort_order, id)
  where published = true;

create or replace function private.is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users as admin_user
      where admin_user.user_id = (select auth.uid())
        and admin_user.role = 'owner'
        and admin_user.is_active = true
    );
$$;

revoke all on function private.is_active_owner() from public, anon, authenticated;
grant execute on function private.is_active_owner() to authenticated, service_role;

create or replace function private.touch_audit_row()
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
  return new;
end;
$$;

revoke all on function private.touch_audit_row() from public, anon, authenticated;

create or replace function private.prepare_sermon_revision_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(731901, pg_catalog.hashint8(new.event_id));
  select coalesce(max(revision.revision_no), 0) + 1
  into new.revision_no
  from public.event_sermon_revisions as revision
  where revision.event_id = new.event_id;

  new.status := 'draft';
  new.review_requested_at := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.published_at := null;
  new.published_by := null;
  new.withdrawn_at := null;
  new.withdrawn_by := null;
  return new;
end;
$$;

revoke all on function private.prepare_sermon_revision_insert()
from public, anon, authenticated;

create or replace function private.prepare_setlist_revision_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(731902, pg_catalog.hashint8(new.event_id));
  select coalesce(max(setlist.revision_no), 0) + 1
  into new.revision_no
  from public.event_setlists as setlist
  where setlist.event_id = new.event_id;

  new.status := 'draft';
  new.review_requested_at := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.published_at := null;
  new.published_by := null;
  new.withdrawn_at := null;
  new.withdrawn_by := null;
  return new;
end;
$$;

revoke all on function private.prepare_setlist_revision_insert()
from public, anon, authenticated;

create trigger event_sermon_revisions_10_prepare
before insert on public.event_sermon_revisions
for each row execute function private.prepare_sermon_revision_insert();

create trigger event_sermon_revisions_90_touch
before insert or update on public.event_sermon_revisions
for each row execute function private.touch_audit_row();

create trigger event_setlists_10_prepare
before insert on public.event_setlists
for each row execute function private.prepare_setlist_revision_insert();

create trigger event_setlists_90_touch
before insert or update on public.event_setlists
for each row execute function private.touch_audit_row();

create trigger setlist_items_touch
before insert or update on public.setlist_items
for each row execute function private.touch_audit_row();

create trigger gallery_items_touch
before insert or update on public.gallery_items
for each row execute function private.touch_content_row();

create trigger guide_sections_touch
before insert or update on public.guide_sections
for each row execute function private.touch_content_row();

create or replace function public.request_event_sermon_review(target_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  update public.event_sermon_revisions
  set status = 'review_requested',
      review_requested_at = statement_timestamp()
  where id = target_revision_id
    and status = 'draft'
    and sermon_topic is not null
    and scripture_reference is not null;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A complete draft sermon revision is required for review';
  end if;
end;
$$;

create or replace function public.publish_event_sermon_revision(target_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_id bigint;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select revision.event_id
  into target_event_id
  from public.event_sermon_revisions as revision
  where revision.id = target_revision_id
    and revision.status = 'review_requested'
    and revision.sermon_topic is not null
    and revision.scripture_reference is not null
  for update;

  if target_event_id is null then
    raise exception using
      errcode = '23514',
      message = 'A reviewed sermon revision is required for publication';
  end if;

  update public.event_sermon_revisions
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where event_id = target_event_id
    and status = 'published';

  update public.event_sermon_revisions
  set status = 'published',
      reviewed_at = statement_timestamp(),
      reviewed_by = actor,
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_revision_id;
end;
$$;

create or replace function public.return_event_sermon_revision_to_draft(target_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.event_sermon_revisions
  set status = 'draft',
      review_requested_at = null
  where id = target_revision_id
    and status = 'review_requested';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A review-requested sermon revision is required for return';
  end if;
end;
$$;

create or replace function public.withdraw_event_sermon_revision(target_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.event_sermon_revisions
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where id = target_revision_id
    and status = 'published';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A published sermon revision is required for withdrawal';
  end if;
end;
$$;

create or replace function public.request_event_setlist_review(target_setlist_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  update public.event_setlists as setlist
  set status = 'review_requested',
      review_requested_at = statement_timestamp()
  where setlist.id = target_setlist_id
    and setlist.status = 'draft'
    and exists (
      select 1
      from public.setlist_items as item
      where item.setlist_id = setlist.id
    );

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A non-empty draft setlist is required for review';
  end if;
end;
$$;

create or replace function public.publish_event_setlist_revision(target_setlist_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_id bigint;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select setlist.event_id
  into target_event_id
  from public.event_setlists as setlist
  where setlist.id = target_setlist_id
    and setlist.status = 'review_requested'
    and exists (
      select 1
      from public.setlist_items as item
      where item.setlist_id = setlist.id
    )
  for update;

  if target_event_id is null then
    raise exception using
      errcode = '23514',
      message = 'A reviewed non-empty setlist is required for publication';
  end if;

  update public.event_setlists
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where event_id = target_event_id
    and status = 'published';

  update public.event_setlists
  set status = 'published',
      reviewed_at = statement_timestamp(),
      reviewed_by = actor,
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_setlist_id;
end;
$$;

create or replace function public.return_event_setlist_revision_to_draft(target_setlist_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.event_setlists
  set status = 'draft',
      review_requested_at = null
  where id = target_setlist_id
    and status = 'review_requested';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A review-requested setlist is required for return';
  end if;
end;
$$;

create or replace function public.withdraw_event_setlist_revision(target_setlist_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_active_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.event_setlists
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where id = target_setlist_id
    and status = 'published';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A published setlist is required for withdrawal';
  end if;
end;
$$;

revoke all on function public.request_event_sermon_review(bigint)
from public, anon, authenticated;
revoke all on function public.publish_event_sermon_revision(bigint)
from public, anon, authenticated;
revoke all on function public.return_event_sermon_revision_to_draft(bigint)
from public, anon, authenticated;
revoke all on function public.withdraw_event_sermon_revision(bigint)
from public, anon, authenticated;
revoke all on function public.request_event_setlist_review(bigint)
from public, anon, authenticated;
revoke all on function public.publish_event_setlist_revision(bigint)
from public, anon, authenticated;
revoke all on function public.return_event_setlist_revision_to_draft(bigint)
from public, anon, authenticated;
revoke all on function public.withdraw_event_setlist_revision(bigint)
from public, anon, authenticated;

grant execute on function
  public.request_event_sermon_review(bigint),
  public.publish_event_sermon_revision(bigint),
  public.return_event_sermon_revision_to_draft(bigint),
  public.withdraw_event_sermon_revision(bigint),
  public.request_event_setlist_review(bigint),
  public.publish_event_setlist_revision(bigint),
  public.return_event_setlist_revision_to_draft(bigint),
  public.withdraw_event_setlist_revision(bigint)
to authenticated, service_role;

alter table public.event_sermon_revisions enable row level security;
alter table public.event_setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.gallery_items enable row level security;
alter table public.guide_sections enable row level security;

create policy event_sermon_revisions_public_read
on public.event_sermon_revisions
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.events as event
    where event.id = event_id and event.published = true
  )
);

create policy event_sermon_revisions_authenticated_read
on public.event_sermon_revisions
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.events as event
      where event.id = event_id and event.published = true
    )
  )
  or (select private.is_active_admin())
);

create policy event_sermon_revisions_admin_insert
on public.event_sermon_revisions for insert to authenticated
with check (status = 'draft' and (select private.is_active_admin()));

create policy event_sermon_revisions_admin_update_draft
on public.event_sermon_revisions for update to authenticated
using (status = 'draft' and (select private.is_active_admin()))
with check (status = 'draft' and (select private.is_active_admin()));

create policy event_sermon_revisions_admin_delete_draft
on public.event_sermon_revisions for delete to authenticated
using (status = 'draft' and (select private.is_active_admin()));

create policy event_setlists_public_read
on public.event_setlists
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.events as event
    where event.id = event_id and event.published = true
  )
);

create policy event_setlists_authenticated_read
on public.event_setlists
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.events as event
      where event.id = event_id and event.published = true
    )
  )
  or (select private.is_active_admin())
);

create policy event_setlists_admin_insert
on public.event_setlists for insert to authenticated
with check (status = 'draft' and (select private.is_active_admin()));

create policy event_setlists_admin_update_draft
on public.event_setlists for update to authenticated
using (status = 'draft' and (select private.is_active_admin()))
with check (status = 'draft' and (select private.is_active_admin()));

create policy event_setlists_admin_delete_draft
on public.event_setlists for delete to authenticated
using (status = 'draft' and (select private.is_active_admin()));

create policy setlist_items_public_read
on public.setlist_items
for select
to anon
using (
  exists (
    select 1
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where setlist.id = setlist_id
      and setlist.status = 'published'
      and event.published = true
  )
);

create policy setlist_items_authenticated_read
on public.setlist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where setlist.id = setlist_id
      and setlist.status = 'published'
      and event.published = true
  )
  or (select private.is_active_admin())
);

create policy setlist_items_admin_insert_draft
on public.setlist_items for insert to authenticated
with check (
  (select private.is_active_admin())
  and exists (
    select 1 from public.event_setlists as setlist
    where setlist.id = setlist_id and setlist.status = 'draft'
  )
);

create policy setlist_items_admin_update_draft
on public.setlist_items for update to authenticated
using (
  (select private.is_active_admin())
  and exists (
    select 1 from public.event_setlists as setlist
    where setlist.id = setlist_id and setlist.status = 'draft'
  )
)
with check (
  (select private.is_active_admin())
  and exists (
    select 1 from public.event_setlists as setlist
    where setlist.id = setlist_id and setlist.status = 'draft'
  )
);

create policy setlist_items_admin_delete_draft
on public.setlist_items for delete to authenticated
using (
  (select private.is_active_admin())
  and exists (
    select 1 from public.event_setlists as setlist
    where setlist.id = setlist_id and setlist.status = 'draft'
  )
);

create policy gallery_items_public_read
on public.gallery_items for select to anon
using (published = true);

create policy gallery_items_authenticated_read
on public.gallery_items for select to authenticated
using (published = true or (select private.is_active_admin()));

create policy gallery_items_admin_insert
on public.gallery_items for insert to authenticated
with check ((select private.is_active_admin()));

create policy gallery_items_admin_update
on public.gallery_items for update to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy gallery_items_admin_delete
on public.gallery_items for delete to authenticated
using ((select private.is_active_admin()));

create policy guide_sections_public_read
on public.guide_sections for select to anon
using (published = true);

create policy guide_sections_authenticated_read
on public.guide_sections for select to authenticated
using (published = true or (select private.is_active_admin()));

create policy guide_sections_admin_insert
on public.guide_sections for insert to authenticated
with check ((select private.is_active_admin()));

create policy guide_sections_admin_update
on public.guide_sections for update to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy guide_sections_admin_delete
on public.guide_sections for delete to authenticated
using ((select private.is_active_admin()));

revoke all on table public.event_sermon_revisions from public, anon, authenticated;
revoke all on table public.event_setlists from public, anon, authenticated;
revoke all on table public.setlist_items from public, anon, authenticated;
revoke all on table public.gallery_items from public, anon, authenticated;
revoke all on table public.guide_sections from public, anon, authenticated;

grant select (
  event_id, revision_no, sermon_topic, scripture_reference, status, published_at
)
on public.event_sermon_revisions to anon, authenticated;

grant select (
  id, event_id, revision_no, playlist_url, status, published_at
)
on public.event_setlists to anon, authenticated;

grant select (id, review_requested_at, reviewed_at, withdrawn_at)
on public.event_sermon_revisions to authenticated;

grant select (review_requested_at, reviewed_at, withdrawn_at)
on public.event_setlists to authenticated;

grant select (
  id, setlist_id, position, title, artist, musical_key, youtube_url
)
on public.setlist_items to anon, authenticated;

grant select (
  id, media_path, thumbnail_path, alt, caption, occurred_on, sort_order, published
)
on public.gallery_items to anon, authenticated;

grant select (id, slug, title, body, kind, sort_order, published)
on public.guide_sections to anon, authenticated;

grant select (created_at, updated_at)
on public.event_sermon_revisions to authenticated;
grant select (created_at, updated_at)
on public.event_setlists to authenticated;
grant select (created_at, updated_at)
on public.setlist_items to authenticated;
grant select (created_at, updated_at, published_at)
on public.gallery_items to authenticated;
grant select (created_at, updated_at, published_at)
on public.guide_sections to authenticated;

grant insert (event_id, sermon_topic, scripture_reference),
  update (sermon_topic, scripture_reference), delete
on public.event_sermon_revisions to authenticated;

grant insert (event_id, playlist_url), update (playlist_url), delete
on public.event_setlists to authenticated;

grant insert (setlist_id, position, title, artist, musical_key, youtube_url),
  update (position, title, artist, musical_key, youtube_url), delete
on public.setlist_items to authenticated;

grant insert (
  media_path, thumbnail_path, alt, caption, occurred_on, sort_order, published
), update (
  media_path, thumbnail_path, alt, caption, occurred_on, sort_order, published
), delete
on public.gallery_items to authenticated;

grant insert (slug, title, body, kind, sort_order, published),
  update (slug, title, body, kind, sort_order, published), delete
on public.guide_sections to authenticated;

grant usage, select on sequence
  public.event_sermon_revisions_id_seq,
  public.event_setlists_id_seq,
  public.setlist_items_id_seq,
  public.gallery_items_id_seq,
  public.guide_sections_id_seq
to authenticated, service_role;

grant all on table
  public.event_sermon_revisions,
  public.event_setlists,
  public.setlist_items,
  public.gallery_items,
  public.guide_sections
to service_role;

create or replace view public.public_events
with (security_invoker = true, security_barrier = true)
as
select
  event.id,
  event.slug,
  event.title,
  event.starts_at,
  event.ends_at,
  event.timezone,
  event.venue_name,
  event.address,
  event.description,
  event.status,
  event.registration_url,
  event.hero_media_path,
  event.source_url,
  event.featured,
  sermon.sermon_topic,
  sermon.scripture_reference,
  sermon.revision_no as sermon_revision_no,
  sermon.published_at as sermon_published_at
from public.events as event
left join public.event_sermon_revisions as sermon
  on sermon.event_id = event.id and sermon.status = 'published'
where event.published = true;

create view public.public_event_setlists
with (security_invoker = true, security_barrier = true)
as
select
  setlist.event_id,
  event.slug as event_slug,
  setlist.revision_no,
  setlist.published_at,
  setlist.playlist_url,
  (setlist.revision_no > 1) as is_changed
from public.event_setlists as setlist
join public.events as event on event.id = setlist.event_id
where setlist.status = 'published'
  and event.published = true;

create view public.public_setlist_items
with (security_invoker = true, security_barrier = true)
as
select
  item.id,
  setlist.event_id,
  item.position,
  item.title,
  item.artist,
  item.musical_key,
  item.youtube_url
from public.setlist_items as item
join public.event_setlists as setlist on setlist.id = item.setlist_id
join public.events as event on event.id = setlist.event_id
where setlist.status = 'published'
  and event.published = true;

create view public.public_gallery_items
with (security_invoker = true, security_barrier = true)
as
select
  id, media_path, thumbnail_path, alt, caption, occurred_on, sort_order
from public.gallery_items
where published = true;

create view public.public_guide_sections
with (security_invoker = true, security_barrier = true)
as
select id, slug, title, body, kind, sort_order
from public.guide_sections
where published = true;

revoke all on table
  public.public_event_setlists,
  public.public_setlist_items,
  public.public_gallery_items,
  public.public_guide_sections
from public, anon, authenticated;

grant select on table
  public.public_event_setlists,
  public.public_setlist_items,
  public.public_gallery_items,
  public.public_guide_sections
to anon, authenticated, service_role;

commit;
