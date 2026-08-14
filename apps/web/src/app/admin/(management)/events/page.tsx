import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminForm } from "@/components/admin/admin-form";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { CheckboxField, FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { deleteEventAction, saveEventAction } from "./actions";
import {
  deleteSermonRevisionAction,
  publishSermonRevisionAction,
  requestSermonReviewAction,
  returnSermonRevisionToDraftAction,
  saveSermonRevisionAction,
  withdrawSermonRevisionAction
} from "./sermon-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toSeoulInput(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function formatSeoul(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function EventsAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; sermon?: string }> }) {
  noStore();
  const [{ edit, sermon }, { supabase, admin }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const [eventResult, sermonResult] = await Promise.all([
    supabase
      .from("events")
      .select("id,slug,title,starts_at,ends_at,timezone,venue_name,address,description,status,registration_url,hero_media_path,source_url,featured,published")
      .order("starts_at", { ascending: false }),
    supabase
      .from("event_sermon_revisions")
      .select("id,event_id,revision_no,sermon_topic,scripture_reference,status,review_requested_at,published_at")
      .order("revision_no", { ascending: false })
  ]);
  const events = eventResult.data ?? [];
  const selected = (events ?? []).find((event) => String(event.id) === edit) ?? null;
  const sermonRevisions = selected
    ? (sermonResult.data ?? []).filter((revision) => revision.event_id === selected.id)
    : [];
  const selectedSermon = sermon === "new"
    ? null
    : sermonRevisions.find((revision) => String(revision.id) === sermon)
      ?? sermonRevisions.find((revision) => revision.status === "draft")
      ?? sermonRevisions[0]
      ?? null;
  const showSermonForm = sermon === "new" || sermonRevisions.length === 0 || selectedSermon?.status === "draft";

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Events" title="예배 일정 관리" description="일정과 앱 예배 화면의 설교 주제·말씀 구절을 함께 관리합니다. 취소된 예배는 삭제보다 ‘취소’ 상태를 사용하세요." createHref="/admin/events" />
      {eventResult.error || sermonResult.error ? <AdminDataNotice message="일정 또는 설교 개정본을 불러오지 못했습니다. DB migration과 관리자 읽기 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 일정</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(events ?? []).map((event) => (
              <li key={event.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm text-stone-300">{formatSeoul(event.starts_at)} · {event.venue_name}</p>
                  <div className="mt-2 flex gap-2"><StatusPill status={event.status} /><StatusPill published={event.published} /></div>
                </div>
                <div className="flex items-start gap-2">
                  <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/events?edit=${event.id}`}>수정</Link>
                  <DeleteButton action={deleteEventAction} id={event.id} confirmMessage="이 일정을 삭제할까요? 실제 취소된 예배라면 삭제 대신 ‘취소’ 상태를 사용하세요." />
                </div>
              </li>
            ))}
          </ul>
          {(events ?? []).length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 일정이 없습니다.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "일정 수정" : "새 일정"}</h2>
          <AdminForm action={saveEventAction} submitLabel={selected ? "변경 내용 저장" : "일정 등록"} className="mt-5">
            {selected ? <><input type="hidden" name="id" value={selected.id} /><input type="hidden" name="previous_slug" value={selected.slug} /></> : null}
            <FormSection title="기본 정보">
              <TextField label="Slug" name="slug" required defaultValue={selected?.slug} hint="영문 소문자·숫자·하이픈만 사용" />
              <TextField label="제목" name="title" required defaultValue={selected?.title ?? "쥬빌리워십 찬양집회"} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="시작(Asia/Seoul)" name="starts_at" type="datetime-local" required defaultValue={toSeoulInput(selected?.starts_at ?? null)} />
                <TextField label="종료(선택)" name="ends_at" type="datetime-local" defaultValue={toSeoulInput(selected?.ends_at ?? null)} />
              </div>
              <SelectField label="상태" name="status" defaultValue={selected?.status ?? "scheduled"} options={[{value:"scheduled",label:"예정"},{value:"postponed",label:"일정 변경"},{value:"cancelled",label:"취소"},{value:"completed",label:"예배 완료"}]} />
              <TextField label="장소" name="venue_name" required defaultValue={selected?.venue_name ?? "선두교회 본당"} />
              <TextField label="주소" name="address" required defaultValue={selected?.address ?? "인천광역시 서구 거북로109번길 10"} />
              <TextAreaField label="설명" name="description" defaultValue={selected?.description} />
            </FormSection>
            <FormSection title="연결·게시">
              <TextField label="공식 출처 URL" name="source_url" type="url" defaultValue={selected?.source_url} />
              <TextField label="신청 URL(선택)" name="registration_url" type="url" defaultValue={selected?.registration_url} hint="공식 신청이 실제로 있을 때만 입력" />
              <DirectImageUpload name="hero_media_path" label="대표 이미지" prefix="hero" initialPath={selected?.hero_media_path} />
              <CheckboxField label="추천 일정" name="featured" defaultChecked={selected?.featured} />
              <CheckboxField label="공개 게시" name="published" defaultChecked={selected?.published} hint="일정 재확인 후에만 게시" />
            </FormSection>
          </AdminForm>
        </section>
      </div>

      {selected ? (
        <section className="rounded-2xl border border-brand-sky/25 bg-night-900 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-sky">App · Sermon</p>
              <h2 className="mt-2 text-xl font-bold">설교 정보 · {selected.title}</h2>
              <p className="mt-2 text-sm text-stone-300">초안을 검수 요청한 뒤 오너가 공개합니다. 새 개정본이 공개될 때까지 기존 공개본은 유지됩니다.</p>
            </div>
            <Link className="min-h-11 rounded-lg border border-brand-sky/60 px-3 py-2 text-sm font-semibold" href={`/admin/events?edit=${selected.id}&sermon=new`}>새 개정본</Link>
          </div>

          <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
            <div>
              <h3 className="font-bold">개정 이력</h3>
              <ul className="mt-3 divide-y divide-white/10">
                {sermonRevisions.map((revision) => (
                  <li key={revision.id} className="py-3">
                    <Link className={`block rounded-xl px-3 py-3 ${selectedSermon?.id === revision.id ? "bg-white/10" : "hover:bg-white/5"}`} href={`/admin/events?edit=${selected.id}&sermon=${revision.id}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">개정 {revision.revision_no}</span>
                        <StatusPill status={revision.status} />
                      </div>
                      <p className="mt-2 truncate text-sm text-stone-300">{revision.sermon_topic ?? "주제 준비 중"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {sermonRevisions.length === 0 ? <p className="mt-3 text-sm text-stone-300">등록된 설교 정보가 없습니다.</p> : null}
            </div>

            <div>
              {showSermonForm ? (
                <>
                  <AdminForm action={saveSermonRevisionAction} submitLabel={selectedSermon?.status === "draft" && sermon !== "new" ? "설교 초안 저장" : "새 설교 개정본 만들기"}>
                    <input type="hidden" name="event_id" value={selected.id} />
                    {selectedSermon?.status === "draft" && sermon !== "new" ? <input type="hidden" name="id" value={selectedSermon.id} /> : null}
                    <FormSection title={selectedSermon?.status === "draft" && sermon !== "new" ? `설교 초안 · 개정 ${selectedSermon.revision_no}` : "새 설교 초안"}>
                      <TextField label="설교 주제" name="sermon_topic" defaultValue={selectedSermon?.status === "draft" && sermon !== "new" ? selectedSermon.sermon_topic : undefined} />
                      <TextField label="말씀 구절" name="scripture_reference" defaultValue={selectedSermon?.status === "draft" && sermon !== "new" ? selectedSermon.scripture_reference : undefined} hint="예: 시편 27:1-6 · 초안 저장은 한 항목만으로도 가능하지만 검수 요청 전에는 두 항목이 모두 필요합니다." />
                    </FormSection>
                  </AdminForm>
                  {selectedSermon?.status === "draft" && sermon !== "new" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <AdminActionButton action={requestSermonReviewAction} id={selectedSermon.id} label="검수 요청" confirmMessage="저장된 설교 정보를 오너 검수 단계로 보낼까요? 요청 후에는 직접 수정할 수 없습니다." />
                      <DeleteButton action={deleteSermonRevisionAction} id={selectedSermon.id} confirmMessage="이 설교 초안을 삭제할까요?" />
                    </div>
                  ) : null}
                </>
              ) : selectedSermon ? (
                <div className="rounded-2xl border border-white/10 bg-night-950 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">설교 개정 {selectedSermon.revision_no}</h3>
                    <StatusPill status={selectedSermon.status} />
                  </div>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div><dt className="text-stone-400">설교 주제</dt><dd className="mt-1 font-semibold">{selectedSermon.sermon_topic ?? "미입력"}</dd></div>
                    <div><dt className="text-stone-400">말씀 구절</dt><dd className="mt-1 font-semibold">{selectedSermon.scripture_reference ?? "미입력"}</dd></div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {selectedSermon.status === "review_requested" && admin.role === "owner" ? (
                      <>
                        <AdminActionButton action={publishSermonRevisionAction} id={selectedSermon.id} label="확인 후 공개" confirmMessage="현재 공개본을 교체하고 이 설교 개정본을 공개할까요?" />
                        <AdminActionButton action={returnSermonRevisionToDraftAction} id={selectedSermon.id} label="수정 요청" confirmMessage="이 설교 정보를 수정 가능한 초안으로 반려할까요?" />
                      </>
                    ) : null}
                    {selectedSermon.status === "published" && admin.role === "owner" ? <AdminActionButton action={withdrawSermonRevisionAction} id={selectedSermon.id} label="공개 철회" tone="danger" confirmMessage="이 설교 정보 공개를 철회할까요? 앱에는 준비 중 상태가 표시됩니다." /> : null}
                  </div>
                  {selectedSermon.status === "review_requested" && admin.role !== "owner" ? <p className="mt-4 text-sm text-stone-300">오너의 검수와 공개를 기다리고 있습니다.</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
