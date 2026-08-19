import { SERVICE_IDENTITY } from "@/lib/site-identity";

export type EventStatus = "scheduled" | "postponed" | "cancelled" | "completed";

export interface WorshipEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: "Asia/Seoul";
  venueName: string;
  address: string;
  description: string;
  registrationUrl: string | null;
  heroMediaPath: string | null;
  status: EventStatus;
  featured: boolean;
  published: boolean;
  sourceUrl: string;
}

export interface Announcement {
  id: string;
  slug: string;
  kind: "normal" | "important" | "schedule_change" | "cancellation";
  title: string;
  body: string;
  startsAt: string | null;
  expiresAt: string | null;
  pinned: boolean;
  published: boolean;
}

export interface MediaItem {
  id: string;
  slug: string;
  title: string;
  providerId: string;
  externalUrl: string;
  sourceLabel: string;
  thumbnailPath: string;
  thumbnailAlt: string;
  occurredOn: string | null;
  description: string;
  featured: boolean;
  published: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  roleTitle: string;
  category: "minister";
  photoPath: string | null;
  photoAlt: string | null;
  bio: string | null;
  sortOrder: number;
  published: boolean;
}

export interface GalleryImage {
  path: string;
  thumbnail: string;
  alt: string;
}

export const SITE = {
  nameKo: "쥬빌리워십",
  nameEn: "JUBILEE WORSHIP",
  operatorName: SERVICE_IDENTITY.operatorName,
  contactEmail: SERVICE_IDENTITY.contactEmail,
  eyebrow: "Sundoo Church Worship Ministry",
  heroTitle: "오직 예배를 세우는 일",
  heroDescription:
    "개인의 예배를 넘어 공동체의 예배로, 인천의 다음 세대와 함께 하나님을 예배합니다.",
  heroImageAlt: "선두교회 본당에 함께한 쥬빌리워십 공동체",
  aboutTitle: "예배가 삶이 되고, 세대가 함께 서는 자리",
  aboutBody:
    "쥬빌리워십은 2024년 선두교회 50주년을 기념해 시작된 예배사역팀입니다. 청소년과 청년을 중심으로 개인의 예배와 공동체의 예배를 세우고, 인천 지역의 다음 세대를 섬기는 예배를 꿈꾸며 걸어가고 있습니다.",
  instagramUrl: "https://www.instagram.com/jubilee_worship_/",
  youtubeChannelUrl: "https://www.youtube.com/@JUBILEEWORSHIP-25",
  youtubeChannelId: "UCxmosyyztNo7HBUOdN_gy9w",
  churchName: "선두교회",
  churchUrl: "https://www.sundoo.org/",
  churchJubileeUrl:
    "https://www.sundoo.org/_NBoard/content.php?co_id=0412_jubileeWorship",
  churchLocationUrl:
    "https://www.sundoo.org/_NBoard/content.php?co_id=0106_location",
  postalCode: "22791",
  address: "인천광역시 서구 거북로109번길 10 (석남동 547-23)",
  shortAddress: "인천광역시 서구 거북로109번길 10",
  phoneDisplay: "032-574-7221~5",
  phoneHref: "tel:+82325747221",
  naverMapUrl: "https://map.naver.com/p/entry/place/12087641?placePath=%2Fhome",
  kakaoMapUrl: "https://place.map.kakao.com/9174591",
  logoPath: "/images/brand/logo-official-web-pwa-app-1024-source-locked.png",
  logoInversePath: "/images/brand/logo-official-web-pwa-app-1024-source-locked.png",
  heroDesktopPath: "/images/hero/hero-home-group-07-desktop-1920x1080.webp",
  heroMobilePath: "/images/gallery/sundoo-jubilee-01.webp",
  aboutImagePath: "/images/hero/about-community-960x610.webp",
  aboutImageAlt: "선두교회 본당에서 함께 찬양하는 쥬빌리워십 공동체",
  worshipImagePath: "/images/hero/worship-community-960x610.webp",
  worshipImageAlt: "예배 자리에서 함께 찬양하는 다음 세대 예배자들",
  visitImagePath: "/images/hero/visit-welcome-960x610.webp",
  visitImageAlt: "쥬빌리워십 현장에서 방문자를 맞이하는 안내 공간",
  ogImagePath: "/images/social/og-home-group-07-1200x630.png",
  seoTitle: "쥬빌리워십 | 인천 선두교회 예배사역팀",
  seoDescription:
    "인천 선두교회 쥬빌리워십 공식 홈페이지입니다. 다음 찬양집회 일정, 예배 영상, 팀 소개와 오시는 길을 확인하세요."
} as const;

export const events: WorshipEvent[] = [
  {
    id: "local-event-1",
    slug: "jubilee-worship-2026-09-04",
    title: "쥬빌리워십 찬양집회",
    startsAt: "2026-09-04T20:00:00+09:00",
    endsAt: null,
    timezone: "Asia/Seoul",
    venueName: "선두교회 본당",
    address: SITE.shortAddress,
    description: "누구나 함께 예배할 수 있습니다.",
    registrationUrl: null,
    heroMediaPath: null,
    status: "scheduled",
    featured: true,
    published: true,
    sourceUrl: "https://www.instagram.com/p/Dbsd2PlT6p3/"
  }
];

export const announcements: Announcement[] = [];

export const mediaItems: MediaItem[] = [
  {
    id: "local-media-1",
    slug: "jubilee-worship-live-2026-07",
    title: "[LIVE] 쥬빌리 워십 7월 찬양집회 | 주는 완전합니다",
    providerId: "E5mD29x_-dM",
    externalUrl: "https://www.youtube.com/watch?v=E5mD29x_-dM",
    sourceLabel: "Jubilee Worship(쥬빌리 워십)",
    thumbnailPath: "/images/media/youtube-featured-E5mD29x_-dM-1280x720.webp",
    thumbnailAlt: "쥬빌리워십 7월 찬양집회 주는 완전합니다 영상 썸네일",
    occurredOn: "2026-07-03",
    description: "쥬빌리워십 7월 찬양집회 예배 실황입니다.",
    featured: true,
    published: true
  }
];

export const teamMembers: TeamMember[] = [
  {
    id: "local-team-1",
    name: "김두진",
    roleTitle: "목사",
    category: "minister",
    photoPath: null,
    photoAlt: null,
    bio: null,
    sortOrder: 10,
    published: true
  },
  {
    id: "local-team-2",
    name: "최희락",
    roleTitle: "목사",
    category: "minister",
    photoPath: null,
    photoAlt: null,
    bio: null,
    sortOrder: 20,
    published: true
  },
  {
    id: "local-team-3",
    name: "조예희",
    roleTitle: "전도사",
    category: "minister",
    photoPath: null,
    photoAlt: null,
    bio: null,
    sortOrder: 30,
    published: true
  }
];

export const gallery: GalleryImage[] = [
  {
    path: "/images/gallery/sundoo-jubilee-01.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-01-640.webp",
    alt: "선두교회 본당에서 함께 찬양하는 다음 세대 예배자들"
  },
  {
    path: "/images/gallery/sundoo-jubilee-02.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-02-640.webp",
    alt: "선두교회 예배 자리에서 기도하는 예배자들"
  },
  {
    path: "/images/gallery/sundoo-jubilee-03.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-03-640.webp",
    alt: "손을 들고 찬양하는 다음 세대 예배자들"
  },
  {
    path: "/images/gallery/sundoo-jubilee-04.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-04-640.webp",
    alt: "쥬빌리워십 현장 안내 부스에서 방문자를 맞이하는 스태프"
  },
  {
    path: "/images/gallery/sundoo-jubilee-06.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-06-640.webp",
    alt: "선두교회 본당 무대에 함께 모인 쥬빌리워십 공동체"
  },
  {
    path: "/images/gallery/sundoo-jubilee-07.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-07-640.webp",
    alt: "선두교회 본당 무대에서 자유롭게 포즈를 취한 쥬빌리워십 공동체"
  },
  {
    path: "/images/gallery/sundoo-jubilee-08.webp",
    thumbnail: "/images/gallery/thumbs/sundoo-jubilee-08-640.webp",
    alt: "웰컴 투 쥬빌리워십 안내 이미지"
  }
];

export const vision = [
  {
    number: "01",
    eyebrow: "WORSHIP",
    title: "예배를 세웁니다",
    description:
      "무대 위의 찬양을 넘어, 우리의 삶과 공동체 안에 예배가 바로 서기를 소망합니다."
  },
  {
    number: "02",
    eyebrow: "GENERATION",
    title: "세대를 잇습니다",
    description:
      "청소년과 청년, 그리고 모든 세대가 한 자리에서 함께 하나님을 예배합니다."
  },
  {
    number: "03",
    eyebrow: "INCHEON",
    title: "지역을 섬깁니다",
    description:
      "선두교회를 넘어 인천 지역의 다음 세대를 섬기는 예배의 자리를 꿈꿉니다."
  }
] as const;

export function getNextEvent(now = new Date()): WorshipEvent | null {
  return (
    events
      .filter(
        (event) =>
          event.published &&
          ["scheduled", "postponed"].includes(event.status) &&
          new Date(event.startsAt).getTime() >= now.getTime()
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null
  );
}

export function getActiveAnnouncements(now = new Date()): Announcement[] {
  const nowMs = now.getTime();
  return announcements
    .filter((notice) => {
      if (!notice.published) return false;
      if (notice.startsAt && Date.parse(notice.startsAt) > nowMs) return false;
      if (notice.expiresAt && Date.parse(notice.expiresAt) <= nowMs) return false;
      return true;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
}
