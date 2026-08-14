const APP_LINK_PATTERN =
  /^jubileeworship:\/\/(?:notifications|privacy|worship\/[A-Za-z0-9][A-Za-z0-9_-]*(?:\/songlist)?)(?:\?[A-Za-z0-9_%=&.-]+)?$/;

export function safeNotificationLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1_000) return null;
  return APP_LINK_PATTERN.test(value) ? value : null;
}
