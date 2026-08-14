import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  confirmGalleryConsentAction,
  deleteGalleryItemAction,
  publishGalleryItemAction,
  revokeGalleryConsentAction,
  saveGalleryItemAction,
  unpublishGalleryItemAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function storageObjectPath(locator: string, prefix: string): string | null {
  if (!locator.startsWith(prefix)) return null;
  const path = locator.slice(prefix.length);
  const segments = path.split("/");
  return segments.length > 0 && segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
    ? path
    : null;
}

export default async function AppGalleryAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  noStore();
  const [{ edit }, { supabase, admin }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const { data: items, error } = await supabase
    .from("gallery_items")
    .select("id,media_path,thumbnail_path,alt,caption,occurred_on,sort_order,published,published_at,consent_confirmed_at")
    .order("sort_order", { ascending: true })
    .order("occurred_on", { ascending: false, nullsFirst: false });
  const selected = (items ?? []).find((item) => String(item.id) === edit && !item.published) ?? null;
  const previewEntries = await Promise.all((items ?? []).map(async (item) => {
    const locator = item.media_path;
    const stagingPath = storageObjectPath(locator, "storage://gallery-staging/");
    if (stagingPath) {
      const { data, error: signedUrlError } = await supabase.storage
        .from("gallery-staging")
        .createSignedUrl(stagingPath, 600);
      return [item.id, signedUrlError ? null : data.signedUrl] as const;
    }

    const publicPath = storageObjectPath(locator, "storage://public-media/");
    if (publicPath) {
      const { data } = supabase.storage.from("public-media").getPublicUrl(publicPath);
      return [item.id, data.publicUrl] as const;
    }

    if (locator.startsWith("/") || locator.startsWith("https://")) return [item.id, locator] as const;
    return [item.id, null] as const;
  }));
  const previewUrls = new Map(previewEntries);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="App · Gallery"
        title="앱 갤러리 관리"
        description="앱 미디어 화면에 표시할 사진을 비공개 Storage에 초안으로 올립니다. 오너가 이용 권한·인물 공개 동의를 확인해야 공개 Storage로 이동하고 앱에 공개합니다."
        createHref="/admin/app-gallery"
      />
      {error ? <AdminDataNotice message="앱 갤러리를 불러오지 못했습니다. DB migration과 관리자 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 사진</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.alt}</p>
                  <p className="mt-1 text-sm text-stone-300">{item.occurred_on ?? "촬영일 미입력"} · 순서 {item.sort_order}</p>
                  {previewUrls.get(item.id) ? (
                    <a className="mt-2 inline-block text-sm text-brand-sky underline" href={previewUrls.get(item.id) ?? undefined} target="_blank" rel="noreferrer">사진 원본 확인</a>
                  ) : <p className="mt-2 text-xs text-stone-400">사진 미리보기 링크를 만들지 못했습니다.</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill published={item.published} />
                    <StatusPill status={item.consent_confirmed_at ? "공개 동의 확인" : "공개 동의 미확인"} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.published ? (
                    <>
                      <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/app-gallery?edit=${item.id}`}>수정</Link>
                      <DeleteButton action={deleteGalleryItemAction} id={item.id} confirmMessage="이 비공개 사진 초안을 삭제할까요?" />
                    </>
                  ) : null}
                  {admin.role === "owner" && !item.consent_confirmed_at && previewUrls.get(item.id) ? (
                    <AdminActionButton action={confirmGalleryConsentAction} id={item.id} label="동의 확인" confirmMessage="인물·저작물 공개 동의와 이용 권한을 오너가 확인했습니까?" />
                  ) : null}
                  {admin.role === "owner" && !item.consent_confirmed_at && !previewUrls.get(item.id) ? (
                    <span className="max-w-64 text-xs text-brand-sun">원본을 확인할 수 있어야 동의를 기록할 수 있습니다.</span>
                  ) : null}
                  {admin.role === "owner" && item.consent_confirmed_at ? (
                    <AdminActionButton action={revokeGalleryConsentAction} id={item.id} label="동의 확인 해제" tone="danger" confirmMessage="앱 노출을 먼저 끄고 관리 대상 공개 원본을 비공개 Storage로 회수할까요? 기존 URL·CDN 캐시는 일정 시간 남을 수 있습니다." />
                  ) : null}
                  {admin.role === "owner" && !item.published && item.consent_confirmed_at ? (
                    <AdminActionButton action={publishGalleryItemAction} id={item.id} label="앱에 공개" confirmMessage="비공개 파일을 공개 Storage로 옮긴 뒤 최종 경로 기준으로 동의를 다시 확인하고 앱 갤러리에 공개할까요?" />
                  ) : null}
                  {admin.role === "owner" && item.published ? (
                    <AdminActionButton action={unpublishGalleryItemAction} id={item.id} label="비공개 전환" tone="danger" confirmMessage="이 사진을 앱에서 비공개로 전환할까요?" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {(items ?? []).length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 앱 갤러리 사진이 없습니다.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "앱 갤러리 사진 수정" : "새 앱 갤러리 사진"}</h2>
          <AdminForm action={saveGalleryItemAction} submitLabel={selected ? "사진 정보 저장" : "앱 갤러리에 등록"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="사진">
              <DirectImageUpload
                name="media_path"
                label="앱 갤러리 이미지"
                prefix="gallery"
                bucket="gallery-staging"
                initialPath={selected?.media_path}
                altName="alt"
                initialAlt={selected?.alt}
              />
              <TextField label="썸네일 경로(선택)" name="thumbnail_path" defaultValue={selected?.thumbnail_path} hint="별도 최적화 썸네일이 있을 때만 storage:// 경로를 입력합니다." />
            </FormSection>
            <FormSection title="표시 정보">
              <TextAreaField label="설명(선택)" name="caption" defaultValue={selected?.caption} rows={4} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="촬영일(선택)" name="occurred_on" type="date" defaultValue={selected?.occurred_on} />
                <TextField label="정렬 순서" name="sort_order" type="number" min={0} max={100000} required defaultValue={selected?.sort_order ?? 100} />
              </div>
            </FormSection>
          </AdminForm>
          <p className="mt-4 text-sm text-stone-300">저장하면 비공개 초안으로 유지됩니다. 오너가 공개 동의를 확인한 뒤 목록에서 공개합니다.</p>
        </section>
      </div>
    </div>
  );
}
