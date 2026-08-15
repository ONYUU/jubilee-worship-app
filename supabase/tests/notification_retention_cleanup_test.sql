begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'private.notification_dedupe_tombstones'::regclass
  ),
  'notification dedupe tombstones have RLS enabled'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'notification_dedupe_tombstones'
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  0::bigint,
  'no API role can read or mutate dedupe tombstones directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_cleanup_notification_data(timestamptz,integer)',
    'EXECUTE'
  ),
  'service_role can execute notification cleanup'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.service_cleanup_notification_data(timestamptz,integer)',
    'EXECUTE'
  ),
  'anon cannot execute notification cleanup'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_cleanup_notification_data(timestamptz,integer)',
    'EXECUTE'
  ),
  'authenticated callers cannot execute notification cleanup'
);

select is(
  (
    select constraint_row.confdeltype
    from pg_constraint as constraint_row
    where constraint_row.conname = 'notification_campaigns_test_push_endpoint_id_fkey'
      and constraint_row.conrelid = 'private.notification_campaigns'::regclass
  ),
  'n'::"char",
  'terminal test campaigns detach when an endpoint is deleted'
);

select is(
  (
    select constraint_row.confdeltype
    from pg_constraint as constraint_row
    where constraint_row.conname = 'notification_deliveries_push_endpoint_id_fkey'
      and constraint_row.conrelid = 'private.notification_deliveries'::regclass
  ),
  'n'::"char",
  'terminal deliveries detach when an endpoint is deleted'
);

select ok(
  (
    select column_row.is_nullable = 'YES'
    from information_schema.columns as column_row
    where column_row.table_schema = 'private'
      and column_row.table_name = 'notification_deliveries'
      and column_row.column_name = 'push_endpoint_id'
  ),
  'delivery endpoint references can be cleared after terminal delivery'
);

select ok(
  exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conname = 'notification_deliveries_terminal_endpoint_valid'
      and constraint_row.conrelid = 'private.notification_deliveries'::regclass
  ),
  'delivery endpoint detachment is constrained to terminal states'
);

select ok(
  (
    select column_row.is_nullable = 'YES'
    from information_schema.columns as column_row
    where column_row.table_schema = 'private'
      and column_row.table_name = 'push_endpoints'
      and column_row.column_name = 'expo_push_token'
  ),
  'inactive endpoint rows can release the raw provider token before row deletion'
);

select ok(
  (
    select column_row.is_nullable = 'YES'
    from information_schema.columns as column_row
    where column_row.table_schema = 'private'
      and column_row.table_name = 'push_endpoints'
      and column_row.column_name = 'token_hash'
  ),
  'inactive endpoint rows can release the stable token hash with the raw token'
);

select ok(
  exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conname = 'push_endpoints_token_state_valid'
      and constraint_row.conrelid = 'private.push_endpoints'::regclass
  ),
  'active endpoints are constrained to retain both token values'
);

select is(
  (
    select count(*)
    from pg_indexes
    where schemaname = 'private'
      and indexname in (
        'app_installations_stale_cleanup_idx',
        'app_installations_disabled_cleanup_idx',
        'push_endpoints_disabled_cleanup_idx',
        'notification_deliveries_terminal_cleanup_idx',
        'notification_outbox_terminal_cleanup_idx',
        'notification_campaigns_terminal_cleanup_idx'
      )
  ),
  6::bigint,
  'all retention cleanup paths have supporting indexes'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'jubilee-notification-retention-daily'
  $$,
  $$
    values (
      '17 18 * * *'::text,
      'select public.service_cleanup_notification_data(statement_timestamp(), 5000)'::text
    )
  $$,
  'a daily 03:17 KST cleanup job calls the database RPC without a stored secret'
);

select set_config('jubilee.cleanup_now', statement_timestamp()::text, true);

insert into auth.users (id, email)
values (
  '90000000-0000-4000-8000-000000000001',
  'retention-owner@example.invalid'
);

insert into private.app_installations (
  id, secret_hash, platform, app_version, last_seen_at, disabled_at, disable_reason
)
values
  (
    '10000000-0000-4000-8000-000000000001', repeat('1', 64),
    'ios', '1.0.0',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '179 days',
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000002', repeat('2', 64),
    'android', '1.0.0',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '180 days',
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000003', repeat('3', 64),
    'ios', '1.0.0',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '40 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '29 days',
    'user_unregistered'
  ),
  (
    '10000000-0000-4000-8000-000000000004', repeat('4', 64),
    'android', '1.0.0',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '40 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '30 days',
    'user_unregistered'
  ),
  (
    '10000000-0000-4000-8000-000000000005', repeat('5', 64),
    'ios', '1.0.0', current_setting('jubilee.cleanup_now')::timestamptz,
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000006', repeat('6', 64),
    'android', '1.0.0', current_setting('jubilee.cleanup_now')::timestamptz,
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000007', repeat('7', 64),
    'ios', '1.0.0', current_setting('jubilee.cleanup_now')::timestamptz,
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000008', repeat('8', 64),
    'android', '1.0.0', current_setting('jubilee.cleanup_now')::timestamptz,
    null, null
  ),
  (
    '10000000-0000-4000-8000-000000000009', repeat('9', 64),
    'ios', '1.0.0', current_setting('jubilee.cleanup_now')::timestamptz,
    null, null
  );

insert into private.notification_subscriptions (
  installation_id, worship_reminder, schedule_changes, setlist_updates
)
select installation.id, true, true, true
from private.app_installations as installation
where installation.id::text like '10000000-0000-4000-8000-00000000000%';

insert into private.push_endpoints (
  id, installation_id, expo_push_token, token_hash, platform,
  is_active, disabled_at, disable_reason
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'ExpoPushToken[retention_recent]', repeat('a', 64), 'ios', true, null, null
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'ExpoPushToken[retention_stale]', repeat('b', 64), 'android', true, null, null
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'ExpoPushToken[retention_disabled_30]', repeat('c', 64), 'android', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '30 days',
    'user_unregistered'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'ExpoPushToken[retention_endpoint_23h]', repeat('d', 64), 'ios', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '23 hours',
    'all_subscriptions_disabled'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000006',
    'ExpoPushToken[retention_endpoint_24h]', repeat('e', 64), 'android', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours',
    'DeviceNotRegistered'
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000007',
    'ExpoPushToken[retention_inflight_23h]', repeat('f', 64), 'ios', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours',
    'user_unregistered'
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000008',
    'ExpoPushToken[retention_worker_24h]', repeat('0', 64), 'android', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours',
    'user_unregistered'
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000009',
    'ExpoPushToken[retention_worker_23h]', repeat('1a', 32), 'ios', false,
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours',
    'user_unregistered'
  );

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key, approved_at, approved_by, queued_at, completed_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'setlist_update', 'Receipt expired', 'Receipt expired body',
    'setlist_updates', null, 'completed', 'retention:receipt-expired',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    current_setting('jubilee.cleanup_now')::timestamptz
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'setlist_update', 'Receipt recent', 'Receipt recent body',
    'setlist_updates', null, 'completed', 'retention:receipt-recent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    current_setting('jubilee.cleanup_now')::timestamptz
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'schedule_change', 'Old history', 'Old history body',
    'schedule_changes', null, 'completed', 'retention:history-old',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '91 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '91 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    'schedule_change', 'Recent history', 'Recent history body',
    'schedule_changes', null, 'completed', 'retention:history-recent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '89 days'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    'schedule_change', 'Live approved', 'Live approved body',
    'schedule_changes', null, 'approved', 'retention:live-approved',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '200 days',
    '90000000-0000-4000-8000-000000000001', null, null
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    'test', 'Disabled test', 'Disabled test body',
    'test_endpoint', '20000000-0000-4000-8000-000000000006',
    'queued', 'retention:test-disabled',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days', null
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    'schedule_change', 'Expired worker', 'Expired worker body',
    'schedule_changes', null, 'processing', 'retention:worker-expired',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days', null
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    'schedule_change', 'Recent worker', 'Recent worker body',
    'schedule_changes', null, 'processing', 'retention:worker-recent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days',
    '90000000-0000-4000-8000-000000000001',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days', null
  );

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values (
  'retention-worship-history', 'Retention worship history',
  current_setting('jubilee.cleanup_now')::timestamptz + interval '365 days',
  'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true
);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, event_id, status, dedupe_key,
  approved_at, approved_by
)
values (
  '30000000-0000-4000-8000-000000000005',
  'worship_reminder', 'Old worship reminder', 'Old worship reminder body',
  'worship_reminder',
  (select id from public.events where slug = 'retention-worship-history'),
  'approved', 'retention:worship-history',
  current_setting('jubilee.cleanup_now')::timestamptz - interval '91 days',
  '90000000-0000-4000-8000-000000000001'
);

insert into private.worship_reminder_schedules (
  campaign_id, event_id, reminder_slot, event_starts_at_snapshot, scheduled_for
)
select
  '30000000-0000-4000-8000-000000000005',
  event.id,
  'day_before_1930',
  event.starts_at,
  private.worship_reminder_scheduled_for(event.starts_at, 'day_before_1930')
from public.events as event
where event.slug = 'retention-worship-history';

update private.notification_campaigns
set status = 'completed',
    queued_at = current_setting('jubilee.cleanup_now')::timestamptz - interval '91 days',
    completed_at = current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days'
where id = '30000000-0000-4000-8000-000000000005';

insert into private.notification_outbox (
  campaign_id, dedupe_key, status, available_at
)
values
  (
    '30000000-0000-4000-8000-000000000003',
    'retention:history-old', 'sent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    'retention:history-recent', 'sent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '89 days'
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    'retention:test-disabled', 'pending',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '2 days'
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    'retention:worker-expired', 'processing',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    'retention:worker-recent', 'processing',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '23 hours'
  );

update private.notification_outbox
set locked_at = case dedupe_key
      when 'retention:worker-expired'
        then current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours'
      when 'retention:worker-recent'
        then current_setting('jubilee.cleanup_now')::timestamptz - interval '23 hours'
    end,
    locked_by = 'retention-test-worker',
    attempt_count = 1
where dedupe_key in ('retention:worker-expired', 'retention:worker-recent');

alter table private.notification_outbox disable trigger notification_outbox_touch;
update private.notification_outbox
set updated_at = case dedupe_key
  when 'retention:history-old'
    then current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days'
  when 'retention:history-recent'
    then current_setting('jubilee.cleanup_now')::timestamptz - interval '89 days'
  else updated_at
end
where dedupe_key in ('retention:history-old', 'retention:history-recent');
alter table private.notification_outbox enable trigger notification_outbox_touch;

insert into private.notification_deliveries (
  campaign_id, push_endpoint_id, status, expo_ticket_id,
  provider_accepted_at, delivered_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000006',
    'provider_accepted', 'retention-ticket-expired',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '24 hours', null
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000007',
    'provider_accepted', 'retention-ticket-recent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '23 hours', null
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'delivered', 'retention-ticket-history-old',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '90 days'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'delivered', 'retention-ticket-history-recent',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '89 days',
    current_setting('jubilee.cleanup_now')::timestamptz - interval '89 days'
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000008',
    'queued', null, null, null
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000009',
    'queued', null, null, null
  );

set local role anon;
select throws_ok(
  $$
    select * from public.service_cleanup_notification_data(
      statement_timestamp(), 100
    )
  $$,
  '42501',
  null,
  'anon execution is rejected by function privileges'
);
reset role;

select throws_ok(
  $$
    delete from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000007'
  $$,
  '23514',
  null,
  'an in-flight receipt prevents endpoint detachment'
);

set local role service_role;
create temp table retention_cleanup_result on commit drop as
select *
from public.service_cleanup_notification_data(
  current_setting('jubilee.cleanup_now')::timestamptz,
  5000
);
reset role;

select results_eq(
  $$
    select
      processing_expired, receipts_expired, stale_installations_disabled,
      test_campaigns_cancelled, push_tokens_scrubbed, push_endpoints_deleted,
      installations_deleted, deliveries_deleted, outbox_deleted,
      campaigns_deleted
    from retention_cleanup_result
  $$,
  $$values (1, 1, 1, 1, 7, 3, 1, 1, 1, 2)$$,
  'the first cleanup run reports every bounded retention action'
);

select is(
  (
    select count(*)
    from private.app_installations
    where id = '10000000-0000-4000-8000-000000000001'
      and disabled_at is null
  ),
  1::bigint,
  '179 days without check-in does not disable an active installation'
);

select results_eq(
  $$
    select disable_reason, disabled_at is not null
    from private.app_installations
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$values ('stale_inactivity'::text, true)$$,
  '180 days without check-in disables an installation'
);

select results_eq(
  $$
    select worship_reminder, schedule_changes, setlist_updates
    from private.notification_subscriptions
    where installation_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$values (false, false, false)$$,
  'stale installation disablement turns off every subscription'
);

select results_eq(
  $$
    select is_active, disable_reason
    from private.push_endpoints
    where installation_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$values (false, 'stale_inactivity'::text)$$,
  'a newly stale endpoint remains disabled for its 24-hour grace period'
);

select is(
  (
    select count(*)
    from private.app_installations
    where id = '10000000-0000-4000-8000-000000000003'
  ),
  1::bigint,
  'a disabled installation is retained through day 29'
);

select is(
  (
    select count(*)
    from private.app_installations
    where id = '10000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'a disabled installation is deleted at day 30'
);

select is(
  (
    select count(*)
    from private.notification_subscriptions
    where installation_id = '10000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'installation deletion cascades to its subscription'
);

select is(
  (
    select count(*)
    from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000005'
  ),
  1::bigint,
  'an inactive raw endpoint is retained through hour 23'
);

select results_eq(
  $$
    select expo_push_token, token_hash
    from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000005'
  $$,
  $$values (null::text, null::text)$$,
  'the daily sweep scrubs a disabled token before the endpoint row reaches 24 hours'
);

select is(
  (
    select count(*)
    from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'an inactive raw endpoint is deleted at hour 24'
);

select results_eq(
  $$
    select status, error_code, push_endpoint_id is null
    from private.notification_deliveries
    where campaign_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values ('failed'::text, 'ReceiptExpired'::text, true)$$,
  'a 24-hour missing receipt becomes terminal and detaches from the deleted token'
);

select results_eq(
  $$
    select status, push_endpoint_id
    from private.notification_deliveries
    where campaign_id = '30000000-0000-4000-8000-000000000002'
  $$,
  $$values (
    'provider_accepted'::text,
    '20000000-0000-4000-8000-000000000007'::uuid
  )$$,
  'a 23-hour receipt and its raw endpoint remain available for receipt processing'
);

select results_eq(
  $$
    select status, test_push_endpoint_id is null
    from private.notification_campaigns
    where id = '30000000-0000-4000-8000-000000000007'
  $$,
  $$values ('cancelled'::text, true)$$,
  'an unsent test campaign is cancelled before its disabled endpoint is removed'
);

select is(
  (
    select count(*)
    from private.notification_deliveries
    where campaign_id = '30000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'terminal delivery detail is deleted at day 90'
);

select is(
  (
    select count(*)
    from private.notification_outbox
    where campaign_id = '30000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'terminal outbox detail is deleted at day 90'
);

select is(
  (
    select count(*)
    from private.notification_campaigns
    where id = '30000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'terminal campaign detail is deleted at day 90'
);

select is(
  (
    select count(*)
    from private.notification_dedupe_tombstones
    where dedupe_key = 'retention:history-old'
  ),
  1::bigint,
  'campaign cleanup retains a non-device dedupe tombstone'
);

select results_eq(
  $$
    select
      (select count(*) from private.notification_campaigns
       where id = '30000000-0000-4000-8000-000000000004'),
      (select count(*) from private.notification_outbox
       where campaign_id = '30000000-0000-4000-8000-000000000004'),
      (select count(*) from private.notification_deliveries
       where campaign_id = '30000000-0000-4000-8000-000000000004')
  $$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$,
  '89-day campaign, outbox, and delivery history are retained'
);

select is(
  (
    select count(*)
    from private.worship_reminder_schedules
    where campaign_id = '30000000-0000-4000-8000-000000000005'
  ),
  0::bigint,
  'campaign retention deletion cascades to its worship reminder schedule'
);

select is(
  (
    select count(*)
    from private.notification_campaigns
    where id = '30000000-0000-4000-8000-000000000006'
      and status = 'approved'
  ),
  1::bigint,
  'cleanup never deletes a live approved campaign even when it is old'
);

select throws_ok(
  $$
    insert into private.notification_campaigns (
      kind, title, body, audience_kind, status, dedupe_key
    ) values (
      'schedule_change', 'Duplicate retired key', 'Duplicate retired key body',
      'schedule_changes', 'draft', 'retention:history-old'
    )
  $$,
  '23505',
  'Notification dedupe key has already been retired',
  'retired history cannot be recreated with the same dedupe key'
);

select lives_ok(
  $$
    select public.service_update_app_installation(
      '10000000-0000-4000-8000-000000000002'::uuid,
      repeat('2', 64),
      '1.0.1',
      'ExpoPushToken[retention_stale_reactivated]',
      repeat('8', 64),
      true, false, false
    )
  $$,
  'a correctly authenticated stale installation can reactivate during grace'
);

select results_eq(
  $$
    select
      installation.disabled_at is null,
      endpoint.is_active,
      subscription.worship_reminder
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    join private.notification_subscriptions as subscription
      on subscription.installation_id = installation.id
    where installation.id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$values (true, true, true)$$,
  'stale reactivation restores active installation, endpoint, and chosen subscription'
);

set local role service_role;
create temp table retention_cleanup_second_result on commit drop as
select *
from public.service_cleanup_notification_data(
  current_setting('jubilee.cleanup_now')::timestamptz,
  5000
);
reset role;

select results_eq(
  $$
    select
      processing_expired + receipts_expired + stale_installations_disabled
      + test_campaigns_cancelled + push_tokens_scrubbed + push_endpoints_deleted
      + installations_deleted + deliveries_deleted + outbox_deleted
      + campaigns_deleted
    from retention_cleanup_second_result
  $$,
  $$values (0)$$,
  'repeating cleanup at the same cutoff is idempotent'
);

select throws_ok(
  $$
    select * from public.service_cleanup_notification_data(
      statement_timestamp(), 0
    )
  $$,
  '22023',
  'Cleanup batch limit must be between 1 and 5000',
  'cleanup rejects an unsafe zero batch limit'
);

select throws_ok(
  $$
    insert into private.app_installations (
      id, secret_hash, platform, app_version, disabled_at, disable_reason
    ) values (
      '10000000-0000-4000-8000-000000000099', repeat('9', 64),
      'ios', '1.0.0', statement_timestamp(), null
    )
  $$,
  '23514',
  null,
  'disabled installation state always records an allowed reason'
);

select is(
  (
    select count(*)
    from private.notification_dedupe_tombstones
    where dedupe_key = 'retention:worship-history'
  ),
  1::bigint,
  'worship reminder cleanup also preserves its retired dedupe key'
);

select is(
  (
    select count(*)
    from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000007'
  ),
  1::bigint,
  'an in-flight endpoint remains after idempotent cleanup'
);

select is(
  (
    select count(*)
    from private.notification_campaigns
    where id = '30000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  '90-day retention starts when an expired receipt is terminalized'
);

select results_eq(
  $$
    select is_active, disable_reason
    from private.push_endpoints
    where id = '20000000-0000-4000-8000-000000000005'
  $$,
  $$values (false, 'all_subscriptions_disabled'::text)$$,
  'a 23-hour disabled endpoint remains inactive and unchanged'
);

select results_eq(
  $$
    select
      campaign.status,
      outbox.status,
      delivery.status,
      delivery.error_code,
      delivery.push_endpoint_id is null
    from private.notification_campaigns as campaign
    join private.notification_outbox as outbox on outbox.campaign_id = campaign.id
    join private.notification_deliveries as delivery on delivery.campaign_id = campaign.id
    where campaign.id = '30000000-0000-4000-8000-000000000008'
  $$,
  $$values (
    'failed'::text, 'failed'::text, 'failed'::text,
    'WorkerLeaseExpired'::text, true
  )$$,
  'a 24-hour worker lease becomes terminal before its raw endpoint is removed'
);

select results_eq(
  $$
    select campaign.status, outbox.status, delivery.status, endpoint.id
    from private.notification_campaigns as campaign
    join private.notification_outbox as outbox on outbox.campaign_id = campaign.id
    join private.notification_deliveries as delivery on delivery.campaign_id = campaign.id
    join private.push_endpoints as endpoint on endpoint.id = delivery.push_endpoint_id
    where campaign.id = '30000000-0000-4000-8000-000000000009'
  $$,
  $$values (
    'processing'::text, 'processing'::text, 'queued'::text,
    '20000000-0000-4000-8000-000000000009'::uuid
  )$$,
  'a 23-hour worker lease and its endpoint remain in-flight'
);

select is(
  (
    select count(*)
    from private.notification_campaigns
    where id = '30000000-0000-4000-8000-000000000007'
  ),
  1::bigint,
  'newly cancelled test campaign history begins its own 90-day retention window'
);

select * from finish();
rollback;
