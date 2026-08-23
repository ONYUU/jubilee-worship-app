export type StoredInstallationCredentials = {
  installationId: string;
  installationSecret: string;
  registrationState: "pending" | "committed";
};

type LegacyStoredInstallationCredentials = Omit<
  StoredInstallationCredentials,
  "registrationState"
> & {
  registrationState?: "pending" | "committed";
};

const INSTALLATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isStoredInstallationCredentials(
  value: unknown
): value is LegacyStoredInstallationCredentials {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.installationId === "string"
    && INSTALLATION_ID_PATTERN.test(candidate.installationId)
    && typeof candidate.installationSecret === "string"
    && candidate.installationSecret.length >= 32
    && candidate.installationSecret.length <= 128
    && (
      candidate.registrationState === undefined
      || candidate.registrationState === "pending"
      || candidate.registrationState === "committed"
    );
}

/**
 * Missing credentials are a valid empty state. A present but unreadable value
 * is an unknown remote-registration state and must never be treated as empty.
 */
export function parseStoredInstallationCredentials(
  raw: string | null
): StoredInstallationCredentials | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Stored installation credentials are not valid JSON.");
  }
  if (!isStoredInstallationCredentials(parsed)) {
    throw new Error("Stored installation credentials are invalid.");
  }
  return {
    installationId: parsed.installationId,
    installationSecret: parsed.installationSecret,
    // Credentials written before the two-phase marker existed are verified
    // with the server before the UI may call them registered.
    registrationState: parsed.registrationState ?? "pending"
  };
}

export async function prepareNotificationWithdrawalState(input: {
  clearConsent: () => Promise<void>;
  clearPreferences: () => Promise<void>;
  writeCleanupMarker: () => Promise<void>;
}): Promise<boolean> {
  const results = await Promise.allSettled([
    input.clearConsent(),
    input.clearPreferences(),
    input.writeCleanupMarker()
  ]);
  return results.every((result) => result.status === "fulfilled");
}

export async function clearCleanupStorageIfCredentialsMatch(input: {
  expected: StoredInstallationCredentials;
  readCredentials: () => Promise<StoredInstallationCredentials | null>;
  clearConsent: () => Promise<void>;
  clearPreferences: () => Promise<void>;
  clearPendingRecovery: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  clearCleanupMarker: () => Promise<void>;
}): Promise<boolean> {
  const current = await input.readCredentials();
  if (
    !current
    || current.installationId !== input.expected.installationId
    || current.installationSecret !== input.expected.installationSecret
  ) {
    return false;
  }

  // The durable marker is the commit record for cleanup and must be removed
  // only after every capability and credential has been deleted successfully.
  await input.clearConsent();
  await input.clearPreferences();
  await input.clearPendingRecovery();
  await input.clearCredentials();
  await input.clearCleanupMarker();
  return true;
}
