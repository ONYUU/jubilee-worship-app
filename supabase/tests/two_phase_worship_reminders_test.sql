begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(78);

select has_table(
  'private', 'worship_reminder_schedules',
  'private worship reminder schedule table exists'
);

select ok(
  (select relrowsecurity from pg_class
   where oid = 'private.worship_reminder_schedules'::regclass),
  'worship reminder schedules have RLS enabled'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'private'
      and indexname = 'worship_reminder_schedules_current_event_slot_idx'
      and indexdef like '%UNIQUE%'
      and indexdef like '%event_id, event_starts_at_snapshot, reminder_slot%'
      and indexdef like '%WHERE (is_current = true)%'
  ),
  'current event start and slot have a database unique invariant'
);

select is(
  (
    select count(*) from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'worship_reminder_schedules'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
  ),
  0::bigint,
  'public Data API roles have no direct schedule-table privilege'
);

select ok(
  has_table_privilege('service_role', 'private.worship_reminder_schedules', 'SELECT'),
  'service_role has explicit read-only schedule access'
);

select ok(
  not has_table_privilege(
    'service_role', 'private.worship_reminder_schedules', 'INSERT,UPDATE,DELETE'
  ),
  'service_role cannot mutate schedules directly'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.schedule_worship_reminder_campaigns(bigint,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated callers can enter the owner-gated schedule RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.schedule_worship_reminder_campaigns(bigint,text,text,text,text)',
    'EXECUTE'
  ),
  'anon cannot execute the schedule RPC'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.schedule_worship_reminder_campaigns(bigint,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role cannot impersonate owner approval'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_queue_due_worship_reminders(timestamptz)',
    'EXECUTE'
  ),
  'service_role can run the due-reminder worker'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.service_queue_due_worship_reminders(timestamptz)',
    'EXECUTE'
  ),
  'authenticated callers cannot run the due-reminder worker'
);

select is(
  (select contact_email from public.site_settings where id = 1),
  'sundoojubileeworship@gmail.com'::text,
  'the locked operational contact email is migrated'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_site_settings'
      and column_name = 'contact_email'
  ),
  'contact email remains absent from the public site DTO'
);

select is(
  (
    select count(*)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'schedule_worship_reminder_campaigns',
        'list_worship_reminder_schedules',
        'service_queue_due_worship_reminders',
        'service_claim_notification_outbox'
      )
      and procedure.prosecdef
      and 'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
  ),
  4::bigint,
  'notification RPCs are fixed-path security definers'
);

select ok(
  position(
    'for update of event, schedule, campaign, outbox skip locked'
    in lower(pg_get_functiondef(
      'private.claim_notification_outbox_core(text,integer)'::regprocedure
    ))
  ) > 0,
  'the claim worker locks event and schedule state before processing'
);

select ok(
  private.legal_document_has_confirmed_value(
    E'- 준거법: 대한민국 법률', '준거법:'
  ),
  'legal gate accepts one optional bullet and a concrete value'
);

select ok(
  not private.legal_document_has_confirmed_value(
    E'준거법: 대한민국 법률\n준거법: 다른 값', '준거법:'
  ),
  'legal gate rejects duplicate required labels'
);

select ok(
  not private.legal_document_has_confirmed_value(E'준거법: -', '준거법:'),
  'legal gate rejects punctuation-only placeholders'
);

select ok(
  not private.legal_document_has_confirmed_value(
    E'준거법: 최종 검토 완료', '준거법:'
  ),
  'legal gate rejects semantic review placeholders'
);

insert into auth.users (id, email)
values
  ('91111111-1111-4111-8111-111111111111', 'two-phase-owner@example.invalid'),
  ('92222222-2222-4222-8222-222222222222', 'two-phase-editor@example.invalid'),
  ('93333333-3333-4333-8333-333333333333', 'two-phase-user@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('91111111-1111-4111-8111-111111111111', 'owner', true),
  ('92222222-2222-4222-8222-222222222222', 'editor', true);

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values
  ('two-phase-main', 'Two phase main', '2035-06-15T20:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true),
  ('two-phase-postponed', 'Two phase postponed', '2035-06-22T18:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'postponed', true),
  ('two-phase-unpublished', 'Two phase unpublished', '2035-06-29T18:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', false),
  ('two-phase-cancelled', 'Two phase cancelled', '2035-07-01T18:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'cancelled', true),
  ('two-phase-past', 'Two phase past', '2020-01-01T18:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true),
  ('two-phase-expired', 'Two phase expired', statement_timestamp() + interval '2 hours',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true),
  ('two-phase-terminal', 'Two phase terminal', '2035-07-13T20:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true),
  ('two-phase-claim', 'Two phase claim', '2035-07-20T20:00:00+09:00',
   'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, event_id, status, dedupe_key
)
values (
  '94444444-4444-4444-8444-444444444444',
  'schedule_change', 'Legacy audience draft', 'Legacy audience draft body',
  'worship_reminder',
  (select id from public.events where slug = 'two-phase-main'),
  'draft', 'legacy:worship-audience:draft'
);

insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, event_id, status, dedupe_key,
  approved_at, approved_by
)
values (
  '95555555-5555-4555-8555-555555555555',
  'schedule_change', 'Legacy audience approved', 'Legacy audience approved body',
  'worship_reminder',
  (select id from public.events where slug = 'two-phase-main'),
  'approved', 'legacy:worship-audience:approved',
  statement_timestamp(), '91111111-1111-4111-8111-111111111111'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"92222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.create_notification_campaign(
      'worship_reminder', 'Blocked', 'Blocked body', null,
      'worship_reminder',
      (select id from public.events where slug = 'two-phase-main'),
      null, 'blocked:worship-kind'
    )
  $$,
  '23514', 'Use the dedicated worship reminder scheduling RPC',
  'generic creation cannot create a worship reminder'
);

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-main'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
  $$,
  '42501', 'Active owner access required',
  'an editor cannot approve worship reminder schedules'
);

select lives_ok(
  $$select * from public.list_worship_reminder_schedules()$$,
  'an active editor can list reminder schedule DTO rows'
);

select lives_ok(
  $sql$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values
      (
        'privacy_policy', 'two-phase-incomplete', '불완전 개인정보처리방침',
        E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n- 비활성 정보 보유 기간: 최종 확정\n- 발송 기록 보유 기간: 90일\n- 정기 삭제 주기: 매월\n- 수탁자: 검증 수탁자\n- 이전 국가: 검증 국가\n- 이전 항목: 검증 항목\n- 이전 시점 및 방법: 검증 방법\n- 국외 처리 보유 기간: 검증 기간\n- 이전 거부 방법 및 효과: 검증 효과',
        current_date
      ),
      (
        'terms_of_service', 'two-phase-placeholder', '불완전 이용약관',
        E'쥬빌리 워십 sundoojubileeworship@gmail.com\n* 준거법: 대한민국 법률\n* 관할: 미정\n* 면책 범위: 검증 범위\n* 미성년자 이용 안내: 보호자와 함께 이용',
        current_date
      ),
      (
        'terms_of_service', 'two-phase-complete', '완성 이용약관',
        E'쥬빌리 워십 sundoojubileeworship@gmail.com\n- 준거법: 대한민국 법률\n- 관할: 인천지방법원\n- 면책 범위: 법령이 허용하는 범위\n- 미성년자 이용 안내: 보호자와 함께 이용',
        current_date
      ),
      (
        'privacy_policy', 'two-phase-privacy-complete', '완성 개인정보처리방침',
        E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n알림 제공에만 사용합니다. 예배 알림 선택은 종교적 관심을 추론할 수 있습니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n- 비활성 정보 보유 기간: 30일\n- 발송 기록 보유 기간: 90일\n- 정기 삭제 주기: 매일 1회\n- 수탁자: Supabase 및 Expo\n- 이전 국가: 미국\n- 이전 항목: 설치 식별자 및 푸시 토큰\n- 이전 시점 및 방법: 서비스 이용 시 암호화 전송\n- 국외 처리 보유 기간: 비활성화 후 30일\n- 이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단',
        current_date
      )
  $sql$,
  'an editor can prepare legal drafts for direct-RPC gate tests'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"93333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.list_worship_reminder_schedules()$$,
  '42501', 'Active admin access required',
  'a normal authenticated user cannot list schedules'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-past'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
  $$,
  '23514', 'A future published scheduled or postponed event is required',
  'a past event cannot be approved'
);

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-unpublished'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
  $$,
  '23514', 'A future published scheduled or postponed event is required',
  'an unpublished event cannot be approved'
);

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-cancelled'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
  $$,
  '23514', 'A future published scheduled or postponed event is required',
  'a cancelled event cannot be approved'
);

select lives_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-postponed'),
      '연기 전날', '연기 전날 본문', '연기 한 시간 전', '연기 한 시간 전 본문'
    )
  $$,
  'a future published postponed event can receive both reminders'
);

select lives_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-main'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
  $$,
  'an owner can approve both reminder slots'
);

select is(
  (
    select count(*) from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-main' and requires_reapproval = false
  ),
  2::bigint,
  'owner approval creates exactly two current DTO rows'
);

select results_eq(
  $$
    select reminder_slot
    from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-main'
    order by reminder_slot
  $$,
  $$values ('day_before_1930'::text), ('one_hour_before'::text)$$,
  'the exact two reminder slot values are stable'
);

select is(
  (
    select scheduled_for from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-main'
      and reminder_slot = 'day_before_1930'
  ),
  '2035-06-14T19:30:00+09:00'::timestamptz,
  'D-1 is fixed at 19:30 KST'
);

select is(
  (
    select scheduled_for from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-main'
      and reminder_slot = 'one_hour_before'
  ),
  '2035-06-15T19:00:00+09:00'::timestamptz,
  'H-1 is exactly one hour before worship'
);

select is(
  (
    select count(*) from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-main'
      and status = 'approved'
      and approved_by = '91111111-1111-4111-8111-111111111111'::uuid
  ),
  2::bigint,
  'both rows carry owner approval and no immediate action'
);

select is(
  (
    select count(distinct dedupe_key)
    from public.list_notification_campaigns()
    where kind = 'worship_reminder'
      and event_id = (select id from public.events where slug = 'two-phase-main')
  ),
  2::bigint,
  'the two campaign dedupe keys are distinct'
);

select is(
  (
    select count(*)
    from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-main'),
      '전날 알림', '전날 본문', '한 시간 전 알림', '한 시간 전 본문'
    )
    where status = 'approved' and requires_action = false
  ),
  2::bigint,
  'idempotent owner reapproval returns both existing approved rows'
);

select is(
  (
    select count(*) from public.list_notification_campaigns()
    where kind = 'worship_reminder'
      and event_id = (select id from public.events where slug = 'two-phase-main')
  ),
  2::bigint,
  'idempotent reapproval creates no duplicate campaign'
);

select lives_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-postponed'),
      '변경된 연기 전날', '변경된 연기 전날 본문',
      '변경된 연기 한 시간 전', '변경된 연기 한 시간 전 본문'
    )
  $$,
  'changed unsent copy creates a fresh owner-approved generation'
);

select results_eq(
  $$
    select status, count(*)
    from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-postponed'
    group by status
    order by status
  $$,
  $$values ('approved'::text, 2::bigint), ('cancelled'::text, 2::bigint)$$,
  'copy changes cancel both prior approvals and retain two current approvals'
);

select throws_ok(
  $$
    select public.queue_notification_campaign(
      (select campaign_id from public.list_worship_reminder_schedules()
       where event_slug = 'two-phase-main'
         and reminder_slot = 'day_before_1930')
    )
  $$,
  '23514', 'Worship reminders are queued only by the due-reminder service',
  'generic owner queue cannot bypass scheduled time'
);

select throws_ok(
  $$select public.approve_notification_campaign('94444444-4444-4444-8444-444444444444')$$,
  '23514', 'Use the dedicated worship reminder scheduling RPC',
  'legacy worship-audience drafts cannot use generic approval'
);

select throws_ok(
  $$select public.queue_notification_campaign('95555555-5555-4555-8555-555555555555')$$,
  '23514', 'Worship reminders are queued only by the due-reminder service',
  'legacy worship-audience approvals cannot use generic queueing'
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'two-phase-incomplete')
    )
  $$,
  '23514', 'Legal document identity and disclosure review is incomplete',
  'direct privacy publication rejects a semantic placeholder'
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'two-phase-placeholder')
    )
  $$,
  '23514', 'Legal document identity and disclosure review is incomplete',
  'direct terms publication rejects an unresolved labeled value'
);

select is(
  (
    select status from public.legal_documents
    where version = 'two-phase-privacy-complete'
  ),
  'draft'::text,
  'complete nine-label privacy policy starts as a draft'
);

select lives_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'two-phase-privacy-complete')
    )
  $$,
  'direct privacy publication accepts all nine concrete bullet-form labels'
);

select is(
  (
    select status from public.legal_documents
    where version = 'two-phase-privacy-complete'
  ),
  'published'::text,
  'the complete privacy policy becomes the published current row'
);

select lives_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'two-phase-complete')
    )
  $$,
  'direct terms publication accepts concrete bullet-form labels'
);

reset role;

select ok(
  not private.legal_document_has_confirmed_value(E'준거법: 완료', '준거법:'),
  'legal gate rejects a standalone completion placeholder'
);

select ok(
  not private.legal_document_has_confirmed_value(E'준거법: 해당 없음', '준거법:'),
  'legal gate rejects a standalone not-applicable placeholder'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.site_settings set hero_title = hero_title where id = 1$$,
  'an owner settings update records an audit actor'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select lives_ok(
  $$
    update public.site_settings
    set contact_email = 'sundoojubileeworship@gmail.com'
    where id = 1
  $$,
  'a migration-owned settings refresh can run without a JWT actor'
);

select is(
  (select updated_by from public.site_settings where id = 1),
  '91111111-1111-4111-8111-111111111111'::uuid,
  'a system settings refresh preserves the prior audit actor'
);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders('2035-06-14T19:29:59+09:00'),
  0,
  'the worker does not queue before D-1 19:30 KST'
);

select is(
  public.service_queue_due_worship_reminders('2035-06-14T19:30:00+09:00'),
  1,
  'the worker queues D-1 at 19:30 KST'
);

select is(
  public.service_queue_due_worship_reminders('2035-06-14T19:30:00+09:00'),
  0,
  'D-1 queueing is idempotent'
);

select is(
  public.service_queue_due_worship_reminders('2035-06-15T19:00:00+09:00'),
  1,
  'the worker queues H-1 at its exact time'
);

select is(
  public.service_queue_due_worship_reminders('2035-06-15T19:00:00+09:00'),
  0,
  'H-1 queueing is idempotent'
);

select is(
  (
    select count(*)
    from private.notification_outbox as outbox
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = outbox.campaign_id
    where schedule.event_id = (select id from public.events where slug = 'two-phase-main')
  ),
  2::bigint,
  'the event has exactly two deduplicated outbox rows'
);

select results_eq(
  $$
    select schedule.reminder_slot, outbox.status
    from private.notification_outbox as outbox
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = outbox.campaign_id
    where schedule.event_id = (select id from public.events where slug = 'two-phase-main')
    order by schedule.reminder_slot
  $$,
  $$values
      ('day_before_1930'::text, 'cancelled'::text),
      ('one_hour_before'::text, 'pending'::text)$$,
  'unclaimed D-1 expires before H-1 while H-1 remains pending'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.events set title = 'Two phase main changed' where slug = 'two-phase-main'$$,
  'an event-content change invalidates unsent approval'
);

reset role;

select is(
  (
    select count(*) from private.worship_reminder_schedules
    where event_id = (select id from public.events where slug = 'two-phase-main')
      and is_current = true
  ),
  0::bigint,
  'event changes leave no stale current schedule generation'
);

select is(
  (
    select count(*)
    from private.notification_outbox as outbox
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = outbox.campaign_id
    where schedule.event_id = (select id from public.events where slug = 'two-phase-main')
      and outbox.status = 'pending'
  ),
  0::bigint,
  'event changes cancel all still-pending reminder outbox rows'
);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders('2035-06-15T19:00:00+09:00'),
  0,
  'the worker cannot requeue an invalidated event snapshot'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-terminal'),
      '터미널 전날', '터미널 전날 본문',
      '터미널 한 시간 전', '터미널 한 시간 전 본문'
    )
  $$,
  'terminal-state test event receives both approvals'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders('2035-07-12T19:30:00+09:00'),
  1,
  'terminal-state D-1 can be queued once'
);

reset role;

select lives_ok(
  $$
    update private.notification_campaigns
    set status = 'completed', completed_at = statement_timestamp()
    where id = (
      select campaign_id from private.worship_reminder_schedules
      where event_id = (select id from public.events where slug = 'two-phase-terminal')
        and reminder_slot = 'day_before_1930'
    )
  $$,
  'a queued D-1 is marked completed for terminal testing'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select status
    from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-terminal'),
      '터미널 전날', '터미널 전날 본문',
      '터미널 한 시간 전', '터미널 한 시간 전 본문'
    )
    where reminder_slot = 'day_before_1930'
  ),
  'completed'::text,
  'identical terminal requery exposes the completed status'
);

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-terminal'),
      '변경된 터미널 전날', '터미널 전날 본문',
      '터미널 한 시간 전', '터미널 한 시간 전 본문'
    )
  $$,
  '23514', 'A terminal reminder cannot be replaced with different copy',
  'a completed event-start slot cannot be duplicated with changed copy'
);

select is(
  (
    select count(*) from public.list_worship_reminder_schedules()
    where event_slug = 'two-phase-terminal'
      and reminder_slot = 'day_before_1930'
  ),
  1::bigint,
  'terminal copy rejection creates no second generation'
);

select throws_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-expired'),
      '만료 전날', '만료 전날 본문', '만료 한 시간 전', '만료 한 시간 전 본문'
    )
  $$,
  '23514', 'The worship reminder approval window has expired',
  'first approval is atomic after the D-1 grace window'
);

select is(
  (
    select count(*) from public.list_notification_campaigns()
    where event_id = (select id from public.events where slug = 'two-phase-expired')
      and kind = 'worship_reminder'
  ),
  0::bigint,
  'expired first approval leaves no partial H-1 campaign'
);

select lives_ok(
  $$
    select * from public.schedule_worship_reminder_campaigns(
      (select id from public.events where slug = 'two-phase-claim'),
      '클레임 전날', '클레임 전날 본문',
      '클레임 한 시간 전', '클레임 한 시간 전 본문'
    )
  $$,
  'claim-revalidation event receives both schedules'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders('2035-07-19T19:30:00+09:00'),
  1,
  'claim-test D-1 enters the outbox'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.events set published = false where slug = 'two-phase-claim'$$,
  'unpublishing invalidates the queued claim-test reminder'
);

reset role;

-- Simulate a privileged stale-row restoration. The claim worker must still
-- fail closed instead of sending it.
update private.notification_campaigns
set status = 'queued'
where id = (
  select campaign_id from private.worship_reminder_schedules
  where event_id = (select id from public.events where slug = 'two-phase-claim')
    and reminder_slot = 'day_before_1930'
);

update private.notification_outbox
set status = 'pending', available_at = statement_timestamp(),
    locked_at = null, locked_by = null
where campaign_id = (
  select campaign_id from private.worship_reminder_schedules
  where event_id = (select id from public.events where slug = 'two-phase-claim')
    and reminder_slot = 'day_before_1930'
);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  (select count(*) from public.service_claim_notification_outbox('two-phase-worker', 10)),
  0::bigint,
  'claim revalidation rejects a restored stale outbox'
);

select is(
  (
    select outbox.status
    from private.notification_outbox as outbox
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = outbox.campaign_id
    where schedule.event_id = (select id from public.events where slug = 'two-phase-claim')
      and schedule.reminder_slot = 'day_before_1930'
  ),
  'cancelled'::text,
  'claim revalidation cancels the stale pending outbox'
);

reset role;

select throws_ok(
  $test$
    do $body$
    declare
      first_campaign_id uuid := '96666666-6666-4666-8666-666666666666';
      second_campaign_id uuid := '97777777-7777-4777-8777-777777777777';
      duplicate_event_id bigint;
    begin
      insert into public.events (
        slug, title, starts_at, timezone, venue_name, address, status, published
      ) values (
        'two-phase-unique', 'Unique invariant', '2036-01-01T20:00:00+09:00',
        'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', true
      ) returning id into duplicate_event_id;

      insert into private.notification_campaigns (
        id, kind, title, body, deep_link, audience_kind, event_id, status,
        dedupe_key, approved_at, approved_by
      ) values
        (
          first_campaign_id, 'worship_reminder', 'First', 'First body',
          'jubileeworship://worship/two-phase-unique', 'worship_reminder',
          duplicate_event_id, 'approved', 'duplicate:event-slot:first',
          statement_timestamp(), '91111111-1111-4111-8111-111111111111'
        ),
        (
          second_campaign_id, 'worship_reminder', 'Second', 'Second body',
          'jubileeworship://worship/two-phase-unique', 'worship_reminder',
          duplicate_event_id, 'approved', 'duplicate:event-slot:second',
          statement_timestamp(), '91111111-1111-4111-8111-111111111111'
        );

      insert into private.worship_reminder_schedules (
        campaign_id, event_id, reminder_slot,
        event_starts_at_snapshot, scheduled_for
      ) values
        (
          first_campaign_id, duplicate_event_id, 'one_hour_before',
          '2036-01-01T20:00:00+09:00', '2036-01-01T19:00:00+09:00'
        ),
        (
          second_campaign_id, duplicate_event_id, 'one_hour_before',
          '2036-01-01T20:00:00+09:00', '2036-01-01T19:00:00+09:00'
        );
    end;
    $body$
  $test$,
  '23505', null,
  'unique current event-start slot rejects a duplicate generation'
);

select * from finish();
rollback;
