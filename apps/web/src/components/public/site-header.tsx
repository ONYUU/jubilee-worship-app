"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AtSign, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicSite } from "@/lib/data/repository";

const navigation = [
  { href: "/about", label: "소개" },
  { href: "/worship", label: "예배안내" },
  { href: "/media", label: "미디어" },
  { href: "/visit", label: "오시는 길" }
];

export function SiteHeader({ site }: { site: PublicSite }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const panelFocusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    panelFocusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [triggerRef.current, ...(panelFocusable ?? [])].filter(
        (element): element is HTMLElement => element !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const transparent = pathname === "/" && !scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        transparent
          ? "border-transparent bg-transparent"
          : "border-white/10 bg-night-950/92 backdrop-blur-xl"
      }`}
    >
      <div className="container-site flex h-[76px] items-center justify-between lg:h-[84px]">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="JUBILEE WORSHIP 홈"
          onClick={() => setOpen(false)}
        >
          <Image
            src={site.logoPath}
            alt=""
            width={44}
            height={44}
            priority
            className="h-9 w-9 rounded-full lg:h-11 lg:w-11"
          />
          <span className="font-display text-[0.78rem] font-bold tracking-[0.13em] text-ivory-50 lg:text-sm">
            JUBILEE WORSHIP
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`relative py-3 text-sm font-medium transition-colors ${
                  active ? "text-brand-sun" : "text-stone-300 hover:text-ivory-50"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-1 h-px bg-brand-sun" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition hover:border-brand-sky hover:text-ivory-50"
            aria-label="쥬빌리워십 인스타그램 열기(새 창)"
          >
            <AtSign size={19} aria-hidden="true" />
          </a>
        </nav>

        <button
          ref={triggerRef}
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-ivory-50 lg:hidden"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div
          ref={panelRef}
          id="mobile-navigation"
          className="fixed inset-x-0 top-[76px] flex min-h-[calc(100svh-76px)] flex-col bg-night-950 px-5 pb-10 pt-8 lg:hidden"
        >
          <nav className="flex flex-col" aria-label="모바일 메뉴">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`flex min-h-16 items-center justify-between border-b border-white/10 font-serif text-3xl ${
                  pathname === item.href ? "text-brand-sun" : "text-ivory-50"
                }`}
              >
                {item.label}
                <span className="font-display text-xs text-stone-500">0{index + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-12">
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="button-secondary w-full"
            >
              <AtSign size={18} aria-hidden="true" />
              인스타그램 공지 보기
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
