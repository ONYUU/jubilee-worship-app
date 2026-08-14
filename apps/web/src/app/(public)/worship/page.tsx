import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, AtSign, CalendarDays, Clock3, MapPin } from "lucide-react";
import { EventCard } from "@/components/public/event-card";
import { PageIntro } from "@/components/public/page-intro";
import {
  getPublicContent,
  selectNextPublicEvent,
  selectUpcomingPublicEvents
} from "@/lib/data/repository";

export const metadata: Metadata = {
  title: "다음 예배 안내",
  description:
    "쥬빌리워십의 다음 확정 찬양집회 날짜, 시간, 장소와 일정 변경 공지를 확인하세요.",
  alternates: { canonical: "/worship" }
};

export const revalidate = 300;

export default async function WorshipPage() {
  const { events, announcements, site } = await getPublicContent();
  const nextEvent = selectNextPublicEvent(events);
  const upcoming = selectUpcomingPublicEvents(events);
  const remainingUpcoming = upcoming.filter((event) => event.id !== nextEvent?.id);
  const importantAnnouncements = announcements.filter((notice) => notice.kind !== "normal");

  return (
    <>
      <PageIntro
        eyebrow="GATHER & WORSHIP"
        title="함께 예배하는 금요일"
        description="매월 첫 번째 금요일 오후 8시를 중심으로 모입니다. 휴식이나 일정 변경이 있을 수 있으니 아래의 확정된 다음 예배를 확인해 주세요."
        image={{
          src: site.worshipImagePath,
          alt: site.worshipImageAlt
        }}
      />

      <section className="section-space bg-night-950">
        <div className="container-site">
          {nextEvent ? (
            <EventCard event={nextEvent} site={site} />
          ) : (
            <div className="surface-card relative overflow-hidden p-8 md:p-12">
              <Image
                src="/images/backgrounds/ambient-worship-light-1920x1080.webp"
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-15"
              />
              <div className="relative">
                <p className="eyebrow">NEXT WORSHIP</p>
                <h2 className="section-title mt-5">다음 예배 일정을 준비하고 있습니다</h2>
                <p className="mt-6 max-w-2xl text-stone-300">
                  새로운 일정은 인스타그램과 이곳에서 가장 먼저 알려드릴게요.
                </p>
                <a href={site.instagramUrl} target="_blank" rel="noreferrer" className="button-primary mt-8">
                  <AtSign size={17} aria-hidden="true" />
                  인스타그램 공지 보기<span className="sr-only">(새 창)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {importantAnnouncements.length > 0 ? (
        <section className="border-y border-white/10 bg-night-900 py-12">
          <div className="container-site">
            <h2 className="font-serif text-2xl font-semibold">중요 일정 공지</h2>
            <div className="mt-6 space-y-4">
              {importantAnnouncements.map((notice) => (
                <article key={notice.id} className="surface-card p-6">
                  <p className="eyebrow">{notice.kind.replaceAll("_", " ")}</p>
                  <h3 className="mt-3 text-xl font-semibold">{notice.title}</h3>
                  <p className="mt-3 text-stone-300">{notice.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {remainingUpcoming.length > 0 ? (
        <section className="section-space border-t border-white/10 bg-night-900">
          <div className="container-site">
            <p className="eyebrow">UPCOMING SCHEDULE</p>
            <h2 className="section-title mt-5">향후 일정</h2>
            <div className="mt-10 space-y-6">
              {remainingUpcoming.map((event) => <EventCard key={event.id} event={event} site={site} compact />)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-space border-y border-white/10 bg-night-900 subtle-grid">
        <div className="container-site grid gap-5 md:grid-cols-3">
          <article className="surface-card p-7">
            <CalendarDays className="text-brand-sky" size={25} aria-hidden="true" />
            <h2 className="mt-7 font-serif text-2xl font-semibold">첫 번째 금요일</h2>
            <p className="mt-4 text-stone-300">
              매월 첫 번째 금요일을 중심으로 모이지만, 실제 확정 일정은 위 안내를 기준으로 확인해 주세요.
            </p>
          </article>
          <article className="surface-card p-7">
            <Clock3 className="text-brand-sky" size={25} aria-hidden="true" />
            <h2 className="mt-7 font-serif text-2xl font-semibold">오후 8시</h2>
            <p className="mt-4 text-stone-300">일정 변경 여부를 확인한 뒤 공지된 시간에 본당으로 오시면 됩니다.</p>
          </article>
          <article className="surface-card p-7">
            <MapPin className="text-brand-sky" size={25} aria-hidden="true" />
            <h2 className="mt-7 font-serif text-2xl font-semibold">선두교회 본당</h2>
            <p className="mt-4 text-stone-300">인천광역시 서구 거북로109번길 10에 있습니다.</p>
          </article>
        </div>
      </section>

      <section className="section-space bg-night-950">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">FIRST TIME?</p>
            <h2 className="section-title mt-5">처음 오셔도 괜찮습니다</h2>
            <p className="mt-6 text-lg text-stone-300">
              별도의 안내가 없는 경우, 공지된 시간에 선두교회 본당으로 오시면 됩니다. 일정 변경 여부와 오시는 길을 한 번 더 확인해 주세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/visit" className="button-primary">오시는 길</Link>
              <a href={site.instagramUrl} target="_blank" rel="noreferrer" className="button-secondary">
                인스타그램 공지 보기
                <ArrowUpRight size={17} aria-hidden="true" />
                <span className="sr-only">(새 창)</span>
              </a>
            </div>
          </div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px]">
            <Image
              src={site.visitImagePath}
              alt={site.visitImageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </>
  );
}
