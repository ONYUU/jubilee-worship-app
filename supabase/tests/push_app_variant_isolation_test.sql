begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

select has_column(
  'private', 'app_installations', 'app_variant',
  'installations store the Expo build variant'
);

select ok(
  (
    select column_row.is_nullable = 'NO'
    from information_schema.columns as column_row
    where column_row.table_schema = 'private'
      and column_row.table_name = 'app_installations'
      and column_row.column_name = 'app_variant'
  ),
  'installation app_variant is required'
);

select ok(
  (
    select column_row.column_default is null
    from information_schema.columns as column_row
    where column_row.table_schema = 'private'
      and column_row.table_name = 'app_installations'
      and column_row.column_name = 'app_variant'
  ),
  'new installations cannot silently default to production'
);

select ok(
  (
    select pg_get_constraintdef(constraint_row.oid)
    from pg_constraint as constraint_row
    where constraint_row.conname = 'app_installations_app_variant_valid'
      and constraint_row.conrelid = 'private.app_installations'::regclass
  ) like '%development%preview%production%',
  'the database constrains app_variant to the three Expo environments'
);

select ok(
  to_regprocedure(
    'public.service_register_app_installation(uuid,text,text,text,text,text,boolean,boolean,boolean)'
  ) is null,
  'the pre-variant registration RPC overload is removed'
);

select ok(
  to_regprocedure(
    'public.service_update_app_installation(uuid,text,text,text,text,boolean,boolean,boolean)'
  ) is null,
  'the pre-variant update RPC overload is removed'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_register_app_installation(uuid,text,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ) is false,
  'the legacy service registration RPC is revoked during the direct-v2 cutover'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_register_app_installation(uuid,text,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'anon cannot execute variant-aware registration'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_register_app_installation(uuid,text,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'authenticated cannot execute variant-aware registration'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_update_app_installation(uuid,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ) is false,
  'the legacy service update RPC is revoked during the direct-v2 cutover'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_update_app_installation(uuid,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'anon cannot execute variant-aware installation updates'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_update_app_installation(uuid,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'authenticated cannot execute variant-aware installation updates'
);

select throws_ok(
  $$
    insert into private.app_installations (
      id, secret_hash, platform, app_version
    ) values (
      '71000000-0000-4000-8000-000000000004', repeat('4', 64), 'ios', '1.0.0'
    )
  $$,
  '23502',
  null,
  'direct installation inserts cannot omit app_variant'
);

select throws_ok(
  $$
    insert into private.app_installations (
      id, secret_hash, platform, app_version, app_variant
    ) values (
      '71000000-0000-4000-8000-000000000005', repeat('5', 64),
      'ios', '1.0.0', 'staging'
    )
  $$,
  '23514',
  null,
  'direct installation inserts reject unknown app variants'
);

select throws_ok(
  $$
    select public.service_register_app_installation(
      '71000000-0000-4000-8000-000000000006', repeat('6', 64),
      'ios', '1.0.0', 'staging',
      'sensitive-interest-notifications-v2',
      true,
      'ExpoPushToken[variant_invalid]', repeat('6', 64), true, true, true
    )
  $$,
  '22023',
  'Valid app variant is required',
  'the registration RPC rejects unknown app variants'
);

select lives_ok(
  $$
    select public.service_register_app_installation(
      '71000000-0000-4000-8000-000000000001', repeat('1', 64),
      'ios', '1.0.0', 'production',
      'sensitive-interest-notifications-v2',
      true,
      'ExpoPushToken[variant_production]', repeat('a', 64), true, true, true
    )
  $$,
  'a production installation can register'
);

select lives_ok(
  $$
    select public.service_register_app_installation(
      '71000000-0000-4000-8000-000000000002', repeat('2', 64),
      'ios', '1.0.0', 'preview',
      'sensitive-interest-notifications-v2',
      true,
      'ExpoPushToken[variant_preview]', repeat('b', 64), true, true, true
    )
  $$,
  'a preview installation can register separately'
);

select lives_ok(
  $$
    select public.service_register_app_installation(
      '71000000-0000-4000-8000-000000000003', repeat('3', 64),
      'android', '1.0.0', 'development',
      'sensitive-interest-notifications-v2',
      true,
      'ExpoPushToken[variant_development]', repeat('c', 64), true, true, true
    )
  $$,
  'a development installation can register separately'
);

select results_eq(
  $$
    select id, app_variant
    from private.app_installations
    where id::text like '71000000-0000-4000-8000-00000000000%'
    order by app_variant
  $$,
  $$
    values
      ('71000000-0000-4000-8000-000000000003'::uuid, 'development'::text),
      ('71000000-0000-4000-8000-000000000002'::uuid, 'preview'::text),
      ('71000000-0000-4000-8000-000000000001'::uuid, 'production'::text)
  $$,
  'each installation retains its declared build variant'
);

select throws_ok(
  $$
    select public.service_update_app_installation(
      '71000000-0000-4000-8000-000000000002', repeat('2', 64),
      '1.0.1', 'production', 'sensitive-interest-notifications-v2',
      true,
      null, null, true, true, true
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'an installation credential cannot switch app variants'
);

select lives_ok(
  $$
    select public.service_update_app_installation(
      '71000000-0000-4000-8000-000000000002', repeat('2', 64),
      '1.0.1', 'preview', 'sensitive-interest-notifications-v2',
      true,
      null, null, true, true, true
    )
  $$,
  'an installation can update within its registered variant'
);

select is(
  public.service_resolve_push_endpoint(
    '71000000-0000-4000-8000-000000000002', repeat('2', 64)
  ),
  (
    select endpoint.id
    from private.push_endpoints as endpoint
    where endpoint.installation_id = '71000000-0000-4000-8000-000000000002'
  ),
  'the owner test-push lookup can resolve a preview endpoint'
);

insert into auth.users (id, email)
values ('71111111-1111-4111-8111-111111111111', 'variant-owner@example.invalid');

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, status, dedupe_key,
  approved_at, approved_by, queued_at
)
values (
  '72000000-0000-4000-8000-000000000001',
  'schedule_change', 'Production notice', 'Production audience only',
  'all_opted_in', 'queued', 'variant:generic:production-only',
  statement_timestamp(), '71111111-1111-4111-8111-111111111111', statement_timestamp()
);

insert into private.notification_outbox (campaign_id, dedupe_key)
values (
  '72000000-0000-4000-8000-000000000001',
  'variant:generic:production-only'
);

select results_eq(
  $$
    select claim.push_endpoint_id
    from public.service_claim_notification_outbox('variant-generic-worker', 1) as claim
    where claim.delivery_id is not null
  $$,
  $$
    select endpoint.id
    from private.push_endpoints as endpoint
    where endpoint.installation_id = '71000000-0000-4000-8000-000000000001'
  $$,
  'a general campaign claim includes only the production endpoint'
);

select is(
  (
    select count(*)
    from private.notification_deliveries as delivery
    join private.app_installations as installation
      on installation.id = (
        select endpoint.installation_id
        from private.push_endpoints as endpoint
        where endpoint.id = delivery.push_endpoint_id
      )
    where delivery.campaign_id = '72000000-0000-4000-8000-000000000001'
      and installation.app_variant <> 'production'
  ),
  0::bigint,
  'general campaigns persist no non-production deliveries'
);

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values (
  'variant-worship-event', 'Variant worship event',
  statement_timestamp() + interval '1 hour', 'Asia/Seoul',
  '선두교회 본당', '인천광역시 서구', 'scheduled', true
);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, event_id, status, dedupe_key,
  approved_at, approved_by
)
values (
  '72000000-0000-4000-8000-000000000002',
  'worship_reminder', 'Worship reminder', 'Production worship audience only',
  'worship_reminder',
  (select id from public.events where slug = 'variant-worship-event'),
  'approved', 'variant:worship:production-only',
  statement_timestamp(), '71111111-1111-4111-8111-111111111111'
);

insert into private.worship_reminder_schedules (
  campaign_id, event_id, reminder_slot, event_starts_at_snapshot, scheduled_for
)
select
  '72000000-0000-4000-8000-000000000002',
  event.id,
  'one_hour_before',
  event.starts_at,
  private.worship_reminder_scheduled_for(event.starts_at, 'one_hour_before')
from public.events as event
where event.slug = 'variant-worship-event';

update private.notification_campaigns
set status = 'queued',
    queued_at = statement_timestamp()
where id = '72000000-0000-4000-8000-000000000002';

insert into private.notification_outbox (campaign_id, dedupe_key)
values (
  '72000000-0000-4000-8000-000000000002',
  'variant:worship:production-only'
);

select results_eq(
  $$
    select claim.push_endpoint_id
    from public.service_claim_notification_outbox('variant-worship-worker', 1) as claim
    where claim.delivery_id is not null
  $$,
  $$
    select endpoint.id
    from private.push_endpoints as endpoint
    where endpoint.installation_id = '71000000-0000-4000-8000-000000000001'
  $$,
  'a worship campaign claim includes only the production endpoint'
);

select is(
  (
    select count(*)
    from private.notification_deliveries as delivery
    join private.push_endpoints as endpoint on endpoint.id = delivery.push_endpoint_id
    join private.app_installations as installation on installation.id = endpoint.installation_id
    where delivery.campaign_id = '72000000-0000-4000-8000-000000000002'
      and installation.app_variant <> 'production'
  ),
  0::bigint,
  'worship campaigns persist no non-production deliveries'
);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key, approved_at, approved_by, queued_at
)
select
  '72000000-0000-4000-8000-000000000003',
  'test', 'Preview test push', 'Owner-selected preview endpoint',
  'test_endpoint', endpoint.id,
  'queued', 'variant:test:preview-allowed',
  statement_timestamp(), '71111111-1111-4111-8111-111111111111', statement_timestamp()
from private.push_endpoints as endpoint
where endpoint.installation_id = '71000000-0000-4000-8000-000000000002';

-- Public registration is not test authorization.  This fixture represents the
-- separate owner-pairing approval whose detailed contract is tested in the
-- owner test-push suite.
insert into private.owner_test_push_targets (
  push_endpoint_id, app_variant_snapshot, approved_by, approved_at
)
select
  endpoint.id, 'preview',
  '71111111-1111-4111-8111-111111111111', statement_timestamp()
from private.push_endpoints as endpoint
where endpoint.installation_id = '71000000-0000-4000-8000-000000000002';

insert into private.notification_outbox (campaign_id, dedupe_key)
values (
  '72000000-0000-4000-8000-000000000003',
  'variant:test:preview-allowed'
);

select results_eq(
  $$
    select claim.push_endpoint_id
    from public.service_claim_notification_outbox('variant-test-worker', 1) as claim
    where claim.delivery_id is not null
  $$,
  $$
    select endpoint.id
    from private.push_endpoints as endpoint
    where endpoint.installation_id = '71000000-0000-4000-8000-000000000002'
  $$,
  'an owner-selected test campaign can claim a preview endpoint'
);

select is(
  (
    select installation.app_variant
    from private.notification_deliveries as delivery
    join private.push_endpoints as endpoint on endpoint.id = delivery.push_endpoint_id
    join private.app_installations as installation on installation.id = endpoint.installation_id
    where delivery.campaign_id = '72000000-0000-4000-8000-000000000003'
  ),
  'preview'::text,
  'the test delivery preserves the selected preview environment'
);

select ok(
  not has_table_privilege('anon', 'private.app_installations', 'SELECT'),
  'anon cannot read installation variants directly'
);

select ok(
  not has_table_privilege('authenticated', 'private.app_installations', 'SELECT'),
  'authenticated cannot read installation variants directly'
);

select ok(
  has_table_privilege('service_role', 'private.app_installations', 'SELECT'),
  'service_role retains the private installation access required by Edge RPCs'
);

select * from finish();
rollback;
