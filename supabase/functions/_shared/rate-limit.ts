import { HttpError, sha256Hex } from "./http.ts";

type RateWindow = { count: number; resetAt: number };

const windows = new Map<string, RateWindow>();

/**
 * Per-isolate abuse guard. Production must also enforce a distributed gateway
 * limit because Edge isolates do not share memory.
 */
export async function enforceRegistrationRateLimit(
  request: Request,
  limit = 10,
  windowMs = 60_000,
  scope = "installation-registration",
): Promise<void> {
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ??
    "unknown";
  const key = await sha256Hex(`${scope}\n${forwardedFor}\n${userAgent}`);
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
  } else if (current.count >= limit) {
    throw new HttpError(429, "rate_limited", "잠시 후 다시 시도해 주세요.");
  } else {
    current.count += 1;
  }

  if (windows.size > 1_000) {
    for (const [candidate, window] of windows) {
      if (window.resetAt <= now) windows.delete(candidate);
    }
  }
}
