import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, MapPin } from "lucide-react";
import { formatEventDate, getSeoulDday } from "@/lib/date";
import type { WorshipEvent } from "@/lib/data/local-content";
import type { PublicSite } from "@/lib/data/repository";

const statusLabel: Record<WorshipEvent["status"], string> = {
  scheduled: "예정",
  postponed: "일정 변경",
  cancelled: "취소",
  completed: "예배 완료"
};

export function EventCard({
  event,
  site,
  compact = false
}: {
  event: WorshipEvent;
  site: PublicSite;
  compact?: boolean;
}) {
  const formatted = formatEventDate(event.startsAt);
  const cancelled = event.status === "cancelled";

  return (
    <article
      className={`surface-card overflow-hidden ${cancelled ? "border-danger/50" : "border-white/12"}`}
    >
      {event.heroMediaPath ? (
        <div className="relative aspect-[16/7] min-h-48 overflow-hidden border-b border-white/10">
          <Image
            src={event.heroMediaPath}
            alt={`${event.title} 대표 이미지`}
            fill
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className={`grid ${compact ? "md:grid-cols-[190px_1fr]" : "lg:grid-cols-[280px_1fr]"}`}>
        <div className="flex min-h-60 flex-col justify-between bg-brand-sun p-7 text-night-950 md:p-9">
          <div className="flex items-center justify-between gap-4">
            <span className="font-display text-xs font-bold tracking-[0.14em]">
              {compact ? "WORSHIP SCHEDULE" : "NEXT WORSHIP"}
            </span>
            <span className="rounded-full border border-night-950/25 px-3 py-1 text-xs font-bold">
              {cancelled ? statusLabel[event.status] : getSeoulDday(event.startsAt)}
            </span>
          </div>
          <div className="mt-8">
            <span className="font-display text-sm font-semibold tracking-[0.13em]">{formatted.month}</span>
            <div className="mt-1 flex items-end gap-4">
              <span className="font-display text-7xl font-semibold leading-none md:text-8xl">{formatted.day}</span>
              <span className="pb-2 font-display text-sm font-bold tracking-[0.16em]">{formatted.weekday}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-7 md:p-10 lg:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
              cancelled
                ? "border-danger/50 text-danger"
                : event.status === "postponed"
                  ? "border-brand-sun/50 text-brand-sun"
                  : "border-brand-sky/45 text-brand-sky"
            }`}>
              {statusLabel[event.status]}
            </span>
            <time dateTime={event.startsAt} className="text-sm text-stone-500">{formatted.full}</time>
          </div>
          <h2 className={`${compact ? "text-2xl" : "text-3xl md:text-4xl"} mt-5 font-serif font-semibold tracking-tight`}>
            {event.title}
          </h2>
          <p className="mt-5 flex items-start gap-3 text-stone-300">
            <MapPin size={19} className="mt-1 shrink-0 text-brand-sky" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-ivory-50">{event.venueName}</strong>
              <br />
              <span className="text-sm text-stone-500">{event.address}</span>
            </span>
          </p>
          <p className="mt-4 text-stone-300">
            {cancelled
              ? "이 예배는 취소되었습니다. 최신 공지를 확인해 주세요."
              : event.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {!cancelled ? (
              <Link href={`/api/calendar/${event.slug}`} className="button-primary">
                <CalendarPlus size={17} aria-hidden="true" />
                캘린더에 저장
              </Link>
            ) : null}
            {!cancelled && event.registrationUrl ? (
              <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="button-secondary">
                참여 안내
                <ArrowUpRight size={17} aria-hidden="true" />
                <span className="sr-only">(새 창)</span>
              </a>
            ) : null}
            <Link href="/visit" className="button-secondary">
              오시는 길
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <a href={site.naverMapUrl} target="_blank" rel="noreferrer" className="button-ghost">
              네이버 지도<span className="sr-only">(새 창)</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
