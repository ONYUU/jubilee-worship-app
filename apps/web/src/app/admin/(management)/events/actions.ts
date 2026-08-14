"use server";

import { eventFormSchema } from "@jubilee/domain";
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
import { adminRecordIdSchema } from "@/lib/admin/mobile-content-schemas";

function eventPayload(formData: FormData) {
  return {
    slug: requiredString(formData.get("slug")),
    title: requiredString(formData.get("title")),
    starts_at: seoulDateTimeToIso(formData.get("starts_at")),
    ends_at: seoulDateTimeToIso(formData.get("ends_at")),
    timezone: "Asia/Seoul",
    venue_name: requiredString(formData.get("venue_name")),
    address: requiredString(formData.get("address")),
    description: optionalString(formData.get("description")),
    status: requiredString(formData.get("status")),
    registration_url: optionalString(formData.get("registration_url")),
    hero_media_path: optionalString(formData.get("hero_media_path")),
    source_url: optionalString(formData.get("source_url")),
    featured: checkbox(formData, "featured"),
    published: checkbox(formData, "published")
  };
}

function revalidateEventPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/worship");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  if (slug) revalidatePath(`/api/calendar/${slug}`);
}

export async function saveEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = eventFormSchema.safeParse(eventPayload(formData));
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);
  const previousSlug = optionalString(formData.get("previous_slug"));
  const query = id
    ? supabase.from("events").update(parsed.data).eq("id", id.data)
    : supabase.from("events").insert(parsed.data);
  const { data, error } = await query.select("id,slug").single();

  if (error || !data) {
    return actionError("일정을 저장하지 못했습니다. 입력값, 중복 slug, 관리자 권한을 확인해 주세요.");
  }

  revalidateEventPaths(data.slug);
  if (previousSlug && previousSlug !== data.slug) revalidateEventPaths(previousSlug);
  return actionSuccess(id ? "예배 일정을 수정했습니다." : "예배 일정을 등록했습니다.");
}

export async function deleteEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase.from("events").delete().eq("id", id.data).select("slug").single();
  if (error || !data) return actionError("일정을 삭제하지 못했습니다. 연결된 공지와 권한을 확인해 주세요.");

  revalidateEventPaths(data.slug);
  return actionSuccess("예배 일정을 삭제했습니다.");
}
