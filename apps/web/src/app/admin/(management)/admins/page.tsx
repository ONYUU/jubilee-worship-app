import { unstable_noStore as noStore } from "next/cache";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection, TextField } from "@/components/admin/admin-fields";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { requireOwner } from "@/lib/auth/admin";
import {
  createSupabaseAdminClient,
  listAdminAuthUserSummaries
} from "@/lib/supabase/admin";
import {
  activateAdminAction,
  deactivateAdminAction,
  demoteAdminAction,
  inviteAdminAction,
  promoteAdminAction,
  resendAdminInviteAction,
  retryAdminBanAction
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatSeoul(value: string | null): string {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function isBanned(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now();
}

export default async function AdminUsersPage() {
  noStore();
  const { supabase, admin } = await requireOwner();
  const authAdmin = createSupabaseAdminClient();
  const [membershipResult, authResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,role,is_active,approved_by,approved_at,created_at,updated_at")
      .order("created_at", { ascending: true }),
    authAdmin
      ? listAdminAuthUserSummaries(authAdmin)
      : Promise.resolve({ data: null, error: true })
  ]);
  const memberships = membershipResult.data ?? [];
  const authById = new Map((authResult.data ?? []).map((user) => [user.id, user]));
  const activeOwnerCount = memberships.filter((item) => item.is_active && item.role === "owner").length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Owner · Access"
        title="관리자 승인 및 권한"
        description="오너가 이메일로 초대한 계정만 관리자 웹을 사용할 수 있습니다. 신규 승인 계정은 항상 에디터로 시작합니다."
      />

      {membershipResult.error ? (
        <AdminDataNotice message="관리자 목록을 불러오지 못했습니다. 관리자 승인 migration과 오너 RLS 정책을 확인해 주세요." />
      ) : null}
      {!authAdmin || authResult.error ? (
        <AdminDataNotice message="Auth 사용자 정보와 이메일 초대 기능을 사용할 수 없습니다. 서버 전용 SUPABASE_SECRET_KEY 설정을 확인해 주세요." />
      ) : null}

      <section className="rounded-2xl border border-brand-sky/30 bg-brand-sky/5 p-5">
        <h2 className="text-xl font-bold">새 관리자 초대</h2>
        <p className="mt-2 text-sm text-stone-300">
          이메일 전송 후 즉시 에디터 관리자 명단에 승인 등록됩니다. 초대받은 사람은 이메일 링크에서 비밀번호를 설정해야 합니다.
        </p>
        {authAdmin ? (
          <AdminForm action={inviteAdminAction} submitLabel="에디터로 승인하고 초대" className="mt-5 max-w-xl">
            <FormSection title="초대 이메일">
              <TextField label="이메일 주소" name="email" type="email" required />
            </FormSection>
          </AdminForm>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold">등록 관리자</h2>
            <p className="mt-2 text-sm text-stone-300">
              마지막 활성 오너와 현재 로그인한 본인 계정은 비활성화할 수 없습니다.
            </p>
          </div>
          <p className="text-sm text-stone-300">총 {memberships.length}명 · 활성 오너 {activeOwnerCount}명</p>
        </div>

        <ul className="mt-5 space-y-4">
          {memberships.map((membership) => {
            const authUser = authById.get(membership.user_id) ?? null;
            const self = membership.user_id === admin.userId;
            const lastActiveOwner = membership.is_active && membership.role === "owner" && activeOwnerCount === 1;
            const banned = isBanned(authUser?.bannedUntil ?? null);
            const accepted = Boolean(authUser?.emailConfirmedAt);

            return (
              <li key={membership.user_id} className="rounded-2xl border border-white/10 bg-night-950 p-5">
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all font-bold">{authUser?.email ?? "Auth 이메일 확인 필요"}</p>
                      <StatusPill status={membership.role === "owner" ? "오너" : "에디터"} />
                      <StatusPill status={membership.is_active ? "활성" : "비활성"} />
                      <StatusPill status={accepted ? "가입 완료" : "초대 대기"} />
                      {banned ? <StatusPill status="Auth 차단" /> : null}
                      {self ? <StatusPill status="현재 계정" /> : null}
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs text-stone-300 sm:grid-cols-2 lg:grid-cols-3">
                      <div><dt className="text-stone-500">승인 시각</dt><dd className="mt-1">{formatSeoul(membership.approved_at)}</dd></div>
                      <div><dt className="text-stone-500">초대 발송</dt><dd className="mt-1">{formatSeoul(authUser?.confirmationSentAt ?? authUser?.invitedAt ?? null)}</dd></div>
                      <div><dt className="text-stone-500">최근 로그인</dt><dd className="mt-1">{formatSeoul(authUser?.lastSignInAt ?? null)}</dd></div>
                    </dl>
                    <p className="mt-3 break-all text-[11px] text-stone-500">사용자 ID {membership.user_id}</p>
                    {lastActiveOwner ? <p className="mt-3 text-sm text-brand-sun">마지막 활성 오너 보호 대상입니다.</p> : null}
                  </div>

                  <div className="flex max-w-xl flex-wrap gap-3">
                    {membership.is_active && !accepted && authUser?.email ? (
                      <AdminActionButton action={resendAdminInviteAction} id={membership.user_id} label="초대 재발송" confirmMessage="새 초대 이메일을 보낼까요? 기존 링크가 만료됐다면 새 링크를 사용해야 합니다." />
                    ) : null}
                    {membership.is_active && membership.role === "editor" ? (
                      <AdminActionButton action={promoteAdminAction} id={membership.user_id} label="오너로 변경" confirmMessage="이 관리자에게 다른 관리자 승인·권한 변경 권한을 부여할까요?" />
                    ) : null}
                    {membership.is_active && membership.role === "owner" && !lastActiveOwner ? (
                      <AdminActionButton action={demoteAdminAction} id={membership.user_id} label="에디터로 변경" confirmMessage="이 관리자의 오너 권한을 제거하고 에디터로 변경할까요?" />
                    ) : null}
                    {membership.is_active && !self && !lastActiveOwner ? (
                      <AdminActionButton action={deactivateAdminAction} id={membership.user_id} label="접근 비활성화" tone="danger" confirmMessage="이 관리자의 DB 접근을 즉시 중지하고 Auth 계정을 차단할까요?" />
                    ) : null}
                    {!membership.is_active && !banned ? (
                      <AdminActionButton action={retryAdminBanAction} id={membership.user_id} label="인증 차단 재시도" tone="danger" confirmMessage="비활성 관리자의 Supabase Auth 로그인을 다시 차단할까요?" />
                    ) : null}
                    {!membership.is_active ? (
                      <AdminActionButton action={activateAdminAction} id={membership.user_id} label="다시 활성화" confirmMessage="Auth 차단을 해제하고 이 관리자의 웹 접근을 다시 허용할까요?" />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {memberships.length === 0 ? <p className="mt-5 text-sm text-stone-300">등록된 관리자 계정이 없습니다.</p> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-night-900 p-5 text-sm text-stone-300">
        <h2 className="font-bold text-ivory-50">초대 이메일 운영 확인</h2>
        <p className="mt-2">
          초대 링크가 만료되면 이 화면에서 재발송하세요. 운영 전 Supabase의 허용 Redirect URL, Invite user 이메일 템플릿과 SMTP 설정을 확인해야 합니다.
        </p>
      </section>
    </div>
  );
}
