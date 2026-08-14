"use server";

import { teamMemberFormSchema } from "@jubilee/domain";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  checkbox,
  optionalNumber,
  optionalString,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";

function payload(formData: FormData) {
  return {
    name: requiredString(formData.get("name")),
    role_title: requiredString(formData.get("role_title")),
    category: requiredString(formData.get("category")),
    photo_path: optionalString(formData.get("photo_path")),
    photo_alt: optionalString(formData.get("photo_alt")),
    bio: optionalString(formData.get("bio")),
    sort_order: optionalNumber(formData.get("sort_order")) ?? 100,
    published: checkbox(formData, "published")
  };
}

function revalidateTeamPaths() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin");
  revalidatePath("/admin/team");
}

export async function saveTeamMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = teamMemberFormSchema.safeParse(payload(formData));
  if (!parsed.success) return zodActionError(parsed.error);

  if (parsed.data.published && !checkbox(formData, "publication_consent")) {
    return actionError(
      "프로필을 공개하려면 이름·직함·약력·사진에 대한 당사자 및 교회 내부 기준의 공개 동의를 확인해야 합니다.",
      { publication_consent: ["공개 동의 확인이 필요합니다."] }
    );
  }

  const id = parsePositiveId(formData.get("id"));
  const query = id
    ? supabase.from("team_members").update(parsed.data).eq("id", id)
    : supabase.from("team_members").insert(parsed.data);
  const { data, error } = await query.select("id").single();
  if (error || !data) return actionError("섬기는 이 정보를 저장하지 못했습니다. 중복 이름·직함과 관리자 권한을 확인해 주세요.");

  revalidateTeamPaths();
  return actionSuccess(id ? "섬기는 이 정보를 수정했습니다." : "섬기는 이 정보를 등록했습니다.");
}

export async function deleteTeamMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parsePositiveId(formData.get("id"));
  if (!id) return actionError("삭제할 항목을 확인할 수 없습니다.");
  const { data, error } = await supabase.from("team_members").delete().eq("id", id).select("id").single();
  if (error || !data) return actionError("섬기는 이 정보를 삭제하지 못했습니다.");
  revalidateTeamPaths();
  return actionSuccess("섬기는 이 정보를 삭제했습니다.");
}
