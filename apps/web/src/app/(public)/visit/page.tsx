import type { Metadata } from "next";
import Image from "next/image";
import { BusFront, ExternalLink, MapPin, Phone, TrainFront, Warehouse } from "lucide-react";
import { CopyAddress } from "@/components/public/copy-address";
import { PageIntro } from "@/components/public/page-intro";
import { getPublicContent } from "@/lib/data/repository";

export const metadata: Metadata = {
  title: "선두교회 본당 오시는 길",
  description:
    "쥬빌리워십 예배 장소인 인천 선두교회 본당의 주소, 지도, 지하철, 버스, 주차 안내입니다.",
  alternates: { canonical: "/visit" }
};

export default async function VisitPage() {
  const { site } = await getPublicContent();
  return (
    <>
      <PageIntro
        eyebrow="VISIT US"
        title="선두교회 본당에서 만나요"
        description="처음 오시는 길이 어렵지 않도록 위치와 교통 정보를 안내해 드립니다."
        image={{ src: site.visitImagePath, alt: site.visitImageAlt }}
      />

      <section className="section-space bg-night-950">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow">LOCATION</p>
            <h2 className="section-title mt-5">선두교회 본당</h2>
            <div className="mt-8 space-y-6 border-y border-white/10 py-8">
              <div className="flex gap-4">
                <MapPin className="mt-1 shrink-0 text-brand-sky" size={21} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ivory-50">주소</p>
                  <address className="mt-2 not-italic text-stone-300">
                    ({site.postalCode}) {site.address}
                  </address>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone className="mt-1 shrink-0 text-brand-sky" size={21} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ivory-50">대표전화</p>
                  <a href={site.phoneHref} className="mt-2 inline-block text-stone-300 hover:text-ivory-50">
                    {site.phoneDisplay}
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={site.naverMapUrl} target="_blank" rel="noreferrer" className="button-primary">
                네이버 지도 열기
                <ExternalLink size={16} aria-hidden="true" />
                <span className="sr-only">(새 창)</span>
              </a>
              <a href={site.kakaoMapUrl} target="_blank" rel="noreferrer" className="button-secondary">
                카카오 지도 열기
                <ExternalLink size={16} aria-hidden="true" />
                <span className="sr-only">(새 창)</span>
              </a>
              <CopyAddress address={site.address} />
            </div>
          </div>

          <div className="relative min-h-[480px] overflow-hidden rounded-[28px] lg:col-span-7 lg:min-h-[650px]">
            <Image
              src={site.visitImagePath}
              alt={site.visitImageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-[20px] border border-white/15 bg-night-950/85 p-5 backdrop-blur-xl md:inset-x-8 md:bottom-8 md:p-7">
              <p className="eyebrow">JUBILEE WORSHIP</p>
              <p className="mt-3 text-sm text-stone-300">매월 첫 번째 금요일 오후 8시를 중심으로 모입니다.</p>
              <p className="mt-1 text-xs text-stone-500">실제 일정은 예배안내에서 확인해 주세요.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space border-y border-white/10 bg-night-900 subtle-grid">
        <div className="container-site">
          <p className="eyebrow">GETTING HERE</p>
          <h2 className="section-title mt-5">교통 안내</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <article className="surface-card p-7">
              <TrainFront className="text-brand-sky" size={26} aria-hidden="true" />
              <h3 className="mt-7 font-serif text-2xl font-semibold">지하철</h3>
              <p className="mt-4 text-stone-300">
                인천2호선 석남역 또는 서부여성회관역에서 내리실 수 있습니다. 서울7호선은 석남역을 이용해 주세요.
              </p>
            </article>
            <article className="surface-card p-7">
              <BusFront className="text-brand-sky" size={26} aria-hidden="true" />
              <h3 className="mt-7 font-serif text-2xl font-semibold">버스</h3>
              <p className="mt-4 text-stone-300">
                석남역, 보건고등학교, 거북시장 정류장에서 내린 뒤 선두교회로 이동할 수 있습니다. 노선은 변경될 수 있으므로 출발 전 지도 앱에서 현재 경로를 확인해 주세요.
              </p>
            </article>
            <article className="surface-card p-7">
              <Warehouse className="text-brand-sky" size={26} aria-hidden="true" />
              <h3 className="mt-7 font-serif text-2xl font-semibold">주차</h3>
              <p className="mt-4 text-stone-300">
                교회 및 인근 주차장을 이용할 수 있습니다. 당일 안내와 선두교회 공식 주차 안내를 함께 확인해 주세요.
              </p>
            </article>
          </div>
          <a
            href={site.churchLocationUrl}
            target="_blank"
            rel="noreferrer"
            className="button-secondary mt-9"
          >
            선두교회 상세 교통·주차 안내
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only">(새 창)</span>
          </a>
        </div>
      </section>
    </>
  );
}
