import { describe, expect, it } from "vitest";
import { getSeoulDday, isValidDateOnly, normalizeSeoulDateTimeInput } from "./dates";
import type { Announcement, Event } from "./schemas";
import { selectActiveAnnouncements, selectNextEvent } from "./selectors";

const CREATED_AT = "2026-08-01T09:00:00+09:00";

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    slug: "september-worship",
    title: "쥬빌리워십 찬양집회",
    starts_at: "2026-09-04T20:00:00+09:00",
    ends_at: null,
    timezone: "Asia/Seoul",
    venue_name: "선두교회 본당",
    address: "인천광역시 서구 거북로109번길 10",
    description: null,
    status: "scheduled",
    registration_url: null,
    hero_media_path: null,
    source_url: "https://www.instagram.com/p/Dbsd2PlT6p3/",
    featured: false,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 1,
    slug: "notice-one",
    event_id: null,
    kind: "normal",
    title: "공지",
    body: "공지 내용",
    starts_at: null,
    expires_at: null,
    pinned: false,
    published: true,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

describe("Asia/Seoul date utilities", () => {
  it.each([
    ["2026-09-04T20:00", "2026-09-04T20:00:00+09:00"],
    ["2026-09-04T20:00:05", "2026-09-04T20:00:05+09:00"],
    ["2026-09-04T20:00:05.1", "2026-09-04T20:00:05.100+09:00"],
    ["2026-09-04T11:00:00Z", "2026-09-04T20:00:00+09:00"],
    ["2026-09-04T21:00:00+10:00", "2026-09-04T20:00:00+09:00"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSeoulDateTimeInput(input)).toBe(expected);
  });

  it.each([
    "",
    "2026-02-29T20:00",
    "2026-13-01T20:00",
    "2026-09-04T24:00",
    "2026-09-04 20:00",
    "2026-09-04"
  ])("rejects invalid or ambiguous local input: %s", (input) => {
    expect(normalizeSeoulDateTimeInput(input)).toBeNull();
  });

  it("validates calendar dates rather than only their shape", () => {
    expect(isValidDateOnly("2028-02-29")).toBe(true);
    expect(isValidDateOnly("2026-02-29")).toBe(false);
    expect(isValidDateOnly("2026-9-4")).toBe(false);
  });

  it("computes D-Day using Seoul calendar boundaries", () => {
    const target = "2026-09-04T20:00:00+09:00";
    expect(getSeoulDday(target, "2026-09-03T14:59:59Z")).toBe(1);
    expect(getSeoulDday(target, "2026-09-03T15:00:00Z")).toBe(0);
    expect(getSeoulDday(target, "2026-09-05T00:00:00+09:00")).toBe(-1);
  });

  it("throws for an invalid D-Day input", () => {
    expect(() => getSeoulDday("not-a-date")).toThrow(RangeError);
  });
});

describe("selectNextEvent", () => {
  it("returns the earliest public upcoming scheduled or postponed event", () => {
    const events = [
      event({ id: 7, slug: "late", starts_at: "2026-10-01T20:00:00+09:00" }),
      event({ id: 4, slug: "private", published: false }),
      event({ id: 5, slug: "cancelled", status: "cancelled" }),
      event({ id: 6, slug: "past", starts_at: "2026-08-01T20:00:00+09:00" }),
      event({ id: 3, slug: "postponed", status: "postponed" })
    ];

    expect(selectNextEvent(events, "2026-08-13T12:00:00+09:00")?.id).toBe(3);
  });

  it("treats an event starting exactly now as upcoming", () => {
    const value = event();
    expect(selectNextEvent([value], value.starts_at)).toEqual(value);
  });

  it("uses featured and then id as deterministic tie-breakers", () => {
    const events = [
      event({ id: 4, slug: "regular" }),
      event({ id: 8, slug: "featured-eight", featured: true }),
      event({ id: 2, slug: "featured-two", featured: true })
    ];
    expect(selectNextEvent(events, "2026-08-13T12:00:00+09:00")?.id).toBe(2);
  });

  it("returns null and does not mutate the input", () => {
    const values = [event({ id: 2, slug: "second" }), event({ id: 1, slug: "first" })];
    const ids = values.map(({ id }) => id);
    selectNextEvent(values, "2026-08-13T12:00:00+09:00");
    expect(values.map(({ id }) => id)).toEqual(ids);
    expect(selectNextEvent([], "2026-08-13T12:00:00+09:00")).toBeNull();
  });
});

describe("selectActiveAnnouncements", () => {
  const now = "2026-08-13T12:00:00+09:00";

  it("uses inclusive starts and exclusive expirations", () => {
    const active = announcement({ id: 1, slug: "active", starts_at: now });
    const expired = announcement({ id: 2, slug: "expired", expires_at: now });
    const future = announcement({
      id: 3,
      slug: "future",
      starts_at: "2026-08-13T12:00:01+09:00"
    });
    const privateNotice = announcement({ id: 4, slug: "private", published: false });

    expect(selectActiveAnnouncements([expired, future, privateNotice, active], now)).toEqual([
      active
    ]);
  });

  it("sorts pinned first, then newest start, creation, and id", () => {
    const values = [
      announcement({ id: 1, slug: "unpinned", starts_at: "2026-08-10T12:00:00+09:00" }),
      announcement({ id: 2, slug: "pinned-old", pinned: true }),
      announcement({ id: 3, slug: "pinned-new", pinned: true, starts_at: now })
    ];

    expect(selectActiveAnnouncements(values, now).map(({ id }) => id)).toEqual([3, 2, 1]);
  });

  it("does not mutate the input", () => {
    const values = [announcement({ id: 2, slug: "second" }), announcement({ id: 1 })];
    const ids = values.map(({ id }) => id);
    selectActiveAnnouncements(values, now);
    expect(values.map(({ id }) => id)).toEqual(ids);
  });
});
