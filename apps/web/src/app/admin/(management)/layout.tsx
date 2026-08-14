import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireActiveAdmin } from "@/lib/auth/admin";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminManagementLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await requireActiveAdmin();

  return (
    <div className="min-h-screen bg-night-950 text-ivory-50">
      <a href="#main-content" className="skip-link">본문 바로가기</a>
      <header className="border-b border-white/10 bg-night-900">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/admin" className="font-bold tracking-tight">
            JUBILEE WORSHIP <span className="text-sm font-normal text-stone-300">관리자</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-stone-300 sm:inline">
              {admin.email ?? "등록 관리자"} · {admin.role}
            </span>
            <form action={logoutAction}>
              <button className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5" type="submit">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-6 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside><AdminNav role={admin.role} /></aside>
        <main id="main-content" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
