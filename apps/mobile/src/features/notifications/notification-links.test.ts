import { describe, expect, it } from "vitest";
import { safeNotificationLinkForVariant } from "./notification-links";

describe("safeNotificationLink", () => {
  it("accepts only app-owned destinations", () => {
    expect(safeNotificationLinkForVariant(
      "jubileeworship://worship/september-worship",
      "development"
    )).toBe("jubileeworship-dev://worship/september-worship");
    expect(safeNotificationLinkForVariant(
      "jubileeworship-preview://worship/september-worship/songlist",
      "development"
    )).toBe("jubileeworship-dev://worship/september-worship/songlist");
    expect(safeNotificationLinkForVariant(
      "jubileeworship://notifications",
      "production"
    )).toBe(
      "jubileeworship://notifications"
    );
    expect(safeNotificationLinkForVariant(
      "jubileeworship://worship",
      "preview"
    )).toBe("jubileeworship-preview://worship");
  });

  it("rejects external and malformed links", () => {
    expect(safeNotificationLinkForVariant("https://example.com/phishing", "preview")).toBeNull();
    expect(safeNotificationLinkForVariant("jubileeworship://../../admin", "preview")).toBeNull();
    expect(safeNotificationLinkForVariant(
      { url: "jubileeworship://notifications" },
      "preview"
    )).toBeNull();
  });
});
