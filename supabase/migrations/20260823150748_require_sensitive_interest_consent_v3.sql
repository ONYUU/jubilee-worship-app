-- Replace the v2 sensitive-interest notification disclosure with an exact v3
-- contract that separates Supabase registration data from provider delivery
-- data and describes threshold-based daily retention cleanup accurately.
-- Generated with `supabase migration new require_sensitive_interest_consent_v3`.

begin;

-- Re-lock registration until the v3 app, direct Data API contract, and current
-- store-ready privacy policy have been canaried together. Existing v2 consent
-- remains in the append-only audit history, but it cannot authorize delivery.
update private.notification_registration_control
set registration_enabled = false,
    updated_at = statement_timestamp()
where singleton = true;

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
    disable_reason = case
      when is_active then 'consent_required'
      else coalesce(disable_reason, 'consent_required')
    end
where is_active
   or expo_push_token is not null
   or token_hash is not null;

update private.app_installations
set disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = case
      when disabled_at is null then 'consent_required'
      else disable_reason
    end,
    sensitive_interest_consent_version = null,
    sensitive_interest_consented_at = null,
    sensitive_interest_disclosure_sha256 = null,
    sensitive_interest_consent_locale = null,
    sensitive_interest_age_14_or_over_confirmed_at = null
where sensitive_interest_consent_version is not null
   or sensitive_interest_consented_at is not null
   or sensitive_interest_disclosure_sha256 is not null
   or sensitive_interest_consent_locale is not null
   or sensitive_interest_age_14_or_over_confirmed_at is not null;

-- A recovery request captures the consent contract at request time. A pending
-- v2 request must not be finalized into a v3 registration after this migration.
update private.notification_reinstall_recovery_challenges
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
    decided_at = statement_timestamp(),
    decided_by = null
where status in ('pending', 'authorized');

create or replace function private.current_sensitive_interest_consent_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'sensitive-interest-notifications-v3'::text;
$$;

create or replace function private.current_sensitive_interest_disclosure_sha256()
returns text
language sql
immutable
set search_path = ''
as $$
  select '796cb75f5e3a91719789a351618fa1433ae59a5c1d25199116e3a636ddde9319'::text;
$$;

revoke all on function private.current_sensitive_interest_consent_version()
from public, anon, authenticated, service_role;
revoke all on function private.current_sensitive_interest_disclosure_sha256()
from public, anon, authenticated, service_role;

comment on function private.current_sensitive_interest_consent_version() is
  'Current exact sensitive-interest notification consent contract version.';
comment on function private.current_sensitive_interest_disclosure_sha256() is
  'SHA-256 of the current exact Korean sensitive-interest notification disclosure.';

commit;
