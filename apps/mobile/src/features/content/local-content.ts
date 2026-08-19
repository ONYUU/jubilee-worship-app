import type { MobilePublicContent } from "@jubilee/domain";
import { APP_INFO } from "../../config/app-info";

export function createLocalContent(now = new Date()): MobilePublicContent {
  return {
    site: {
      name_ko: APP_INFO.appName,
      name_en: "JUBILEE WORSHIP",
      hero_title: "오직 예배를 세우는 일",
      hero_description:
        "개인의 예배를 넘어 공동체의 예배로, 인천의 다음 세대와 함께 하나님을 예배합니다.",
      hero_media_path: "/images/hero/hero-home-group-07-desktop-1920x1080.webp",
      hero_media_mobile_path: "/images/gallery/sundoo-jubilee-01.webp",
      hero_media_alt: "선두교회 본당에 함께한 쥬빌리워십 공동체",
      visit_media_path: "/images/hero/visit-welcome-960x610.webp",
      visit_media_alt: "선두교회에서 함께 예배를 준비하는 쥬빌리워십 공동체",
      instagram_url: "https://www.instagram.com/jubilee_worship_/",
      youtube_channel_url: "https://www.youtube.com/@JUBILEEWORSHIP-25",
      church_name: "선두교회",
      church_url: "https://www.sundoo.org/",
      address: "인천광역시 서구 거북로109번길 10 (석남동 547-23)",
      phone_display: "032-574-7221~5",
      naver_map_url: "https://map.naver.com/p/entry/place/12087641?placePath=%2Fhome",
      kakao_map_url: "https://place.map.kakao.com/9174591",
      about_title: "예배가 삶이 되고, 세대가 함께 서는 자리",
      about_body:
        "쥬빌리워십은 2024년 선두교회 50주년을 기념해 시작된 예배사역팀입니다. 청소년과 청년을 중심으로 인천 지역의 다음 세대와 함께 예배를 세워갑니다."
    },
    events: [
      {
        id: 1,
        slug: "jubilee-worship-2026-09-04",
        title: "쥬빌리워십 찬양집회",
        starts_at: "2026-09-04T20:00:00+09:00",
        ends_at: null,
        timezone: "Asia/Seoul",
        venue_name: "선두교회 본당",
        address: "인천광역시 서구 거북로109번길 10",
        description: "누구나 함께 예배할 수 있습니다.",
        registration_url: null,
        hero_media_path: "/images/hero/worship-community-960x610.webp",
        status: "scheduled",
        featured: true,
        source_url: "https://www.instagram.com/p/Dbsd2PlT6p3/",
        sermon_topic: null,
        scripture_reference: null
      }
    ],
    announcements: [],
    media: [
      {
        id: 1,
        slug: "jubilee-worship-live-2026-07",
        title: "[LIVE] 쥬빌리 워십 7월 찬양집회",
        provider_id: "E5mD29x_-dM",
        external_url: "https://www.youtube.com/watch?v=E5mD29x_-dM",
        source_label: "Jubilee Worship(쥬빌리 워십)",
        thumbnail_path: "/images/media/youtube-featured-E5mD29x_-dM-1280x720.webp",
        thumbnail_alt: "쥬빌리워십 7월 찬양집회 영상 썸네일",
        occurred_on: "2026-07-03",
        description: "쥬빌리워십 7월 찬양집회 예배 실황입니다.",
        featured: true,
        sort_order: 10
      }
    ],
    setlists: [],
    gallery: [
      {
        id: 1,
        media_path: "/images/gallery/sundoo-jubilee-03.webp",
        thumbnail_path: null,
        alt: "손을 들고 찬양하는 다음 세대 예배자들",
        caption: null,
        occurred_on: null,
        sort_order: 10
      },
      {
        id: 2,
        media_path: "/images/gallery/sundoo-jubilee-01.webp",
        thumbnail_path: null,
        alt: "함께 찬양하는 다음 세대 예배자들의 옆모습",
        caption: null,
        occurred_on: null,
        sort_order: 20
      },
      {
        id: 3,
        media_path: "/images/gallery/sundoo-jubilee-07.webp",
        thumbnail_path: null,
        alt: "선두교회 본당 무대에서 자유롭게 포즈를 취한 쥬빌리워십 공동체",
        caption: null,
        occurred_on: null,
        sort_order: 30
      }
    ],
    guide: [],
    legal: [],
    fetched_at: now.toISOString()
  };
}
