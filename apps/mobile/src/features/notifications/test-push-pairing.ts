export type TestPushPairingCode = {
  pairingCode: string;
  expiresAt: string;
  appVariant: "development" | "preview";
};

const PAIRING_CODE_PATTERN =
  /^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/;

export function isTestPushPairingVariant(
  value: string
): value is "development" | "preview" {
  return value === "development" || value === "preview";
}

export function parseTestPushPairingCode(
  value: unknown,
  expectedVariant: "development" | "preview"
): TestPushPairingCode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.pairingCode !== "string"
    || !PAIRING_CODE_PATTERN.test(candidate.pairingCode)
    || typeof candidate.expiresAt !== "string"
    || !Number.isFinite(Date.parse(candidate.expiresAt))
    || candidate.appVariant !== expectedVariant
  ) {
    return null;
  }
  return {
    pairingCode: candidate.pairingCode,
    expiresAt: candidate.expiresAt,
    appVariant: expectedVariant
  };
}

export function testPushPairingRemainingMs(
  pairing: TestPushPairingCode,
  now = Date.now()
): number {
  return Math.max(0, Date.parse(pairing.expiresAt) - now);
}
