"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  optionalString,
  parsePositiveId,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminRecordIdSchema, sermonRevisionFormSchema } from "@/lib/admin/mobile-content-schemas";

function revalidateSermonPaths() {
  revalidatePath("/");
  revalidatePath("/worship");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
}

export async function saveSermonRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = sermonRevisionFormSchema.safeParse({
    event_id: parsePositiveId(formData.get("event_id")),
    sermon_topic: optionalString(formData.get("sermon_topic")),
    scripture_reference: optionalString(formData.get("scripture_reference"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  const fields = {
    sermon_topic: parsed.data.sermon_topic,
    scripture_reference: parsed.data.scripture_reference
  };
  const query = id
    ? supabase
        .from("event_sermon_revisions")
        .update(fields)
        .eq("id", id.data)
        .eq("event_id", parsed.data.event_id)
        .eq("status", "draft")
    : supabase.from("event_sermon_revisions").insert({ event_id: parsed.data.event_id, ...fields });
  const { data, error } = await query.select("id,event_id,revision_no,status").single();
  if (error || !data) {
    return actionError("설교 정보 초안을 저장하지 못했습니다. 편집 가능한 초안인지와 관리자 권한을 확인해 주세요.");
  }

  revalidateSermonPaths();
  return actionSuccess(id ? "설교 정보 초안을 수정했습니다." : "설교 정보 새 개정본을 만들었습니다.");
}

export async function deleteSermonRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("event_sermon_revisions")
    .delete()
    .eq("id", id.data)
    .eq("status", "draft")
    .select("id,event_id")
    .single();
  if (error || !data) return actionError("설교 정보 초안을 삭제하지 못했습니다.");

  revalidateSermonPaths();
  return actionSuccess("설교 정보 초안을 삭제했습니다.");
}

export async function requestSermonReviewAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("request_event_sermon_review", { target_revision_id: id.data });
  if (error) return actionError("설교 정보 검수를 요청하지 못했습니다. 두 입력값과 현재 상태를 확인해 주세요.");

  revalidateSermonPaths();
  return actionSuccess("오너에게 설교 정보 검수를 요청했습니다.");
}

export async function publishSermonRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase, admin } = await requireActiveAdmin();
  if (admin.role !== "owner") return actionError("오너만 설교 정보를 공개할 수 있습니다.");
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("publish_event_sermon_revision", { target_revision_id: id.data });
  if (error) return actionError("설교 정보를 공개하지 못했습니다. 검수 요청 상태와 오너 권한을 확인해 주세요.");

  revalidateSermonPaths();
  return actionSuccess("설교 정보 새 개정본을 공개했습니다.");
}

export async function returnSermonRevisionToDraftAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase, admin } = await requireActiveAdmin();
  if (admin.role !== "owner") return actionError("오너만 설교 정보를 반려할 수 있습니다.");
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("return_event_sermon_revision_to_draft", { target_revision_id: id.data });
  if (error) return actionError("설교 정보를 초안으로 돌리지 못했습니다. 검수 요청 상태와 오너 권한을 확인해 주세요.");

  revalidateSermonPaths();
  return actionSuccess("설교 정보를 수정 가능한 초안으로 반려했습니다.");
}

export async function withdrawSermonRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase, admin } = await requireActiveAdmin();
  if (admin.role !== "owner") return actionError("오너만 공개된 설교 정보를 철회할 수 있습니다.");
  const id = adminRecordIdSchema.safeParse(parsePositiveId(formData.get("id")));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("withdraw_event_sermon_revision", { target_revision_id: id.data });
  if (error) return actionError("설교 정보 공개를 철회하지 못했습니다.");

  revalidateSermonPaths();
  return actionSuccess("설교 정보 공개를 철회했습니다.");
}
