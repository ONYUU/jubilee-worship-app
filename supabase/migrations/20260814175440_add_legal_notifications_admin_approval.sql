-- Legal-document publication, private push delivery, and owner-approved admins.
-- Generated with `supabase migration new add_legal_notifications_admin_approval`.

begin;

-- ---------------------------------------------------------------------------
-- Owner-approved administrator membership
-- ---------------------------------------------------------------------------

alter table public.admin_users
  add column approved_by uuid references auth.users (id) on delete set null,
  add column approved_at timestamptz,
  add column updated_at timestamptz not null default statement_timestamp();

create index admin_users_approved_by_idx on public.admin_users (approved_by);

create or replace function private.is_owner()
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

revoke all on function private.is_owner() from public, anon, authenticated;
grant execute on function private.is_owner() to authenticated, service_role;

create or replace function private.touch_admin_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.touch_admin_user() from public, anon, authenticated;

create trigger admin_users_touch
before update on public.admin_users
for each row execute function private.touch_admin_user();

drop policy admin_users_read_self on public.admin_users;

create policy admin_users_read_self_or_owner
on public.admin_users
for select
to authenticated
using (
  (user_id = (select auth.uid()) and is_active = true)
  or (select private.is_owner())
);

grant select (approved_by, approved_at, created_at, updated_at)
on public.admin_users to authenticated;

create or replace function public.approve_admin_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_user_id is null or not exists (
    select 1 from auth.users as auth_user where auth_user.id = target_user_id
  ) then
    raise exception using errcode = '23503', message = 'Auth user does not exist';
  end if;

  insert into public.admin_users (
    user_id, role, is_active, approved_by, approved_at, updated_at
  )
  values (
    target_user_id, 'editor', true, actor, statement_timestamp(), statement_timestamp()
  )
  on conflict (user_id) do update
  set is_active = true,
      approved_by = actor,
      approved_at = statement_timestamp();
end;
$$;

create or replace function public.set_admin_user_active(
  target_user_id uuid,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_role text;
  current_is_active boolean;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_user_id is null or target_is_active is null then
    raise exception using errcode = '22004', message = 'Target user and active state are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731910, 1);

  select admin_user.role, admin_user.is_active
  into target_role, current_is_active
  from public.admin_users as admin_user
  where admin_user.user_id = target_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Administrator does not exist';
  end if;

  if target_user_id = actor and target_is_active = false then
    raise exception using errcode = '23514', message = 'An owner cannot deactivate their own account';
  end if;

  if current_is_active = true
    and target_is_active = false
    and target_role = 'owner'
    and (
      select count(*)
      from public.admin_users as admin_user
      where admin_user.role = 'owner' and admin_user.is_active = true
    ) <= 1
  then
    raise exception using errcode = '23514', message = 'The last active owner cannot be deactivated';
  end if;

  update public.admin_users
  set is_active = target_is_active,
      approved_by = case when target_is_active then actor else approved_by end,
      approved_at = case when target_is_active then statement_timestamp() else approved_at end
  where user_id = target_user_id;
end;
$$;

create or replace function public.set_admin_user_role(
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_admin_role text;
  current_is_active boolean;
  active_owner_count integer;
  requested_role text := $2;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_user_id is null or requested_role not in ('owner', 'editor') then
    raise exception using errcode = '22023', message = 'Role must be owner or editor';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731910, 1);

  select admin_user.role, admin_user.is_active
  into existing_admin_role, current_is_active
  from public.admin_users as admin_user
  where admin_user.user_id = target_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Administrator does not exist';
  end if;

  select count(*)::integer
  into active_owner_count
  from public.admin_users as admin_user
  where admin_user.role = 'owner' and admin_user.is_active = true;

  if existing_admin_role = 'owner'
    and requested_role = 'editor'
    and current_is_active = true
    and active_owner_count <= 1
  then
    raise exception using errcode = '23514', message = 'The last active owner cannot be demoted';
  end if;

  update public.admin_users
  set role = requested_role
  where user_id = target_user_id;
end;
$$;

revoke all on function public.approve_admin_user(uuid)
from public, anon, authenticated;
revoke all on function public.set_admin_user_active(uuid, boolean)
from public, anon, authenticated;
revoke all on function public.set_admin_user_role(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.approve_admin_user(uuid),
  public.set_admin_user_active(uuid, boolean),
  public.set_admin_user_role(uuid, text)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Versioned legal documents
-- ---------------------------------------------------------------------------

create table public.legal_documents (
  id bigint generated always as identity primary key,
  document_type text not null
    check (document_type in ('privacy_policy', 'terms_of_service')),
  version text not null
    check (
      version = btrim(version)
      and version <> ''
      and char_length(version) <= 64
    ),
  title text not null
    check (title = btrim(title) and title <> '' and char_length(title) <= 200),
  body text not null
    check (body = btrim(body) and body <> '' and char_length(body) <= 100000),
  effective_on date not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'withdrawn')),
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  withdrawn_at timestamptz,
  withdrawn_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint legal_documents_type_version_unique unique (document_type, version),
  constraint legal_documents_state_valid check (
    (
      status = 'draft'
      and published_at is null and published_by is null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'published'
      and published_at is not null and published_by is not null
      and withdrawn_at is null and withdrawn_by is null
    )
    or (
      status = 'withdrawn'
      and published_at is not null and published_by is not null
      and withdrawn_at is not null and withdrawn_by is not null
    )
  )
);

create unique index legal_documents_one_published_type_idx
  on public.legal_documents (document_type)
  where status = 'published';
create index legal_documents_created_by_idx on public.legal_documents (created_by);
create index legal_documents_updated_by_idx on public.legal_documents (updated_by);
create index legal_documents_published_by_idx on public.legal_documents (published_by);
create index legal_documents_withdrawn_by_idx on public.legal_documents (withdrawn_by);

create or replace function private.prepare_legal_document_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'draft';
  new.published_at := null;
  new.published_by := null;
  new.withdrawn_at := null;
  new.withdrawn_by := null;
  return new;
end;
$$;

revoke all on function private.prepare_legal_document_insert()
from public, anon, authenticated;

create trigger legal_documents_10_prepare
before insert on public.legal_documents
for each row execute function private.prepare_legal_document_insert();

create trigger legal_documents_90_touch
before insert or update on public.legal_documents
for each row execute function private.touch_audit_row();

create or replace function public.publish_legal_document(target_document_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select legal.document_type
  into target_type
  from public.legal_documents as legal
  where legal.id = target_document_id
    and legal.status = 'draft'
    and legal.effective_on <= current_date
  for update;

  if target_type is null then
    raise exception using
      errcode = '23514',
      message = 'A current or past-effective draft legal document is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731911, pg_catalog.hashtext(target_type));

  update public.legal_documents
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where document_type = target_type
    and status = 'published';

  update public.legal_documents
  set status = 'published',
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_document_id;
end;
$$;

create or replace function public.withdraw_legal_document(target_document_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.legal_documents
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where id = target_document_id
    and status = 'published';

  if not found then
    raise exception using errcode = '23514', message = 'A published legal document is required';
  end if;
end;
$$;

revoke all on function public.publish_legal_document(bigint)
from public, anon, authenticated;
revoke all on function public.withdraw_legal_document(bigint)
from public, anon, authenticated;
grant execute on function
  public.publish_legal_document(bigint),
  public.withdraw_legal_document(bigint)
to authenticated, service_role;

alter table public.legal_documents enable row level security;

create policy legal_documents_public_read
on public.legal_documents
for select
to anon
using (status = 'published' and effective_on <= current_date);

create policy legal_documents_authenticated_read
on public.legal_documents
for select
to authenticated
using (
  (status = 'published' and effective_on <= current_date)
  or (select private.is_active_admin())
);

create policy legal_documents_admin_insert
on public.legal_documents
for insert
to authenticated
with check (status = 'draft' and (select private.is_active_admin()));

create policy legal_documents_admin_update_draft
on public.legal_documents
for update
to authenticated
using (status = 'draft' and (select private.is_active_admin()))
with check (status = 'draft' and (select private.is_active_admin()));

create policy legal_documents_admin_delete_draft
on public.legal_documents
for delete
to authenticated
using (status = 'draft' and (select private.is_active_admin()));

revoke all on table public.legal_documents from public, anon, authenticated;

grant select (id, document_type, version, title, body, effective_on, status, published_at)
on public.legal_documents to anon, authenticated;
grant select (withdrawn_at, created_at, updated_at)
on public.legal_documents to authenticated;
grant insert (document_type, version, title, body, effective_on),
  update (document_type, version, title, body, effective_on),
  delete
on public.legal_documents to authenticated;
grant usage, select on sequence public.legal_documents_id_seq
to authenticated, service_role;
grant all on table public.legal_documents to service_role;

create view public.public_legal_documents
with (security_invoker = true, security_barrier = true)
as
select id, document_type, version, title, body, effective_on, published_at
from public.legal_documents
where status = 'published'
  and effective_on <= current_date;

revoke all on table public.public_legal_documents
from public, anon, authenticated;
grant select on table public.public_legal_documents
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private installation identity and push delivery state
-- ---------------------------------------------------------------------------

create table private.app_installations (
  id uuid primary key,
  secret_hash text not null
    check (secret_hash ~ '^[0-9a-f]{64}$'),
  platform text not null check (platform in ('ios', 'android')),
  app_version text not null
    check (
      app_version = btrim(app_version)
      and app_version <> ''
      and char_length(app_version) <= 64
    ),
  last_seen_at timestamptz not null default statement_timestamp(),
  disabled_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.notification_subscriptions (
  installation_id uuid primary key
    references private.app_installations (id) on delete cascade,
  worship_reminder boolean not null default false,
  schedule_changes boolean not null default false,
  setlist_updates boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.push_endpoints (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null unique
    references private.app_installations (id) on delete cascade,
  expo_push_token text not null
    check (
      expo_push_token = btrim(expo_push_token)
      and char_length(expo_push_token) <= 256
      and expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
    ),
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  last_registered_at timestamptz not null default statement_timestamp(),
  last_receipt_at timestamptz,
  disabled_at timestamptz,
  disable_reason text
    check (disable_reason is null or char_length(disable_reason) <= 100),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('test', 'worship_reminder', 'schedule_change', 'setlist_update')),
  title text not null
    check (title = btrim(title) and title <> '' and char_length(title) <= 120),
  body text not null
    check (body = btrim(body) and body <> '' and char_length(body) <= 500),
  deep_link text
    check (
      deep_link is null
      or (
        deep_link = btrim(deep_link)
        and char_length(deep_link) <= 1000
        and deep_link ~ '^jubileeworship://[A-Za-z0-9/_?=&.%-]+$'
      )
    ),
  audience_kind text not null
    check (
      audience_kind in (
        'test_endpoint', 'worship_reminder', 'schedule_changes',
        'setlist_updates', 'all_opted_in'
      )
    ),
  event_id bigint references public.events (id) on delete restrict,
  test_push_endpoint_id uuid
    references private.push_endpoints (id) on delete restrict,
  status text not null default 'draft'
    check (
      status in ('draft', 'approved', 'queued', 'processing', 'completed', 'cancelled', 'failed')
    ),
  dedupe_key text not null unique
    check (
      dedupe_key = btrim(dedupe_key)
      and dedupe_key ~ '^[A-Za-z0-9:._-]{1,160}$'
    ),
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  queued_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint notification_campaigns_test_target_valid check (
    (kind = 'test' and audience_kind = 'test_endpoint' and test_push_endpoint_id is not null)
    or
    (kind <> 'test' and audience_kind <> 'test_endpoint' and test_push_endpoint_id is null)
  ),
  constraint notification_campaigns_approval_state_valid check (
    (status = 'draft' and approved_at is null and approved_by is null and queued_at is null)
    or
    (status = 'approved' and approved_at is not null and approved_by is not null and queued_at is null)
    or
    (status in ('queued', 'processing', 'completed', 'failed')
      and approved_at is not null and approved_by is not null and queued_at is not null)
    or status = 'cancelled'
  )
);

create table private.notification_outbox (
  id bigint generated always as identity primary key,
  campaign_id uuid not null unique
    references private.notification_campaigns (id) on delete cascade,
  dedupe_key text not null unique
    check (dedupe_key ~ '^[A-Za-z0-9:._-]{1,160}$'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  available_at timestamptz not null default statement_timestamp(),
  locked_at timestamptz,
  locked_by text check (locked_by is null or char_length(locked_by) <= 120),
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  last_error_code text
    check (last_error_code is null or char_length(last_error_code) <= 100),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.notification_deliveries (
  id bigint generated always as identity primary key,
  campaign_id uuid not null
    references private.notification_campaigns (id) on delete cascade,
  push_endpoint_id uuid not null
    references private.push_endpoints (id) on delete restrict,
  attempt_no integer not null default 1 check (attempt_no between 1 and 20),
  status text not null default 'queued'
    check (
      status in ('queued', 'provider_accepted', 'delivered', 'failed', 'device_not_registered')
    ),
  expo_ticket_id text
    check (expo_ticket_id is null or char_length(expo_ticket_id) <= 200),
  expo_receipt_id text
    check (expo_receipt_id is null or char_length(expo_receipt_id) <= 200),
  error_code text check (error_code is null or char_length(error_code) <= 100),
  provider_accepted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint notification_deliveries_campaign_endpoint_attempt_unique
    unique (campaign_id, push_endpoint_id, attempt_no)
);

create unique index notification_deliveries_ticket_unique_idx
  on private.notification_deliveries (expo_ticket_id)
  where expo_ticket_id is not null;
create unique index notification_deliveries_receipt_unique_idx
  on private.notification_deliveries (expo_receipt_id)
  where expo_receipt_id is not null;
create index notification_deliveries_receipt_pending_idx
  on private.notification_deliveries (id)
  where status = 'provider_accepted' and expo_receipt_id is null;
create index notification_outbox_pending_idx
  on private.notification_outbox (available_at, id)
  where status = 'pending';
create index push_endpoints_active_idx
  on private.push_endpoints (id)
  where is_active = true;

create or replace function private.touch_private_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.touch_private_timestamp()
from public, anon, authenticated;

create trigger app_installations_touch
before insert or update on private.app_installations
for each row execute function private.touch_private_timestamp();
create trigger notification_subscriptions_touch
before insert or update on private.notification_subscriptions
for each row execute function private.touch_private_timestamp();
create trigger push_endpoints_touch
before insert or update on private.push_endpoints
for each row execute function private.touch_private_timestamp();
create trigger notification_campaigns_touch
before insert or update on private.notification_campaigns
for each row execute function private.touch_audit_row();
create trigger notification_outbox_touch
before insert or update on private.notification_outbox
for each row execute function private.touch_private_timestamp();
create trigger notification_deliveries_touch
before insert or update on private.notification_deliveries
for each row execute function private.touch_private_timestamp();

alter table private.app_installations enable row level security;
alter table private.notification_subscriptions enable row level security;
alter table private.push_endpoints enable row level security;
alter table private.notification_campaigns enable row level security;
alter table private.notification_outbox enable row level security;
alter table private.notification_deliveries enable row level security;

revoke all on table
  private.app_installations,
  private.notification_subscriptions,
  private.push_endpoints,
  private.notification_campaigns,
  private.notification_outbox,
  private.notification_deliveries
from public, anon, authenticated;

revoke all on sequence
  private.notification_outbox_id_seq,
  private.notification_deliveries_id_seq
from public, anon, authenticated;

grant all on table
  private.app_installations,
  private.notification_subscriptions,
  private.push_endpoints,
  private.notification_campaigns,
  private.notification_outbox,
  private.notification_deliveries
to service_role;
grant usage, select on sequence
  private.notification_outbox_id_seq,
  private.notification_deliveries_id_seq
to service_role;

-- ---------------------------------------------------------------------------
-- Mobile-content publication hardening discovered during release review
-- ---------------------------------------------------------------------------

alter table public.event_setlists
  add column publication_no integer,
  add column playlist_verified_at timestamptz,
  add column playlist_verified_by uuid references auth.users (id) on delete set null;

alter table public.setlist_items
  add column youtube_verified_at timestamptz,
  add column youtube_verified_by uuid references auth.users (id) on delete set null;

with publication_order as (
  select
    setlist.id,
    row_number() over (
      partition by setlist.event_id
      order by setlist.published_at, setlist.id
    )::integer as publication_no
  from public.event_setlists as setlist
  where setlist.published_at is not null
)
update public.event_setlists as setlist
set publication_no = publication_order.publication_no
from publication_order
where publication_order.id = setlist.id;

alter table public.event_setlists
  add constraint event_setlists_publication_no_state_valid check (
    (
      status in ('published', 'withdrawn')
      and publication_no is not null
      and publication_no >= 1
    )
    or (
      status in ('draft', 'review_requested')
      and publication_no is null
    )
  );

create index event_setlists_playlist_verified_by_idx
  on public.event_setlists (playlist_verified_by);
create index setlist_items_youtube_verified_by_idx
  on public.setlist_items (youtube_verified_by);

create or replace function private.clear_setlist_playlist_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.playlist_url is distinct from new.playlist_url then
    new.playlist_verified_at := null;
    new.playlist_verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function private.clear_setlist_item_youtube_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.youtube_url is distinct from new.youtube_url then
    new.youtube_verified_at := null;
    new.youtube_verified_by := null;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_setlist_playlist_verification()
from public, anon, authenticated;
revoke all on function private.clear_setlist_item_youtube_verification()
from public, anon, authenticated;

create trigger event_setlists_20_clear_playlist_verification
before insert or update on public.event_setlists
for each row execute function private.clear_setlist_playlist_verification();

create trigger setlist_items_10_clear_youtube_verification
before insert or update on public.setlist_items
for each row execute function private.clear_setlist_item_youtube_verification();

create or replace function public.verify_event_setlist_playlist(target_setlist_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.event_setlists
  set playlist_verified_at = statement_timestamp(),
      playlist_verified_by = actor
  where id = target_setlist_id
    and status in ('draft', 'review_requested')
    and playlist_url is not null;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A draft or review-requested setlist with a playlist URL is required';
  end if;
end;
$$;

create or replace function public.verify_setlist_item_youtube(target_item_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update public.setlist_items as item
  set youtube_verified_at = statement_timestamp(),
      youtube_verified_by = actor
  where item.id = target_item_id
    and item.youtube_url is not null
    and exists (
      select 1
      from public.event_setlists as setlist
      where setlist.id = item.setlist_id
        and setlist.status in ('draft', 'review_requested')
    );

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A setlist item with a YouTube URL in an unpublished revision is required';
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
  next_publication_no integer;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select setlist.event_id
  into target_event_id
  from public.event_setlists as setlist
  where setlist.id = target_setlist_id
    and setlist.status = 'review_requested'
    and (
      setlist.playlist_url is null
      or (
        setlist.playlist_verified_at is not null
        and setlist.playlist_verified_by is not null
      )
    )
    and exists (
      select 1
      from public.setlist_items as item
      where item.setlist_id = setlist.id
    )
    and not exists (
      select 1
      from public.setlist_items as item
      where item.setlist_id = setlist.id
        and item.youtube_url is not null
        and (
          item.youtube_verified_at is null
          or item.youtube_verified_by is null
        )
    )
  for update;

  if target_event_id is null then
    raise exception using
      errcode = '23514',
      message = 'A reviewed setlist with owner-verified YouTube links is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731902, pg_catalog.hashint8(target_event_id));

  select coalesce(max(setlist.publication_no), 0) + 1
  into next_publication_no
  from public.event_setlists as setlist
  where setlist.event_id = target_event_id;

  update public.event_setlists
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where event_id = target_event_id
    and status = 'published';

  update public.event_setlists
  set status = 'published',
      publication_no = next_publication_no,
      reviewed_at = statement_timestamp(),
      reviewed_by = actor,
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_setlist_id;
end;
$$;

revoke all on function public.verify_event_setlist_playlist(bigint)
from public, anon, authenticated;
revoke all on function public.verify_setlist_item_youtube(bigint)
from public, anon, authenticated;
revoke all on function public.publish_event_setlist_revision(bigint)
from public, anon, authenticated;

grant execute on function
  public.verify_event_setlist_playlist(bigint),
  public.verify_setlist_item_youtube(bigint),
  public.publish_event_setlist_revision(bigint)
to authenticated, service_role;

grant select (publication_no)
on public.event_setlists to anon, authenticated;
grant select (playlist_verified_at)
on public.event_setlists to authenticated;
grant select (youtube_verified_at)
on public.setlist_items to authenticated;

create or replace view public.public_event_setlists
with (security_invoker = true, security_barrier = true)
as
select
  setlist.event_id,
  event.slug as event_slug,
  setlist.revision_no,
  setlist.published_at,
  setlist.playlist_url,
  (setlist.publication_no > 1) as is_changed
from public.event_setlists as setlist
join public.events as event on event.id = setlist.event_id
where setlist.status = 'published'
  and event.published = true;

revoke insert (published), update (published)
on public.gallery_items from authenticated;
revoke insert (published), update (published)
on public.guide_sections from authenticated;

drop policy gallery_items_admin_update on public.gallery_items;
drop policy gallery_items_admin_delete on public.gallery_items;
drop policy guide_sections_admin_update on public.guide_sections;
drop policy guide_sections_admin_delete on public.guide_sections;

create policy gallery_items_admin_update_draft
on public.gallery_items
for update
to authenticated
using (published = false and (select private.is_active_admin()))
with check (published = false and (select private.is_active_admin()));

create policy gallery_items_admin_delete_draft
on public.gallery_items
for delete
to authenticated
using (published = false and (select private.is_active_admin()));

create policy guide_sections_admin_update_draft
on public.guide_sections
for update
to authenticated
using (published = false and (select private.is_active_admin()))
with check (published = false and (select private.is_active_admin()));

create policy guide_sections_admin_delete_draft
on public.guide_sections
for delete
to authenticated
using (published = false and (select private.is_active_admin()));

create or replace function public.set_gallery_item_published(
  target_gallery_item_id bigint,
  target_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_published is null then
    raise exception using errcode = '22004', message = 'Published state is required';
  end if;

  update public.gallery_items
  set published = target_published
  where id = target_gallery_item_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Gallery item does not exist';
  end if;
end;
$$;

create or replace function public.set_guide_section_published(
  target_guide_section_id bigint,
  target_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_published is null then
    raise exception using errcode = '22004', message = 'Published state is required';
  end if;

  update public.guide_sections
  set published = target_published
  where id = target_guide_section_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Guide section does not exist';
  end if;
end;
$$;

revoke all on function public.set_gallery_item_published(bigint, boolean)
from public, anon, authenticated;
revoke all on function public.set_guide_section_published(bigint, boolean)
from public, anon, authenticated;
grant execute on function
  public.set_gallery_item_published(bigint, boolean),
  public.set_guide_section_published(bigint, boolean)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Administrator notification-campaign RPCs
-- ---------------------------------------------------------------------------

drop trigger notification_campaigns_touch on private.notification_campaigns;

create or replace function private.touch_notification_campaign()
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
  new.updated_by := coalesce(actor, old.updated_by);
  return new;
end;
$$;

revoke all on function private.touch_notification_campaign()
from public, anon, authenticated;

create trigger notification_campaigns_touch
before insert or update on private.notification_campaigns
for each row execute function private.touch_notification_campaign();

create or replace function public.create_notification_campaign(
  target_kind text,
  target_title text,
  target_body text,
  target_deep_link text,
  target_audience_kind text,
  target_event_id bigint,
  target_test_push_endpoint_id uuid,
  target_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  insert into private.notification_campaigns (
    kind,
    title,
    body,
    deep_link,
    audience_kind,
    event_id,
    test_push_endpoint_id,
    dedupe_key
  )
  values (
    target_kind,
    target_title,
    target_body,
    target_deep_link,
    target_audience_kind,
    target_event_id,
    target_test_push_endpoint_id,
    target_dedupe_key
  )
  returning id into campaign_id;

  return campaign_id;
end;
$$;

create or replace function public.update_notification_campaign(
  target_campaign_id uuid,
  target_kind text,
  target_title text,
  target_body text,
  target_deep_link text,
  target_audience_kind text,
  target_event_id bigint,
  target_test_push_endpoint_id uuid,
  target_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  update private.notification_campaigns
  set kind = target_kind,
      title = target_title,
      body = target_body,
      deep_link = target_deep_link,
      audience_kind = target_audience_kind,
      event_id = target_event_id,
      test_push_endpoint_id = target_test_push_endpoint_id,
      dedupe_key = target_dedupe_key
  where id = target_campaign_id
    and status = 'draft';

  if not found then
    raise exception using errcode = '23514', message = 'A draft campaign is required';
  end if;
end;
$$;

create or replace function public.delete_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  delete from private.notification_campaigns
  where id = target_campaign_id
    and status = 'draft';

  if not found then
    raise exception using errcode = '23514', message = 'A draft campaign is required';
  end if;
end;
$$;

create or replace function public.list_notification_campaigns()
returns table (
  id uuid,
  kind text,
  title text,
  body text,
  deep_link text,
  audience_kind text,
  event_id bigint,
  status text,
  dedupe_key text,
  approved_at timestamptz,
  approved_by uuid,
  queued_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz,
  delivery_count bigint,
  failed_delivery_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  return query
  select
    campaign.id,
    campaign.kind,
    campaign.title,
    campaign.body,
    campaign.deep_link,
    campaign.audience_kind,
    campaign.event_id,
    campaign.status,
    campaign.dedupe_key,
    campaign.approved_at,
    campaign.approved_by,
    campaign.queued_at,
    campaign.completed_at,
    campaign.created_at,
    campaign.created_by,
    campaign.updated_at,
    count(delivery.id)::bigint as delivery_count,
    count(delivery.id) filter (
      where delivery.status in ('failed', 'device_not_registered')
    )::bigint as failed_delivery_count
  from private.notification_campaigns as campaign
  left join private.notification_deliveries as delivery
    on delivery.campaign_id = campaign.id
  group by campaign.id
  order by campaign.created_at desc, campaign.id desc;
end;
$$;

create or replace function public.approve_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  update private.notification_campaigns
  set status = 'approved',
      approved_at = statement_timestamp(),
      approved_by = actor
  where id = target_campaign_id
    and status = 'draft';

  if not found and not exists (
    select 1
    from private.notification_campaigns as campaign
    where campaign.id = target_campaign_id and campaign.status = 'approved'
  ) then
    raise exception using errcode = '23514', message = 'A draft campaign is required';
  end if;
end;
$$;

create or replace function public.queue_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_dedupe_key text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select campaign.dedupe_key
  into campaign_dedupe_key
  from private.notification_campaigns as campaign
  where campaign.id = target_campaign_id
    and campaign.status in ('approved', 'queued', 'processing', 'completed')
  for update;

  if campaign_dedupe_key is null then
    raise exception using errcode = '23514', message = 'An approved campaign is required';
  end if;

  if exists (
    select 1
    from private.notification_campaigns as campaign
    where campaign.id = target_campaign_id
      and campaign.status in ('queued', 'processing', 'completed')
  ) then
    return;
  end if;

  insert into private.notification_outbox (campaign_id, dedupe_key)
  values (target_campaign_id, campaign_dedupe_key)
  on conflict (dedupe_key) do nothing;

  update private.notification_campaigns
  set status = 'queued',
      queued_at = statement_timestamp()
  where id = target_campaign_id
    and status = 'approved';
end;
$$;

revoke all on function public.create_notification_campaign(
  text, text, text, text, text, bigint, uuid, text
) from public, anon, authenticated;
revoke all on function public.update_notification_campaign(
  uuid, text, text, text, text, text, bigint, uuid, text
) from public, anon, authenticated;
revoke all on function public.delete_notification_campaign(uuid)
from public, anon, authenticated;
revoke all on function public.list_notification_campaigns()
from public, anon, authenticated;
revoke all on function public.approve_notification_campaign(uuid)
from public, anon, authenticated;
revoke all on function public.queue_notification_campaign(uuid)
from public, anon, authenticated;

grant execute on function
  public.create_notification_campaign(text, text, text, text, text, bigint, uuid, text),
  public.update_notification_campaign(uuid, text, text, text, text, text, bigint, uuid, text),
  public.delete_notification_campaign(uuid),
  public.list_notification_campaigns(),
  public.approve_notification_campaign(uuid),
  public.queue_notification_campaign(uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Service-role-only installation and delivery RPCs for Edge Functions
-- ---------------------------------------------------------------------------

create or replace function public.service_register_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_platform text,
  target_app_version text,
  target_expo_push_token text,
  target_token_hash text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_installation_id is null then
    raise exception using errcode = '22004', message = 'Installation ID is required';
  end if;

  insert into private.app_installations (
    id, secret_hash, platform, app_version
  )
  values (
    target_installation_id, target_secret_hash, target_platform, target_app_version
  );

  insert into private.notification_subscriptions (
    installation_id, worship_reminder, schedule_changes, setlist_updates
  )
  values (
    target_installation_id,
    target_worship_reminder,
    target_schedule_changes,
    target_setlist_updates
  );

  insert into private.push_endpoints (
    installation_id, expo_push_token, token_hash, platform
  )
  values (
    target_installation_id, target_expo_push_token, target_token_hash, target_platform
  );

  return target_installation_id;
end;
$$;

create or replace function public.service_update_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_app_version text,
  target_expo_push_token text,
  target_token_hash text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  installation_platform text;
begin
  select installation.platform
  into installation_platform
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and installation.disabled_at is null
  for update;

  if installation_platform is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.app_installations
  set app_version = target_app_version,
      last_seen_at = statement_timestamp()
  where id = target_installation_id;

  update private.notification_subscriptions
  set worship_reminder = target_worship_reminder,
      schedule_changes = target_schedule_changes,
      setlist_updates = target_setlist_updates
  where installation_id = target_installation_id;

  if (target_expo_push_token is null) <> (target_token_hash is null) then
    raise exception using
      errcode = '22004',
      message = 'Push token and token hash must be supplied together';
  end if;

  if target_expo_push_token is not null then
    update private.push_endpoints
    set expo_push_token = target_expo_push_token,
        token_hash = target_token_hash,
        platform = installation_platform,
        is_active = true,
        last_registered_at = statement_timestamp(),
        disabled_at = null,
        disable_reason = null
    where installation_id = target_installation_id;

    if not found then
      insert into private.push_endpoints (
        installation_id, expo_push_token, token_hash, platform
      )
      values (
        target_installation_id,
        target_expo_push_token,
        target_token_hash,
        installation_platform
      );
    end if;
  end if;
end;
$$;

create or replace function public.service_unregister_app_installation(
  target_installation_id uuid,
  target_secret_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.app_installations
  set disabled_at = coalesce(disabled_at, statement_timestamp()),
      last_seen_at = statement_timestamp()
  where id = target_installation_id
    and secret_hash = target_secret_hash
    and disabled_at is null;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.notification_subscriptions
  set worship_reminder = false,
      schedule_changes = false,
      setlist_updates = false
  where installation_id = target_installation_id;

  update private.push_endpoints
  set is_active = false,
      disabled_at = coalesce(disabled_at, statement_timestamp()),
      disable_reason = 'user_unregistered'
  where installation_id = target_installation_id;
end;
$$;

create or replace function public.service_resolve_push_endpoint(
  target_installation_id uuid,
  target_secret_hash text
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select endpoint.id
  from private.app_installations as installation
  join private.push_endpoints as endpoint
    on endpoint.installation_id = installation.id
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and installation.disabled_at is null
    and endpoint.is_active = true;
$$;

create or replace function public.service_claim_notification_outbox(
  target_worker_id text,
  target_campaign_limit integer
)
returns table (
  outbox_id bigint,
  campaign_id uuid,
  delivery_id bigint,
  push_endpoint_id uuid,
  expo_push_token text,
  title text,
  body text,
  deep_link text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_ids bigint[];
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_worker_id = ''
    or char_length(target_worker_id) > 120
  then
    raise exception using errcode = '22023', message = 'Valid worker ID is required';
  end if;

  if target_campaign_limit is null or target_campaign_limit not between 1 and 10 then
    raise exception using errcode = '22023', message = 'Campaign limit must be between 1 and 10';
  end if;

  select array_agg(candidate.id)
  into claimed_ids
  from (
    select outbox.id
    from private.notification_outbox as outbox
    where outbox.status = 'pending'
      and outbox.available_at <= statement_timestamp()
    order by outbox.available_at, outbox.id
    for update skip locked
    limit target_campaign_limit
  ) as candidate;

  if claimed_ids is null then
    return;
  end if;

  update private.notification_outbox as outbox
  set status = 'processing',
      locked_at = statement_timestamp(),
      locked_by = target_worker_id,
      attempt_count = outbox.attempt_count + 1,
      last_error_code = null
  where outbox.id = any (claimed_ids);

  update private.notification_campaigns as campaign
  set status = 'processing'
  from private.notification_outbox as outbox
  where outbox.id = any (claimed_ids)
    and campaign.id = outbox.campaign_id
    and campaign.status = 'queued';

  insert into private.notification_deliveries (
    campaign_id, push_endpoint_id, attempt_no, status
  )
  select campaign.id, endpoint.id, 1, 'queued'
  from private.notification_outbox as outbox
  join private.notification_campaigns as campaign
    on campaign.id = outbox.campaign_id
  join private.push_endpoints as endpoint
    on endpoint.is_active = true
  join private.app_installations as installation
    on installation.id = endpoint.installation_id
   and installation.disabled_at is null
  join private.notification_subscriptions as subscription
    on subscription.installation_id = installation.id
  where outbox.id = any (claimed_ids)
    and (
      (campaign.audience_kind = 'test_endpoint'
        and endpoint.id = campaign.test_push_endpoint_id)
      or (campaign.audience_kind = 'worship_reminder'
        and subscription.worship_reminder = true)
      or (campaign.audience_kind = 'schedule_changes'
        and subscription.schedule_changes = true)
      or (campaign.audience_kind = 'setlist_updates'
        and subscription.setlist_updates = true)
      or (campaign.audience_kind = 'all_opted_in'
        and (
          subscription.worship_reminder = true
          or subscription.schedule_changes = true
          or subscription.setlist_updates = true
        ))
    )
  on conflict on constraint notification_deliveries_campaign_endpoint_attempt_unique
  do nothing;

  return query
  select
    outbox.id,
    campaign.id,
    delivery.id,
    endpoint.id,
    endpoint.expo_push_token,
    campaign.title,
    campaign.body,
    campaign.deep_link
  from private.notification_outbox as outbox
  join private.notification_campaigns as campaign
    on campaign.id = outbox.campaign_id
  left join private.notification_deliveries as delivery
    on delivery.campaign_id = campaign.id
   and delivery.attempt_no = 1
  left join private.push_endpoints as endpoint
    on endpoint.id = delivery.push_endpoint_id
  where outbox.id = any (claimed_ids)
  order by outbox.id, delivery.id;
end;
$$;

create or replace function public.service_record_push_ticket(
  target_delivery_id bigint,
  target_ticket_status text,
  target_ticket_id text,
  target_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_id uuid;
begin
  if target_ticket_status not in ('ok', 'error') then
    raise exception using errcode = '22023', message = 'Ticket status must be ok or error';
  end if;

  if target_ticket_status = 'ok'
    and (
      target_ticket_id is null
      or target_ticket_id = ''
      or char_length(target_ticket_id) > 200
    )
  then
    raise exception using errcode = '22023', message = 'Accepted ticket ID is required';
  end if;

  if target_error_code is not null and char_length(target_error_code) > 100 then
    raise exception using errcode = '22023', message = 'Error code is too long';
  end if;

  update private.notification_deliveries
  set status = case
        when target_ticket_status = 'ok' then 'provider_accepted'
        when target_error_code = 'DeviceNotRegistered' then 'device_not_registered'
        else 'failed'
      end,
      expo_ticket_id = case when target_ticket_status = 'ok' then target_ticket_id else null end,
      error_code = case when target_ticket_status = 'error' then target_error_code else null end,
      provider_accepted_at = case
        when target_ticket_status = 'ok' then statement_timestamp()
        else null
      end,
      failed_at = case
        when target_ticket_status = 'error' then statement_timestamp()
        else null
      end
  where id = target_delivery_id
    and status = 'queued'
  returning push_endpoint_id into endpoint_id;

  if endpoint_id is null then
    raise exception using errcode = '23514', message = 'A queued delivery is required';
  end if;

  if target_error_code = 'DeviceNotRegistered' then
    update private.push_endpoints
    set is_active = false,
        disabled_at = coalesce(disabled_at, statement_timestamp()),
        disable_reason = 'DeviceNotRegistered',
        last_receipt_at = statement_timestamp()
    where id = endpoint_id;
  end if;
end;
$$;

create or replace function public.service_finish_notification_campaign(
  target_campaign_id uuid,
  target_success boolean,
  target_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_success is null then
    raise exception using errcode = '22004', message = 'Success state is required';
  end if;

  if target_error_code is not null and char_length(target_error_code) > 100 then
    raise exception using errcode = '22023', message = 'Error code is too long';
  end if;

  update private.notification_outbox
  set status = case when target_success then 'sent' else 'failed' end,
      last_error_code = case when target_success then null else target_error_code end,
      locked_at = null,
      locked_by = null
  where campaign_id = target_campaign_id
    and status = 'processing';

  if not found then
    raise exception using errcode = '23514', message = 'A processing outbox item is required';
  end if;

  update private.notification_campaigns
  set status = case when target_success then 'completed' else 'failed' end,
      completed_at = statement_timestamp()
  where id = target_campaign_id
    and status = 'processing';
end;
$$;

create or replace function public.service_list_pending_push_receipts(target_limit integer)
returns table (
  delivery_id bigint,
  expo_ticket_id text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_limit is null or target_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Receipt limit must be between 1 and 1000';
  end if;

  return query
  select delivery.id, delivery.expo_ticket_id
  from private.notification_deliveries as delivery
  where delivery.status = 'provider_accepted'
    and delivery.expo_ticket_id is not null
    and delivery.expo_receipt_id is null
  order by delivery.provider_accepted_at, delivery.id
  limit target_limit;
end;
$$;

create or replace function public.service_apply_push_receipt(
  target_delivery_id bigint,
  target_receipt_status text,
  target_receipt_id text,
  target_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_id uuid;
begin
  if target_receipt_status not in ('ok', 'error') then
    raise exception using errcode = '22023', message = 'Receipt status must be ok or error';
  end if;

  if target_receipt_id is null
    or target_receipt_id = ''
    or char_length(target_receipt_id) > 200
  then
    raise exception using errcode = '22023', message = 'Receipt ID is required';
  end if;

  if target_error_code is not null and char_length(target_error_code) > 100 then
    raise exception using errcode = '22023', message = 'Error code is too long';
  end if;

  update private.notification_deliveries
  set status = case
        when target_receipt_status = 'ok' then 'delivered'
        when target_error_code = 'DeviceNotRegistered' then 'device_not_registered'
        else 'failed'
      end,
      expo_receipt_id = target_receipt_id,
      error_code = case when target_receipt_status = 'error' then target_error_code else null end,
      delivered_at = case
        when target_receipt_status = 'ok' then statement_timestamp()
        else null
      end,
      failed_at = case
        when target_receipt_status = 'error' then statement_timestamp()
        else null
      end
  where id = target_delivery_id
    and status = 'provider_accepted'
  returning push_endpoint_id into endpoint_id;

  if endpoint_id is null then
    raise exception using errcode = '23514', message = 'A provider-accepted delivery is required';
  end if;

  update private.push_endpoints
  set last_receipt_at = statement_timestamp()
  where id = endpoint_id;

  if target_error_code = 'DeviceNotRegistered' then
    update private.push_endpoints
    set is_active = false,
        disabled_at = coalesce(disabled_at, statement_timestamp()),
        disable_reason = 'DeviceNotRegistered'
    where id = endpoint_id;
  end if;
end;
$$;

-- An owner prepares and approves the D-1 reminder. A service-role cron only
-- queues reminders that already carry that manual owner approval.
create or replace function public.schedule_worship_reminder_campaign(
  target_event_id bigint,
  target_title text,
  target_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  event_slug text;
  event_starts_at timestamptz;
  reminder_dedupe_key text;
  existing_campaign_id uuid;
  campaign_id uuid;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select event.slug, event.starts_at
  into event_slug, event_starts_at
  from public.events as event
  where event.id = target_event_id
    and event.published = true
    and event.status in ('scheduled', 'postponed')
  for update;

  if event_slug is null then
    raise exception using
      errcode = '23514',
      message = 'A published scheduled or postponed event is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731913, pg_catalog.hashint8(target_event_id));

  reminder_dedupe_key := 'worship-reminder:event:' || target_event_id::text || ':' ||
    to_char(event_starts_at at time zone 'Asia/Seoul', 'YYYYMMDDHH24MI');

  select campaign.id
  into existing_campaign_id
  from private.notification_campaigns as campaign
  where campaign.dedupe_key = reminder_dedupe_key
    and campaign.status in ('approved', 'queued', 'processing', 'completed')
  for update;

  if existing_campaign_id is not null then
    return existing_campaign_id;
  end if;

  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null
  where outbox.status = 'pending'
    and outbox.campaign_id in (
      select campaign.id
      from private.notification_campaigns as campaign
      where campaign.kind = 'worship_reminder'
        and campaign.event_id = target_event_id
        and campaign.status in ('approved', 'queued')
    );

  update private.notification_campaigns
  set status = 'cancelled'
  where kind = 'worship_reminder'
    and event_id = target_event_id
    and status in ('draft', 'approved', 'queued');

  insert into private.notification_campaigns (
    kind,
    title,
    body,
    deep_link,
    audience_kind,
    event_id,
    status,
    dedupe_key,
    approved_at,
    approved_by
  )
  values (
    'worship_reminder',
    target_title,
    target_body,
    'jubileeworship://worship/' || event_slug,
    'worship_reminder',
    target_event_id,
    'approved',
    reminder_dedupe_key,
    statement_timestamp(),
    actor
  )
  returning id into campaign_id;

  return campaign_id;
end;
$$;

create or replace function public.service_queue_due_worship_reminders(
  target_now timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due_campaign_ids uuid[];
  queued_count integer := 0;
begin
  if target_now is null then
    raise exception using errcode = '22004', message = 'Current time is required';
  end if;

  select array_agg(candidate.id)
  into due_campaign_ids
  from (
    select campaign.id
    from private.notification_campaigns as campaign
    join public.events as event on event.id = campaign.event_id
    where campaign.kind = 'worship_reminder'
      and campaign.audience_kind = 'worship_reminder'
      and campaign.status = 'approved'
      and campaign.approved_at is not null
      and campaign.approved_by is not null
      and event.published = true
      and event.status in ('scheduled', 'postponed')
      and (event.starts_at at time zone 'Asia/Seoul')::date
        = (target_now at time zone 'Asia/Seoul')::date + 1
    order by event.starts_at, campaign.id
    for update of campaign skip locked
  ) as candidate;

  if due_campaign_ids is null then
    return 0;
  end if;

  insert into private.notification_outbox (
    campaign_id, dedupe_key, available_at
  )
  select campaign.id, campaign.dedupe_key, target_now
  from private.notification_campaigns as campaign
  where campaign.id = any (due_campaign_ids)
  on conflict (dedupe_key) do nothing;

  update private.notification_campaigns
  set status = 'queued',
      queued_at = target_now
  where id = any (due_campaign_ids)
    and status = 'approved';

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.service_unregister_app_installation(uuid, text)
from public, anon, authenticated;
revoke all on function public.service_resolve_push_endpoint(uuid, text)
from public, anon, authenticated;
revoke all on function public.service_claim_notification_outbox(text, integer)
from public, anon, authenticated;
revoke all on function public.service_record_push_ticket(bigint, text, text, text)
from public, anon, authenticated;
revoke all on function public.service_finish_notification_campaign(uuid, boolean, text)
from public, anon, authenticated;
revoke all on function public.service_list_pending_push_receipts(integer)
from public, anon, authenticated;
revoke all on function public.service_apply_push_receipt(bigint, text, text, text)
from public, anon, authenticated;
revoke all on function public.schedule_worship_reminder_campaign(bigint, text, text)
from public, anon, authenticated;
revoke all on function public.service_queue_due_worship_reminders(timestamptz)
from public, anon, authenticated;

grant execute on function
  public.schedule_worship_reminder_campaign(bigint, text, text)
to authenticated, service_role;

grant execute on function
  public.service_register_app_installation(
    uuid, text, text, text, text, text, boolean, boolean, boolean
  ),
  public.service_update_app_installation(
    uuid, text, text, text, text, boolean, boolean, boolean
  ),
  public.service_unregister_app_installation(uuid, text),
  public.service_resolve_push_endpoint(uuid, text),
  public.service_claim_notification_outbox(text, integer),
  public.service_record_push_ticket(bigint, text, text, text),
  public.service_finish_notification_campaign(uuid, boolean, text),
  public.service_list_pending_push_receipts(integer),
  public.service_apply_push_receipt(bigint, text, text, text),
  public.service_queue_due_worship_reminders(timestamptz)
to service_role;

-- Gallery consent is recorded by an owner before any database publication.
alter table public.gallery_items
  add column consent_confirmed_at timestamptz,
  add column consent_confirmed_by uuid references auth.users (id) on delete set null;

create index gallery_items_consent_confirmed_by_idx
  on public.gallery_items (consent_confirmed_by);

create or replace function private.clear_gallery_consent_on_media_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.media_path is distinct from new.media_path
    or old.thumbnail_path is distinct from new.thumbnail_path
  then
    new.consent_confirmed_at := null;
    new.consent_confirmed_by := null;
    new.published := false;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_gallery_consent_on_media_change()
from public, anon, authenticated;

create trigger gallery_items_10_clear_consent_on_media_change
before update on public.gallery_items
for each row execute function private.clear_gallery_consent_on_media_change();

create or replace function private.gallery_staging_object_has_consent(
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gallery_items as gallery
    where gallery.consent_confirmed_at is not null
      and gallery.consent_confirmed_by is not null
      and (
        gallery.media_path = 'storage://gallery-staging/' || target_name
        or gallery.thumbnail_path = 'storage://gallery-staging/' || target_name
      )
  );
$$;

revoke all on function private.gallery_staging_object_has_consent(text)
from public, anon, authenticated;
grant execute on function private.gallery_staging_object_has_consent(text)
to authenticated, service_role;

grant select (consent_confirmed_at, consent_confirmed_by)
on public.gallery_items to authenticated;

create or replace function public.set_gallery_item_consent(
  target_gallery_item_id bigint,
  target_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_confirmed is null then
    raise exception using errcode = '22004', message = 'Consent state is required';
  end if;

  update public.gallery_items
  set consent_confirmed_at = case
        when target_confirmed then statement_timestamp()
        else null
      end,
      consent_confirmed_by = case when target_confirmed then actor else null end,
      published = case when target_confirmed then published else false end
  where id = target_gallery_item_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Gallery item does not exist';
  end if;
end;
$$;

create or replace function public.set_gallery_item_published(
  target_gallery_item_id bigint,
  target_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_published is null then
    raise exception using errcode = '22004', message = 'Published state is required';
  end if;

  update public.gallery_items
  set published = target_published
  where id = target_gallery_item_id
    and (
      target_published = false
      or (
        consent_confirmed_at is not null
        and consent_confirmed_by is not null
        and (
          media_path !~ '^storage://'
          or media_path like 'storage://public-media/app-gallery/%'
        )
        and (
          thumbnail_path is null
          or thumbnail_path !~ '^storage://'
          or thumbnail_path like 'storage://public-media/app-gallery/%'
        )
      )
    );

  if not found then
    raise exception using
      errcode = '23514',
      message = 'A consent-confirmed gallery item is required for publication';
  end if;
end;
$$;

revoke all on function public.set_gallery_item_consent(bigint, boolean)
from public, anon, authenticated;
revoke all on function public.set_gallery_item_published(bigint, boolean)
from public, anon, authenticated;
grant execute on function
  public.set_gallery_item_consent(bigint, boolean),
  public.set_gallery_item_published(bigint, boolean)
to authenticated, service_role;

-- Editors stage gallery files in a private bucket. Only an owner may write the
-- public `app-gallery/` prefix after confirming consent and moving the object with
-- the trusted Storage API; other existing public-media prefixes stay unchanged.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gallery-staging',
  'gallery-staging',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy public_media_admin_insert on storage.objects;
drop policy public_media_admin_update on storage.objects;
drop policy public_media_admin_delete on storage.objects;

create policy public_media_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and (storage.foldername(name))[1] in (
    'brand', 'hero', 'gallery', 'app-gallery', 'team', 'og'
  )
  and (
    (storage.foldername(name))[1] <> 'app-gallery'
    or (select private.is_owner())
  )
);

create policy public_media_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and (
    (storage.foldername(name))[1] <> 'app-gallery'
    or (select private.is_owner())
  )
)
with check (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and (storage.foldername(name))[1] in (
    'brand', 'hero', 'gallery', 'app-gallery', 'team', 'og'
  )
  and (
    (storage.foldername(name))[1] <> 'app-gallery'
    or (select private.is_owner())
  )
);

create policy public_media_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_active_admin())
  and (
    (storage.foldername(name))[1] <> 'app-gallery'
    or (select private.is_owner())
  )
);

create policy gallery_staging_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gallery-staging'
  and (select private.is_active_admin())
);

create policy gallery_staging_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery-staging'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and not (select private.gallery_staging_object_has_consent(name))
);

create policy gallery_staging_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gallery-staging'
  and (select private.is_active_admin())
  and not (select private.gallery_staging_object_has_consent(name))
)
with check (
  bucket_id = 'gallery-staging'
  and (select private.is_active_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  and not (select private.gallery_staging_object_has_consent(name))
);

create policy gallery_staging_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery-staging'
  and (select private.is_active_admin())
  and not (select private.gallery_staging_object_has_consent(name))
);

commit;
