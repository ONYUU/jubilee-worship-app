"use server";

import { APPROVED_YOUTUBE_VIDEO_IDS, mediaFormSchema } from "@jubilee/domain";
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

const APPROVED_YOUTUBE_VIDEO_ID_SET = new Set<string>(APPROVED_YOUTUBE_VIDEO_IDS);

function mediaPayload(formData: FormData) {
  return {
    slug: requiredString(formData.get("slug")),
    title: requiredString(formData.get("title")),
    kind: "youtube_video",
    provider: "youtube",
    provider_id: optionalString(formData.get("provider_id")),
    external_url: optionalString(formData.get("external_url")),
    source_label: optionalString(formData.get("source_label")),
    thumbnail_path: optionalString(formData.get("thumbnail_path")),
    thumbnail_alt: optionalString(formData.get("thumbnail_alt")),
    occurred_on: optionalString(formData.get("occurred_on")),
    description: optionalString(formData.get("description")),
    featured: checkbox(formData, "featured"),
    sort_order: optionalNumber(formData.get("sort_order")) ?? 100,
    published: checkbox(formData, "published")
  };
}

function revalidateMediaPaths() {
  revalidatePath("/");
  revalidatePath("/media");
  revalidatePath("/admin");
  revalidatePath("/admin/media");
}

export async function saveMediaAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = mediaFormSchema.safeParse(mediaPayload(formData));
  if (!parsed.success) return zodActionError(parsed.error);

  const id = parsePositiveId(formData.get("id"));
  const videoId = parsed.data.provider_id;
  if (!videoId) {
    return actionError("YouTube 영상 ID를 확인할 수 없습니다.", {
      external_url: ["지원하는 YouTube 영상 URL을 입력해 주세요."]
    });
  }

  const isApprovedVideo = APPROVED_YOUTUBE_VIDEO_ID_SET.has(videoId);
  const publicationWasDowngraded = parsed.data.published && !isApprovedVideo;
  const published = parsed.data.published && isApprovedVideo;

  if (published && (!parsed.data.thumbnail_path || !parsed.data.thumbnail_alt)) {
    return actionError("공개 게시하려면 사용 권한을 확인한 썸네일과 대체 텍스트가 필요합니다.", {
      thumbnail_path: ["공개할 영상의 썸네일 이미지를 업로드해 주세요."],
      thumbnail_alt: ["썸네일 대체 텍스트를 입력해 주세요."]
    });
  }

  const databasePayload = {
    ...parsed.data,
    external_url: `https://www.youtube.com/watch?v=${videoId}`,
    published
  };

  const query = id
    ? supabase
        .from("media_items")
        .update(databasePayload)
        .eq("id", id)
        .eq("kind", "youtube_video")
        .eq("provider", "youtube")
    : supabase.from("media_items").insert(databasePayload);
  const { data, error } = await query.select("id,slug").single();
  if (error || !data) return actionError("미디어를 저장하지 못했습니다. URL, 승인 출처, 중복 slug, 관리자 권한을 확인해 주세요.");

  revalidateMediaPaths();
  if (publicationWasDowngraded) {
    return actionSuccess(
      "승인된 공식 YouTube 영상 ID 목록에 없어 공개하지 않고 초안으로 저장했습니다. 영상 출처 승인 후 다시 공개해 주세요."
    );
  }
  return actionSuccess(id ? "YouTube 영상을 수정했습니다." : "YouTube 영상을 등록했습니다.");
}

export async function deleteMediaAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parsePositiveId(formData.get("id"));
  if (!id) return actionError("삭제할 미디어를 확인할 수 없습니다.");
  const { data, error } = await supabase
    .from("media_items")
    .delete()
    .eq("id", id)
    .eq("kind", "youtube_video")
    .eq("provider", "youtube")
    .select("id")
    .single();
  if (error || !data) return actionError("미디어를 삭제하지 못했습니다.");
  revalidateMediaPaths();
  return actionSuccess("YouTube 영상을 삭제했습니다.");
}
