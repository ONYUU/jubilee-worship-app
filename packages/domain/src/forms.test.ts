import { describe, expect, it } from "vitest";
import { PUBLIC_MEDIA_URI_PREFIX, SITE } from "./constants";
import {
  announcementFormSchema,
  eventFormSchema,
  mediaFormSchema,
  settingsFormSchema,
  teamMemberFormSchema
} from "./forms";

describe("eventFormSchema", () => {
  it("normalizes an Object.fromEntries(FormData) shape to DB keys", () => {
    const result = eventFormSchema.parse({
      slug: "september-worship",
      title: " 쥬빌리워십 찬양집회 ",
      starts_at: "2026-09-04T20:00",
      ends_at: "",
      description: "",
      registration_url: "",
      hero_media_path: "",
      source_url: SITE.next_event.source_url,
      featured: "on"
    });

    expect(result).toEqual({
      slug: "september-worship",
      title: "쥬빌리워십 찬양집회",
      starts_at: "2026-09-04T20:00:00+09:00",
      ends_at: null,
      timezone: SITE.timezone,
      venue_name: SITE.venue_name,
      address: SITE.address_road,
      description: null,
      status: "scheduled",
      registration_url: null,
      hero_media_path: null,
      source_url: SITE.next_event.source_url,
      featured: true,
      published: false
    });
    expect("startsAt" in result).toBe(false);
  });

  it("normalizes offset-bearing times and common checkbox values", () => {
    const result = eventFormSchema.parse({
      slug: "september-worship",
      title: "집회",
      starts_at: "2026-09-04T11:00:00Z",
      ends_at: "2026-09-04T22:00",
      published: "1",
      featured: "false"
    });
    expect(result.starts_at).toBe("2026-09-04T20:00:00+09:00");
    expect(result.ends_at).toBe("2026-09-04T22:00:00+09:00");
    expect(result.published).toBe(true);
    expect(result.featured).toBe(false);
  });

  it("rejects an invalid or non-increasing time range", () => {
    expect(
      eventFormSchema.safeParse({
        slug: "invalid-date",
        title: "집회",
        starts_at: "2026-02-29T20:00"
      }).success
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        slug: "invalid-range",
        title: "집회",
        starts_at: "2026-09-04T20:00",
        ends_at: "2026-09-04T19:00"
      }).success
    ).toBe(false);
  });
});

describe("announcementFormSchema", () => {
  it("coerces foreign-key and boolean FormData strings", () => {
    const result = announcementFormSchema.parse({
      slug: "event-notice",
      event_id: "42",
      kind: "schedule_change",
      title: "일정 안내",
      body: "일정이 변경되었습니다.",
      starts_at: "2026-08-13T12:00",
      expires_at: "2026-09-04T20:00",
      pinned: "yes",
      published: "on"
    });
    expect(result.event_id).toBe(42);
    expect(result.pinned).toBe(true);
    expect(result.published).toBe(true);
    expect(result.starts_at).toBe("2026-08-13T12:00:00+09:00");
  });

  it("maps omitted and blank nullable values to null", () => {
    const result = announcementFormSchema.parse({
      slug: "general-notice",
      event_id: "",
      title: "일반 공지",
      body: "공지 내용"
    });
    expect(result.event_id).toBeNull();
    expect(result.starts_at).toBeNull();
    expect(result.expires_at).toBeNull();
    expect(result.pinned).toBe(false);
    expect(result.published).toBe(false);
  });

  it("rejects non-integer IDs and inverted visibility windows", () => {
    expect(
      announcementFormSchema.safeParse({
        slug: "bad-id",
        event_id: "1.5",
        title: "공지",
        body: "내용"
      }).success
    ).toBe(false);
    expect(
      announcementFormSchema.safeParse({
        slug: "bad-window",
        title: "공지",
        body: "내용",
        starts_at: "2026-08-14T00:00",
        expires_at: "2026-08-13T00:00"
      }).success
    ).toBe(false);
  });
});

describe("mediaFormSchema", () => {
  it("derives the provider and ID from an approved YouTube URL", () => {
    const result = mediaFormSchema.parse({
      slug: "official-video",
      title: "공식 영상",
      kind: "youtube_video",
      external_url: "https://youtu.be/E5mD29x_-dM",
      sort_order: "7",
      featured: "on",
      published: "on"
    });
    expect(result.provider).toBe("youtube");
    expect(result.provider_id).toBe("E5mD29x_-dM");
    expect(result.sort_order).toBe(7);
    expect(result.external_url).toBe("https://youtu.be/E5mD29x_-dM");
  });

  it("accepts a syntactically valid URL for server-side publisher verification", () => {
    const result = mediaFormSchema.safeParse({
      slug: "publisher-check-video",
      title: "게시자 확인 영상",
      kind: "youtube_video",
      external_url: "https://youtu.be/AAAAAAAAAAA"
    });
    expect(result.success).toBe(true);
  });

  it("accepts canonical Storage image locators and requires alt text", () => {
    const input = {
      slug: "worship-photo",
      title: "예배 사진",
      kind: "image",
      thumbnail_path: `${PUBLIC_MEDIA_URI_PREFIX}gallery/worship.webp`,
      thumbnail_alt: "찬양 중인 예배팀"
    };
    const result = mediaFormSchema.parse(input);
    expect(result.provider).toBe("internal");
    expect(result.thumbnail_path).toBe(input.thumbnail_path);
    expect(result.sort_order).toBe(100);
    expect(result.external_url).toBeNull();

    expect(
      mediaFormSchema.safeParse({ ...input, thumbnail_alt: "" }).success
    ).toBe(false);
  });

  it("rejects a bare Storage object key", () => {
    expect(
      mediaFormSchema.safeParse({
        slug: "ambiguous-photo",
        title: "예배 사진",
        kind: "image",
        thumbnail_path: "gallery/worship.webp",
        thumbnail_alt: "예배 사진"
      }).success
    ).toBe(false);
  });

  it("derives Instagram and playlist providers", () => {
    expect(
      mediaFormSchema.parse({
        slug: "instagram-event",
        title: "집회 안내",
        kind: "instagram_post",
        external_url: SITE.next_event.source_url
      }).provider
    ).toBe("instagram");
    expect(
      mediaFormSchema.parse({
        slug: "youtube-playlist",
        title: "공식 재생목록",
        kind: "youtube_playlist",
        provider_id: "PL12345",
        external_url: "https://www.youtube.com/playlist?list=PL12345"
      }).provider
    ).toBe("youtube");
  });
});

describe("teamMemberFormSchema", () => {
  it("coerces sort order, defaults category, and maps blanks to null", () => {
    const result = teamMemberFormSchema.parse({
      name: " 홍길동 ",
      role_title: " 워십 리더 ",
      photo_path: "",
      photo_alt: "",
      bio: "",
      sort_order: "  ",
      published: "on"
    });
    expect(result).toMatchObject({
      name: "홍길동",
      role_title: "워십 리더",
      category: "minister",
      photo_path: null,
      photo_alt: null,
      bio: null,
      sort_order: 100,
      published: true
    });
  });

  it("requires alt text for a member photo", () => {
    expect(
      teamMemberFormSchema.safeParse({
        name: "홍길동",
        role_title: "워십 리더",
        photo_path: "/images/member.webp"
      }).success
    ).toBe(false);
  });
});

describe("settingsFormSchema", () => {
  const content = {
    eyebrow: "WORSHIP TOGETHER",
    hero_title: "예배로 함께 서다",
    hero_description: "쥬빌리워십 공식 홈페이지입니다.",
    about_title: "ABOUT",
    about_body: "쥬빌리워십 소개",
    seo_title: "쥬빌리워십 | JUBILEE WORSHIP",
    seo_description: "쥬빌리워십 예배와 소식을 확인하세요."
  };

  it("fills verified immutable settings and nullable media fields", () => {
    const result = settingsFormSchema.parse(content);
    expect(result.youtube_channel_id).toBe(SITE.youtube_channel_id);
    expect(result.youtube_channel_url).toBe(SITE.youtube_channel_url);
    expect(result.instagram_url).toBe(SITE.instagram_url);
    expect(result.address).toBe(SITE.address);
    expect(result.hero_media_path).toBeNull();
    expect(result.hero_media_mobile_path).toBeNull();
  });

  it("rejects altered official identities", () => {
    expect(
      settingsFormSchema.safeParse({
        ...content,
        youtube_channel_id: "UC0000000000000000000000"
      }).success
    ).toBe(false);
  });

  it("requires alt text when only the mobile hero is populated", () => {
    expect(
      settingsFormSchema.safeParse({
        ...content,
        hero_media_mobile_path: "/images/mobile.webp"
      }).success
    ).toBe(false);
    expect(
      settingsFormSchema.safeParse({
        ...content,
        hero_media_mobile_path: "/images/mobile.webp",
        hero_media_alt: "모바일 예배 대표 이미지"
      }).success
    ).toBe(true);
  });
});
