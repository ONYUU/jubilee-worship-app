import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  deleteGuideSectionAction,
  publishGuideSectionAction,
  saveGuideSectionAction,
  unpublishGuideSectionAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KIND_LABELS: Record<string, string> = {
  first_visit: "첫 방문",
  parking: "주차",
  transit: "대중교통"
};

export default async function AppGuideAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  noStore();
  const [{ edit }, { supabase, admin }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const { data: sections, error } = await supabase
    .from("guide_sections")
    .select("id,slug,title,body,kind,sort_order,published,published_at")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const selected = (sections ?? []).find((section) => String(section.id) === edit && !section.published) ?? null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="App · Guide"
        title="앱 안내 관리"
        description="앱 안내 화면의 첫 방문·주차·대중교통 내용을 관리합니다. 확인된 운영 정보만 공개하세요."
        createHref="/admin/app-guide"
      />
      {error ? <AdminDataNotice message="앱 안내를 불러오지 못했습니다. DB migration과 관리자 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 안내</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(sections ?? []).map((section) => (
              <li key={section.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{section.title}</p>
                  <p className="mt-1 text-sm text-stone-300">{KIND_LABELS[section.kind] ?? section.kind} · 순서 {section.sort_order}</p>
                  <div className="mt-2 flex gap-2"><StatusPill published={section.published} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!section.published ? (
                    <>
                      <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/app-guide?edit=${section.id}`}>내용 검토·수정</Link>
                      <DeleteButton action={deleteGuideSectionAction} id={section.id} confirmMessage="이 비공개 안내 초안을 삭제할까요?" />
                    </>
                  ) : null}
                  {admin.role === "owner" && !section.published && selected?.id === section.id ? (
                    <AdminActionButton action={publishGuideSectionAction} id={section.id} label="앱에 공개" confirmMessage="현재 저장된 안내 제목과 전체 본문을 확인하고 앱에 공개할까요?" />
                  ) : null}
                  {admin.role === "owner" && section.published ? (
                    <AdminActionButton action={unpublishGuideSectionAction} id={section.id} label="비공개 전환" tone="danger" confirmMessage="이 안내를 앱에서 비공개로 전환할까요?" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {(sections ?? []).length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 앱 안내가 없습니다.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "앱 안내 수정" : "새 앱 안내"}</h2>
          <AdminForm action={saveGuideSectionAction} submitLabel={selected ? "안내 내용 저장" : "앱 안내 등록"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="안내 내용">
              <TextField label="Slug" name="slug" required defaultValue={selected?.slug} hint="영문 소문자·숫자·하이픈만 사용" />
              <SelectField
                label="종류"
                name="kind"
                defaultValue={selected?.kind ?? "first_visit"}
                options={[
                  { value: "first_visit", label: "첫 방문" },
                  { value: "parking", label: "주차" },
                  { value: "transit", label: "대중교통" }
                ]}
              />
              <TextField label="제목" name="title" required defaultValue={selected?.title} />
              <TextAreaField label="본문" name="body" required defaultValue={selected?.body} rows={8} />
            </FormSection>
            <FormSection title="노출 설정">
              <TextField label="정렬 순서" name="sort_order" type="number" min={0} max={100000} required defaultValue={selected?.sort_order ?? 100} />
            </FormSection>
          </AdminForm>
          <p className="mt-4 text-sm text-stone-300">저장하면 비공개 초안으로 유지됩니다. 오너는 전체 내용을 연 뒤 선택된 항목만 공개할 수 있습니다.</p>
          {admin.role === "owner" && selected ? <p className="mt-2 text-sm text-brand-sun">수정했다면 먼저 저장한 뒤, 왼쪽의 선택된 안내에서 공개하세요.</p> : null}
        </section>
      </div>
    </div>
  );
}
