import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "쥬빌리워십 | JUBILEE WORSHIP",
    short_name: "쥬빌리워십",
    description: "인천 선두교회 예배사역팀 쥬빌리워십 공식 홈페이지",
    start_url: "/",
    display: "standalone",
    background_color: "#080B10",
    theme_color: "#080B10",
    lang: "ko",
    icons: [
      { src: "/images/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/brand/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
