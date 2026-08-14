"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { actionError, actionSuccess, requiredString, zodActionError } from "@/lib/auth/action-utils";
import { requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminInviteSchema, adminRoleSchema, adminUserIdSchema } from "@/lib/admin/admin-user-schemas";
import { createSupabaseAdminClient, getAdminInviteRedirectUrl } from "@/lib/supabase/admin";

const AUTH_BAN_DURATION = "876000h";

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/admins");
}

function inviteErrorMessage(
  error: { code?: string | undefined; status?: number | undefined } | null,
  resend = false
): string {
  const code = error?.code ?? "";

  if (error?.status === 429 || code.includes("rate_limit")) {
    return "이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (["email_exists", "user_already_exists", "email_conflict_identity_not_deletable"].includes(code)) {
    return resend
      ? "Supabase Auth가 이 주소를 기존 가입 계정으로 판단해 초대를 재발송하지 못했습니다. 계정 상태를 확인해 주세요."
      : "이미 Supabase Auth에 등록된 이메일입니다. 기존 관리자 목록을 확인해 주세요.";
  }

  if (code.includes("email") && code.includes("invalid")) {
    return "Supabase Auth가 이 이메일 주소를 허용하지 않습니다.";
  }

  return resend
    ? "초대 이메일을 재발송하지 못했습니다. SMTP, 발송 한도와 Auth 설정을 확인해 주세요."
    : "관리자 초대 이메일을 보내지 못했습니다. SMTP, 리다이렉트 URL과 Auth 설정을 확인해 주세요.";
}

function parseUserId(formData: FormData) {
  return adminUserIdSchema.safeParse(requiredString(formData.get("id")));
}

export async function inviteAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const parsed = adminInviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return zodActionError(parsed.error);

  const authAdmin = createSupabaseAdminClient();
  const redirectTo = getAdminInviteRedirectUrl();
  if (!authAdmin || !redirectTo) {
    return actionError("서버 전용 Supabase 비밀 키 또는 사이트 URL 설정이 필요합니다.");
  }

  const inviteResult = await authAdmin.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo });
  if (inviteResult.error || !inviteResult.data.user) {
    return actionError(inviteErrorMessage(inviteResult.error));
  }

  const { error: approvalError } = await supabase.rpc("approve_admin_user", {
    target_user_id: inviteResult.data.user.id
  });
  if (approvalError) {
    return actionError("초대 이메일은 발송됐지만 관리자 승인 등록을 완료하지 못했습니다. DB migration과 오너 권한을 확인해 주세요.");
  }

  revalidateAdminPaths();
  return actionSuccess("에디터 권한으로 관리자를 승인하고 초대 이메일을 보냈습니다.");
}

export async function resendAdminInviteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseUserId(formData);
  if (!id.success) return zodActionError(id.error);

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", id.data)
    .maybeSingle();
  if (membershipError || !membership || !membership.is_active) {
    return actionError("활성 관리자 계정만 초대를 재발송할 수 있습니다.");
  }

  const authAdmin = createSupabaseAdminClient();
  const redirectTo = getAdminInviteRedirectUrl();
  if (!authAdmin || !redirectTo) {
    return actionError("서버 전용 Supabase 비밀 키 또는 사이트 URL 설정이 필요합니다.");
  }

  const userResult = await authAdmin.auth.admin.getUserById(id.data);
  const user = userResult.data.user;
  if (userResult.error || !user?.email) {
    return actionError("초대된 Auth 사용자를 확인하지 못했습니다.");
  }
  if (user.email_confirmed_at) {
    return actionError("이미 초대를 수락하고 가입을 완료한 계정입니다.");
  }

  const inviteResult = await authAdmin.auth.admin.inviteUserByEmail(user.email, { redirectTo });
  if (inviteResult.error) return actionError(inviteErrorMessage(inviteResult.error, true));

  revalidateAdminPaths();
  return actionSuccess("초대 이메일을 재발송했습니다. 기존 링크가 만료된 경우 새 링크를 사용하면 됩니다.");
}

export async function deactivateAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase, admin } = await requireOwner();
  const id = parseUserId(formData);
  if (!id.success) return zodActionError(id.error);
  if (id.data === admin.userId) return actionError("현재 로그인한 자신의 계정은 비활성화할 수 없습니다.");

  const { error } = await supabase.rpc("set_admin_user_active", {
    target_user_id: id.data,
    target_is_active: false
  });
  if (error) {
    return actionError("관리자를 비활성화하지 못했습니다. 마지막 활성 오너 보호 조건을 확인해 주세요.");
  }

  const authAdmin = createSupabaseAdminClient();
  const banResult = authAdmin
    ? await authAdmin.auth.admin.updateUserById(id.data, { ban_duration: AUTH_BAN_DURATION })
    : { error: true };
  revalidateAdminPaths();
  if (banResult.error) {
    return actionError("관리자 DB 접근은 즉시 중지됐지만 Auth 계정 차단을 완료하지 못했습니다. 목록에서 인증 차단을 재시도해 주세요.");
  }

  return actionSuccess("관리자 접근을 비활성화하고 Auth 계정을 차단했습니다.");
}

export async function retryAdminBanAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseUserId(formData);
  if (!id.success) return zodActionError(id.error);

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", id.data)
    .maybeSingle();
  if (membershipError || !membership || membership.is_active) {
    return actionError("비활성 관리자 계정만 Auth 차단을 재시도할 수 있습니다.");
  }

  const authAdmin = createSupabaseAdminClient();
  if (!authAdmin) return actionError("서버 전용 Supabase 비밀 키 설정이 필요합니다.");
  const { error } = await authAdmin.auth.admin.updateUserById(id.data, { ban_duration: AUTH_BAN_DURATION });
  if (error) return actionError("Auth 계정 차단을 재시도했지만 완료하지 못했습니다.");

  revalidateAdminPaths();
  return actionSuccess("비활성 관리자의 Auth 계정을 차단했습니다.");
}

export async function activateAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseUserId(formData);
  if (!id.success) return zodActionError(id.error);

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", id.data)
    .maybeSingle();
  if (membershipError || !membership || membership.is_active) {
    return actionError("비활성 관리자 계정만 다시 활성화할 수 있습니다.");
  }

  const authAdmin = createSupabaseAdminClient();
  if (!authAdmin) return actionError("서버 전용 Supabase 비밀 키 설정이 필요합니다.");
  const unbanResult = await authAdmin.auth.admin.updateUserById(id.data, { ban_duration: "none" });
  if (unbanResult.error) return actionError("Auth 계정 차단을 해제하지 못했습니다. 관리자 DB 접근은 여전히 중지된 상태입니다.");

  const { error } = await supabase.rpc("set_admin_user_active", {
    target_user_id: id.data,
    target_is_active: true
  });
  if (error) {
    return actionError("Auth 계정 차단은 해제했지만 관리자 DB 접근을 활성화하지 못했습니다. 다시 시도해 주세요.");
  }

  revalidateAdminPaths();
  return actionSuccess("관리자 계정을 활성화하고 Auth 차단을 해제했습니다.");
}

async function setAdminRoleAction(formData: FormData, targetRole: "owner" | "editor"): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseUserId(formData);
  const role = adminRoleSchema.safeParse(targetRole);
  if (!id.success) return zodActionError(id.error);
  if (!role.success) return zodActionError(role.error);

  const { error } = await supabase.rpc("set_admin_user_role", {
    target_user_id: id.data,
    target_role: role.data
  });
  if (error) {
    return actionError("관리자 권한을 변경하지 못했습니다. 마지막 활성 오너 보호 조건을 확인해 주세요.");
  }

  revalidateAdminPaths();
  return actionSuccess(targetRole === "owner" ? "오너 권한으로 변경했습니다." : "에디터 권한으로 변경했습니다.");
}

export async function promoteAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setAdminRoleAction(formData, "owner");
}

export async function demoteAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return setAdminRoleAction(formData, "editor");
}
