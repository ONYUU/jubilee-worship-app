begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(64);

-- 1
select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and relation.relrowsecurity
  ),
  5::bigint,
  'RLS is enabled on all five mobile content tables'
);

-- 2
select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'public_event_setlists', 'public_setlist_items',
        'public_gallery_items', 'public_guide_sections'
      )
      and 'security_invoker=true' = any (coalesce(relation.reloptions, array[]::text[]))
  ),
  4::bigint,
  'all new public DTO views use security_invoker'
);

-- 3
select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'public_event_setlists', 'public_setlist_items',
        'public_gallery_items', 'public_guide_sections'
      )
      and 'security_barrier=true' = any (coalesce(relation.reloptions, array[]::text[]))
  ),
  4::bigint,
  'all new public DTO views are security barriers'
);

-- 4
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'anon receives no broad table-level SELECT on mobile source tables'
);

-- 5
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'authenticated receives no broad table-level SELECT on mobile source tables'
);

-- 6
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'public_event_setlists', 'public_setlist_items',
        'public_gallery_items', 'public_guide_sections'
      )
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  4::bigint,
  'anon can SELECT all four new public DTO views'
);

-- 7
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'public_event_setlists', 'public_setlist_items',
        'public_gallery_items', 'public_guide_sections'
      )
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  4::bigint,
  'authenticated can SELECT all four new public DTO views'
);

-- 8
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and column_name in (
        'created_by', 'updated_by', 'reviewed_by', 'published_by', 'withdrawn_by'
      )
      and grantee in ('anon', 'authenticated')
  ),
  'public roles cannot SELECT internal audit or approval UUIDs'
);

-- 9
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('event_sermon_revisions', 'event_setlists')
      and column_name in (
        'revision_no', 'status', 'review_requested_at', 'reviewed_at',
        'reviewed_by', 'published_at', 'published_by', 'withdrawn_at', 'withdrawn_by'
      )
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'revision and approval state is server-derived'
);

-- 10
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'request_event_sermon_review', 'publish_event_sermon_revision',
        'return_event_sermon_revision_to_draft', 'withdraw_event_sermon_revision',
        'request_event_setlist_review', 'publish_event_setlist_revision',
        'return_event_setlist_revision_to_draft', 'withdraw_event_setlist_revision'
      )
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'anon cannot execute approval workflow RPCs'
);

-- 11
select is(
  (
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'event_sermon_revisions_one_published_idx',
        'event_setlists_one_published_idx'
      )
      and indexdef like '%WHERE (status = ''published''::text)%'
  ),
  2::bigint,
  'sermon and setlist each allow at most one published revision per event'
);

-- 12
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.setlist_items'::regclass
      and conname = 'setlist_items_position_unique'
      and contype = 'u'
  ),
  'song position is unique within each setlist revision'
);

-- 13
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and policyname like '%_admin_%'
      and roles = array['authenticated']::name[]
  ),
  15::bigint,
  'all mobile content mutations have authenticated admin policies'
);

-- 14
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'event_sermon_revisions', 'event_setlists', 'setlist_items',
        'gallery_items', 'guide_sections'
      )
      and policyname like '%_public_read'
      and roles = array['anon']::name[]
  ),
  5::bigint,
  'all mobile source tables have explicit anon published-read policies'
);

-- 15
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'private'
      and routine_name in (
        'touch_audit_row', 'prepare_sermon_revision_insert',
        'prepare_setlist_revision_insert'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'mobile trigger functions are not directly executable by public roles'
);

-- 16
select is(
  (
    select string_agg(column_name::text, ',' order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_events'
      and column_name like 'sermon_%'
  ),
  'sermon_topic,sermon_revision_no,sermon_published_at'::text,
  'public_events contains the sermon DTO fields'
);

-- 17
select is(
  (
    select string_agg(column_name::text, ',' order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_setlist_items'
  ),
  'id,event_id,position,title,artist,musical_key,youtube_url'::text,
  'the public song DTO matches the mobile and admin contract'
);

insert into auth.users (id, email)
values
  ('55555555-5555-4555-8555-555555555555', 'mobile-owner@example.invalid'),
  ('66666666-6666-4666-8666-666666666666', 'mobile-user@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'mobile-editor@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('55555555-5555-4555-8555-555555555555', 'owner', true),
  ('77777777-7777-4777-8777-777777777777', 'editor', true);

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values (
  'mobile-content-test-event', 'Mobile content test',
  statement_timestamp() + interval '7 days', 'Asia/Seoul',
  '선두교회 본당', '인천광역시 서구', 'scheduled', true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

-- 18
select throws_ok(
  $$
    insert into public.event_sermon_revisions (event_id)
    select id from public.events where slug = 'mobile-content-test-event'
  $$,
  '42501',
  'new row violates row-level security policy for table "event_sermon_revisions"',
  'a normal authenticated user cannot create a sermon draft'
);

-- 19
select throws_ok(
  $$select public.request_event_sermon_review(0)$$,
  '42501',
  'Active admin access required',
  'a normal authenticated user cannot request sermon review'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 20
select lives_ok(
  $$
    insert into public.event_sermon_revisions (event_id, sermon_topic)
    select id, '예배자로 살아가기'
    from public.events
    where slug = 'mobile-content-test-event'
  $$,
  'an active editor can create an incomplete sermon draft'
);

reset role;

-- 21
select results_eq(
  $$
    select revision.revision_no, revision.status, revision.created_by
    from public.event_sermon_revisions as revision
    join public.events as event on event.id = revision.event_id
    where event.slug = 'mobile-content-test-event'
  $$,
  $$values (1::integer, 'draft'::text, '77777777-7777-4777-8777-777777777777'::uuid)$$,
  'the database derives the first draft revision and audit identity'
);

set local role authenticated;

-- 22
select throws_ok(
  $$
    select public.request_event_sermon_review(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event'
      )
    )
  $$,
  '23514',
  'A complete draft sermon revision is required for review',
  'a one-field sermon cannot be submitted for review'
);

-- 23
select lives_ok(
  $$
    update public.event_sermon_revisions
    set scripture_reference = '로마서 12:1-2'
    where event_id = (
      select id from public.events where slug = 'mobile-content-test-event'
    ) and revision_no = 1
  $$,
  'an editor can complete a draft sermon'
);

-- 24
select lives_ok(
  $$
    select public.request_event_sermon_review(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 1
      )
    )
  $$,
  'an editor can request review of a complete sermon draft'
);

-- 25
select results_eq(
  $$
    with changed as (
      update public.event_sermon_revisions
      set sermon_topic = '승인 전 변경 시도'
      where event_id = (
        select id from public.events where slug = 'mobile-content-test-event'
      ) and revision_no = 1
      returning id
    )
    select count(*) from changed
  $$,
  $$values (0::bigint)$$,
  'a review-requested sermon is immutable to editors'
);

-- 26
select throws_ok(
  $$
    select public.publish_event_sermon_revision(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 1
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot publish a sermon revision'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

-- 27
select lives_ok(
  $$
    select public.publish_event_sermon_revision(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 1
      )
    )
  $$,
  'an active owner can publish a reviewed sermon revision'
);

reset role;

-- 28
select ok(
  (
    select revision.status = 'published'
      and revision.reviewed_by = '55555555-5555-4555-8555-555555555555'::uuid
      and revision.published_by = '55555555-5555-4555-8555-555555555555'::uuid
      and revision.reviewed_at is not null
      and revision.published_at is not null
    from public.event_sermon_revisions as revision
    join public.events as event on event.id = revision.event_id
    where event.slug = 'mobile-content-test-event' and revision.revision_no = 1
  ),
  'sermon publication records owner review and publication metadata'
);

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 29
select results_eq(
  $$
    select sermon_topic, scripture_reference, sermon_revision_no
    from public.public_events
    where slug = 'mobile-content-test-event'
  $$,
  $$values ('예배자로 살아가기'::text, '로마서 12:1-2'::text, 1::integer)$$,
  'anon reads only the owner-approved sermon through public_events'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 30
select lives_ok(
  $$
    insert into public.event_sermon_revisions (
      event_id, sermon_topic, scripture_reference
    )
    select id, '새 예배자로 살아가기', '요한복음 4:23-24'
    from public.events
    where slug = 'mobile-content-test-event'
  $$,
  'an editor creates a new draft instead of editing the published sermon'
);

-- 31
select is(
  (
    select max(revision_no)
    from public.event_sermon_revisions as revision
    join public.events as event on event.id = revision.event_id
    where event.slug = 'mobile-content-test-event'
  ),
  2,
  'the database assigns the next sermon revision number'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 32
select results_eq(
  $$
    select sermon_topic, sermon_revision_no
    from public.public_events
    where slug = 'mobile-content-test-event'
  $$,
  $$values ('예배자로 살아가기'::text, 1::integer)$$,
  'the previous approved sermon remains public while revision two is a draft'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 33
select lives_ok(
  $$
    select public.request_event_sermon_review(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 2
      )
    )
  $$,
  'an editor can request review of sermon revision two'
);

-- 34
select results_eq(
  $$
    with changed as (
      update public.event_sermon_revisions
      set sermon_topic = '공개본 변경 시도'
      where event_id = (
        select id from public.events where slug = 'mobile-content-test-event'
      ) and revision_no = 1
      returning id
    )
    select count(*) from changed
  $$,
  $$values (0::bigint)$$,
  'an editor cannot mutate a published sermon revision'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

-- 35
select lives_ok(
  $$
    select public.publish_event_sermon_revision(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 2
      )
    )
  $$,
  'owner publication atomically replaces the sermon public revision'
);

reset role;

-- 36
select results_eq(
  $$
    select revision.revision_no, revision.status
    from public.event_sermon_revisions as revision
    join public.events as event on event.id = revision.event_id
    where event.slug = 'mobile-content-test-event'
    order by revision_no
  $$,
  $$values (1::integer, 'withdrawn'::text), (2::integer, 'published'::text)$$,
  'the old sermon is withdrawn when the new revision is published'
);

-- 37
select results_eq(
  $$
    select sermon_topic, scripture_reference, sermon_revision_no
    from public.public_events
    where slug = 'mobile-content-test-event'
  $$,
  $$values ('새 예배자로 살아가기'::text, '요한복음 4:23-24'::text, 2::integer)$$,
  'public_events switches both sermon fields in one approved revision'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 38
select lives_ok(
  $$
    insert into public.event_setlists (event_id, playlist_url)
    select id, 'https://www.youtube.com/playlist?list=PL1234567890'
    from public.events
    where slug = 'mobile-content-test-event'
  $$,
  'an active editor can create a setlist draft'
);

-- 39
select throws_ok(
  $$
    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    )
  $$,
  '23514',
  'A non-empty draft setlist is required for review',
  'an empty setlist cannot be submitted for review'
);

-- 40
select throws_ok(
  $$
    insert into public.setlist_items (setlist_id, position, title, youtube_url)
    select setlist.id, 1, 'Invalid source', 'https://example.com/song'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
  $$,
  '23514',
  null,
  'a non-YouTube listening URL is rejected'
);

-- 41
select lives_ok(
  $$
    insert into public.setlist_items (
      setlist_id, position, title, artist, musical_key, youtube_url
    )
    select setlist.id, 1, '주님만이', '쥬빌리워십', 'F#',
      'https://www.youtube.com/watch?v=O2mNdkl5q54'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
  $$,
  'an active editor can add a validated song to a draft setlist'
);

-- 42
select throws_ok(
  $$
    insert into public.setlist_items (setlist_id, position, title)
    select setlist.id, 1, 'Duplicate position'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
  $$,
  '23505',
  null,
  'duplicate song positions are rejected per setlist revision'
);

-- 43
select lives_ok(
  $$
    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    )
  $$,
  'an editor can request review of a non-empty setlist'
);

-- 44
select results_eq(
  $$
    with changed as (
      update public.setlist_items
      set title = '검수 중 변경 시도'
      where setlist_id = (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
      returning id
    )
    select count(*) from changed
  $$,
  $$values (0::bigint)$$,
  'songs become immutable after a setlist review request'
);

-- 45
select throws_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot publish a setlist revision'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

-- 46
select lives_ok(
  $$
    select public.verify_event_setlist_playlist(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    );

    select public.verify_setlist_item_youtube(
      (
        select item.id
        from public.setlist_items as item
        join public.event_setlists as setlist on setlist.id = item.setlist_id
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    );

    select public.publish_event_setlist_revision(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 1
      )
    )
  $$,
  'an active owner can publish a reviewed setlist'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 47
select results_eq(
  $$
    select event_slug, revision_no, is_changed
    from public.public_event_setlists
    where event_slug = 'mobile-content-test-event'
  $$,
  $$values ('mobile-content-test-event'::text, 1::integer, false)$$,
  'anon reads the initial owner-approved setlist DTO'
);

-- 48
select results_eq(
  $$
    select position, title, artist, musical_key
    from public.public_setlist_items
    where event_id = (
      select id from public.public_events where slug = 'mobile-content-test-event'
    )
  $$,
  $$values (1::integer, '주님만이'::text, '쥬빌리워십'::text, 'F#'::text)$$,
  'anon reads approved song details including the optional musical key'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 49
select lives_ok(
  $$
    insert into public.event_setlists (event_id)
    select id from public.events where slug = 'mobile-content-test-event'
  $$,
  'an editor creates a new draft instead of editing the published setlist'
);

-- 50
select lives_ok(
  $$
    insert into public.setlist_items (setlist_id, position, title, artist)
    select setlist.id, 1, '새 노래', '공식 아티스트'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 2;

    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an editor completes and requests review of setlist revision two'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 51
select results_eq(
  $$
    select revision_no, is_changed
    from public.public_event_setlists
    where event_slug = 'mobile-content-test-event'
  $$,
  $$values (1::integer, false)$$,
  'the first approved setlist remains public while revision two is reviewed'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

-- 52
select lives_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 2
      )
    )
  $$,
  'owner publication atomically replaces the setlist public revision'
);

reset role;

-- 53
select results_eq(
  $$
    select setlist.revision_no, setlist.status
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event'
    order by revision_no
  $$,
  $$values (1::integer, 'withdrawn'::text), (2::integer, 'published'::text)$$,
  'the old setlist is withdrawn when the new revision is published'
);

-- 54
select results_eq(
  $$
    select revision_no, is_changed
    from public.public_event_setlists
    where event_slug = 'mobile-content-test-event'
  $$,
  $$values (2::integer, true)$$,
  'the public DTO marks a later approved setlist as changed'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

-- 55
select lives_ok(
  $$
    insert into public.gallery_items (
      media_path, thumbnail_path, alt, caption, sort_order
    ) values
      ('gallery/mobile-public.webp', null, '함께 찬양하는 공동체', null, 10),
      ('gallery/mobile-draft.webp', null, '초안 사진', null, 20);

    insert into public.guide_sections (
      slug, title, body, kind, sort_order
    ) values
      ('mobile-first-visit', '처음 오셨나요?', '안내 문구', 'first_visit', 10),
      ('mobile-parking-draft', '주차 안내', '초안 문구', 'parking', 20);

    select set_config(
      'request.jwt.claims',
      '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
      true
    );

    select public.set_gallery_item_consent(
      (select id from public.gallery_items where media_path = 'gallery/mobile-public.webp'),
      true
    );

    select public.set_gallery_item_published(
      (select id from public.gallery_items where media_path = 'gallery/mobile-public.webp'),
      true
    );

    select public.set_guide_section_published(
      (select id from public.guide_sections where slug = 'mobile-first-visit'),
      true
    )
  $$,
  'an editor can draft gallery and guide content and an owner can publish it'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 56
select results_eq(
  $$select media_path from public.public_gallery_items where media_path like 'gallery/mobile-%'$$,
  $$values ('gallery/mobile-public.webp'::text)$$,
  'anon sees only published gallery records'
);

-- 57
select results_eq(
  $$select slug from public.public_guide_sections where slug like 'mobile-%'$$,
  $$values ('mobile-first-visit'::text)$$,
  'anon sees only published guide sections'
);

reset role;

update public.events
set published = false
where slug = 'mobile-content-test-event';

set local role anon;

-- 58
select results_eq(
  $$
    select
      (select count(*) from public.public_events where slug = 'mobile-content-test-event'),
      (select count(*) from public.public_event_setlists where event_slug = 'mobile-content-test-event')
  $$,
  $$values (0::bigint, 0::bigint)$$,
  'unpublishing an event hides its sermon and setlist DTOs'
);

reset role;
update public.events
set published = true
where slug = 'mobile-content-test-event';

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

-- 59
select lives_ok(
  $$
    select public.withdraw_event_sermon_revision(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.status = 'published'
      )
    )
  $$,
  'an owner can explicitly withdraw the current sermon revision'
);

-- 60
select lives_ok(
  $$
    select public.withdraw_event_setlist_revision(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.status = 'published'
      )
    )
  $$,
  'an owner can explicitly withdraw the current setlist revision'
);

-- 61
select lives_ok(
  $$
    insert into public.event_sermon_revisions (
      event_id, sermon_topic, scripture_reference
    )
    select id, '반려 테스트 설교', '시편 1:1-2'
    from public.events
    where slug = 'mobile-content-test-event';

    select public.request_event_sermon_review(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 3
      )
    );

    select public.return_event_sermon_revision_to_draft(
      (
        select revision.id
        from public.event_sermon_revisions as revision
        join public.events as event on event.id = revision.event_id
        where event.slug = 'mobile-content-test-event' and revision.revision_no = 3
      )
    )
  $$,
  'an owner can return a review-requested sermon to draft'
);

-- 62
select results_eq(
  $$
    select revision.status, revision.review_requested_at
    from public.event_sermon_revisions as revision
    join public.events as event on event.id = revision.event_id
    where event.slug = 'mobile-content-test-event' and revision.revision_no = 3
  $$,
  $$values ('draft'::text, null::timestamptz)$$,
  'returned sermon content is editable draft state again'
);

-- 63
select lives_ok(
  $$
    insert into public.event_setlists (event_id)
    select id from public.events where slug = 'mobile-content-test-event';

    insert into public.setlist_items (setlist_id, position, title)
    select setlist.id, 1, '반려 테스트 곡'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 3;

    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 3
      )
    );

    select public.return_event_setlist_revision_to_draft(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'mobile-content-test-event' and setlist.revision_no = 3
      )
    )
  $$,
  'an owner can return a review-requested setlist to draft'
);

-- 64
select results_eq(
  $$
    select setlist.status, setlist.review_requested_at
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'mobile-content-test-event' and setlist.revision_no = 3
  $$,
  $$values ('draft'::text, null::timestamptz)$$,
  'returned setlist content and songs are editable draft state again'
);

select * from finish();
rollback;
