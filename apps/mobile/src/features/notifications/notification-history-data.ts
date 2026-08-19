import { safeNotificationLink } from "./notification-links";
import type { AppVariant } from "./app-variant";

export const NOTIFICATION_HISTORY_LIMIT = 50;
export const NOTIFICATION_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export type ReceivedNotificationHistoryItem = {
  id: string;
  title: string;
  body: string | null;
  receivedAt: string;
  url: string | null;
};

function normalizeHistoryItem(
  value: unknown,
  variant: AppVariant
): ReceivedNotificationHistoryItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const valid = (
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
    (candidate.url === null || typeof candidate.url === "string")
  );
  if (!valid) return null;
  const url = candidate.url === null
    ? null
    : safeNotificationLink(candidate.url, variant);
  if (candidate.url !== null && !url) return null;
  return {
    id: candidate.id as string,
    title: candidate.title as string,
    body: candidate.body as string | null,
    receivedAt: candidate.receivedAt as string,
    url
  };
}

export function parseNotificationHistory(
  value: unknown,
  now = new Date(),
  variant: AppVariant = "production"
): ReceivedNotificationHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const cutoff = now.getTime() - NOTIFICATION_HISTORY_RETENTION_MS;
  return value
    .map((item) => normalizeHistoryItem(item, variant))
    .filter((item): item is ReceivedNotificationHistoryItem => item !== null)
    .filter((item) => Date.parse(item.receivedAt) >= cutoff)
    .sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt))
    .slice(0, NOTIFICATION_HISTORY_LIMIT);
}

export function mergeNotificationHistory(
  current: readonly ReceivedNotificationHistoryItem[],
  received: ReceivedNotificationHistoryItem,
  now = new Date(),
  variant: AppVariant = "production"
): ReceivedNotificationHistoryItem[] {
  return parseNotificationHistory(
    [received, ...current.filter((item) => item.id !== received.id)],
    now,
    variant
  );
}
