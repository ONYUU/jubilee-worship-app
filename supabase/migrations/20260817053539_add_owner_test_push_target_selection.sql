-- Let an authenticated owner select one non-production push target without
-- exposing an installation secret or Expo push token to the admin browser.
-- The queue RPC revalidates the owner, target, and explicit app variant in one
-- database transaction before creating an isolated test_endpoint campaign.

begin;

-- Test campaigns are a non-production-only concern.  Enforce that invariant
-- at the table boundary as well as in the owner RPC so a legacy or privileged
-- caller cannot point a test campaign at a production installation.
create function private.enforce_test_campaign_target_variant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and (
      new.kind is distinct from old.kind
      or new.audience_kind is distinct from old.audience_kind
      or new.test_push_endpoint_id is distinct from old.test_push_endpoint_id
    )
    and (
      old.kind = 'test'
      or new.kind = 'test'
      or old.audience_kind = 'test_endpoint'
      or new.audience_kind = 'test_endpoint'
      or old.test_push_endpoint_id is not null
      or new.test_push_endpoint_id is not null
    )
    and not (
      -- ON DELETE SET NULL may detach only already-terminal history.  It may
      -- not change the campaign kind/audience or terminal state at the same
      -- time, and every A->B, NULL->UUID, or non-terminal detach is rejected.
      old.kind = 'test'
      and new.kind = 'test'
      and old.audience_kind = 'test_endpoint'
      and new.audience_kind = 'test_endpoint'
      and old.test_push_endpoint_id is not null
      and new.test_push_endpoint_id is null
      and old.status in ('completed', 'cancelled', 'failed')
      and new.status = old.status
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Test campaign routing is immutable';
  end if;

  if new.kind = 'test'
    or new.audience_kind = 'test_endpoint'
    or new.test_push_endpoint_id is not null
  then
    -- Retention cleanup may detach a deleted endpoint from terminal history.
    -- The table check constraint separately limits this null form to terminal
    -- test rows, so there is no target that could re-enter delivery.
    if new.test_push_endpoint_id is null
      and new.status in ('completed', 'cancelled', 'failed')
    then
      return new;
    end if;

    if not exists (
      select 1
      from private.push_endpoints as endpoint
      join private.app_installations as installation
        on installation.id = endpoint.installation_id
      where endpoint.id = new.test_push_endpoint_id
        and installation.app_variant in ('development', 'preview')
    ) then
      raise exception using
        errcode = '23514',
        message = 'Test campaigns require a non-production endpoint';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_test_campaign_target_variant()
from public, anon, authenticated, service_role;

-- Stop any pre-existing non-terminal production test row before the invariant
-- is installed.  Completed history is retained, but it cannot re-enter the
-- outbox because generic test mutation is disabled below.
update private.notification_outbox as outbox
set status = 'cancelled',
    locked_at = null,
    locked_by = null,
    last_error_code = 'PRODUCTION_TEST_TARGET_BLOCKED'
from private.notification_campaigns as campaign
join private.push_endpoints as endpoint
  on endpoint.id = campaign.test_push_endpoint_id
join private.app_installations as installation
  on installation.id = endpoint.installation_id
where outbox.campaign_id = campaign.id
  and campaign.kind = 'test'
  and installation.app_variant = 'production'
  and outbox.status in ('pending', 'processing');

update private.notification_campaigns as campaign
set status = 'cancelled'
from private.push_endpoints as endpoint
join private.app_installations as installation
  on installation.id = endpoint.installation_id
where endpoint.id = campaign.test_push_endpoint_id
  and campaign.kind = 'test'
  and installation.app_variant = 'production'
  and campaign.status in ('draft', 'approved', 'queued', 'processing');

create trigger notification_campaigns_test_variant_guard
before insert or update of kind, audience_kind, test_push_endpoint_id
on private.notification_campaigns
for each row execute function private.enforce_test_campaign_target_variant();

-- Generic campaign mutation must not be a second test-push API.  Test rows are
-- created, approved, and queued only by queue_owner_test_push below.
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

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  if target_kind = 'test'
    or target_audience_kind = 'test_endpoint'
    or target_test_push_endpoint_id is not null
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated owner test push RPC';
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

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
    or exists (
      select 1
      from private.notification_campaigns as campaign
      where campaign.id = target_campaign_id
        and (
          campaign.kind = 'worship_reminder'
          or campaign.audience_kind = 'worship_reminder'
        )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  if target_kind = 'test'
    or target_audience_kind = 'test_endpoint'
    or target_test_push_endpoint_id is not null
    or exists (
      select 1
      from private.notification_campaigns as campaign
      where campaign.id = target_campaign_id
        and (
          campaign.kind = 'test'
          or campaign.audience_kind = 'test_endpoint'
          or campaign.test_push_endpoint_id is not null
        )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated owner test push RPC';
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

create or replace function public.approve_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_kind text;
  target_audience_kind text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select campaign.kind, campaign.audience_kind
  into target_kind, target_audience_kind
  from private.notification_campaigns as campaign
  where campaign.id = target_campaign_id
  for update;

  if target_kind is null then
    raise exception using errcode = 'P0002', message = 'Notification campaign does not exist';
  end if;

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  if target_kind = 'test' or target_audience_kind = 'test_endpoint' then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated owner test push RPC';
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
  campaign_kind text;
  campaign_audience_kind text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select campaign.dedupe_key, campaign.kind, campaign.audience_kind
  into campaign_dedupe_key, campaign_kind, campaign_audience_kind
  from private.notification_campaigns as campaign
  where campaign.id = target_campaign_id
    and campaign.status in ('approved', 'queued', 'processing', 'completed')
  for update;

  if campaign_dedupe_key is null then
    raise exception using errcode = '23514', message = 'An approved campaign is required';
  end if;

  if campaign_kind = 'worship_reminder'
    or campaign_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Worship reminders are queued only by the due-reminder service';
  end if;

  if campaign_kind = 'test' or campaign_audience_kind = 'test_endpoint' then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated owner test push RPC';
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

-- A public installation registration is intentionally not sufficient to enter
-- the owner test-target list.  The physical non-production app must first
-- prove possession of its installation credential, receive a short-lived
-- one-time code, and have that code explicitly approved by an active owner.
-- Only server-peppered HMAC digests are persisted while a challenge is
-- pending; raw pairing codes exist only in the requesting app and the owner
-- approval request while in memory.  Every terminal transition scrubs the
-- digest immediately.
create table private.test_push_pairing_challenges (
  id bigint generated always as identity primary key,
  push_endpoint_id uuid not null
    references private.push_endpoints (id) on delete cascade,
  app_variant_snapshot text not null
    check (app_variant_snapshot in ('development', 'preview')),
  code_digest text
    check (code_digest is null or code_digest ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'superseded', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  constraint test_push_pairing_challenge_expiry_valid check (
    expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint test_push_pairing_challenge_state_valid check (
    (
      status = 'pending'
      and code_digest is not null
      and consumed_at is null
      and consumed_by is null
    )
    or (
      status = 'approved'
      and code_digest is null
      and consumed_at is not null
      and consumed_at >= created_at
      and consumed_by is not null
    )
    or (
      status in ('superseded', 'expired')
      and code_digest is null
      and consumed_at is not null
      and consumed_at >= created_at
      and consumed_by is null
    )
  )
);

create unique index test_push_pairing_challenges_digest_unique_idx
on private.test_push_pairing_challenges (code_digest)
where code_digest is not null;

create unique index test_push_pairing_challenges_endpoint_pending_unique_idx
on private.test_push_pairing_challenges (push_endpoint_id)
where status = 'pending';

create index test_push_pairing_challenges_endpoint_pending_idx
on private.test_push_pairing_challenges (push_endpoint_id, expires_at)
where status = 'pending';

create index test_push_pairing_challenges_terminal_cleanup_idx
on private.test_push_pairing_challenges (consumed_at, id)
where status <> 'pending';

create table private.owner_test_push_targets (
  push_endpoint_id uuid primary key
    references private.push_endpoints (id) on delete cascade,
  app_variant_snapshot text not null
    check (app_variant_snapshot in ('development', 'preview')),
  pairing_challenge_id bigint unique
    references private.test_push_pairing_challenges (id) on delete set null,
  approved_by uuid not null references auth.users (id) on delete restrict,
  approved_at timestamptz not null,
  revoked_by uuid references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  constraint owner_test_push_targets_revocation_valid check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

alter table private.test_push_pairing_challenges enable row level security;
alter table private.owner_test_push_targets enable row level security;

revoke all on table
  private.test_push_pairing_challenges,
  private.owner_test_push_targets
from public, anon, authenticated, service_role;
revoke all on sequence private.test_push_pairing_challenges_id_seq
from public, anon, authenticated, service_role;

create function private.prevent_app_installation_variant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.app_variant is distinct from old.app_variant then
    raise exception using errcode = '23514', message = 'Installation app variant is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_app_installation_variant_change()
from public, anon, authenticated, service_role;

create trigger app_installations_variant_immutable
before update of app_variant on private.app_installations
for each row execute function private.prevent_app_installation_variant_change();

-- No pre-migration test queue is implicitly trusted.  Deployment operations
-- must pause workers and confirm processing=0 before applying this migration;
-- all remaining non-terminal test work is cancelled and must be paired again.
update private.notification_outbox as outbox
set status = 'cancelled',
    locked_at = null,
    locked_by = null,
    last_error_code = 'TEST_TARGET_PAIRING_REQUIRED'
from private.notification_campaigns as campaign
where outbox.campaign_id = campaign.id
  and campaign.kind = 'test'
  and outbox.status in ('pending', 'processing');

update private.notification_campaigns
set status = 'cancelled'
where kind = 'test'
  and status in ('draft', 'approved', 'queued', 'processing');

-- Row-level BEFORE UPDATE triggers run after PostgreSQL has locked the row
-- being changed.  Keep routing-column updates on a lock-free fail-fast path,
-- and reserve the approval guards below for INSERT, where target rows can be
-- locked first without inverting the canonical order.
create function private.prevent_notification_outbox_campaign_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.campaign_id is distinct from old.campaign_id then
    raise exception using
      errcode = '23514',
      message = 'Notification outbox campaign is immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_notification_outbox_campaign_change()
from public, anon, authenticated, service_role;

create trigger notification_outbox_campaign_immutable
before update of campaign_id on private.notification_outbox
for each row execute function private.prevent_notification_outbox_campaign_change();

create function private.prevent_notification_delivery_route_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.campaign_id is distinct from old.campaign_id then
    raise exception using
      errcode = '23514',
      message = 'Notification delivery campaign is immutable';
  end if;

  if new.push_endpoint_id is distinct from old.push_endpoint_id
    and not (
      -- Preserve the retention contract: provider-terminal history may lose
      -- only its existing endpoint through ON DELETE SET NULL.  Every A->B,
      -- NULL->UUID, non-terminal detach, or status-changing detach is denied.
      old.push_endpoint_id is not null
      and new.push_endpoint_id is null
      and old.status in ('delivered', 'failed', 'device_not_registered')
      and new.status = old.status
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Notification delivery endpoint is immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_notification_delivery_route_change()
from public, anon, authenticated, service_role;

create trigger notification_delivery_route_immutable
before update of campaign_id, push_endpoint_id on private.notification_deliveries
for each row execute function private.prevent_notification_delivery_route_change();

create function private.enforce_test_outbox_owner_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_campaign private.notification_campaigns%rowtype;
  target_installation_id uuid;
begin
  select campaign.*
  into target_campaign
  from private.notification_campaigns as campaign
  where campaign.id = new.campaign_id;

  if target_campaign.kind = 'test' then
    -- Serialize every supported test-push state transition, then take target
    -- rows in the same installation -> endpoint -> approval order used by
    -- registration and unregistration.  The advisory lock also prevents a
    -- new test outbox from appearing between the claim wrapper's target scan
    -- and its call into the established claim core.
    perform pg_catalog.pg_advisory_xact_lock(731904, 1);

    select endpoint.installation_id
    into target_installation_id
    from private.push_endpoints as endpoint
    where endpoint.id = target_campaign.test_push_endpoint_id;

    perform 1
    from private.app_installations as installation
    where installation.id = target_installation_id
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test outbox requires an approved active non-production target';
    end if;

    perform 1
    from private.push_endpoints as endpoint
    where endpoint.id = target_campaign.test_push_endpoint_id
      and endpoint.installation_id = target_installation_id
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test outbox requires an approved active non-production target';
    end if;

    perform 1
    from private.owner_test_push_targets as approved_target
    where approved_target.push_endpoint_id = target_campaign.test_push_endpoint_id
      and approved_target.revoked_at is null
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test outbox requires an approved active non-production target';
    end if;

    perform 1
    from private.owner_test_push_targets as approved_target
    join private.push_endpoints as endpoint
      on endpoint.id = approved_target.push_endpoint_id
    join private.app_installations as installation
      on installation.id = endpoint.installation_id
    where approved_target.push_endpoint_id = target_campaign.test_push_endpoint_id
      and approved_target.revoked_at is null
      and approved_target.app_variant_snapshot = installation.app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.disabled_at is null
      and endpoint.is_active = true
      and endpoint.disabled_at is null;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test outbox requires an approved active non-production target';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_test_outbox_owner_approval()
from public, anon, authenticated, service_role;

create trigger notification_outbox_test_target_guard
before insert on private.notification_outbox
for each row execute function private.enforce_test_outbox_owner_approval();

create function private.enforce_test_delivery_owner_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_campaign private.notification_campaigns%rowtype;
  target_installation_id uuid;
begin
  select campaign.*
  into target_campaign
  from private.notification_campaigns as campaign
  where campaign.id = new.campaign_id;

  if target_campaign.kind = 'test' then
    if new.push_endpoint_id is distinct from target_campaign.test_push_endpoint_id then
      raise exception using
        errcode = '23514',
        message = 'Test delivery endpoint does not match its campaign';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(731904, 1);

    select endpoint.installation_id
    into target_installation_id
    from private.push_endpoints as endpoint
    where endpoint.id = new.push_endpoint_id;

    perform 1
    from private.app_installations as installation
    where installation.id = target_installation_id
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test delivery requires an approved active non-production target';
    end if;

    perform 1
    from private.push_endpoints as endpoint
    where endpoint.id = new.push_endpoint_id
      and endpoint.installation_id = target_installation_id
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test delivery requires an approved active non-production target';
    end if;

    perform 1
    from private.owner_test_push_targets as approved_target
    where approved_target.push_endpoint_id = new.push_endpoint_id
      and approved_target.revoked_at is null
    for update;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test delivery requires an approved active non-production target';
    end if;

    perform 1
    from private.owner_test_push_targets as approved_target
    join private.push_endpoints as endpoint
      on endpoint.id = approved_target.push_endpoint_id
    join private.app_installations as installation
      on installation.id = endpoint.installation_id
    where approved_target.push_endpoint_id = new.push_endpoint_id
      and approved_target.revoked_at is null
      and approved_target.app_variant_snapshot = installation.app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.disabled_at is null
      and endpoint.is_active = true
      and endpoint.disabled_at is null;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'Test delivery requires an approved active non-production target';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_test_delivery_owner_approval()
from public, anon, authenticated, service_role;

create trigger notification_deliveries_test_target_guard
before insert
on private.notification_deliveries
for each row execute function private.enforce_test_delivery_owner_approval();

-- Keep the established claim implementation as an inaccessible core and put a
-- final fail-closed allowlist gate immediately in front of it.  Invalid legacy,
-- privileged, revoked, inactive, variant-mismatched, and production test work
-- is cancelled rather than becoming a poison outbox row that fails every
-- worker retry.  The delivery trigger above rechecks the same invariant while
-- taking row-update locks, which serializes the decisive claim against revoke.
alter function public.service_claim_notification_outbox(text, integer)
set schema private;
alter function private.service_claim_notification_outbox(text, integer)
rename to claim_notification_outbox_core;

revoke all on function private.claim_notification_outbox_core(text, integer)
from public, anon, authenticated, service_role;

create function public.service_claim_notification_outbox(
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
  claim_target record;
begin
  if target_worker_id is null
    or target_worker_id <> pg_catalog.btrim(target_worker_id)
    or target_worker_id = ''
    or pg_catalog.char_length(target_worker_id) > 120
  then
    raise exception using errcode = '22023', message = 'Valid worker ID is required';
  end if;

  if target_campaign_limit is null or target_campaign_limit not between 1 and 10 then
    raise exception using errcode = '22023', message = 'Campaign limit must be between 1 and 10';
  end if;

  -- Hold the same transaction-scoped test-push gate used by queue, revoke,
  -- and the table guards.  Lock every pending test target in deterministic
  -- installation -> endpoint -> approval order before touching outbox rows.
  -- Test traffic is intentionally single-target and low-volume, while taking
  -- all pending targets closes the window in which the core could observe a
  -- target that appeared after a limited pre-scan.
  perform pg_catalog.pg_advisory_xact_lock(731904, 1);

  for claim_target in
    select distinct
      endpoint.installation_id,
      campaign.test_push_endpoint_id as push_endpoint_id
    from private.notification_outbox as outbox
    join private.notification_campaigns as campaign
      on campaign.id = outbox.campaign_id
    join private.push_endpoints as endpoint
      on endpoint.id = campaign.test_push_endpoint_id
    where outbox.status = 'pending'
      and campaign.kind = 'test'
    order by endpoint.installation_id, campaign.test_push_endpoint_id
  loop
    perform 1
    from private.app_installations as installation
    where installation.id = claim_target.installation_id
    for update;

    if found then
      perform 1
      from private.push_endpoints as endpoint
      where endpoint.id = claim_target.push_endpoint_id
        and endpoint.installation_id = claim_target.installation_id
      for update;

      if found then
        -- Lock the row even when it has already been revoked.  Validation
        -- below decides eligibility after the canonical lock sequence.
        perform 1
        from private.owner_test_push_targets as approved_target
        where approved_target.push_endpoint_id = claim_target.push_endpoint_id
        for update;
      end if;
    end if;
  end loop;

  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = 'TEST_TARGET_NOT_APPROVED'
  from private.notification_campaigns as campaign
  where campaign.id = outbox.campaign_id
    and campaign.kind = 'test'
    and outbox.status = 'pending'
    and not exists (
      select 1
      from private.owner_test_push_targets as approved_target
      join private.push_endpoints as endpoint
        on endpoint.id = approved_target.push_endpoint_id
      join private.app_installations as installation
        on installation.id = endpoint.installation_id
      where approved_target.push_endpoint_id = campaign.test_push_endpoint_id
        and approved_target.revoked_at is null
        and approved_target.app_variant_snapshot = installation.app_variant
        and installation.app_variant in ('development', 'preview')
        and installation.disabled_at is null
        and endpoint.is_active = true
        and endpoint.disabled_at is null
    );

  update private.notification_campaigns as campaign
  set status = 'cancelled'
  from private.notification_outbox as outbox
  where outbox.campaign_id = campaign.id
    and outbox.status = 'cancelled'
    and outbox.last_error_code = 'TEST_TARGET_NOT_APPROVED'
    and campaign.kind = 'test'
    and campaign.status = 'queued';

  return query
  select
    claimed.outbox_id,
    claimed.campaign_id,
    claimed.delivery_id,
    claimed.push_endpoint_id,
    claimed.expo_push_token,
    claimed.title,
    claimed.body,
    claimed.deep_link
  from private.claim_notification_outbox_core(
    target_worker_id,
    target_campaign_limit
  ) as claimed;
end;
$$;

revoke all on function public.service_claim_notification_outbox(text, integer)
from public, anon, authenticated, service_role;
grant execute on function public.service_claim_notification_outbox(text, integer)
to service_role;

create function public.service_create_test_push_pairing(
  target_installation_id uuid,
  target_secret_hash text,
  target_app_variant text,
  target_code_digest text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_id uuid;
  request_now timestamptz := statement_timestamp();
  challenge_expires_at timestamptz := request_now + interval '10 minutes';
begin
  if target_app_variant is null
    or target_app_variant not in ('development', 'preview')
  then
    raise exception using
      errcode = '22023',
      message = 'Test push app variant must be development or preview';
  end if;

  if target_code_digest is null or target_code_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Valid pairing code digest is required';
  end if;

  perform 1
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and installation.app_variant = target_app_variant
    and installation.disabled_at is null
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  select endpoint.id
  into endpoint_id
  from private.push_endpoints as endpoint
  where endpoint.installation_id = target_installation_id
    and endpoint.is_active = true
    and endpoint.disabled_at is null
  for update;

  if endpoint_id is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.test_push_pairing_challenges
  set status = 'expired',
      code_digest = null,
      consumed_at = request_now,
      consumed_by = null
  where push_endpoint_id = endpoint_id
    and status = 'pending'
    and expires_at <= request_now;

  if exists (
    select 1
    from private.test_push_pairing_challenges as challenge
    where challenge.push_endpoint_id = endpoint_id
      and challenge.created_at > request_now - interval '30 seconds'
  ) or (
    select count(*)
    from private.test_push_pairing_challenges as challenge
    where challenge.push_endpoint_id = endpoint_id
      and challenge.created_at > request_now - interval '1 hour'
  ) >= 10 then
    raise exception using
      errcode = '55000',
      message = 'Pairing request rate limit exceeded';
  end if;

  update private.test_push_pairing_challenges
  set status = 'superseded',
      code_digest = null,
      consumed_at = request_now,
      consumed_by = null
  where push_endpoint_id = endpoint_id
    and status = 'pending';

  insert into private.test_push_pairing_challenges (
    push_endpoint_id,
    app_variant_snapshot,
    code_digest,
    status,
    expires_at
  ) values (
    endpoint_id,
    target_app_variant,
    target_code_digest,
    'pending',
    challenge_expires_at
  );

  return challenge_expires_at;
end;
$$;

revoke all on function public.service_create_test_push_pairing(uuid, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.service_create_test_push_pairing(uuid, text, text, text)
to service_role;

create function public.service_cleanup_test_push_pairings(
  target_now timestamptz default statement_timestamp()
)
returns table (expired_count bigint, deleted_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_rows bigint;
  deleted_rows bigint;
begin
  if target_now is null then
    raise exception using errcode = '22004', message = 'Cleanup time is required';
  end if;

  update private.test_push_pairing_challenges
  set status = 'expired',
      code_digest = null,
      consumed_at = target_now,
      consumed_by = null
  where status = 'pending'
    and expires_at <= target_now;
  get diagnostics expired_rows = row_count;

  delete from private.test_push_pairing_challenges
  where status <> 'pending'
    and consumed_at <= target_now - interval '30 days';
  get diagnostics deleted_rows = row_count;

  return query select expired_rows, deleted_rows;
end;
$$;

revoke all on function public.service_cleanup_test_push_pairings(timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.service_cleanup_test_push_pairings(timestamptz)
to service_role;

select cron.schedule(
  'jubilee-test-push-pairing-cleanup',
  '*/5 * * * *',
  'select public.service_cleanup_test_push_pairings(statement_timestamp())'
);

create function public.approve_owner_test_push_target(target_code_digest text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  challenge_id bigint;
  endpoint_id uuid;
  target_installation_id uuid;
  challenge_app_variant text;
  challenge_expires_at timestamptz;
  endpoint_app_variant text;
  endpoint_available boolean;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_code_digest is null or target_code_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Valid pairing code digest is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731904, 1);

  select challenge.id, challenge.push_endpoint_id, challenge.app_variant_snapshot
  into challenge_id, endpoint_id, challenge_app_variant
  from private.test_push_pairing_challenges as challenge
  where challenge.code_digest = target_code_digest
    and challenge.status = 'pending';

  if challenge_id is null then
    return false;
  end if;

  select endpoint.installation_id
  into target_installation_id
  from private.push_endpoints as endpoint
  where endpoint.id = endpoint_id;

  if target_installation_id is null then
    return false;
  end if;

  -- Pairing creation uses the same explicit installation -> endpoint order.
  -- Lock a prior approval only after both target rows, and the challenge last.
  perform 1
  from private.app_installations as installation
  where installation.id = target_installation_id
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from private.push_endpoints as endpoint
  where endpoint.id = endpoint_id
    and endpoint.installation_id = target_installation_id
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from private.owner_test_push_targets as approved_target
  where approved_target.push_endpoint_id = endpoint_id
  for update;

  select
    installation.app_variant,
    endpoint.is_active = true
      and endpoint.disabled_at is null
      and installation.disabled_at is null
  into endpoint_app_variant, endpoint_available
  from private.app_installations as installation
  join private.push_endpoints as endpoint
    on endpoint.installation_id = installation.id
  where installation.id = target_installation_id
    and endpoint.id = endpoint_id;

  select challenge.app_variant_snapshot, challenge.expires_at
  into challenge_app_variant, challenge_expires_at
  from private.test_push_pairing_challenges as challenge
  where challenge.id = challenge_id
    and challenge.code_digest = target_code_digest
    and challenge.status = 'pending'
  for update;

  if challenge_expires_at is null then
    return false;
  end if;

  if challenge_expires_at <= statement_timestamp() then
    update private.test_push_pairing_challenges
    set status = 'expired',
        code_digest = null,
        consumed_at = statement_timestamp(),
        consumed_by = null
    where id = challenge_id;
    return false;
  end if;

  if not endpoint_available
    or endpoint_app_variant is distinct from challenge_app_variant
    or endpoint_app_variant not in ('development', 'preview')
  then
    update private.test_push_pairing_challenges
    set status = 'superseded',
        code_digest = null,
        consumed_at = statement_timestamp(),
        consumed_by = null
    where id = challenge_id;
    return false;
  end if;

  insert into private.owner_test_push_targets (
    push_endpoint_id,
    app_variant_snapshot,
    pairing_challenge_id,
    approved_by,
    approved_at,
    revoked_by,
    revoked_at
  ) values (
    endpoint_id,
    challenge_app_variant,
    challenge_id,
    actor,
    statement_timestamp(),
    null,
    null
  )
  on conflict (push_endpoint_id) do update
  set app_variant_snapshot = excluded.app_variant_snapshot,
      pairing_challenge_id = excluded.pairing_challenge_id,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at,
      revoked_by = null,
      revoked_at = null;

  update private.test_push_pairing_challenges
  set status = 'approved',
      code_digest = null,
      consumed_at = statement_timestamp(),
      consumed_by = actor
  where id = challenge_id;

  return true;
end;
$$;

revoke all on function public.approve_owner_test_push_target(text)
from public, anon, authenticated, service_role;
grant execute on function public.approve_owner_test_push_target(text)
to authenticated;

create function public.revoke_owner_test_push_target(target_push_endpoint_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_installation_id uuid;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_push_endpoint_id is null then
    raise exception using errcode = '22004', message = 'Test push endpoint is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731904, 1);

  select endpoint.installation_id
  into target_installation_id
  from private.push_endpoints as endpoint
  where endpoint.id = target_push_endpoint_id;

  perform 1
  from private.app_installations as installation
  where installation.id = target_installation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Approved test push target does not exist';
  end if;

  perform 1
  from private.push_endpoints as endpoint
  where endpoint.id = target_push_endpoint_id
    and endpoint.installation_id = target_installation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Approved test push target does not exist';
  end if;

  perform 1
  from private.owner_test_push_targets as approved_target
  where approved_target.push_endpoint_id = target_push_endpoint_id
    and approved_target.revoked_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Approved test push target does not exist';
  end if;

  update private.owner_test_push_targets
  set revoked_by = actor,
      revoked_at = statement_timestamp()
  where push_endpoint_id = target_push_endpoint_id
    and revoked_at is null;

  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = 'TEST_TARGET_REVOKED'
  from private.notification_campaigns as campaign
  where outbox.campaign_id = campaign.id
    and campaign.kind = 'test'
    and campaign.test_push_endpoint_id = target_push_endpoint_id
    and outbox.status = 'pending';

  update private.notification_campaigns
  set status = 'cancelled'
  where kind = 'test'
    and test_push_endpoint_id = target_push_endpoint_id
    and status = 'queued';
end;
$$;

revoke all on function public.revoke_owner_test_push_target(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.revoke_owner_test_push_target(uuid)
to authenticated;

create function public.list_owner_test_push_targets()
returns table (
  push_endpoint_id uuid,
  app_variant text,
  display_label text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  return query
  select
    endpoint.id,
    installation.app_variant,
    pg_catalog.format(
      '%s · %s · 기기 …%s · 앱 %s',
      case installation.app_variant
        when 'development' then '개발'
        when 'preview' then '미리보기'
      end,
      case installation.platform
        when 'android' then 'Android'
        when 'ios' then 'iOS'
      end,
      pg_catalog.upper(pg_catalog.right(pg_catalog.replace(endpoint.id::text, '-', ''), 6)),
      installation.app_version
    )
  from private.push_endpoints as endpoint
  join private.app_installations as installation
    on installation.id = endpoint.installation_id
  join private.owner_test_push_targets as approved_target
    on approved_target.push_endpoint_id = endpoint.id
   and approved_target.revoked_at is null
  where installation.app_variant in ('development', 'preview')
    and approved_target.app_variant_snapshot = installation.app_variant
    and installation.disabled_at is null
    and endpoint.is_active = true
    and endpoint.disabled_at is null
  order by endpoint.last_registered_at desc, endpoint.id
  limit 100;
end;
$$;

revoke all on function public.list_owner_test_push_targets()
from public, anon, authenticated, service_role;
grant execute on function public.list_owner_test_push_targets()
to authenticated;

create function public.queue_owner_test_push(
  target_request_id uuid,
  target_push_endpoint_id uuid,
  target_app_variant text,
  target_title text,
  target_body text,
  target_deep_link text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
  campaign_dedupe_key text;
  existing_campaign_matches boolean;
  actor uuid := (select auth.uid());
  target_installation_id uuid;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_request_id is null or target_push_endpoint_id is null then
    raise exception using errcode = '22004', message = 'Test push request and endpoint are required';
  end if;

  if target_app_variant is null
    or target_app_variant not in ('development', 'preview')
  then
    raise exception using
      errcode = '22023',
      message = 'Test push app variant must be development or preview';
  end if;

  -- Serialize retries with the same caller-generated request UUID.  A hash
  -- collision only serializes unrelated requests and cannot merge them because
  -- the unique dedupe key still contains the full UUID.
  perform pg_catalog.pg_advisory_xact_lock(731904, 1);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor::text || ':' || target_request_id::text, 0)
  );

  campaign_dedupe_key := 'test-request:'
    || pg_catalog.replace(actor::text, '-', '')
    || ':'
    || target_request_id::text;

  select
    campaign.id,
    campaign.kind = 'test'
      and campaign.audience_kind = 'test_endpoint'
      and campaign.test_push_endpoint_id = target_push_endpoint_id
      and installation.app_variant = target_app_variant
      and campaign.title = target_title
      and campaign.body = target_body
      and campaign.deep_link is not distinct from target_deep_link
      and campaign.approved_by = actor
  into campaign_id, existing_campaign_matches
  from private.notification_campaigns as campaign
  left join private.push_endpoints as endpoint
    on endpoint.id = campaign.test_push_endpoint_id
  left join private.app_installations as installation
    on installation.id = endpoint.installation_id
  where campaign.dedupe_key = campaign_dedupe_key;

  if campaign_id is not null then
    if existing_campaign_matches then
      return campaign_id;
    end if;

    raise exception using
      errcode = '23505',
      message = 'Test push request id conflicts with an existing request';
  end if;

  select endpoint.installation_id
  into target_installation_id
  from private.push_endpoints as endpoint
  where endpoint.id = target_push_endpoint_id;

  perform 1
  from private.app_installations as installation
  where installation.id = target_installation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Approved active test push endpoint does not exist';
  end if;

  perform 1
  from private.push_endpoints as endpoint
  where endpoint.id = target_push_endpoint_id
    and endpoint.installation_id = target_installation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Approved active test push endpoint does not exist';
  end if;

  perform 1
  from private.owner_test_push_targets as approved_target
  where approved_target.push_endpoint_id = target_push_endpoint_id
    and approved_target.revoked_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Approved active test push endpoint does not exist';
  end if;

  perform 1
  from private.owner_test_push_targets as approved_target
  join private.push_endpoints as endpoint
    on endpoint.id = approved_target.push_endpoint_id
  join private.app_installations as installation
    on installation.id = endpoint.installation_id
  where endpoint.id = target_push_endpoint_id
    and approved_target.revoked_at is null
    and approved_target.app_variant_snapshot = target_app_variant
    and endpoint.is_active = true
    and endpoint.disabled_at is null
    and installation.disabled_at is null
    and installation.app_variant = target_app_variant;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Approved active test push endpoint does not exist';
  end if;

  campaign_id := gen_random_uuid();

  insert into private.notification_campaigns (
    id,
    kind,
    title,
    body,
    deep_link,
    audience_kind,
    event_id,
    test_push_endpoint_id,
    status,
    dedupe_key,
    approved_at,
    approved_by,
    queued_at
  ) values (
    campaign_id,
    'test',
    target_title,
    target_body,
    target_deep_link,
    'test_endpoint',
    null,
    target_push_endpoint_id,
    'queued',
    campaign_dedupe_key,
    statement_timestamp(),
    actor,
    statement_timestamp()
  );

  insert into private.notification_outbox (campaign_id, dedupe_key)
  values (campaign_id, campaign_dedupe_key);

  return campaign_id;
end;
$$;

revoke all on function public.queue_owner_test_push(uuid, uuid, text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.queue_owner_test_push(uuid, uuid, text, text, text, text)
to authenticated;

comment on function public.list_owner_test_push_targets() is
  'Lists masked active owner-paired development and preview push targets.';
comment on function public.queue_owner_test_push(uuid, uuid, text, text, text, text) is
  'Idempotently queues one owner-approved test push for one paired non-production endpoint.';

commit;
