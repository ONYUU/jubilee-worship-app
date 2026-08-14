"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center bg-night-950 px-5 py-24 text-center">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow">TEMPORARY ERROR</p>
        <h1 className="page-title mt-6">정보를 불러오지 못했습니다</h1>
        <p className="mt-6 text-stone-300">잠시 후 다시 시도해 주세요.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="button-primary">다시 시도</button>
          <Link href="/" className="button-secondary">홈으로</Link>
        </div>
      </div>
    </main>
  );
}
