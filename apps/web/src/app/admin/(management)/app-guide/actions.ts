"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  optionalNumber,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin, requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminRecordIdSchema, guideSectionFormSchema } from "@/lib/admin/mobile-content-schemas";

function revalidateGuidePaths() {
  revalidatePath("/visit");
  revalidatePath("/admin");
  revalidatePath("/admin/app-guide");
}

export async function saveGuideSectionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = guideSectionFormSchema.safeParse({
    slug: requiredString(formData.get("slug")),
    title: requiredString(formData.get("title")),
    body: requiredString(formData.get("body")),
    kind: requiredString(formData.get("kind")),
    sort_order: optionalNumber(formData.get("sort_order"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  const query = id
    ? supabase.from("guide_sections").update(parsed.data).eq("id", id.data).eq("published", false)
    : supabase.from("guide_sections").insert(parsed.data);
  const { data, error } = await query.select("id,slug").single();
  if (error || !data) {
    return actionError("앱 안내 초안을 저장하지 못했습니다. 공개된 안내는 오너가 먼저 비공개로 전환해야 합니다.");
  }

  revalidateGuidePaths();
  return actionSuccess(id ? "앱 안내를 수정했습니다." : "앱 안내를 등록했습니다.");
}

export async function deleteGuideSectionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("guide_sections")
    .delete()
    .eq("id", id.data)
    .eq("published", false)
    .select("id,slug")
    .single();
  if (error || !data) return actionError("비공개 안내 초안만 삭제할 수 있습니다.");

  revalidateGuidePaths();
  return actionSuccess("앱 안내를 삭제했습니다.");
}

async function setGuidePublishedAction(formData: FormData, published: boolean): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("set_guide_section_published", {
    target_guide_section_id: id.data,
    target_published: published
  });
  if (error) return actionError(published ? "안내를 앱에 공개하지 못했습니다." : "안내를 비공개로 전환하지 못했습니다.");

  revalidateGuidePaths();
  return actionSuccess(published ? "안내를 앱에 공개했습니다." : "안내를 비공개로 전환했습니다.");
}

export async function publishGuideSectionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setGuidePublishedAction(formData, true);
}

export async function unpublishGuideSectionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setGuidePublishedAction(formData, false);
}
