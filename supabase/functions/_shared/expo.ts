import { HttpError } from "./http.ts";

const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

// Generic and test notifications use a short provider queue. Worship
// reminders instead receive the event start as an absolute expiration from
// the database, because a worker can claim an H-1 reminder up to 15 minutes
// late and a relative one-hour TTL would then outlive the service start.
export const JUBILEE_PUSH_TTL_SECONDS = 60 * 60;

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: { url: string };
  ttl?: number;
  expiration?: number;
};

export function createExpoMessage(input: {
  to: string;
  title: string;
  body: string;
  deepLink?: string | null;
  expiresAt?: string | null;
}): ExpoMessage {
  const expirationMillis = input.expiresAt
    ? Date.parse(input.expiresAt)
    : Number.NaN;
  if (input.expiresAt && !Number.isFinite(expirationMillis)) {
    throw new HttpError(
      500,
      "invalid_push_expiration",
      "Push expiration is not a valid timestamp.",
    );
  }

  return {
    to: input.to,
    title: input.title,
    body: input.body,
    ...(input.expiresAt
      ? { expiration: Math.floor(expirationMillis / 1_000) }
      : { ttl: JUBILEE_PUSH_TTL_SECONDS }),
    ...(input.deepLink ? { data: { url: input.deepLink } } : {}),
  };
}

export type ExpoResult = {
  status: "ok" | "error";
  id?: string;
  details?: { error?: string };
};

function expoHeaders(accessToken: string | undefined): HeadersInit {
  return {
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "content-type": "application/json",
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function sendExpoMessages(
  messages: ExpoMessage[],
  accessToken?: string,
): Promise<ExpoResult[]> {
  if (messages.length < 1 || messages.length > 100) {
    throw new HttpError(
      400,
      "invalid_batch",
      "Expo 발송 묶음은 1~100건이어야 합니다.",
    );
  }

  const response = await fetch(EXPO_SEND_URL, {
    method: "POST",
    headers: expoHeaders(accessToken),
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new HttpError(
      502,
      "expo_unavailable",
      "Expo push service가 요청을 거부했습니다.",
    );
  }

  const payload = await response.json() as { data?: unknown };
  if (!Array.isArray(payload.data) || payload.data.length !== messages.length) {
    throw new HttpError(
      502,
      "invalid_expo_response",
      "Expo 응답 형식이 올바르지 않습니다.",
    );
  }
  return payload.data as ExpoResult[];
}

export async function getExpoReceipts(
  ticketIds: string[],
  accessToken?: string,
): Promise<Record<string, ExpoResult>> {
  if (ticketIds.length < 1 || ticketIds.length > 1_000) {
    throw new HttpError(
      400,
      "invalid_batch",
      "Expo receipt 묶음은 1~1000건이어야 합니다.",
    );
  }

  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: expoHeaders(accessToken),
    body: JSON.stringify({ ids: ticketIds }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new HttpError(
      502,
      "expo_unavailable",
      "Expo receipt service가 요청을 거부했습니다.",
    );
  }

  const payload = await response.json() as { data?: unknown };
  if (
    !payload.data || typeof payload.data !== "object" ||
    Array.isArray(payload.data)
  ) {
    throw new HttpError(
      502,
      "invalid_expo_response",
      "Expo receipt 응답 형식이 올바르지 않습니다.",
    );
  }
  return payload.data as Record<string, ExpoResult>;
}

export function expoErrorCode(result: ExpoResult): string {
  const value = result.details?.error;
  return typeof value === "string" && value.length <= 100
    ? value
    : "ExpoRejected";
}
