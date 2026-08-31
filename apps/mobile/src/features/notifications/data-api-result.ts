export type NotificationDataApiOutcome =
  | "ok"
  | "invalid_installation"
  | "rate_limited"
  | "duplicate_registration"
  | "registration_disabled"
  | "sensitive_interest_consent_required"
  | "request_failed";

export function classifyNotificationDataApiResult(
  httpStatus: number,
  responseOk: boolean,
  payload: unknown
): NotificationDataApiOutcome {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return httpStatus === 429 ? "rate_limited" : "request_failed";
  }
  const record = payload as Record<string, unknown>;
  if (responseOk && record.status === "ok") return "ok";
  if (record.code === "28000") return "invalid_installation";
  if (record.code === "55000" || httpStatus === 429) return "rate_limited";
  if (record.code === "23505") return "duplicate_registration";
  if (record.code === "REGISTRATION_DISABLED") return "registration_disabled";
  if (record.code === "23514") return "sensitive_interest_consent_required";
  return "request_failed";
}
