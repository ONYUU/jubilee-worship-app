"use server";

import { announcementFormSchema } from "@jubilee/domain";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  checkbox,
  optionalString,
  parsePositiveId,
  requiredString,
  seoulDateTimeToIso,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";

function payload(formData: FormData) {
  return {
    slug: requiredString(formData.get("slug")),
    event_id: optionalString(formData.get("event_id")),
    kind: requiredString(formData.get("kind")),
    title: requiredString(formData.get("title")),
    body: requiredString(formData.get("body")),
    starts_at: seoulDateTimeToIso(formData.get("starts_at")),
    expires_at: seoulDateTimeToIso(formData.get("expires_at")),
    pinned: checkbox(formData, "pinned"),
    published: checkbox(formData, "published")
  };
}

function revalidateAnnouncementPaths() {
  [
    "/",
    "/about",
    "/worship",
    "/media",
    "/visit",
    "/privacy",
    "/admin",
    "/admin/announcements"
  ].forEach((path) => revalidatePath(path));
}

export async function saveAnnouncementAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = announcementFormSchema.safeParse(payload(formData));
  if (!parsed.success) return zodActionError(parsed.error);

  const id = parsePositiveId(formData.get("id"));
  const query = id
    ? supabase.from("announcements").update(parsed.data).eq("id", id)
    : supabase.from("announcements").insert(parsed.data);
  const { data, error } = await query.select("id").single();
  if (error || !data) return actionError("공지를 저장하지 못했습니다. 입력값, 중복 slug, 관리자 권한을 확인해 주세요.");

  revalidateAnnouncementPaths();
  return actionSuccess(id ? "공지를 수정했습니다." : "공지를 등록했습니다.");
}

export async function deleteAnnouncementAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parsePositiveId(formData.get("id"));
  if (!id) return actionError("삭제할 공지를 확인할 수 없습니다.");
  const { data, error } = await supabase.from("announcements").delete().eq("id", id).select("id").single();
  if (error || !data) return actionError("공지를 삭제하지 못했습니다.");
  revalidateAnnouncementPaths();
  return actionSuccess("공지를 삭제했습니다.");
}
