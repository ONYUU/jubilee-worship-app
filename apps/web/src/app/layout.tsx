import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "쥬빌리워십 | 인천 선두교회 예배사역팀",
    template: "%s | 쥬빌리워십"
  },
  description:
    "인천 선두교회 쥬빌리워십 공식 홈페이지입니다. 다음 찬양집회 일정, 예배 영상, 팀 소개와 오시는 길을 확인하세요.",
  applicationName: "JUBILEE WORSHIP",
  keywords: [
    "쥬빌리워십",
    "선두교회 쥬빌리워십",
    "인천 찬양집회",
    "인천 워십",
    "선두교회 찬양",
    "청소년 청년 예배"
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "JUBILEE WORSHIP",
    title: "쥬빌리워십 | 인천 선두교회 예배사역팀",
    description:
      "다음 찬양집회 일정, 예배 영상, 팀 소개와 오시는 길을 확인하세요.",
    images: [
      {
        url: "/images/social/og-home-group-07-1200x630.png",
        width: 1200,
        height: 630,
        alt: "선두교회 본당 무대에서 자유롭게 포즈를 취한 쥬빌리워십 공동체"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/social/og-home-group-07-1200x630.png"]
  }
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#080B10",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
