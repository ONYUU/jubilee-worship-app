begin;

-- Notification retention is intentionally expressed in database state rather
-- than relying on an unpublished operational convention:
--   * 180 days without a successful app check-in disables an installation.
--   * inactive Expo tokens are removed within 24 hours.
--   * disabled installation metadata is removed after 30 days.
--   * terminal delivery history is removed after 90 days.
-- The public app has no user accounts. These records identify an app
-- installation only, but are still minimized and deleted on a fixed schedule.

alter table private.app_installations
  add column disable_reason text;

update private.app_installations
set disable_reason = 'user_unregistered'
where disabled_at is not null;

alter table private.app_installations
  add constraint app_installations_disabled_state_valid check (
    (disabled_at is null and disable_reason is null)
    or
    (
      disabled_at is not null
      and disable_reason is not null
      and disable_reason in ('user_unregistered', 'stale_inactivity')
    )
  );

-- A raw Expo token must be removable without deleting the non-identifying
-- terminal delivery result. Active work always keeps its endpoint reference.
alter table private.notification_campaigns
  drop constraint notification_campaigns_test_push_endpoint_id_fkey,
  drop constraint notification_campaigns_test_target_valid;

alter table private.notification_campaigns
  add constraint notification_campaigns_test_push_endpoint_id_fkey
    foreign key (test_push_endpoint_id)
    references private.push_endpoints (id) on delete set null,
  add constraint notification_campaigns_test_target_valid check (
    (
      kind = 'test'
      and audience_kind = 'test_endpoint'
      and (
        test_push_endpoint_id is not null
        or status in ('completed', 'cancelled', 'failed')
      )
    )
    or
    (
      kind <> 'test'
      and audience_kind <> 'test_endpoint'
      and test_push_endpoint_id is null
    )
  );

alter table private.notification_deliveries
  drop constraint notification_deliveries_push_endpoint_id_fkey,
  alter column push_endpoint_id drop not null;

alter table private.notification_deliveries
  add constraint notification_deliveries_push_endpoint_id_fkey
    foreign key (push_endpoint_id)
    references private.push_endpoints (id) on delete set null,
  add constraint notification_deliveries_terminal_endpoint_valid check (
    push_endpoint_id is not null
    or status in ('delivered', 'failed', 'device_not_registered')
  );

-- The endpoint row may be needed temporarily for receipt and foreign-key
-- lifecycle handling after opt-out, but the provider token itself is not.
-- Nullable token columns let the daily cleanup irreversibly scrub both the raw
-- token and its stable hash without waiting for the endpoint row to be deleted.
alter table private.push_endpoints
  alter column expo_push_token drop not null,
  alter column token_hash drop not null,
  add constraint push_endpoints_token_state_valid check (
    (expo_push_token is null and token_hash is null and is_active = false)
    or (expo_push_token is not null and token_hash is not null)
  );

-- Retiring terminal campaigns must not reopen their dedupe key for a later
-- duplicate send. The tombstone contains no installation or push-token value.
create table private.notification_dedupe_tombstones (
  dedupe_key text primary key
    check (
      dedupe_key = btrim(dedupe_key)
      and dedupe_key ~ '^[A-Za-z0-9:._-]{1,160}$'
    ),
  retired_at timestamptz not null default statement_timestamp()
);

alter table private.notification_dedupe_tombstones enable row level security;

revoke all on table private.notification_dedupe_tombstones
from public, anon, authenticated, service_role;

create or replace function private.reject_retired_notification_dedupe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from private.notification_dedupe_tombstones as tombstone
    where tombstone.dedupe_key = new.dedupe_key
  ) then
    raise exception using
      errcode = '23505',
      message = 'Notification dedupe key has already been retired';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_retired_notification_dedupe()
from public, anon, authenticated, service_role;

create trigger notification_campaigns_reject_retired_dedupe
before insert on private.notification_campaigns
for each row execute function private.reject_retired_notification_dedupe();

create index app_installations_stale_cleanup_idx
  on private.app_installations (last_seen_at, id)
  where disabled_at is null;

create index app_installations_disabled_cleanup_idx
  on private.app_installations (disabled_at, id)
  where disabled_at is not null;

create index push_endpoints_disabled_cleanup_idx
  on private.push_endpoints (disabled_at, id)
  where is_active = false and disabled_at is not null;

create index notification_deliveries_terminal_cleanup_idx
  on private.notification_deliveries (
    coalesce(delivered_at, failed_at, updated_at), id
  )
  where status in ('delivered', 'failed', 'device_not_registered');

create index notification_outbox_terminal_cleanup_idx
  on private.notification_outbox (updated_at, id)
  where status in ('sent', 'failed', 'cancelled');

create index notification_campaigns_terminal_cleanup_idx
  on private.notification_campaigns (
    coalesce(completed_at, updated_at), id
  )
  where status in ('completed', 'failed', 'cancelled');

-- Notification preferences can reveal religious interest even though this app
-- has no member accounts. Keep the enforceable database publication gate in
-- step with the administrator template so a direct RPC call cannot bypass the
-- sensitive-data disclosure.
create or replace function private.legal_document_has_sensitive_notification_disclosure(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select position('종교적 관심' in target_body) > 0
    and position('이름·이메일' in target_body) > 0
    and position('광고 식별자' in target_body) > 0
    and position('결합하지 않고' in target_body) > 0
    and position('알림 제공' in target_body) > 0
    and position('에만 사용' in target_body) > 0
    and position(
      '광고·추적·이용자 프로파일링에 사용하지 않습니다'
      in target_body
    ) > 0;
$$;

revoke all on function
  private.legal_document_has_sensitive_notification_disclosure(text)
from public, anon, authenticated, service_role;

create or replace function public.publish_legal_document(target_document_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
  target_body text;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select legal.document_type, legal.body
  into target_type, target_body
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

  if position('[[오너 확인 필요]]' in target_body) > 0
    or position('쥬빌리 워십' in target_body) = 0
    or position('sundoojubileeworship@gmail.com' in target_body) = 0
    or (
      target_type = 'privacy_policy'
      and (
        position('설치 식별자' in target_body) = 0
        or position('푸시 토큰' in target_body) = 0
        or position('알림 선택' in target_body) = 0
        or position('보유' in target_body) = 0
        or position('비활성화' in target_body) = 0
        or not private.legal_document_has_sensitive_notification_disclosure(target_body)
        or not private.legal_document_has_confirmed_value(
          target_body, '비활성 정보 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '발송 기록 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '정기 삭제 주기:'
        )
        or not private.legal_document_has_confirmed_value(target_body, '수탁자:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 국가:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 항목:')
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 시점 및 방법:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '국외 처리 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 거부 방법 및 효과:'
        )
      )
    )
    or (
      target_type = 'terms_of_service'
      and (
        not private.legal_document_has_confirmed_value(target_body, '준거법:')
        or not private.legal_document_has_confirmed_value(target_body, '관할:')
        or not private.legal_document_has_confirmed_value(target_body, '면책 범위:')
        or not private.legal_document_has_confirmed_value(
          target_body, '미성년자 이용 안내:'
        )
      )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Legal document identity and disclosure review is incomplete';
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

-- A stale installation may safely reactivate during its 30-day grace period
-- when the device still holds the correct installation secret. A record that
-- the user explicitly unregistered can never be reactivated.
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
  wants_notifications boolean :=
    target_worship_reminder
    or target_schedule_changes
    or target_setlist_updates;
begin
  if (target_expo_push_token is null) <> (target_token_hash is null) then
    raise exception using
      errcode = '22004',
      message = 'Push token and token hash must be supplied together';
  end if;

  select installation.platform
  into installation_platform
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and (
      installation.disabled_at is null
      or installation.disable_reason = 'stale_inactivity'
    )
  for update;

  if installation_platform is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.app_installations
  set app_version = target_app_version,
      last_seen_at = statement_timestamp(),
      disabled_at = null,
      disable_reason = null
  where id = target_installation_id;

  update private.notification_subscriptions
  set worship_reminder = target_worship_reminder,
      schedule_changes = target_schedule_changes,
      setlist_updates = target_setlist_updates
  where installation_id = target_installation_id;

  if not wants_notifications then
    update private.push_endpoints
    set is_active = false,
        disabled_at = coalesce(disabled_at, statement_timestamp()),
        disable_reason = 'all_subscriptions_disabled'
    where installation_id = target_installation_id;
    return;
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
      disable_reason = 'user_unregistered',
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

create or replace function public.service_cleanup_notification_data(
  target_now timestamptz,
  target_batch_limit integer default 5000
)
returns table (
  processing_expired integer,
  receipts_expired integer,
  stale_installations_disabled integer,
  test_campaigns_cancelled integer,
  push_tokens_scrubbed integer,
  push_endpoints_deleted integer,
  installations_deleted integer,
  deliveries_deleted integer,
  outbox_deleted integer,
  campaigns_deleted integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_installation_ids uuid[];
  endpoint_ids uuid[];
  installation_ids uuid[];
  delivery_ids bigint[];
  outbox_ids bigint[];
  campaign_ids uuid[];
begin
  if target_now is null then
    raise exception using errcode = '22004', message = 'Cleanup time is required';
  end if;

  if target_batch_limit is null or target_batch_limit not between 1 and 5000 then
    raise exception using
      errcode = '22023',
      message = 'Cleanup batch limit must be between 1 and 5000';
  end if;

  -- Prevent two scheduled or manual cleanup runs from racing each other.
  perform pg_catalog.pg_advisory_xact_lock(731914, 1);

  processing_expired := 0;
  receipts_expired := 0;
  stale_installations_disabled := 0;
  test_campaigns_cancelled := 0;
  push_tokens_scrubbed := 0;
  push_endpoints_deleted := 0;
  installations_deleted := 0;
  deliveries_deleted := 0;
  outbox_deleted := 0;
  campaigns_deleted := 0;

  -- An Edge invocation cannot legitimately retain a processing lease for a
  -- full day. Failing rather than retrying avoids a duplicate provider send.
  select array_agg(candidate.id)
  into outbox_ids
  from (
    select outbox.id
    from private.notification_outbox as outbox
    where outbox.status = 'processing'
      and outbox.locked_at <= target_now - interval '24 hours'
    order by outbox.locked_at, outbox.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if outbox_ids is not null then
    update private.notification_outbox
    set status = 'failed',
        locked_at = null,
        locked_by = null,
        last_error_code = 'WORKER_LEASE_EXPIRED'
    where id = any (outbox_ids);
    get diagnostics processing_expired = row_count;

    update private.notification_campaigns as campaign
    set status = 'failed',
        completed_at = coalesce(campaign.completed_at, target_now)
    from private.notification_outbox as outbox
    where outbox.id = any (outbox_ids)
      and campaign.id = outbox.campaign_id
      and campaign.status = 'processing';

    update private.notification_deliveries as delivery
    set status = 'failed',
        error_code = 'WorkerLeaseExpired',
        failed_at = target_now
    from private.notification_outbox as outbox
    where outbox.id = any (outbox_ids)
      and delivery.campaign_id = outbox.campaign_id
      and delivery.status = 'queued';
  end if;

  -- Expo clears receipts after 24 hours. Keeping these rows in
  -- provider_accepted after that point would make them permanently in-flight.
  with candidates as (
    select delivery.id
    from private.notification_deliveries as delivery
    where delivery.status = 'provider_accepted'
      and delivery.provider_accepted_at <= target_now - interval '24 hours'
    order by delivery.provider_accepted_at, delivery.id
    for update skip locked
    limit target_batch_limit
  )
  update private.notification_deliveries as delivery
  set status = 'failed',
      error_code = 'ReceiptExpired',
      failed_at = target_now
  from candidates
  where delivery.id = candidates.id;

  get diagnostics receipts_expired = row_count;

  select array_agg(candidate.id)
  into stale_installation_ids
  from (
    select installation.id
    from private.app_installations as installation
    where installation.disabled_at is null
      and installation.last_seen_at <= target_now - interval '180 days'
    order by installation.last_seen_at, installation.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if stale_installation_ids is not null then
    update private.app_installations
    set disabled_at = target_now,
        disable_reason = 'stale_inactivity'
    where id = any (stale_installation_ids);
    get diagnostics stale_installations_disabled = row_count;

    update private.notification_subscriptions
    set worship_reminder = false,
        schedule_changes = false,
        setlist_updates = false
    where installation_id = any (stale_installation_ids);

    update private.push_endpoints
    set is_active = false,
        disabled_at = coalesce(disabled_at, target_now),
        disable_reason = 'stale_inactivity'
    where installation_id = any (stale_installation_ids);
  end if;

  -- A disabled endpoint can no longer be a valid unsent test target.
  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = 'TEST_ENDPOINT_DISABLED'
  where outbox.status = 'pending'
    and outbox.campaign_id in (
      select campaign.id
      from private.notification_campaigns as campaign
      join private.push_endpoints as endpoint
        on endpoint.id = campaign.test_push_endpoint_id
      where endpoint.is_active = false
        and endpoint.disabled_at <= target_now - interval '24 hours'
        and campaign.kind = 'test'
        and campaign.status in ('approved', 'queued')
    );

  with cancelled as (
    update private.notification_campaigns as campaign
    set status = 'cancelled'
    from private.push_endpoints as endpoint
    where endpoint.id = campaign.test_push_endpoint_id
      and endpoint.is_active = false
      and endpoint.disabled_at <= target_now - interval '24 hours'
      and campaign.kind = 'test'
      and campaign.status in ('draft', 'approved', 'queued')
    returning campaign.id
  )
  select count(*)::integer into test_campaigns_cancelled from cancelled;

  -- This job runs once every 24 hours. Scrubbing every token that is already
  -- inactive, rather than waiting until it is 24 hours old, keeps the normal
  -- scheduler-path maximum at 24 hours even when the endpoint row must remain
  -- for a receipt or terminal-history foreign key. The token cannot be
  -- reconstructed from token_hash because that value is removed at the same
  -- time.
  update private.push_endpoints
  set expo_push_token = null,
      token_hash = null
  where is_active = false
    and disabled_at is not null
    and disabled_at <= target_now
    and (expo_push_token is not null or token_hash is not null);

  get diagnostics push_tokens_scrubbed = row_count;

  select array_agg(candidate.id)
  into endpoint_ids
  from (
    select endpoint.id
    from private.push_endpoints as endpoint
    where endpoint.is_active = false
      and endpoint.disabled_at <= target_now - interval '24 hours'
      and not exists (
        select 1
        from private.notification_deliveries as delivery
        where delivery.push_endpoint_id = endpoint.id
          and delivery.status in ('queued', 'provider_accepted')
      )
      and not exists (
        select 1
        from private.notification_campaigns as campaign
        where campaign.test_push_endpoint_id = endpoint.id
          and campaign.status in ('draft', 'approved', 'queued', 'processing')
      )
    order by endpoint.disabled_at, endpoint.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if endpoint_ids is not null then
    delete from private.push_endpoints
    where id = any (endpoint_ids);
    get diagnostics push_endpoints_deleted = row_count;
  end if;

  select array_agg(candidate.id)
  into installation_ids
  from (
    select installation.id
    from private.app_installations as installation
    where installation.disabled_at <= target_now - interval '30 days'
      and not exists (
        select 1
        from private.push_endpoints as endpoint
        where endpoint.installation_id = installation.id
      )
    order by installation.disabled_at, installation.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if installation_ids is not null then
    delete from private.app_installations
    where id = any (installation_ids);
    get diagnostics installations_deleted = row_count;
  end if;

  select array_agg(candidate.id)
  into delivery_ids
  from (
    select delivery.id
    from private.notification_deliveries as delivery
    where delivery.status in ('delivered', 'failed', 'device_not_registered')
      and coalesce(delivery.delivered_at, delivery.failed_at, delivery.updated_at)
        <= target_now - interval '90 days'
    order by
      coalesce(delivery.delivered_at, delivery.failed_at, delivery.updated_at),
      delivery.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if delivery_ids is not null then
    delete from private.notification_deliveries
    where id = any (delivery_ids);
    get diagnostics deliveries_deleted = row_count;
  end if;

  select array_agg(candidate.id)
  into outbox_ids
  from (
    select outbox.id
    from private.notification_outbox as outbox
    where outbox.status in ('sent', 'failed', 'cancelled')
      and outbox.updated_at <= target_now - interval '90 days'
    order by outbox.updated_at, outbox.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if outbox_ids is not null then
    delete from private.notification_outbox
    where id = any (outbox_ids);
    get diagnostics outbox_deleted = row_count;
  end if;

  select array_agg(candidate.id)
  into campaign_ids
  from (
    select campaign.id
    from private.notification_campaigns as campaign
    where campaign.status in ('completed', 'failed', 'cancelled')
      and coalesce(campaign.completed_at, campaign.updated_at)
        <= target_now - interval '90 days'
      and not exists (
        select 1
        from private.notification_deliveries as delivery
        where delivery.campaign_id = campaign.id
          and (
            delivery.status in ('queued', 'provider_accepted')
            or coalesce(delivery.delivered_at, delivery.failed_at, delivery.updated_at)
              > target_now - interval '90 days'
          )
      )
      and not exists (
        select 1
        from private.notification_outbox as outbox
        where outbox.campaign_id = campaign.id
          and (
            outbox.status in ('pending', 'processing')
            or outbox.updated_at > target_now - interval '90 days'
          )
      )
    order by coalesce(campaign.completed_at, campaign.updated_at), campaign.id
    for update skip locked
    limit target_batch_limit
  ) as candidate;

  if campaign_ids is not null then
    insert into private.notification_dedupe_tombstones (dedupe_key, retired_at)
    select campaign.dedupe_key, target_now
    from private.notification_campaigns as campaign
    where campaign.id = any (campaign_ids)
    on conflict (dedupe_key) do nothing;

    delete from private.notification_campaigns
    where id = any (campaign_ids);
    get diagnostics campaigns_deleted = row_count;
  end if;

  return next;
end;
$$;

revoke all on function public.service_cleanup_notification_data(timestamptz, integer)
from public, anon, authenticated;

grant execute on function
  public.service_cleanup_notification_data(timestamptz, integer)
to service_role;

-- The local and hosted Supabase images provide pg_cron. The database job calls
-- the service-only RPC directly, so no secret is stored in SQL or Git.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'jubilee-notification-retention-daily',
  '17 18 * * *',
  $$select public.service_cleanup_notification_data(statement_timestamp(), 5000)$$
);

commit;
