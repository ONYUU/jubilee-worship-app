import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as Notifications from "expo-notifications";
import {
  mergeNotificationHistory,
  parseNotificationHistory,
  type ReceivedNotificationHistoryItem
} from "./notification-history-data";
import { safeNotificationLink } from "./notification-links";
import { currentAppVariant } from "../links/current-app-deep-link";

const HISTORY_KEY = "jubilee.notifications.received.v1";
const listeners = new Set<(items: ReceivedNotificationHistoryItem[]) => void>();
let writeQueue: Promise<void> = Promise.resolve();

async function readStoredHistory(): Promise<ReceivedNotificationHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return parseNotificationHistory(
      JSON.parse(raw) as unknown,
      new Date(),
      currentAppVariant() ?? "production"
    );
  } catch {
    return [];
  }
}

export async function loadReceivedNotificationHistory(): Promise<
  ReceivedNotificationHistoryItem[]
> {
  return readStoredHistory();
}

export function subscribeReceivedNotificationHistory(
  listener: (items: ReceivedNotificationHistoryItem[]) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordReceivedNotification(
  notification: Notifications.Notification
): Promise<void> {
  const task = writeQueue.then(async () => {
    const content = notification.request.content;
    const title = content.title?.trim().slice(0, 200) || "쥬빌리워십 알림";
    const body = content.body?.trim().slice(0, 2_000) || null;
    const deliveredAt = Number.isFinite(notification.date) && notification.date > 0
      ? new Date(notification.date)
      : new Date();
    const variant = currentAppVariant() ?? "production";
    const received: ReceivedNotificationHistoryItem = {
      id: notification.request.identifier.slice(0, 200) || `${deliveredAt.getTime()}`,
      title,
      body,
      receivedAt: deliveredAt.toISOString(),
      url: safeNotificationLink(content.data?.url, variant)
    };
    const current = await readStoredHistory();
    const next = mergeNotificationHistory(current, received, new Date(), variant);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    for (const listener of listeners) listener(next);
  });
  writeQueue = task.catch(() => undefined);
  return task;
}
