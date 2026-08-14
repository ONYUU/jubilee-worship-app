import { describe, expect, it } from "vitest";
import { createLocalContent } from "./local-content";
import { filterTimeSensitiveContent } from "./visibility";

describe("mobile time-sensitive content", () => {
  it("keeps only announcements that have started and not expired", () => {
    const content = createLocalContent(new Date("2026-08-15T00:00:00+09:00"));
    content.announcements = [
      {
        id: 1,
        slug: "visible",
        event_id: null,
        kind: "normal",
        title: "visible",
        body: "visible",
        starts_at: "2026-08-14T00:00:00+09:00",
        expires_at: "2026-08-16T00:00:00+09:00",
        pinned: false
      },
      {
        id: 2,
        slug: "future",
        event_id: null,
        kind: "normal",
        title: "future",
        body: "future",
        starts_at: "2026-08-16T00:00:00+09:00",
        expires_at: null,
        pinned: false
      },
      {
        id: 3,
        slug: "expired",
        event_id: null,
        kind: "normal",
        title: "expired",
        body: "expired",
        starts_at: null,
        expires_at: "2026-08-15T00:00:00+09:00",
        pinned: false
      }
    ];

    expect(
      filterTimeSensitiveContent(
        content,
        new Date("2026-08-15T00:00:00+09:00")
      ).announcements.map((announcement) => announcement.slug)
    ).toEqual(["visible"]);
  });
});
