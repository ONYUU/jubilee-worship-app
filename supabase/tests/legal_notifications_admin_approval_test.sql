begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(115);

-- 1
select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.legal_documents'::regclass
  ),
  'legal_documents has RLS enabled'
);

-- 2
select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'private'
      and relation.relname in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and relation.relrowsecurity
  ),
  6::bigint,
  'all six notification tables have RLS enabled'
);

-- 3
select ok(
  'security_invoker=true' = any (
    coalesce(
      (select reloptions from pg_class where oid = 'public.public_legal_documents'::regclass),
      array[]::text[]
    )
  ),
  'public_legal_documents is a security_invoker view'
);

-- 4
select ok(
  'security_barrier=true' = any (
    coalesce(
      (select reloptions from pg_class where oid = 'public.public_legal_documents'::regclass),
      array[]::text[]
    )
  ),
  'public_legal_documents is a security barrier'
);

-- 5
select ok(
  has_table_privilege('anon', 'public.public_legal_documents', 'SELECT'),
  'anon can read the legal DTO view'
);

-- 6
select ok(
  has_table_privilege('authenticated', 'public.public_legal_documents', 'SELECT'),
  'authenticated can read the legal DTO view'
);

-- 7
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'legal source table has no broad public SELECT grant'
);

-- 8
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and grantee in ('anon', 'authenticated')
  ),
  0::bigint,
  'anon and authenticated have no direct notification table privileges'
);

-- 9
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name like 'service_%'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'service Edge RPCs are not executable by public roles'
);

-- 10
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name like 'service_%'
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  11::bigint,
  'service_role can execute all eleven Edge and maintenance RPCs'
);

-- 11
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'admin_users'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0::bigint,
  'authenticated cannot mutate admin membership directly'
);

-- 12
select is(
  (
    select count(*)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'admin_users'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
      and column_name in ('approved_by', 'approved_at', 'created_at', 'updated_at')
  ),
  4::bigint,
  'admin approval metadata has explicit authenticated SELECT grants'
);

-- 13
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and column_name in ('created_by', 'updated_by', 'published_by', 'withdrawn_by')
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ),
  'legal audit UUIDs are not selectable by public roles'
);

-- 14
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and column_name in ('status', 'published_at', 'published_by', 'withdrawn_at', 'withdrawn_by')
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'legal publication state is server-derived'
);

-- 15
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'legal_documents_one_published_type_idx'
      and indexdef like '%WHERE (status = ''published''::text)%'
  ),
  'each legal document type has at most one published row'
);

-- 16
select is(
  (
    select count(*)
    from pg_constraint
    where conrelid in (
      'private.notification_campaigns'::regclass,
      'private.notification_outbox'::regclass
    )
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%dedupe_key%'
  ),
  2::bigint,
  'campaign and outbox both enforce dedupe keys'
);

-- 17
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'app_installations'
      and column_name in ('secret', 'installation_secret', 'secret_plaintext')
  ),
  'installation secret plaintext has no database column'
);

-- 18
select ok(
  (
    select pg_get_constraintdef(constraint_row.oid)
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'private.app_installations'::regclass
      and pg_get_constraintdef(constraint_row.oid) like '%secret_hash%'
    limit 1
  ) like '%[0-9a-f]{64}%',
  'installation secret hash is constrained to lowercase SHA-256 hex'
);

-- 19
select is(
  (select public from storage.buckets where id = 'gallery-staging'),
  false,
  'gallery staging bucket is private'
);

-- 20
select ok(
  (
    select
      pg_get_expr(policy.polwithcheck, policy.polrelid) like '%app-gallery%'
      and pg_get_expr(policy.polwithcheck, policy.polrelid) like '%is_owner%'
    from pg_policy as policy
    where policy.polname = 'public_media_admin_insert'
      and policy.polrelid = 'storage.objects'::regclass
  ),
  'public app-gallery object writes include an owner gate'
);

-- 21
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('gallery_items', 'guide_sections')
      and column_name = 'published'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'gallery and guide published flags cannot be written directly'
);

-- 22
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'publish_legal_document', 'withdraw_legal_document',
        'set_gallery_item_consent', 'set_gallery_item_published',
        'set_guide_section_published', 'verify_event_setlist_playlist',
        'verify_setlist_item_youtube'
      )
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'anon cannot execute owner publication RPCs'
);

-- 23
select is(
  (
    select string_agg(column_name::text, ',' order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'public_legal_documents'
  ),
  'id,document_type,version,title,body,effective_on,published_at'::text,
  'public legal DTO contains only the intended seven columns'
);

-- 24
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'approve_admin_user', 'set_admin_user_active', 'set_admin_user_role'
      )
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ),
  3::bigint,
  'authenticated sessions can call the three owner-gated admin RPCs'
);

-- 25
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'create_notification_campaign', 'update_notification_campaign',
        'delete_notification_campaign', 'list_notification_campaigns',
        'approve_notification_campaign', 'queue_notification_campaign'
      )
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ),
  6::bigint,
  'authenticated admins can call campaign RPCs whose bodies enforce role gates'
);

-- 26
select is(
  (
    select count(*)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like 'service_%'
      and procedure.prosecdef
      and 'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
  ),
  11::bigint,
  'all service RPCs are security definer functions with a fixed empty search path'
);

-- 27
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
  ),
  6::bigint,
  'service_role has explicit access to all six private notification tables'
);

-- 28
select ok(
  exists (
    select 1 from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'is_owner'
      and procedure.prosecdef
  ),
  'private.is_owner exists as a security definer predicate'
);

insert into auth.users (id, email)
values
  ('81111111-1111-4111-8111-111111111111', 'followup-owner@example.invalid'),
  ('82222222-2222-4222-8222-222222222222', 'followup-editor@example.invalid'),
  ('83333333-3333-4333-8333-333333333333', 'followup-user@example.invalid'),
  ('84444444-4444-4444-8444-444444444444', 'followup-target@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('81111111-1111-4111-8111-111111111111', 'owner', true),
  ('82222222-2222-4222-8222-222222222222', 'editor', true);

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values (
  'followup-security-event', 'Follow-up security event',
  statement_timestamp() + interval '7 days', 'Asia/Seoul',
  '선두교회 본당', '인천광역시 서구', 'scheduled', true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 29
select lives_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values (
      'privacy_policy', '1.0.0', '개인정보 처리방침',
      E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화 첫 번째 공개 문서 본문\n알림 제공에만 사용합니다. 예배 알림 선택은 종교적 관심을 추론할 수 있습니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n수탁자: 검증 수탁자\n이전 국가: 검증 국가\n이전 항목: 설치 식별자 및 푸시 토큰\n이전 시점 및 방법: 서비스 이용 시 암호화 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단',
      current_date
    )
  $$,
  'an active editor can create a legal draft'
);

-- 30
select throws_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '1.0.0'))$$,
  '42501',
  'Active owner access required',
  'an editor cannot publish a legal document'
);

-- 31
select lives_ok(
  $$
    select public.create_notification_campaign(
      'setlist_update', '송리스트 공개', '새 송리스트가 공개되었습니다.',
      'jubileeworship://worship/followup-security-event/songlist',
      'setlist_updates',
      (select id from public.events where slug = 'followup-security-event'),
      null,
      'setlist:followup-security-event:1'
    )
  $$,
  'an active editor can create a notification campaign draft'
);

-- 32
select throws_ok(
  $$
    select public.approve_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot approve a campaign'
);

-- 33
select throws_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot queue a campaign'
);

-- 34
select throws_ok(
  $$select public.approve_admin_user('84444444-4444-4444-8444-444444444444'::uuid)$$,
  '42501',
  'Active owner access required',
  'an editor cannot approve another administrator'
);

-- 35
select is(
  (select count(*) from public.admin_users),
  1::bigint,
  'an editor can see only their own active admin row'
);

-- 36
select lives_ok(
  $$
    insert into public.gallery_items (media_path, alt, caption, sort_order)
    values ('/images/gallery/followup-test.webp', '검증용 예배 사진', '검증용 사진', 1)
  $$,
  'an editor can create an unpublished gallery item'
);

-- 37
select throws_ok(
  $$update public.gallery_items set published = true where media_path = '/images/gallery/followup-test.webp'$$,
  '42501',
  null,
  'an editor cannot directly publish a gallery item'
);

-- 38
select lives_ok(
  $$
    insert into public.guide_sections (slug, title, body, kind, sort_order)
    values ('followup-parking', '주차 안내', '현장 안내를 따라 주세요.', 'parking', 1)
  $$,
  'an editor can create an unpublished guide section'
);

-- 39
select throws_ok(
  $$update public.guide_sections set published = true where slug = 'followup-parking'$$,
  '42501',
  null,
  'an editor cannot directly publish a guide section'
);

-- 40
select lives_ok(
  $$
    insert into public.event_setlists (event_id)
    select id from public.events where slug = 'followup-security-event'
  $$,
  'an editor can leave revision one unpublished'
);

-- 41
select lives_ok(
  $$
    insert into public.event_setlists (event_id, playlist_url)
    select id, 'https://www.youtube.com/playlist?list=PL1234567890'
    from public.events where slug = 'followup-security-event'
  $$,
  'an editor can create revision two with a YouTube playlist'
);

-- 42
select lives_ok(
  $$
    insert into public.setlist_items (
      setlist_id, position, title, artist, musical_key, youtube_url
    )
    select setlist.id, 1, '검증용 찬양', '공식 아티스트', 'G',
      'https://www.youtube.com/watch?v=O2mNdkl5q54'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'followup-security-event' and setlist.revision_no = 2
  $$,
  'an editor can add a linked song to the second draft'
);

-- 43
select lives_ok(
  $$
    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an editor can request setlist review before owner link verification'
);

-- 44
select throws_ok(
  $$
    select public.verify_event_setlist_playlist(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot verify the playlist source'
);

-- 45
select throws_ok(
  $$
    select public.verify_setlist_item_youtube(
      (
        select item.id from public.setlist_items as item
        join public.event_setlists as setlist on setlist.id = item.setlist_id
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot verify a song source'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 46
select throws_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '23514',
  'A reviewed setlist with owner-verified YouTube links is required',
  'owner publication is blocked until every YouTube source is verified'
);

-- 47
select lives_ok(
  $$
    select public.verify_event_setlist_playlist(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can verify the playlist source'
);

-- 48
select lives_ok(
  $$
    select public.verify_setlist_item_youtube(
      (
        select item.id from public.setlist_items as item
        join public.event_setlists as setlist on setlist.id = item.setlist_id
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can verify a song source'
);

-- 49
select lives_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can publish the fully verified setlist'
);

-- 50
select results_eq(
  $$
    select revision_no, is_changed
    from public.public_event_setlists
    where event_slug = 'followup-security-event'
  $$,
  $$values (2::integer, false)$$,
  'the first actual publication is not marked changed even when it is revision two'
);

-- 51
select throws_ok(
  $$
    select public.set_gallery_item_published(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'gallery publication is blocked before consent confirmation'
);

-- 52
select lives_ok(
  $$
    select public.set_gallery_item_consent(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  'an owner can record gallery consent'
);

-- 53
select lives_ok(
  $$
    select public.set_gallery_item_published(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  'an owner can publish a consent-confirmed gallery item'
);

do $setup$
declare
  legacy_gallery_id bigint;
begin
  insert into public.gallery_items (media_path, alt, caption, sort_order)
  values (
    'storage://public-media/gallery/pgtap-editor-controlled.webp',
    '기존 웹 경로 차단 테스트',
    'editor가 쓰기 가능한 경로',
    990
  )
  returning id into legacy_gallery_id;

  perform public.set_gallery_item_consent(legacy_gallery_id, true);
end;
$setup$;

select throws_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = 'storage://public-media/gallery/pgtap-editor-controlled.webp'
      ),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'an editor-writable legacy Storage locator cannot be published in the app gallery'
);

-- 54
select lives_ok(
  $$
    select public.set_guide_section_published(
      (select id from public.guide_sections where slug = 'followup-parking'),
      true
    )
  $$,
  'an owner can publish a guide section'
);

-- 55
select lives_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '1.0.0'))$$,
  'an owner can publish a current legal draft'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 56
select results_eq(
  $$select document_type, version, title from public.public_legal_documents$$,
  $$values ('privacy_policy'::text, '1.0.0'::text, '개인정보 처리방침'::text)$$,
  'anon reads the current legal DTO'
);

-- 57
select results_eq(
  $$select media_path, alt from public.public_gallery_items where sort_order = 1$$,
  $$values ('/images/gallery/followup-test.webp'::text, '검증용 예배 사진'::text)$$,
  'anon sees the owner-published gallery item'
);

-- 58
select results_eq(
  $$select slug, title from public.public_guide_sections where slug = 'followup-parking'$$,
  $$values ('followup-parking'::text, '주차 안내'::text)$$,
  'anon sees the owner-published guide section'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    with attempted as (
      update public.gallery_items
      set alt = '공개본 우회 수정'
      where media_path = '/images/gallery/followup-test.webp'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot directly update a published gallery row'
);

select results_eq(
  $$
    with attempted as (
      delete from public.guide_sections
      where slug = 'followup-parking'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot directly delete a published guide row'
);

-- 59
select lives_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values (
      'privacy_policy', '2.0.0', '개인정보 처리방침 개정',
      E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화 두 번째 공개 문서 본문\n알림 제공에만 사용합니다. 예배 알림 선택은 종교적 관심을 추론할 수 있습니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n수탁자: 검증 수탁자\n이전 국가: 검증 국가\n이전 항목: 설치 식별자 및 푸시 토큰\n이전 시점 및 방법: 서비스 이용 시 암호화 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단',
      current_date
    )
  $$,
  'an editor can prepare a replacement legal draft'
);

-- 60
select throws_ok(
  $$
    select public.create_notification_campaign(
      'setlist_update', '중복', '중복 방지', null, 'setlist_updates',
      (select id from public.events where slug = 'followup-security-event'),
      null, 'setlist:followup-security-event:1'
    )
  $$,
  '23505',
  null,
  'campaign dedupe keys reject a duplicate draft'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 61
select lives_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '2.0.0'))$$,
  'owner publication atomically replaces the current legal document'
);

-- 62
select results_eq(
  $$select version, status from public.legal_documents order by version$$,
  $$values ('1.0.0'::text, 'withdrawn'::text), ('2.0.0'::text, 'published'::text)$$,
  'the old legal version is withdrawn when the replacement is published'
);

-- 63
select lives_ok(
  $$select public.withdraw_legal_document((select id from public.legal_documents where version = '2.0.0'))$$,
  'an owner can withdraw the current legal document'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 64
select is(
  (select count(*) from public.public_legal_documents),
  0::bigint,
  'withdrawn legal documents disappear from the public DTO'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 65
select lives_ok(
  $$select public.approve_admin_user('84444444-4444-4444-8444-444444444444'::uuid)$$,
  'an owner can approve an Auth user as an editor'
);

-- 66
select results_eq(
  $$
    select role, is_active, approved_by is not null, approved_at is not null
    from public.admin_users
    where user_id = '84444444-4444-4444-8444-444444444444'::uuid
  $$,
  $$values ('editor'::text, true, true, true)$$,
  'admin approval records the default role, approver, and approval time'
);

-- 67
select lives_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'owner')$$,
  'an owner can manually promote another approved admin'
);

-- 68
select lives_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'editor')$$,
  'an owner can demote a second owner while another active owner remains'
);

-- 69
select lives_ok(
  $$select public.set_admin_user_active('84444444-4444-4444-8444-444444444444'::uuid, false)$$,
  'an owner can deactivate another approved administrator'
);

-- 70
select throws_ok(
  $$select public.set_admin_user_active('81111111-1111-4111-8111-111111111111'::uuid, false)$$,
  '23514',
  'An owner cannot deactivate their own account',
  'an owner cannot deactivate their own account'
);

-- 71
select throws_ok(
  $$select public.set_admin_user_role('81111111-1111-4111-8111-111111111111'::uuid, 'editor')$$,
  '23514',
  'The last active owner cannot be demoted',
  'the last active owner cannot be demoted'
);

-- 72
select lives_ok(
  $$
    select public.approve_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'an owner can approve a campaign'
);

-- 73
select lives_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'an owner can queue an approved campaign'
);

-- 74
select lives_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'queuing an already queued campaign is idempotent'
);

select lives_ok(
  $$
    select public.schedule_worship_reminder_campaign(
      (select id from public.events where slug = 'followup-security-event'),
      '내일은 쥬빌리워십 예배가 있습니다',
      '예배 시간과 장소를 확인해 주세요.'
    )
  $$,
  'an owner can manually approve both timed worship reminders'
);

select results_eq(
  $$
    with repeated as (
      select public.schedule_worship_reminder_campaign(
        (select id from public.events where slug = 'followup-security-event'),
        '내일은 쥬빌리워십 예배가 있습니다',
        '예배 시간과 장소를 확인해 주세요.'
      ) as campaign_id
    )
    select
      repeated.campaign_id = (
        select reminder.campaign_id
        from public.list_worship_reminder_schedules() as reminder
        where reminder.event_id = (
          select id from public.events where slug = 'followup-security-event'
        )
          and reminder.reminder_slot = 'day_before_1930'
          and reminder.requires_reapproval = false
      )
      and (
        select count(*)
        from public.list_worship_reminder_schedules() as reminder
        where reminder.event_id = (
          select id from public.events where slug = 'followup-security-event'
        )
          and reminder.requires_reapproval = false
      ) = 2
    from repeated
  $$,
  $$values (true)$$,
  'preparing the same two event reminders is idempotent'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 75
select throws_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'owner')$$,
  '42501',
  'Active owner access required',
  'an editor cannot change administrator roles'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"83333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

-- 76
select throws_ok(
  $$select * from public.list_notification_campaigns()$$,
  '42501',
  'Active admin access required',
  'a normal authenticated user cannot list campaigns'
);

-- 77
select throws_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values ('privacy_policy', '3.0.0', '차단', '차단', current_date)
  $$,
  '42501',
  null,
  'a normal authenticated user cannot create a legal draft'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for - interval '1 second'
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  0,
  'the KST due worker does not queue before the D-1 19:30 slot'
);

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  1,
  'the KST due worker queues the owner-approved D-1 19:30 reminder'
);

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  0,
  'the D-1 reminder due worker is idempotent'
);

select is(
  (
    select count(*)
    from private.notification_outbox as outbox
    join private.notification_campaigns as campaign on campaign.id = outbox.campaign_id
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = campaign.id
    where campaign.kind = 'worship_reminder'
      and campaign.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
      and schedule.reminder_slot = 'day_before_1930'
  ),
  1::bigint,
  'the D-1 reminder has exactly one deduplicated outbox row'
);

-- 78
select lives_ok(
  $$
    select public.service_register_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64), 'ios', '0.1.0',
      'ExpoPushToken[database_test_token]', repeat('b', 64),
      true, true, true
    )
  $$,
  'the service role can register an anonymous installation'
);

-- 79
select ok(
  (
    select secret_hash = repeat('a', 64)
      and secret_hash <> 'raw-installation-secret'
    from private.app_installations
    where id = '85555555-5555-4555-8555-555555555555'::uuid
  ),
  'only the installation secret hash is stored'
);

-- 80
select throws_ok(
  $$
    select public.service_register_app_installation(
      '86666666-6666-4666-8666-666666666666'::uuid,
      repeat('c', 64), 'android', '0.1.0',
      'ExpoPushToken[database_test_token]', repeat('b', 64),
      false, false, false
    )
  $$,
  '23505',
  null,
  'the same push token hash cannot register twice'
);

-- 81
select throws_ok(
  $$
    select public.service_update_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('f', 64), '0.1.1', null, null, true, true, true
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'an incorrect installation secret hash cannot change settings'
);

-- 82
select lives_ok(
  $$
    select public.service_update_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64), '0.1.1', null, null, false, true, true
    )
  $$,
  'the correct installation secret hash can change notification settings'
);

-- 83
select is(
  (select count(*) from private.notification_outbox where dedupe_key = 'setlist:followup-security-event:1'),
  1::bigint,
  'idempotent queueing creates exactly one outbox row'
);

-- 84
select is(
  (
    select count(*)
    from public.service_claim_notification_outbox('pgtap-worker', 1)
    where delivery_id is not null
  ),
  1::bigint,
  'the worker claim creates one eligible delivery'
);

-- 85
select is(
  (
    select count(*)
    from private.notification_deliveries
    where status = 'queued'
  ),
  1::bigint,
  'delivery generation is deduplicated for the campaign and endpoint'
);

-- 86
select lives_ok(
  $$
    select public.service_record_push_ticket(
      (select id from private.notification_deliveries limit 1),
      'ok', 'pgtap-ticket-1', null
    )
  $$,
  'the worker can record an accepted Expo ticket'
);

-- 87
select lives_ok(
  $$
    select public.service_finish_notification_campaign(
      (select id from private.notification_campaigns where dedupe_key = 'setlist:followup-security-event:1'),
      true, null
    )
  $$,
  'the worker can complete a claimed campaign'
);

-- 88
select results_eq(
  $$select expo_ticket_id from public.service_list_pending_push_receipts(10)$$,
  $$values ('pgtap-ticket-1'::text)$$,
  'accepted tickets are listed for receipt processing'
);

-- 89
select lives_ok(
  $$
    select public.service_apply_push_receipt(
      (select id from private.notification_deliveries limit 1),
      'error', 'pgtap-ticket-1', 'DeviceNotRegistered'
    )
  $$,
  'a DeviceNotRegistered receipt is recorded'
);

-- 90
select results_eq(
  $$
    select is_active, disable_reason
    from private.push_endpoints
    where installation_id = '85555555-5555-4555-8555-555555555555'::uuid
  $$,
  $$values (false, 'DeviceNotRegistered'::text)$$,
  'DeviceNotRegistered disables the push endpoint'
);

-- 91
select lives_ok(
  $$
    select public.service_unregister_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64)
    )
  $$,
  'the installation secret can unregister the installation'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test.webp'
      ),
      false
    )
  $$,
  'an owner can unpublish a gallery item before editor changes'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    update public.gallery_items
    set media_path = '/images/gallery/followup-test-replaced.webp'
    where media_path = '/images/gallery/followup-test.webp'
  $$,
  'an editor can replace a gallery locator without inheriting prior consent'
);

select results_eq(
  $$
    select published, consent_confirmed_at is null, consent_confirmed_by is null
    from public.gallery_items
    where media_path = '/images/gallery/followup-test-replaced.webp'
  $$,
  $$values (false, true, true)$$,
  'a gallery locator change clears consent and immediately unpublishes the item'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'gallery/pgtap-editor-existing-site.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  'an editor retains the existing website gallery upload path'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'app-gallery/pgtap-editor-blocked.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  null,
  'an editor cannot write the app-gallery publication path'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'app-gallery/pgtap-owner-approved.webp',
      '81111111-1111-4111-8111-111111111111'
    )
  $$,
  'an owner can write the app-gallery publication path'
);

select throws_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'the replaced gallery item cannot be republished with stale consent'
);

select lives_ok(
  $$
    select public.set_gallery_item_consent(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  'an owner can reconfirm consent for the final public locator'
);

select lives_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  'an owner can republish after reconfirming consent'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select results_eq(
  $$
    select media_path
    from public.public_gallery_items
    where media_path = '/images/gallery/followup-test-replaced.webp'
  $$,
  $$values ('/images/gallery/followup-test-replaced.webp'::text)$$,
  'anon sees only the reconfirmed replacement locator'
);

reset role;

insert into storage.objects (bucket_id, name, owner_id)
values (
  'gallery-staging',
  'gallery/pgtap-consent-locked.webp',
  '82222222-2222-4222-8222-222222222222'
);

insert into public.gallery_items (media_path, alt, caption, sort_order)
values
  (
    'storage://gallery-staging/gallery/pgtap-consent-locked.webp',
    '동의 잠금 테스트',
    '존재하는 스테이징 객체',
    991
  ),
  (
    'storage://gallery-staging/gallery/pgtap-consent-missing.webp',
    '재생성 차단 테스트',
    '현재 없는 스테이징 객체',
    992
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.set_gallery_item_consent(gallery.id, true)
    from public.gallery_items as gallery
    where gallery.media_path like 'storage://gallery-staging/gallery/pgtap-consent-%'
  $$,
  'an owner can confirm consent for staged gallery locators'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    with attempted as (
      update storage.objects
      set metadata = '{"pgtap":true}'::jsonb
      where bucket_id = 'gallery-staging'
        and name = 'gallery/pgtap-consent-locked.webp'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot replace bytes at a consent-confirmed staging locator'
);

select ok(
  (
    select pg_get_expr(policy.polqual, policy.polrelid)
      like '%gallery_staging_object_has_consent%'
    from pg_policy as policy
    where policy.polname = 'gallery_staging_admin_delete'
      and policy.polrelid = 'storage.objects'::regclass
  ),
  'the staging delete policy protects consent-confirmed object names'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'gallery-staging',
      'gallery/pgtap-consent-missing.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  null,
  'an editor cannot recreate a missing object at a consent-confirmed locator'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy', 'sensitive-disclosure-bypass', '민감정보 공개 gate 검증',
  E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n알림 제공에만 사용합니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n수탁자: 검증 수탁자\n이전 국가: 검증 국가\n이전 항목: 설치 식별자 및 푸시 토큰\n이전 시점 및 방법: 서비스 이용 시 암호화 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단',
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'sensitive-disclosure-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot publish a privacy policy without the religious-interest disclosure'
);

reset role;

select * from finish();
rollback;
