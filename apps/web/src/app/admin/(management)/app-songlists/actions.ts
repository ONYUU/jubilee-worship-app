"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
  actionError,
  actionSuccess,
  optionalNumber,
  optionalString,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin, requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import {
  adminRecordIdSchema,
  eventSetlistFormSchema,
  setlistItemFormSchema
} from "@/lib/admin/mobile-content-schemas";

function revalidateSonglistPaths() {
  revalidatePath("/");
  revalidatePath("/worship");
  revalidatePath("/admin");
  revalidatePath("/admin/app-songlists");
}

function parseId(value: FormDataEntryValue | null) {
  return adminRecordIdSchema.safeParse(parsePositiveId(value));
}

export async function saveSetlistRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = eventSetlistFormSchema.safeParse({
    event_id: parsePositiveId(formData.get("event_id")),
    playlist_url: optionalString(formData.get("playlist_url"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  const query = id
    ? supabase
        .from("event_setlists")
        .update({ playlist_url: parsed.data.playlist_url })
        .eq("id", id.data)
        .eq("event_id", parsed.data.event_id)
        .eq("status", "draft")
    : supabase.from("event_setlists").insert({
        event_id: parsed.data.event_id,
        playlist_url: parsed.data.playlist_url
      });
  const { data, error } = await query.select("id,event_id,revision_no,status").single();
  if (error || !data) {
    return actionError("송리스트 초안을 저장하지 못했습니다. 편집 가능한 초안인지와 관리자 권한을 확인해 주세요.");
  }

  revalidateSonglistPaths();
  return actionSuccess(id ? "송리스트 초안을 수정했습니다." : "송리스트 새 개정본을 만들었습니다.");
}

export async function deleteSetlistRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("event_setlists")
    .delete()
    .eq("id", id.data)
    .eq("status", "draft")
    .select("id,event_id")
    .single();
  if (error || !data) return actionError("송리스트 초안을 삭제하지 못했습니다.");

  revalidateSonglistPaths();
  return actionSuccess("송리스트 초안을 삭제했습니다.");
}

export async function saveSetlistItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = setlistItemFormSchema.safeParse({
    setlist_id: parsePositiveId(formData.get("setlist_id")),
    position: optionalNumber(formData.get("position")),
    title: requiredString(formData.get("title")),
    artist: optionalString(formData.get("artist")),
    musical_key: optionalString(formData.get("musical_key")),
    youtube_url: optionalString(formData.get("youtube_url"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = parsePositiveId(formData.get("id"));
  const id = idValue === null ? null : adminRecordIdSchema.safeParse(idValue);
  if (id && !id.success) return zodActionError(id.error);

  const itemFields = {
    position: parsed.data.position,
    title: parsed.data.title,
    artist: parsed.data.artist,
    musical_key: parsed.data.musical_key,
    youtube_url: parsed.data.youtube_url
  };
  const query = id
    ? supabase
        .from("setlist_items")
        .update(itemFields)
        .eq("id", id.data)
        .eq("setlist_id", parsed.data.setlist_id)
    : supabase.from("setlist_items").insert({ setlist_id: parsed.data.setlist_id, ...itemFields });
  const { data, error } = await query.select("id,setlist_id").single();
  if (error || !data) {
    return actionError("곡을 저장하지 못했습니다. 초안 상태, 같은 순서 번호와 입력값을 확인해 주세요.");
  }

  revalidateSonglistPaths();
  return actionSuccess(id ? "곡 정보를 수정했습니다." : "곡을 추가했습니다.");
}

export async function deleteSetlistItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { data, error } = await supabase
    .from("setlist_items")
    .delete()
    .eq("id", id.data)
    .select("id,setlist_id")
    .single();
  if (error || !data) return actionError("곡을 삭제하지 못했습니다. 초안 상태인지 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("곡을 삭제했습니다.");
}

export async function requestSetlistReviewAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("request_event_setlist_review", { target_setlist_id: id.data });
  if (error) return actionError("송리스트 검수를 요청하지 못했습니다. 곡이 한 개 이상 등록됐는지 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("오너에게 송리스트 검수를 요청했습니다.");
}

export async function publishSetlistRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("publish_event_setlist_revision", { target_setlist_id: id.data });
  if (error) return actionError("송리스트를 공개하지 못했습니다. 검수 요청 상태와 모든 YouTube 링크의 오너 검증 여부를 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("송리스트 새 개정본을 공개했습니다.");
}

export async function returnSetlistRevisionToDraftAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("return_event_setlist_revision_to_draft", { target_setlist_id: id.data });
  if (error) return actionError("송리스트를 초안으로 돌리지 못했습니다. 검수 요청 상태와 오너 권한을 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("송리스트를 수정 가능한 초안으로 반려했습니다.");
}

export async function withdrawSetlistRevisionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);
  const { error } = await supabase.rpc("withdraw_event_setlist_revision", { target_setlist_id: id.data });
  if (error) return actionError("송리스트 공개를 철회하지 못했습니다.");

  revalidateSonglistPaths();
  return actionSuccess("송리스트 공개를 철회했습니다.");
}

export async function verifySetlistPlaylistAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("verify_event_setlist_playlist", { target_setlist_id: id.data });
  if (error) return actionError("전체 듣기 YouTube 링크를 검증하지 못했습니다. 미공개 개정본의 링크인지 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("오너가 전체 듣기 YouTube 링크를 공식 링크로 검증했습니다.");
}

export async function verifySetlistItemYoutubeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("verify_setlist_item_youtube", { target_item_id: id.data });
  if (error) return actionError("곡 YouTube 링크를 검증하지 못했습니다. 미공개 개정본의 링크인지 확인해 주세요.");

  revalidateSonglistPaths();
  return actionSuccess("오너가 곡 YouTube 링크를 공식 링크로 검증했습니다.");
}
