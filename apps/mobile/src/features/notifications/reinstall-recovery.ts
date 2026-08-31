import * as Crypto from "expo-crypto";

const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RECOVERY_CODE_DIGEST_DOMAIN = "jubilee:reinstall-recovery:v1";
const NORMALIZED_RECOVERY_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const EXPO_PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export type ReinstallRecoveryCapability = {
  recoveryCode: string;
  recoveryCodeDigest: string;
};

export type PendingReinstallRecovery = {
  recoveryCode: string | null;
  expoPushToken: string;
  appVariant: "development" | "preview";
  mode: "relink" | "withdrawal";
  createdAt: string;
  expiresAt: string;
};

export class ReinstallRecoveryStorageError extends Error {
  readonly phase: "provisional" | "authoritative";
  readonly originalError: unknown;

  constructor(
    phase: "provisional" | "authoritative",
    originalError: unknown
  ) {
    super(`Unable to persist ${phase} reinstall recovery state`);
    this.name = "ReinstallRecoveryStorageError";
    this.phase = phase;
    this.originalError = originalError;
  }
}

export type ReinstallRecoveryRequestInput = {
  installationId: string;
  secretStoreHash: string;
  pairingStoreHash: string;
  platform: string;
  appVersion: string;
  appVariant: string;
  consentVersion: string;
  disclosureSha256: string;
  consentLocale: string;
  age14OrOverConfirmed: boolean;
  worshipReminder: boolean;
  scheduleChanges: boolean;
  setlistUpdates: boolean;
  recoveryCodeDigest: string;
};

export type ReinstallRecoveryFinalizeInput = {
  installationId: string;
  platform: string;
  appVersion: string;
  appVariant: string;
  consentVersion: string;
  disclosureSha256: string;
  consentLocale: string;
  age14OrOverConfirmed: boolean;
  worshipReminder: boolean;
  scheduleChanges: boolean;
  setlistUpdates: boolean;
};

/**
 * Build the recovery RPC body from verifiers and a code digest only. The raw
 * one-time code, Expo token, installation secret, and installation proof are
 * deliberately not accepted by this boundary.
 */
export function createReinstallRecoveryRequestBody(
  input: ReinstallRecoveryRequestInput
): Record<string, unknown> {
  return {
    target_installation_id: input.installationId,
    target_secret_store_hash: input.secretStoreHash,
    target_pairing_store_hash: input.pairingStoreHash,
    target_platform: input.platform,
    target_app_version: input.appVersion,
    target_app_variant: input.appVariant,
    target_sensitive_interest_consent_version: input.consentVersion,
    target_sensitive_interest_disclosure_sha256: input.disclosureSha256,
    target_sensitive_interest_consent_locale: input.consentLocale,
    target_age_14_or_over_confirmed: input.age14OrOverConfirmed,
    target_worship_reminder: input.worshipReminder,
    target_schedule_changes: input.scheduleChanges,
    target_setlist_updates: input.setlistUpdates,
    target_recovery_code_digest: input.recoveryCodeDigest
  };
}

/**
 * Finalize and cancel request bodies intentionally contain no provider token,
 * raw proof, or one-time code. Those device-only values are supplied in
 * private request headers by the notification client.
 */
export function createReinstallRecoveryFinalizeBody(
  input: ReinstallRecoveryFinalizeInput
): Record<string, unknown> {
  return {
    target_installation_id: input.installationId,
    target_platform: input.platform,
    target_app_version: input.appVersion,
    target_app_variant: input.appVariant,
    target_sensitive_interest_consent_version: input.consentVersion,
    target_sensitive_interest_disclosure_sha256: input.disclosureSha256,
    target_sensitive_interest_consent_locale: input.consentLocale,
    target_age_14_or_over_confirmed: input.age14OrOverConfirmed,
    target_worship_reminder: input.worshipReminder,
    target_schedule_changes: input.scheduleChanges,
    target_setlist_updates: input.setlistUpdates
  };
}

export function createReinstallRecoveryCancelBody(
  installationId: string,
  platform: string,
  appVariant: "development" | "preview"
): Record<string, unknown> {
  return {
    target_installation_id: installationId,
    target_platform: platform,
    target_app_variant: appVariant
  };
}

export function isConfirmedReinstallRecoveryWithdrawal(payload: unknown): boolean {
  return Boolean(
    payload
      && typeof payload === "object"
      && !Array.isArray(payload)
      && (payload as Record<string, unknown>).status === "withdrawn"
  );
}

function encodeCrockfordBase32(bytes: Uint8Array): string {
  let bitBuffer = 0;
  let bitCount = 0;
  let encoded = "";

  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      encoded += CROCKFORD_BASE32_ALPHABET[(bitBuffer >>> bitCount) & 31];
      bitBuffer &= (1 << bitCount) - 1;
    }
  }

  if (bitCount > 0) {
    encoded += CROCKFORD_BASE32_ALPHABET[(bitBuffer << (5 - bitCount)) & 31];
  }
  return encoded;
}

export function formatReinstallRecoveryCode(normalizedCode: string): string {
  if (!NORMALIZED_RECOVERY_CODE_PATTERN.test(normalizedCode)) {
    throw new Error("Invalid reinstall recovery code");
  }
  return [
    normalizedCode.slice(0, 4),
    normalizedCode.slice(4, 8),
    normalizedCode.slice(8, 12),
    normalizedCode.slice(12, 16),
    normalizedCode.slice(16, 20),
    normalizedCode.slice(20, 24),
    normalizedCode.slice(24, 26)
  ].join("-");
}

export function normalizeReinstallRecoveryCode(formattedCode: string): string | null {
  const normalized = formattedCode.toUpperCase().replaceAll("-", "").replaceAll(" ", "");
  return NORMALIZED_RECOVERY_CODE_PATTERN.test(normalized) ? normalized : null;
}

export async function reinstallRecoveryCodeDigest(normalizedCode: string): Promise<string> {
  if (!NORMALIZED_RECOVERY_CODE_PATTERN.test(normalizedCode)) {
    throw new Error("Invalid reinstall recovery code");
  }
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${RECOVERY_CODE_DIGEST_DOMAIN}\n${normalizedCode}`
  );
}

export async function createReinstallRecoveryCapability(
  randomBytes?: Uint8Array
): Promise<ReinstallRecoveryCapability> {
  const bytes = randomBytes ?? await Crypto.getRandomBytesAsync(16);
  if (bytes.length !== 16) throw new Error("Recovery capability requires 128 bits");
  const normalizedCode = encodeCrockfordBase32(bytes);
  if (!NORMALIZED_RECOVERY_CODE_PATTERN.test(normalizedCode)) {
    throw new Error("Recovery capability encoding failed");
  }
  return {
    recoveryCode: formatReinstallRecoveryCode(normalizedCode),
    recoveryCodeDigest: await reinstallRecoveryCodeDigest(normalizedCode)
  };
}

export function createProvisionalPendingReinstallRecovery(
  recoveryCode: string,
  expoPushToken: string,
  appVariant: "development" | "preview",
  nowMs = Date.now()
): PendingReinstallRecovery {
  const normalizedCode = normalizeReinstallRecoveryCode(recoveryCode);
  if (!normalizedCode || !EXPO_PUSH_TOKEN_PATTERN.test(expoPushToken)) {
    throw new Error("Invalid provisional reinstall recovery");
  }
  return {
    recoveryCode: formatReinstallRecoveryCode(normalizedCode),
    expoPushToken,
    appVariant,
    mode: "relink",
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + 16 * 60_000).toISOString()
  };
}

/**
 * Persist the device-only capability before any server mutation, then replace
 * it with the authoritative expiry only after a validated response. If the
 * response is lost, parsing is interrupted, or the final SecureStore write
 * fails, the provisional record remains available for withdrawal/retry.
 */
export async function persistReinstallRecoveryRequest<TResponse>(input: {
  provisional: PendingReinstallRecovery;
  writePending: (value: PendingReinstallRecovery) => Promise<void>;
  request: () => Promise<TResponse>;
  parseResponse: (response: TResponse) => PendingReinstallRecovery;
}): Promise<PendingReinstallRecovery> {
  try {
    await input.writePending(input.provisional);
  } catch (error) {
    throw new ReinstallRecoveryStorageError("provisional", error);
  }

  const response = await input.request();
  const authoritative = input.parseResponse(response);
  try {
    await input.writePending(authoritative);
  } catch (error) {
    throw new ReinstallRecoveryStorageError("authoritative", error);
  }
  return authoritative;
}

export function parsePendingReinstallRecovery(
  payload: unknown,
  recoveryCode: string,
  appVariant: string,
  expoPushToken: string,
  nowMs = Date.now()
): PendingReinstallRecovery | null {
  const normalizedCode = normalizeReinstallRecoveryCode(recoveryCode);
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
    || (appVariant !== "development" && appVariant !== "preview")
    || !EXPO_PUSH_TOKEN_PATTERN.test(expoPushToken)
    || !normalizedCode
  ) return null;

  const record = payload as Record<string, unknown>;
  const expiresAt = typeof record.expires_at === "string"
    ? Date.parse(record.expires_at)
    : Number.NaN;
  if (
    record.status !== "pending_owner_approval"
    || !Number.isFinite(expiresAt)
    || expiresAt <= nowMs - 60_000
    || expiresAt > nowMs + 16 * 60_000
  ) return null;

  return {
    recoveryCode: formatReinstallRecoveryCode(normalizedCode),
    expoPushToken,
    appVariant,
    mode: "relink",
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresAt).toISOString()
  };
}

export function serializePendingReinstallRecovery(value: PendingReinstallRecovery): string {
  return JSON.stringify(value);
}

export function parseStoredPendingReinstallRecovery(
  raw: string | null
): PendingReinstallRecovery | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const normalizedRecoveryCode = typeof record.recoveryCode === "string"
      ? normalizeReinstallRecoveryCode(record.recoveryCode)
      : record.recoveryCode === null
        ? null
        : undefined;
    if (
      normalizedRecoveryCode === undefined
      || (typeof record.recoveryCode === "string" && !normalizedRecoveryCode)
      || typeof record.expoPushToken !== "string"
      || !EXPO_PUSH_TOKEN_PATTERN.test(record.expoPushToken)
      || (record.appVariant !== "development" && record.appVariant !== "preview")
      || (record.mode !== undefined
        && record.mode !== "relink"
        && record.mode !== "withdrawal")
      || typeof record.createdAt !== "string"
      || !Number.isFinite(Date.parse(record.createdAt))
      || typeof record.expiresAt !== "string"
      || !Number.isFinite(Date.parse(record.expiresAt))
    ) return null;
    return {
      recoveryCode: normalizedRecoveryCode
        ? formatReinstallRecoveryCode(normalizedRecoveryCode)
        : null,
      expoPushToken: record.expoPushToken,
      appVariant: record.appVariant,
      mode: record.mode === "withdrawal" ? "withdrawal" : "relink",
      createdAt: new Date(record.createdAt).toISOString(),
      expiresAt: new Date(record.expiresAt).toISOString()
    };
  } catch {
    return null;
  }
}

export function scrubExpiredReinstallRecoveryCapability(
  recovery: PendingReinstallRecovery,
  nowMs = Date.now()
): PendingReinstallRecovery {
  if (
    recovery.recoveryCode === null
    || (
      recovery.mode !== "withdrawal"
      && Date.parse(recovery.expiresAt) > nowMs
    )
  ) return recovery;
  return { ...recovery, recoveryCode: null };
}

export function reinstallRecoveryRemainingMs(
  recovery: PendingReinstallRecovery,
  nowMs = Date.now()
): number {
  return Math.max(0, Date.parse(recovery.expiresAt) - nowMs);
}
