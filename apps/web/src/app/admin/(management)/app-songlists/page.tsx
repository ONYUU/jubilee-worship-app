import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  deleteSetlistItemAction,
  deleteSetlistRevisionAction,
  publishSetlistRevisionAction,
  requestSetlistReviewAction,
  returnSetlistRevisionToDraftAction,
  saveSetlistItemAction,
  saveSetlistRevisionAction,
  verifySetlistItemYoutubeAction,
  verifySetlistPlaylistAction,
  withdrawSetlistRevisionAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatSeoul(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AppSonglistsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ event?: string; revision?: string; song?: string }>;
}) {
  noStore();
  const [{ event: eventParam, revision: revisionParam, song: songParam }, { supabase, admin }] = await Promise.all([
    searchParams,
    requireActiveAdmin()
  ]);
  const [eventResult, setlistResult] = await Promise.all([
    supabase
      .from("events")
      .select("id,slug,title,starts_at,status,published")
      .order("starts_at", { ascending: false })
      .limit(100),
    supabase
      .from("event_setlists")
      .select("id,event_id,revision_no,publication_no,playlist_url,playlist_verified_at,status,review_requested_at,reviewed_at,published_at,withdrawn_at,created_at,updated_at")
      .order("revision_no", { ascending: false })
  ]);
  const events = eventResult.data ?? [];
  const setlists = setlistResult.data ?? [];
  const selectedEvent = events.find((event) => String(event.id) === eventParam) ?? events[0] ?? null;
  const eventRevisions = selectedEvent
    ? setlists.filter((setlist) => setlist.event_id === selectedEvent.id)
    : [];
  const isNewRevision = revisionParam === "new" || eventRevisions.length === 0;
  const selectedSetlist = isNewRevision
    ? null
    : eventRevisions.find((setlist) => String(setlist.id) === revisionParam)
      ?? eventRevisions.find((setlist) => setlist.status === "draft")
      ?? eventRevisions.find((setlist) => setlist.status === "review_requested")
      ?? eventRevisions.find((setlist) => setlist.status === "published")
      ?? eventRevisions[0]
      ?? null;
  const itemResult = selectedSetlist
    ? await supabase
        .from("setlist_items")
        .select("id,setlist_id,position,title,artist,musical_key,youtube_url,youtube_verified_at")
        .eq("setlist_id", selectedSetlist.id)
        .order("position", { ascending: true })
    : { data: [], error: null };
  const items = itemResult.data ?? [];
  const selectedSong = selectedSetlist?.status === "draft"
    ? items.find((item) => String(item.id) === songParam) ?? null
    : null;
  const hasWorkingRevision = eventRevisions.some((revision) => ["draft", "review_requested"].includes(revision.status));
  const latestPublished = eventRevisions.find((revision) => revision.status === "published") ?? null;
  const allLinksVerified = selectedSetlist
    ? items.length > 0
      && !itemResult.error
      && (!selectedSetlist.playlist_url || Boolean(selectedSetlist.playlist_verified_at))
      && items.every((item) => !item.youtube_url || Boolean(item.youtube_verified_at))
    : false;
  const hasError = Boolean(eventResult.error || setlistResult.error || itemResult.error);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="App · Songlist"
        title="앱 송리스트 관리"
        description="초안에 곡 순서·곡명·아티스트·KEY를 등록하고 검수를 요청합니다. 오너가 공개하기 전까지 앱에는 기존 공개본이 유지됩니다."
      />
      {hasError ? <AdminDataNotice message="송리스트 데이터를 불러오지 못했습니다. DB migration과 관리자 정책을 확인해 주세요." /> : null}

      <div className="grid gap-7 xl:grid-cols-[minmax(300px,0.65fr)_minmax(0,1.35fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">예배 선택</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {events.map((event) => {
              const revisions = setlists.filter((item) => item.event_id === event.id);
              const published = revisions.some((item) => item.status === "published");
              const working = revisions.find((item) => ["draft", "review_requested"].includes(item.status));
              return (
                <li key={event.id} className="py-3">
                  <Link
                    href={`/admin/app-songlists?event=${event.id}`}
                    className={`block rounded-xl px-3 py-3 ${selectedEvent?.id === event.id ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-stone-300">{formatSeoul(event.starts_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill published={event.published} />
                      <StatusPill status={published ? "공개본 있음" : "공개본 없음"} />
                      {working ? <StatusPill status={working.status === "draft" ? "초안 작성 중" : "검수 요청됨"} /> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {events.length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 예배 일정이 없습니다.</p> : null}
        </section>

        {selectedEvent ? (
          <div className="space-y-7">
            <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-sky">선택 예배</p>
                  <h2 className="mt-2 text-xl font-bold">{selectedEvent.title}</h2>
                  <p className="mt-1 text-sm text-stone-300">{formatSeoul(selectedEvent.starts_at)}</p>
                </div>
                {!hasWorkingRevision && !isNewRevision ? (
                  <Link className="min-h-11 rounded-lg border border-brand-sky/60 px-3 py-2 text-sm font-semibold" href={`/admin/app-songlists?event=${selectedEvent.id}&revision=new`}>새 개정본</Link>
                ) : null}
              </div>

              <div className="mt-6">
                <h3 className="font-bold">개정 이력</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {eventRevisions.map((revision) => (
                    <Link
                      key={revision.id}
                      href={`/admin/app-songlists?event=${selectedEvent.id}&revision=${revision.id}`}
                      className={`rounded-xl border px-3 py-2 text-sm ${selectedSetlist?.id === revision.id ? "border-brand-sky bg-brand-sky/10" : "border-white/15 hover:bg-white/5"}`}
                    >
                      개정 {revision.revision_no}{revision.publication_no ? ` · 공개 ${revision.publication_no}차` : ""} · {revision.status}
                    </Link>
                  ))}
                  {eventRevisions.length === 0 ? <span className="text-sm text-stone-300">등록된 개정본이 없습니다.</span> : null}
                </div>
              </div>
            </section>

            {isNewRevision ? (
              <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
                <h2 className="text-xl font-bold">새 송리스트 개정본</h2>
                <AdminForm action={saveSetlistRevisionAction} submitLabel="송리스트 초안 만들기" className="mt-5">
                  <input type="hidden" name="event_id" value={selectedEvent.id} />
                  <FormSection title="초안 기본 정보" description="목록은 공개되지 않습니다. 초안을 만든 뒤 곡을 등록하세요.">
                    <TextField label="YouTube 전체 듣기 URL(선택)" name="playlist_url" type="url" defaultValue={latestPublished?.playlist_url} />
                  </FormSection>
                </AdminForm>
              </section>
            ) : selectedSetlist ? (
              <>
                <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">송리스트 개정 {selectedSetlist.revision_no}</h2>
                    <StatusPill status={selectedSetlist.status} />
                  </div>
                  {selectedSetlist.status === "draft" ? (
                    <>
                      <AdminForm action={saveSetlistRevisionAction} submitLabel="송리스트 초안 저장" className="mt-5">
                        <input type="hidden" name="id" value={selectedSetlist.id} />
                        <input type="hidden" name="event_id" value={selectedEvent.id} />
                        <FormSection title="초안 설정">
                          <TextField label="YouTube 전체 듣기 URL(선택)" name="playlist_url" type="url" defaultValue={selectedSetlist.playlist_url} />
                        </FormSection>
                      </AdminForm>
                      {selectedSetlist.playlist_url ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-night-950 p-4 text-sm">
                          <a className="break-all text-brand-sky underline" href={selectedSetlist.playlist_url} target="_blank" rel="noreferrer">전체 듣기 YouTube 링크 열기</a>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <StatusPill status={selectedSetlist.playlist_verified_at ? "오너 검증 완료" : "오너 검증 필요"} />
                            {admin.role === "owner" && !selectedSetlist.playlist_verified_at ? (
                              <AdminActionButton action={verifySetlistPlaylistAction} id={selectedSetlist.id} label="공식 링크 검증" confirmMessage="이 YouTube 전체 듣기 링크가 쥬빌리워십이 확인한 공식 링크입니까?" />
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <AdminActionButton action={requestSetlistReviewAction} id={selectedSetlist.id} label="검수 요청" confirmMessage="저장된 송리스트를 오너 검수 단계로 보낼까요? 곡이 한 개 이상 필요하며 요청 후에는 직접 수정할 수 없습니다." />
                        <DeleteButton action={deleteSetlistRevisionAction} id={selectedSetlist.id} confirmMessage="이 송리스트 초안과 모든 곡을 삭제할까요?" />
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 rounded-xl border border-white/10 bg-night-950 p-4 text-sm">
                      <p className="text-stone-400">전체 듣기 URL</p>
                      {selectedSetlist.playlist_url ? (
                        <a className="mt-1 block break-all font-semibold text-brand-sky underline" href={selectedSetlist.playlist_url} target="_blank" rel="noreferrer">{selectedSetlist.playlist_url}</a>
                      ) : <p className="mt-1 font-semibold">미등록</p>}
                      {selectedSetlist.playlist_url ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <StatusPill status={selectedSetlist.playlist_verified_at ? "오너 검증 완료" : "오너 검증 필요"} />
                          {selectedSetlist.status === "review_requested" && admin.role === "owner" && !selectedSetlist.playlist_verified_at ? (
                            <AdminActionButton action={verifySetlistPlaylistAction} id={selectedSetlist.id} label="공식 링크 검증" confirmMessage="이 YouTube 전체 듣기 링크가 쥬빌리워십이 확인한 공식 링크입니까?" />
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {selectedSetlist.status === "review_requested" && admin.role === "owner" && allLinksVerified ? (
                          <>
                            <AdminActionButton action={publishSetlistRevisionAction} id={selectedSetlist.id} label="확인 후 공개" confirmMessage="현재 공개본을 교체하고 이 송리스트 개정본을 공개할까요?" />
                            <AdminActionButton action={returnSetlistRevisionToDraftAction} id={selectedSetlist.id} label="수정 요청" confirmMessage="이 송리스트를 수정 가능한 초안으로 반려할까요?" />
                          </>
                        ) : null}
                        {selectedSetlist.status === "review_requested" && admin.role === "owner" && !allLinksVerified ? (
                          <AdminActionButton action={returnSetlistRevisionToDraftAction} id={selectedSetlist.id} label="수정 요청" confirmMessage="이 송리스트를 수정 가능한 초안으로 반려할까요?" />
                        ) : null}
                        {selectedSetlist.status === "published" && admin.role === "owner" ? <AdminActionButton action={withdrawSetlistRevisionAction} id={selectedSetlist.id} label="공개 철회" tone="danger" confirmMessage="이 송리스트 공개를 철회할까요? 앱에는 준비 중 상태가 표시됩니다." /> : null}
                      </div>
                      {selectedSetlist.status === "review_requested" && admin.role === "owner" && !allLinksVerified ? <p className="mt-4 text-brand-sun">YouTube 링크를 모두 열어 공식 링크로 검증해야 공개할 수 있습니다.</p> : null}
                      {selectedSetlist.status === "review_requested" && admin.role !== "owner" ? <p className="mt-4 text-stone-300">오너의 검수와 공개를 기다리고 있습니다.</p> : null}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold">등록 곡</h2>
                    {selectedSetlist.status === "draft" ? <Link className="min-h-11 rounded-lg border border-brand-sky/60 px-3 py-2 text-sm font-semibold" href={`/admin/app-songlists?event=${selectedEvent.id}&revision=${selectedSetlist.id}`}>새 곡</Link> : null}
                  </div>
                  <ol className="mt-4 divide-y divide-white/10">
                    {items.map((item) => (
                      <li key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="font-semibold"><span className="mr-2 text-brand-sky">{item.position}</span>{item.title}</p>
                          <p className="mt-1 text-sm text-stone-300">{item.artist ?? "아티스트 미입력"}{item.musical_key ? ` · KEY ${item.musical_key}` : ""}</p>
                          {item.youtube_url ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <a className="break-all text-sm text-brand-sky underline" href={item.youtube_url} target="_blank" rel="noreferrer">YouTube 링크 열기</a>
                              <StatusPill status={item.youtube_verified_at ? "오너 검증 완료" : "오너 검증 필요"} />
                            </div>
                          ) : null}
                        </div>
                        {["draft", "review_requested"].includes(selectedSetlist.status) ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedSetlist.status === "draft" ? (
                              <>
                            <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/app-songlists?event=${selectedEvent.id}&revision=${selectedSetlist.id}&song=${item.id}`}>수정</Link>
                            <DeleteButton action={deleteSetlistItemAction} id={item.id} confirmMessage="이 곡을 송리스트 초안에서 삭제할까요?" />
                              </>
                            ) : null}
                            {admin.role === "owner" && item.youtube_url && !item.youtube_verified_at ? (
                              <AdminActionButton action={verifySetlistItemYoutubeAction} id={item.id} label="공식 링크 검증" confirmMessage="이 곡의 YouTube 링크가 쥬빌리워십이 확인한 공식 링크입니까?" />
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  {items.length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 곡이 없습니다.</p> : null}

                  {selectedSetlist.status === "draft" ? (
                    <AdminForm action={saveSetlistItemAction} submitLabel={selectedSong ? "곡 정보 저장" : "곡 추가"} className="mt-7 border-t border-white/10 pt-7">
                      <input type="hidden" name="setlist_id" value={selectedSetlist.id} />
                      {selectedSong ? <input type="hidden" name="id" value={selectedSong.id} /> : null}
                      <FormSection title={selectedSong ? "곡 수정" : "새 곡"}>
                        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                          <TextField label="순서" name="position" type="number" min={1} max={100} required defaultValue={selectedSong?.position ?? Math.min(items.length + 1, 100)} />
                          <TextField label="곡명" name="title" required defaultValue={selectedSong?.title} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField label="아티스트(선택)" name="artist" defaultValue={selectedSong?.artist} />
                          <TextField label="KEY(선택)" name="musical_key" defaultValue={selectedSong?.musical_key} hint="예: C, F#m" />
                        </div>
                        <TextField label="YouTube 듣기 URL(선택)" name="youtube_url" type="url" defaultValue={selectedSong?.youtube_url} />
                      </FormSection>
                    </AdminForm>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
