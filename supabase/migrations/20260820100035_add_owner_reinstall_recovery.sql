-- Owner-approved, one-time recovery for a non-production reinstall whose
-- Expo delivery address is still linked to an older installation. Generated
-- with `supabase migration new add_owner_reinstall_recovery`.
--
-- A provider token is never an ownership proof. The new device supplies only
-- a digest of a 128-bit one-time capability, and an authenticated active owner
-- must compare the exact masked old/new target before authorizing a short
-- finalize window. The device then performs one atomic relink with its current
-- consent/preferences while the old provider token stays uniquely reserved. Raw
-- Expo tokens, installation proofs, and recovery codes are never returned to
-- the admin browser or persisted in this challenge table.

begin;

alter table private.app_installations
  drop constraint app_installations_disabled_state_valid;

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
        'consent_required',
        'owner_reinstall_recovery'
      )
    )
  );

create table private.notification_reinstall_recovery_challenges (
  id uuid primary key default gen_random_uuid(),
  source_installation_id uuid not null,
  source_push_endpoint_id uuid not null,
  source_token_hash text
    check (source_token_hash is null or source_token_hash ~ '^[0-9a-f]{64}$'),
  source_platform_snapshot text not null check (source_platform_snapshot in ('ios', 'android')),
  source_app_version_snapshot text not null check (
    source_app_version_snapshot = pg_catalog.btrim(source_app_version_snapshot)
    and source_app_version_snapshot <> ''
    and pg_catalog.char_length(source_app_version_snapshot) <= 64
  ),
  source_app_variant_snapshot text not null
    check (source_app_variant_snapshot in ('development', 'preview')),
  target_installation_id uuid not null,
  target_secret_store_hash text
    check (target_secret_store_hash is null or target_secret_store_hash ~ '^[0-9a-f]{64}$'),
  target_pairing_store_hash text
    check (target_pairing_store_hash is null or target_pairing_store_hash ~ '^[0-9a-f]{64}$'),
  -- A domain-separated double hash binds a later unlink request to both the
  -- device proof and the exact source token without retaining either value or
  -- an installation verifier that can be replayed. It is unlink-only metadata
  -- and is deleted with the terminal audit after 30 days.
  unlink_binding_digest text not null
    check (unlink_binding_digest ~ '^[0-9a-f]{64}$'),
  target_platform_snapshot text not null check (target_platform_snapshot in ('ios', 'android')),
  target_app_version_snapshot text not null check (
    target_app_version_snapshot = pg_catalog.btrim(target_app_version_snapshot)
    and target_app_version_snapshot <> ''
    and pg_catalog.char_length(target_app_version_snapshot) <= 64
  ),
  target_app_variant_snapshot text not null
    check (target_app_variant_snapshot in ('development', 'preview')),
  target_consent_version text,
  target_disclosure_sha256 text
    check (target_disclosure_sha256 is null or target_disclosure_sha256 ~ '^[0-9a-f]{64}$'),
  target_consent_locale text
    check (target_consent_locale is null or target_consent_locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  target_age_14_or_over_confirmed boolean,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean,
  recovery_code_digest text
    check (recovery_code_digest is null or recovery_code_digest ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending'
    check (status in (
      'pending', 'authorized', 'approved', 'withdrawn', 'rejected',
      'superseded', 'expired'
    )),
  failed_approval_attempts integer not null default 0
    check (failed_approval_attempts between 0 and 5),
  expires_at timestamptz not null,
  decided_at timestamptz,
  -- Authenticated owner UUID snapshot. Deliberately not an FK: deleting an
  -- auth account must not violate terminal-state checks or erase the actor
  -- from the bounded 30-day audit record.
  decided_by uuid,
  created_at timestamptz not null default statement_timestamp(),
  constraint notification_reinstall_recovery_distinct_installations check (
    source_installation_id <> target_installation_id
  ),
  constraint notification_reinstall_recovery_expiry_valid check (
    expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint notification_reinstall_recovery_state_valid check (
    (
      status = 'pending'
      and source_token_hash is not null
      and target_secret_store_hash is not null
      and target_pairing_store_hash is not null
      and target_consent_version is not null
      and target_disclosure_sha256 is not null
      and target_consent_locale is not null
      and target_age_14_or_over_confirmed is true
      and target_worship_reminder is not null
      and target_schedule_changes is not null
      and target_setlist_updates is not null
      and recovery_code_digest is not null
      and decided_at is null
      and decided_by is null
    )
    or
    (
      status = 'authorized'
      and source_token_hash is not null
      and target_secret_store_hash is not null
      and target_pairing_store_hash is not null
      and target_consent_version is null
      and target_disclosure_sha256 is null
      and target_consent_locale is null
      and target_age_14_or_over_confirmed is null
      and target_worship_reminder is null
      and target_schedule_changes is null
      and target_setlist_updates is null
      and recovery_code_digest is null
      and decided_at is not null
      and decided_by is not null
    )
    or
    (
      status in ('approved', 'rejected')
      and source_token_hash is null
      and target_secret_store_hash is null
      and target_pairing_store_hash is null
      and target_consent_version is null
      and target_disclosure_sha256 is null
      and target_consent_locale is null
      and target_age_14_or_over_confirmed is null
      and target_worship_reminder is null
      and target_schedule_changes is null
      and target_setlist_updates is null
      and recovery_code_digest is null
      and decided_at is not null
      and decided_by is not null
    )
    or
    (
      status in ('withdrawn', 'superseded', 'expired')
      and source_token_hash is null
      and target_secret_store_hash is null
      and target_pairing_store_hash is null
      and target_consent_version is null
      and target_disclosure_sha256 is null
      and target_consent_locale is null
      and target_age_14_or_over_confirmed is null
      and target_worship_reminder is null
      and target_schedule_changes is null
      and target_setlist_updates is null
      and recovery_code_digest is null
      and decided_at is not null
      and decided_by is null
    )
  )
);

create unique index notification_reinstall_recovery_source_pending_idx
on private.notification_reinstall_recovery_challenges (source_push_endpoint_id)
where status in ('pending', 'authorized');

create unique index notification_reinstall_recovery_target_pending_idx
on private.notification_reinstall_recovery_challenges (target_installation_id)
where status in ('pending', 'authorized');

create unique index notification_reinstall_recovery_digest_pending_idx
on private.notification_reinstall_recovery_challenges (recovery_code_digest)
where status = 'pending';

create index notification_reinstall_recovery_cleanup_idx
on private.notification_reinstall_recovery_challenges (decided_at, id)
where status not in ('pending', 'authorized');

alter table private.notification_reinstall_recovery_challenges enable row level security;

revoke all on table private.notification_reinstall_recovery_challenges
from public, anon, authenticated, service_role;

create function private.finish_notification_reinstall_recovery(
  target_challenge_id uuid,
  target_status text,
  target_actor uuid default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if target_status not in (
    'approved', 'withdrawn', 'rejected', 'superseded', 'expired'
  )
    or ((target_status in ('approved', 'rejected')) <>
      (target_actor is not null))
  then
    raise exception using errcode = '22023', message = 'Valid terminal recovery state is required';
  end if;

  update private.notification_reinstall_recovery_challenges as challenge
  set status = target_status,
      source_token_hash = null,
      target_secret_store_hash = null,
      target_pairing_store_hash = null,
      target_consent_version = null,
      target_disclosure_sha256 = null,
      target_consent_locale = null,
      target_age_14_or_over_confirmed = null,
      target_worship_reminder = null,
      target_schedule_changes = null,
      target_setlist_updates = null,
      recovery_code_digest = null,
      decided_at = statement_timestamp(),
      decided_by = target_actor
  where id = target_challenge_id
    and status in ('pending', 'authorized');

  return found;
end;
$$;

revoke all on function private.finish_notification_reinstall_recovery(uuid, text, uuid)
from public, anon, authenticated, service_role;

create function public.notification_request_reinstall_recovery_v1(
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
  target_setlist_updates boolean,
  target_recovery_code_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_now timestamptz := statement_timestamp();
  challenge_expires_at timestamptz := request_now + interval '10 minutes';
  expo_token text;
  expo_token_hash text;
  source_endpoint_id uuid;
  source_installation_id uuid;
  source_platform text;
  source_app_version text;
  source_app_variant text;
  existing_challenge_id uuid;
  existing_expires_at timestamptz;
  computed_unlink_binding_digest text;
  wants_notifications boolean :=
    target_worship_reminder is true
    or target_schedule_changes is true
    or target_setlist_updates is true;
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
    'notification_recovery', 5, interval '1 minute', 100, interval '5 minutes'
  );
  perform private.enforce_notification_client_rate_limit(
    'notification_recovery_daily', 20, interval '1 day', 100, interval '25 hours'
  );

  if target_installation_id is null
    or target_secret_store_hash is null
    or target_secret_store_hash !~ '^[0-9a-f]{64}$'
    or target_pairing_store_hash is null
    or target_pairing_store_hash !~ '^[0-9a-f]{64}$'
    or target_recovery_code_digest is null
    or target_recovery_code_digest !~ '^[0-9a-f]{64}$'
    or target_platform not in ('ios', 'android')
    or target_app_variant not in ('development', 'preview')
    or target_app_version is null
    or target_app_version <> pg_catalog.btrim(target_app_version)
    or target_app_version = ''
    or pg_catalog.char_length(target_app_version) > 64
    or target_age_14_or_over_confirmed is distinct from true
    or target_worship_reminder is null
    or target_schedule_changes is null
    or target_setlist_updates is null
    or not wants_notifications
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
    or target_sensitive_interest_disclosure_sha256 is distinct from
      private.current_sensitive_interest_disclosure_sha256()
    or target_sensitive_interest_consent_locale is distinct from
      private.current_sensitive_interest_consent_locale()
  then
    return pg_catalog.jsonb_build_object('status', 'error', 'code', 'INVALID_REQUEST');
  end if;

  expo_token := private.notification_request_header(
    'x-jubilee-expo-push-token', 256
  );
  if expo_token is null
    or expo_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
  then
    return pg_catalog.jsonb_build_object('status', 'error', 'code', 'INVALID_REQUEST');
  end if;
  expo_token_hash := private.sha256_hex(expo_token);
  computed_unlink_binding_digest := private.sha256_hex(
    'jubilee:reinstall-recovery-unlink:v1' || pg_catalog.chr(10)
    || target_secret_store_hash || pg_catalog.chr(10)
    || expo_token_hash
  );

  perform private.enforce_notification_subject_rate_limit(
    'notification_recovery_subject', expo_token_hash, 3
  );

  -- Serialize request replacement with approval/rejection. The separate main
  -- notification advisory gate is taken only by approval, where delivery and
  -- endpoint state actually change.
  perform pg_catalog.pg_advisory_xact_lock(731904, 2);

  select endpoint.id, endpoint.installation_id
  into source_endpoint_id, source_installation_id
  from private.push_endpoints as endpoint
  where endpoint.token_hash = expo_token_hash
    and endpoint.expo_push_token = expo_token;

  if source_endpoint_id is null
    or source_installation_id is null
    or source_installation_id = target_installation_id
  then
    return pg_catalog.jsonb_build_object(
      'status', 'error',
      'code', 'RECOVERY_NOT_AVAILABLE'
    );
  end if;

  perform 1
  from private.app_installations as installation
  where installation.id = source_installation_id
  for update;

  perform 1
  from private.push_endpoints as endpoint
  where endpoint.id = source_endpoint_id
    and endpoint.installation_id = source_installation_id
  for update;

  select
    installation.platform,
    installation.app_version,
    installation.app_variant
  into source_platform, source_app_version, source_app_variant
  from private.app_installations as installation
  join private.push_endpoints as endpoint
    on endpoint.installation_id = installation.id
  where installation.id = source_installation_id
    and endpoint.id = source_endpoint_id
    and endpoint.token_hash = expo_token_hash
    and endpoint.expo_push_token = expo_token
    and endpoint.platform = target_platform
    and endpoint.is_active = true
    and endpoint.disabled_at is null
    and installation.platform = target_platform
    and installation.app_variant = target_app_variant
    and installation.app_variant in ('development', 'preview')
    and installation.disabled_at is null
    and installation.sensitive_interest_consent_version =
      private.current_sensitive_interest_consent_version()
    and installation.sensitive_interest_consented_at is not null
    and installation.sensitive_interest_disclosure_sha256 =
      private.current_sensitive_interest_disclosure_sha256()
    and installation.sensitive_interest_consent_locale =
      private.current_sensitive_interest_consent_locale()
    and installation.sensitive_interest_age_14_or_over_confirmed_at is not null;

  if source_platform is null
    or exists (
      select 1
      from private.app_installations as installation
      where installation.id = target_installation_id
    )
  then
    return pg_catalog.jsonb_build_object(
      'status', 'error',
      'code', 'RECOVERY_NOT_AVAILABLE'
    );
  end if;

  -- Expire old challenges first so partial unique indexes can admit a new one.
  update private.notification_reinstall_recovery_challenges as challenge
  set status = 'expired',
      source_token_hash = null,
      target_secret_store_hash = null,
      target_pairing_store_hash = null,
      target_consent_version = null,
      target_disclosure_sha256 = null,
      target_consent_locale = null,
      target_age_14_or_over_confirmed = null,
      target_worship_reminder = null,
      target_schedule_changes = null,
      target_setlist_updates = null,
      recovery_code_digest = null,
      decided_at = request_now,
      decided_by = null
  where challenge.status in ('pending', 'authorized')
    and challenge.expires_at <= request_now
    and (
      challenge.source_push_endpoint_id = source_endpoint_id
      or challenge.target_installation_id = notification_request_reinstall_recovery_v1.target_installation_id
    );

  select challenge.id, challenge.expires_at
  into existing_challenge_id, existing_expires_at
  from private.notification_reinstall_recovery_challenges as challenge
  where challenge.status = 'pending'
    and challenge.source_push_endpoint_id = source_endpoint_id
    and challenge.target_installation_id = notification_request_reinstall_recovery_v1.target_installation_id
    and challenge.source_token_hash = expo_token_hash
    and challenge.target_secret_store_hash = notification_request_reinstall_recovery_v1.target_secret_store_hash
    and challenge.target_pairing_store_hash = notification_request_reinstall_recovery_v1.target_pairing_store_hash
    and challenge.target_platform_snapshot = target_platform
    and challenge.target_app_version_snapshot = target_app_version
    and challenge.target_app_variant_snapshot = target_app_variant
    and challenge.target_consent_version = target_sensitive_interest_consent_version
    and challenge.target_disclosure_sha256 = target_sensitive_interest_disclosure_sha256
    and challenge.target_consent_locale = target_sensitive_interest_consent_locale
    and challenge.target_age_14_or_over_confirmed is true
    and challenge.target_worship_reminder =
      notification_request_reinstall_recovery_v1.target_worship_reminder
    and challenge.target_schedule_changes =
      notification_request_reinstall_recovery_v1.target_schedule_changes
    and challenge.target_setlist_updates =
      notification_request_reinstall_recovery_v1.target_setlist_updates
    and challenge.recovery_code_digest = target_recovery_code_digest
    and challenge.expires_at > request_now;

  if existing_challenge_id is not null then
    return pg_catalog.jsonb_build_object(
      'status', 'pending_owner_approval',
      'expires_at', existing_expires_at
    );
  end if;

  update private.notification_reinstall_recovery_challenges as challenge
  set status = 'superseded',
      source_token_hash = null,
      target_secret_store_hash = null,
      target_pairing_store_hash = null,
      target_consent_version = null,
      target_disclosure_sha256 = null,
      target_consent_locale = null,
      target_age_14_or_over_confirmed = null,
      target_worship_reminder = null,
      target_schedule_changes = null,
      target_setlist_updates = null,
      recovery_code_digest = null,
      decided_at = request_now,
      decided_by = null
  where challenge.status = 'pending'
    and (
      challenge.source_push_endpoint_id = source_endpoint_id
      or challenge.target_installation_id = notification_request_reinstall_recovery_v1.target_installation_id
    );

  begin
    insert into private.notification_reinstall_recovery_challenges (
      source_installation_id,
      source_push_endpoint_id,
      source_token_hash,
      source_platform_snapshot,
      source_app_version_snapshot,
      source_app_variant_snapshot,
      target_installation_id,
      target_secret_store_hash,
      target_pairing_store_hash,
      unlink_binding_digest,
      target_platform_snapshot,
      target_app_version_snapshot,
      target_app_variant_snapshot,
      target_consent_version,
      target_disclosure_sha256,
      target_consent_locale,
      target_age_14_or_over_confirmed,
      target_worship_reminder,
      target_schedule_changes,
      target_setlist_updates,
      recovery_code_digest,
      expires_at
    ) values (
      source_installation_id,
      source_endpoint_id,
      expo_token_hash,
      source_platform,
      source_app_version,
      source_app_variant,
      target_installation_id,
      target_secret_store_hash,
      target_pairing_store_hash,
      computed_unlink_binding_digest,
      target_platform,
      target_app_version,
      target_app_variant,
      target_sensitive_interest_consent_version,
      target_sensitive_interest_disclosure_sha256,
      target_sensitive_interest_consent_locale,
      true,
      target_worship_reminder,
      target_schedule_changes,
      target_setlist_updates,
      target_recovery_code_digest,
      challenge_expires_at
    );
  exception when unique_violation then
    return pg_catalog.jsonb_build_object(
      'status', 'error',
      'code', 'RECOVERY_CONFLICT'
    );
  end;

  return pg_catalog.jsonb_build_object(
    'status', 'pending_owner_approval',
    'expires_at', challenge_expires_at
  );
end;
$$;

revoke all on function public.notification_request_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, text
) from public, anon, authenticated, service_role;

grant execute on function public.notification_request_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, text
) to anon;

create function public.notification_cancel_reinstall_recovery_v1(
  target_installation_id uuid,
  target_platform text,
  target_app_variant text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  installation_proof text;
  expo_token text;
  target_store_hash text;
  expo_token_hash text;
  computed_unlink_binding_digest text;
  challenge private.notification_reinstall_recovery_challenges%rowtype;
  source_secret_hash text;
  target_secret_hash text;
  direct_source_installation_id uuid;
  direct_source_endpoint_id uuid;
  direct_target_endpoint_id uuid;
  withdrawal_completed boolean := false;
begin
  perform private.enforce_notification_client_rate_limit(
    'notification_recovery_cancel', 20, interval '1 minute', 100, interval '5 minutes'
  );
  perform private.enforce_notification_subject_rate_limit(
    'notification_recovery_cancel_subject',
    coalesce(target_installation_id::text, 'missing'),
    10
  );

  installation_proof := private.notification_request_header(
    'x-jubilee-installation-proof', 64
  );
  expo_token := private.notification_request_header(
    'x-jubilee-expo-push-token', 256
  );
  if target_installation_id is null
    or target_platform not in ('ios', 'android')
    or target_app_variant not in ('development', 'preview')
    or installation_proof is null
    or installation_proof !~ '^[0-9a-f]{64}$'
    or expo_token is null
    or expo_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
  then
    return pg_catalog.jsonb_build_object('status', 'error', 'code', '28000');
  end if;
  target_store_hash := private.sha256_hex(installation_proof);
  expo_token_hash := private.sha256_hex(expo_token);
  computed_unlink_binding_digest := private.sha256_hex(
    'jubilee:reinstall-recovery-unlink:v1' || pg_catalog.chr(10)
    || target_store_hash || pg_catalog.chr(10)
    || expo_token_hash
  );

  perform private.enforce_notification_subject_rate_limit(
    'recovery_cancel_token', expo_token_hash, 10
  );

  -- Use the approval lock order so owner approval and device withdrawal have
  -- one transaction winner. Withdrawal never waits for the registration kill
  -- switch or legal-publication gate.
  perform pg_catalog.pg_advisory_xact_lock(731904, 1);
  perform pg_catalog.pg_advisory_xact_lock(731904, 2);

  select candidate.*
  into challenge
  from private.notification_reinstall_recovery_challenges as candidate
  where candidate.target_installation_id =
      notification_cancel_reinstall_recovery_v1.target_installation_id
    and candidate.target_app_variant_snapshot = target_app_variant
    and candidate.target_platform_snapshot = target_platform
    and candidate.source_app_variant_snapshot = target_app_variant
    and candidate.source_platform_snapshot = target_platform
    and candidate.source_app_variant_snapshot in ('development', 'preview')
    and candidate.unlink_binding_digest = computed_unlink_binding_digest
    and (
      candidate.status = 'pending'
      or candidate.decided_at > statement_timestamp() - interval '30 days'
    )
  order by candidate.created_at desc, candidate.id desc
  limit 1
  for update;

  if found then
    -- The exact request-time token is bound to the new-device proof before an
    -- older installation can be disabled. Once that binding matches, revoke
    -- the linked non-production source even if its endpoint token rotated
    -- while the owner decision was pending.
    select installation.secret_hash
    into source_secret_hash
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    where installation.id = challenge.source_installation_id
      and endpoint.id = challenge.source_push_endpoint_id
      and installation.app_variant = challenge.source_app_variant_snapshot
      and installation.app_variant = target_app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.platform = target_platform
      and installation.disabled_at is null
      and endpoint.platform = target_platform
      and endpoint.is_active = true
      and endpoint.disabled_at is null
    for update of installation, endpoint;

    if source_secret_hash is not null then
      update private.notification_outbox as outbox
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          last_error_code = 'REINSTALL_RECOVERY_WITHDRAWN'
      from private.notification_campaigns as campaign
      where outbox.campaign_id = campaign.id
        and campaign.test_push_endpoint_id = challenge.source_push_endpoint_id
        and outbox.status = 'pending';

      update private.notification_campaigns
      set status = 'cancelled'
      where test_push_endpoint_id = challenge.source_push_endpoint_id
        and status in ('draft', 'approved', 'queued');

      delete from private.owner_test_push_targets
      where push_endpoint_id = challenge.source_push_endpoint_id;

      perform public.service_unregister_app_installation(
        challenge.source_installation_id,
        source_secret_hash
      );
      withdrawal_completed := true;
    end if;

    -- Approval may have won, the old source may already be disabled, and the
    -- device may have completed a fresh registration. The target proof is
    -- sufficient to withdraw that exact non-production target as well, but
    -- only after the challenge binding above validated the original token.
    select installation.secret_hash
    into target_secret_hash
    from private.app_installations as installation
    where installation.id =
        notification_cancel_reinstall_recovery_v1.target_installation_id
      and installation.app_variant = target_app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.secret_hash = target_store_hash
      and installation.disabled_at is null
    for update;

    if target_secret_hash is not null then
      update private.notification_outbox as outbox
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          last_error_code = 'REINSTALL_RECOVERY_WITHDRAWN'
      from private.notification_campaigns as campaign
      join private.push_endpoints as endpoint
        on endpoint.id = campaign.test_push_endpoint_id
      where outbox.campaign_id = campaign.id
        and endpoint.installation_id = target_installation_id
        and outbox.status = 'pending';

      update private.notification_campaigns as campaign
      set status = 'cancelled'
      from private.push_endpoints as endpoint
      where endpoint.id = campaign.test_push_endpoint_id
        and endpoint.installation_id = target_installation_id
        and campaign.status in ('draft', 'approved', 'queued');

      delete from private.owner_test_push_targets as target
      using private.push_endpoints as endpoint
      where target.push_endpoint_id = endpoint.id
        and endpoint.installation_id = target_installation_id;

      perform public.service_unregister_app_installation(
        target_installation_id,
        target_secret_hash
      );
      withdrawal_completed := true;
    end if;

    -- All reusable/verifier fields are scrubbed immediately. Only the
    -- non-replayable unlink binding and masked audit metadata remain for the
    -- fixed 30-day terminal retention period.
    update private.notification_reinstall_recovery_challenges
    set status = 'withdrawn',
        source_token_hash = null,
        target_secret_store_hash = null,
        target_pairing_store_hash = null,
        target_consent_version = null,
        target_disclosure_sha256 = null,
        target_consent_locale = null,
        target_age_14_or_over_confirmed = null,
        target_worship_reminder = null,
        target_schedule_changes = null,
        target_setlist_updates = null,
        recovery_code_digest = null,
        decided_at = case
          when status = 'withdrawn' then decided_at
          else statement_timestamp()
        end,
        decided_by = null
    where id = challenge.id;
    withdrawal_completed := true;
  end if;

  -- A finalize may commit before the device marks SecureStore committed. Even
  -- after the 30-day audit row is gone, the exact target ID, proof, token,
  -- platform, and non-production variant can still perform normal withdrawal.
  if not withdrawal_completed then
    select installation.secret_hash, endpoint.id
    into target_secret_hash, direct_target_endpoint_id
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    where installation.id = target_installation_id
      and installation.secret_hash = target_store_hash
      and installation.app_variant = target_app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.platform = target_platform
      and installation.disabled_at is null
      and endpoint.platform = target_platform
      and endpoint.expo_push_token = expo_token
      and endpoint.token_hash = expo_token_hash
      and endpoint.is_active = true
      and endpoint.disabled_at is null
    for update of installation, endpoint;

    if target_secret_hash is not null then
      update private.notification_outbox as outbox
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          last_error_code = 'REINSTALL_RECOVERY_WITHDRAWN'
      from private.notification_campaigns as campaign
      where outbox.campaign_id = campaign.id
        and campaign.test_push_endpoint_id = direct_target_endpoint_id
        and outbox.status = 'pending';

      update private.notification_campaigns
      set status = 'cancelled'
      where test_push_endpoint_id = direct_target_endpoint_id
        and status in ('draft', 'approved', 'queued');

      delete from private.owner_test_push_targets
      where push_endpoint_id = direct_target_endpoint_id;

      perform public.service_unregister_app_installation(
        target_installation_id,
        target_secret_hash
      );
      withdrawal_completed := true;
    end if;
  end if;

  -- A provisional recovery record is persisted before the challenge request.
  -- If the request response is lost, or the terminal audit has already aged
  -- out, the exact development/preview token remains an accepted
  -- unsubscribe-only capability. It can never create or take over a target.
  if not withdrawal_completed then
    select installation.id, endpoint.id, installation.secret_hash
    into direct_source_installation_id, direct_source_endpoint_id,
      source_secret_hash
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    where installation.app_variant = target_app_variant
      and installation.app_variant in ('development', 'preview')
      and installation.platform = target_platform
      and installation.disabled_at is null
      and endpoint.platform = target_platform
      and endpoint.expo_push_token = expo_token
      and endpoint.token_hash = expo_token_hash
      and endpoint.is_active = true
      and endpoint.disabled_at is null
    for update of installation, endpoint;

    if source_secret_hash is not null then
      update private.notification_outbox as outbox
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          last_error_code = 'REINSTALL_RECOVERY_WITHDRAWN'
      from private.notification_campaigns as campaign
      where outbox.campaign_id = campaign.id
        and campaign.test_push_endpoint_id = direct_source_endpoint_id
        and outbox.status = 'pending';

      update private.notification_campaigns
      set status = 'cancelled'
      where test_push_endpoint_id = direct_source_endpoint_id
        and status in ('draft', 'approved', 'queued');

      delete from private.owner_test_push_targets
      where push_endpoint_id = direct_source_endpoint_id;

      perform public.service_unregister_app_installation(
        direct_source_installation_id,
        source_secret_hash
      );
      withdrawal_completed := true;
    end if;
  end if;

  if withdrawal_completed then
    return pg_catalog.jsonb_build_object('status', 'withdrawn');
  end if;

  -- The client must preserve its cleanup marker and SecureStore capability
  -- unless the server positively acknowledges an actual or already-complete
  -- unlink. This bounded error discloses no raw token or installation data.
  return pg_catalog.jsonb_build_object(
    'status', 'error', 'code', 'RECOVERY_UNLINK_NOT_AVAILABLE'
  );
end;
$$;

revoke all on function public.notification_cancel_reinstall_recovery_v1(uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.notification_cancel_reinstall_recovery_v1(uuid, text, text)
to anon;

create function public.list_owner_reinstall_recovery_challenges()
returns table (
  challenge_id uuid,
  app_variant text,
  source_display_label text,
  target_display_label text,
  created_at timestamptz,
  expires_at timestamptz
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
    challenge.id,
    challenge.target_app_variant_snapshot,
    pg_catalog.format(
      '%s · %s · 이전 기기 …%s',
      case challenge.source_app_variant_snapshot
        when 'development' then '개발'
        when 'preview' then '미리보기'
      end,
      case challenge.source_platform_snapshot
        when 'android' then 'Android'
        when 'ios' then 'iOS'
      end,
      pg_catalog.upper(pg_catalog.right(
        pg_catalog.replace(challenge.source_push_endpoint_id::text, '-', ''), 12
      ))
    ),
    pg_catalog.format(
      '%s · %s · 새 설치 …%s',
      case challenge.target_app_variant_snapshot
        when 'development' then '개발'
        when 'preview' then '미리보기'
      end,
      case challenge.target_platform_snapshot
        when 'android' then 'Android'
        when 'ios' then 'iOS'
      end,
      pg_catalog.upper(pg_catalog.right(
        pg_catalog.replace(challenge.target_installation_id::text, '-', ''), 12
      ))
    ),
    challenge.created_at,
    challenge.expires_at
  from private.notification_reinstall_recovery_challenges as challenge
  where challenge.status = 'pending'
    and challenge.expires_at > statement_timestamp()
  order by challenge.created_at, challenge.id
  limit 100;
end;
$$;

revoke all on function public.list_owner_reinstall_recovery_challenges()
from public, anon, authenticated, service_role;
grant execute on function public.list_owner_reinstall_recovery_challenges()
to authenticated;

create function public.approve_owner_reinstall_recovery(
  target_challenge_id uuid,
  target_recovery_code_digest text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  challenge private.notification_reinstall_recovery_challenges%rowtype;
  source_secret_hash text;
  source_expo_token text;
  source_token_hash text;
  registration_enabled boolean;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_challenge_id is null
    or target_recovery_code_digest is null
    or target_recovery_code_digest !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'Valid recovery approval is required';
  end if;

  -- Claim/queue, recovery request replacement, and approval use explicit
  -- transaction gates. This prevents an endpoint from being handed to a
  -- worker or a challenge from being replaced during the decisive relink.
  perform pg_catalog.pg_advisory_xact_lock(731904, 1);
  perform pg_catalog.pg_advisory_xact_lock(731904, 2);

  select source.*
  into challenge
  from private.notification_reinstall_recovery_challenges as source
  where source.id = target_challenge_id
    and source.status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  if challenge.expires_at <= statement_timestamp() then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'expired', null
    );
    return false;
  end if;

  if challenge.recovery_code_digest is distinct from target_recovery_code_digest then
    if challenge.failed_approval_attempts >= 4 then
      update private.notification_reinstall_recovery_challenges
      set failed_approval_attempts = 5
      where id = challenge.id;
      perform private.finish_notification_reinstall_recovery(
        challenge.id, 'expired', null
      );
    else
      update private.notification_reinstall_recovery_challenges
      set failed_approval_attempts = failed_approval_attempts + 1
      where id = challenge.id;
    end if;
    return false;
  end if;

  -- Hold the same legal publication gate used by document publication and a
  -- row lock on the registration kill switch until the relink commits.
  perform pg_catalog.pg_advisory_xact_lock(
    731911, pg_catalog.hashtext('privacy_policy')
  );
  select control.registration_enabled
  into registration_enabled
  from private.notification_registration_control as control
  where control.singleton = true
  for share;

  if not coalesce(registration_enabled, false)
    or not private.current_store_ready_privacy_policy_exists()
    or challenge.target_app_variant_snapshot not in ('development', 'preview')
    or challenge.target_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
    or challenge.target_disclosure_sha256 is distinct from
      private.current_sensitive_interest_disclosure_sha256()
    or challenge.target_consent_locale is distinct from
      private.current_sensitive_interest_consent_locale()
    or challenge.target_age_14_or_over_confirmed is distinct from true
  then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'superseded', null
    );
    return false;
  end if;

  perform 1
  from private.app_installations as installation
  where installation.id = challenge.source_installation_id
  for update;

  if not found then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'superseded', null
    );
    return false;
  end if;

  perform 1
  from private.push_endpoints as endpoint
  where endpoint.id = challenge.source_push_endpoint_id
    and endpoint.installation_id = challenge.source_installation_id
  for update;

  if not found then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'superseded', null
    );
    return false;
  end if;

  select
    installation.secret_hash,
    endpoint.expo_push_token,
    endpoint.token_hash
  into source_secret_hash, source_expo_token, source_token_hash
  from private.app_installations as installation
  join private.push_endpoints as endpoint
    on endpoint.installation_id = installation.id
  where installation.id = challenge.source_installation_id
    and endpoint.id = challenge.source_push_endpoint_id
    and endpoint.is_active = true
    and endpoint.disabled_at is null
    and endpoint.expo_push_token is not null
    and endpoint.token_hash = challenge.source_token_hash
    and endpoint.platform = challenge.source_platform_snapshot
    and installation.disabled_at is null
    and installation.platform = challenge.source_platform_snapshot
    and installation.app_variant = challenge.source_app_variant_snapshot
    and installation.app_variant = challenge.target_app_variant_snapshot
    and installation.app_variant in ('development', 'preview')
    and installation.sensitive_interest_consent_version =
      private.current_sensitive_interest_consent_version()
    and installation.sensitive_interest_consented_at is not null
    and installation.sensitive_interest_disclosure_sha256 =
      private.current_sensitive_interest_disclosure_sha256()
    and installation.sensitive_interest_consent_locale =
      private.current_sensitive_interest_consent_locale()
    and installation.sensitive_interest_age_14_or_over_confirmed_at is not null;

  if source_secret_hash is null
    or source_expo_token is null
    or source_token_hash is null
    or exists (
      select 1
      from private.app_installations as installation
      where installation.id = challenge.target_installation_id
    )
  then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'superseded', null
    );
    return false;
  end if;

  -- Approval never releases the provider-token uniqueness reservation. It
  -- only authorizes this exact target proof for a short finalize window and
  -- scrubs the one-time owner code plus stale consent/preference snapshots.
  -- The device must return with its proof, the exact token, and its current
  -- consent/preferences before any installation state changes.
  update private.notification_reinstall_recovery_challenges
  set status = 'authorized',
      target_consent_version = null,
      target_disclosure_sha256 = null,
      target_consent_locale = null,
      target_age_14_or_over_confirmed = null,
      target_worship_reminder = null,
      target_schedule_changes = null,
      target_setlist_updates = null,
      recovery_code_digest = null,
      decided_at = statement_timestamp(),
      decided_by = actor
  where id = challenge.id
    and status = 'pending';

  return found;
end;
$$;

revoke all on function public.approve_owner_reinstall_recovery(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.approve_owner_reinstall_recovery(uuid, text)
to authenticated;

create function public.notification_finalize_reinstall_recovery_v1(
  target_installation_id uuid,
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
  installation_proof text;
  expo_token text;
  target_store_hash text;
  expo_token_hash text;
  challenge private.notification_reinstall_recovery_challenges%rowtype;
  source_secret_hash text;
  response_code text;
  registration_enabled boolean;
  wants_notifications boolean :=
    target_worship_reminder is true
    or target_schedule_changes is true
    or target_setlist_updates is true;
begin
  perform private.enforce_notification_client_rate_limit(
    'notification_recovery_finalize', 10, interval '1 minute', 100, interval '5 minutes'
  );
  perform private.enforce_notification_subject_rate_limit(
    'notification_recovery_finalize_subject',
    coalesce(target_installation_id::text, 'missing'),
    10
  );

  installation_proof := private.notification_request_header(
    'x-jubilee-installation-proof', 64
  );
  expo_token := private.notification_request_header(
    'x-jubilee-expo-push-token', 256
  );

  if target_installation_id is null
    or target_platform not in ('ios', 'android')
    or target_app_variant not in ('development', 'preview')
    or target_app_version is null
    or target_app_version <> pg_catalog.btrim(target_app_version)
    or target_app_version = ''
    or pg_catalog.char_length(target_app_version) > 64
    or installation_proof is null
    or installation_proof !~ '^[0-9a-f]{64}$'
    or expo_token is null
    or expo_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
    or target_age_14_or_over_confirmed is distinct from true
    or target_worship_reminder is null
    or target_schedule_changes is null
    or target_setlist_updates is null
    or not wants_notifications
    or target_sensitive_interest_consent_version is distinct from
      private.current_sensitive_interest_consent_version()
    or target_sensitive_interest_disclosure_sha256 is distinct from
      private.current_sensitive_interest_disclosure_sha256()
    or target_sensitive_interest_consent_locale is distinct from
      private.current_sensitive_interest_consent_locale()
  then
    return pg_catalog.jsonb_build_object(
      'status', 'error', 'code', 'INVALID_REQUEST'
    );
  end if;

  target_store_hash := private.sha256_hex(installation_proof);
  expo_token_hash := private.sha256_hex(expo_token);

  -- Serialize with owner authorization, request replacement, delivery claim,
  -- and withdrawal. The source token remains uniquely reserved until this
  -- transaction has authenticated the target and is ready to replace it.
  perform pg_catalog.pg_advisory_xact_lock(731904, 1);
  perform pg_catalog.pg_advisory_xact_lock(731904, 2);

  select candidate.*
  into challenge
  from private.notification_reinstall_recovery_challenges as candidate
  where candidate.target_installation_id =
      notification_finalize_reinstall_recovery_v1.target_installation_id
    and candidate.target_platform_snapshot = target_platform
    and candidate.target_app_variant_snapshot = target_app_variant
    and candidate.source_app_variant_snapshot = target_app_variant
    and candidate.status = 'authorized'
    and candidate.target_secret_store_hash = target_store_hash
    and candidate.source_token_hash = expo_token_hash
  order by candidate.created_at desc, candidate.id desc
  limit 1
  for update;

  if not found then
    -- A successful finalize may be retried after the server committed but
    -- before SecureStore was marked committed. Authenticate the exact target
    -- and return the same response without creating a second installation.
    if exists (
      select 1
      from private.app_installations as installation
      join private.notification_subscriptions as subscription
        on subscription.installation_id = installation.id
      join private.push_endpoints as endpoint
        on endpoint.installation_id = installation.id
      where installation.id =
          notification_finalize_reinstall_recovery_v1.target_installation_id
        and installation.secret_hash = target_store_hash
        and installation.platform = target_platform
        and installation.app_version = target_app_version
        and installation.app_variant = target_app_variant
        and installation.app_variant in ('development', 'preview')
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
        and endpoint.expo_push_token = expo_token
        and endpoint.token_hash = expo_token_hash
        and endpoint.is_active = true
        and endpoint.disabled_at is null
        and exists (
          select 1
          from private.notification_reinstall_recovery_challenges as audit
          where audit.target_installation_id = installation.id
            and audit.target_app_variant_snapshot = installation.app_variant
            and audit.status = 'approved'
        )
    ) then
      return pg_catalog.jsonb_build_object('status', 'ok');
    end if;

    return pg_catalog.jsonb_build_object(
      'status', 'error', 'code', 'RECOVERY_NOT_AUTHORIZED'
    );
  end if;

  if challenge.expires_at <= statement_timestamp() then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'expired', null
    );
    return pg_catalog.jsonb_build_object(
      'status', 'error', 'code', 'RECOVERY_EXPIRED'
    );
  end if;

  -- Hold the publication and kill-switch rows through the atomic replacement.
  perform pg_catalog.pg_advisory_xact_lock(
    731911, pg_catalog.hashtext('privacy_policy')
  );
  select control.registration_enabled
  into registration_enabled
  from private.notification_registration_control as control
  where control.singleton = true
  for share;

  if not coalesce(registration_enabled, false)
    or not private.current_store_ready_privacy_policy_exists()
  then
    return pg_catalog.jsonb_build_object(
      'status', 'error', 'code', 'REGISTRATION_DISABLED'
    );
  end if;

  select installation.secret_hash
  into source_secret_hash
  from private.app_installations as installation
  join private.push_endpoints as endpoint
    on endpoint.installation_id = installation.id
  where installation.id = challenge.source_installation_id
    and endpoint.id = challenge.source_push_endpoint_id
    and installation.app_variant = challenge.source_app_variant_snapshot
    and installation.app_variant = target_app_variant
    and installation.app_variant in ('development', 'preview')
    and installation.platform = target_platform
    and installation.disabled_at is null
    and endpoint.platform = target_platform
    and endpoint.expo_push_token = expo_token
    and endpoint.token_hash = expo_token_hash
    and endpoint.is_active = true
    and endpoint.disabled_at is null
  for update of installation, endpoint;

  if source_secret_hash is null
    or exists (
      select 1
      from private.app_installations as installation
      where installation.id = target_installation_id
    )
  then
    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'superseded', null
    );
    return pg_catalog.jsonb_build_object(
      'status', 'error', 'code', 'RECOVERY_NOT_AVAILABLE'
    );
  end if;

  begin
    update private.notification_outbox as outbox
    set status = 'cancelled',
        locked_at = null,
        locked_by = null,
        last_error_code = 'REINSTALL_RECOVERY_FINALIZED'
    from private.notification_campaigns as campaign
    where outbox.campaign_id = campaign.id
      and campaign.test_push_endpoint_id = challenge.source_push_endpoint_id
      and outbox.status = 'pending';

    update private.notification_campaigns
    set status = 'cancelled'
    where test_push_endpoint_id = challenge.source_push_endpoint_id
      and status in ('draft', 'approved', 'queued');

    delete from private.owner_test_push_targets
    where push_endpoint_id = challenge.source_push_endpoint_id;

    perform public.service_unregister_app_installation(
      challenge.source_installation_id,
      source_secret_hash
    );

    update private.app_installations
    set disable_reason = 'owner_reinstall_recovery'
    where id = challenge.source_installation_id;

    perform public.service_register_app_installation(
      target_installation_id,
      target_store_hash,
      target_platform,
      target_app_version,
      target_app_variant,
      target_sensitive_interest_consent_version,
      true,
      expo_token,
      expo_token_hash,
      target_worship_reminder,
      target_schedule_changes,
      target_setlist_updates
    );

    update private.app_installations
    set test_pairing_secret_hash = challenge.target_pairing_store_hash
    where id = target_installation_id;

    perform private.finish_notification_reinstall_recovery(
      challenge.id, 'approved', challenge.decided_by
    );

    return pg_catalog.jsonb_build_object('status', 'ok');
  exception
    when sqlstate '22004' or sqlstate '22023' or sqlstate '23505'
      or sqlstate '23514' or sqlstate '28000'
    then
      get stacked diagnostics response_code = returned_sqlstate;
      return pg_catalog.jsonb_build_object(
        'status', 'error', 'code', response_code
      );
  end;
end;
$$;

revoke all on function public.notification_finalize_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.notification_finalize_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) to anon;

create function public.reject_owner_reinstall_recovery(target_challenge_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  challenge_expires_at timestamptz;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_challenge_id is null then
    raise exception using errcode = '22004', message = 'Recovery challenge is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731904, 2);

  select challenge.expires_at
  into challenge_expires_at
  from private.notification_reinstall_recovery_challenges as challenge
  where challenge.id = target_challenge_id
    and challenge.status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  if challenge_expires_at <= statement_timestamp() then
    perform private.finish_notification_reinstall_recovery(
      target_challenge_id, 'expired', null
    );
    return false;
  end if;

  return private.finish_notification_reinstall_recovery(
    target_challenge_id, 'rejected', actor
  );
end;
$$;

revoke all on function public.reject_owner_reinstall_recovery(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reject_owner_reinstall_recovery(uuid)
to authenticated;

create function public.service_cleanup_reinstall_recovery_challenges(
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

  update private.notification_reinstall_recovery_challenges
  set status = 'expired',
      source_token_hash = null,
      target_secret_store_hash = null,
      target_pairing_store_hash = null,
      target_consent_version = null,
      target_disclosure_sha256 = null,
      target_consent_locale = null,
      target_age_14_or_over_confirmed = null,
      target_worship_reminder = null,
      target_schedule_changes = null,
      target_setlist_updates = null,
      recovery_code_digest = null,
      decided_at = target_now,
      decided_by = null
  where status in ('pending', 'authorized')
    and expires_at <= target_now;
  get diagnostics expired_rows = row_count;

  delete from private.notification_reinstall_recovery_challenges
  where status not in ('pending', 'authorized')
    and decided_at <= target_now - interval '30 days';
  get diagnostics deleted_rows = row_count;

  return query select expired_rows, deleted_rows;
end;
$$;

revoke all on function public.service_cleanup_reinstall_recovery_challenges(timestamptz)
from public, anon, authenticated, service_role;
grant execute on function public.service_cleanup_reinstall_recovery_challenges(timestamptz)
to service_role;

select cron.schedule(
  'jubilee-reinstall-recovery-cleanup',
  '*/5 * * * *',
  'select public.service_cleanup_reinstall_recovery_challenges(statement_timestamp())'
);

comment on function public.notification_request_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, text
) is
  'Creates a short-lived non-production reinstall recovery request from a device-held one-time capability digest.';
comment on function public.list_owner_reinstall_recovery_challenges() is
  'Lists only masked pending reinstall recovery targets for an active owner.';
comment on function public.approve_owner_reinstall_recovery(uuid, text) is
  'Authorizes a short non-production finalize window after active-owner verification without releasing or changing the source token.';
comment on function public.notification_finalize_reinstall_recovery_v1(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
) is
  'Atomically unregisters the reserved source and creates the owner-authorized target from device proof, exact token, and current consent/preferences.';
comment on function public.notification_cancel_reinstall_recovery_v1(
  uuid, text, text
) is
  'Immediately withdraws a matching development or preview source/target; exact-token fallback is unsubscribe-only and never creates an installation.';
comment on column private.notification_reinstall_recovery_challenges.decided_by is
  'Authenticated owner UUID snapshot retained for the bounded audit even if the auth account is later deleted.';

commit;
