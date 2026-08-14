import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { GalleryGrid } from "@/components/public/gallery-grid";
import { PageIntro } from "@/components/public/page-intro";
import { YouTubeFacade } from "@/components/public/youtube-facade";
import { getPublicContent } from "@/lib/data/repository";

export const metadata: Metadata = {
  title: "예배 영상",
  description: "쥬빌리워십 공식 채널의 예배 실황과 선두교회 예배 현장 사진을 확인하세요.",
  alternates: { canonical: "/media" }
};

export const revalidate = 300;

export default async function MediaPage() {
  const { mediaItems, gallery, site } = await getPublicContent();

  return (
    <>
      <PageIntro
        eyebrow="MEDIA"
        title="찬양과 말씀, 다시 이어지는 예배"
        description="쥬빌리워십의 예배 실황과 현장의 순간을 다시 만나보세요."
        image={{
          src: "/images/media/youtube-featured-E5mD29x_-dM-1280x720.webp",
          alt: "쥬빌리워십 7월 찬양집회 영상 썸네일"
        }}
      />

      <section className="section-space bg-night-950">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">WORSHIP AGAIN</p>
              <h2 className="section-title mt-5">예배실황</h2>
            </div>
            <a href={site.youtubeChannelUrl} target="_blank" rel="noreferrer" className="button-secondary self-start md:self-auto">
              공식 채널 구독
              <ExternalLink size={17} aria-hidden="true" />
              <span className="sr-only">(새 창)</span>
            </a>
          </div>

          {mediaItems.length > 0 ? (
            <div className="grid gap-7 lg:grid-cols-2">
              {mediaItems.map((item) => <YouTubeFacade key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="surface-card p-8 md:p-12">
              <p className="text-xl text-stone-300">
                새로운 예배 영상을 준비하고 있습니다. 공식 YouTube 채널에서 먼저 만나보세요.
              </p>
              <a href={site.youtubeChannelUrl} target="_blank" rel="noreferrer" className="button-primary mt-7">
                공식 채널 보기<span className="sr-only">(새 창)</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="section-space border-t border-white/10 bg-night-900">
        <div className="container-wide">
          <p className="eyebrow">GALLERY</p>
          <h2 className="section-title mt-5">예배 현장</h2>
          <p className="mt-5 max-w-2xl text-stone-300">선두교회 공식 쥬빌리워십 소개 사진입니다.</p>
          <div className="mt-12">
            <GalleryGrid images={gallery} />
          </div>
        </div>
      </section>
    </>
  );
}
