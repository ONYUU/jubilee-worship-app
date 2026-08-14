"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  optionalString,
  parsePositiveId,
  requiredString,
  zodActionError
} from "@/lib/auth/action-utils";
import { requireActiveAdmin, requireOwner } from "@/lib/auth/admin";
import type { ActionState } from "@/lib/auth/types";
import {
  notificationCampaignFormSchema,
  notificationCampaignIdSchema,
  testPushFormSchema
} from "@/lib/admin/mobile-content-schemas";

function revalidateNotificationPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}

function parseCampaignId(value: FormDataEntryValue | null) {
  return notificationCampaignIdSchema.safeParse(requiredString(value));
}

function parseCampaignForm(formData: FormData) {
  return notificationCampaignFormSchema.safeParse({
    kind: requiredString(formData.get("kind")),
    title: requiredString(formData.get("title")),
    body: requiredString(formData.get("body")),
    deep_link: optionalString(formData.get("deep_link")),
    audience_kind: requiredString(formData.get("audience_kind")),
    event_id: parsePositiveId(formData.get("event_id")),
    test_push_endpoint_id: optionalString(formData.get("test_push_endpoint_id")),
    dedupe_key: requiredString(formData.get("dedupe_key"))
  });
}

function campaignRpcArguments(campaign: z.infer<typeof notificationCampaignFormSchema>) {
  return {
    target_kind: campaign.kind,
    target_title: campaign.title,
    target_body: campaign.body,
    target_deep_link: campaign.deep_link,
    target_audience_kind: campaign.audience_kind,
    target_event_id: campaign.event_id,
    target_test_push_endpoint_id: campaign.test_push_endpoint_id,
    target_dedupe_key: campaign.dedupe_key
  };
}

export async function saveNotificationCampaignAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = parseCampaignForm(formData);
  if (!parsed.success) return zodActionError(parsed.error);

  const idValue = requiredString(formData.get("id"));
  if (idValue) {
    const id = notificationCampaignIdSchema.safeParse(idValue);
    if (!id.success) return zodActionError(id.error);
    const { error } = await supabase.rpc("update_notification_campaign", {
      target_campaign_id: id.data,
      ...campaignRpcArguments(parsed.data)
    });
    if (error) return actionError("알림 캠페인 초안을 수정하지 못했습니다. 초안 상태와 중복 방지 키를 확인해 주세요.");

    revalidateNotificationPaths();
    return actionSuccess("알림 캠페인 초안을 수정했습니다.");
  }

  const { data, error } = await supabase.rpc("create_notification_campaign", campaignRpcArguments(parsed.data));
  if (error || typeof data !== "string") {
    return actionError("알림 캠페인 초안을 만들지 못했습니다. 입력값과 중복 방지 키를 확인해 주세요.");
  }

  revalidateNotificationPaths();
  return actionSuccess("알림 캠페인 초안을 만들었습니다.");
}

export async function deleteNotificationCampaignAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const id = parseCampaignId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("delete_notification_campaign", { target_campaign_id: id.data });
  if (error) return actionError("알림 캠페인 초안만 삭제할 수 있습니다.");

  revalidateNotificationPaths();
  return actionSuccess("알림 캠페인 초안을 삭제했습니다.");
}

export async function approveNotificationCampaignAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseCampaignId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("approve_notification_campaign", { target_campaign_id: id.data });
  if (error) return actionError("알림 캠페인을 승인하지 못했습니다. 초안 내용과 오너 권한을 확인해 주세요.");

  revalidateNotificationPaths();
  return actionSuccess("오너가 알림 캠페인을 승인했습니다. 아직 발송 큐에는 넣지 않았습니다.");
}

export async function queueNotificationCampaignAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const id = parseCampaignId(formData.get("id"));
  if (!id.success) return zodActionError(id.error);

  const { error } = await supabase.rpc("queue_notification_campaign", { target_campaign_id: id.data });
  if (error) return actionError("승인된 알림 캠페인을 발송 큐에 넣지 못했습니다.");

  revalidateNotificationPaths();
  return actionSuccess("알림 캠페인을 발송 큐에 넣었습니다. 외부 발송은 별도 worker 설정에 따라 처리됩니다.");
}

const queuedTestPushResponseSchema = z.object({
  campaignId: z.uuid(),
  status: z.literal("queued"),
  externalSend: z.literal(false)
});

function edgeErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context.status : null;
}

export async function sendTestPushAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const parsed = testPushFormSchema.safeParse({
    installation_id: requiredString(formData.get("installation_id")),
    installation_secret: requiredString(formData.get("installation_secret")),
    title: requiredString(formData.get("title")),
    body: requiredString(formData.get("body")),
    deep_link: optionalString(formData.get("deep_link"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const { data, error } = await supabase.functions.invoke("test-push", {
    body: {
      installationId: parsed.data.installation_id,
      installationSecret: parsed.data.installation_secret,
      title: parsed.data.title,
      body: parsed.data.body,
      deepLink: parsed.data.deep_link
    }
  });
  if (error) {
    const status = edgeErrorStatus(error);
    if (status === 404) return actionError("시험 발송 서버가 아직 연결되지 않았습니다. test-push Edge Function 배포를 확인해 주세요.");
    if (status === 401) return actionError("시험 기기 ID·비밀값이 일치하지 않거나 관리자 세션이 만료됐습니다.");
    if (status === 403) return actionError("시험 발송은 활성 오너만 수행할 수 있습니다.");
    if (status === 400) return actionError("시험 발송 입력값을 확인해 주세요.");
    return actionError("시험 발송 준비가 완료되지 않았습니다. Edge Function·DB·서버 secret 설정을 확인해 주세요. 입력한 기기 비밀값은 화면이나 로그에 표시하지 않습니다.");
  }

  const response = queuedTestPushResponseSchema.safeParse(data);
  if (!response.success) return actionError("시험 발송 서버의 응답을 확인하지 못했습니다. 외부 발송은 시작하지 않았다고 간주하세요.");

  revalidateNotificationPaths();
  return actionSuccess("시험 캠페인을 승인하고 큐에 넣었습니다. 현재 단계는 큐 등록이며, 실제 발송은 dispatch worker 설정을 따릅니다.");
}
