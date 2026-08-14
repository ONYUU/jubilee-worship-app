import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { SetPasswordForm } from "./set-password-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SetPasswordPage() {
  noStore();
  const { admin } = await requireActiveAdmin();

  return (
    <main className="flex min-h-screen items-center justify-center bg-night-950 px-5 py-16 text-ivory-50">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-night-900 p-6 shadow-2xl md:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-sky">Invitation accepted</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">관리자 비밀번호 설정</h1>
        <p className="mt-3 text-sm text-stone-300">
          {admin.email ?? "초대된 계정"}의 관리자 접근을 완료하려면 새 비밀번호를 설정해 주세요.
        </p>
        <SetPasswordForm />
        <Link className="mt-7 inline-block text-sm text-brand-sky underline" href="/">공개 홈페이지로 돌아가기</Link>
      </section>
    </main>
  );
}
