-- Development and test seed only.
-- Do not run this file against production. See README.md.
-- Production bootstrap rows are migration-owned; these idempotent upserts only
-- refresh local content fixtures.

begin;

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
  '/images/hero/hero-home-group-07-desktop-1920x1080.webp',
  '/images/gallery/sundoo-jubilee-01.webp',
  '선두교회 본당에 함께한 쥬빌리워십 공동체',
  '예배가 삶이 되고, 세대가 함께 서는 자리',
  '쥬빌리워십은 2024년 선두교회 50주년을 기념해 시작된 예배사역팀입니다. 청소년과 청년을 중심으로 개인의 예배와 공동체의 예배를 세우고, 인천 지역의 다음 세대를 섬기는 예배를 꿈꾸며 걸어가고 있습니다.',
  '/images/hero/about-community-960x610.webp',
  '선두교회 본당에서 함께 찬양하는 쥬빌리워십 공동체',
  '/images/hero/worship-community-960x610.webp',
  '예배 자리에서 함께 찬양하는 다음 세대 예배자들',
  '/images/hero/visit-welcome-960x610.webp',
  '쥬빌리워십 현장에서 방문자를 맞이하는 안내 공간',
  '/images/social/og-home-group-07-1200x630.png',
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
  'sundoojubileeworship@gmail.com',
  'https://map.naver.com/p/entry/place/12087641?placePath=%2Fhome',
  'https://place.map.kakao.com/9174591',
  '쥬빌리워십 | 인천 선두교회 예배사역팀',
  '인천 선두교회 쥬빌리워십 공식 홈페이지입니다. 다음 찬양집회 일정, 예배 영상, 팀 소개와 오시는 길을 확인하세요.'
)
on conflict (id) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  eyebrow = excluded.eyebrow,
  hero_title = excluded.hero_title,
  hero_description = excluded.hero_description,
  hero_media_path = excluded.hero_media_path,
  hero_media_mobile_path = excluded.hero_media_mobile_path,
  hero_media_alt = excluded.hero_media_alt,
  about_title = excluded.about_title,
  about_body = excluded.about_body,
  about_media_path = excluded.about_media_path,
  about_media_alt = excluded.about_media_alt,
  worship_media_path = excluded.worship_media_path,
  worship_media_alt = excluded.worship_media_alt,
  visit_media_path = excluded.visit_media_path,
  visit_media_alt = excluded.visit_media_alt,
  og_media_path = excluded.og_media_path,
  logo_primary_path = excluded.logo_primary_path,
  logo_inverse_path = excluded.logo_inverse_path,
  instagram_url = excluded.instagram_url,
  youtube_channel_url = excluded.youtube_channel_url,
  youtube_channel_id = excluded.youtube_channel_id,
  church_name = excluded.church_name,
  church_url = excluded.church_url,
  church_jubilee_url = excluded.church_jubilee_url,
  church_location_url = excluded.church_location_url,
  address = excluded.address,
  phone_display = excluded.phone_display,
  phone_href = excluded.phone_href,
  contact_email = excluded.contact_email,
  naver_map_url = excluded.naver_map_url,
  kakao_map_url = excluded.kakao_map_url,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

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
on conflict (slug) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  timezone = excluded.timezone,
  venue_name = excluded.venue_name,
  address = excluded.address,
  description = excluded.description,
  status = excluded.status,
  source_url = excluded.source_url,
  featured = excluded.featured,
  published = excluded.published;

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
on conflict (slug) do update set
  title = excluded.title,
  kind = excluded.kind,
  provider = excluded.provider,
  provider_id = excluded.provider_id,
  external_url = excluded.external_url,
  source_label = excluded.source_label,
  thumbnail_path = excluded.thumbnail_path,
  thumbnail_alt = excluded.thumbnail_alt,
  occurred_on = excluded.occurred_on,
  description = excluded.description,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  published = excluded.published;

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
on conflict on constraint team_members_name_role_unique do update set
  category = excluded.category,
  sort_order = excluded.sort_order,
  published = excluded.published;

commit;
