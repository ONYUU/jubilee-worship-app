import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { PublicSite } from "@/lib/data/repository";

export function SiteFooter({ site }: { site: PublicSite }) {
  const socialLinks = [
    { label: "Instagram", href: site.instagramUrl },
    { label: "YouTube", href: site.youtubeChannelUrl },
    { label: "선두교회", href: site.churchUrl }
  ];
  return (
    <footer className="border-t border-white/10 bg-night-900">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr] lg:py-20">
        <div>
          <Link href="/" className="inline-flex items-center gap-4" aria-label="JUBILEE WORSHIP 홈">
            <Image
              src={site.logoInversePath}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 rounded-full"
            />
            <span className="font-display text-sm font-bold tracking-[0.14em]">JUBILEE WORSHIP</span>
          </Link>
          <p className="mt-6 max-w-md text-stone-300">
            인천 선두교회 예배사역팀 쥬빌리워십입니다.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            매월 첫 번째 금요일 오후 8시 · 선두교회 본당
            <br />
            실제 일정은 예배안내에서 확인해 주세요.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xs font-bold tracking-[0.16em] text-brand-sky">EXPLORE</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            <li><Link href="/about" className="hover:text-ivory-50">소개</Link></li>
            <li><Link href="/worship" className="hover:text-ivory-50">예배안내</Link></li>
            <li><Link href="/media" className="hover:text-ivory-50">미디어</Link></li>
            <li><Link href="/visit" className="hover:text-ivory-50">오시는 길</Link></li>
            <li><Link href="/privacy" className="hover:text-ivory-50">개인정보 안내</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xs font-bold tracking-[0.16em] text-brand-sky">CONNECT</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-ivory-50"
                >
                  {link.label}
                  <ExternalLink size={13} aria-hidden="true" />
                  <span className="sr-only">(새 창)</span>
                </a>
              </li>
            ))}
          </ul>
          <address className="mt-7 not-italic text-sm text-stone-500">
            {site.postalCode} {site.address}
            <br />
            <a href={site.phoneHref} className="hover:text-ivory-50">{site.phoneDisplay}</a>
            <br />
            <a href={`mailto:${site.contactEmail}`} className="break-all hover:text-ivory-50">
              {site.contactEmail}
            </a>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-stone-500 md:flex-row md:items-center md:justify-between">
          <p>운영주체: {site.operatorName} · 인천 선두교회 예배사역팀</p>
          <p>© {new Date().getFullYear()} Jubilee Worship, Sundoo Church. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
