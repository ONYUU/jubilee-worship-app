"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin, requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminRecordIdSchema, legalDocumentFormSchema } from "@/lib/admin/mobile-content-schemas";

function revalidateLegalPaths() {
  revalidatePath("/privacy");
  revalidatePath("/admin");
  revalidatePath("/admin/legal");
}

function parseId(value: FormDataEntryValue | null) {
  return adminRecordIdSchema.safeParse(parsePositiveId(value));
}

export async function saveLegalDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = legalDocumentFormSchema.safeParse({
    document_type: requiredString(formData.get("document_type")),
    version: requiredString(formData.get("version")),
    title: requiredString(formData.get("title")),
    body: requiredString(formData.get("body")),
    effective_on: requiredString(formData.get("effective_on"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  const query = id
    ? supabase.from("legal_documents").update(parsed.data).eq("id", id.data).eq("status", "draft")
    : supabase.from("legal_documents").insert(parsed.data);
  const { data, error } = await query.select("id,document_type,status").single();
  if (error || !data) {
    return actionError("법적 문서 초안을 저장하지 못했습니다. 중복 버전과 초안 상태를 확인해 주세요.");
  }

  revalidateLegalPaths();
  return actionSuccess(id ? "법적 문서 초안을 수정했습니다." : "법적 문서 초안을 만들었습니다.");
}

export async function deleteLegalDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("legal_documents")
    .delete()
    .eq("id", id.data)
    .eq("status", "draft")
    .select("id,document_type")
    .single();
  if (error || !data) return actionError("법적 문서 초안만 삭제할 수 있습니다.");

  revalidateLegalPaths();
  return actionSuccess("법적 문서 초안을 삭제했습니다.");
}

export async function publishLegalDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("publish_legal_document", { target_document_id: id.data });
  if (error) return actionError("법적 문서를 공개하지 못했습니다. 효력일이 오늘 또는 과거인 초안인지 확인해 주세요.");

  revalidateLegalPaths();
  return actionSuccess("이전 공개본을 원자적으로 교체하고 새 법적 문서를 공개했습니다.");
}

export async function withdrawLegalDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("withdraw_legal_document", { target_document_id: id.data });
  if (error) return actionError("공개된 법적 문서를 철회하지 못했습니다.");

  revalidateLegalPaths();
  return actionSuccess("법적 문서 공개를 철회했습니다.");
}
