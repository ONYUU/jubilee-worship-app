import { randomUUID } from "node:crypto";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  reinstallRecoveryChallengeListSchema,
  testPushTargetListSchema,
  worshipReminderScheduleListSchema
} from "@/lib/admin/mobile-content-schemas";
import { WORSHIP_REMINDER_SCHEDULE } from "@/lib/site-identity";
import {
  approveNotificationCampaignAction,
  approveReinstallRecoveryAction,
  approveTestPushPairingAction,
  deleteNotificationCampaignAction,
  queueNotificationCampaignAction,
  rejectReinstallRecoveryAction,
  revokeTestPushTargetAction,
  scheduleWorshipRemindersAction,
  saveNotificationCampaignAction,
  sendTestPushAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CampaignRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  deep_link: string | null;
  audience_kind: string;
  event_id: number | null;
  status: string;
  dedupe_key: string;
  approved_at: string | null;
  queued_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  delivery_count: number;
  failed_delivery_count: number;
};

const KIND_LABELS: Record<string, string> = {
  test: "시험",
  worship_reminder: "예배 알림",
  schedule_change: "일정 변경",
  setlist_update: "송리스트 변경"
};

const AUDIENCE_LABELS: Record<string, string> = {
  test_endpoint: "시험 기기 1대",
  worship_reminder: "예배 알림 동의자",
  schedule_changes: "일정 변경 동의자",
  setlist_updates: "송리스트 변경 동의자",
  all_opted_in: "알림 동의자 전체"
};

const REMINDER_SLOT_LABELS = {
  day_before_1930: "전날 19:30",
  one_hour_before: "당일 1시간 전"
} as const;

function formatSeoul(value: string | null): string {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function campaignRows(value: unknown): CampaignRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CampaignRow => Boolean(
    item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string"
  ));
}

export default async function NotificationsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  noStore();
  const [{ edit }, { supabase, admin }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const [campaignResult, eventResult, reminderScheduleResult] = await Promise.all([
    supabase.rpc("list_notification_campaigns"),
    supabase
      .from("events")
      .select("id,slug,title,starts_at,status,published")
      .order("starts_at", { ascending: false })
      .limit(100),
    supabase.rpc("list_worship_reminder_schedules")
  ]);
  const [testTargetResult, recoveryResult] = admin.role === "owner"
    ? await Promise.all([
      supabase.rpc("list_owner_test_push_targets"),
      supabase.rpc("list_owner_reinstall_recovery_challenges")
    ])
    : [
      { data: [], error: null },
      { data: [], error: null }
    ];
  const campaigns = campaignRows(campaignResult.data);
  const events = eventResult.data ?? [];
  const reminderSchedules = worshipReminderScheduleListSchema.safeParse(reminderScheduleResult.data);
  const schedules = reminderSchedules.success ? reminderSchedules.data : [];
  const reminderContractAvailable = !reminderScheduleResult.error && reminderSchedules.success;
  const parsedTestTargets = testPushTargetListSchema.safeParse(testTargetResult.data);
  const testTargets = parsedTestTargets.success ? parsedTestTargets.data : [];
  const testTargetContractAvailable = !testTargetResult.error && parsedTestTargets.success;
  const parsedRecoveryChallenges = reinstallRecoveryChallengeListSchema.safeParse(recoveryResult.data);
  const recoveryChallenges = parsedRecoveryChallenges.success ? parsedRecoveryChallenges.data : [];
  const recoveryContractAvailable = !recoveryResult.error && parsedRecoveryChallenges.success;
  const eligibleEvents = events.filter(
    (event) => event.published
      && (event.status === "scheduled" || event.status === "postponed")
  );
  const selected = campaigns.find((campaign) => campaign.id === edit && campaign.status === "draft") ?? null;
  const eventNames = new Map(events.map((event) => [event.id, event.title]));
  const hasError = Boolean(
    campaignResult.error || eventResult.error || reminderScheduleResult.error || !reminderSchedules.success
      || (admin.role === "owner" && !testTargetContractAvailable)
      || (admin.role === "owner" && !recoveryContractAvailable)
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operations · Push"
        title="알림 캠페인"
        description="에디터는 발송 초안을 작성합니다. 오너가 내용과 대상을 승인한 뒤에만 발송 큐에 넣을 수 있습니다."
        createHref="/admin/notifications"
      />
      {hasError ? <AdminDataNotice message="알림 캠페인을 불러오지 못했습니다. RPC migration과 관리자 권한을 확인해 주세요." /> : null}

      <section className="rounded-2xl border border-brand-sun/30 bg-brand-sun/5 p-5">
        <h2 className="text-xl font-bold">예배 알림 승인·예약</h2>
        <p className="mt-2 text-sm text-stone-300">
          운영 기준은 {WORSHIP_REMINDER_SCHEDULE.dayBeforeLabel}과 {WORSHIP_REMINDER_SCHEDULE.oneHourBeforeLabel}입니다. 예배 시각·공개 상태 또는 승인 문구 기준이 바뀌면 기존 예약은 자동으로 재계산되지 않으므로 오너가 두 문구를 다시 확인하고 재승인해야 합니다.
        </p>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <div>
            <h3 className="font-bold">예약 목록</h3>
            <ul className="mt-3 divide-y divide-white/10">
              {schedules.map((schedule) => (
                <li key={schedule.campaign_id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{schedule.event_title}</p>
                    <StatusPill status={REMINDER_SLOT_LABELS[schedule.reminder_slot]} />
                    <StatusPill status={schedule.status} />
                    {schedule.requires_reapproval ? <StatusPill status="재승인 필요" /> : null}
                  </div>
                  <p className="mt-2 text-sm text-stone-300">{schedule.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-400">{schedule.body}</p>
                  <p className="mt-2 text-xs text-stone-400">예약 시각 {formatSeoul(schedule.scheduled_for)} · 예배 {formatSeoul(schedule.current_event_starts_at)}</p>
                  {schedule.requires_reapproval ? (
                    <p className="mt-2 text-xs text-danger">예배 시각·공개 상태·승인 문구 기준이 달라졌거나 예약 시각이 지났습니다. 오너가 아래에서 다시 승인해야 합니다.</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {reminderContractAvailable && schedules.length === 0 ? <p className="mt-3 text-sm text-stone-300">예약된 예배 알림이 없습니다.</p> : null}
          </div>

          {admin.role === "owner" ? (
            <div>
              <h3 className="font-bold">두 알림 문구 확인</h3>
              {!reminderContractAvailable ? (
                <AdminDataNotice message="두 단계 예배 알림 DB migration이 아직 연결되지 않았습니다. 운영 설정 전에는 알림을 승인·예약하지 마세요." />
              ) : eligibleEvents.length > 0 ? (
                <AdminForm
                  action={scheduleWorshipRemindersAction}
                  submitLabel="두 알림 승인·예약"
                  className="mt-3"
                  confirmMessage="선택한 예배의 전날 19:30과 당일 1시간 전 알림 문구를 모두 확인했습니까? 제출하면 오너 승인 상태로 예약됩니다."
                >
                  <FormSection title="예배 선택" description="공개된 예정·연기 예배만 예약할 수 있습니다.">
                    <SelectField
                      label="예배"
                      name="event_id"
                      options={eligibleEvents.map((event) => ({
                        value: String(event.id),
                        label: `${event.title} · ${formatSeoul(event.starts_at)}`
                      }))}
                    />
                  </FormSection>
                  <FormSection title="전날 19:30 알림">
                    <TextField label="제목" name="day_before_title" required defaultValue={WORSHIP_REMINDER_SCHEDULE.dayBeforeTitle} />
                    <TextAreaField label="본문" name="day_before_body" required rows={4} defaultValue={WORSHIP_REMINDER_SCHEDULE.dayBeforeBody} />
                  </FormSection>
                  <FormSection title="당일 1시간 전 알림">
                    <TextField label="제목" name="one_hour_title" required defaultValue={WORSHIP_REMINDER_SCHEDULE.oneHourBeforeTitle} />
                    <TextAreaField label="본문" name="one_hour_body" required rows={4} defaultValue={WORSHIP_REMINDER_SCHEDULE.oneHourBeforeBody} />
                  </FormSection>
                </AdminForm>
              ) : (
                <AdminDataNotice message="알림을 예약할 공개 예정·연기 예배가 없습니다." />
              )}
              <p className="mt-4 text-xs text-stone-400">승인·예약은 발송 완료를 의미하지 않습니다. 운영 scheduler가 예약 시각부터 15분 안에 queue하고 `dispatch-notifications` worker가 실제 발송해야 합니다. 이 유예 시간을 넘긴 알림은 늦게 발송하지 않습니다.</p>
            </div>
          ) : (
            <p className="text-sm text-stone-300">예약 목록은 확인할 수 있지만, 두 알림의 최종 승인·예약은 오너만 수행할 수 있습니다.</p>
          )}
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.95fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">캠페인 이력</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="py-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold">{campaign.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-300">{campaign.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill status={KIND_LABELS[campaign.kind] ?? campaign.kind} />
                      <StatusPill status={AUDIENCE_LABELS[campaign.audience_kind] ?? campaign.audience_kind} />
                      <StatusPill status={campaign.status} />
                    </div>
                    <p className="mt-2 text-xs text-stone-400">연결 예배 {campaign.event_id ? eventNames.get(campaign.event_id) ?? `#${campaign.event_id}` : "없음"}</p>
                    <p className="mt-1 break-all text-xs text-stone-400">딥링크 {campaign.deep_link ?? "없음"} · 중복 키 {campaign.dedupe_key}</p>
                    <p className="mt-1 text-xs text-stone-400">승인 {formatSeoul(campaign.approved_at)} · 큐 {formatSeoul(campaign.queued_at)} · 완료 {formatSeoul(campaign.completed_at)}</p>
                    <p className="mt-1 text-xs text-stone-400">배송 {campaign.delivery_count} · 실패 {campaign.failed_delivery_count}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {campaign.status === "draft" ? (
                      <>
                        <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/notifications?edit=${campaign.id}`}>수정</Link>
                        <AdminActionButton action={deleteNotificationCampaignAction} id={campaign.id} label="초안 삭제" tone="danger" confirmMessage="이 알림 캠페인 초안을 삭제할까요?" />
                      </>
                    ) : null}
                    {admin.role === "owner" && campaign.status === "draft" && campaign.kind !== "worship_reminder" ? (
                      <AdminActionButton action={approveNotificationCampaignAction} id={campaign.id} label="내용 승인" confirmMessage="알림 내용·대상·딥링크를 확인했습니까? 승인 후에는 초안을 수정할 수 없습니다." />
                    ) : null}
                    {admin.role === "owner" && campaign.status === "approved" && campaign.kind !== "worship_reminder" ? (
                      <AdminActionButton action={queueNotificationCampaignAction} id={campaign.id} label="발송 큐에 넣기" confirmMessage="승인된 이 알림을 발송 큐에 넣을까요? 외부 worker가 활성화되면 복구하기 어려운 발송이 시작될 수 있습니다." />
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {campaigns.length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 알림 캠페인이 없습니다.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "알림 초안 수정" : "새 알림 초안"}</h2>
          <AdminForm action={saveNotificationCampaignAction} submitLabel={selected ? "초안 저장" : "초안 만들기"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="알림 내용">
              <SelectField
                label="알림 종류"
                name="kind"
                defaultValue={selected?.kind ?? "schedule_change"}
                options={[
                  { value: "schedule_change", label: "일정 변경" },
                  { value: "setlist_update", label: "송리스트 변경" }
                ]}
              />
              <TextField label="제목" name="title" required defaultValue={selected?.title ?? null} />
              <TextAreaField label="본문" name="body" required defaultValue={selected?.body ?? null} rows={5} />
              <TextField label="앱 딥링크(선택)" name="deep_link" defaultValue={selected?.deep_link ?? null} hint="예: jubileeworship://worship 또는 jubileeworship://worship/&lt;slug&gt;/songlist" />
            </FormSection>
            <FormSection title="발송 대상">
              <SelectField
                label="대상"
                name="audience_kind"
                defaultValue={selected?.audience_kind ?? "schedule_changes"}
                options={[
                  { value: "worship_reminder", label: "예배 알림 동의자" },
                  { value: "schedule_changes", label: "일정 변경 동의자" },
                  { value: "setlist_updates", label: "송리스트 변경 동의자" },
                  { value: "all_opted_in", label: "알림 동의자 전체" }
                ]}
              />
              <SelectField
                label="연결 예배(선택)"
                name="event_id"
                defaultValue={selected?.event_id ? String(selected.event_id) : ""}
                options={[
                  { value: "", label: "연결 안 함" },
                  ...events.map((event) => ({ value: String(event.id), label: `${event.title} · ${formatSeoul(event.starts_at)}` }))
                ]}
              />
              <input type="hidden" name="test_push_endpoint_id" value="" />
              <TextField label="중복 방지 키" name="dedupe_key" required defaultValue={selected?.dedupe_key ?? null} hint="영문·숫자·:._- 조합, 캠페인별 고유값" />
            </FormSection>
          </AdminForm>
        </section>
      </div>

      {admin.role === "owner" ? (
        <section className="rounded-2xl border border-brand-sun/30 bg-brand-sun/5 p-5">
          <h2 className="text-xl font-bold">재설치 알림 연결 복구</h2>
          <p className="mt-2 text-sm text-stone-300">
            같은 Expo 주소가 이전 설치에 남아 신규 등록이 막힌 경우에만 사용합니다. 현재는 개발·미리보기 앱만 허용하며 운영 앱은 차단합니다. 앱 버전처럼 기기가 임의로 보낼 수 있는 값은 표시하지 않으며, 이전·신규 설치의 12자리 마스킹 지문과 새 기기의 26자리 일회용 코드를 직접 대조한 뒤 승인하세요.
          </p>
          <p className="mt-2 text-xs text-stone-400">
            승인은 짧은 완료 권한만 부여하며 이 단계에서는 이전 연결이 바뀌지 않습니다. 새 기기가 앱에서 현재 동의·알림 설정으로 완료하면 그 순간 이전 연결을 폐기하고 새 설치를 원자적으로 등록합니다. Expo token과 설치 인증값은 표시하지 않으며, 입력한 복구 코드 원문은 저장하거나 데이터베이스에 전송하지 않습니다.
          </p>

          {!recoveryContractAvailable ? (
            <AdminDataNotice message="재설치 복구 RPC가 아직 연결되지 않았습니다. migration과 오너 권한을 확인해 주세요." />
          ) : recoveryChallenges.length === 0 ? (
            <div className="mt-4">
              <AdminDataNotice message="승인을 기다리는 개발·미리보기 재설치 복구 요청이 없습니다." />
            </div>
          ) : (
            <ul className="mt-5 space-y-5">
              {recoveryChallenges.map((challenge) => (
                <li key={challenge.challenge_id} className="rounded-xl border border-white/10 bg-night-900 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                    <div>
                      <p className="text-xs font-semibold text-stone-400">연결을 폐기할 이전 설치</p>
                      <p className="mt-1 text-sm text-stone-100">{challenge.source_display_label}</p>
                    </div>
                    <span aria-hidden className="hidden text-stone-500 lg:block">→</span>
                    <div>
                      <p className="text-xs font-semibold text-stone-400">새로 연결할 설치</p>
                      <p className="mt-1 text-sm text-stone-100">{challenge.target_display_label}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-stone-400">
                    요청 {formatSeoul(challenge.created_at)} · 만료 {formatSeoul(challenge.expires_at)}
                  </p>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                    <AdminForm
                      action={approveReinstallRecoveryAction}
                      submitLabel="대조 후 복구 승인"
                      confirmMessage="화면의 이전·신규 기기 정보와 새 기기의 26자리 복구 코드를 직접 대조했습니까? 승인 후 새 기기 앱에서 완료해야 실제 교체되며, 승인만으로 이전 연결은 폐기되지 않습니다."
                      resetOnSettled
                    >
                      <input type="hidden" name="challenge_id" value={challenge.challenge_id} />
                      <FormSection
                        title="새 기기 일회용 코드"
                        description="새 기기 화면에 표시된 26자리 코드를 입력하세요. 서버는 즉시 해시한 값만 데이터베이스에 보냅니다."
                      >
                        <TextField
                          label="재설치 복구 코드"
                          name="recovery_code"
                          required
                          type="password"
                          autoComplete="off"
                          spellCheck={false}
                          hint="예: 7M4K-9P2T-8W3X-6Y5Z-1A2B-3C4D-5E"
                        />
                      </FormSection>
                    </AdminForm>
                    <AdminActionButton
                      action={rejectReinstallRecoveryAction}
                      id={challenge.challenge_id}
                      label="요청 거절"
                      tone="danger"
                      confirmMessage="이 재설치 복구 요청을 거절하고 대기 중 인증값을 폐기할까요?"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {admin.role === "owner" ? (
        <section className="rounded-2xl border border-brand-sky/30 bg-brand-sky/5 p-5">
          <h2 className="text-xl font-bold">시험 기기로 푸시 확인</h2>
          <p className="mt-2 text-sm text-stone-300">
            개발·미리보기 앱에 표시된 일회용 연결 코드를 오너가 직접 승인한 기기만 시험 대상으로 사용할 수 있습니다. 설치 비밀값과 Expo token은 관리자 화면·로그·응답에 노출하지 않습니다.
          </p>

          <AdminForm
            action={approveTestPushPairingAction}
            submitLabel="시험 기기 연결 승인"
            className="mt-5 max-w-3xl"
            confirmMessage="앱 화면과 관리자 화면을 직접 대조했고 이 개발·미리보기 기기를 시험 대상으로 승인합니까?"
          >
            <FormSection
              title="새 시험 기기 연결"
              description="실기기 알림 설정에서 생성한 12자리 코드를 10분 안에 입력하세요. 코드는 한 번만 사용할 수 있으며 서버와 브라우저에 저장하지 않습니다."
            >
              <TextField
                label="연결 코드"
                name="pairing_code"
                required
                hint="예: 2H7K-9M4Q-WX3D"
              />
            </FormSection>
          </AdminForm>

          <div className="mt-7">
            <h3 className="font-bold">승인된 시험 기기</h3>
            {!testTargetContractAvailable ? (
              <AdminDataNotice message="시험 기기 승인 목록 RPC가 아직 연결되지 않았습니다. migration과 오너 권한을 확인해 주세요." />
            ) : testTargets.length === 0 ? (
              <AdminDataNotice message="승인된 개발·미리보기 시험 기기가 없습니다. 실기기에서 연결 코드를 만든 뒤 오너가 위에서 승인해 주세요." />
            ) : (
              <ul className="mt-3 divide-y divide-white/10">
                {testTargets.map((target) => (
                  <li
                    key={target.push_endpoint_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <span className="text-sm text-stone-200">{target.display_label}</span>
                    <AdminActionButton
                      action={revokeTestPushTargetAction}
                      id={target.push_endpoint_id}
                      label="승인 해제"
                      tone="danger"
                      confirmMessage="이 시험 기기 승인을 해제할까요? 아직 처리되지 않은 해당 기기의 시험 큐도 취소됩니다."
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {testTargetContractAvailable && testTargets.length > 0 ? (
            <AdminForm
              action={sendTestPushAction}
              submitLabel="시험 캠페인 큐 등록"
              className="mt-5 max-w-3xl"
              confirmMessage="선택한 비운영 시험 기기 1대에 보낼 알림 내용과 앱 환경을 확인했습니까?"
            >
              <input type="hidden" name="request_id" value={randomUUID()} />
              <FormSection title="시험 기기 선택" description="오너가 연결 승인한 기기만 표시됩니다. 운영 앱은 목록과 시험 발송 경로에서 모두 제외됩니다.">
                <SelectField
                  label="대상 기기"
                  name="target"
                  options={testTargets.map((target) => ({
                    value: `${target.app_variant}:${target.push_endpoint_id}`,
                    label: target.display_label
                  }))}
                />
                <TextField label="제목" name="title" required defaultValue="쥬빌리워십 시험 알림" />
                <TextAreaField label="본문" name="body" required rows={4} defaultValue="시험 기기 알림을 확인해 주세요." />
                <TextField label="앱 딥링크(선택)" name="deep_link" hint="예: jubileeworship://worship 또는 jubileeworship://worship/&lt;slug&gt;/songlist" />
              </FormSection>
            </AdminForm>
          ) : null}
          <p className="mt-4 text-xs text-stone-400">큐 등록은 실제 기기 도착을 의미하지 않습니다. 실제 Expo 발송은 `dispatch-notifications` worker와 외부 발송 설정이 따로 필요하며, worker가 대상을 claim한 뒤에는 승인 해제로 회수할 수 없습니다.</p>
        </section>
      ) : null}
    </div>
  );
}
