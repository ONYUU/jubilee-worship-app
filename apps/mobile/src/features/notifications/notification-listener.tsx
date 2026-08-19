import { safeNotificationLink } from "./notification-links";
import { recordReceivedNotification } from "./notification-history";
import { refreshRegisteredNotificationToken } from "./client";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { currentAppVariant } from "../links/current-app-deep-link";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
}

async function openResponse(response: Notifications.NotificationResponse | null) {
  if (response) await recordReceivedNotification(response.notification).catch(() => undefined);
  const variant = currentAppVariant();
  const link = variant
    ? safeNotificationLink(response?.notification.request.content.data?.url, variant)
    : null;
  try {
    if (link) await Linking.openURL(link).catch(() => undefined);
  } finally {
    if (response) await Notifications.clearLastNotificationResponseAsync();
  }
}

export function NotificationListener() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      void recordReceivedNotification(notification).catch(() => undefined);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openResponse(response);
    });
    const tokenSubscription = Device.isDevice
      ? Notifications.addPushTokenListener((token) => {
          void refreshRegisteredNotificationToken(token).catch(() => undefined);
        })
      : null;
    if (Device.isDevice) {
      void refreshRegisteredNotificationToken().catch(() => undefined);
    }
    void Notifications.getLastNotificationResponseAsync().then(openResponse).catch(() => undefined);
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      tokenSubscription?.remove();
    };
  }, []);

  return null;
}
