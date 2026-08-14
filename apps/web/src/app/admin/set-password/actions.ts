"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, zodActionError } from "@/lib/auth/action-utils";
import { requireActiveAdmin } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import { adminPasswordSchema } from "@/lib/admin/admin-user-schemas";

export async function setInvitedAdminPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = adminPasswordSchema.safeParse({
    password: formData.get("password"),
    password_confirmation: formData.get("password_confirmation")
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return actionError("비밀번호를 설정하지 못했습니다. Supabase 비밀번호 보안 기준과 초대 세션 상태를 확인해 주세요.");
  }

  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/login?reason=password_set");
}
