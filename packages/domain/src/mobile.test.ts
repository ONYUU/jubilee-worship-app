import { describe, expect, it } from "vitest";
import {
  mobilePublicEventSchema,
  mobilePublicSetlistSchema,
  youtubeListeningUrlSchema
} from "./mobile";

describe("mobile public contracts", () => {
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
});
