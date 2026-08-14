import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { DeleteButton } from "@/components/admin/delete-button";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { deleteTeamMemberAction, saveTeamMemberAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  noStore();
  const [{ edit }, { supabase }] = await Promise.all([searchParams, requireActiveAdmin()]);
  const { data: members, error } = await supabase
    .from("team_members")
    .select("id,name,role_title,category,photo_path,photo_alt,bio,sort_order,published")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  const selected = (members ?? []).find((item) => String(item.id) === edit) ?? null;

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Team" title="섬기는 이 관리" description="초기에는 공식 페이지에 공개된 교역자만 등록합니다. 팀원·미성년자의 이름과 사진은 명시적 동의 없이 공개하지 않습니다." createHref="/admin/team" />
      {error ? <AdminDataNotice message="목록을 불러오지 못했습니다. Supabase 연결과 정책을 확인해 주세요." /> : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">등록 인원</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(members ?? []).map((member) => (
              <li key={member.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div><p className="font-semibold">{member.name} {member.role_title}</p><div className="mt-2 flex gap-2"><StatusPill status={member.category} /><StatusPill published={member.published} /></div></div>
                <div className="flex gap-2"><Link className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold" href={`/admin/team?edit=${member.id}`}>수정</Link><DeleteButton action={deleteTeamMemberAction} id={member.id} /></div>
              </li>
            ))}
          </ul>
          {(members ?? []).length === 0 ? <p className="mt-4 text-sm text-stone-300">등록된 인원이 없습니다.</p> : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-xl font-bold">{selected ? "정보 수정" : "새로 등록"}</h2>
          <AdminForm action={saveTeamMemberAction} submitLabel={selected ? "변경 내용 저장" : "등록"} className="mt-5">
            {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
            <FormSection title="기본 정보">
              <div className="grid gap-4 sm:grid-cols-2"><TextField label="이름" name="name" required defaultValue={selected?.name} /><TextField label="직함" name="role_title" required defaultValue={selected?.role_title} /></div>
              <SelectField label="분류" name="category" defaultValue={selected?.category ?? "minister"} options={[{value:"minister",label:"교역자"},{value:"worship_leader",label:"예배 인도"},{value:"vocal",label:"보컬"},{value:"session",label:"세션"},{value:"staff",label:"스태프"}]} />
              <TextAreaField label="약력(선택)" name="bio" defaultValue={selected?.bio} hint="확인된 정보만 입력" />
              <TextField label="표시 순서" name="sort_order" type="number" min={0} max={100000} defaultValue={selected?.sort_order ?? 100} />
            </FormSection>
            <FormSection title="사진·공개">
              <DirectImageUpload
                name="photo_path"
                label="프로필 사진"
                prefix="team"
                initialPath={selected?.photo_path}
                altName="photo_alt"
                initialAlt={selected?.photo_alt}
              />
              <CheckboxField label="프로필 공개 동의 확인" name="publication_consent" hint="이름·직함·약력·사진과 미성년자 관련 교회 내부 기준을 포함해 확인" />
              <CheckboxField label="공개 게시" name="published" defaultChecked={selected?.published} />
            </FormSection>
          </AdminForm>
        </section>
      </div>
    </div>
  );
}
