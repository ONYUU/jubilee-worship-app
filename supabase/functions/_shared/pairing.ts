import { HttpError } from "./http.ts";

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const NORMALIZED_PAIRING_CODE = /^[0-9A-HJKMNP-TV-Z]{12}$/;

export function createTestPushPairingCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(12));
  const normalized = Array.from(
    random,
    (value) => CROCKFORD_ALPHABET[value & 31],
  ).join("");
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${
    normalized.slice(8)
  }`;
}

export function requiredTestPushPairingCode(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "invalid_pairing_code",
      "연결 코드를 확인해 주세요.",
    );
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .replaceAll("O", "0")
    .replace(/[IL]/g, "1");
  if (!NORMALIZED_PAIRING_CODE.test(normalized)) {
    throw new HttpError(
      400,
      "invalid_pairing_code",
      "연결 코드를 확인해 주세요.",
    );
  }
  return normalized;
}

export function formatTestPushPairingCode(normalized: string): string {
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${
    normalized.slice(8)
  }`;
}

export function requiredTestPushPairingPepper(
  value: string | undefined,
): string {
  if (!value || value.length < 32) {
    throw new HttpError(
      503,
      "pairing_not_configured",
      "시험 기기 연결 서버가 아직 준비되지 않았습니다.",
    );
  }
  return value;
}

export async function pairingCodeDigest(
  normalizedCode: string,
  pepper: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(normalizedCode),
  );
  return Array.from(
    new Uint8Array(signature),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
