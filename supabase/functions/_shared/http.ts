const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPO_PUSH_TOKEN_PATTERN =
  /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const DEEP_LINK_PATTERN = /^jubileeworship:\/\/[A-Za-z0-9/_?=&.%-]+$/;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse(
      { error: error.code, message: error.message },
      error.status,
    );
  }

  return jsonResponse(
    { error: "internal_error", message: "요청을 처리하지 못했습니다." },
    500,
  );
}

export async function readJsonObject(
  request: Request,
  maxBytes = 8_192,
): Promise<Record<string, unknown>> {
  if (request.method !== "POST") {
    throw new HttpError(405, "method_not_allowed", "POST 요청만 허용됩니다.");
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(
      415,
      "unsupported_media_type",
      "JSON 본문이 필요합니다.",
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", "요청 본문이 너무 큽니다.");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", "요청 본문이 너무 큽니다.");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "올바른 JSON 본문이 필요합니다.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_body", "JSON 객체가 필요합니다.");
  }

  return value as Record<string, unknown>;
}

export function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_input", `${field} 값이 필요합니다.`);
  }

  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new HttpError(
      400,
      "invalid_input",
      `${field} 값이 올바르지 않습니다.`,
    );
  }
  return result;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, field, maxLength);
}

export function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(
      400,
      "invalid_input",
      `${field} 값은 boolean이어야 합니다.`,
    );
  }
  return value;
}

export function requiredUuid(value: unknown, field: string): string {
  const result = requiredString(value, field, 36);
  if (!UUID_PATTERN.test(result)) {
    throw new HttpError(
      400,
      "invalid_input",
      `${field} 값이 올바르지 않습니다.`,
    );
  }
  return result.toLowerCase();
}

export function requiredPlatform(value: unknown): "ios" | "android" {
  if (value !== "ios" && value !== "android") {
    throw new HttpError(
      400,
      "invalid_input",
      "platform은 ios 또는 android여야 합니다.",
    );
  }
  return value;
}

export type AppVariant = "development" | "preview" | "production";
export type TestAppVariant = Exclude<AppVariant, "production">;

export function requiredAppVariant(value: unknown): AppVariant {
  if (
    value !== "development" && value !== "preview" && value !== "production"
  ) {
    throw new HttpError(
      400,
      "invalid_input",
      "appVariant는 development, preview 또는 production이어야 합니다.",
    );
  }
  return value;
}

export function requiredTestAppVariant(value: unknown): TestAppVariant {
  if (value !== "development" && value !== "preview") {
    throw new HttpError(
      400,
      "invalid_app_variant",
      "시험 알림 환경은 development 또는 preview여야 합니다.",
    );
  }
  return value;
}

export function requiredExpoPushToken(value: unknown): string {
  const result = requiredString(value, "expoPushToken", 256);
  if (!EXPO_PUSH_TOKEN_PATTERN.test(result)) {
    throw new HttpError(
      400,
      "invalid_push_token",
      "Expo push token 형식이 올바르지 않습니다.",
    );
  }
  return result;
}

export function optionalDeepLink(value: unknown): string | null {
  const result = optionalString(value, "deepLink", 1_000);
  if (result && !DEEP_LINK_PATTERN.test(result)) {
    throw new HttpError(
      400,
      "invalid_deep_link",
      "허용된 앱 딥링크가 아닙니다.",
    );
  }
  return result;
}

export function requiredSubscriptions(value: unknown): {
  worshipReminder: boolean;
  scheduleChanges: boolean;
  setlistUpdates: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(
      400,
      "invalid_input",
      "subscriptions 객체가 필요합니다.",
    );
  }
  const subscriptions = value as Record<string, unknown>;
  return {
    worshipReminder: requiredBoolean(
      subscriptions.worshipReminder,
      "subscriptions.worshipReminder",
    ),
    scheduleChanges: requiredBoolean(
      subscriptions.scheduleChanges,
      "subscriptions.scheduleChanges",
    ),
    setlistUpdates: requiredBoolean(
      subscriptions.setlistUpdates,
      "subscriptions.setlistUpdates",
    ),
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createInstallationSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/,
    "",
  );
}

export type RpcError = {
  code?: string;
  message?: string;
};

export function throwForRpcError(
  error: RpcError | null,
  fallbackCode: string,
): void {
  if (!error) return;

  if (error.code === "23505") {
    throw new HttpError(
      409,
      "duplicate_registration",
      "이미 등록된 설치 또는 push token입니다.",
    );
  }
  if (error.code === "28000") {
    throw new HttpError(
      401,
      "invalid_installation",
      "설치 인증정보가 올바르지 않습니다.",
    );
  }
  if (error.code === "42501") {
    throw new HttpError(403, "forbidden", "요청 권한이 없습니다.");
  }
  throw new HttpError(500, fallbackCode, "서버 요청을 완료하지 못했습니다.");
}
