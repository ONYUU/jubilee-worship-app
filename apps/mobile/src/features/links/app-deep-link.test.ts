import { describe, expect, it } from "vitest";

import {
  appSchemeForVariant,
  createAppDeepLinkForVariant,
  normalizeAppDeepLinkForVariant
} from "./app-deep-link";

describe("variant-specific app deep links", () => {
  it.each([
    ["development", "jubileeworship-dev"],
    ["preview", "jubileeworship-preview"],
    ["production", "jubileeworship"]
  ] as const)("maps %s to its isolated scheme", (variant, scheme) => {
    expect(appSchemeForVariant(variant)).toBe(scheme);
    expect(createAppDeepLinkForVariant("notifications", variant)).toBe(
      `${scheme}://notifications`
    );
  });

  it("normalizes a production campaign link to the installed app variant", () => {
    expect(
      normalizeAppDeepLinkForVariant(
        "jubileeworship://worship/september-worship/songlist",
        "preview"
      )
    ).toBe("jubileeworship-preview://worship/september-worship/songlist");
  });

  it.each([
    "notifications",
    "notification-settings",
    "privacy",
    "worship",
    "media",
    "guide",
    "worship/september-worship",
    "worship/september-worship/songlist"
  ])("supports the known app destination %s", (path) => {
    expect(
      normalizeAppDeepLinkForVariant(`jubileeworship://${path}`, "preview")
    ).toBe(`jubileeworship-preview://${path}`);
  });

  it.each([
    "https://example.com/phishing",
    "jubileeworship://../../admin",
    "jubileeworship-preview://worship/slug/unknown",
    "jubileeworship-dev://worship/%2e%2e/admin"
  ])("rejects unsafe destination %s", (value) => {
    expect(normalizeAppDeepLinkForVariant(value, "development")).toBeNull();
  });
});
