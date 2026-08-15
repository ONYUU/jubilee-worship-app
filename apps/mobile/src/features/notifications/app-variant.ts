import { NotificationSetupError } from "./errors";

export type AppVariant = "development" | "preview" | "production";

export function resolveNotificationAppVariant(extra: unknown): AppVariant {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) {
    throw new NotificationSetupError("알림용 앱 환경 설정이 올바르지 않습니다.");
  }

  const value = (extra as Record<string, unknown>).appVariant;
  if (value === "development" || value === "preview" || value === "production") {
    return value;
  }

  throw new NotificationSetupError("알림용 앱 환경 설정이 올바르지 않습니다.");
}
