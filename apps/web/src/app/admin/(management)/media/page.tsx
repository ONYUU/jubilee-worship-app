import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, FormSection, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";
import { MediaSourceFields } from "@/components/admin/media-source-fields";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { deleteMediaAction, saveMediaAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MediaAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  noStore();
  const [{ edit }, { supabase }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const { data: items, error } = await supabase
    .from("media_items")
    .select("id,slug,title,kind,provider,provider_id,external_url,source_label,verification_status,thumbnail_path,thumbnail_alt,occurred_on,description,featured,sort_order,published")
    .eq("kind", "youtube_video")
    .eq("provider", "youtube")
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true });
  const selected = (items ?? []).find((item) => String(item.id) === edit) ?? null;

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Media" title="YouTube 영상 관리" description="승인된 공식 YouTube 영상과 사용 권한을 확인한 썸네일만 공개합니다. 미승인 영상은 자동으로 초안 저장됩니다." createHref="/admin/media" />
      {error ? <AdminDataNotice message="미디어 목록을 불러오지 못했습니다. Supabase 연결과 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 YouTube 영상</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 text-sm text-stone-300">{item.kind} · {item.source_label ?? "출처 미입력"}</p><div className="mt-2 flex flex-wrap gap-2"><StatusPill status={item.verification_status} /><StatusPill published={item.published} />{item.featured ? <StatusPill status="추천" /> : null}</div></div>
                <div className="flex gap-2"><Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/media?edit=${item.id}`}>수정</Link><DeleteButton action={deleteMediaAction} id={item.id} /></div>
              </li>
            ))}
          </ul>
          {(items ?? []).length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 미디어가 없습니다.</p> : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "YouTube 영상 수정" : "새 YouTube 영상"}</h2>
          <AdminForm action={saveMediaAction} submitLabel={selected ? "변경 내용 저장" : "YouTube 영상 등록"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="기본 정보">
              <TextField label="Slug" name="slug" required defaultValue={selected?.slug} />
              <TextField label="제목" name="title" required defaultValue={selected?.title} />
              <MediaSourceFields key={selected?.id ?? "new"} initialUrl={selected?.external_url} />
              <TextField label="출처 표시" name="source_label" defaultValue={selected?.source_label ?? "Jubilee Worship(쥬빌리 워십)"} />
              <div className="rounded-xl border border-white/10 bg-night-950 p-4 text-sm text-stone-300">
                <p className="font-semibold text-ivory-50">출처 검증</p>
                <p className="mt-2">
                  현재 상태: <strong className="text-brand-sky">{selected?.verification_status ?? "저장 시 DB 승인 목록으로 판정"}</strong>
                </p>
                <p className="mt-2">데이터베이스가 승인 목록을 기준으로 채널과 검증 상태를 설정하며, 승인된 영상만 공개할 수 있습니다.</p>
              </div>
            </FormSection>
            <FormSection title="표시 정보">
              <DirectImageUpload
                name="thumbnail_path"
                label="썸네일 이미지"
                prefix="gallery"
                initialPath={selected?.thumbnail_path}
                altName="thumbnail_alt"
                initialAlt={selected?.thumbnail_alt}
              />
              <TextField label="영상 공개·예배 날짜" name="occurred_on" type="date" defaultValue={selected?.occurred_on} hint="확인할 수 있는 날짜가 있을 때만 입력하며, 모르는 경우 비워 둡니다." />
              <TextAreaField label="설명" name="description" defaultValue={selected?.description} />
              <TextField label="정렬 순서" name="sort_order" type="number" min={0} max={100000} defaultValue={selected?.sort_order ?? 100} />
              <CheckboxField label="추천 콘텐츠" name="featured" defaultChecked={selected?.featured} />
              <CheckboxField label="공개 게시" name="published" defaultChecked={selected?.published} hint="승인된 영상 ID와 이미지 권리가 모두 확인된 경우만 공개됩니다. 미승인 ID는 초안으로 저장됩니다." />
            </FormSection>
          </AdminForm>
        </section>
      </div>
    </div>
  );
}
