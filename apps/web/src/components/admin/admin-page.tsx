import Link from "next/link";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  createHref
}: {
  eyebrow: string;
  title: string;
  description: string;
  createHref?: string;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-sky">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ivory-50">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-300">{description}</p>
      </div>
      {createHref ? (
        <Link className="inline-flex min-h-11 items-center rounded-xl border border-brand-sky/60 px-4 py-2 font-semibold" href={createHref}>
          새로 등록
        </Link>
      ) : null}
    </header>
  );
}

export function AdminDataNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-ivory-50">
      {message}
    </div>
  );
}

export function StatusPill({ published, status }: { published?: boolean; status?: string | null }) {
  return (
    <span className="inline-flex rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-stone-300">
      {status ?? (published ? "게시" : "비공개")}
    </span>
  );
}
