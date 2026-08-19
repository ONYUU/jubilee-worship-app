import {
  normalizeAppDeepLinkForVariant
} from "../links/app-deep-link";

import type { AppVariant } from "./app-variant";

export function safeNotificationLink(
  value: unknown,
  variant: AppVariant = "production"
): string | null {
  return normalizeAppDeepLinkForVariant(value, variant);
}

export function safeNotificationLinkForVariant(
  value: unknown,
  variant: AppVariant
): string | null {
  return safeNotificationLink(value, variant);
}
