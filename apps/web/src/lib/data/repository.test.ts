import { afterEach, describe, expect, it } from "vitest";
import type { WorshipEvent } from "./local-content";
import {
  resolvePublicMediaPath,
  selectNextPublicEvent,
  selectUpcomingPublicEvents
} from "./repository";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function event(
  id: string,
  startsAt: string,
  status: WorshipEvent["status"]
): WorshipEvent {
  return {
    id,
    slug: id,
    title: id,
    startsAt,
    endsAt: null,
    timezone: "Asia/Seoul",
    venueName: "선두교회 본당",
    address: "인천광역시 서구",
    description: "설명",
    registrationUrl: null,
    heroMediaPath: null,
    status,
    featured: false,
    published: true,
    sourceUrl: "https://example.com"
  };
}

afterEach(() => {
  if (originalSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }
});

describe("public event selection", () => {
  const now = new Date("2026-08-13T00:00:00+09:00");
  const cancelled = event("cancelled", "2026-08-14T20:00:00+09:00", "cancelled");
  const scheduled = event("scheduled", "2026-08-21T20:00:00+09:00", "scheduled");
  const completed = event("completed", "2026-08-28T20:00:00+09:00", "completed");

  it("does not promote a cancelled event as the next worship", () => {
    expect(selectNextPublicEvent([cancelled, scheduled], now)?.id).toBe("scheduled");
  });

  it("keeps a future cancellation visible while excluding completed events", () => {
    expect(selectUpcomingPublicEvents([scheduled, completed, cancelled], now).map(({ id }) => id)).toEqual([
      "cancelled",
      "scheduled"
    ]);
  });
});

describe("public Storage URL resolution", () => {
  it("encodes each object-key segment against the explicitly configured project URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321/";
    expect(resolvePublicMediaPath("storage://public-media/team/한 글.webp")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/public-media/team/%ED%95%9C%20%EA%B8%80.webp"
    );
  });

  it("requires a Supabase URL for a Storage locator", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => resolvePublicMediaPath("storage://public-media/hero/main.webp")).toThrow(
      "Supabase 설정"
    );
  });
});
