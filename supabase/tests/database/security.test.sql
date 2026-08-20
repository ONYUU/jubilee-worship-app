begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(74);

-- 1
select is(
  (
    select count(*)
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'admin_users', 'site_settings', 'events', 'announcements',
        'media_items', 'team_members'
      )
      and c.relrowsecurity
  ),
  6::bigint,
  'RLS is enabled on all six application tables'
);

-- 2
select is(
  (
    select count(*)
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and 'security_invoker=true' = any (coalesce(c.reloptions, array[]::text[]))
  ),
  5::bigint,
  'all public DTO views are security_invoker views'
);

-- 3
select is(
  (
    select count(*)
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and 'security_barrier=true' = any (coalesce(c.reloptions, array[]::text[]))
  ),
  5::bigint,
  'all public DTO views are security barriers'
);

-- 4
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'admin_users', 'site_settings', 'events', 'announcements',
        'media_items', 'team_members'
      )
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'anon has no table-level SELECT grant on source tables'
);

-- 5
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'admin_users', 'site_settings', 'events', 'announcements',
        'media_items', 'team_members'
      )
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'authenticated has no table-level SELECT grant on source tables'
);

-- 6
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  5::bigint,
  'anon can SELECT all public DTO views'
);

-- 7
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  5::bigint,
  'authenticated can SELECT all public DTO views'
);

-- 8
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'contact_email'
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  'anon cannot SELECT contact_email'
);

-- 9
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'contact_email'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  'authenticated cannot SELECT contact_email directly'
);

-- 10
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('events', 'announcements', 'media_items', 'team_members')
      and column_name in ('created_by', 'updated_by', 'verified_by')
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ),
  'public roles cannot SELECT audit identity UUIDs'
);

-- 11
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'media_items'
      and column_name in ('verification_status', 'verified_at', 'verified_by')
      and grantee = 'anon'
      and privilege_type = 'SELECT'
  ),
  'anon cannot SELECT internal verification fields'
);

-- 12
select is(
  (select public from storage.buckets where id = 'public-media'),
  true,
  'public-media is a public bucket'
);

-- 13
select is(
  (select file_size_limit from storage.buckets where id = 'public-media'),
  10485760::bigint,
  'public-media has a 10 MiB object limit'
);

-- 14
select is(
  (
    select array_agg(mime order by mime)
    from storage.buckets as b,
      unnest(b.allowed_mime_types) as mime
    where b.id = 'public-media'
  ),
  array['image/avif', 'image/jpeg', 'image/png', 'image/webp']::text[],
  'public-media accepts exactly the four raster MIME types'
);

-- 15
select ok(
  not exists (
    select 1
    from storage.buckets as b,
      unnest(b.allowed_mime_types) as mime
    where b.id = 'public-media'
      and mime = 'image/svg+xml'
  ),
  'SVG is not allowed in public-media'
);

-- 16
select is(
  (
    select count(*)
    from private.youtube_channel_allowlist
    where channel_id = 'UCxmosyyztNo7HBUOdN_gy9w'
      and is_active = true
  ),
  1::bigint,
  'the current YouTube channel ID is active in the allowlist'
);

-- 17
select is(
  (
    select count(*)
    from private.youtube_channel_allowlist
    where channel_id = 'UCOa89CrCUuAgvL0kITqPEDA'
      and is_active = true
  ),
  0::bigint,
  'the superseded YouTube channel ID is not active'
);

-- 18
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.team_members'::regclass
      and conname = 'team_members_name_role_unique'
      and contype = 'u'
  ),
  'team member name and role have a database uniqueness constraint'
);

-- 19
select ok(
  (
    select pg_get_expr(polqual, polrelid)
    from pg_policy
    where polrelid = 'public.announcements'::regclass
      and polname = 'announcements_public_read'
  ) like '%starts_at%'
  and (
    select pg_get_expr(polqual, polrelid)
    from pg_policy
    where polrelid = 'public.announcements'::regclass
      and polname = 'announcements_public_read'
  ) like '%expires_at%',
  'announcement public RLS includes start and expiry boundaries'
);

-- 20
select ok(
  (
    select count(*) = 4
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'public_media_admin_%'
      and roles = array['authenticated']::name[]
  ),
  'all four public-media object policies target authenticated only'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'db-admin@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'db-user@example.invalid'),
  ('33333333-3333-4333-8333-333333333333', 'db-inactive@example.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'db-spoof@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('11111111-1111-4111-8111-111111111111', 'owner', true),
  ('33333333-3333-4333-8333-333333333333', 'editor', false);

insert into public.announcements (
  slug, kind, title, body, starts_at, expires_at, published
)
values
  (
    'security-test-active', 'normal', 'Active', 'Visible now',
    statement_timestamp() - interval '1 hour',
    statement_timestamp() + interval '1 hour', true
  ),
  (
    'security-test-future', 'normal', 'Future', 'Not visible yet',
    statement_timestamp() + interval '1 day',
    statement_timestamp() + interval '2 days', true
  ),
  (
    'security-test-expired', 'normal', 'Expired', 'No longer visible',
    statement_timestamp() - interval '2 days',
    statement_timestamp() - interval '1 day', true
  ),
  (
    'security-test-unpublished', 'normal', 'Draft', 'Never public',
    null, null, false
  );

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 21
select is(
  (select count(*) from public.public_events where slug = 'jubilee-worship-2026-09-04'),
  1::bigint,
  'anon can read a published event through its DTO view'
);

-- 22
select throws_ok(
  $$select contact_email from public.site_settings$$,
  '42501',
  'permission denied for table site_settings',
  'anon cannot query the private contact field'
);

-- 23
select results_eq(
  $$
    select slug
    from public.public_announcements
    where slug like 'security-test-%'
    order by slug
  $$,
  $$values ('security-test-active'::text)$$,
  'anon sees only an active published announcement'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 24
select is(
  (select count(*) from public.public_announcements where slug = 'security-test-unpublished'),
  0::bigint,
  'a normal authenticated user cannot read an unpublished announcement'
);

-- 25
select throws_ok(
  $$
    insert into public.events (
      slug, title, starts_at, timezone, venue_name, address, status, published
    ) values (
      'security-test-normal-denied', 'Denied', statement_timestamp() + interval '1 day',
      'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', false
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "events"',
  'a normal authenticated user cannot insert an event'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

-- 26
select throws_ok(
  $$
    insert into public.events (
      slug, title, starts_at, timezone, venue_name, address, status, published
    ) values (
      'security-test-inactive-denied', 'Denied', statement_timestamp() + interval '1 day',
      'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', false
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "events"',
  'an inactive admin cannot insert an event'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 27
select lives_ok(
  $$
    insert into public.events (
      slug, title, starts_at, timezone, venue_name, address, status, published
    ) values (
      'security-test-admin-event', 'Admin event', statement_timestamp() + interval '1 day',
      'Asia/Seoul', '선두교회 본당', '인천광역시 서구', 'scheduled', false
    )
  $$,
  'an active admin can insert an event'
);

reset role;

-- 28
select is(
  (select created_by from public.events where slug = 'security-test-admin-event'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'the insert audit trigger records auth.uid()'
);

set local role authenticated;

-- 29
select throws_ok(
  $$
    update public.events
    set updated_by = '44444444-4444-4444-8444-444444444444'
    where slug = 'security-test-admin-event'
  $$,
  '42501',
  'permission denied for table events',
  'an admin cannot write an audit column directly'
);

-- 30
select lives_ok(
  $$
    update public.events
    set title = 'Admin event updated'
    where slug = 'security-test-admin-event'
  $$,
  'an active admin can update an editable event column'
);

reset role;

-- 31
select is(
  (select updated_by from public.events where slug = 'security-test-admin-event'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'the update audit trigger records auth.uid()'
);

set local role authenticated;

-- 32
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label,
      youtube_channel_id, verification_status, published
    ) values (
      'security-test-forged-verification', 'Forged verification', 'youtube_video', 'youtube',
      'abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'Unknown',
      'UC0000000000000000000000', 'verified', true
    )
  $$,
  '42501',
  'permission denied for table media_items',
  'an admin cannot write server-derived YouTube verification columns'
);

-- 33
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label, published
    ) values (
      'security-test-pending-publish', 'Pending item', 'youtube_video', 'youtube',
      'abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'Unknown', true
    )
  $$,
  '23514',
  'An unknown YouTube video must remain pending and unpublished',
  'an unknown YouTube video cannot be published'
);

-- 34
select lives_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label, published
    ) values (
      'security-test-verified-video', 'Verified item', 'youtube_video', 'youtube',
      'O2mNdkl5q54', 'https://www.youtube.com/watch?v=O2mNdkl5q54', 'Untrusted',
      true
    )
  $$,
  'an active admin can publish a video from the private video allowlist'
);

reset role;

-- 35
select is(
  (select verified_by from public.media_items where slug = 'security-test-verified-video'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'the verification trigger records the verifier'
);

set local role authenticated;

-- 36
select throws_ok(
  $$
    insert into public.team_members (
      name, role_title, category, sort_order, published
    ) values ('김두진', '목사', 'minister', 999, false)
  $$,
  '23505',
  'duplicate key value violates unique constraint "team_members_name_role_unique"',
  'the database rejects a duplicate team member identity'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 37
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values ('public-media', 'gallery/security-test-normal.webp', '{"mimetype":"image/webp"}')
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a normal authenticated user cannot insert a Storage object'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 38
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values ('public-media', 'brand/security-test.svg', '{"mimetype":"image/svg+xml"}')
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an active admin cannot insert an SVG object'
);

-- 39
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values ('public-media', 'unapproved/security-test.webp', '{"mimetype":"image/webp"}')
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an active admin cannot insert into an unapproved top-level folder'
);

-- 40
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values ('public-media', 'gallery/security-test.webp', '{"mimetype":"image/webp"}')
  $$,
  'an active admin can insert an allowed raster object path'
);

reset role;

-- 41
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'public-media'
      and name = 'gallery/security-test.webp'
  ),
  1::bigint,
  'the allowed Storage object insert persisted in the test transaction'
);

-- 42
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_media_items'
      and column_name in ('verification_status', 'verified_at', 'verified_by')
  ),
  'the public media DTO excludes verification internals'
);

-- 43
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and column_name in (
        'contact_email', 'created_at', 'updated_at', 'created_by', 'updated_by',
        'published_at', 'verified_at', 'verified_by'
      )
  ),
  'public DTO views exclude private and audit columns'
);

-- 44
select is(
  (select youtube_channel_id from public.site_settings where id = 1),
  'UCxmosyyztNo7HBUOdN_gy9w'::text,
  'site settings use the current YouTube channel ID'
);

-- 45
select is(
  (
    select verification_status
    from public.media_items
    where slug = 'jubilee-worship-live-2026-07'
  ),
  'verified'::text,
  'the allowlisted fixture is verified by the database trigger'
);

-- 46
select is(
  (
    select count(*)
    from public.public_media_items
    where slug = 'jubilee-worship-live-2026-07'
  ),
  1::bigint,
  'the verified fixture is visible through the public DTO'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 47
select results_eq(
  $$
    select verification_status, verified_at is not null
    from public.media_items
    where slug = 'jubilee-worship-live-2026-07'
  $$,
  $$values ('verified'::text, true)$$,
  'an active admin can read media verification status and timestamp'
);

-- 48
select lives_ok(
  $$
    select created_at, updated_at, published_at
    from public.events
    where slug = 'security-test-admin-event'
  $$,
  'an active admin can read lifecycle timestamps without audit UUIDs'
);

reset role;

-- 49
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'public_site_settings', 'public_events', 'public_announcements',
        'public_media_items', 'public_team_members'
      )
      and column_name in (
        'contact_email', 'created_at', 'updated_at', 'created_by', 'updated_by',
        'published_at', 'verification_status', 'verified_at', 'verified_by'
      )
  ),
  'anon-facing DTO views still exclude audit and verification internals'
);

-- 50
select is(
  (
    select count(*)
    from public.site_settings
    where id = 1
      and name_ko = '쥬빌리워십'
      and youtube_channel_id = 'UCxmosyyztNo7HBUOdN_gy9w'
  ),
  1::bigint,
  'the official singleton exists after migrations without relying on seed data'
);

-- 51
select is(
  (
    select count(*)
    from private.youtube_video_allowlist
    where video_id in ('E5mD29x_-dM', 'O2mNdkl5q54')
      and channel_id = 'UCxmosyyztNo7HBUOdN_gy9w'
      and is_active = true
  ),
  2::bigint,
  'both reviewed videos are bound to the current channel in the private allowlist'
);

-- 52
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'media_items'
      and column_name in ('youtube_channel_id', 'verification_status')
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'authenticated clients have no write grants on derived YouTube verification columns'
);

-- 53
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name in (
        'name_ko', 'name_en', 'instagram_url', 'youtube_channel_url',
        'youtube_channel_id', 'church_name', 'church_url',
        'church_jubilee_url', 'church_location_url', 'address',
        'phone_display', 'phone_href', 'contact_email',
        'naver_map_url', 'kakao_map_url'
      )
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ),
  'authenticated clients have no UPDATE grant on official locked settings'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 54
select throws_ok(
  $$
    update public.site_settings
    set youtube_channel_url = 'https://www.youtube.com/@attacker'
    where id = 1
  $$,
  '42501',
  'permission denied for table site_settings',
  'an active admin cannot bypass the UI to change an official locked setting'
);

-- 55
select lives_ok(
  $$
    update public.site_settings
    set seo_title = 'Security test SEO title'
    where id = 1
  $$,
  'an active admin can still edit an allowed SEO setting'
);

-- 56
select lives_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label, published
    ) values (
      'security-test-unknown-draft', 'Unknown draft', 'youtube_video', 'youtube',
      'abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'Untrusted', false
    )
  $$,
  'an unknown canonical YouTube video can be retained only as a draft'
);

reset role;

-- 57
select results_eq(
  $$
    select verification_status, youtube_channel_id, published
    from public.media_items
    where slug = 'security-test-unknown-draft'
  $$,
  $$values ('pending'::text, null::text, false)$$,
  'the trigger derives pending, no channel, and unpublished for an unknown video'
);

set local role authenticated;

-- 58
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label, published
    ) values (
      'security-test-noncanonical', 'Noncanonical', 'youtube_video', 'youtube',
      'E5mD29x_-dM', 'https://youtu.be/E5mD29x_-dM', 'Official', false
    )
  $$,
  '23514',
  'YouTube URL must use the canonical watch or playlist format',
  'a noncanonical YouTube URL is rejected even for an allowlisted video'
);

-- 59
select throws_ok(
  $$
    insert into public.team_members (
      name, role_title, category, sort_order, published
    ) values (
      'Security Public Vocal', '보컬', 'vocal', 900, true
    )
  $$,
  '23514',
  'new row for relation "team_members" violates check constraint "team_members_public_category"',
  'a non-minister cannot be inserted as public'
);

-- 60
select lives_ok(
  $$
    insert into public.team_members (
      name, role_title, category, sort_order, published
    ) values (
      'Security Draft Vocal', '보컬', 'vocal', 901, false
    )
  $$,
  'an active admin can retain a non-minister only as a draft'
);

-- 61
select throws_ok(
  $$
    update public.team_members
    set published = true
    where name = 'Security Draft Vocal'
  $$,
  '23514',
  'new row for relation "team_members" violates check constraint "team_members_public_category"',
  'a non-minister draft cannot later be published'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 62
select is(
  (
    select count(*)
    from public.public_team_members
    where category <> 'minister'
  ),
  0::bigint,
  'the public team DTO exposes only ministers'
);

reset role;

-- 63
select ok(
  (
    select pg_get_expr(polqual, polrelid)
    from pg_policy
    where polrelid = 'public.team_members'::regclass
      and polname = 'team_members_public_read'
  ) like '%minister%',
  'the anon team RLS policy independently enforces the minister category'
);

-- 64
select results_eq(
  $$
    select
      youtube_channel_id,
      verification_status,
      external_url,
      source_label,
      verified_at is not null,
      verified_by
    from public.media_items
    where slug = 'security-test-verified-video'
  $$,
  $$
    values (
      'UCxmosyyztNo7HBUOdN_gy9w'::text,
      'verified'::text,
      'https://www.youtube.com/watch?v=O2mNdkl5q54'::text,
      'Jubilee Worship(쥬빌리 워십)'::text,
      true,
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  'the trigger derives every verification field from the video allowlist'
);

-- 65
select is(
  (
    select count(*)
    from public.public_events
    where slug = 'jubilee-worship-2026-09-04'
      and title = '쥬빌리워십 찬양집회'
  ),
  1::bigint,
  'migration-only bootstrap includes the verified official event'
);

-- 66
select is(
  (
    select count(*)
    from public.public_media_items
    where slug = 'jubilee-worship-live-2026-07'
      and provider_id = 'E5mD29x_-dM'
  ),
  1::bigint,
  'migration-only bootstrap includes the verified E5 public video'
);

-- 67
select results_eq(
  $$
    select name, role_title
    from public.public_team_members
    where name in ('김두진', '최희락', '조예희')
    order by name
  $$,
  $$
    values
      ('김두진'::text, '목사'::text),
      ('조예희'::text, '전도사'::text),
      ('최희락'::text, '목사'::text)
  $$,
  'migration-only bootstrap includes all three verified ministers'
);

-- 68
select ok(
  pg_get_viewdef('public.public_media_items'::regclass, true)
    like '%is_public_verified_youtube%',
  'the public media DTO explicitly filters through the verified-video boundary'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 69
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, external_url, source_label, published
    ) values (
      'security-test-public-instagram', 'Instagram', 'instagram_post', 'instagram',
      'https://www.instagram.com/p/AbCdEfGhIjK/', 'Instagram', true
    )
  $$,
  '23514',
  'Only a verified YouTube video can be published',
  'an Instagram item cannot be published in the video-only MVP'
);

-- 70
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, thumbnail_path, source_label, published
    ) values (
      'security-test-public-image', 'Image', 'image', 'internal',
      'gallery/security-test.webp', 'Internal', true
    )
  $$,
  '23514',
  'Only a verified YouTube video can be published',
  'an internal image cannot be published in the video-only MVP'
);

-- 71
select throws_ok(
  $$
    insert into public.media_items (
      slug, title, kind, provider, provider_id, external_url, source_label, published
    ) values (
      'security-test-public-playlist', 'Playlist', 'youtube_playlist', 'youtube',
      'PL1234567890', 'https://www.youtube.com/playlist?list=PL1234567890',
      'YouTube', true
    )
  $$,
  '23514',
  'A YouTube playlist cannot be published without a verified allowlist entry',
  'a YouTube playlist cannot be published in the video-only MVP'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 72
select is(
  (
    select count(*)
    from public.media_items
    where is_public_verified_youtube = false
  ),
  0::bigint,
  'anon RLS cannot discover draft or noneligible media through the base API'
);

-- 73
select is(
  (
    select count(*)
    from public.public_media_items
    where provider <> 'youtube'
       or kind <> 'youtube_video'
  ),
  0::bigint,
  'the public media DTO exposes only YouTube videos'
);

reset role;

-- 74
select results_eq(
  $$
    select hero_media_path, hero_media_mobile_path, hero_media_alt, og_media_path
    from public.site_settings
    where id = 1
  $$,
  $$
    values (
      '/images/hero/hero-home-stage-20260820-desktop-1280x720.webp'::text,
      '/images/hero/hero-home-stage-20260820-mobile-672x840.webp'::text,
      '선두교회 본당 무대에서 찬양을 인도하는 쥬빌리워십 찬양팀'::text,
      '/images/social/og-home-group-07-1200x630.png'::text
    )
  $$,
  'site settings use requester-provided stage-photo crops for desktop and mobile heroes'
);

select * from finish();
rollback;
