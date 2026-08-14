"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/auth/types";

const items = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/events", label: "예배 일정" },
  { href: "/admin/announcements", label: "공지" },
  { href: "/admin/media", label: "미디어" },
  { href: "/admin/team", label: "섬기는 이" },
  { href: "/admin/settings", label: "사이트 설정" },
  { href: "/admin/app-songlists", label: "앱 · 송리스트" },
  { href: "/admin/app-gallery", label: "앱 · 갤러리" },
  { href: "/admin/app-guide", label: "앱 · 안내" },
  { href: "/admin/legal", label: "법적 문서" },
  { href: "/admin/notifications", label: "알림 캠페인" },
  { href: "/admin/admins", label: "관리자 승인", ownerOnly: true }
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
      {items.filter((item) => !item.ownerOnly || role === "owner").map((item) => {
        const current = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              current ? "bg-ivory-50 text-night-950" : "text-stone-300 hover:bg-white/5 hover:text-ivory-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
