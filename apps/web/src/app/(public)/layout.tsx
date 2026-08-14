import type { Metadata } from "next";
import { NoticeBanner } from "@/components/public/notice-banner";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getPublicContent } from "@/lib/data/repository";

export const revalidate = 300;

const GLOBAL_NOTICE_KINDS = new Set(["important", "schedule_change", "cancellation"]);

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getPublicContent();

  return {
    title: {
      default: site.seoTitle,
      template: `%s | ${site.nameKo}`
    },
    description: site.seoDescription,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: site.nameEn,
      title: site.seoTitle,
      description: site.seoDescription,
      images: [
        {
          url: site.ogImagePath,
          width: 1200,
          height: 630,
          alt: site.heroImageAlt
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: site.seoTitle,
      description: site.seoDescription,
      images: [site.ogImagePath]
    }
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { announcements, site } = await getPublicContent();
  const pinnedNotice = announcements.find(
    (notice) => notice.pinned && GLOBAL_NOTICE_KINDS.has(notice.kind)
  );

  return (
    <>
      <a href="#main-content" className="skip-link">본문 바로가기</a>
      <SiteHeader site={site} />
      {pinnedNotice ? <NoticeBanner notice={pinnedNotice} /> : null}
      <main id="main-content">{children}</main>
      <SiteFooter site={site} />
    </>
  );
}
