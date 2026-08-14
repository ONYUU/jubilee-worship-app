-- Switch the production singleton to the approved official group photo.
-- Versioned filenames prevent an already-cached hero or link preview from
-- continuing to show the retired stage-worship photo.

begin;

update public.site_settings
set
  hero_media_path = '/images/hero/hero-home-group-07-desktop-1920x1080.webp',
  hero_media_mobile_path = '/images/hero/hero-home-group-07-mobile-1080x1350.webp',
  hero_media_alt = '선두교회 본당 무대에서 자유롭게 포즈를 취한 쥬빌리워십 공동체',
  og_media_path = '/images/social/og-home-group-07-1200x630.png'
where id = 1;

commit;
