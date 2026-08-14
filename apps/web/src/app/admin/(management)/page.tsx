import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminDataNotice, AdminPageHeader, StatusPill } from "@/components/admin/admin-page";
import { requireActiveAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatSeoul(value: string | null): string {
  if (!value) return "미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  noStore();
  const { supabase, admin } = await requireActiveAdmin();
  const now = new Date().toISOString();

  const [events, announcements, media, team, nextEvent, recentEvents, recentAnnouncements] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("announcements").select("id", { count: "exact", head: true }),
    supabase.from("media_items").select("id", { count: "exact", head: true }),
    supabase.from("team_members").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("id,title,starts_at,status,published")
      .in("status", ["scheduled", "postponed"])
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("events").select("id,title,updated_at,published,status").order("updated_at", { ascending: false }).limit(3),
    supabase.from("announcements").select("id,title,updated_at,published,kind").order("updated_at", { ascending: false }).limit(3)
  ]);

  const hasError = [events, announcements, media, team, nextEvent, recentEvents, recentAnnouncements].some((result) => result.error);
  const counts = [
    { label: "예배 일정", value: events.count ?? 0, href: "/admin/events" },
    { label: "공지", value: announcements.count ?? 0, href: "/admin/announcements" },
    { label: "미디어", value: media.count ?? 0, href: "/admin/media" },
    { label: "섬기는 이", value: team.count ?? 0, href: "/admin/team" }
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Dashboard"
        title="운영 대시보드"
        description="일정·공지·영상의 공개 상태를 확인하고 필요한 콘텐츠를 수정합니다. 공개 화면에 반영할 내용만 게시해 주세요."
      />
      {hasError ? <AdminDataNotice message="일부 관리자 데이터를 불러오지 못했습니다. Supabase 연결과 RLS 정책을 확인해 주세요." /> : null}

      <section aria-label="콘텐츠 현황" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-night-900 p-5 hover:border-brand-sky/40">
            <p className="text-sm text-stone-300">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">다음 예배</h2>
          <Link className="text-sm text-brand-sky underline" href="/admin/events">일정 관리</Link>
        </div>
        {nextEvent.data ? (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-night-950 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold">{nextEvent.data.title}</p>
              <p className="mt-1 text-sm text-stone-300">{formatSeoul(nextEvent.data.starts_at)}</p>
            </div>
            <StatusPill published={nextEvent.data.published} status={nextEvent.data.status} />
          </div>
        ) : (
          <p className="mt-5 text-sm text-stone-300">향후 예정 또는 연기 상태의 일정이 없습니다.</p>
        )}
      </section>

      {admin.role === "owner" ? (
        <section className="rounded-2xl border border-brand-sun/30 bg-brand-sun/5 p-5">
          <h2 className="text-lg font-bold">관리자 승인</h2>
          <p className="mt-2 text-sm text-stone-300">오너가 초대하고 승인한 이메일 계정만 관리자 웹을 사용할 수 있습니다.</p>
          <Link className="button-ghost mt-4" href="/admin/admins">관리자 승인·권한 관리</Link>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-lg font-bold">최근 수정 일정</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(recentEvents.data ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link className="block truncate text-sm hover:text-brand-sky" href={`/admin/events?edit=${item.id}`}>{item.title}</Link>
                  <time className="mt-1 block text-xs text-stone-400" dateTime={item.updated_at}>수정 {formatSeoul(item.updated_at)}</time>
                </div>
                <StatusPill published={item.published} status={item.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-night-900 p-5">
          <h2 className="text-lg font-bold">최근 수정 공지</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {(recentAnnouncements.data ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link className="block truncate text-sm hover:text-brand-sky" href={`/admin/announcements?edit=${item.id}`}>{item.title}</Link>
                  <time className="mt-1 block text-xs text-stone-400" dateTime={item.updated_at}>수정 {formatSeoul(item.updated_at)}</time>
                </div>
                <StatusPill published={item.published} status={item.kind} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-sky/30 bg-brand-sky/5 p-5">
        <h2 className="font-bold">빠른 작업</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="button-ghost" href="/admin/events">예배 추가</Link>
          <Link className="button-ghost" href="/admin/announcements">공지 추가</Link>
          <Link className="button-ghost" href="/admin/media">영상 추가</Link>
          <Link className="button-ghost" href="/" target="_blank">공개 페이지 미리보기</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
        <h2 className="text-lg font-bold">앱 콘텐츠 관리</h2>
        <p className="mt-2 text-sm text-stone-300">모바일 앱에 표시되는 송리스트·사진·방문 안내를 별도로 관리합니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link className="button-ghost" href="/admin/app-songlists">앱 송리스트</Link>
          <Link className="button-ghost" href="/admin/app-gallery">앱 갤러리</Link>
          <Link className="button-ghost" href="/admin/app-guide">앱 안내</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-night-900 p-5">
        <h2 className="text-lg font-bold">승인·배포 작업</h2>
        <p className="mt-2 text-sm text-stone-300">법적 문서 버전과 앱 푸시 알림 캠페인을 초안부터 오너 승인까지 관리합니다.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="button-ghost" href="/admin/legal">법적 문서</Link>
          <Link className="button-ghost" href="/admin/notifications">알림 캠페인</Link>
        </div>
      </section>
    </div>
  );
}
