"use server";

import { settingsFormSchema } from "@jubilee/domain";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { actionError, actionSuccess, optionalString, requiredString, zodActionError } from "@/lib/auth/action-utils";
import { requireActiveAdmin } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";

function settingsPayload(formData: FormData) {
  return {
    eyebrow: requiredString(formData.get("eyebrow")),
    hero_title: requiredString(formData.get("hero_title")),
    hero_description: requiredString(formData.get("hero_description")),
    hero_media_path: optionalString(formData.get("hero_media_path")),
    hero_media_mobile_path: optionalString(formData.get("hero_media_mobile_path")),
    hero_media_alt: optionalString(formData.get("hero_media_alt")),
    about_title: requiredString(formData.get("about_title")),
    about_body: requiredString(formData.get("about_body")),
    about_media_path: optionalString(formData.get("about_media_path")),
    about_media_alt: optionalString(formData.get("about_media_alt")),
    worship_media_path: optionalString(formData.get("worship_media_path")),
    worship_media_alt: optionalString(formData.get("worship_media_alt")),
    visit_media_path: optionalString(formData.get("visit_media_path")),
    visit_media_alt: optionalString(formData.get("visit_media_alt")),
    og_media_path: optionalString(formData.get("og_media_path")),
    logo_primary_path: optionalString(formData.get("logo_primary_path")),
    logo_inverse_path: optionalString(formData.get("logo_inverse_path")),
    seo_title: requiredString(formData.get("seo_title")),
    seo_description: requiredString(formData.get("seo_description"))
  };
}

function revalidateSitePaths() {
  ["/", "/about", "/worship", "/media", "/visit", "/privacy", "/admin", "/admin/settings", "/sitemap.xml", "/robots.txt"].forEach((path) => revalidatePath(path));
}

export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = settingsFormSchema.safeParse(settingsPayload(formData));
  if (!parsed.success) return zodActionError(parsed.error);

  // 공식 출처로 고정된 이름·채널·교회·연락처 필드는 DB grant 대상이 아니다.
  // 스키마 기본값이 parsed.data에 채워지므로 저장 허용 필드를 명시적으로 고른다.
  const editableSettings = {
    eyebrow: parsed.data.eyebrow,
    hero_title: parsed.data.hero_title,
    hero_description: parsed.data.hero_description,
    hero_media_path: parsed.data.hero_media_path,
    hero_media_mobile_path: parsed.data.hero_media_mobile_path,
    hero_media_alt: parsed.data.hero_media_alt,
    about_title: parsed.data.about_title,
    about_body: parsed.data.about_body,
    about_media_path: parsed.data.about_media_path,
    about_media_alt: parsed.data.about_media_alt,
    worship_media_path: parsed.data.worship_media_path,
    worship_media_alt: parsed.data.worship_media_alt,
    visit_media_path: parsed.data.visit_media_path,
    visit_media_alt: parsed.data.visit_media_alt,
    og_media_path: parsed.data.og_media_path,
    logo_primary_path: parsed.data.logo_primary_path,
    logo_inverse_path: parsed.data.logo_inverse_path,
    seo_title: parsed.data.seo_title,
    seo_description: parsed.data.seo_description
  };

  const { data, error } = await supabase.from("site_settings").update(editableSettings).eq("id", 1).select("id").single();
  if (error || !data) return actionError("사이트 설정을 저장하지 못했습니다. 필수 문구, 이미지 대체 텍스트, 관리자 권한을 확인해 주세요.");

  revalidateSitePaths();
  return actionSuccess("사이트 설정을 저장했습니다.");
}
