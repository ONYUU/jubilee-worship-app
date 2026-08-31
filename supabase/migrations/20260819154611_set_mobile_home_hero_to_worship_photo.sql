-- Use the requester-provided worship-stage photo for the app and website
-- home heroes, with separate landscape and portrait-safe crops.

begin;

update public.site_settings
set
  hero_media_path = '/images/hero/hero-home-stage-20260820-desktop-1280x720.webp',
  hero_media_mobile_path = '/images/hero/hero-home-stage-20260820-mobile-672x840.webp',
  hero_media_alt = '선두교회 본당 무대에서 찬양을 인도하는 쥬빌리워십 찬양팀'
where id = 1;

commit;
