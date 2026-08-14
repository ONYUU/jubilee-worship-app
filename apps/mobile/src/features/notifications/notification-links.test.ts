import { describe, expect, it } from "vitest";
import { safeNotificationLink } from "./notification-links";

describe("safeNotificationLink", () => {
  it("accepts only app-owned destinations", () => {
    expect(safeNotificationLink("jubileeworship://worship/september-worship"))
      .toBe("jubileeworship://worship/september-worship");
    expect(safeNotificationLink("jubileeworship://worship/september-worship/songlist"))
      .toBe("jubileeworship://worship/september-worship/songlist");
    expect(safeNotificationLink("jubileeworship://notifications")).toBe(
      "jubileeworship://notifications"
    );
  });

  it("rejects external and malformed links", () => {
    expect(safeNotificationLink("https://example.com/phishing")).toBeNull();
    expect(safeNotificationLink("jubileeworship://../../admin")).toBeNull();
    expect(safeNotificationLink({ url: "jubileeworship://notifications" })).toBeNull();
  });
});
