"use client";

import { AlertCircle, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Announcement } from "@/lib/data/local-content";

export function NoticeBanner({ notice }: { notice: Announcement }) {
  const storageKey = `jubilee-notice-dismissed:${notice.id}`;
  const visible = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("jubilee-notice-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("jubilee-notice-change", onStoreChange);
      };
    },
    () => window.localStorage.getItem(storageKey) !== "true",
    () => true
  );

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-0 top-[76px] z-40 border-b border-brand-sky/25 bg-night-900 lg:top-[84px]" aria-label="중요 공지">
      <div className="container-site flex min-h-14 items-center gap-3 py-2 text-sm">
        <AlertCircle className="shrink-0 text-brand-sun" size={18} aria-hidden="true" />
        <p className="min-w-0 flex-1">
          <strong className="mr-2 text-brand-sun">{notice.title}</strong>
          <span className="text-stone-300">{notice.body}</span>
        </p>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/5"
          aria-label="공지 닫기"
          onClick={() => {
            window.localStorage.setItem(storageKey, "true");
            window.dispatchEvent(new Event("jubilee-notice-change"));
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
