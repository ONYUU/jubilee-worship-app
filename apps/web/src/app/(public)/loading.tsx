export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-night-950 pt-36" role="status" aria-label="페이지를 불러오는 중">
      <div className="container-site animate-pulse">
        <div className="h-3 w-36 rounded bg-brand-sky/30" />
        <div className="mt-8 h-16 max-w-2xl rounded bg-white/8" />
        <div className="mt-5 h-6 max-w-xl rounded bg-white/6" />
      </div>
    </div>
  );
}
