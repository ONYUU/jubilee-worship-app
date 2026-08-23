export const SITE = {
  timezone: "Asia/Seoul",
  name_ko: "쥬빌리워십",
  name_en: "JUBILEE WORSHIP",
  instagram_handle: "jubilee_worship_",
  instagram_url: "https://www.instagram.com/jubilee_worship_/",
  youtube_handle: "@JUBILEEWORSHIP-25",
  youtube_channel_url: "https://www.youtube.com/@JUBILEEWORSHIP-25",
  youtube_channel_id: "UCxmosyyztNo7HBUOdN_gy9w",
  church_name: "선두교회",
  church_url: "https://www.sundoo.org/",
  church_jubilee_url:
    "https://www.sundoo.org/_NBoard/content.php?co_id=0412_jubileeWorship",
  church_location_url:
    "https://www.sundoo.org/_NBoard/content.php?co_id=0106_location",
  venue_name: "선두교회 본당",
  postal_code: "22791",
  address: "인천광역시 서구 거북로109번길 10 (석남동 547-23)",
  address_road: "인천광역시 서구 거북로109번길 10",
  address_lot: "인천광역시 서구 석남동 547-23",
  phone_display: "032-574-7221~5",
  phone_href: "+82-32-574-7221",
  contact_email: "sundoojubileeworship@gmail.com",
  naver_map_url:
    "https://map.naver.com/p/entry/place/12087641?placePath=%2Fhome",
  kakao_map_url: "https://place.map.kakao.com/9174591",
  next_event: {
    title: "쥬빌리워십 찬양집회",
    starts_at: "2026-09-04T20:00:00+09:00",
    venue_name: "선두교회 본당",
    source_url: "https://www.instagram.com/p/Dbsd2PlT6p3/"
  }
} as const;

export const YOUTUBE_VIDEO_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com"
] as const;

export const APPROVED_YOUTUBE_CHANNEL_IDS = [SITE.youtube_channel_id] as const;

/** Canonical locator prefix for objects in the public-media Storage bucket. */
export const PUBLIC_MEDIA_URI_PREFIX = "storage://public-media/" as const;

/**
 * Versioned, separate consent required before registering any notification
 * choice that can reveal an interest in religious worship. Keep this value in
 * sync with the database and Edge Function contract.
 */
export const SENSITIVE_INTEREST_NOTIFICATION_CONSENT = {
  version: "sensitive-interest-notifications-v5",
  policyVersion: "1.0.0",
  draftedOn: "2026-08-24",
  locale: "ko-KR",
  disclosureSha256: "575ecb39ce1c1670e169e5fdae28587b09477a765a80c6dcfdb5df2f170a5f0e"
} as const;

/**
 * URLs whose publisher was verified against the current Jubilee Worship
 * channel. Additions require the same explicit editorial verification.
 */
export const APPROVED_YOUTUBE_VIDEO_IDS = [
  "E5mD29x_-dM",
  "O2mNdkl5q54"
] as const;

export const EVENT_STATUSES = [
  "scheduled",
  "postponed",
  "cancelled",
  "completed"
] as const;

export const ANNOUNCEMENT_KINDS = [
  "normal",
  "important",
  "schedule_change",
  "cancellation"
] as const;

export const MEDIA_KINDS = [
  "youtube_video",
  "youtube_playlist",
  "instagram_post",
  "image"
] as const;

export const MEDIA_PROVIDERS = ["youtube", "instagram", "internal"] as const;

export const TEAM_MEMBER_CATEGORIES = [
  "minister",
  "worship_leader",
  "vocal",
  "session",
  "staff"
] as const;
