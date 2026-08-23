import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadReceivedNotificationHistory } from "./notification-history";
import type { ReceivedNotificationHistoryItem } from "./notification-history-data";

const storage = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  removeItem: vi.fn<(key: string) => Promise<void>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>()
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage
}));

vi.mock("../links/current-app-deep-link", () => ({
  currentAppVariant: () => "production"
}));

const HISTORY_KEY = "jubilee.notifications.received.v1";
const now = new Date("2026-08-24T12:00:00+09:00");
const recent: ReceivedNotificationHistoryItem = {
  id: "recent",
  title: "최근 알림",
  body: null,
  receivedAt: "2026-08-23T12:00:00+09:00",
  url: null
};
const expired: ReceivedNotificationHistoryItem = {
  id: "expired",
  title: "만료 알림",
  body: "90일이 지난 알림",
  receivedAt: "2026-05-01T12:00:00+09:00",
  url: null
};

describe("stored notification history cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    storage.getItem.mockReset();
    storage.removeItem.mockReset().mockResolvedValue(undefined);
    storage.setItem.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the pruned history back when valid and expired entries coexist", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([expired, recent]));

    await expect(loadReceivedNotificationHistory()).resolves.toEqual([recent]);

    expect(storage.setItem).toHaveBeenCalledWith(
      HISTORY_KEY,
      JSON.stringify([recent])
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("removes the storage key when every stored entry has expired", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([expired]));

    await expect(loadReceivedNotificationHistory()).resolves.toEqual([]);

    expect(storage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("still returns valid entries when writing the cleanup fails", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([expired, recent]));
    storage.setItem.mockRejectedValue(new Error("storage unavailable"));

    await expect(loadReceivedNotificationHistory()).resolves.toEqual([recent]);
    expect(storage.setItem).toHaveBeenCalledWith(
      HISTORY_KEY,
      JSON.stringify([recent])
    );
  });

  it("removes malformed stored JSON so notification text cannot remain indefinitely", async () => {
    storage.getItem.mockResolvedValue('{"title":"손상된 알림 본문"');

    await expect(loadReceivedNotificationHistory()).resolves.toEqual([]);

    expect(storage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("fails closed when malformed-history cleanup is temporarily unavailable", async () => {
    storage.getItem.mockResolvedValue('{"title":"손상된 알림 본문"');
    storage.removeItem.mockRejectedValue(new Error("storage unavailable"));

    await expect(loadReceivedNotificationHistory()).resolves.toEqual([]);
    expect(storage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
  });
});
