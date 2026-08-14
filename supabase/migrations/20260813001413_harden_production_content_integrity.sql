-- Production bootstrap and server-derived public-content integrity.
-- Generated with supabase migration new harden_production_content_integrity.

begin;

-- Production intentionally does not run seed.sql. Keep the official singleton
-- available after migrations alone, while preserving an existing row on upgrade.
insert into public.site_settings (
  id,
  name_ko,
  name_en,
  eyebrow,
  hero_title,
  hero_description,
  hero_media_path,
  hero_media_mobile_path,
  hero_media_alt,
  about_title,
  about_body,
  about_media_path,
  about_media_alt,
  worship_media_path,
  worship_media_alt,
  visit_media_path,
  visit_media_alt,
  og_media_path,
  logo_primary_path,
  logo_inverse_path,
  instagram_url,
  youtube_channel_url,
  youtube_channel_id,
  church_name,
  church_url,
  church_jubilee_url,
  church_location_url,
  address,
  phone_display,
  phone_href,
  contact_email,
  naver_map_url,
  kakao_map_url,
  seo_title,
  seo_description
)
values (
  1,
  '쥬빌리워십',
  'JUBILEE WORSHIP',
  'Sundoo Church Worship Ministry',
  '오직 예배를 세우는 일',
  '개인의 예배를 넘어 공동체의 예배로, 인천의 다음 세대와 함께 하나님을 예배합니다.',
  '/images/hero/hero-home-desktop-1920x1080.webp',
  '/images/hero/hero-home-mobile-1080x1350.webp',
  '선두교회 본당에서 함께 예배하는 쥬빌리워십 공동체',
  '예배가 삶이 되고, 세대가 함께 서는 자리',
  '쥬빌리워십은 2024년 선두교회 50주년을 기념해 시작된 예배사역팀입니다. 청소년과 청년을 중심으로 개인의 예배와 공동체의 예배를 세우고, 인천 지역의 다음 세대를 섬기는 예배를 꿈꾸며 걸어가고 있습니다.',
  '/images/hero/about-community-960x610.webp',
  '선두교회 본당에서 함께 찬양하는 쥬빌리워십 공동체',
  '/images/hero/worship-community-960x610.webp',
  '예배 자리에서 함께 찬양하는 다음 세대 예배자들',
  '/images/hero/visit-welcome-960x610.webp',
  '쥬빌리워십 현장에서 방문자를 맞이하는 안내 공간',
  '/images/social/og-home-1200x630.png',
  '/images/brand/logo-official-web-pwa-app-1024-source-locked.png',
  '/images/brand/logo-official-web-pwa-app-1024-source-locked.png',
  'https://www.instagram.com/jubilee_worship_/',
  'https://www.youtube.com/@JUBILEEWORSHIP-25',
  'UCxmosyyztNo7HBUOdN_gy9w',
  '선두교회',
  'https://www.sundoo.org/',
  'https://www.sundoo.org/_NBoard/content.php?co_id=0412_jubileeWorship',
  'https://www.sundoo.org/_NBoard/content.php?co_id=0106_location',
  '인천광역시 서구 거북로109번길 10 (석남동 547-23)',
  '032-574-7221~5',
  '+82-32-574-7221',
  'sundoomedia@naver.com',
  'https://map.naver.com/p/entry/place/12087641?placePath=%2Fhome',
  'https://place.map.kakao.com/9174591',
  '쥬빌리워십 | 인천 선두교회 예배사역팀',
  '인천 선두교회 쥬빌리워십 공식 홈페이지입니다. 다음 찬양집회 일정, 예배 영상, 팀 소개와 오시는 길을 확인하세요.'
)
on conflict (id) do nothing;

-- Official identity, channels, church/contact, and map fields are migration-owned.
-- Active admins may only edit presentation copy, media references, and SEO fields.
revoke update on table public.site_settings from authenticated;
revoke update (
  name_ko,
  name_en,
  instagram_url,
  youtube_channel_url,
  youtube_channel_id,
  church_name,
  church_url,
  church_jubilee_url,
  church_location_url,
  address,
  phone_display,
  phone_href,
  contact_email,
  naver_map_url,
  kakao_map_url
)
on public.site_settings from authenticated;

grant update (
  eyebrow,
  hero_title,
  hero_description,
  hero_media_path,
  hero_media_mobile_path,
  hero_media_alt,
  about_title,
  about_body,
  about_media_path,
  about_media_alt,
  worship_media_path,
  worship_media_alt,
  visit_media_path,
  visit_media_alt,
  og_media_path,
  logo_primary_path,
  logo_inverse_path,
  seo_title,
  seo_description
)
on public.site_settings to authenticated;

-- A channel allowlist alone cannot prove that an arbitrary video belongs to that
-- channel. This private table binds each reviewed video ID to an active channel.
create table private.youtube_video_allowlist (
  video_id text primary key
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  channel_id text not null
    references private.youtube_channel_allowlist (channel_id)
    on update cascade
    on delete restrict,
  canonical_url text generated always as (
    'https://www.youtube.com/watch?v=' || video_id
  ) stored,
  is_active boolean not null default true,
  verified_at timestamptz not null,
  constraint youtube_video_allowlist_canonical_url_unique unique (canonical_url)
);

alter table private.youtube_video_allowlist enable row level security;
revoke all on table private.youtube_video_allowlist from public, anon, authenticated;

insert into private.youtube_video_allowlist (
  video_id,
  channel_id,
  is_active,
  verified_at
)
values
  (
    'E5mD29x_-dM',
    'UCxmosyyztNo7HBUOdN_gy9w',
    true,
    '2026-08-13T00:00:00+09:00'::timestamptz
  ),
  (
    'O2mNdkl5q54',
    'UCxmosyyztNo7HBUOdN_gy9w',
    true,
    '2026-08-13T00:00:00+09:00'::timestamptz
  );

-- Verification identity is derived by the trigger and is never client writable.
revoke insert (youtube_channel_id, verification_status)
on public.media_items from authenticated;
revoke update (youtube_channel_id, verification_status)
on public.media_items from authenticated;

alter table public.media_items
drop constraint media_items_provider_data;

-- Normalize upgrade data before applying the stricter constraint. Previously
-- published unknown videos are made private; reviewed allowlisted videos retain
-- their publication state.
update public.media_items as item
set
  external_url = case
    when item.kind = 'youtube_video'
      then 'https://www.youtube.com/watch?v=' || item.provider_id
    when item.kind = 'youtube_playlist'
      then 'https://www.youtube.com/playlist?list=' || item.provider_id
    else item.external_url
  end,
  youtube_channel_id = case
    when item.kind = 'youtube_video' then (
      select video.channel_id
      from private.youtube_video_allowlist as video
      join private.youtube_channel_allowlist as channel
        on channel.channel_id = video.channel_id
       and channel.is_active = true
      where video.video_id = item.provider_id
        and video.is_active = true
    )
    else null
  end,
  verification_status = case
    when item.kind = 'youtube_video'
      and exists (
        select 1
        from private.youtube_video_allowlist as video
        join private.youtube_channel_allowlist as channel
          on channel.channel_id = video.channel_id
         and channel.is_active = true
        where video.video_id = item.provider_id
          and video.is_active = true
      )
      then 'verified'
    else 'pending'
  end,
  published = case
    when item.kind = 'youtube_video'
      and exists (
        select 1
        from private.youtube_video_allowlist as video
        join private.youtube_channel_allowlist as channel
          on channel.channel_id = video.channel_id
         and channel.is_active = true
        where video.video_id = item.provider_id
          and video.is_active = true
      )
      then item.published
    else false
  end
where item.provider = 'youtube';

update public.media_items
set
  youtube_channel_id = null,
  verification_status = 'not_required',
  verified_at = null,
  verified_by = null,
  published = false
where provider <> 'youtube';

create or replace function private.enforce_media_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_url text;
  allowed_channel_id text;
  allowed_source_label text;
begin
  if new.provider <> 'youtube' then
    new.youtube_channel_id := null;
    new.verification_status := 'not_required';
    new.verified_at := null;
    new.verified_by := null;

    if new.published then
      raise exception using
        errcode = '23514',
        message = 'Only a verified YouTube video can be published';
    end if;

    return new;
  end if;

  if new.kind = 'youtube_playlist' then
    expected_url := 'https://www.youtube.com/playlist?list=' || new.provider_id;

    if new.external_url is distinct from expected_url then
      raise exception using
        errcode = '23514',
        message = 'YouTube URL must use the canonical watch or playlist format';
    end if;

    new.youtube_channel_id := null;
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;

    if new.published then
      raise exception using
        errcode = '23514',
        message = 'A YouTube playlist cannot be published without a verified allowlist entry';
    end if;

    return new;
  end if;

  expected_url := 'https://www.youtube.com/watch?v=' || new.provider_id;

  if new.external_url is distinct from expected_url then
    raise exception using
      errcode = '23514',
      message = 'YouTube URL must use the canonical watch or playlist format';
  end if;

  select
    video.channel_id,
    channel.source_label
  into
    allowed_channel_id,
    allowed_source_label
  from private.youtube_video_allowlist as video
  join private.youtube_channel_allowlist as channel
    on channel.channel_id = video.channel_id
   and channel.is_active = true
  where video.video_id = new.provider_id
    and video.canonical_url = new.external_url
    and video.is_active = true;

  if allowed_channel_id is null then
    new.youtube_channel_id := null;
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;

    if new.published then
      raise exception using
        errcode = '23514',
        message = 'An unknown YouTube video must remain pending and unpublished';
    end if;

    return new;
  end if;

  new.youtube_channel_id := allowed_channel_id;
  new.verification_status := 'verified';
  new.source_label := allowed_source_label;

  if tg_op = 'INSERT'
    or old.provider is distinct from new.provider
    or old.kind is distinct from new.kind
    or old.provider_id is distinct from new.provider_id
    or old.external_url is distinct from new.external_url
    or old.youtube_channel_id is distinct from allowed_channel_id
    or old.verification_status is distinct from 'verified'
  then
    new.verified_at := statement_timestamp();
    new.verified_by := (select auth.uid());
  else
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_media_source() from public, anon, authenticated;

alter table public.media_items
add constraint media_items_provider_data check (
  (
    provider = 'youtube'
    and kind = 'youtube_video'
    and provider_id ~ '^[A-Za-z0-9_-]{11}$'
    and external_url = 'https://www.youtube.com/watch?v=' || provider_id
    and (
      (
        youtube_channel_id is not null
        and verification_status = 'verified'
        and verified_at is not null
      )
      or
      (
        youtube_channel_id is null
        and verification_status = 'pending'
        and verified_at is null
        and verified_by is null
        and published = false
      )
    )
  )
  or
  (
    provider = 'youtube'
    and kind = 'youtube_playlist'
    and provider_id ~ '^[A-Za-z0-9_-]{10,64}$'
    and external_url = 'https://www.youtube.com/playlist?list=' || provider_id
    and youtube_channel_id is null
    and verification_status = 'pending'
    and verified_at is null
    and verified_by is null
    and published = false
  )
  or
  (
    provider = 'instagram'
    and kind = 'instagram_post'
    and external_url ~* '^https://(www\.)?instagram\.com/(p|reel)/'
    and youtube_channel_id is null
    and verification_status = 'not_required'
    and verified_at is null
    and verified_by is null
    and published = false
  )
  or
  (
    provider = 'internal'
    and kind = 'image'
    and thumbnail_path is not null
    and youtube_channel_id is null
    and verification_status = 'not_required'
    and verified_at is null
    and verified_by is null
    and published = false
  )
);

alter table public.media_items
add constraint media_items_mvp_public_kind
check (
  published = false
  or (provider = 'youtube' and kind = 'youtube_video')
);

-- This generated boundary lets security_invoker views filter on verification
-- without granting clients access to the internal verification_status column.
alter table public.media_items
add column is_public_verified_youtube boolean
generated always as (
  coalesce(
    published = true
    and provider = 'youtube'
    and kind = 'youtube_video'
    and verification_status = 'verified'
    and youtube_channel_id = 'UCxmosyyztNo7HBUOdN_gy9w',
    false
  )
) stored;

grant select (is_public_verified_youtube)
on public.media_items to anon, authenticated;

drop policy media_items_public_read on public.media_items;
create policy media_items_public_read
on public.media_items
for select
to anon
using (is_public_verified_youtube = true);

drop policy media_items_authenticated_read on public.media_items;
create policy media_items_authenticated_read
on public.media_items
for select
to authenticated
using (
  is_public_verified_youtube = true
  or (select private.is_active_admin())
);

create or replace view public.public_media_items
with (security_invoker = true, security_barrier = true)
as
select
  id, slug, title, kind, provider, provider_id, external_url, source_label,
  youtube_channel_id, thumbnail_path, thumbnail_alt, occurred_on, description,
  featured, sort_order
from public.media_items
where is_public_verified_youtube = true;

revoke all on table public.public_media_items from public, anon, authenticated;
grant select on table public.public_media_items
to anon, authenticated, service_role;

-- Existing non-minister rows remain manageable as drafts, but cannot be public.
update public.team_members
set published = false
where category <> 'minister'
  and published = true;

alter table public.team_members
add constraint team_members_public_category
check (category = 'minister' or published = false);

drop policy team_members_public_read on public.team_members;
create policy team_members_public_read
on public.team_members
for select
to anon
using (published = true and category = 'minister');

drop policy team_members_authenticated_read on public.team_members;
create policy team_members_authenticated_read
on public.team_members
for select
to authenticated
using (
  (published = true and category = 'minister')
  or (select private.is_active_admin())
);

create or replace view public.public_team_members
with (security_invoker = true, security_barrier = true)
as
select
  id, name, role_title, category, photo_path, photo_alt, bio, sort_order
from public.team_members
where published = true
  and category = 'minister';

revoke all on table public.public_team_members from public, anon, authenticated;
grant select on table public.public_team_members
to anon, authenticated, service_role;

-- Verified initial public content is migration-owned so production is useful
-- without seed.sql. Existing operator-managed rows always win on conflict.
insert into public.events (
  slug,
  title,
  starts_at,
  timezone,
  venue_name,
  address,
  description,
  status,
  source_url,
  featured,
  published
)
values (
  'jubilee-worship-2026-09-04',
  '쥬빌리워십 찬양집회',
  '2026-09-04T20:00:00+09:00'::timestamptz,
  'Asia/Seoul',
  '선두교회 본당',
  '인천광역시 서구 거북로109번길 10',
  '누구나 함께 예배할 수 있습니다.',
  'scheduled',
  'https://www.instagram.com/p/Dbsd2PlT6p3/',
  true,
  true
)
on conflict (slug) do nothing;

insert into public.media_items (
  slug,
  title,
  kind,
  provider,
  provider_id,
  external_url,
  source_label,
  thumbnail_path,
  thumbnail_alt,
  occurred_on,
  description,
  featured,
  sort_order,
  published
)
values (
  'jubilee-worship-live-2026-07',
  '[LIVE] 쥬빌리 워십 7월 찬양집회 | 주는 완전합니다',
  'youtube_video',
  'youtube',
  'E5mD29x_-dM',
  'https://www.youtube.com/watch?v=E5mD29x_-dM',
  'Jubilee Worship(쥬빌리 워십)',
  '/images/media/youtube-featured-E5mD29x_-dM-1280x720.webp',
  '쥬빌리워십 7월 찬양집회 예배 실황',
  '2026-07-03'::date,
  '쥬빌리워십 7월 찬양집회 예배 실황입니다.',
  true,
  10,
  true
)
on conflict (slug) do nothing;

insert into public.team_members (
  name,
  role_title,
  category,
  sort_order,
  published
)
values
  ('김두진', '목사', 'minister', 10, true),
  ('최희락', '목사', 'minister', 20, true),
  ('조예희', '전도사', 'minister', 30, true)
on conflict on constraint team_members_name_role_unique do nothing;

commit;
