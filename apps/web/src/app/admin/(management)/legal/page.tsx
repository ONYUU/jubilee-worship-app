import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireActiveAdmin } from "@/lib/auth/admin";
import {
  deleteLegalDocumentAction,
  publishLegalDocumentAction,
  saveLegalDocumentAction,
  withdrawLegalDocumentAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_LABELS: Record<string, string> = {
  privacy_policy: "개인정보처리방침",
  terms_of_service: "이용약관"
};

function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatSeoul(value: string | null): string {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function LegalDocumentsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  noStore();
  const [{ edit }, { supabase, admin }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const selectedId = /^\d+$/.test(edit ?? "") ? Number(edit) : null;
  const [documentsResult, selectedResult] = await Promise.all([
    supabase
      .from("legal_documents")
      .select("id,document_type,version,title,effective_on,status,published_at,withdrawn_at,created_at")
      .order("created_at", { ascending: false }),
    selectedId
      ? supabase
          .from("legal_documents")
          .select("id,document_type,version,title,body,effective_on,status")
          .eq("id", selectedId)
          .eq("status", "draft")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  const documents = documentsResult.data ?? [];
  const selected = selectedResult.data;
  const error = documentsResult.error ?? selectedResult.error;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Governance · Legal"
        title="법적 문서 관리"
        description="에디터는 초안만 작성·수정·삭제합니다. 오너가 효력일과 본문을 확인한 뒤 기존 공개본을 원자적으로 교체합니다."
        createHref="/admin/legal"
      />
      {error ? <AdminDataNotice message="법적 문서를 불러오지 못했습니다. DB migration과 관리자 정책을 확인해 주세요." /> : null}

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.95fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">버전 이력</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {documents.map((document) => (
              <li key={document.id} className="py-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold">{TYPE_LABELS[document.document_type] ?? document.document_type} · {document.version}</p>
                    <p className="mt-1 truncate text-sm text-stone-300">{document.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill status={document.status} />
                      <StatusPill status={`효력일 ${document.effective_on}`} />
                    </div>
                    <p className="mt-2 text-xs text-stone-400">공개 {formatSeoul(document.published_at)} · 철회 {formatSeoul(document.withdrawn_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {document.status === "draft" ? (
                      <>
                        <Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/legal?edit=${document.id}`}>본문 검토·수정</Link>
                        <DeleteButton action={deleteLegalDocumentAction} id={document.id} confirmMessage="이 법적 문서 초안을 삭제할까요?" />
                      </>
                    ) : null}
                    {admin.role === "owner" && document.status === "draft" && selected?.id === document.id ? (
                      <AdminActionButton action={publishLegalDocumentAction} id={document.id} label="공개본으로 승인" confirmMessage="현재 저장된 효력일과 전체 본문을 확인했습니까? 같은 종류의 기존 공개본이 자동 철회됩니다." />
                    ) : null}
                    {admin.role === "owner" && document.status === "published" ? (
                      <AdminActionButton action={withdrawLegalDocumentAction} id={document.id} label="공개 철회" tone="danger" confirmMessage="현재 공개된 이 법적 문서를 철회할까요?" />
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {documents.length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 법적 문서가 없습니다.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "법적 문서 초안 수정" : "새 법적 문서 초안"}</h2>
          <AdminForm action={saveLegalDocumentAction} submitLabel={selected ? "초안 저장" : "초안 만들기"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="문서 정보" description="효력일이 오늘보다 늦으면 오너가 아직 공개할 수 없습니다.">
              <SelectField
                label="문서 종류"
                name="document_type"
                defaultValue={selected?.document_type ?? "privacy_policy"}
                options={[
                  { value: "privacy_policy", label: "개인정보처리방침" },
                  { value: "terms_of_service", label: "이용약관" }
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="버전" name="version" required defaultValue={selected?.version} hint="예: 2026-08-15, v1.1" />
                <TextField label="효력일" name="effective_on" type="date" required defaultValue={selected?.effective_on ?? todayInSeoul()} />
              </div>
              <TextField label="제목" name="title" required defaultValue={selected?.title} />
              <TextAreaField label="본문" name="body" required defaultValue={selected?.body} rows={20} hint="공개 전 법무·개인정보 검토 완료 여부를 확인하세요." />
            </FormSection>
          </AdminForm>
          {admin.role === "owner" && selected ? <p className="mt-4 text-sm text-brand-sun">수정했다면 초안을 먼저 저장하세요. 저장된 전체 본문을 검토한 뒤 왼쪽의 선택된 문서에서 공개본으로 승인할 수 있습니다.</p> : null}
        </section>
      </div>
    </div>
  );
}
