-- Keep the desktop website hero unchanged while using the approved worship
-- photo for the mobile website and the app home hero.

begin;

update public.site_settings
set
  hero_media_mobile_path = '/images/gallery/sundoo-jubilee-01.webp',
  hero_media_alt = '선두교회 본당에 함께한 쥬빌리워십 공동체'
where id = 1;

commit;
