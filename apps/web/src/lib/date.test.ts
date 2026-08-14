import { describe, expect, it } from "vitest";
import { formatEventDate, getSeoulDday } from "./date";

describe("Seoul event dates", () => {
  it("computes D-Day from Seoul calendar dates", () => {
    expect(getSeoulDday("2026-09-04T20:00:00+09:00", new Date("2026-09-03T15:30:00Z"))).toBe("TODAY");
    expect(getSeoulDday("2026-09-04T20:00:00+09:00", new Date("2026-09-02T15:30:00Z"))).toBe("D-1");
  });

  it("formats the verified event in Seoul", () => {
    const result = formatEventDate("2026-09-04T20:00:00+09:00");
    expect(result.day).toBe("04");
    expect(result.weekday).toBe("FRI");
    expect(result.time).toContain("8:00");
  });
});
