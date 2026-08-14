import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { deleteAnnouncementAction, saveAnnouncementAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toSeoulInput(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default async function AnnouncementsAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  noStore();
  const [{ edit }, { supabase }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const [announcementResult, eventResult] = await Promise.all([
    supabase
      .from("announcements")
      .select("id,slug,event_id,kind,title,body,starts_at,expires_at,pinned,published")
      .order("starts_at", { ascending: false, nullsFirst: true }),
    supabase.from("events").select("id,title,starts_at").order("starts_at", { ascending: false }).limit(100)
  ]);
  const announcements = announcementResult.data ?? [];
  const selected = announcements.find((item) => String(item.id) === edit) ?? null;

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Announcements" title="공지 관리" description="일정 변경·취소는 관련 예배와 연결하고, 노출 시작·만료 시간을 Asia/Seoul 기준으로 설정합니다." createHref="/admin/announcements" />
      {announcementResult.error || eventResult.error ? <AdminDataNotice message="일부 데이터를 불러오지 못했습니다. Supabase 연결과 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 공지</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {announcements.map((item) => (
              <li key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0"><p className="truncate font-semibold">{item.title}</p><div className="mt-2 flex gap-2"><StatusPill status={item.kind} /><StatusPill published={item.published} />{item.pinned ? <StatusPill status="상단 고정" /> : null}</div></div>
                <div className="flex gap-2"><Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/announcements?edit=${item.id}`}>수정</Link><DeleteButton action={deleteAnnouncementAction} id={item.id} /></div>
              </li>
            ))}
          </ul>
          {announcements.length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 공지가 없습니다.</p> : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "공지 수정" : "새 공지"}</h2>
          <AdminForm action={saveAnnouncementAction} submitLabel={selected ? "변경 내용 저장" : "공지 등록"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="공지 내용">
              <TextField label="Slug" name="slug" required defaultValue={selected?.slug} hint="영문 소문자·숫자·하이픈만 사용" />
              <SelectField label="유형" name="kind" defaultValue={selected?.kind ?? "normal"} options={[{value:"normal",label:"일반"},{value:"important",label:"중요"},{value:"schedule_change",label:"일정 변경"},{value:"cancellation",label:"취소"}]} />
              <SelectField
                label="연결 예배"
                name="event_id"
                defaultValue={selected?.event_id ? String(selected.event_id) : ""}
                options={[
                  { value: "", label: "연결 안 함" },
                  ...(eventResult.data ?? []).map((event) => ({
                    value: String(event.id),
                    label: `${event.title} · ${new Date(event.starts_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`
                  }))
                ]}
              />
              <TextField label="제목" name="title" required defaultValue={selected?.title} />
              <TextAreaField label="본문" name="body" required defaultValue={selected?.body} rows={7} />
            </FormSection>
            <FormSection title="노출 설정">
              <div className="grid gap-4 sm:grid-cols-2"><TextField label="노출 시작(선택)" name="starts_at" type="datetime-local" defaultValue={toSeoulInput(selected?.starts_at ?? null)} /><TextField label="만료(선택)" name="expires_at" type="datetime-local" defaultValue={toSeoulInput(selected?.expires_at ?? null)} /></div>
              <CheckboxField label="상단 고정" name="pinned" defaultChecked={selected?.pinned} />
              <CheckboxField label="공개 게시" name="published" defaultChecked={selected?.published} />
            </FormSection>
          </AdminForm>
        </section>
      </div>
    </div>
  );
}
