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
import {
  hasCompletedPrivacyOperationalDetails,
  hasCompletedTermsOperationalDetails,
  hasConfirmedServiceIdentity,
  hasRequiredAppPrivacyDisclosures,
  hasUnresolvedLegalReview,
  LEGAL_REVIEW_MARKER
} from "@/lib/admin/legal-document-templates";

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

  if (id) {
    const { data: existing, error: existingError } = await supabase
      .from("legal_documents")
      .select("id,document_type,status")
      .eq("id", id.data)
      .eq("status", "draft")
      .maybeSingle();
    if (existingError || !existing) return actionError("수정할 법적 문서 초안을 확인하지 못했습니다.");
    if (existing.document_type !== parsed.data.document_type) {
      return actionError("생성한 법적 문서의 종류는 변경할 수 없습니다. 다른 종류는 새 초안으로 작성해 주세요.");
    }
  }

  const editableDocument = {
    version: parsed.data.version,
    title: parsed.data.title,
    body: parsed.data.body,
    effective_on: parsed.data.effective_on
  };
  const query = id
    ? supabase.from("legal_documents").update(editableDocument).eq("id", id.data).eq("status", "draft")
    : supabase.from("legal_documents").insert({
        document_type: parsed.data.document_type,
        ...editableDocument
      });
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

  const { data: draft, error: draftError } = await supabase
    .from("legal_documents")
    .select("id,document_type,body,status")
    .eq("id", id.data)
    .eq("status", "draft")
    .maybeSingle();
  if (draftError || !draft) return actionError("공개할 법적 문서 초안을 확인하지 못했습니다.");
  if (hasUnresolvedLegalReview(draft.body)) {
    return actionError(`본문의 ${LEGAL_REVIEW_MARKER} 항목을 모두 확정·제거한 뒤 공개해 주세요.`);
  }
  if (!hasConfirmedServiceIdentity(draft.body)) {
    return actionError("본문에 확정된 운영주체(쥬빌리 워십)와 문의·개인정보 이메일을 모두 표시해야 공개할 수 있습니다.");
  }
  if (draft.document_type === "privacy_policy" && !hasRequiredAppPrivacyDisclosures(draft.body)) {
    return actionError("앱 개인정보처리방침에는 설치 식별자·푸시 토큰·알림 선택·보유·비활성화 처리 내용을 모두 명시해야 공개할 수 있습니다.");
  }
  if (draft.document_type === "privacy_policy" && !hasCompletedPrivacyOperationalDetails(draft.body)) {
    return actionError("보유 기간·삭제 주기·국외 처리 9개 항목의 정확한 항목명과 실제 값을 모두 확정해야 공개할 수 있습니다.");
  }
  if (draft.document_type === "terms_of_service" && !hasCompletedTermsOperationalDetails(draft.body)) {
    return actionError("준거법·관할·면책 범위·미성년자 이용 안내의 정확한 항목명과 실제 값을 모두 확정해야 공개할 수 있습니다.");
  }

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
