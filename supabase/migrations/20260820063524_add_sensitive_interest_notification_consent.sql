-- Require a separate, versioned consent before any notification preference
-- that can reveal religious interest is registered. Generated with
-- `supabase migration new add_sensitive_interest_notification_consent`.

begin;

-- Old app versions sent a reusable raw installation secret through hosted
-- Edge requests. Never silently carry a legacy credential into the v2 proof
-- scheme. The linked project was observed empty on 2026-08-20; deployment
-- must hard-stop if that fact drifts so rows can be reviewed explicitly.
do $$
begin
  if exists (select 1 from private.app_installations)
    or exists (select 1 from private.push_endpoints)
    or exists (select 1 from private.notification_subscriptions)
    or exists (select 1 from private.notification_campaigns)
    or exists (select 1 from private.notification_outbox)
    or exists (select 1 from private.notification_deliveries)
  then
    raise exception using
      errcode = '55000',
      message = 'Legacy notification rows must be reviewed before v2 credential migration';
  end if;
end;
$$;

alter table private.app_installations
  add column sensitive_interest_consent_version text,
  add column sensitive_interest_consented_at timestamptz,
  add column sensitive_interest_disclosure_sha256 text
    check (
      sensitive_interest_disclosure_sha256 is null
      or sensitive_interest_disclosure_sha256 ~ '^[0-9a-f]{64}$'
    ),
  add column sensitive_interest_consent_locale text
    check (
      sensitive_interest_consent_locale is null
      or sensitive_interest_consent_locale ~ '^[a-z]{2}-[A-Z]{2}$'
    ),
  add column test_pairing_secret_hash text
    check (
      test_pairing_secret_hash is null
      or test_pairing_secret_hash ~ '^[0-9a-f]{64}$'
    ),
  add constraint app_installations_sensitive_interest_consent_valid check (
    (
      sensitive_interest_consent_version is null
      and sensitive_interest_consented_at is null
      and sensitive_interest_disclosure_sha256 is null
      and sensitive_interest_consent_locale is null
    )
    or
    (
      sensitive_interest_consent_version is not null
      and sensitive_interest_consent_version = btrim(sensitive_interest_consent_version)
      and sensitive_interest_consent_version <> ''
      and char_length(sensitive_interest_consent_version) <= 100
      and sensitive_interest_consented_at is not null
      and sensitive_interest_disclosure_sha256 is not null
      and sensitive_interest_consent_locale is not null
    )
  );

-- Existing installations predate the separate disclosure. Fail closed: turn
-- off every legacy subscription, disable active installations, and scrub raw
-- provider tokens immediately. A current app can reactivate a
-- consent_required installation only after a new affirmative consent.
update private.notification_subscriptions
set worship_reminder = false,
    schedule_changes = false,
    setlist_updates = false;

update private.push_endpoints
set expo_push_token = null,
    token_hash = null,
    is_active = false,
    disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = case
      when is_active then 'consent_required'
      else coalesce(disable_reason, 'consent_required')
    end;

alter table private.app_installations
  drop constraint app_installations_disabled_state_valid;

update private.app_installations
set disabled_at = statement_timestamp(),
    disable_reason = 'consent_required'
where disabled_at is null;

alter table private.app_installations
  add constraint app_installations_disabled_state_valid check (
    (disabled_at is null and disable_reason is null)
    or
    (
      disabled_at is not null
      and disable_reason is not null
      and disable_reason in (
        'user_unregistered',
        'stale_inactivity',
        'consent_required'
      )
    )
  );

create function private.current_sensitive_interest_consent_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'sensitive-interest-notifications-v1'::text;
$$;

create function private.current_sensitive_interest_disclosure_sha256()
returns text
language sql
immutable
set search_path = ''
as $$
  select '95b294add4c6b805cdd51ae152920930a5fe83fa5660b801b0cc9beedd23b1c0'::text;
$$;

create function private.current_sensitive_interest_consent_locale()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ko-KR'::text;
$$;

revoke all on function private.current_sensitive_interest_consent_version()
from public, anon, authenticated, service_role;
revoke all on function
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale()
from public, anon, authenticated, service_role;

-- Append-only through the service RPCs. This records the affirmative action
-- and later withdrawal without copying the installation secret or push token.
-- Rows follow the installation's 30-day post-disable deletion lifecycle.
create table private.sensitive_interest_consent_events (
  id bigint generated always as identity primary key,
  installation_id uuid not null
    references private.app_installations (id) on delete cascade,
  event_type text not null check (event_type in ('granted', 'withdrawn')),
  consent_version text not null check (
    consent_version = btrim(consent_version)
    and consent_version <> ''
    and char_length(consent_version) <= 100
  ),
  disclosure_sha256 text not null check (disclosure_sha256 ~ '^[0-9a-f]{64}$'),
  consent_locale text not null check (consent_locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  consent_method text not null default 'notification_settings'
    check (consent_method = 'notification_settings'),
  app_version text not null check (
    app_version = btrim(app_version)
    and app_version <> ''
    and char_length(app_version) <= 64
  ),
  occurred_at timestamptz not null default statement_timestamp()
);

create index sensitive_interest_consent_events_installation_idx
  on private.sensitive_interest_consent_events (installation_id, occurred_at desc);

alter table private.sensitive_interest_consent_events enable row level security;

revoke all on table private.sensitive_interest_consent_events
from public, anon, authenticated, service_role;
revoke all on sequence private.sensitive_interest_consent_events_id_seq
from public, anon, authenticated, service_role;

-- Distributed abuse guard for the narrow anonymous Data API RPCs. The source
-- address and user agent are never stored: one project-scoped random database
-- pepper is used to HMAC the request source. Most rows affect decisions for
-- one minute and expire after five minutes. Registration also has one-day
-- source/global counters retained for 25 hours from the start of their window.
-- Expired rows can remain until the next five-minute cleanup run.
create table private.notification_client_rate_limit_secret (
  singleton boolean primary key default true check (singleton),
  pepper bytea not null default extensions.gen_random_bytes(32),
  created_at timestamptz not null default statement_timestamp()
);

insert into private.notification_client_rate_limit_secret (singleton)
values (true);

create table private.notification_client_rate_limits (
  scope text not null check (scope ~ '^[a-z_]{1,40}$'),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000),
  expires_at timestamptz not null,
  primary key (scope, key_hash)
);

-- Emergency operational stop for anonymous installation creation. Only the
-- narrow service-role control RPC below can change this singleton.
create table private.notification_registration_control (
  singleton boolean primary key default true check (singleton),
  registration_enabled boolean not null default false,
  updated_at timestamptz not null default statement_timestamp()
);

insert into private.notification_registration_control (singleton, registration_enabled)
values (true, false);

create index notification_client_rate_limits_expiry_idx
  on private.notification_client_rate_limits (expires_at);

alter table private.notification_client_rate_limit_secret enable row level security;
alter table private.notification_client_rate_limits enable row level security;
alter table private.notification_registration_control enable row level security;

revoke all on table
  private.notification_client_rate_limit_secret,
  private.notification_client_rate_limits,
  private.notification_registration_control
from public, anon, authenticated, service_role;

create function private.sha256_hex(target_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(target_value, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

create function private.notification_request_header(
  target_name text,
  target_max_length integer
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb;
  result text;
begin
  begin
    headers := coalesce(
      nullif(pg_catalog.current_setting('request.headers', true), ''),
      '{}'
    )::jsonb;
  exception when others then
    headers := '{}'::jsonb;
  end;

  result := headers ->> pg_catalog.lower(target_name);
  if result is null
    or result = ''
    or char_length(result) > target_max_length
    or position(E'\n' in result) > 0
    or position(E'\r' in result) > 0
  then
    return null;
  end if;
  return result;
end;
$$;

create function private.enforce_notification_client_rate_limit(
  target_scope text,
  target_limit integer,
  target_window interval default interval '1 minute',
  target_global_limit integer default null,
  target_retention interval default interval '5 minutes'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_now timestamptz := statement_timestamp();
  source_address text;
  source_key text;
  global_key text;
  current_count integer;
  global_count integer;
  resolved_global_limit integer := coalesce(target_global_limit, target_limit * 20);
  secret_pepper bytea;
begin
  if target_scope is null or target_scope !~ '^[a-z_]{1,40}$'
    or target_limit is null or target_limit not between 1 and 1000
    or target_window is null
    or target_window < interval '1 second'
    or target_window > interval '1 day'
    or resolved_global_limit not between 1 and 100000
    or target_retention is null
    or target_retention < target_window
    or target_retention > interval '25 hours'
  then
    raise exception using errcode = '22023', message = 'Valid rate-limit configuration is required';
  end if;

  -- Only the proxy-controlled Cloudflare header is trusted. A caller can
  -- spoof x-forwarded-for through the public Data API, so absence of the
  -- Cloudflare header intentionally collapses into one fail-closed bucket.
  source_address := btrim(coalesce(
    private.notification_request_header('cf-connecting-ip', 100),
    'unknown'
  ));

  select pepper into secret_pepper
  from private.notification_client_rate_limit_secret
  where singleton = true;

  source_key := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(target_scope || E'\n' || source_address, 'UTF8'),
      secret_pepper,
      'sha256'
    ),
    'hex'
  );
  global_key := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(target_scope || E'\nglobal', 'UTF8'),
      secret_pepper,
      'sha256'
    ),
    'hex'
  );

  insert into private.notification_client_rate_limits (
    scope, key_hash, window_started_at, request_count, expires_at
  ) values (
    target_scope, source_key, request_now, 1, request_now + target_retention
  )
  on conflict (scope, key_hash) do update
  set window_started_at = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then request_now
        else private.notification_client_rate_limits.window_started_at
      end,
      request_count = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then 1
        else private.notification_client_rate_limits.request_count + 1
      end,
      expires_at = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then request_now + target_retention
        else private.notification_client_rate_limits.window_started_at + target_retention
      end
  returning request_count into current_count;

  if current_count > target_limit then
    raise exception using errcode = '55000', message = 'Notification client request rate exceeded';
  end if;

  insert into private.notification_client_rate_limits (
    scope, key_hash, window_started_at, request_count, expires_at
  ) values (
    target_scope || '_global',
    global_key,
    request_now,
    1,
    request_now + target_retention
  )
  on conflict (scope, key_hash) do update
  set window_started_at = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then request_now
        else private.notification_client_rate_limits.window_started_at
      end,
      request_count = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then 1
        else private.notification_client_rate_limits.request_count + 1
      end,
      expires_at = case
        when private.notification_client_rate_limits.window_started_at + target_window <= request_now
        then request_now + target_retention
        else private.notification_client_rate_limits.window_started_at + target_retention
      end
  returning request_count into global_count;

  if global_count > resolved_global_limit then
    raise exception using errcode = '55000', message = 'Global notification client rate exceeded';
  end if;
end;
$$;

create function private.enforce_notification_subject_rate_limit(
  target_scope text,
  target_subject text,
  target_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_now timestamptz := statement_timestamp();
  subject_key text;
  current_count integer;
  secret_pepper bytea;
begin
  if target_scope is null or target_scope !~ '^[a-z_]{1,40}$'
    or target_subject is null or target_subject = '' or char_length(target_subject) > 100
    or target_limit is null or target_limit not between 1 and 1000
  then
    raise exception using errcode = '22023', message = 'Valid subject rate-limit configuration is required';
  end if;

  select pepper into secret_pepper
  from private.notification_client_rate_limit_secret
  where singleton = true;
  subject_key := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(target_scope || E'\n' || target_subject, 'UTF8'),
      secret_pepper,
      'sha256'
    ),
    'hex'
  );

  insert into private.notification_client_rate_limits (
    scope, key_hash, window_started_at, request_count, expires_at
  ) values (
    target_scope, subject_key, request_now, 1, request_now + interval '5 minutes'
  )
  on conflict (scope, key_hash) do update
  set window_started_at = case
        when private.notification_client_rate_limits.window_started_at + interval '1 minute' <= request_now
        then request_now
        else private.notification_client_rate_limits.window_started_at
      end,
      request_count = case
        when private.notification_client_rate_limits.window_started_at + interval '1 minute' <= request_now
        then 1
        else private.notification_client_rate_limits.request_count + 1
      end,
      expires_at = request_now + interval '5 minutes'
  returning request_count into current_count;

  if current_count > target_limit then
    raise exception using errcode = '55000', message = 'Installation request rate exceeded';
  end if;
end;
$$;

revoke all on function
  private.sha256_hex(text),
  private.notification_request_header(text, integer),
  private.enforce_notification_client_rate_limit(
    text, integer, interval, integer, interval
  ),
  private.enforce_notification_subject_rate_limit(text, text, integer)
from public, anon, authenticated, service_role;

-- One predicate controls both the operational enable action and every client
-- registration. This keeps a stale or incomplete previously-published policy
-- from reopening collection after a migration or manual control-table write.
create function private.current_store_ready_privacy_policy_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.legal_documents as legal
    where legal.document_type = 'privacy_policy'
      and legal.status = 'published'
      and legal.effective_on <= current_date
      and position('[[오너 확인 필요]]' in legal.body) = 0
      and position('쥬빌리 워십' in legal.body) > 0
      and position('sundoojubileeworship@gmail.com' in legal.body) > 0
      and position('설치 식별자' in legal.body) > 0
      and position('푸시 토큰' in legal.body) > 0
      and position('알림 선택' in legal.body) > 0
      and position('보유' in legal.body) > 0
      and position('비활성화' in legal.body) > 0
      and private.legal_document_has_sensitive_notification_disclosure(legal.body)
      and private.legal_document_has_confirmed_value(
        legal.body, '비활성 정보 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '발송 기록 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '정기 삭제 주기:'
      )
      and private.legal_document_has_confirmed_value(legal.body, '수탁자:')
      and private.legal_document_has_confirmed_value(legal.body, '이전 국가:')
      and private.legal_document_has_confirmed_value(legal.body, '이전 항목:')
      and private.legal_document_has_confirmed_value(
        legal.body, '이전 시점 및 방법:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '국외 처리 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '이전 거부 방법 및 효과:'
      )
  );
$$;

revoke all on function private.current_store_ready_privacy_policy_exists()
from public, anon, authenticated, service_role;

create function public.service_set_notification_registration_enabled(
  target_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_enabled is null then
    raise exception using
      errcode = '22004',
      message = 'Registration enabled state is required';
  end if;

  if target_enabled
    and not private.current_store_ready_privacy_policy_exists()
  then
    raise exception using
      errcode = '23514',
      message = 'A store-ready published privacy policy is required';
  end if;

  update private.notification_registration_control
  set registration_enabled = target_enabled,
      updated_at = statement_timestamp()
  where singleton = true;
end;
$$;

revoke all on function public.service_set_notification_registration_enabled(boolean)
from public, anon, authenticated, service_role;

-- Defense in depth for direct service-role writes: a subscription cannot be
-- enabled unless the installation is active and carries the current consent.
create function private.enforce_sensitive_interest_notification_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.worship_reminder or new.schedule_changes or new.setlist_updates then
    if not exists (
      select 1
      from private.app_installations as installation
      where installation.id = new.installation_id
        and installation.disabled_at is null
        and installation.sensitive_interest_consent_version =
          private.current_sensitive_interest_consent_version()
        and installation.sensitive_interest_consented_at is not null
        and installation.sensitive_interest_disclosure_sha256 =
          private.current_sensitive_interest_disclosure_sha256()
        and installation.sensitive_interest_consent_locale =
          private.current_sensitive_interest_consent_locale()
    ) then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest notification consent is required';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_sensitive_interest_notification_consent()
from public, anon, authenticated, service_role;

create trigger notification_subscriptions_require_sensitive_interest_consent
before insert or update on private.notification_subscriptions
for each row execute function private.enforce_sensitive_interest_notification_consent();

-- Remove the pre-consent overloads. An old Edge Function therefore fails
-- closed after this migration instead of silently registering without consent.
revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
);

revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_update_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
);

create function public.service_register_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_platform text,
  target_app_version text,
  target_app_variant text,
  target_sensitive_interest_consent_version text,
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
declare
  wants_notifications boolean :=
    target_worship_reminder is true
    or target_schedule_changes is true
    or target_setlist_updates is true;
begin
  if target_installation_id is null then
    raise exception using errcode = '22004', message = 'Installation ID is required';
  end if;

  if target_app_variant is null
    or target_app_variant not in ('development', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'Valid app variant is required';
  end if;

  if not wants_notifications
    or target_worship_reminder is null
    or target_schedule_changes is null
    or target_setlist_updates is null
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
  then
    raise exception using
      errcode = '23514',
      message = 'Current sensitive-interest notification consent is required';
  end if;

  insert into private.app_installations (
    id,
    secret_hash,
    platform,
    app_version,
    app_variant,
    sensitive_interest_consent_version,
    sensitive_interest_consented_at,
    sensitive_interest_disclosure_sha256,
    sensitive_interest_consent_locale
  )
  values (
    target_installation_id,
    target_secret_hash,
    target_platform,
    target_app_version,
    target_app_variant,
    target_sensitive_interest_consent_version,
    statement_timestamp(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale()
  );

  insert into private.sensitive_interest_consent_events (
    installation_id, event_type, consent_version, disclosure_sha256,
    consent_locale, app_version
  )
  values (
    target_installation_id,
    'granted',
    target_sensitive_interest_consent_version,
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    target_app_version
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
    target_installation_id,
    target_expo_push_token,
    target_token_hash,
    target_platform
  );

  return target_installation_id;
end;
$$;

create function public.service_update_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_app_version text,
  target_app_variant text,
  target_sensitive_interest_consent_version text,
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
  previous_consent_version text;
  previous_consented_at timestamptz;
  wants_notifications boolean :=
    target_worship_reminder is true
    or target_schedule_changes is true
    or target_setlist_updates is true;
begin
  if target_app_variant is null
    or target_app_variant not in ('development', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'Valid app variant is required';
  end if;

  if not wants_notifications
    or target_worship_reminder is null
    or target_schedule_changes is null
    or target_setlist_updates is null
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
  then
    raise exception using
      errcode = '23514',
      message = 'Current sensitive-interest notification consent is required';
  end if;

  if (target_expo_push_token is null) <> (target_token_hash is null) then
    raise exception using
      errcode = '22004',
      message = 'Push token and token hash must be supplied together';
  end if;

  select
    installation.platform,
    installation.sensitive_interest_consent_version,
    installation.sensitive_interest_consented_at
  into installation_platform, previous_consent_version, previous_consented_at
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and installation.app_variant = target_app_variant
    and (
      installation.disabled_at is null
      or installation.disable_reason in ('stale_inactivity', 'consent_required')
    )
  for update;

  if installation_platform is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  if target_expo_push_token is null
    and not exists (
      select 1
      from private.push_endpoints as endpoint
      where endpoint.installation_id = target_installation_id
        and endpoint.is_active = true
        and endpoint.expo_push_token is not null
        and endpoint.token_hash is not null
    )
  then
    raise exception using
      errcode = '23514',
      message = 'An active push token is required';
  end if;

  update private.app_installations
  set app_version = target_app_version,
      last_seen_at = statement_timestamp(),
      disabled_at = null,
      disable_reason = null,
      sensitive_interest_consent_version =
        target_sensitive_interest_consent_version,
      sensitive_interest_consented_at = case
        when sensitive_interest_consent_version is distinct from
          target_sensitive_interest_consent_version
          or sensitive_interest_consented_at is null
        then statement_timestamp()
        else sensitive_interest_consented_at
      end,
      sensitive_interest_disclosure_sha256 =
        private.current_sensitive_interest_disclosure_sha256(),
      sensitive_interest_consent_locale =
        private.current_sensitive_interest_consent_locale()
  where id = target_installation_id;

  if previous_consent_version is distinct from
      target_sensitive_interest_consent_version
    or previous_consented_at is null
  then
    insert into private.sensitive_interest_consent_events (
      installation_id, event_type, consent_version, disclosure_sha256,
      consent_locale, app_version
    )
    values (
      target_installation_id,
      'granted',
      target_sensitive_interest_consent_version,
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      target_app_version
    );
  end if;

  update private.notification_subscriptions
  set worship_reminder = target_worship_reminder,
      schedule_changes = target_schedule_changes,
      setlist_updates = target_setlist_updates
  where installation_id = target_installation_id;

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
declare
  withdrawn_consent_version text;
  withdrawn_disclosure_sha256 text;
  withdrawn_consent_locale text;
  installation_app_version text;
begin
  select
    installation.sensitive_interest_consent_version,
    installation.sensitive_interest_disclosure_sha256,
    installation.sensitive_interest_consent_locale,
    installation.app_version
  into withdrawn_consent_version, withdrawn_disclosure_sha256,
    withdrawn_consent_locale, installation_app_version
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and (
      installation.disabled_at is null
      or installation.disable_reason in ('consent_required', 'stale_inactivity')
    )
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.app_installations
  set disabled_at = coalesce(disabled_at, statement_timestamp()),
      disable_reason = 'user_unregistered',
      last_seen_at = statement_timestamp(),
      -- Break the link to the device-held proof immediately. The remaining
      -- disabled row supports in-flight referential integrity for at most the
      -- existing 30-day cleanup window, but can no longer authenticate or be
      -- connected to the prior device secret.
      secret_hash = pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
      test_pairing_secret_hash = null,
      sensitive_interest_consent_version = null,
      sensitive_interest_consented_at = null,
      sensitive_interest_disclosure_sha256 = null,
      sensitive_interest_consent_locale = null
  where id = target_installation_id;

  update private.notification_subscriptions
  set worship_reminder = false,
      schedule_changes = false,
      setlist_updates = false
  where installation_id = target_installation_id;

  -- Withdrawal scrubs provider credentials in the same transaction. The
  -- daily cleanup remains the <=24-hour fallback for invalid/disabled tokens.
  update private.push_endpoints
  set expo_push_token = null,
      token_hash = null,
      is_active = false,
      disabled_at = coalesce(disabled_at, statement_timestamp()),
      disable_reason = 'user_unregistered'
  where installation_id = target_installation_id;

  if withdrawn_consent_version is not null then
    insert into private.sensitive_interest_consent_events (
      installation_id, event_type, consent_version, disclosure_sha256,
      consent_locale, app_version
    )
    values (
      target_installation_id,
      'withdrawn',
      withdrawn_consent_version,
      withdrawn_disclosure_sha256,
      withdrawn_consent_locale,
      installation_app_version
    );
  end if;
end;
$$;

-- Client-facing v2 Data API. The mobile app never sends the installation
-- secret. Registration sends only H2=SHA256(SHA256(secret)); subsequent calls
-- send V=SHA256(secret) in a scoped request header and the database hashes it
-- once before comparing. Expo tokens are also carried in a custom header so
-- they are not part of PostgREST RPC JSON arguments. Production remains
-- blocked until an API/Postgres log canary proves these custom header values
-- are not retained by the selected Supabase logging configuration.
create function public.notification_register_v2(
  target_installation_id uuid,
  target_secret_store_hash text,
  target_pairing_store_hash text,
  target_platform text,
  target_app_version text,
  target_app_variant text,
  target_sensitive_interest_consent_version text,
  target_sensitive_interest_disclosure_sha256 text,
  target_sensitive_interest_consent_locale text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expo_token text;
  expo_token_hash text;
  response_code text;
begin
  if not coalesce(
    (
      select control.registration_enabled
      from private.notification_registration_control as control
      where control.singleton = true
    ),
    false
  )
    or not private.current_store_ready_privacy_policy_exists()
  then
    return pg_catalog.jsonb_build_object(
      'status', 'error',
      'code', 'REGISTRATION_DISABLED'
    );
  end if;

  perform private.enforce_notification_client_rate_limit(
    'notification_register', 10, interval '1 minute'
  );
  perform private.enforce_notification_client_rate_limit(
    'notification_register_daily',
    100,
    interval '1 day',
    500,
    interval '25 hours'
  );
  perform private.enforce_notification_subject_rate_limit(
    'notification_register_subject',
    coalesce(target_installation_id::text, 'missing'),
    5
  );

  -- Expected validation/authentication failures are converted to a small
  -- typed result inside a subtransaction. This commits the outer rate-limit
  -- increments instead of rolling them back with the failed operation.
  begin
    if target_secret_store_hash is null
        or target_secret_store_hash !~ '^[0-9a-f]{64}$'
      or target_pairing_store_hash is null
        or target_pairing_store_hash !~ '^[0-9a-f]{64}$'
    then
      raise exception using errcode = '22023', message = 'Valid credential verifiers are required';
    end if;

    if target_sensitive_interest_consent_version is distinct from
        private.current_sensitive_interest_consent_version()
      or target_sensitive_interest_disclosure_sha256 is distinct from
        private.current_sensitive_interest_disclosure_sha256()
      or target_sensitive_interest_consent_locale is distinct from
        private.current_sensitive_interest_consent_locale()
    then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest disclosure is required';
    end if;

    expo_token := private.notification_request_header(
      'x-jubilee-expo-push-token', 256
    );
    if expo_token is null
      or expo_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
    then
      raise exception using errcode = '22023', message = 'Valid Expo push token is required';
    end if;

    expo_token_hash := private.sha256_hex(expo_token);

  -- Registration is insert-only for an installation identifier. A retried
  -- request may return success only when every persisted value is identical;
  -- knowing the store hash must never permit takeover of an existing row.
    if exists (
      select 1
      from private.app_installations as installation
      where installation.id = target_installation_id
    ) then
      if exists (
        select 1
        from private.app_installations as installation
        join private.notification_subscriptions as subscription
          on subscription.installation_id = installation.id
        join private.push_endpoints as endpoint
          on endpoint.installation_id = installation.id
        where installation.id = target_installation_id
          and installation.secret_hash = target_secret_store_hash
          and installation.test_pairing_secret_hash = target_pairing_store_hash
          and installation.platform = target_platform
          and installation.app_version = target_app_version
          and installation.app_variant = target_app_variant
          and installation.disabled_at is null
          and installation.sensitive_interest_consent_version =
            target_sensitive_interest_consent_version
          and installation.sensitive_interest_consented_at is not null
          and installation.sensitive_interest_disclosure_sha256 =
            target_sensitive_interest_disclosure_sha256
          and installation.sensitive_interest_consent_locale =
            target_sensitive_interest_consent_locale
          and subscription.worship_reminder = target_worship_reminder
          and subscription.schedule_changes = target_schedule_changes
          and subscription.setlist_updates = target_setlist_updates
          and endpoint.is_active = true
          and endpoint.expo_push_token = expo_token
          and endpoint.token_hash = expo_token_hash
      ) then
        return pg_catalog.jsonb_build_object('status', 'ok');
      end if;

      raise exception using
        errcode = '23505',
        message = 'Installation ID is already registered';
    end if;

  -- A provider token is a delivery address, not an authentication proof.
  -- Never let a fresh installation take over an existing row merely by
  -- presenting the same token. The unique token hash below fails closed. A
  -- safe reinstall recovery needs an owner-approved attestation design before
  -- release; automatic token-based takeover would erase consent evidence.

    perform public.service_register_app_installation(
      target_installation_id,
      target_secret_store_hash,
      target_platform,
      target_app_version,
      target_app_variant,
      target_sensitive_interest_consent_version,
      expo_token,
      expo_token_hash,
      target_worship_reminder,
      target_schedule_changes,
      target_setlist_updates
    );

    update private.app_installations
    set test_pairing_secret_hash = target_pairing_store_hash
    where id = target_installation_id;

    return pg_catalog.jsonb_build_object('status', 'ok');
  exception
    when sqlstate '22004' or sqlstate '22023' or sqlstate '23505'
      or sqlstate '23514' or sqlstate '28000'
    then
      get stacked diagnostics response_code = returned_sqlstate;
      return pg_catalog.jsonb_build_object(
        'status', 'error',
        'code', response_code
      );
  end;
end;
$$;

create function public.notification_update_v2(
  target_installation_id uuid,
  target_pairing_store_hash text,
  target_app_version text,
  target_app_variant text,
  target_sensitive_interest_consent_version text,
  target_sensitive_interest_disclosure_sha256 text,
  target_sensitive_interest_consent_locale text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  installation_proof text;
  expo_token text;
  response_code text;
begin
  perform private.enforce_notification_client_rate_limit(
    'notification_update', 30, interval '1 minute'
  );
  perform private.enforce_notification_subject_rate_limit(
    'notification_update_subject',
    coalesce(target_installation_id::text, 'missing'),
    10
  );

  begin
    if target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
    or target_sensitive_interest_disclosure_sha256 is distinct from
      private.current_sensitive_interest_disclosure_sha256()
    or target_sensitive_interest_consent_locale is distinct from
      private.current_sensitive_interest_consent_locale()
    then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest disclosure is required';
    end if;

    installation_proof := private.notification_request_header(
      'x-jubilee-installation-proof', 64
    );
    if installation_proof is null or installation_proof !~ '^[0-9a-f]{64}$'
      or target_pairing_store_hash is null
        or target_pairing_store_hash !~ '^[0-9a-f]{64}$'
    then
      raise exception using errcode = '28000', message = 'Invalid installation credentials';
    end if;

    expo_token := private.notification_request_header(
      'x-jubilee-expo-push-token', 256
    );
    if expo_token is not null
      and expo_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
    then
      raise exception using errcode = '22023', message = 'Valid Expo push token is required';
    end if;

    perform public.service_update_app_installation(
    target_installation_id,
    private.sha256_hex(installation_proof),
    target_app_version,
    target_app_variant,
    target_sensitive_interest_consent_version,
    expo_token,
    case when expo_token is null then null else private.sha256_hex(expo_token) end,
    target_worship_reminder,
    target_schedule_changes,
    target_setlist_updates
    );

    update private.app_installations
    set test_pairing_secret_hash = target_pairing_store_hash
    where id = target_installation_id
      and secret_hash = private.sha256_hex(installation_proof);

    return pg_catalog.jsonb_build_object('status', 'ok');
  exception
    when sqlstate '22004' or sqlstate '22023' or sqlstate '23505'
      or sqlstate '23514' or sqlstate '28000'
    then
      get stacked diagnostics response_code = returned_sqlstate;
      return pg_catalog.jsonb_build_object(
        'status', 'error',
        'code', response_code
      );
  end;
end;
$$;

create function public.notification_unregister_v2(
  target_installation_id uuid,
  target_app_variant text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  installation_proof text;
  target_store_hash text;
  response_code text;
begin
  perform private.enforce_notification_client_rate_limit(
    'notification_unregister', 20, interval '1 minute'
  );
  perform private.enforce_notification_subject_rate_limit(
    'notification_unregister_subject',
    coalesce(target_installation_id::text, 'missing'),
    10
  );

  begin
    installation_proof := private.notification_request_header(
      'x-jubilee-installation-proof', 64
    );
    if installation_proof is null or installation_proof !~ '^[0-9a-f]{64}$'
      or target_app_variant is null
      or target_app_variant not in ('development', 'preview', 'production')
    then
      raise exception using errcode = '28000', message = 'Invalid installation credentials';
    end if;

    target_store_hash := private.sha256_hex(installation_proof);
    perform 1
    from private.app_installations as installation
    where installation.id = target_installation_id
      and installation.secret_hash = target_store_hash
      and installation.app_variant = target_app_variant;

    if not found then
      raise exception using errcode = '28000', message = 'Invalid installation credentials';
    end if;

    perform public.service_unregister_app_installation(
      target_installation_id,
      target_store_hash
    );

    return pg_catalog.jsonb_build_object('status', 'ok');
  exception
    when sqlstate '22004' or sqlstate '22023' or sqlstate '23505'
      or sqlstate '23514' or sqlstate '28000'
    then
      get stacked diagnostics response_code = returned_sqlstate;
      return pg_catalog.jsonb_build_object(
        'status', 'error',
        'code', response_code
      );
  end;
end;
$$;

-- Test pairing receives only a domain-separated capability. Even if its Edge
-- invocation log were exposed, it cannot update or unregister notifications.
create function public.service_create_test_push_pairing_v2(
  target_installation_id uuid,
  target_pairing_proof text,
  target_app_variant text,
  target_code_digest text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_master_store_hash text;
begin
  if target_pairing_proof is null
    or target_pairing_proof !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  select installation.secret_hash
  into target_master_store_hash
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.test_pairing_secret_hash = private.sha256_hex(target_pairing_proof)
    and installation.app_variant = target_app_variant
    and installation.disabled_at is null
    and installation.sensitive_interest_consent_version =
      private.current_sensitive_interest_consent_version()
    and installation.sensitive_interest_disclosure_sha256 =
      private.current_sensitive_interest_disclosure_sha256()
    and installation.sensitive_interest_consent_locale =
      private.current_sensitive_interest_consent_locale()
  for update;

  if target_master_store_hash is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  return public.service_create_test_push_pairing(
    target_installation_id,
    target_master_store_hash,
    target_app_variant,
    target_code_digest
  );
end;
$$;

-- Recheck the current consent and target immediately before the Edge worker
-- calls Expo. This cannot recall a message already handed to Expo, but it
-- closes the longer claim-to-send window and permanently fails any queued
-- delivery whose consent or target became invalid. Worship reminders carry
-- the event start as an absolute provider expiration so even a late claim can
-- never be delivered after the worship service begins.
create function public.service_revalidate_notification_deliveries(
  target_delivery_ids bigint[]
)
returns table (
  delivery_id bigint,
  expo_push_token text,
  title text,
  body text,
  deep_link text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_delivery_ids is null
    or cardinality(target_delivery_ids) not between 1 and 100
    or exists (
      select 1 from unnest(target_delivery_ids) as source(id) where id is null
    )
  then
    raise exception using
      errcode = '22023',
      message = 'One to one hundred delivery IDs are required';
  end if;

  update private.notification_deliveries as delivery
  set status = 'failed',
      error_code = 'ConsentOrTargetRevoked',
      failed_at = statement_timestamp()
  where delivery.id = any (target_delivery_ids)
    and delivery.status = 'queued'
    and not exists (
      select 1
      from private.push_endpoints as endpoint
      join private.app_installations as installation
        on installation.id = endpoint.installation_id
      join private.notification_subscriptions as subscription
        on subscription.installation_id = installation.id
      join private.notification_campaigns as campaign
        on campaign.id = delivery.campaign_id
      where endpoint.id = delivery.push_endpoint_id
        and endpoint.is_active = true
        and endpoint.disabled_at is null
        and endpoint.expo_push_token is not null
        and endpoint.token_hash is not null
        and installation.disabled_at is null
        and installation.sensitive_interest_consent_version =
          private.current_sensitive_interest_consent_version()
        and installation.sensitive_interest_consented_at is not null
        and installation.sensitive_interest_disclosure_sha256 =
          private.current_sensitive_interest_disclosure_sha256()
        and installation.sensitive_interest_consent_locale =
          private.current_sensitive_interest_consent_locale()
        and (
          (
            campaign.audience_kind = 'test_endpoint'
            and campaign.kind = 'test'
            and endpoint.id = campaign.test_push_endpoint_id
            and installation.app_variant in ('development', 'preview')
            and exists (
              select 1
              from private.owner_test_push_targets as approved_target
              where approved_target.push_endpoint_id = endpoint.id
                and approved_target.revoked_at is null
                and approved_target.app_variant_snapshot = installation.app_variant
            )
          )
          or (
            installation.app_variant = 'production'
            and (
              (campaign.audience_kind = 'worship_reminder'
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
          )
        )
        and (
          campaign.kind <> 'worship_reminder'
          or exists (
            select 1
            from private.worship_reminder_schedules as schedule
            join public.events as event on event.id = schedule.event_id
            where schedule.campaign_id = campaign.id
              and schedule.is_current = true
              and event.published = true
              and event.status in ('scheduled', 'postponed')
              and event.starts_at = schedule.event_starts_at_snapshot
              and statement_timestamp() < event.starts_at
          )
        )
    );

  return query
  select
    delivery.id,
    endpoint.expo_push_token,
    campaign.title,
    campaign.body,
    campaign.deep_link,
    case
      when campaign.kind = 'worship_reminder'
      then schedule.event_starts_at_snapshot
      else null
    end
  from private.notification_deliveries as delivery
  join private.notification_campaigns as campaign
    on campaign.id = delivery.campaign_id
  join private.push_endpoints as endpoint
    on endpoint.id = delivery.push_endpoint_id
  join private.app_installations as installation
    on installation.id = endpoint.installation_id
  join private.notification_subscriptions as subscription
    on subscription.installation_id = installation.id
  left join private.worship_reminder_schedules as schedule
    on schedule.campaign_id = campaign.id
   and schedule.is_current = true
  where delivery.id = any (target_delivery_ids)
    and delivery.status = 'queued'
    and endpoint.is_active = true
    and endpoint.disabled_at is null
    and endpoint.expo_push_token is not null
    and endpoint.token_hash is not null
    and installation.disabled_at is null
    and installation.sensitive_interest_consent_version =
      private.current_sensitive_interest_consent_version()
    and installation.sensitive_interest_consented_at is not null
    and installation.sensitive_interest_disclosure_sha256 =
      private.current_sensitive_interest_disclosure_sha256()
    and installation.sensitive_interest_consent_locale =
      private.current_sensitive_interest_consent_locale()
    and (
      (
        campaign.audience_kind = 'test_endpoint'
        and campaign.kind = 'test'
        and endpoint.id = campaign.test_push_endpoint_id
        and installation.app_variant in ('development', 'preview')
        and exists (
          select 1
          from private.owner_test_push_targets as approved_target
          where approved_target.push_endpoint_id = endpoint.id
            and approved_target.revoked_at is null
            and approved_target.app_variant_snapshot = installation.app_variant
        )
      )
      or (
        installation.app_variant = 'production'
        and (
          (campaign.audience_kind = 'worship_reminder'
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
      )
    )
    and (
      campaign.kind <> 'worship_reminder'
      or (
        schedule.event_starts_at_snapshot is not null
        and statement_timestamp() < schedule.event_starts_at_snapshot
        and exists (
          select 1
          from public.events as event
          where event.id = schedule.event_id
            and event.published = true
            and event.status in ('scheduled', 'postponed')
            and event.starts_at = schedule.event_starts_at_snapshot
        )
      )
    )
  order by delivery.id;
end;
$$;

revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.service_unregister_app_installation(uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.service_create_test_push_pairing(uuid, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.service_create_test_push_pairing_v2(uuid, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.service_revalidate_notification_deliveries(bigint[])
from public, anon, authenticated, service_role;
revoke all on function public.notification_register_v2(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.notification_update_v2(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.notification_unregister_v2(uuid, text)
from public, anon, authenticated, service_role;

grant execute on function
  public.service_register_app_installation(
    uuid, text, text, text, text, text, text, text, boolean, boolean, boolean
  ),
  public.service_update_app_installation(
    uuid, text, text, text, text, text, text, boolean, boolean, boolean
  )
to service_role;

-- Old register/update/unregister Edge functions must not remain usable during
-- the v2 cutover. Their handlers also return HTTP 410 in this code revision.
revoke execute on function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean
) from service_role;
revoke execute on function public.service_update_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from service_role;

grant execute on function
  public.notification_register_v2(
    uuid, text, text, text, text, text, text, text, text,
    boolean, boolean, boolean
  ),
  public.notification_update_v2(
    uuid, text, text, text, text, text, text, boolean, boolean, boolean
  ),
  public.notification_unregister_v2(uuid, text)
to anon;

grant execute on function public.service_create_test_push_pairing_v2(
  uuid, text, text, text
) to service_role;
grant execute on function public.service_revalidate_notification_deliveries(bigint[])
to service_role;
grant execute on function public.service_set_notification_registration_enabled(boolean)
to service_role;

select cron.schedule(
  'jubilee-test-push-pairing-cleanup',
  '*/5 * * * *',
  $$select public.service_cleanup_test_push_pairings(statement_timestamp());
    delete from private.notification_client_rate_limits
    where expires_at <= statement_timestamp()$$
);

-- Keep the owner-only direct publish gate aligned with the app disclosure.
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
    and position('별도 동의' in target_body) > 0
    and position('동의 버전' in target_body) > 0
    and position('동의 시각' in target_body) > 0
    and position('SUPABASE PTE. LTD.' in target_body) > 0
    and position('650 Industries, Inc.' in target_body) > 0
    and position('Apple·Google 처리' in target_body) > 0
    and position('대한민국 서울(ap-northeast-2)' in target_body) > 0
    and position('미국' in target_body) > 0
    and position('Supabase Data API' in target_body) > 0
    and position('분산 요청 제한' in target_body) > 0
    and position('하루 100회' in target_body) > 0
    and position('하루 500회' in target_body) > 0
    and position('25시간 5분' in target_body) > 0
    and position('재사용할 수 없도록' in target_body) > 0
    and position('지원 문의 보유·삭제 기준:' in target_body) > 0
    and position('Google Workspace' in target_body) > 0
    and position('만 14세' in target_body) > 0
    and private.legal_document_has_confirmed_value(
      target_body, '개인정보 처리자의 법적 성명 또는 명칭:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '개인정보 보호책임자 또는 고충처리 담당부서:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '전화번호 등 연락처:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '국외 처리 법적 근거(법률 검토 후 확정):'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 보유·삭제 기준:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 제공자의 법적 역할·처리 근거:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 국외 처리 국가:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '알림의 만 14세 이상 제한 또는 법정대리인 동의 절차:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '실제 시행일:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '오너 최종 사실확인:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '법률 전문가 검토 상태:'
    )
    and position(
      '광고·추적·이용자 프로파일링에 사용하지 않습니다'
      in target_body
    ) > 0;
$$;

revoke all on function
  private.legal_document_has_sensitive_notification_disclosure(text)
from public, anon, authenticated, service_role;

comment on column private.app_installations.sensitive_interest_consent_version is
  'Version of the separate in-app disclosure affirmatively accepted before notification registration.';
comment on column private.app_installations.sensitive_interest_consented_at is
  'Server-generated timestamp of the current separate notification consent.';
comment on table private.sensitive_interest_consent_events is
  'Server-timestamped grant/withdrawal audit events; never stores installation secrets or push tokens.';

commit;
