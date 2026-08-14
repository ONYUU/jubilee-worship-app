import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/auth/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const reasonMessages: Record<string, string> = {
  configuration: "Supabase 연결 설정이 필요합니다.",
  session: "로그인 세션이 없거나 만료되었습니다.",
  access: "이 계정에는 활성 관리자 접근 권한이 없습니다.",
  invite_invalid: "초대 링크 형식이 올바르지 않습니다. 오너에게 재발송을 요청해 주세요.",
  invite_expired: "초대 링크가 잘못되었거나 만료됐습니다. 오너에게 초대 재발송을 요청해 주세요.",
  password_set: "비밀번호 설정을 완료했습니다. 새 비밀번호로 로그인해 주세요."
};

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  noStore();
  const [params, access] = await Promise.all([searchParams, getAdminAccess()]);
  const configured = Boolean(getSupabasePublicConfig());

  if (access.status === "authorized") {
    redirect("/admin");
  }

  const reason = params.reason ? reasonMessages[params.reason] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-night-950 px-5 py-16 text-ivory-50">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-night-900 p-6 shadow-2xl md:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-sky">Jubilee Worship</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">쥬빌리워십 관리자</h1>
        <p className="mt-3 text-sm text-stone-300">오너가 이메일로 초대하고 활성 승인한 계정만 로그인할 수 있습니다.</p>
        {reason ? <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{reason}</p> : null}
        {!configured ? (
          <div role="status" className="mt-6 rounded-xl border border-brand-sky/40 bg-brand-sky/10 p-4 text-sm">
            <p className="font-bold">관리자 연결 설정이 필요합니다.</p>
            <p className="mt-2 text-stone-300">
              `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정한 뒤 다시 배포해 주세요. 값 자체는 화면에 표시하지 않습니다.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
        <Link className="mt-7 inline-block text-sm text-brand-sky underline" href="/">
          공개 홈페이지로 돌아가기
        </Link>
      </section>
    </main>
  );
}
