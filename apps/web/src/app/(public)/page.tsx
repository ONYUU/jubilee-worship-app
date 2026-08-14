import { getImageProps } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { EventCard } from "@/components/public/event-card";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { YouTubeFacade } from "@/components/public/youtube-facade";
import { vision } from "@/lib/data/local-content";
import { formatEventDate } from "@/lib/date";
import { getPublicContent, selectNextPublicEvent, type PublicSite } from "@/lib/data/repository";
import { serializeJsonLd } from "@/lib/seo";

export const revalidate = 300;

function HeroArtwork({ site }: { site: PublicSite }) {
  const desktop = getImageProps({
    src: site.heroDesktopPath,
    alt: site.heroImageAlt,
    width: 1920,
    height: 1080,
    sizes: "100vw",
    priority: true
  }).props;
  const mobile = getImageProps({
    src: site.heroMobilePath,
    alt: site.heroImageAlt,
    width: 1080,
    height: 1350,
    sizes: "100vw",
    priority: true
  }).props;

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
      <img
        {...desktop}
        alt={site.heroImageAlt}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </picture>
  );
}

export default async function HomePage() {
  const content = await getPublicContent();
  const nextEvent = selectNextPublicEvent(content.events);
  const featuredMedia = content.mediaItems.find((item) => item.featured) ?? content.mediaItems[0];
  const site = content.site;
  const nextEventDate = nextEvent ? formatEventDate(nextEvent.startsAt) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicGroup",
        name: "Jubilee Worship",
        alternateName: "쥬빌리워십",
        parentOrganization: {
          "@type": "Organization",
          name: "선두교회",
          url: site.churchUrl
        },
        sameAs: [site.instagramUrl, site.youtubeChannelUrl, site.churchJubileeUrl]
      },
      ...(nextEvent
        ? [
            {
              "@type": "Event",
              name: nextEvent.title,
              startDate: nextEvent.startsAt,
              eventStatus:
                nextEvent.status === "postponed"
                  ? "https://schema.org/EventPostponed"
                  : "https://schema.org/EventScheduled",
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              location: {
                "@type": "Place",
                name: nextEvent.venueName,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: nextEvent.address,
                  addressLocality: "인천광역시 서구",
                  postalCode: site.postalCode,
                  addressCountry: "KR"
                }
              },
              organizer: { "@type": "Organization", name: "쥬빌리워십" }
            }
          ]
        : [])
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <section className="relative min-h-[760px] overflow-hidden bg-night-950 md:min-h-[90svh]">
        <HeroArtwork site={site} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,16,0.25)_0%,rgba(8,11,16,0.2)_40%,rgba(8,11,16,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,16,0.72)_0%,transparent_70%)]" />
        <div className="container-site relative flex min-h-[760px] items-end pb-16 pt-36 md:min-h-[90svh] md:pb-20">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-sun">{site.eyebrow}</p>
            <h1 className="display-title mt-6 max-w-2xl text-ivory-50">{site.heroTitle}</h1>
            <p className="body-large mt-6 max-w-2xl text-ivory-100/85">{site.heroDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/worship" className="button-primary">
                다음 예배 안내
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/media" className="button-secondary">예배 다시보기</Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 hidden border-l border-t border-white/10 bg-night-950/60 px-8 py-5 backdrop-blur-md lg:block">
          <p className="font-display text-xs font-bold tracking-[0.15em] text-brand-sky">NEXT GATHERING</p>
          <p className="mt-1 text-sm text-ivory-50">
            {nextEventDate
              ? `${nextEventDate.full} · ${nextEventDate.time}`
              : "새 일정을 준비하고 있습니다"}
          </p>
        </div>
      </section>

      <section className="section-space bg-night-950">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">UPCOMING</p>
              <h2 className="section-title mt-4">다음 쥬빌리워십</h2>
            </div>
            <p className="max-w-md text-stone-300">
              처음 오시는 분도, 다시 함께하는 분도 누구나 같은 자리에서 예배할 수 있습니다.
            </p>
          </div>
          {nextEvent ? (
            <EventCard event={nextEvent} site={site} />
          ) : (
            <div className="surface-card p-8 md:p-12">
              <p className="text-xl text-stone-300">
                다음 예배 일정을 준비하고 있습니다. 새로운 일정은 인스타그램과 이곳에서 가장 먼저 알려드릴게요.
              </p>
              <a href={site.instagramUrl} target="_blank" rel="noreferrer" className="button-primary mt-7">
                인스타그램 공지 보기<span className="sr-only">(새 창)</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="section-space border-y border-white/10 bg-night-900">
        <div className="container-site grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow">ABOUT JUBILEE</p>
            <h2 className="section-title mt-5">{site.aboutTitle}</h2>
            <p className="mt-7 whitespace-pre-line text-stone-300">{site.aboutBody}</p>
            <Link href="/about" className="button-secondary mt-8">
              쥬빌리워십 소개
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] lg:col-span-7 lg:min-h-[580px]">
            <Image
              src={site.aboutImagePath}
              alt={site.aboutImageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="section-space subtle-grid bg-night-950">
        <div className="container-site">
          <p className="eyebrow">OUR VISION</p>
          <h2 className="section-title mt-5 max-w-3xl">함께 예배하고, 세대를 잇고,<br className="hidden md:block" /> 인천을 섬깁니다</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 md:grid-cols-3">
            {vision.map((item) => (
              <article key={item.number} className="bg-night-900 p-7 md:min-h-[340px] md:p-9">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{item.eyebrow}</span>
                  <span className="font-display text-sm text-stone-500">{item.number}</span>
                </div>
                <h3 className="mt-16 font-serif text-2xl font-semibold md:mt-24">{item.title}</h3>
                <p className="mt-5 text-stone-300">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {featuredMedia ? (
        <section className="section-space border-y border-white/10 bg-night-900">
          <div className="container-site">
            <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow">WORSHIP AGAIN</p>
                <h2 className="section-title mt-5">예배의 순간을 다시 만나다</h2>
                <p className="mt-5 text-stone-300">현장의 찬양과 말씀을 언제 어디서나 다시 함께하세요.</p>
              </div>
              <Link href="/media" className="button-secondary self-start md:self-auto">
                모든 영상 보기
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <YouTubeFacade item={featuredMedia} />
          </div>
        </section>
      ) : null}

      <section className="section-space bg-night-950">
        <div className="container-wide">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">IN WORSHIP</p>
              <h2 className="section-title mt-5">함께 드린 예배의 장면</h2>
            </div>
          </div>
          <GalleryGrid images={content.gallery} home />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 bg-night-900">
        <Image
          src={site.visitImagePath}
          alt={site.visitImageAlt}
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-night-950 via-night-950/80 to-night-950/40" />
        <div className="container-site relative py-20 md:py-28">
          <p className="eyebrow">VISIT US</p>
          <h2 className="section-title mt-5">이번 금요일, 함께 예배해요</h2>
          <p className="mt-6 max-w-2xl text-stone-300">
            매월 첫 번째 금요일 오후 8시, 인천 선두교회 본당에서 만납니다. 실제 일정은 다음 예배 안내를 확인해 주세요.
          </p>
          <p className="mt-5 flex items-center gap-2 text-sm text-ivory-50">
            <MapPin size={17} className="text-brand-sky" aria-hidden="true" />
            {site.shortAddress}
          </p>
          <Link href="/visit" className="button-primary mt-8">
            오시는 길 확인
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
