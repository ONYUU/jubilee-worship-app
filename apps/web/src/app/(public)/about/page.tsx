import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/public/page-intro";
import { vision } from "@/lib/data/local-content";
import { getPublicContent } from "@/lib/data/repository";

export const metadata: Metadata = {
  title: { absolute: "쥬빌리워십 소개 | 선두교회" },
  description:
    "2024년 선두교회 50주년을 기념해 시작된 쥬빌리워십의 이야기와 예배 비전을 소개합니다.",
  alternates: { canonical: "/about" }
};

export const revalidate = 300;

export default async function AboutPage() {
  const { teamMembers, site } = await getPublicContent();

  return (
    <>
      <PageIntro
        eyebrow="WHO WE ARE"
        title="함께 자라고, 함께 예배하며, 하나님의 꿈을 이어갑니다"
        description="쥬빌리워십은 다음 세대가 예배 안에서 자라고, 공동체가 함께 하나님을 높이는 자리를 세워갑니다."
        image={{
          src: site.aboutImagePath,
          alt: site.aboutImageAlt
        }}
      />

      <section className="section-space bg-night-950">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <p className="eyebrow">OUR STORY</p>
            <h2 className="section-title mt-5">{site.aboutTitle}</h2>
          </div>
          <div className="lg:col-span-7 lg:pt-10">
            <div className="space-y-6 text-lg leading-8 text-stone-300">
              <p className="whitespace-pre-line">{site.aboutBody}</p>
            </div>
            <blockquote className="mt-12 border-l-2 border-brand-sun pl-6 font-serif text-2xl leading-relaxed text-ivory-50 md:text-3xl">
              예배를 준비하는 모든 시간과 섬김이 한 사람의 삶 속에 예배를 세우는 일이 되기를 소망합니다.
            </blockquote>
          </div>
        </div>
      </section>

      <section className="section-space border-y border-white/10 bg-night-900 subtle-grid">
        <div className="container-site">
          <p className="eyebrow">OUR VISION</p>
          <h2 className="section-title mt-5">우리가 함께 세워가는 예배</h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {vision.map((item) => (
              <article key={item.number} className="surface-card p-7 md:min-h-[340px] md:p-9">
                <span className="font-display text-5xl font-light text-brand-sun/40">{item.number}</span>
                <p className="eyebrow mt-12">{item.eyebrow}</p>
                <h3 className="mt-4 font-serif text-2xl font-semibold">{item.title}</h3>
                <p className="mt-5 text-stone-300">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-night-950">
        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="eyebrow">WITH US</p>
              <h2 className="section-title mt-5">함께 섬기는 이들</h2>
              <p className="mt-6 text-stone-300">쥬빌리워십의 예배와 다음 세대를 함께 섬기고 있습니다.</p>
            </div>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {teamMembers.map((member, index) => (
                <li key={member.id} className="grid items-center gap-5 py-7 sm:grid-cols-[auto_1fr_auto] md:py-9">
                  {member.photoPath ? (
                    <div className="relative size-20 overflow-hidden rounded-full bg-night-900 md:size-24">
                      <Image
                        src={member.photoPath}
                        alt={member.photoAlt ?? `${member.name} ${member.roleTitle} 프로필`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className={member.photoPath ? "" : "sm:col-span-2"}>
                    <p className="font-serif text-2xl font-semibold md:text-3xl">{member.name}</p>
                    <p className="mt-2 text-sm text-stone-500">{member.roleTitle}</p>
                    {member.bio ? <p className="mt-3 whitespace-pre-line text-sm text-stone-300">{member.bio}</p> : null}
                  </div>
                  <span className="font-display text-sm text-stone-500">{String(index + 1).padStart(2, "0")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-brand-sun text-night-950">
        <div className="container-site grid items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:py-20">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.16em]">SUNDOO CHURCH</p>
            <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight md:text-5xl">
              하나님의 꿈을 함께 이루어가는 믿음의 가족
            </h2>
            <p className="mt-5 max-w-2xl text-night-900/75">
              쥬빌리워십은 인천 선두교회가 세우고 함께 섬기는 예배사역팀입니다.
            </p>
          </div>
          <a
            href={site.churchJubileeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-night-950 px-6 font-semibold transition hover:bg-night-950 hover:text-ivory-50"
          >
            선두교회 홈페이지
            <ArrowUpRight size={18} aria-hidden="true" />
            <span className="sr-only">(새 창)</span>
          </a>
        </div>
      </section>
    </>
  );
}
