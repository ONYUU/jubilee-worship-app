import { MOBILE_APP_DEEP_LINK_PATH_PATTERN } from "@jubilee/domain";
import type { AppVariant } from "../notifications/app-variant";

const APP_SCHEMES: Record<AppVariant, string> = {
  development: "jubileeworship-dev",
  preview: "jubileeworship-preview",
  production: "jubileeworship"
};

export function appSchemeForVariant(variant: AppVariant): string {
  return APP_SCHEMES[variant];
}

export function createAppDeepLinkForVariant(
  path: string,
  variant: AppVariant
): string | null {
  const normalizedPath = path.replace(/^\/+/, "");
  return MOBILE_APP_DEEP_LINK_PATH_PATTERN.test(normalizedPath)
    ? `${appSchemeForVariant(variant)}://${normalizedPath}`
    : null;
}

export function normalizeAppDeepLinkForVariant(
  value: unknown,
  variant: AppVariant
): string | null {
  if (typeof value !== "string" || value.length > 1_000) return null;
  const match = /^(jubileeworship(?:-dev|-preview)?):\/\/(.+)$/.exec(value);
  if (!match || !MOBILE_APP_DEEP_LINK_PATH_PATTERN.test(match[2] ?? "")) return null;
  return `${appSchemeForVariant(variant)}://${match[2]}`;
}
