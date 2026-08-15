import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { resolveNotificationAppVariant } from "./app-variant";
import { isInvalidInstallationError, NotificationSetupError } from "./errors";

export { NotificationSetupError } from "./errors";

const INSTALLATION_KEY = "jubilee.push-installation.v1";
const PREFERENCES_KEY = "jubilee.push-preferences.v1";
let tokenRefreshInFlight: Promise<void> | null = null;

export type NotificationPreferences = {
  worshipReminder: boolean;
  scheduleChanges: boolean;
  setlistUpdates: boolean;
};

type InstallationCredentials = {
  installationId: string;
  installationSecret: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  worshipReminder: false,
  scheduleChanges: false,
  setlistUpdates: false
};

function isPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.worshipReminder === "boolean" &&
    typeof candidate.scheduleChanges === "boolean" &&
    typeof candidate.setlistUpdates === "boolean"
  );
}

function isCredentials(value: unknown): value is InstallationCredentials {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.installationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(candidate.installationId) &&
    typeof candidate.installationSecret === "string" &&
    candidate.installationSecret.length >= 32 &&
    candidate.installationSecret.length <= 128
  );
}

async function readCredentials(): Promise<InstallationCredentials | null> {
  if (Platform.OS === "web") return null;
  try {
    const raw = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPreferences(parsed)) return parsed;
    }
  } catch {
    // Corrupted optional preferences safely fall back to disabled.
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

async function writeCredentials(value: InstallationCredentials): Promise<void> {
  await SecureStore.setItemAsync(INSTALLATION_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function clearCredentials(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(INSTALLATION_KEY);
}

function publicConfig(): { url: string; key: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new NotificationSetupError("알림 서버 설정이 아직 연결되지 않았습니다.");
  }
  return { url, key };
}

function projectId(): string {
  const explicit = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const configured = Constants.expoConfig?.extra?.eas?.projectId;
  const easProject = Constants.easConfig?.projectId;
  const value = explicit ?? (typeof configured === "string" ? configured : null) ?? easProject;
  if (!value) {
    throw new NotificationSetupError("알림용 앱 프로젝트 연결이 아직 완료되지 않았습니다.");
  }
  return value;
}

function appVersion(): string {
  return Constants.expoConfig?.version ?? "0.1.0";
}

function appVariant() {
  return resolveNotificationAppVariant(Constants.expoConfig?.extra);
}

async function functionRequest<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = publicConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      let message = "알림 서버 요청을 완료하지 못했습니다.";
      let code = "notification_request_failed";
      try {
        const payload: unknown = await response.json();
        if (
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
        ) {
          message = payload.message;
        }
        if (
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
        ) {
          code = payload.error;
        }
      } catch {
        // Use the stable user-facing fallback when the server body is unavailable.
      }
      throw new NotificationSetupError(message, code, response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof NotificationSetupError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new NotificationSetupError("알림 서버 응답 시간이 초과됐습니다.");
    }
    throw new NotificationSetupError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    clearTimeout(timeout);
  }
}

async function expoPushToken(
  devicePushToken?: Notifications.DevicePushToken
): Promise<string> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new NotificationSetupError("푸시 알림은 iOS·Android 앱에서 설정할 수 있습니다.");
  }
  if (!Device.isDevice) {
    throw new NotificationSetupError("푸시 알림은 실제 기기에서만 등록할 수 있습니다.");
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("worship-updates", {
      name: "예배 소식",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#27658F"
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true }
    });
  }
  if (permissions.status !== "granted") {
    throw new NotificationSetupError(
      permissions.canAskAgain
        ? "알림 권한이 허용되지 않았습니다."
        : "기기 설정에서 쥬빌리워십 알림을 허용해 주세요."
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: projectId(),
    ...(devicePushToken ? { devicePushToken } : {})
  });
  return token.data;
}

async function registerInstallation(
  preferences: NotificationPreferences,
  token: string
): Promise<void> {
  const created = await functionRequest<InstallationCredentials>("register-installation", {
    platform: Platform.OS,
    appVersion: appVersion(),
    appVariant: appVariant(),
    expoPushToken: token,
    subscriptions: preferences
  });
  if (!isCredentials(created)) {
    throw new NotificationSetupError("알림 설치정보 응답이 올바르지 않습니다.");
  }
  await writeCredentials(created);
}

async function updateInstallation(
  credentials: InstallationCredentials,
  preferences: NotificationPreferences,
  token: string | null
): Promise<void> {
  await functionRequest<void>("update-notification-settings", {
    ...credentials,
    appVersion: appVersion(),
    appVariant: appVariant(),
    expoPushToken: token,
    subscriptions: preferences
  });
}

export async function loadNotificationPreferences(): Promise<{
  preferences: NotificationPreferences;
  registered: boolean;
  permission: Notifications.PermissionStatus | "unsupported";
}> {
  const preferences = await readPreferences();
  const registered = Boolean(await readCredentials());
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { preferences, registered: false, permission: "unsupported" };
  }
  const permission = (await Notifications.getPermissionsAsync()).status;
  return { preferences, registered, permission };
}

async function performRegisteredNotificationTokenRefresh(
  devicePushToken?: Notifications.DevicePushToken
): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const preferences = await readPreferences();
  if (!Object.values(preferences).some(Boolean)) return;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") return;

  const token = await expoPushToken(devicePushToken);
  const credentials = await readCredentials();
  if (!credentials) {
    await registerInstallation(preferences, token);
    return;
  }
  try {
    await updateInstallation(credentials, preferences, token);
  } catch (error) {
    if (!isInvalidInstallationError(error)) throw error;
    await clearCredentials();
    await registerInstallation(preferences, token);
  }
}

export function refreshRegisteredNotificationToken(
  devicePushToken?: Notifications.DevicePushToken
): Promise<void> {
  if (tokenRefreshInFlight) return tokenRefreshInFlight;
  const task = performRegisteredNotificationTokenRefresh(devicePushToken);
  tokenRefreshInFlight = task;
  void task.finally(() => {
    if (tokenRefreshInFlight === task) tokenRefreshInFlight = null;
  }).catch(() => undefined);
  return task;
}

export async function syncNotificationPreferences(
  preferences: NotificationPreferences
): Promise<{ registered: boolean }> {
  const credentials = await readCredentials();
  const wantsNotifications = Object.values(preferences).some(Boolean);

  if (!credentials && !wantsNotifications) {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return { registered: false };
  }

  const token = wantsNotifications ? await expoPushToken() : null;
  if (!credentials) {
    if (!token) return { registered: false };
    await registerInstallation(preferences, token);
  } else {
    try {
      await updateInstallation(credentials, preferences, token);
    } catch (error) {
      if (!isInvalidInstallationError(error)) throw error;
      await clearCredentials();
      if (!token) {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
        return { registered: false };
      }
      await registerInstallation(preferences, token);
    }
  }

  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  return { registered: true };
}

export async function unregisterNotifications(): Promise<void> {
  const credentials = await readCredentials();
  if (credentials) {
    try {
      await functionRequest<void>("unregister-installation", credentials);
    } catch (error) {
      if (!isInvalidInstallationError(error)) throw error;
    }
    await clearCredentials();
  }
  await AsyncStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
  );
}
