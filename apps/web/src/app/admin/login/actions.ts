"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError } from "@/lib/auth/action-utils";
import type { ActionState } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요.")
});

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return actionError("이메일과 비밀번호를 확인해 주세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return actionError("Supabase 연결 정보가 설정되지 않았습니다. 배포 담당자에게 문의해 주세요.");
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return actionError("이메일, 비밀번호 또는 접근 권한을 확인해 주세요.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    await supabase.auth.signOut();
    return actionError("활성 관리자 계정으로 등록되어 있지 않습니다.");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}
