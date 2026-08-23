begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(54);

-- 1
select ok(
  to_regprocedure('public.list_owner_test_push_targets()') is not null,
  'the masked owner test-target list RPC exists'
);

-- 2
select ok(
  to_regprocedure('public.queue_owner_test_push(uuid,uuid,text,text,text,text)') is not null,
  'the atomic owner test-push queue RPC exists'
);

-- 3
select is(
  pg_get_function_result('public.list_owner_test_push_targets()'::regprocedure),
  'TABLE(push_endpoint_id uuid, app_variant text, display_label text)'::text,
  'the list RPC returns only the three approved metadata columns'
);

-- 4
select is(
  pg_get_function_identity_arguments(
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
  ),
  'target_request_id uuid, target_push_endpoint_id uuid, target_app_variant text, target_title text, target_body text, target_deep_link text'::text,
  'the queue RPC requires a request UUID, one endpoint, and an explicit app variant without a secret argument'
);

-- 5
select is(
  (
    select count(*)
    from pg_proc as procedure
    where procedure.oid in (
      'public.list_owner_test_push_targets()'::regprocedure,
      'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
    )
      and procedure.prosecdef
  ),
  2::bigint,
  'both owner test-push RPCs are security definer functions'
);

-- 6
select is(
  (
    select count(*)
    from pg_proc as procedure
    where procedure.oid in (
      'public.list_owner_test_push_targets()'::regprocedure,
      'public.queue_owner_test_push(uuid,uuid,text,text,text,text)'::regprocedure
    )
      and 'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
  ),
  2::bigint,
  'both owner test-push RPCs pin an empty search path'
);

-- 7
select ok(
  has_function_privilege(
    'authenticated',
    'public.list_owner_test_push_targets()',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated sessions may enter the internally owner-gated RPCs'
);

-- 8
select ok(
  not has_function_privilege('anon', 'public.list_owner_test_push_targets()', 'EXECUTE')
  and not has_function_privilege(
    'anon',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'anon cannot execute either owner test-push RPC'
);

-- 9
select ok(
  not has_function_privilege(
    'service_role',
    'public.list_owner_test_push_targets()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.queue_owner_test_push(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role cannot replace the user JWT owner check for either RPC'
);

-- 10
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'list_owner_test_push_targets',
        'queue_owner_test_push'
      )
      and grantee = 'PUBLIC'
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC has no implicit execute grant on the owner test-push RPCs'
);

-- 11
select is(
  (
    select count(*)
    from pg_trigger
    where tgrelid = 'private.notification_campaigns'::regclass
      and tgname = 'notification_campaigns_test_variant_guard'
      and tgenabled <> 'D'
  ),
  1::bigint,
  'the notification-campaign table has an enabled test-variant guard'
);

-- 12
select ok(
  not has_function_privilege(
    'authenticated',
    'private.enforce_test_campaign_target_variant()',
    'EXECUTE'
  ),
  'authenticated callers cannot execute the private table guard directly'
);

-- 13
select is(
  (
    select count(*)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'create_notification_campaign',
        'update_notification_campaign',
        'approve_notification_campaign',
        'queue_notification_campaign'
      )
      and procedure.prosrc like '%Use the dedicated owner test push RPC%'
  ),
  4::bigint,
  'all four generic campaign mutation RPCs reject the dedicated test-push concern'
);

-- 14
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'private'
      and table_name in (
        'app_installations',
        'push_endpoints',
        'notification_campaigns',
        'notification_outbox'
      )
      and column_name in (
        'secret_hash',
        'expo_push_token',
        'token_hash'
      )
  ),
  3::bigint,
  'the sensitive fields remain private storage fields rather than list-RPC output columns'
);

insert into auth.users (id, email)
values
  ('a1111111-1111-4111-8111-111111111111', 'test-push-owner@example.invalid'),
  ('a2222222-2222-4222-8222-222222222222', 'test-push-editor@example.invalid'),
  ('a3333333-3333-4333-8333-333333333333', 'test-push-inactive@example.invalid'),
  ('a4444444-4444-4444-8444-444444444444', 'test-push-user@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('a1111111-1111-4111-8111-111111111111', 'owner', true),
  ('a2222222-2222-4222-8222-222222222222', 'editor', true),
  ('a3333333-3333-4333-8333-333333333333', 'owner', false);

insert into private.app_installations (
  id, secret_hash, platform, app_version, app_variant, disabled_at, disable_reason
)
values
  (
    'b1111111-1111-4111-8111-111111111111', repeat('1', 64),
    'android', '1.0.1-dev', 'development', null, null
  ),
  (
    'b2222222-2222-4222-8222-222222222222', repeat('2', 64),
    'ios', '1.0.2-preview', 'preview', null, null
  ),
  (
    'b3333333-3333-4333-8333-333333333333', repeat('3', 64),
    'android', '1.0.3-prod', 'production', null, null
  ),
  (
    'b4444444-4444-4444-8444-444444444444', repeat('4', 64),
    'android', '1.0.4-disabled', 'development', statement_timestamp(), 'user_unregistered'
  ),
  (
    'b5555555-5555-4555-8555-555555555555', repeat('5', 64),
    'ios', '1.0.5-inactive', 'preview', null, null
  );

update private.app_installations
set sensitive_interest_consent_version = 'sensitive-interest-notifications-v5',
    sensitive_interest_consented_at = statement_timestamp(),
    sensitive_interest_disclosure_sha256 =
      '575ecb39ce1c1670e169e5fdae28587b09477a765a80c6dcfdb5df2f170a5f0e',
    sensitive_interest_consent_locale = 'ko-KR',
    sensitive_interest_age_14_or_over_confirmed_at = statement_timestamp(),
    test_pairing_secret_hash = secret_hash
where id::text like 'b%'
  and disabled_at is null;

insert into private.push_endpoints (
  id, installation_id, expo_push_token, token_hash, platform,
  is_active, disabled_at, disable_reason
)
values
  (
    'c1111111-1111-4111-8111-111111111111',
    'b1111111-1111-4111-8111-111111111111',
    'ExpoPushToken[test_push_dev_secret]', repeat('a', 64),
    'android', true, null, null
  ),
  (
    'c2222222-2222-4222-8222-222222222222',
    'b2222222-2222-4222-8222-222222222222',
    'ExpoPushToken[test_push_preview_secret]', repeat('b', 64),
    'ios', true, null, null
  ),
  (
    'c3333333-3333-4333-8333-333333333333',
    'b3333333-3333-4333-8333-333333333333',
    'ExpoPushToken[test_push_prod_secret]', repeat('c', 64),
    'android', true, null, null
  ),
  (
    'c4444444-4444-4444-8444-444444444444',
    'b4444444-4444-4444-8444-444444444444',
    'ExpoPushToken[test_push_disabled_installation]', repeat('d', 64),
    'android', true, null, null
  ),
  (
    'c5555555-5555-4555-8555-555555555555',
    'b5555555-5555-4555-8555-555555555555',
    'ExpoPushToken[test_push_inactive_endpoint]', repeat('e', 64),
    'ios', false, statement_timestamp(), 'all_subscriptions_disabled'
  );

-- Pairing itself has dedicated security coverage below.  This target-selection
-- contract uses explicit approved fixtures so public registration alone never
-- makes an endpoint visible or queueable.
insert into private.owner_test_push_targets (
  push_endpoint_id, app_variant_snapshot, approved_by, approved_at
)
values
  (
    'c1111111-1111-4111-8111-111111111111', 'development',
    'a1111111-1111-4111-8111-111111111111', statement_timestamp()
  ),
  (
    'c2222222-2222-4222-8222-222222222222', 'preview',
    'a1111111-1111-4111-8111-111111111111', statement_timestamp()
  );

create temporary table queued_owner_test_campaigns (
  target_label text primary key,
  campaign_id uuid not null
) on commit drop;

grant select, insert on queued_owner_test_campaigns to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 15
select is(
  (select count(*) from public.list_owner_test_push_targets()),
  2::bigint,
  'an active owner sees only the active development and preview endpoints'
);

-- 16
select results_eq(
  $$
    select push_endpoint_id
    from public.list_owner_test_push_targets()
    order by push_endpoint_id
  $$,
  $$
    values
      ('c1111111-1111-4111-8111-111111111111'::uuid),
      ('c2222222-2222-4222-8222-222222222222'::uuid)
  $$,
  'the masked list contains exactly the two eligible endpoint identifiers'
);

-- 17
select results_eq(
  $$
    select app_variant
    from public.list_owner_test_push_targets()
    order by app_variant
  $$,
  $$values ('development'::text), ('preview'::text)$$,
  'the masked list exposes only explicit non-production app variants'
);

-- 18
select is(
  (
    select count(*)
    from public.list_owner_test_push_targets() as target
    where target.display_label like '%ExpoPushToken%'
      or target.display_label like '%' || repeat('1', 64) || '%'
      or target.display_label like '%' || repeat('2', 64) || '%'
      or target.display_label like '%b1111111-1111-4111-8111-111111111111%'
      or target.display_label like '%b2222222-2222-4222-8222-222222222222%'
  ),
  0::bigint,
  'masked labels expose no token, secret hash, or installation UUID'
);

-- 19
select is(
  (
    select count(*)
    from public.list_owner_test_push_targets() as target
    where target.display_label like '%' || target.push_endpoint_id::text || '%'
  ),
  0::bigint,
  'masked labels do not repeat a full endpoint UUID'
);

-- 20
select is(
  (
    select count(*)
    from public.list_owner_test_push_targets() as target
    where target.display_label like '%…111111%앱 1.0.1-dev%'
      or target.display_label like '%…222222%앱 1.0.2-preview%'
  ),
  2::bigint,
  'masked labels retain only a short endpoint suffix and useful app version'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 21
select throws_ok(
  $$select * from public.list_owner_test_push_targets()$$,
  '42501',
  'Active owner access required',
  'an editor cannot list test-push targets'
);

-- 22
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000022',
      'c1111111-1111-4111-8111-111111111111', 'development',
      'Blocked editor test', 'Blocked body', null
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot queue a test push'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

-- 23
select throws_ok(
  $$select * from public.list_owner_test_push_targets()$$,
  '42501',
  'Active owner access required',
  'a non-admin authenticated user cannot list test-push targets'
);

-- 24
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000024',
      'c1111111-1111-4111-8111-111111111111', 'development',
      'Blocked user test', 'Blocked body', null
    )
  $$,
  '42501',
  'Active owner access required',
  'a non-admin authenticated user cannot queue a test push'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

-- 25
select throws_ok(
  $$select * from public.list_owner_test_push_targets()$$,
  '42501',
  'Active owner access required',
  'an inactive owner cannot list test-push targets'
);

-- 26
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000026',
      'c1111111-1111-4111-8111-111111111111', 'development',
      'Blocked inactive owner test', 'Blocked body', null
    )
  $$,
  '42501',
  'Active owner access required',
  'an inactive owner cannot queue a test push'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 27
select throws_ok(
  $$select public.queue_owner_test_push('e0000000-0000-4000-8000-000000000027', null, 'development', 'Invalid', 'Invalid', null)$$,
  '22004',
  'Test push request and endpoint are required',
  'the queue RPC requires a target endpoint'
);

-- 28
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000028',
      'c3333333-3333-4333-8333-333333333333', 'production',
      'Invalid', 'Invalid', null
    )
  $$,
  '22023',
  'Test push app variant must be development or preview',
  'the queue RPC explicitly rejects the production variant'
);

-- 29
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000029',
      'c1111111-1111-4111-8111-111111111111', null,
      'Invalid', 'Invalid', null
    )
  $$,
  '22023',
  'Test push app variant must be development or preview',
  'the queue RPC rejects a missing variant'
);

-- 30
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000030',
      'c1111111-1111-4111-8111-111111111111', 'staging',
      'Invalid', 'Invalid', null
    )
  $$,
  '22023',
  'Test push app variant must be development or preview',
  'the queue RPC rejects an unsupported variant'
);

-- 31
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000031',
      'c1111111-1111-4111-8111-111111111111', 'preview',
      'Invalid', 'Invalid', null
    )
  $$,
  'P0002',
  'Approved active test push endpoint does not exist',
  'an endpoint and variant mismatch is hidden behind one unavailable-target error'
);

-- 32
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000032',
      'c4444444-4444-4444-8444-444444444444', 'development',
      'Invalid', 'Invalid', null
    )
  $$,
  'P0002',
  'Approved active test push endpoint does not exist',
  'an endpoint attached to a disabled installation is unavailable'
);

-- 33
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000033',
      'c5555555-5555-4555-8555-555555555555', 'preview',
      'Invalid', 'Invalid', null
    )
  $$,
  'P0002',
  'Approved active test push endpoint does not exist',
  'an inactive endpoint is unavailable'
);

-- 34
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000034',
      'c3333333-3333-4333-8333-333333333333', 'development',
      'Invalid', 'Invalid', null
    )
  $$,
  'P0002',
  'Approved active test push endpoint does not exist',
  'a production endpoint cannot be disguised as a development endpoint'
);

-- 35
reset role;

select results_eq(
  $$
    select
      (select count(*) from private.notification_campaigns)::bigint,
      (select count(*) from private.notification_outbox)::bigint
  $$,
  $$values (0::bigint, 0::bigint)$$,
  'all rejected queue attempts leave both campaign and outbox storage empty'
);

set local role authenticated;

-- 36
select throws_ok(
  $$
    select public.create_notification_campaign(
      'test', 'Bypass', 'Bypass body', null, 'test_endpoint', null,
      'c1111111-1111-4111-8111-111111111111', 'bypass:test:create'
    )
  $$,
  '23514',
  'Use the dedicated owner test push RPC',
  'the generic campaign create RPC cannot bypass the owner test-push path'
);

reset role;

-- 37
select throws_ok(
  $$
    insert into private.notification_campaigns (
      id, kind, title, body, audience_kind, test_push_endpoint_id,
      status, dedupe_key
    ) values (
      'd3333333-3333-4333-8333-333333333333',
      'test', 'Production bypass', 'Production bypass body',
      'test_endpoint', 'c3333333-3333-4333-8333-333333333333',
      'draft', 'bypass:test:production'
    )
  $$,
  '23514',
  'Test campaigns require a non-production endpoint',
  'the table guard rejects a production test target even for a privileged direct insert'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 38
select lives_ok(
  $$
    insert into queued_owner_test_campaigns (target_label, campaign_id)
    values (
      'development',
      public.queue_owner_test_push(
        'e0000000-0000-4000-8000-000000000038',
        'c1111111-1111-4111-8111-111111111111',
        'development',
        '개발 시험 알림',
        '개발 시험 본문',
        'jubileeworship://worship'
      )
    )
  $$,
  'an active owner can atomically queue one development test push'
);

reset role;

-- 39
select results_eq(
  $$
    select
      campaign.kind,
      campaign.audience_kind,
      campaign.event_id,
      campaign.test_push_endpoint_id,
      campaign.status
    from private.notification_campaigns as campaign
    join queued_owner_test_campaigns as queued on queued.campaign_id = campaign.id
    where queued.target_label = 'development'
  $$,
  $$
    values (
      'test'::text,
      'test_endpoint'::text,
      null::bigint,
      'c1111111-1111-4111-8111-111111111111'::uuid,
      'queued'::text
    )
  $$,
  'the development request creates the fixed single-target queued campaign shape'
);

-- 40
select results_eq(
  $$
    select
      campaign.approved_by,
      campaign.approved_at is not null,
      campaign.queued_at is not null,
      campaign.dedupe_key = 'test-request:'
        || replace(campaign.approved_by::text, '-', '')
        || ':e0000000-0000-4000-8000-000000000038'
    from private.notification_campaigns as campaign
    join queued_owner_test_campaigns as queued on queued.campaign_id = campaign.id
    where queued.target_label = 'development'
  $$,
  $$
    values (
      'a1111111-1111-4111-8111-111111111111'::uuid,
      true,
      true,
      true
    )
  $$,
  'the server fixes approval metadata and a non-caller-controlled dedupe key'
);

-- 41
select results_eq(
  $$
    select outbox.status, outbox.dedupe_key = campaign.dedupe_key
    from private.notification_outbox as outbox
    join private.notification_campaigns as campaign on campaign.id = outbox.campaign_id
    join queued_owner_test_campaigns as queued on queued.campaign_id = campaign.id
    where queued.target_label = 'development'
  $$,
  $$values ('pending'::text, true)$$,
  'the development campaign has exactly one matching pending outbox row'
);

-- 42
select is(
  (
    select count(*)
    from private.notification_deliveries as delivery
    join queued_owner_test_campaigns as queued on queued.campaign_id = delivery.campaign_id
  ),
  0::bigint,
  'queueing a test campaign does not claim or externally send a delivery'
);

set local role authenticated;

select is(
  public.queue_owner_test_push(
    'e0000000-0000-4000-8000-000000000038',
    'c1111111-1111-4111-8111-111111111111',
    'development',
    '개발 시험 알림',
    '개발 시험 본문',
    'jubileeworship://worship'
  ),
  (
    select campaign_id
    from queued_owner_test_campaigns
    where target_label = 'development'
  ),
  'an exact request UUID retry returns the original campaign'
);

reset role;

select results_eq(
  $$
    select
      (select count(*) from private.notification_campaigns where kind = 'test')::bigint,
      (select count(*) from private.notification_outbox)::bigint
  $$,
  $$values (1::bigint, 1::bigint)$$,
  'an exact idempotent retry creates no extra campaign or outbox row'
);

set local role authenticated;

select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000038',
      'c1111111-1111-4111-8111-111111111111',
      'development',
      '다른 제목',
      '개발 시험 본문',
      'jubileeworship://worship'
    )
  $$,
  '23505',
  'Test push request id conflicts with an existing request',
  'a replay with different payload fails closed'
);

-- 43
select lives_ok(
  $$
    insert into queued_owner_test_campaigns (target_label, campaign_id)
    values (
      'preview',
      public.queue_owner_test_push(
        'e0000000-0000-4000-8000-000000000043',
        'c2222222-2222-4222-8222-222222222222',
        'preview',
        '미리보기 시험 알림',
        '미리보기 시험 본문',
        null
      )
    )
  $$,
  'an active owner can atomically queue one preview test push'
);

reset role;

-- 44
select is(
  (
    select count(*)
    from private.notification_campaigns
    where kind = 'test'
      and audience_kind = 'test_endpoint'
      and status = 'queued'
  ),
  2::bigint,
  'development and preview requests create exactly two queued test campaigns'
);

-- 45
select is(
  (
    select count(*)
    from private.notification_outbox
    where status = 'pending'
  ),
  2::bigint,
  'development and preview requests create exactly two pending outbox rows'
);

-- 46
select results_eq(
  $$
    select installation.app_variant
    from private.notification_campaigns as campaign
    join private.push_endpoints as endpoint on endpoint.id = campaign.test_push_endpoint_id
    join private.app_installations as installation on installation.id = endpoint.installation_id
    where campaign.kind = 'test'
    order by installation.app_variant
  $$,
  $$values ('development'::text), ('preview'::text)$$,
  'queued test campaigns are globally limited to development and preview installations'
);

create function pg_temp.fail_owner_test_outbox_insert()
returns trigger
language plpgsql
as $$
begin
  raise exception 'forced owner test outbox failure';
end;
$$;

create trigger force_owner_test_outbox_failure
before insert on private.notification_outbox
for each row execute function pg_temp.fail_owner_test_outbox_insert();

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 47
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'e0000000-0000-4000-8000-000000000047',
      'c1111111-1111-4111-8111-111111111111', 'development',
      '원자성 시험', 'outbox 실패 시 캠페인도 롤백', null
    )
  $$,
  'P0001',
  'forced owner test outbox failure',
  'an outbox insert failure aborts the atomic queue RPC'
);

reset role;

-- 48
select results_eq(
  $$
    select
      (select count(*) from private.notification_campaigns where kind = 'test')::bigint,
      (select count(*) from private.notification_outbox)::bigint
  $$,
  $$values (2::bigint, 2::bigint)$$,
  'a failed outbox insert leaves no partial campaign or outbox row'
);

drop trigger force_owner_test_outbox_failure on private.notification_outbox;

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key
)
values (
  'd1111111-1111-4111-8111-111111111111',
  'test', 'Legacy draft test', 'Legacy draft test body',
  'test_endpoint', 'c1111111-1111-4111-8111-111111111111',
  'draft', 'legacy:test:draft'
);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key, approved_at, approved_by
)
values (
  'd2222222-2222-4222-8222-222222222222',
  'test', 'Legacy approved test', 'Legacy approved test body',
  'test_endpoint', 'c2222222-2222-4222-8222-222222222222',
  'approved', 'legacy:test:approved', statement_timestamp(),
  'a1111111-1111-4111-8111-111111111111'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 49
select throws_ok(
  $$
    select public.update_notification_campaign(
      'd1111111-1111-4111-8111-111111111111',
      'test', 'Changed', 'Changed body', null, 'test_endpoint', null,
      'c1111111-1111-4111-8111-111111111111', 'legacy:test:draft:changed'
    )
  $$,
  '23514',
  'Use the dedicated owner test push RPC',
  'the generic update RPC cannot mutate a legacy test draft'
);

-- 50
select throws_ok(
  $$select public.approve_notification_campaign('d1111111-1111-4111-8111-111111111111')$$,
  '23514',
  'Use the dedicated owner test push RPC',
  'the generic approve RPC cannot approve a legacy test draft'
);

-- 51
select throws_ok(
  $$select public.queue_notification_campaign('d2222222-2222-4222-8222-222222222222')$$,
  '23514',
  'Use the dedicated owner test push RPC',
  'the generic queue RPC cannot queue a legacy approved test campaign'
);

select * from finish();
rollback;
