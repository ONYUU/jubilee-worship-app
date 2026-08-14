import { safeNotificationLink } from "./notification-links";

export const NOTIFICATION_HISTORY_LIMIT = 50;
export const NOTIFICATION_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export type ReceivedNotificationHistoryItem = {
  id: string;
  title: string;
  body: string | null;
  receivedAt: string;
  url: string | null;
};

function isHistoryItem(value: unknown): value is ReceivedNotificationHistoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 200 &&
    typeof candidate.title === "string" &&
    candidate.title.length > 0 &&
    candidate.title.length <= 200 &&
    (candidate.body === null ||
      (typeof candidate.body === "string" && candidate.body.length <= 2_000)) &&
    typeof candidate.receivedAt === "string" &&
    Number.isFinite(Date.parse(candidate.receivedAt)) &&
    (candidate.url === null || safeNotificationLink(candidate.url) === candidate.url)
  );
}

export function parseNotificationHistory(
  value: unknown,
  now = new Date()
): ReceivedNotificationHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const cutoff = now.getTime() - NOTIFICATION_HISTORY_RETENTION_MS;
  return value
    .filter(isHistoryItem)
    .filter((item) => Date.parse(item.receivedAt) >= cutoff)
    .sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt))
    .slice(0, NOTIFICATION_HISTORY_LIMIT);
}

export function mergeNotificationHistory(
  current: readonly ReceivedNotificationHistoryItem[],
  received: ReceivedNotificationHistoryItem,
  now = new Date()
): ReceivedNotificationHistoryItem[] {
  return parseNotificationHistory(
    [received, ...current.filter((item) => item.id !== received.id)],
    now
  );
}
