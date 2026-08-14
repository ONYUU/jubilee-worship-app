import { describe, expect, it } from "vitest";
import { createLocalContent } from "./local-content";
import { formatDday, partitionMobileEvents, selectNextMobileEvent, selectSetlistForEvent } from "./selectors";

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

  it("classifies cached events against the current time", () => {
    const content = createLocalContent(new Date("2026-08-15T00:00:00+09:00"));
    const result = partitionMobileEvents(content.events, new Date("2026-09-05T00:00:00+09:00"));
    expect(result.upcoming).toHaveLength(0);
    expect(result.past.map((event) => event.id)).toEqual([1]);
  });
});
