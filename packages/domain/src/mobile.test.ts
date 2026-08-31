import { describe, expect, it } from "vitest";
import {
  mobileAppDeepLinkSchema,
  mobilePublicEventSchema,
  mobilePublicSiteSchema,
  mobilePublicSetlistSchema,
  youtubeListeningUrlSchema
} from "./mobile";

describe("mobile public contracts", () => {
  it("accepts administrator-managed home and visit images", () => {
    const site = mobilePublicSiteSchema.parse({
      name_ko: "쥬빌리워십",
      name_en: "Jubilee Worship",
      hero_title: "예배",
      hero_description: "함께 예배합니다.",
      hero_media_path: "/images/home.webp",
      hero_media_mobile_path: "/images/home-mobile.webp",
      hero_media_alt: "함께 예배하는 공동체",
      visit_media_path: "/images/visit.webp",
      visit_media_alt: "예배당 안내 사진",
      instagram_url: "https://www.instagram.com/jubilee_worship_/",
      youtube_channel_url: "https://www.youtube.com/@JUBILEEWORSHIP-25",
      church_name: "선두교회",
      church_url: "https://www.sundoo.org/",
      address: "인천광역시 서구 거북로109번길 10",
      phone_display: "032-574-7221",
      naver_map_url: "https://map.naver.com/",
      kakao_map_url: "https://map.kakao.com/",
      about_title: "소개",
      about_body: "쥬빌리워십 소개 본문"
    });

    expect(site.hero_media_mobile_path).toBe("/images/home-mobile.webp");
    expect(site.visit_media_path).toBe("/images/visit.webp");
  });

  it("accepts an event without published sermon information", () => {
    expect(
      mobilePublicEventSchema.parse({
        id: 1,
        slug: "worship-2026-09-04",
        title: "쥬빌리워십 찬양집회",
        starts_at: "2026-09-04T20:00:00+09:00",
        ends_at: null,
        timezone: "Asia/Seoul",
        venue_name: "선두교회 본당",
        address: "인천광역시 서구 거북로109번길 10",
        description: null,
        registration_url: null,
        hero_media_path: null,
        status: "scheduled",
        featured: true,
        source_url: "https://www.instagram.com/p/Dbsd2PlT6p3/",
        sermon_topic: null,
        scripture_reference: null
      }).sermon_topic
    ).toBeNull();
  });

  it("rejects duplicate song positions", () => {
    const result = mobilePublicSetlistSchema.safeParse({
      event_id: 1,
      event_slug: "worship-2026-09-04",
      revision_no: 1,
      published_at: "2026-09-01T10:00:00+09:00",
      playlist_url: null,
      is_changed: false,
      items: [
        { id: 1, position: 1, title: "곡 하나", artist: null, youtube_url: null },
        { id: 2, position: 1, title: "곡 둘", artist: null, youtube_url: null }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("allows only YouTube listening links", () => {
    expect(youtubeListeningUrlSchema.safeParse("https://youtu.be/E5mD29x_-dM").success).toBe(
      true
    );
    expect(youtubeListeningUrlSchema.safeParse("https://example.com/song").success).toBe(false);
  });

  it.each([
    "jubileeworship://notifications",
    "jubileeworship://notification-settings",
    "jubileeworship://privacy",
    "jubileeworship://worship",
    "jubileeworship://media",
    "jubileeworship://guide",
    "jubileeworship://worship/september-worship",
    "jubileeworship://worship/september-worship/songlist"
  ])("accepts the known app destination %s", (value) => {
    expect(mobileAppDeepLinkSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    "jubileeworship://notificaitons",
    "jubileeworship://../../admin",
    "jubileeworship-preview://notifications",
    "https://example.com/phishing"
  ])("rejects the unsupported app destination %s", (value) => {
    expect(mobileAppDeepLinkSchema.safeParse(value).success).toBe(false);
  });
});
