begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(76);

-- 1-2: private storage exists.
select has_table(
  'private', 'test_push_pairing_challenges',
  'pairing challenges live in private storage'
);
select has_table(
  'private', 'owner_test_push_targets',
  'owner-approved test targets live in private storage'
);

-- 3-8: tables, state machine, and variant boundary are locked down.
select is(
  (
    select count(*)
    from pg_class as relation
    where relation.oid in (
      'private.test_push_pairing_challenges'::regclass,
      'private.owner_test_push_targets'::regclass
    )
      and relation.relrowsecurity
  ),
  2::bigint,
  'both private pairing tables have RLS enabled'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in ('test_push_pairing_challenges', 'owner_test_push_targets')
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  0::bigint,
  'no application role has direct pairing-table privileges'
);

select is(
  (
    select count(*)
    from information_schema.role_usage_grants
    where object_schema = 'private'
      and object_name = 'test_push_pairing_challenges_id_seq'
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  0::bigint,
  'no application role can use the pairing identity sequence directly'
);

select is(
  (
    select count(*)
    from pg_constraint
    where conrelid = 'private.test_push_pairing_challenges'::regclass
      and conname in (
        'test_push_pairing_challenge_expiry_valid',
        'test_push_pairing_challenge_state_valid'
      )
  ),
  2::bigint,
  'pairing TTL and digest-scrubbing state constraints exist'
);

select is(
  (
    select count(*)
    from pg_indexes
    where schemaname = 'private'
      and indexname in (
        'test_push_pairing_challenges_digest_unique_idx',
        'test_push_pairing_challenges_endpoint_pending_unique_idx'
      )
      and indexdef like '%WHERE%'
  ),
  2::bigint,
  'active digest and per-endpoint pending challenges are uniquely constrained'
);

select is(
  (
    select count(*)
    from pg_trigger
    where tgrelid = 'private.app_installations'::regclass
      and tgname = 'app_installations_variant_immutable'
      and tgenabled <> 'D'
  ),
  1::bigint,
  'the registered installation variant is immutable'
);

-- 9-17: the only public surface is role-specific SECURITY DEFINER RPCs.
select is(
  (
    select count(*)
    from unnest(array[
      to_regprocedure('public.service_create_test_push_pairing(uuid,text,text,text)'),
      to_regprocedure('public.service_cleanup_test_push_pairings(timestamptz)'),
      to_regprocedure('public.approve_owner_test_push_target(text)'),
      to_regprocedure('public.revoke_owner_test_push_target(uuid)'),
      to_regprocedure('public.list_owner_test_push_targets()'),
      to_regprocedure('public.queue_owner_test_push(uuid,uuid,text,text,text,text)')
    ]) as function_oid
    where function_oid is not null
  ),
  6::bigint,
  'all pairing, allowlist, and idempotent queue RPCs exist'
);

select is(
  (
    select count(*)
    from pg_proc as procedure
    where procedure.oid in (
      'public.service_create_test_push_pairing(uuid,text,text,text)'::regprocedure,
      'public.service_cleanup_test_push_pairings(timestamptz)'::regprocedure,
      'public.approve_owner_test_push_target(text)'::regprocedure,
      'public.revoke_owner_test_push_target(uuid)'::regprocedure,
      'public.list_owner_test_push_targets()'::regprocedure,
      'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
    )
      and procedure.prosecdef
      and 'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
  ),
  6::bigint,
  'all six public RPCs are SECURITY DEFINER with an empty search path'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_create_test_push_pairing(uuid,text,text,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.service_cleanup_test_push_pairings(timestamptz)',
    'EXECUTE'
  ),
  'service_role can create and clean pairing challenges through RPC only'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_create_test_push_pairing(uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.service_create_test_push_pairing(uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.service_cleanup_test_push_pairings(timestamptz)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.service_cleanup_test_push_pairings(timestamptz)',
    'EXECUTE'
  ),
  'public user roles cannot create or clean challenges directly'
);

select ok(
  has_function_privilege('authenticated', 'public.approve_owner_test_push_target(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.revoke_owner_test_push_target(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_owner_test_push_targets()', 'EXECUTE')
  and has_function_privilege(
    'authenticated',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated sessions may enter the internally owner-gated RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.approve_owner_test_push_target(text)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.approve_owner_test_push_target(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.revoke_owner_test_push_target(uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.revoke_owner_test_push_target(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_owner_test_push_targets()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.list_owner_test_push_targets()', 'EXECUTE')
  and not has_function_privilege(
    'anon',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'anon and service_role cannot replace an authenticated owner for approval or queueing'
);

select is(
  pg_get_function_result('public.approve_owner_test_push_target(text)'::regprocedure),
  'boolean'::text,
  'approval returns one non-disclosing success boolean so expiry scrubbing can commit'
);

select is(
  pg_get_function_result('public.list_owner_test_push_targets()'::regprocedure),
  'TABLE(push_endpoint_id uuid, app_variant text, display_label text)'::text,
  'the browser list contains only an opaque endpoint, explicit variant, and masked label'
);

select ok(
  not has_function_privilege(
    'service_role',
    'private.claim_notification_outbox_core(text,integer)',
    'EXECUTE'
  ),
  'the original claim core is inaccessible outside its guarded wrapper'
);

insert into auth.users (id, email)
values
  ('61000000-0000-4000-8000-000000000001', 'pairing-owner@example.invalid'),
  ('61000000-0000-4000-8000-000000000002', 'pairing-editor@example.invalid'),
  ('61000000-0000-4000-8000-000000000003', 'pairing-inactive@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('61000000-0000-4000-8000-000000000001', 'owner', true),
  ('61000000-0000-4000-8000-000000000002', 'editor', true),
  ('61000000-0000-4000-8000-000000000003', 'owner', false);

insert into private.app_installations (
  id, secret_hash, platform, app_version, app_variant, disabled_at, disable_reason
)
values
  (
    '62000000-0000-4000-8000-000000000001', repeat('1', 64),
    'android', '1.0.0-dev', 'development', null, null
  ),
  (
    '62000000-0000-4000-8000-000000000002', repeat('2', 64),
    'ios', '1.0.0-preview', 'preview', null, null
  ),
  (
    '62000000-0000-4000-8000-000000000003', repeat('3', 64),
    'android', '1.0.0-prod', 'production', null, null
  ),
  (
    '62000000-0000-4000-8000-000000000004', repeat('4', 64),
    'ios', '1.0.0-disabled', 'preview', statement_timestamp(), 'user_unregistered'
  );

insert into private.notification_subscriptions (
  installation_id, worship_reminder, schedule_changes, setlist_updates
)
select id, true, true, true
from private.app_installations
where id::text like '62000000-0000-4000-8000-00000000000%';

insert into private.push_endpoints (
  id, installation_id, expo_push_token, token_hash, platform,
  is_active, disabled_at, disable_reason
)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    'ExpoPushToken[pairing_dev_private]', repeat('a', 64),
    'android', true, null, null
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002',
    'ExpoPushToken[pairing_preview_private]', repeat('b', 64),
    'ios', true, null, null
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000003',
    'ExpoPushToken[pairing_prod_private]', repeat('c', 64),
    'android', true, null, null
  ),
  (
    '63000000-0000-4000-8000-000000000004',
    '62000000-0000-4000-8000-000000000004',
    'ExpoPushToken[pairing_disabled_private]', repeat('d', 64),
    'ios', true, null, null
  );

-- 18-21: possession proof and the non-production boundary fail closed.
select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000003', repeat('3', 64),
      'production', repeat('3', 64)
    )
  $$,
  '22023',
  'Test push app variant must be development or preview',
  'production cannot request a pairing challenge'
);

select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000001', repeat('9', 64),
      'development', repeat('4', 64)
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'a wrong installation secret hash cannot request a challenge'
);

select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000001', repeat('1', 64),
      'preview', repeat('5', 64)
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'a caller cannot disguise the stored app variant'
);

select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000004', repeat('4', 64),
      'preview', repeat('6', 64)
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'a disabled installation cannot request a challenge'
);

create temporary table first_pairing_result on commit drop as
select public.service_create_test_push_pairing(
  '62000000-0000-4000-8000-000000000001', repeat('1', 64),
  'development', repeat('a1', 32)
) as expires_at;

-- 22-24: 10-minute TTL and creation rate limits.
select ok(
  (select expires_at from first_pairing_result) > statement_timestamp() + interval '9 minutes'
  and (select expires_at from first_pairing_result) <= statement_timestamp() + interval '10 minutes',
  'a valid possession proof creates a ten-minute challenge'
);

select results_eq(
  $$
    select status, app_variant_snapshot, code_digest = repeat('a1', 32)
    from private.test_push_pairing_challenges
    where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
  $$,
  $$values ('pending'::text, 'development'::text, true)$$,
  'only the HMAC digest and variant snapshot are stored while pending'
);

select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000001', repeat('1', 64),
      'development', repeat('a2', 32)
    )
  $$,
  '55000',
  'Pairing request rate limit exceeded',
  'the database enforces a per-endpoint creation cooldown'
);

update private.test_push_pairing_challenges
set created_at = created_at - interval '1 minute'
where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
  and status = 'pending';

-- 25-28: collision and replacement are atomic; terminal digests are scrubbed.
select throws_ok(
  $$
    select public.service_create_test_push_pairing(
      '62000000-0000-4000-8000-000000000002', repeat('2', 64),
      'preview', repeat('a1', 32)
    )
  $$,
  '23505',
  null,
  'an active digest collision fails closed'
);

select results_eq(
  $$
    select
      (select count(*) from private.test_push_pairing_challenges
       where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
         and status = 'pending')::bigint,
      (select count(*) from private.test_push_pairing_challenges
       where push_endpoint_id = '63000000-0000-4000-8000-000000000002')::bigint
  $$,
  $$values (1::bigint, 0::bigint)$$,
  'a collision rolls back without invalidating the existing code or creating a new row'
);

create temporary table replacement_pairing_result on commit drop as
select public.service_create_test_push_pairing(
  '62000000-0000-4000-8000-000000000001', repeat('1', 64),
  'development', repeat('a2', 32)
) as expires_at;

select ok(
  (select expires_at from replacement_pairing_result) > statement_timestamp(),
  'a valid replacement challenge is created after the cooldown'
);

select results_eq(
  $$
    select
      count(*) filter (where status = 'pending' and code_digest = repeat('a2', 32))::bigint,
      count(*) filter (where status = 'superseded' and code_digest is null)::bigint
    from private.test_push_pairing_challenges
    where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
  $$,
  $$values (1::bigint, 1::bigint)$$,
  'replacement leaves one pending code and immediately scrubs the superseded digest'
);

-- 29-30: database role state, not the Edge caller assertion, controls approval.
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.approve_owner_test_push_target(repeat('a2', 32))$$,
  '42501',
  'Active owner access required',
  'an editor cannot approve a pairing challenge'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.approve_owner_test_push_target(repeat('a2', 32))$$,
  '42501',
  'Active owner access required',
  'an inactive owner cannot approve a pairing challenge'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

-- 31-37: approval is one-use, non-disclosing, and browser-safe.
select is(
  public.approve_owner_test_push_target(repeat('ff', 32)),
  false,
  'an unknown code has the same false result as every unavailable code'
);

select is(
  public.approve_owner_test_push_target(repeat('a2', 32)),
  true,
  'an active owner can approve the pending challenge once'
);

reset role;

select results_eq(
  $$
    select status, code_digest is null, consumed_by
    from private.test_push_pairing_challenges
    where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
      and status = 'approved'
  $$,
  $$
    values (
      'approved'::text,
      true,
      '61000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'approval immediately scrubs the digest and records the owner audit actor'
);

select results_eq(
  $$
    select app_variant_snapshot, approved_by, revoked_at is null
    from private.owner_test_push_targets
    where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'development'::text,
      '61000000-0000-4000-8000-000000000001'::uuid,
      true
    )
  $$,
  'approval creates one active target allowlist row with a variant snapshot'
);

set local role authenticated;

select is(
  public.approve_owner_test_push_target(repeat('a2', 32)),
  false,
  'an approved code cannot be reused'
);

select is(
  (select count(*) from public.list_owner_test_push_targets()),
  1::bigint,
  'the owner list includes only the one approved active target'
);

select is(
  (
    select count(*)
    from public.list_owner_test_push_targets() as target
    where target.display_label like '%ExpoPushToken%'
      or target.display_label like '%' || repeat('1', 64) || '%'
      or target.display_label like '%62000000-0000-4000-8000-000000000001%'
      or target.display_label like '%' || target.push_endpoint_id::text || '%'
  ),
  0::bigint,
  'the owner list label exposes no token, secret hash, installation UUID, or full endpoint UUID'
);

reset role;

-- 38: a registered build cannot change variant after approval.
select throws_ok(
  $$
    update private.app_installations
    set app_variant = 'production'
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'Installation app variant is immutable',
  'a stored development installation cannot later become production'
);

-- 39-44: inactive, expired, and retained challenge data is scrubbed and cleaned.
create temporary table preview_pairing_result on commit drop as
select public.service_create_test_push_pairing(
  '62000000-0000-4000-8000-000000000002', repeat('2', 64),
  'preview', repeat('b1', 32)
) as expires_at;

select ok(
  (select expires_at from preview_pairing_result) > statement_timestamp(),
  'a preview installation can create its own isolated pairing challenge'
);

update private.push_endpoints
set is_active = false,
    disabled_at = statement_timestamp(),
    disable_reason = 'all_subscriptions_disabled'
where id = '63000000-0000-4000-8000-000000000002';

set local role authenticated;

select is(
  public.approve_owner_test_push_target(repeat('b1', 32)),
  false,
  'an inactive endpoint returns the same false result as every unavailable code'
);

reset role;

select results_eq(
  $$
    select status, code_digest is null, consumed_by is null
    from private.test_push_pairing_challenges
    where push_endpoint_id = '63000000-0000-4000-8000-000000000002'
      and status = 'superseded'
  $$,
  $$values ('superseded'::text, true, true)$$,
  'an inactive endpoint attempt consumes the matching code and scrubs its digest'
);

update private.push_endpoints
set is_active = true,
    disabled_at = null,
    disable_reason = null
where id = '63000000-0000-4000-8000-000000000002';

update private.test_push_pairing_challenges
set created_at = statement_timestamp() - interval '1 minute'
where push_endpoint_id = '63000000-0000-4000-8000-000000000002'
  and status = 'superseded';

create temporary table expiring_preview_pairing on commit drop as
select public.service_create_test_push_pairing(
  '62000000-0000-4000-8000-000000000002', repeat('2', 64),
  'preview', repeat('b2', 32)
) as expires_at;

update private.test_push_pairing_challenges
set created_at = statement_timestamp() - interval '11 minutes',
    expires_at = statement_timestamp() - interval '1 minute'
where push_endpoint_id = '63000000-0000-4000-8000-000000000002'
  and status = 'pending';

set local role authenticated;

select is(
  public.approve_owner_test_push_target(repeat('b2', 32)),
  false,
  'an expired code returns the same false result as an unknown or reused code'
);

reset role;

select results_eq(
  $$
    select status, code_digest is null, consumed_by is null
    from private.test_push_pairing_challenges
    where push_endpoint_id = '63000000-0000-4000-8000-000000000002'
      and status = 'expired'
  $$,
  $$values ('expired'::text, true, true)$$,
  'an approval attempt commits the expired digest scrub before returning false'
);

update private.test_push_pairing_challenges
set created_at = statement_timestamp() - interval '32 days',
    expires_at = statement_timestamp() - interval '32 days' + interval '10 minutes',
    consumed_at = statement_timestamp() - interval '31 days'
where push_endpoint_id = '63000000-0000-4000-8000-000000000001'
  and status = 'superseded';

select is(
  (
    select deleted_count
    from public.service_cleanup_test_push_pairings(statement_timestamp())
  ),
  1::bigint,
  'terminal pairing audit rows are deleted after the thirty-day retention boundary'
);

-- Create a privileged legacy preview campaign while it is still unapproved.
insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key, approved_at, approved_by, queued_at
)
values (
  '64000000-0000-4000-8000-000000000001',
  'test', 'Unapproved legacy test', 'Must never become a delivery',
  'test_endpoint', '63000000-0000-4000-8000-000000000002',
  'queued', 'pairing:legacy:unapproved', statement_timestamp(),
  '61000000-0000-4000-8000-000000000001', statement_timestamp()
);

-- 43: even a privileged direct writer cannot create fresh unapproved work.
select throws_ok(
  $$
    insert into private.notification_outbox (campaign_id, dedupe_key)
    values (
      '64000000-0000-4000-8000-000000000001',
      'pairing:legacy:unapproved'
    )
  $$,
  '23514',
  'Test outbox requires an approved active non-production target',
  'the table boundary rejects an unapproved test outbox'
);

-- 44-47: a paired target can be claimed, and claim is the recall boundary.
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table claimed_test_campaign on commit drop as
select public.queue_owner_test_push(
  '65000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  'development', 'Paired dev test', 'One paired device only', null
) as campaign_id;

select ok(
  (select campaign_id from claimed_test_campaign) is not null,
  'an owner can queue one paired development target'
);

reset role;

select results_eq(
  $$
    select claim.push_endpoint_id
    from public.service_claim_notification_outbox('pairing-approved-worker', 1) as claim
    where claim.delivery_id is not null
  $$,
  $$values ('63000000-0000-4000-8000-000000000001'::uuid)$$,
  'the guarded worker claim creates one delivery for the paired endpoint'
);

set local role authenticated;

select lives_ok(
  $$select public.revoke_owner_test_push_target('63000000-0000-4000-8000-000000000001')$$,
  'the owner can revoke the development target after claim'
);

reset role;

select results_eq(
  $$
    select campaign.status, outbox.status, approved_target.revoked_at is not null
    from claimed_test_campaign as queued
    join private.notification_campaigns as campaign on campaign.id = queued.campaign_id
    join private.notification_outbox as outbox on outbox.campaign_id = campaign.id
    join private.owner_test_push_targets as approved_target
      on approved_target.push_endpoint_id = campaign.test_push_endpoint_id
  $$,
  $$values ('processing'::text, 'processing'::text, true)$$,
  'revocation cannot recall work after the worker has atomically claimed it'
);

-- 48-53: revoke before claim cancels queued work and the worker returns nothing.
update private.test_push_pairing_challenges
set created_at = statement_timestamp() - interval '11 minutes'
where push_endpoint_id = '63000000-0000-4000-8000-000000000002'
  and status = 'expired';

create temporary table repaired_preview_pairing on commit drop as
select public.service_create_test_push_pairing(
  '62000000-0000-4000-8000-000000000002', repeat('2', 64),
  'preview', repeat('b3', 32)
) as expires_at;

select ok(
  (select expires_at from repaired_preview_pairing) > statement_timestamp(),
  'the preview device can create a new code after the expired challenge'
);

set local role authenticated;

select is(
  public.approve_owner_test_push_target(repeat('b3', 32)),
  true,
  'the owner can approve the new preview challenge'
);

create temporary table revoked_before_claim_campaign on commit drop as
select public.queue_owner_test_push(
  '65000000-0000-4000-8000-000000000002',
  '63000000-0000-4000-8000-000000000002',
  'preview', 'Paired preview test', 'Revoke before claim', null
) as campaign_id;

select ok(
  (select campaign_id from revoked_before_claim_campaign) is not null,
  'the owner can queue the newly paired preview target'
);

select lives_ok(
  $$select public.revoke_owner_test_push_target('63000000-0000-4000-8000-000000000002')$$,
  'the owner can revoke the preview target before claim'
);

reset role;

select results_eq(
  $$
    select campaign.status, outbox.status, outbox.last_error_code
    from revoked_before_claim_campaign as queued
    join private.notification_campaigns as campaign on campaign.id = queued.campaign_id
    join private.notification_outbox as outbox on outbox.campaign_id = campaign.id
  $$,
  $$values ('cancelled'::text, 'cancelled'::text, 'TEST_TARGET_REVOKED'::text)$$,
  'revoke-before-claim atomically cancels the queued campaign and pending outbox'
);

select is(
  (
    select count(*)
    from public.service_claim_notification_outbox('pairing-revoked-worker', 1)
  ),
  0::bigint,
  'the worker claims no delivery for a target revoked before claim'
);

-- 54-56: the wrapper cancels legacy poison rows and the delivery trigger is a
-- final defense against a direct claim bypass.
alter table private.notification_outbox
disable trigger notification_outbox_test_target_guard;
insert into private.notification_outbox (campaign_id, dedupe_key)
values (
  '64000000-0000-4000-8000-000000000001',
  'pairing:legacy:unapproved'
);
alter table private.notification_outbox
enable trigger notification_outbox_test_target_guard;

select is(
  (
    select count(*)
    from public.service_claim_notification_outbox('pairing-legacy-worker', 1)
  ),
  0::bigint,
  'the guarded wrapper does not return an unapproved legacy target'
);

select results_eq(
  $$
    select campaign.status, outbox.status, outbox.last_error_code
    from private.notification_campaigns as campaign
    join private.notification_outbox as outbox on outbox.campaign_id = campaign.id
    where campaign.id = '64000000-0000-4000-8000-000000000001'
  $$,
  $$values ('cancelled'::text, 'cancelled'::text, 'TEST_TARGET_NOT_APPROVED'::text)$$,
  'the guarded wrapper cancels an unapproved legacy campaign without poisoning worker retries'
);

select is(
  (
    select count(*)
    from (
      select regexp_replace(
        lower(pg_get_functiondef(function_oid)),
        '[[:space:]]+',
        ' ',
        'g'
      ) as definition
      from unnest(array[
        'private.enforce_test_outbox_owner_approval()'::regprocedure,
        'private.enforce_test_delivery_owner_approval()'::regprocedure,
        'public.service_claim_notification_outbox(text,integer)'::regprocedure,
        'public.approve_owner_test_push_target(text)'::regprocedure,
        'public.revoke_owner_test_push_target(uuid)'::regprocedure,
        'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
      ]) as function_oid
    ) as function_source
    where function_source.definition ~
      'from private\.app_installations as installation [^;]*for update;.*from private\.push_endpoints as endpoint [^;]*for update;.*from private\.owner_test_push_targets as approved_target [^;]*for update;'
      and position(
        'pg_advisory_xact_lock(731904, 1)'
        in function_source.definition
      ) > 0
  ),
  6::bigint,
  'all owner queue, claim, revoke, and final guards use one gate and explicit installation then endpoint then approval row locks'
);

select ok(
  regexp_replace(
    lower(pg_get_functiondef(
      'public.service_create_test_push_pairing(uuid,text,text,text)'::regprocedure
    )),
    '[[:space:]]+',
    ' ',
    'g'
  ) ~
    'from private\.app_installations as installation [^;]*for update;.*from private\.push_endpoints as endpoint [^;]*for update;',
  'pairing creation explicitly locks installation before endpoint and challenge mutation'
);

select is(
  (
    select count(*)
    from unnest(array[
      'private.enforce_test_outbox_owner_approval()'::regprocedure,
      'private.enforce_test_delivery_owner_approval()'::regprocedure,
      'public.service_claim_notification_outbox(text,integer)'::regprocedure,
      'public.service_create_test_push_pairing(uuid,text,text,text)'::regprocedure,
      'public.approve_owner_test_push_target(text)'::regprocedure,
      'public.revoke_owner_test_push_target(uuid)'::regprocedure,
      'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
    ]) as function_oid
    where lower(pg_get_functiondef(function_oid)) like '%for update of%'
  ),
  0::bigint,
  'test-push functions do not rely on planner-dependent multi-table row locks'
);

select is(
  (
    select count(*)
    from pg_trigger as trigger
    where trigger.tgrelid in (
      'private.notification_outbox'::regclass,
      'private.notification_deliveries'::regclass
    )
      and trigger.tgname in (
        'notification_outbox_test_target_guard',
        'notification_deliveries_test_target_guard'
      )
      and trigger.tgtype = 7
  ),
  2::bigint,
  'approval guards are row-level BEFORE INSERT only and never lock targets after an updated row'
);

select is(
  (
    select count(*)
    from pg_trigger as trigger
    where trigger.tgrelid in (
      'private.notification_outbox'::regclass,
      'private.notification_deliveries'::regclass
    )
      and trigger.tgname in (
        'notification_outbox_campaign_immutable',
        'notification_delivery_route_immutable'
      )
      and trigger.tgtype = 19
  ),
  2::bigint,
  'routing immutability is enforced by row-level BEFORE UPDATE triggers'
);

select is(
  (
    select count(*)
    from unnest(array[
      'private.prevent_notification_outbox_campaign_change()'::regprocedure,
      'private.prevent_notification_delivery_route_change()'::regprocedure
    ]) as function_oid
    where lower(pg_get_functiondef(function_oid)) not like '%pg_advisory%'
      and lower(pg_get_functiondef(function_oid)) not like '%private.app_installations%'
      and lower(pg_get_functiondef(function_oid)) not like '%private.push_endpoints%'
      and lower(pg_get_functiondef(function_oid)) not like '%private.owner_test_push_targets%'
  ),
  2::bigint,
  'UPDATE immutability triggers fail fast without advisory or cross-table row locks'
);

select ok(
  regexp_replace(
    lower(pg_get_functiondef(
      'public.service_claim_notification_outbox(text,integer)'::regprocedure
    )),
    '[[:space:]]+',
    ' ',
    'g'
  ) ~
    'from private\.owner_test_push_targets as approved_target [^;]*for update;.*update private\.notification_outbox.*private\.claim_notification_outbox_core',
  'the claim wrapper locks target eligibility before outbox cancellation and the core claim'
);

select throws_ok(
  $$
    insert into private.notification_deliveries (
      campaign_id, push_endpoint_id, attempt_no, status
    ) values (
      '64000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000002',
      1, 'queued'
    )
  $$,
  '23514',
  'Test delivery requires an approved active non-production target',
  'the delivery table rechecks the allowlist immediately before provider work'
);

select throws_ok(
  $$
    update private.notification_campaigns
    set kind = 'schedule_change',
        audience_kind = 'schedule_changes',
        test_push_endpoint_id = null
    where id = '64000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'Test campaign routing is immutable',
  'a privileged writer cannot cross from a test campaign into a non-test route'
);

select throws_ok(
  $$
    update private.notification_campaigns
    set test_push_endpoint_id = '63000000-0000-4000-8000-000000000001'
    where id = '64000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'Test campaign routing is immutable',
  'a privileged writer cannot retarget a terminal test campaign from endpoint A to B'
);

select throws_ok(
  $$
    update private.notification_campaigns
    set test_push_endpoint_id = null
    where id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Test campaign routing is immutable',
  'a non-terminal test campaign cannot detach its endpoint'
);

select throws_ok(
  $$
    update private.notification_outbox
    set campaign_id = '64000000-0000-4000-8000-000000000001'
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Notification outbox campaign is immutable',
  'an outbox row cannot be reassigned after its own row lock is taken'
);

select throws_ok(
  $$
    update private.notification_deliveries
    set campaign_id = '64000000-0000-4000-8000-000000000001'
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Notification delivery campaign is immutable',
  'a delivery row cannot be reassigned to another campaign'
);

select throws_ok(
  $$
    update private.notification_deliveries
    set push_endpoint_id = '63000000-0000-4000-8000-000000000002'
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Notification delivery endpoint is immutable',
  'a delivery endpoint cannot be changed from A to B'
);

select throws_ok(
  $$
    update private.notification_deliveries
    set push_endpoint_id = null
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Notification delivery endpoint is immutable',
  'a non-terminal delivery cannot detach its endpoint'
);

select lives_ok(
  $$
    update private.notification_campaigns
    set test_push_endpoint_id = null
    where id = (select campaign_id from revoked_before_claim_campaign)
  $$,
  'terminal test campaign history may detach its endpoint for retention'
);

select throws_ok(
  $$
    update private.notification_campaigns
    set test_push_endpoint_id = '63000000-0000-4000-8000-000000000002'
    where id = (select campaign_id from revoked_before_claim_campaign)
  $$,
  '23514',
  'Test campaign routing is immutable',
  'detached terminal campaign history cannot be reattached to an endpoint'
);

update private.notification_deliveries
set status = 'failed',
    failed_at = statement_timestamp()
where campaign_id = (select campaign_id from claimed_test_campaign);

select lives_ok(
  $$
    update private.notification_deliveries
    set push_endpoint_id = null
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  'terminal delivery history may detach its endpoint for retention'
);

select throws_ok(
  $$
    update private.notification_deliveries
    set push_endpoint_id = '63000000-0000-4000-8000-000000000001'
    where campaign_id = (select campaign_id from claimed_test_campaign)
  $$,
  '23514',
  'Notification delivery endpoint is immutable',
  'detached terminal delivery history cannot be reattached to an endpoint'
);

select * from finish();
rollback;
