import { SITE } from "@jubilee/domain";
import { unstable_noStore as noStore } from "next/cache";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader } from "@/components/admin/admin-page";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";
import { HeroImageUploads } from "@/components/admin/hero-image-uploads";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { SERVICE_IDENTITY } from "@/lib/site-identity";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsAdminPage() {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const { data: settings, error } = await supabase
    .from("site_settings")
    .select("id,name_ko,name_en,eyebrow,hero_title,hero_description,hero_media_path,hero_media_mobile_path,hero_media_alt,about_title,about_body,about_media_path,about_media_alt,worship_media_path,worship_media_alt,visit_media_path,visit_media_alt,og_media_path,logo_primary_path,logo_inverse_path,instagram_url,youtube_channel_url,youtube_channel_id,church_name,church_url,church_jubilee_url,church_location_url,address,phone_display,phone_href,naver_map_url,kakao_map_url,seo_title,seo_description")
    .eq("id", 1)
    .maybeSingle();

  if (error || !settings) {
    return (
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Settings" title="사이트 설정" description="공식 문구, 연락처, 이미지와 검색 메타데이터를 관리합니다." />
        <AdminDataNotice message="사이트 설정(id=1)을 불러오지 못했습니다. migration·seed 적용과 관리자 읽기 정책을 확인해 주세요." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Settings" title="사이트 설정" description="공식성이 검증된 이름·채널·교회·연락처 값은 잠겨 있습니다. 문구와 승인 이미지, SEO 설명을 관리할 수 있습니다." />
      <AdminForm action={saveSettingsAction} submitLabel="사이트 설정 저장">
        <FormSection title="브랜드·Hero">
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="한글 이름" name="name_ko_display" defaultValue={SITE.name_ko} readOnly /><TextField label="영문 이름" name="name_en_display" defaultValue={SITE.name_en} readOnly /></div>
          <TextField label="Hero 소문구" name="eyebrow" required defaultValue={settings.eyebrow} />
          <TextField label="Hero 제목" name="hero_title" required defaultValue={settings.hero_title} />
          <TextAreaField label="Hero 설명" name="hero_description" required defaultValue={settings.hero_description} />
          <HeroImageUploads
            desktopPath={settings.hero_media_path}
            mobilePath={settings.hero_media_mobile_path}
            initialAlt={settings.hero_media_alt}
          />
          <DirectImageUpload name="logo_primary_path" label="기본 로고" prefix="brand" initialPath={settings.logo_primary_path} />
          <DirectImageUpload name="logo_inverse_path" label="역상 로고" prefix="brand" initialPath={settings.logo_inverse_path} />
        </FormSection>

        <FormSection title="소개·페이지 이미지">
          <TextField label="소개 제목" name="about_title" required defaultValue={settings.about_title} />
          <TextAreaField label="소개 본문" name="about_body" required defaultValue={settings.about_body} rows={7} />
          <DirectImageUpload
            name="about_media_path"
            label="소개 이미지"
            prefix="gallery"
            initialPath={settings.about_media_path}
            altName="about_media_alt"
            initialAlt={settings.about_media_alt}
          />
          <DirectImageUpload
            name="worship_media_path"
            label="예배안내 이미지"
            prefix="gallery"
            initialPath={settings.worship_media_path}
            altName="worship_media_alt"
            initialAlt={settings.worship_media_alt}
          />
          <DirectImageUpload
            name="visit_media_path"
            label="오시는 길 이미지"
            prefix="gallery"
            initialPath={settings.visit_media_path}
            altName="visit_media_alt"
            initialAlt={settings.visit_media_alt}
          />
          <DirectImageUpload name="og_media_path" label="Open Graph 이미지" prefix="og" initialPath={settings.og_media_path} />
        </FormSection>

        <FormSection title="공식 연결 정보" description="현재 검증 기준에 고정된 값입니다. 변경하려면 공식 출처 재검증과 domain/migration 변경이 필요합니다.">
          <TextField label="운영주체" name="operator_name_readonly" defaultValue={SERVICE_IDENTITY.operatorName} readOnly />
          <TextField label="Instagram" name="instagram_url_display" defaultValue={SITE.instagram_url} readOnly />
          <TextField label="YouTube" name="youtube_channel_url_display" defaultValue={SITE.youtube_channel_url} readOnly />
          <TextField label="YouTube 채널 ID" name="youtube_channel_id_display" defaultValue={SITE.youtube_channel_id} readOnly />
          <TextField label="교회" name="church_name_display" defaultValue={SITE.church_name} readOnly />
          <TextField label="주소" name="address_display" defaultValue={SITE.address} readOnly />
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="대표 전화" name="phone_display_readonly" defaultValue={SITE.phone_display} readOnly /><TextField label="문의·개인정보 이메일" name="contact_email_readonly" defaultValue={SERVICE_IDENTITY.contactEmail} readOnly /></div>
        </FormSection>

        <FormSection title="SEO">
          <TextField label="기본 SEO 제목" name="seo_title" required defaultValue={settings.seo_title} hint="최대 70자" />
          <TextAreaField label="기본 SEO 설명" name="seo_description" required defaultValue={settings.seo_description} hint="최대 200자" />
        </FormSection>
      </AdminForm>
    </div>
  );
}
