begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

-- 1
select ok(
  to_regprocedure('private.is_supported_notification_deep_link(text)') is not null,
  'the private notification deep-link allowlist function exists'
);

-- 2
select results_eq(
  $$
    select
      procedure.provolatile,
      procedure.proparallel,
      procedure.prosecdef,
      'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
    from pg_proc as procedure
    where procedure.oid = 'private.is_supported_notification_deep_link(text)'::regprocedure
  $$,
  $$values ('i'::"char", 's'::"char", false, true)$$,
  'the allowlist helper is immutable, parallel safe, invoker-rights, and search-path pinned'
);

-- 3
select ok(
  not has_function_privilege(
    'anon',
    'private.is_supported_notification_deep_link(text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.is_supported_notification_deep_link(text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'private.is_supported_notification_deep_link(text)',
    'EXECUTE'
  ),
  'API roles cannot call the private allowlist helper directly'
);

-- 4
select ok(
  exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'private.notification_campaigns'::regclass
      and constraint_row.conname = 'notification_campaigns_deep_link_supported'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_get_constraintdef(constraint_row.oid)
        like '%private.is_supported_notification_deep_link(deep_link)%'
  ),
  'the notification-campaign table has a validated allowlist check constraint'
);

-- 5
select ok(
  (
    select bool_and(private.is_supported_notification_deep_link(link))
    from unnest(array[
      'jubileeworship://notifications',
      'jubileeworship://notification-settings',
      'jubileeworship://privacy',
      'jubileeworship://worship',
      'jubileeworship://media',
      'jubileeworship://guide'
    ]) as allowed(link)
  ),
  'all six fixed production app destinations are accepted'
);

-- 6
select ok(
  (
    select bool_and(private.is_supported_notification_deep_link(link))
    from unnest(array[
      'jubileeworship://worship/a',
      'jubileeworship://worship/Event_2026-08',
      'jubileeworship://worship/safe-slug/songlist',
      'jubileeworship://worship/safe_slug-1?source=push',
      'jubileeworship://worship/safe_slug-1/songlist?source=push&campaign=v1.0-test_2%20x'
    ]) as allowed(link)
  ),
  'supported worship detail, song-list, and safe query destinations are accepted'
);

-- 7
select ok(
  (
    select bool_and(not private.is_supported_notification_deep_link(link))
    from unnest(array[
      'jubileeworship://',
      'jubileeworship://notificaitons',
      'jubileeworship-dev://notifications',
      'jubileeworship-preview://notifications',
      'jubileeworship://worship/',
      'jubileeworship://worship/-slug',
      'jubileeworship://worship/_slug',
      'jubileeworship://worship/slug/details',
      'jubileeworship://worship/slug/songlist/extra',
      'jubileeworship://worship/slug?',
      'jubileeworship://worship/slug?source=a+b',
      'jubileeworship://worship/한글'
    ]) as denied(link)
  ),
  'unknown schemes, paths, unsafe slugs, extra segments, and unsafe queries are rejected'
);

-- 8
select ok(
  private.is_supported_notification_deep_link(
    'jubileeworship://worship/a?q='
      || repeat(
        'a',
        1000 - char_length('jubileeworship://worship/a?q=')
      )
  ),
  'a supported deep link exactly 1000 characters long is accepted'
);

-- 9
select ok(
  not private.is_supported_notification_deep_link(
    'jubileeworship://worship/a?q='
      || repeat(
        'a',
        1001 - char_length('jubileeworship://worship/a?q=')
      )
  ),
  'a deep link longer than 1000 characters is rejected'
);

-- 10
select lives_ok(
  $$
    insert into private.notification_campaigns (
      kind, title, body, deep_link, audience_kind, dedupe_key
    ) values (
      'schedule_change', 'Direct valid', 'Direct valid body',
      'jubileeworship://guide?source=db-test',
      'schedule_changes', 'deep-link:direct:valid'
    )
  $$,
  'a privileged direct insert accepts a supported destination'
);

-- 11
select lives_ok(
  $$
    insert into private.notification_campaigns (
      kind, title, body, deep_link, audience_kind, dedupe_key
    ) values (
      'schedule_change', 'Direct null', 'Direct null body',
      null, 'schedule_changes', 'deep-link:direct:null'
    )
  $$,
  'a privileged direct insert may explicitly omit navigation'
);

-- 12
select throws_ok(
  $$
    insert into private.notification_campaigns (
      kind, title, body, deep_link, audience_kind, dedupe_key
    ) values (
      'schedule_change', 'Direct invalid', 'Direct invalid body',
      'jubileeworship://settings',
      'schedule_changes', 'deep-link:direct:invalid'
    )
  $$,
  '23514',
  'new row for relation "notification_campaigns" violates check constraint "notification_campaigns_deep_link_supported"',
  'the table constraint rejects an unknown route even for a privileged direct insert'
);

insert into auth.users (id, email)
values (
  'f1000000-0000-4000-8000-000000000001',
  'deep-link-owner@example.invalid'
);

insert into public.admin_users (user_id, role, is_active)
values ('f1000000-0000-4000-8000-000000000001', 'owner', true);

create temporary table captured_deep_link_campaigns (
  label text primary key,
  campaign_id uuid not null
) on commit drop;

grant select, insert on captured_deep_link_campaigns to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

-- 13
select lives_ok(
  $$
    insert into captured_deep_link_campaigns (label, campaign_id)
    values (
      'normal',
      public.create_notification_campaign(
        'schedule_change', 'RPC valid', 'RPC valid body',
        'jubileeworship://notifications?source=create',
        'schedule_changes', null, null, 'deep-link:rpc:create'
      )
    )
  $$,
  'the generic create RPC accepts a supported destination'
);

reset role;

-- 14
select results_eq(
  $$
    select campaign.deep_link
    from private.notification_campaigns as campaign
    join captured_deep_link_campaigns as captured
      on captured.campaign_id = campaign.id
    where captured.label = 'normal'
  $$,
  $$values ('jubileeworship://notifications?source=create'::text)$$,
  'the generic create RPC stores the supported destination unchanged'
);

set local role authenticated;

-- 15
select throws_ok(
  $$
    select public.create_notification_campaign(
      'schedule_change', 'RPC invalid', 'RPC invalid body',
      'jubileeworship://notificaitons',
      'schedule_changes', null, null, 'deep-link:rpc:create:invalid'
    )
  $$,
  '23514',
  'new row for relation "notification_campaigns" violates check constraint "notification_campaigns_deep_link_supported"',
  'the generic create RPC rejects an unknown destination'
);

-- 16
select lives_ok(
  $$
    select public.update_notification_campaign(
      (select campaign_id from captured_deep_link_campaigns where label = 'normal'),
      'schedule_change', 'RPC updated', 'RPC updated body',
      'jubileeworship://worship/safe_slug-1/songlist?source=update',
      'schedule_changes', null, null, 'deep-link:rpc:update'
    )
  $$,
  'the generic update RPC accepts a supported destination'
);

reset role;

-- 17
select results_eq(
  $$
    select campaign.deep_link, campaign.dedupe_key
    from private.notification_campaigns as campaign
    join captured_deep_link_campaigns as captured
      on captured.campaign_id = campaign.id
    where captured.label = 'normal'
  $$,
  $$
    values (
      'jubileeworship://worship/safe_slug-1/songlist?source=update'::text,
      'deep-link:rpc:update'::text
    )
  $$,
  'the generic update RPC stores the supported destination unchanged'
);

set local role authenticated;

-- 18
select throws_ok(
  $$
    select public.update_notification_campaign(
      (select campaign_id from captured_deep_link_campaigns where label = 'normal'),
      'schedule_change', 'RPC rejected', 'RPC rejected body',
      'jubileeworship://worship/safe_slug-1/details',
      'schedule_changes', null, null, 'deep-link:rpc:update:invalid'
    )
  $$,
  '23514',
  'new row for relation "notification_campaigns" violates check constraint "notification_campaigns_deep_link_supported"',
  'the generic update RPC rejects an unknown nested destination'
);

reset role;

-- 19
select results_eq(
  $$
    select campaign.deep_link, campaign.dedupe_key
    from private.notification_campaigns as campaign
    join captured_deep_link_campaigns as captured
      on captured.campaign_id = campaign.id
    where captured.label = 'normal'
  $$,
  $$
    values (
      'jubileeworship://worship/safe_slug-1/songlist?source=update'::text,
      'deep-link:rpc:update'::text
    )
  $$,
  'a rejected update leaves the previously valid destination unchanged'
);

insert into private.app_installations (
  id, secret_hash, platform, app_version, app_variant
) values (
  'f2000000-0000-4000-8000-000000000001', repeat('1', 64),
  'android', '1.0.0-deep-link-test', 'development'
);

insert into private.push_endpoints (
  id, installation_id, expo_push_token, token_hash, platform
) values (
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'ExpoPushToken[deep_link_test_target]', repeat('2', 64), 'android'
);

insert into private.owner_test_push_targets (
  push_endpoint_id, app_variant_snapshot, approved_by, approved_at
) values (
  'f3000000-0000-4000-8000-000000000001', 'development',
  'f1000000-0000-4000-8000-000000000001', statement_timestamp()
);

set local role authenticated;

-- 20
select lives_ok(
  $$
    insert into captured_deep_link_campaigns (label, campaign_id)
    values (
      'test-push',
      public.queue_owner_test_push(
        'f4000000-0000-4000-8000-000000000001',
        'f3000000-0000-4000-8000-000000000001',
        'development', 'Test push valid', 'Test push valid body',
        'jubileeworship://worship/test-event/songlist?source=test-push'
      )
    )
  $$,
  'the owner test-push RPC accepts a supported destination'
);

reset role;

-- 21
select results_eq(
  $$
    select campaign.deep_link, campaign.status, outbox.status
    from private.notification_campaigns as campaign
    join captured_deep_link_campaigns as captured
      on captured.campaign_id = campaign.id
    join private.notification_outbox as outbox
      on outbox.campaign_id = campaign.id
    where captured.label = 'test-push'
  $$,
  $$
    values (
      'jubileeworship://worship/test-event/songlist?source=test-push'::text,
      'queued'::text,
      'pending'::text
    )
  $$,
  'the owner test-push RPC stores the supported destination on its queued campaign'
);

set local role authenticated;

-- 22
select throws_ok(
  $$
    select public.queue_owner_test_push(
      'f4000000-0000-4000-8000-000000000002',
      'f3000000-0000-4000-8000-000000000001',
      'development', 'Test push invalid', 'Test push invalid body',
      'jubileeworship://settings'
    )
  $$,
  '23514',
  'new row for relation "notification_campaigns" violates check constraint "notification_campaigns_deep_link_supported"',
  'the owner test-push RPC rejects an unknown destination'
);

reset role;

-- 23
select results_eq(
  $$
    select
      (select count(*)
       from private.notification_campaigns
       where deep_link is not null
         and not private.is_supported_notification_deep_link(deep_link))::bigint,
      (select count(*)
       from private.notification_campaigns
       where kind = 'test')::bigint,
      (select count(*) from private.notification_outbox)::bigint
  $$,
  $$values (0::bigint, 1::bigint, 1::bigint)$$,
  'rejected writes leave no unsupported link, extra test campaign, or extra outbox row'
);

-- 24
select is(
  (
    select count(*)
    from private.notification_campaigns
    where deep_link is null
  ),
  1::bigint,
  'NULL remains the only stored representation for an intentionally absent destination'
);

select * from finish();
rollback;
