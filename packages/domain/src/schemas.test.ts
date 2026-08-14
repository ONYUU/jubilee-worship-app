import { describe, expect, it } from "vitest";
import { SITE } from "./constants";
import {
  announcementSchema,
  eventSchema,
  mediaItemSchema,
  mediaPathSchema,
  siteSettingsSchema,
  teamMemberSchema,
  type Announcement,
  type Event,
  type MediaItem,
  type SiteSettings,
  type TeamMember
} from "./schemas";

const CREATED_AT = "2026-08-01T09:00:00+09:00";

function validEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    slug: "september-worship",
    title: "쥬빌리워십 찬양집회",
    starts_at: SITE.next_event.starts_at,
    ends_at: "2026-09-04T22:00:00+09:00",
    timezone: SITE.timezone,
    venue_name: SITE.venue_name,
    address: SITE.address_road,
    description: null,
    status: "scheduled",
    registration_url: null,
    hero_media_path: null,
    source_url: SITE.next_event.source_url,
    featured: true,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function validAnnouncement(
  overrides: Partial<Announcement> = {}
): Announcement {
  return {
    id: 1,
    slug: "september-notice",
    event_id: 1,
    kind: "important",
    title: "집회 안내",
    body: "집회 안내 내용",
    starts_at: "2026-08-01T00:00:00+09:00",
    expires_at: "2026-09-05T00:00:00+09:00",
    pinned: true,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function validMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 1,
    slug: "official-youtube-video",
    title: "공식 영상",
    kind: "youtube_video",
    provider: "youtube",
    provider_id: "E5mD29x_-dM",
    external_url: "https://www.youtube.com/watch?v=E5mD29x_-dM",
    source_label: "JUBILEE WORSHIP YouTube",
    thumbnail_path: null,
    thumbnail_alt: null,
    occurred_on: "2026-08-01",
    description: null,
    featured: true,
    sort_order: 10,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function validTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 1,
    name: "홍길동",
    role_title: "워십 리더",
    category: "worship_leader",
    photo_path: null,
    photo_alt: null,
    bio: null,
    sort_order: 10,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function validSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    id: 1,
    name_ko: SITE.name_ko,
    name_en: SITE.name_en,
    eyebrow: "WORSHIP TOGETHER",
    hero_title: "예배로 함께 서다",
    hero_description: "쥬빌리워십 공식 홈페이지입니다.",
    hero_media_path: "/images/hero.webp",
    hero_media_mobile_path: null,
    hero_media_alt: "찬양하는 쥬빌리워십",
    about_title: "ABOUT",
    about_body: "쥬빌리워십 소개",
    about_media_path: null,
    about_media_alt: null,
    worship_media_path: null,
    worship_media_alt: null,
    visit_media_path: null,
    visit_media_alt: null,
    og_media_path: "/images/og.webp",
    logo_primary_path: "/images/logo.svg",
    logo_inverse_path: "/images/logo-inverse.svg",
    instagram_url: SITE.instagram_url,
    youtube_channel_url: SITE.youtube_channel_url,
    youtube_channel_id: SITE.youtube_channel_id,
    church_name: SITE.church_name,
    church_url: SITE.church_url,
    church_jubilee_url: SITE.church_jubilee_url,
    church_location_url: SITE.church_location_url,
    address: SITE.address,
    phone_display: SITE.phone_display,
    phone_href: SITE.phone_href,
    contact_email: SITE.contact_email,
    naver_map_url: SITE.naver_map_url,
    kakao_map_url: SITE.kakao_map_url,
    seo_title: "쥬빌리워십 | JUBILEE WORSHIP",
    seo_description: "쥬빌리워십 예배와 소식을 확인하세요.",
    updated_at: CREATED_AT,
    updated_by: null,
    ...overrides
  };
}

describe("mediaPathSchema", () => {
  it.each([
    "/images/hero.webp",
    "storage://public-media/hero/2026/hero.webp",
    "https://cdn.example.com/hero.webp",
    "https://cdn.example.com/hero.webp?width=1600"
  ])("accepts an unambiguous media locator: %s", (value) => {
    expect(mediaPathSchema.parse(value)).toBe(value);
  });

  it.each([
    "hero/2026/hero.webp",
    "//cdn.example.com/hero.webp",
    "http://cdn.example.com/hero.webp",
    "storage://wrong-bucket/hero.webp",
    "storage://public-media/",
    "storage://public-media/../private/file",
    "storage://public-media/%2e%2e/private/file",
    "/images/../private/file",
    "/images/%2Fprivate/file",
    "javascript:alert(1)"
  ])("rejects an ambiguous or unsafe locator: %s", (value) => {
    expect(mediaPathSchema.safeParse(value).success).toBe(false);
  });
});

describe("database record schemas", () => {
  it("accepts a valid event and rejects an inverted time range", () => {
    expect(eventSchema.safeParse(validEvent()).success).toBe(true);
    expect(
      eventSchema.safeParse(
        validEvent({ ends_at: "2026-09-04T19:59:59+09:00" })
      ).success
    ).toBe(false);
  });

  it("pins the event timezone and validates slug format", () => {
    expect(eventSchema.safeParse({ ...validEvent(), timezone: "UTC" }).success).toBe(
      false
    );
    expect(eventSchema.safeParse({ ...validEvent(), slug: "Bad Slug" }).success).toBe(
      false
    );
  });

  it("validates announcement visibility ranges", () => {
    expect(announcementSchema.safeParse(validAnnouncement()).success).toBe(true);
    expect(
      announcementSchema.safeParse(
        validAnnouncement({ expires_at: "2026-07-31T23:59:59+09:00" })
      ).success
    ).toBe(false);
  });

  it("requires a matching YouTube provider and video ID", () => {
    expect(mediaItemSchema.safeParse(validMedia()).success).toBe(true);
    expect(
      mediaItemSchema.safeParse(validMedia({ provider_id: "O2mNdkl5q54" })).success
    ).toBe(false);
    expect(
      mediaItemSchema.safeParse(validMedia({ provider: "internal" })).success
    ).toBe(false);
  });

  it("validates playlist, Instagram, and internal-image combinations", () => {
    expect(
      mediaItemSchema.safeParse(
        validMedia({
          kind: "youtube_playlist",
          provider_id: "PL12345",
          external_url: "https://www.youtube.com/playlist?list=PL12345"
        })
      ).success
    ).toBe(true);
    expect(
      mediaItemSchema.safeParse(
        validMedia({
          kind: "instagram_post",
          provider: "instagram",
          provider_id: null,
          external_url: SITE.next_event.source_url
        })
      ).success
    ).toBe(true);
    expect(
      mediaItemSchema.safeParse(
        validMedia({
          kind: "image",
          provider: "internal",
          provider_id: null,
          external_url: null,
          thumbnail_path: "storage://public-media/gallery/photo.webp",
          thumbnail_alt: "예배 사진"
        })
      ).success
    ).toBe(true);
  });

  it("requires alternative text whenever member media is present", () => {
    expect(teamMemberSchema.safeParse(validTeamMember()).success).toBe(true);
    expect(
      teamMemberSchema.safeParse(
        validTeamMember({ photo_path: "/images/member.webp", photo_alt: null })
      ).success
    ).toBe(false);
  });

  it("pins verified site identities and requires shared mobile hero alt text", () => {
    expect(siteSettingsSchema.safeParse(validSettings()).success).toBe(true);
    expect(
      siteSettingsSchema.safeParse(
        validSettings({ youtube_channel_id: "UC0000000000000000000000" as never })
      ).success
    ).toBe(false);
    expect(
      siteSettingsSchema.safeParse(
        validSettings({
          hero_media_path: null,
          hero_media_mobile_path: "/images/mobile.webp",
          hero_media_alt: null
        })
      ).success
    ).toBe(false);
  });
});
