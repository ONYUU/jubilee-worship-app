import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  approveNotificationCampaignAction,
  deleteNotificationCampaignAction,
  queueNotificationCampaignAction,
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
  const [campaignResult, eventResult] = await Promise.all([
    supabase.rpc("list_notification_campaigns"),
    supabase.from("events").select("id,title,starts_at").order("starts_at", { ascending: false }).limit(100)
  ]);
  const campaigns = campaignRows(campaignResult.data);
  const events = eventResult.data ?? [];
  const selected = campaigns.find((campaign) => campaign.id === edit && campaign.status === "draft") ?? null;
  const eventNames = new Map(events.map((event) => [event.id, event.title]));
  const hasError = Boolean(campaignResult.error || eventResult.error);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operations · Push"
        title="알림 캠페인"
        description="에디터는 발송 초안을 작성합니다. 오너가 내용과 대상을 승인한 뒤에만 발송 큐에 넣을 수 있습니다."
        createHref="/admin/notifications"
      />
      {hasError ? <AdminDataNotice message="알림 캠페인을 불러오지 못했습니다. RPC migration과 관리자 권한을 확인해 주세요." /> : null}

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
                    {admin.role === "owner" && campaign.status === "draft" ? (
                      <AdminActionButton action={approveNotificationCampaignAction} id={campaign.id} label="내용 승인" confirmMessage="알림 내용·대상·딥링크를 확인했습니까? 승인 후에는 초안을 수정할 수 없습니다." />
                    ) : null}
                    {admin.role === "owner" && campaign.status === "approved" ? (
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
                  { value: "worship_reminder", label: "예배 알림" },
                  { value: "schedule_change", label: "일정 변경" },
                  { value: "setlist_update", label: "송리스트 변경" }
                ]}
              />
              <TextField label="제목" name="title" required defaultValue={selected?.title ?? null} />
              <TextAreaField label="본문" name="body" required defaultValue={selected?.body ?? null} rows={5} />
              <TextField label="앱 딥링크(선택)" name="deep_link" defaultValue={selected?.deep_link ?? null} hint="jubileeworship://... 형식만 허용" />
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
        <section className="rounded-2xl border border-brand-sky/30 bg-brand-sky/5 p-5">
          <h2 className="text-xl font-bold">시험 기기로 푸시 확인</h2>
          <p className="mt-2 text-sm text-stone-300">
            등록된 시험 기기의 ID와 비밀값으로 `test-push` Edge Function을 호출합니다. 비밀값은 DB에 저장하거나 응답·로그에 표시하지 않습니다.
          </p>
          <AdminForm action={sendTestPushAction} submitLabel="시험 캠페인 큐 등록" className="mt-5 max-w-3xl">
            <FormSection title="시험 기기 인증" description="Edge Function이 미배포되었거나 서버 secret·DB 설정이 없으면 발송하지 않고 안전한 오류 안내만 표시합니다.">
              <TextField label="Installation ID" name="installation_id" required />
              <TextField label="Installation secret" name="installation_secret" type="password" required />
              <TextField label="제목" name="title" required defaultValue="주빌리워십 시험 알림" />
              <TextAreaField label="본문" name="body" required rows={4} defaultValue="시험 기기 알림을 확인해 주세요." />
              <TextField label="앱 딥링크(선택)" name="deep_link" hint="jubileeworship://... 형식만 허용" />
            </FormSection>
          </AdminForm>
          <p className="mt-4 text-xs text-stone-400">성공 202는 큐 등록을 의미합니다. 실제 Expo 발송은 `dispatch-notifications` worker와 외부 발송 설정이 따로 필요합니다.</p>
        </section>
      ) : null}
    </div>
  );
}
