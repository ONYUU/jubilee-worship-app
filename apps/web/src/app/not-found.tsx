import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center bg-night-950 px-5 py-24 text-center">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow">404 · NOT FOUND</p>
        <h1 className="page-title mt-6">찾으시는 페이지가 없습니다</h1>
        <p className="mt-6 text-stone-300">주소를 다시 확인하거나 안전한 경로로 이동해 주세요.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="button-primary">홈으로</Link>
          <Link href="/worship" className="button-secondary">예배안내</Link>
        </div>
      </div>
    </main>
  );
}
