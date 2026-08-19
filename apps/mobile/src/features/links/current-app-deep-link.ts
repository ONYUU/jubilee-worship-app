import Constants from "expo-constants";

import {
  resolveNotificationAppVariant,
  type AppVariant
} from "../notifications/app-variant";
import {
  createAppDeepLinkForVariant,
  normalizeAppDeepLinkForVariant
} from "./app-deep-link";

export function currentAppVariant(): AppVariant | null {
  try {
    return resolveNotificationAppVariant(Constants.expoConfig?.extra);
  } catch {
    return null;
  }
}

export function createAppDeepLink(path: string): string | null {
  const variant = currentAppVariant();
  return variant ? createAppDeepLinkForVariant(path, variant) : null;
}

export function normalizeCurrentAppDeepLink(value: unknown): string | null {
  const variant = currentAppVariant();
  return variant ? normalizeAppDeepLinkForVariant(value, variant) : null;
}
