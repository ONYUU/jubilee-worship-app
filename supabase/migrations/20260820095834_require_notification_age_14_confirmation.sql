-- Limit the sensitive-interest notification feature to people who explicitly
-- affirm that they are at least 14 years old. The app does not collect a date
-- of birth. Existing v1 notification consent is invalidated fail-closed.

begin;

-- Re-lock an environment that may have enabled v1 registration. Operations
-- must explicitly reopen registration only after the v2 canary and current
-- store-ready privacy-policy checks pass.
update private.notification_registration_control
set registration_enabled = false,
    updated_at = statement_timestamp()
where singleton = true;

alter table private.app_installations
  add column sensitive_interest_age_14_or_over_confirmed_at timestamptz;

alter table private.sensitive_interest_consent_events
  add column age_14_or_over_confirmed boolean not null default false;

alter table private.app_installations
  drop constraint app_installations_sensitive_interest_consent_valid;

-- A new disclosure and an explicit 14+ action are required. Preserve the
-- append-only v1 audit events, but make every current v1 registration
-- non-sendable and scrub its provider delivery address.
update private.notification_subscriptions
set worship_reminder = false,
    schedule_changes = false,
    setlist_updates = false
where worship_reminder or schedule_changes or setlist_updates;

update private.push_endpoints
set expo_push_token = null,
    token_hash = null,
    is_active = false,
    disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = 'consent_required'
where is_active
   or expo_push_token is not null
   or token_hash is not null;

update private.app_installations
set disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = 'consent_required',
    sensitive_interest_consent_version = null,
    sensitive_interest_consented_at = null,
    sensitive_interest_disclosure_sha256 = null,
    sensitive_interest_consent_locale = null,
    sensitive_interest_age_14_or_over_confirmed_at = null
where sensitive_interest_consent_version is not null
   or sensitive_interest_consented_at is not null
   or sensitive_interest_disclosure_sha256 is not null
   or sensitive_interest_consent_locale is not null;

alter table private.app_installations
  add constraint app_installations_sensitive_interest_consent_valid check (
    (
      sensitive_interest_consent_version is null
      and sensitive_interest_consented_at is null
      and sensitive_interest_disclosure_sha256 is null
      and sensitive_interest_consent_locale is null
      and sensitive_interest_age_14_or_over_confirmed_at is null
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
      and sensitive_interest_age_14_or_over_confirmed_at is not null
    )
  );

create or replace function private.current_sensitive_interest_consent_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'sensitive-interest-notifications-v2'::text;
$$;

create or replace function private.current_sensitive_interest_disclosure_sha256()
returns text
language sql
immutable
set search_path = ''
as $$
  select '654bf061da34ee1b70092013e093af4952af0488f5d75d227d74b25fb578d37c'::text;
$$;

-- Keep the direct DB publication gate aligned with the web validator. Generic
-- process-only placeholders remain invalid, while factual long-form values may
-- contain ordinary words such as "확인" or "검토".
create or replace function private.legal_document_has_confirmed_value(
  target_body text,
  target_label text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  with normalized_lines as (
    select regexp_replace(
      btrim(source.line),
      '^[-*][[:space:]]+',
      ''
    ) as line
    from regexp_split_to_table(target_body, E'\\r?\\n') as source(line)
  ),
  matching_values as (
    select btrim(substr(line, char_length(target_label) + 1)) as value
    from normalized_lines
    where left(line, char_length(target_label)) = target_label
  )
  select count(*) = 1
    and bool_and(
      char_length(value) >= 2
      and value ~ '[A-Za-z0-9가-힣]'
      and lower(value) not in ('n/a', 'na', '해당 없음')
      and value !~* (
        '(\\[\\[|\\]\\]|미정|추후|'
        || '(확인|검토|확정|입력|기입|작성)[[:space:]]*'
        || '(필요|예정|중|대기))'
      )
      and value !~* (
        '^[[:space:]]*((내용|최종)[[:space:]]*)*'
        || '((확인|검토|확정|완료|입력|기입|작성)'
        || '(됨|함)?[[:space:]]*)+[:.!]?[[:space:]]*$'
      )
    )
  from matching_values;
$$;

revoke all on function private.legal_document_has_confirmed_value(text, text)
from public, anon, authenticated, service_role;

create or replace function private.enforce_sensitive_interest_notification_consent()
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
        and installation.sensitive_interest_age_14_or_over_confirmed_at is not null
    ) then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest notification consent and 14+ confirmation are required';
    end if;
  end if;

  return new;
end;
$$;

-- Remove every callable overload that can register or update without an
-- explicit 14+ affirmation. These core functions remain owner-internal; the
-- only client entry points are the typed Data API wrappers below.
revoke all on function public.notification_register_v2(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.notification_register_v2(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean
);

revoke all on function public.notification_update_v2(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.notification_update_v2(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
);

revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean
);

revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_update_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
);

create function public.service_register_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_platform text,
  target_app_version text,
  target_app_variant text,
  target_sensitive_interest_consent_version text,
  target_age_14_or_over_confirmed boolean,
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
    or target_age_14_or_over_confirmed is not true
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
  then
    raise exception using
      errcode = '23514',
      message = 'Current sensitive-interest notification consent and 14+ confirmation are required';
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
    sensitive_interest_consent_locale,
    sensitive_interest_age_14_or_over_confirmed_at
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
    private.current_sensitive_interest_consent_locale(),
    statement_timestamp()
  );

  insert into private.sensitive_interest_consent_events (
    installation_id, event_type, consent_version, disclosure_sha256,
    consent_locale, age_14_or_over_confirmed, app_version
  )
  values (
    target_installation_id,
    'granted',
    target_sensitive_interest_consent_version,
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
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
  target_age_14_or_over_confirmed boolean,
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
  previous_age_confirmed_at timestamptz;
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
    or target_age_14_or_over_confirmed is not true
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
  then
    raise exception using
      errcode = '23514',
      message = 'Current sensitive-interest notification consent and 14+ confirmation are required';
  end if;

  if (target_expo_push_token is null) <> (target_token_hash is null) then
    raise exception using
      errcode = '22004',
      message = 'Push token and token hash must be supplied together';
  end if;

  select
    installation.platform,
    installation.sensitive_interest_consent_version,
    installation.sensitive_interest_consented_at,
    installation.sensitive_interest_age_14_or_over_confirmed_at
  into installation_platform, previous_consent_version, previous_consented_at,
    previous_age_confirmed_at
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
        private.current_sensitive_interest_consent_locale(),
      sensitive_interest_age_14_or_over_confirmed_at = case
        when sensitive_interest_consent_version is distinct from
          target_sensitive_interest_consent_version
          or sensitive_interest_age_14_or_over_confirmed_at is null
        then statement_timestamp()
        else sensitive_interest_age_14_or_over_confirmed_at
      end
  where id = target_installation_id;

  if previous_consent_version is distinct from
      target_sensitive_interest_consent_version
    or previous_consented_at is null
    or previous_age_confirmed_at is null
  then
    insert into private.sensitive_interest_consent_events (
      installation_id, event_type, consent_version, disclosure_sha256,
      consent_locale, age_14_or_over_confirmed, app_version
    )
    values (
      target_installation_id,
      'granted',
      target_sensitive_interest_consent_version,
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
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
  withdrawn_age_confirmed_at timestamptz;
  installation_app_version text;
begin
  select
    installation.sensitive_interest_consent_version,
    installation.sensitive_interest_disclosure_sha256,
    installation.sensitive_interest_consent_locale,
    installation.sensitive_interest_age_14_or_over_confirmed_at,
    installation.app_version
  into withdrawn_consent_version, withdrawn_disclosure_sha256,
    withdrawn_consent_locale, withdrawn_age_confirmed_at,
    installation_app_version
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
      secret_hash = pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
      test_pairing_secret_hash = null,
      sensitive_interest_consent_version = null,
      sensitive_interest_consented_at = null,
      sensitive_interest_disclosure_sha256 = null,
      sensitive_interest_consent_locale = null,
      sensitive_interest_age_14_or_over_confirmed_at = null
  where id = target_installation_id;

  update private.notification_subscriptions
  set worship_reminder = false,
      schedule_changes = false,
      setlist_updates = false
  where installation_id = target_installation_id;

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
      consent_locale, age_14_or_over_confirmed, app_version
    )
    values (
      target_installation_id,
      'withdrawn',
      withdrawn_consent_version,
      withdrawn_disclosure_sha256,
      withdrawn_consent_locale,
      withdrawn_age_confirmed_at is not null,
      installation_app_version
    );
  end if;
end;
$$;

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
  target_age_14_or_over_confirmed boolean,
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
      or target_age_14_or_over_confirmed is not true
    then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest disclosure and 14+ confirmation are required';
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
          and installation.sensitive_interest_age_14_or_over_confirmed_at is not null
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

    perform public.service_register_app_installation(
      target_installation_id,
      target_secret_store_hash,
      target_platform,
      target_app_version,
      target_app_variant,
      target_sensitive_interest_consent_version,
      target_age_14_or_over_confirmed,
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
  target_age_14_or_over_confirmed boolean,
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
  -- Updating an existing installation can reactivate its endpoint and change
  -- subscriptions, so it must obey the same operational and legal gate as a
  -- new registration. Withdrawal remains available through the separate
  -- unregister RPC even while this gate is closed.
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
    or target_age_14_or_over_confirmed is not true
    then
      raise exception using
        errcode = '23514',
        message = 'Current sensitive-interest disclosure and 14+ confirmation are required';
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
      target_age_14_or_over_confirmed,
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

revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, boolean, text, text,
  boolean, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, boolean, text, text,
  boolean, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.notification_register_v2(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.notification_update_v2(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.notification_register_v2(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) to anon;
grant execute on function public.notification_update_v2(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) to anon;

comment on column private.app_installations.sensitive_interest_age_14_or_over_confirmed_at is
  'Server-generated timestamp created only after the client explicitly affirms age 14+ for notifications; no birth date is collected.';
comment on column private.sensitive_interest_consent_events.age_14_or_over_confirmed is
  'Whether the notification consent action included the explicit 14+ affirmation.';

commit;
