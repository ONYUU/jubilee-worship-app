"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  testPushFormSchema,
  worshipReminderScheduleFormSchema,
  worshipReminderScheduleResultSchema
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

const campaignKindRowsSchema = z.array(z.object({
  id: z.uuid(),
  kind: z.enum(["test", "worship_reminder", "schedule_change", "setlist_update"])
}));

const schedulableEventSchema = z.object({
  id: z.number().int().positive(),
  starts_at: z.iso.datetime({ offset: true }),
  status: z.enum(["scheduled", "postponed"]),
  published: z.literal(true)
});

const reminderResultSlotLabels = {
  day_before_1930: "전날 19:30",
  one_hour_before: "당일 1시간 전"
} as const;

const reminderResultStatusLabels = {
  approved: "승인됨",
  queued: "발송 큐 등록됨",
  processing: "발송 처리 중",
  completed: "발송 완료",
  failed: "발송 실패"
} as const;

async function isWorshipReminderCampaign(
  supabase: SupabaseClient,
  campaignId: string
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("list_notification_campaigns");
  if (error) return null;
  const campaigns = campaignKindRowsSchema.safeParse(data);
  if (!campaigns.success) return null;
  const campaign = campaigns.data.find((item) => item.id === campaignId);
  return campaign ? campaign.kind === "worship_reminder" : null;
}

export async function saveNotificationCampaignAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireActiveAdmin();
  const parsed = parseCampaignForm(formData);
  if (!parsed.success) return zodActionError(parsed.error);
  if (parsed.data.kind === "worship_reminder") {
    return actionError("정기 예배 알림은 상단의 `예배 알림 승인·예약`에서 전날·당일 두 문구를 함께 확인해 생성해 주세요.");
  }

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

  const isWorshipReminder = await isWorshipReminderCampaign(supabase, id.data);
  if (isWorshipReminder === null) return actionError("승인할 알림 캠페인을 확인하지 못했습니다.");
  if (isWorshipReminder) {
    return actionError("정기 예배 알림은 `예배 알림 승인·예약`에서 전날·당일 두 문구를 함께 승인해야 합니다.");
  }

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

  const isWorshipReminder = await isWorshipReminderCampaign(supabase, id.data);
  if (isWorshipReminder === null) return actionError("큐에 넣을 알림 캠페인을 확인하지 못했습니다.");
  if (isWorshipReminder) {
    return actionError("예약된 예배 알림은 운영 scheduler만 해당 예약 시각에 큐에 넣을 수 있습니다.");
  }

  const { error } = await supabase.rpc("queue_notification_campaign", { target_campaign_id: id.data });
  if (error) return actionError("승인된 알림 캠페인을 발송 큐에 넣지 못했습니다.");

  revalidateNotificationPaths();
  return actionSuccess("알림 캠페인을 발송 큐에 넣었습니다. 외부 발송은 별도 worker 설정에 따라 처리됩니다.");
}

export async function scheduleWorshipRemindersAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  noStore();
  const { supabase } = await requireOwner();
  const parsed = worshipReminderScheduleFormSchema.safeParse({
    event_id: parsePositiveId(formData.get("event_id")),
    day_before_title: requiredString(formData.get("day_before_title")),
    day_before_body: requiredString(formData.get("day_before_body")),
    one_hour_title: requiredString(formData.get("one_hour_title")),
    one_hour_body: requiredString(formData.get("one_hour_body"))
  });
  if (!parsed.success) return zodActionError(parsed.error);

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,starts_at,status,published")
    .eq("id", parsed.data.event_id)
    .maybeSingle();
  const schedulableEvent = schedulableEventSchema.safeParse(event);
  if (eventError || !schedulableEvent.success || Date.parse(schedulableEvent.data.starts_at) <= Date.now()) {
    return actionError("예배 알림은 앞으로 다가올 공개 예정·연기 예배에만 예약할 수 있습니다.");
  }

  const { data, error } = await supabase.rpc("schedule_worship_reminder_campaigns", {
    target_event_id: parsed.data.event_id,
    target_day_before_title: parsed.data.day_before_title,
    target_day_before_body: parsed.data.day_before_body,
    target_one_hour_title: parsed.data.one_hour_title,
    target_one_hour_body: parsed.data.one_hour_body
  });
  if (error) {
    return actionError("예배 알림을 승인·예약하지 못했습니다. 공개된 예정·연기 예배, 오너 권한, 각 예약 시각의 15분 유효 범위를 확인해 주세요.");
  }

  const rows = z.array(worshipReminderScheduleResultSchema).length(2).safeParse(data);
  if (!rows.success || new Set(rows.data.map((row) => row.reminder_slot)).size !== 2) {
    return actionError("예배 알림 예약 응답이 완전하지 않습니다. 발송을 시작하지 말고 예약 목록을 확인해 주세요.");
  }

  revalidateNotificationPaths();
  const statusSummary = rows.data
    .map((row) => `${reminderResultSlotLabels[row.reminder_slot]} ${reminderResultStatusLabels[row.status]}`)
    .join(", ");
  if (rows.data.some((row) => row.requires_action || row.status === "failed")) {
    return actionError(`예배 알림 상태: ${statusSummary}. 기존 실패 알림은 새 예약으로 대체되지 않습니다. 예약 목록과 worker 오류를 확인해 주세요.`);
  }
  if (rows.data.some((row) => row.status === "processing" || row.status === "completed")) {
    return actionSuccess(`예배 알림 상태를 확인했습니다: ${statusSummary}. 이미 처리 중이거나 완료된 슬롯은 새 예약으로 대체되지 않습니다.`);
  }
  if (rows.data.some((row) => row.status === "queued")) {
    return actionSuccess(`예배 알림 2개 슬롯의 기존 예약을 확인했습니다: ${statusSummary}. 큐에 등록된 알림은 worker 처리 상태를 따릅니다.`);
  }
  return actionSuccess("예배 전날 19:30과 당일 1시간 전 알림 2개 슬롯의 오너 승인 상태 예약을 확인했습니다. 실제 발송은 scheduler·worker 설정을 따릅니다.");
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
