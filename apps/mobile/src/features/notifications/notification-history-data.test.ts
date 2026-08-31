import { describe, expect, it } from "vitest";
import {
  mergeNotificationHistory,
  parseNotificationHistory,
  type ReceivedNotificationHistoryItem
} from "./notification-history-data";

const now = new Date("2026-08-15T12:00:00+09:00");

function item(
  id: string,
  receivedAt: string
): ReceivedNotificationHistoryItem {
  return { id, title: id, body: null, receivedAt, url: null };
}

describe("received notification history", () => {
  it("drops malformed and expired entries", () => {
    const parsed = parseNotificationHistory([
      item("recent", "2026-08-14T12:00:00+09:00"),
      item("expired", "2026-05-01T12:00:00+09:00"),
      { id: "missing-fields" },
      {
        ...item("unsafe-link", "2026-08-14T12:00:00+09:00"),
        url: "https://example.com/phishing"
      }
    ], now);

    expect(parsed.map((entry) => entry.id)).toEqual(["recent"]);
  });

  it("deduplicates a delivered notification identifier", () => {
    const merged = mergeNotificationHistory(
      [item("same", "2026-08-14T12:00:00+09:00")],
      item("same", "2026-08-15T11:00:00+09:00"),
      now
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.receivedAt).toBe("2026-08-15T11:00:00+09:00");
  });

  it("normalizes stored production links to the installed preview variant", () => {
    const parsed = parseNotificationHistory([
      {
        ...item("linked", "2026-08-14T12:00:00+09:00"),
        url: "jubileeworship://notifications"
      }
    ], now, "preview");

    expect(parsed[0]?.url).toBe("jubileeworship-preview://notifications");
  });
});
