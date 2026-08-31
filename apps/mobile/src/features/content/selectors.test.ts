import { describe, expect, it } from "vitest";
import { createLocalContent } from "./local-content";
import {
  formatDday,
  partitionMobileEvents,
  selectHomeHeroMediaPath,
  selectNextMobileEvent,
  selectSetlistForEvent
} from "./selectors";

describe("mobile content selectors", () => {
  it("selects the next scheduled worship", () => {
    const content = createLocalContent(new Date("2026-08-15T00:00:00+09:00"));
    expect(selectNextMobileEvent(content.events, new Date("2026-08-15T00:00:00+09:00"))?.id).toBe(1);
  });

  it("formats Seoul calendar day difference", () => {
    expect(formatDday("2026-09-04T20:00:00+09:00", new Date("2026-09-03T23:59:00+09:00"))).toBe("D-1");
  });

  it("does not invent a missing setlist", () => {
    expect(selectSetlistForEvent([], 1)).toBeNull();
  });

  it("uses the landscape website hero for the app and falls back to the mobile crop", () => {
    expect(
      selectHomeHeroMediaPath({
        hero_media_path: "/images/hero/desktop.webp",
        hero_media_mobile_path: "/images/hero/mobile.webp"
      })
    ).toBe("/images/hero/desktop.webp");
    expect(
      selectHomeHeroMediaPath({
        hero_media_path: null,
        hero_media_mobile_path: "/images/hero/mobile.webp"
      })
    ).toBe("/images/hero/mobile.webp");
  });

  it("classifies cached events against the current time", () => {
    const content = createLocalContent(new Date("2026-08-15T00:00:00+09:00"));
    const result = partitionMobileEvents(content.events, new Date("2026-09-05T00:00:00+09:00"));
    expect(result.upcoming).toHaveLength(0);
    expect(result.past.map((event) => event.id)).toEqual([1]);
  });
});
